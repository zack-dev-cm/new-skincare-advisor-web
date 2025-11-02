"use client";
import React, {useEffect, useState} from 'react';
import {motion} from 'framer-motion';
import {CheckCircle} from 'lucide-react';
import * as ort from 'onnxruntime-web';
import {pipeline, RawImage} from "@huggingface/transformers";

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

export default function ProcessingStep({onNext, onBack, capturedImageUri}: ProcessingStepProps) {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(true);
    const [imgData, setImgData] = useState<ImageData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [processState, setProcessState] = useState<'processing' | 'done'>('processing');
    const [workCanvas, setWorkCanvas] = useState<HTMLCanvasElement | null>(null);
    const [workCtx, setWorkCtx] = useState<CanvasRenderingContext2D | null>(null);

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
        setImageUri(capturedImageUri) //fallback to this if processing fails
        processingPipeline();
    }, [canvasRef]); // Run once on component mount

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


    const upscaleimage2x = async (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
        if (!ctx || !canvas) return;
        console.log('Upscaling image started...');
        if (true){
            console.log('naive upscaling on mobile device for performance');
            await naiveUpscale(ctx, canvas);
            return;
        }
        const {width: w, height: h} = canvas;
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
                    device: isMobileDevice() ? 'wasm' : 'webgpu',
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
            model.abort();
            return;
        }

        const upscaledImg = await loadImage(result.data[0]);

        // Resize canvas to new dimensions
        canvas.width = w * 2;      // corrected: upscale actually doubles size
        canvas.height = h * 2;
        ctx.drawImage(upscaledImg, 0, 0);
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
            // Resize image
            resizeimage(ctx, canvas, inputsize_model, inputsize_model);

            console.log('Image resized for model input. ', workCanvas?.width, 'x', workCanvas?.height);
            //feed to model here
            //curImg = model_enhancement(curImg);
            //simulate working time
            //await new Promise((resolve) => setTimeout(resolve, 2000));
            //get back image from model
            if (isMobileDevice()) {
                //on mobile devices skip upscaling for performance
                console.log('Skipping upscaling on mobile device for performance');
            }else {
                await upscaleimage2x(ctx, canvas);
            }
            console.log('Image upscaled. ', canvas!.width, 'x', canvas!.height);
            //set final image
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