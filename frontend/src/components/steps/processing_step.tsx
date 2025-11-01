"use client";
import React, {useEffect, useRef, useState} from 'react';
import {motion} from 'framer-motion';
import {Camera, CheckCircle, Move, SwitchCameraIcon, Upload} from 'lucide-react';

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


    useEffect(() => {
        // Simulate processing delay
        const processingTimeout = setTimeout(() => {
            // Here you would normally process the imgData
            // For simulation, save the input image as processed image
            setImageUri(capturedImageUri);
            setIsProcessing(false);
            setProcessState('done');
        }, 1000); // 1 second delay

        return () => clearTimeout(processingTimeout);
    });

    return (
        <motion.div
            key="processing-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-main bg-cover bg-center h-full flex flex-col"
        >
            {/* interface*/}
            <div className="flex-1 relative bg-black overflow-hidden">
                {isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
                        <div className="text-white text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
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
                            onClick={() => {onBack()}}
                            className="px-6 py-3 sm:px-8 sm:py-4 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 rounded-lg transition-colors touch-manipulation font-semibold"
                            title="Scatta di nuovo"
                            aria-label="Scatta di nuovo"
                        >
                            Scatta di nuovo
                        </button>

                        <button
                            onClick={() => {onNext(imageUri!)}}
                            className="px-6 py-3 sm:px-8 sm:py-4 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white rounded-lg transition-colors flex items-center gap-2 touch-manipulation font-semibold"
                            title="Usa Foto"
                            aria-label="Usa questa foto per l'analisi"
                        >
                            <CheckCircle size={20} />
                            Usa Foto
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}