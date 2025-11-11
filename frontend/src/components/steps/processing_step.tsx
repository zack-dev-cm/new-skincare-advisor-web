"use client";
import React, {useEffect, useState} from 'react';
import {motion} from 'framer-motion';
import {CheckCircle} from 'lucide-react';
import * as ort from 'onnxruntime-web/webgpu';
import {pipeline, RawImage} from "@huggingface/transformers";
import {getGPUTier, TierResult} from "detect-gpu";
import {Tensor} from "onnxruntime-common";
import DataTypeMap = Tensor.DataTypeMap;

interface ProcessingStepProps {
    capturedImageUri: string;
  onNext: (imageUri : string) => void;
  onBack: () => void;
}

// Device detection function
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768;
};

let deepWBModel: ort.InferenceSession | null = null;
let iatWBModel: ort.InferenceSession | null = null;
let iatWBModelPromise: Promise<ort.InferenceSession> | null = null;


export default function ProcessingStep({onNext, onBack, capturedImageUri}: ProcessingStepProps) {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(true);
    const [imgData, setImgData] = useState<ImageData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [processState, setProcessState] = useState<'processing' | 'done'>('processing');
    const [workCanvas, setWorkCanvas] = useState<HTMLCanvasElement | null>(null);
    const [workCtx, setWorkCtx] = useState<CanvasRenderingContext2D | null>(null);
    const [gpuTier, setGpuTier] = useState< TierResult| null>(null);


    const hasRun = React.useRef(false);
    const inputsize_model = 512;
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        console.log(
            'Canvas dimensions:',
            canvasRef.current.width,
            'x',
            canvasRef.current.height,
            '(',
            canvasRef.current.width / canvasRef.current.height,
            ')'
        )
        getGPUTier().then((tier) => {
            setGpuTier(tier);
            console.log('Detected GPU Tier:', tier);
        });
        setImageUri(capturedImageUri) //fallback to this if processing fails
        if (hasRun.current) return;
        hasRun.current = true;
        console.log('Processing step mounted...');
        processingPipeline();
    }, [canvasRef]);

    async function getIatWBModel(): Promise<ort.InferenceSession> {
        if (iatWBModel) return iatWBModel;
        if (iatWBModelPromise) return iatWBModelPromise;
        let providers = ['webgpu'];
        if (!navigator.gpu) providers = ['wasm'];
        iatWBModelPromise = ort.InferenceSession.create(
            './assets/models/preprocessing/IAT_EXP.onnx',
            { executionProviders: providers }
        ).then(session => {
            iatWBModel = session;
            iatWBModelPromise = null;
            return session;
        });
        return iatWBModelPromise;
    }

    async function loadImage(uri: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = uri;
        });
    }


    const resizeimage = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, maxWidth: number, maxHeight: number) => {
        if (!ctx || !canvas) return;
        console.log('Resizing image started...');

        const originalWidth = canvas.width;
        const originalHeight = canvas.height;
        const imageData = ctx.getImageData(0, 0, originalWidth, originalHeight);

        // Create an offscreen canvas to hold the original image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalWidth;
        tempCanvas.height = originalHeight;
        tempCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

        // Set target stretched dimensions
        canvas.width = maxWidth;
        canvas.height = maxHeight;

        // Draw original image, stretching it to fit the new size
        ctx.drawImage(tempCanvas, 0, 0, originalWidth, originalHeight, 0, 0, maxWidth, maxHeight);

        console.log(
            'Stretched image dimensions:',
            canvas.width,
            'x',
            canvas.height,
            '(',
            canvas.width / canvas.height,
            ')'
        );
    };


    const naiveUpscale = async (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
        if (!ctx || !canvas) return;
        console.log('Upscaling image started...');
        const {width: w, height: h} = canvas;
        const imageData = ctx.getImageData(0, 0, w, h);
        // Dummy upscaling logic: just create a new ImageData with double dimensions
        const upscaledImageData = ctx.createImageData(w * 2, h * 2);
        // Simple nearest-neighbor upscaling for demonstration
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const srcIndex = (y * w + x) * 4;
                const destIndex1 = ((y * 2) * (w * 2) + (x * 2)) * 4;
                const destIndex2 = ((y * 2) * (w * 2) + (x * 2 + 1)) * 4;
                const destIndex3 = (((y * 2) + 1) * (w * 2) + (x * 2)) * 4;
                const destIndex4 = (((y * 2) + 1) * (w * 2) + (x * 2 + 1)) * 4;
                upscaledImageData.data.set(imageData.data.slice(srcIndex, srcIndex + 4), destIndex1);
                upscaledImageData.data.set(imageData.data.slice(srcIndex, srcIndex + 4), destIndex2);
                upscaledImageData.data.set(imageData.data.slice(srcIndex, srcIndex + 4), destIndex3);
                upscaledImageData.data.set(imageData.data.slice(srcIndex, srcIndex + 4), destIndex4);
            }
        }
        // Resize canvas to new dimensions
        canvas!.width = w * 2;
        canvas!.height = h * 2;
        ctx.putImageData(upscaledImageData, 0, 0);
    }

    const model_enhancement = async (canvas: HTMLCanvasElement, isMobileGpu: boolean): Promise<RawImage | null> => {
        // Define a promise that auto-rejects after 5 seconds
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Upscale timed out after 5s")), 5000)
        );

        // Your inference logic as a promise
        const inferencePromise = (async () => {
            const model = await pipeline(
                'image-to-image',
                'twn39/swin2SR-lightweight-x2-64-ONNX',
                {
                    device: isMobileGpu ? 'wasm' : 'wasm',
                    dtype: "q4"
                });
            let result = await model(canvas);
            if (!(result instanceof RawImage)) result = result[0];
            return result;
        })();

        // Race the inference vs the timeout
        let result;
        try {
            result = await Promise.race([inferencePromise, timeoutPromise]);
        } catch (err) {
            console.error(err);
            alert("Image upscaling took too long or failed.");
            return null;
        }
        return result as RawImage;
    }



    const upscaleimage2x = async (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
        if (!ctx || !canvas) return;
        console.log('Upscaling image started...');
        if (!gpuTier){
            //try again eventually default to no gpu
            try{
                const tier = await getGPUTier();
                setGpuTier(tier);
                console.log('Detected GPU Tier:', tier);
            } catch (err) {
                console.log('GPU detection failed, using naive upscaling for performance - ', err);
                await naiveUpscale(ctx, canvas);
                return;
            }
        }


        switch (gpuTier?.tier) {
            case 0: // no gpu
                console.log('No GPU detected, using naive upscaling for performance');
                await naiveUpscale(ctx, canvas);
                return;
            case 1: // low-end gpu
                console.log('Low-endGPU detected, using naive upscaling for performance');
                await naiveUpscale(ctx, canvas);
                return;
            default: break
        }


        const {width: w, height: h} = canvas;
        // Use model enhancement for upscaling
        const result = await model_enhancement(canvas, gpuTier?.isMobile || false);
        if (!result || !result.data || result.data.length === 0) {
            console.log('Model enhancement failed, using naive upscaling for performance');
            await naiveUpscale(ctx, canvas);
            return;
        }
        const upscaledImg = await loadImage(result.data[0]);

        // Resize canvas to new dimensions
        canvas.width = w * 2;      // corrected: upscale actually doubles size
        canvas.height = h * 2;
        ctx.drawImage(upscaledImg, 0, 0);
    }

    function ImageDataToTensor(imageData: ImageData, type:keyof DataTypeMap): ort.Tensor {
        const {width, height, data} = imageData;
        const floatData = new Float32Array(1 * width * height * 3); // RGB
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx] / 255;     // Normalize to [0, 1]
                const g = data[idx + 1] / 255; // Normalize to [0, 1]
                const b = data[idx + 2] / 255; // Normalize to [0, 1]
                floatData[0 * width * height + y * width + x] = r;
                floatData[1 * width * height + y * width + x] = g;
                floatData[2 * width * height + y * width + x] = b;
            }
        }
        return new ort.Tensor(type, floatData, [1, 3, height, width]);
    }

    function tensorToImageData(tensor: Tensor) {
        // shape example: [1, 3, H, W]
        const [batch, channels, height, width] = tensor.dims;
        const data = tensor.data as Float32Array;
        const imageData = new ImageData(width, height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const r = data[0 * height * width + y * width + x];
                const g = data[1 * height * width + y * width + x];
                const b = data[2 * height * width + y * width + x];
                const idx = (y * width + x) * 4;
                imageData.data[idx] = Math.min(255, Math.max(0, Math.round(r * 255)));
                imageData.data[idx + 1] = Math.min(255, Math.max(0, Math.round(g * 255)));
                imageData.data[idx + 2] = Math.min(255, Math.max(0, Math.round(b * 255)));
                imageData.data[idx + 3] = 255; // Alpha channel
            }
        }
        return imageData;
    }

    const IAT_WB = async (data?: ImageData) : Promise<ImageData> => {
        if (!data) throw new Error('No image data provided');
        console.log('Illuminant balance started with onnx model...');
        ort.env.wasm.simd = true;
        ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4; // Multi-threading

        if (!iatWBModel) console.log('Loading IAT WB model...'); else console.log('Using cached IAT model...');
        const session = await getIatWBModel();

        console.log('IAT WB model loaded:', session);

        const inputTensor = ImageDataToTensor(data, 'float32');

        const feed = {'img_low': inputTensor};

        const result = await session.run(feed);

        console.log('Illuminant balance result:', result);
        const outputTensor = result['permute_42'] as ort.Tensor;

        // Create new ImageData for output
        return tensorToImageData(outputTensor);
    }

    const DeepWB = async (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
        if (!ctx || !canvas) return;
        console.log('DeepWEB WB started with onnx model...');
        ort.env.wasm.simd = true;
        ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4; // Multi-threading
        //start nnx runtime
        if (!deepWBModel) console.log('Loading Deep WB model...');
        let providers = ['webgpu'];
        if (!navigator.gpu){
            console.log('No WebGPU support detected, Deep WB may be slow on CPU-only mode.');
            providers = ['wasm'];
        }
        const session = deepWBModel ? deepWBModel : await ort.InferenceSession.create('./assets/models/preprocessing/Deep_WB.onnx', {
            executionProviders: providers,
        });
        if (!deepWBModel) deepWBModel = session;

        const {width: w, height: h} = canvas;
        // Fill input tensor with image data
        const imageData = ctx.getImageData(0, 0, w, h);

        const inputTensor = ImageDataToTensor(imageData, 'float32');

        const feed = {'input.1': inputTensor};

        const result = await session.run(feed);

        console.log('DeepWEB WB result:', result);
        const outputTensor = result['98'] as ort.Tensor;

        // Create new ImageData for output
        const outputImageData = tensorToImageData(outputTensor);
        // Put adjusted image data back to canvas
        ctx.putImageData(outputImageData, 0, 0);
    }

    async function grayedgeWB(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
        if (!ctx || !canvas) return;
        const {width: w, height: h} = canvas;
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // Calcola gradienti per ogni canale
        let gradR = 0, gradG = 0, gradB = 0, count = 0;
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const idx = (y * w + x) * 4;
                // Derivata orizzontale
                const idxLeft = (y * w + (x - 1)) * 4;
                const idxRight = (y * w + (x + 1)) * 4;
                gradR += Math.abs(data[idxRight] - data[idxLeft]);
                gradG += Math.abs(data[idxRight + 1] - data[idxLeft + 1]);
                gradB += Math.abs(data[idxRight + 2] - data[idxLeft + 2]);
                count++;
            }
        }
        // Media dei gradienti
        gradR /= count;
        gradG /= count;
        gradB /= count;

        // Stima illuminante
        const illuminant = [gradR, gradG, gradB];
        const maxIll = Math.max(...illuminant);

        // Normalizza i colori
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * (maxIll / (illuminant[0] || 1)));
            data[i + 1] = Math.min(255, data[i + 1] * (maxIll / (illuminant[1] || 1)));
            data[i + 2] = Math.min(255, data[i + 2] * (maxIll / (illuminant[2] || 1)));
        }

        ctx.putImageData(imageData, 0, 0);
    }

    async function grayWorldWB(imgdata:ImageData): Promise<ImageData> {
        if (!imgdata) throw new Error('No canvas or context provided');
        const data = imgdata.data;

        let sumR = 0, sumG = 0, sumB = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
            sumR += data[i];
            sumG += data[i + 1];
            sumB += data[i + 2];
            count++;
        }
        const avgR = sumR / count;
        const avgG = sumG / count;
        const avgB = sumB / count;
        const avgGray = (avgR + avgG + avgB) / 3;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * (avgGray / (avgR || 1)));
            data[i + 1] = Math.min(255, data[i + 1] * (avgGray / (avgG || 1)));
            data[i + 2] = Math.min(255, data[i + 2] * (avgGray / (avgB || 1)));
        }
        return imgdata;
    }


    const processingPipeline = async () => {
        try {
            setIsProcessing(true);
            const img = await loadImage(capturedImageUri);
            const canvas = canvasRef.current!;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return;
            }
            canvas.width = img.width;
            canvas.height = img.height;
            if (ctx) {
                ctx.clearRect(0, 0, img.width, img.height);
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                setImgData(imageData);
            }
            setWorkCanvas(canvas);
            setWorkCtx(ctx);
            console.log('Image loaded:', img.width, 'x', img.height);
            //Resize image
            resizeimage(ctx, canvas, inputsize_model, inputsize_model);

            console.log('Image resized for model input. ', workCanvas?.width, 'x', workCanvas?.height);
            try{
                let data = ctx.getImageData(0, 0, canvas.width, canvas.height);
                data = await IAT_WB(data);
                //data = await grayWorldWB(data);
                ctx.putImageData(data, 0, 0);
                //await grayWorldWB(ctx, canvas);
            }catch (err) {
                console.log('Illuminant balance failed, proceeding without it - ', err);
            }
            setImageUri(canvas.toDataURL());
        }catch (err) {
            console.log('Processing error:', err);
        }finally {
            setIsProcessing(false);
            setProcessState('done');
        }
    }




    return (
        <motion.div
            key="processing-step"
            initial={{opacity: 0, x: 20}}
            animate={{opacity: 1, x: 0}}
            exit={{opacity: 0, x: -20}}
            transition={{duration: 0.3}}
            className="bg-main bg-cover bg-center h-full flex flex-col"
        >
            {/* interface*/}
            <div className="flex-1 relative bg-black overflow-hidden">
                {isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
                        <div className="text-white text-center">
                            <div
                                className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                            <p>Attendi elaborazione...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
                        <div className="text-white text-center p-4">
                            <p className="mb-4">{error}</p>
                            <button
                                onClick={() => {
                                    setError(null);
                                    //startCamera();
                                }}
                                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                            >
                                Riprova
                            </button>
                        </div>
                    </div>
                )}

                {/* Hidden canvas for processing */}
                <canvas ref={canvasRef} className="hidden" />

                {processState === 'done' && imageUri && (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                        <img
                            src={imageUri}
                            alt="Captured photo"
                            className="max-w-full max-h-full object-contain"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                width: 'auto',
                                height: 'auto'
                            }}
                            onLoad={(e) => {
                                const img = e.target as HTMLImageElement;
                                console.log('=== PREVIEW DEBUG (camera_capture_step) ===');
                                console.log('1. Image natural dimensions:', img.naturalWidth, 'x', img.naturalHeight);
                                console.log('2. Image display dimensions:', img.offsetWidth, 'x', img.offsetHeight);
                                console.log('3. Image client dimensions:', img.clientWidth, 'x', img.clientHeight);
                                console.log('4. Image aspect ratio:', (img.naturalWidth / img.naturalHeight).toFixed(3));
                                console.log('5. Image display aspect ratio:', (img.offsetWidth / img.offsetHeight).toFixed(3));
                                console.log('6. Image CSS class:', img.className);
                                console.log('7. Container dimensions:', img.parentElement?.offsetWidth, 'x', img.parentElement?.offsetHeight);
                                console.log('=== END PREVIEW DEBUG ===');
                            }}
                        />
                    </div>
                )}

                {/*/!* Hidden canvas for photo capture *!/*/}
                {/*<canvas ref={canvasRef} className="hidden" />*/}

                {/* Hidden file input for photo upload */}
                {/*<input*/}
                {/*    ref={fileInputRef}*/}
                {/*    type="file"*/}
                {/*    accept="image/*"*/}
                {/*    onChange={handleFileUpload}*/}
                {/*    className="hidden"*/}
                {/*    aria-label="Seleziona file immagine"*/}
                {/*/>*/}
            </div>

            {/* Controls */}
            <div className="bg-white/50 backdrop-blur-sm border-t border-white/30 p-4">

                {processState === 'done' && (
                    <div className="flex items-center justify-center gap-3 sm:gap-4">
                        <button
                            onClick={() => {
                                onBack()
                            }}
                            className="px-6 py-3 sm:px-8 sm:py-4 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 rounded-lg transition-colors touch-manipulation font-semibold"
                            title="Scatta di nuovo"
                            aria-label="Scatta di nuovo"
                        >
                            Scatta di nuovo
                        </button>

                        <button
                            onClick={() => {
                                onNext(imageUri!)
                            }}
                            className="px-6 py-3 sm:px-8 sm:py-4 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white rounded-lg transition-colors flex items-center gap-2 touch-manipulation font-semibold"
                            title="Usa Foto"
                            aria-label="Usa questa foto per l'analisi"
                        >
                            <CheckCircle size={20}/>
                            Usa Foto
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}