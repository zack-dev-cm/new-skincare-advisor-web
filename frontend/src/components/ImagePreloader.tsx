"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { preloadStepImages, getLoadingProgress } from '../lib/imagePreloader';
import LogoWhite from '../app/RGB_Logo_White.png';

interface ImagePreloaderProps {
  onComplete: () => void;
  children: React.ReactNode;
  mode?: 'initial' | 'analysis'; // New prop to differentiate loading modes
  analysisProgress?: number; // Optional analysis progress for analysis mode
}

export default function ImagePreloader({ 
  onComplete, 
  children, 
  mode = 'initial',
  analysisProgress = 0 
}: ImagePreloaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Preparando la tua analisi della pelle...');
  const [currentPhase, setCurrentPhase] = useState<'preparing' | 'analyzing' | 'complete'>('preparing');

  useEffect(() => {
    const loadImages = async () => {
      try {
        if (mode === 'initial') {
          // Initial image preloading
          setLoadingText('Dermaself - Analisi della Pelle AI');
          setCurrentPhase('preparing');
          
          // Start preloading images
          const preloadPromise = preloadStepImages();
          
          // Update progress periodically
          const progressInterval = setInterval(() => {
            const { percentage } = getLoadingProgress();
            setProgress(percentage);
            
            if (percentage >= 100) {
              clearInterval(progressInterval);
            }
          }, 100);
          
          // Wait for preloading to complete
          const results = await preloadPromise;
          
          clearInterval(progressInterval);
          setProgress(100);
          
          // Check if we have any successful loads
          const successful = results.filter(r => r.success).length;
          const total = results.length;
          
          if (successful === 0) {
            console.warn('⚠️ No images loaded successfully, but continuing...');
          } else {
            console.log(`✅ Image preloading completed: ${successful}/${total} images loaded`);
          }
          
          // Small delay to show completion
          setTimeout(() => {
            setIsLoading(false);
            onComplete();
          }, 500);
          
        } else if (mode === 'analysis') {
          // Analysis loading mode
          setLoadingText('Analizzando la Tua Foto');
          setCurrentPhase('analyzing');
          
          // Simulate analysis progress
          const analysisInterval = setInterval(() => {
            setProgress(analysisProgress);
            
            if (analysisProgress >= 100) {
              clearInterval(analysisInterval);
              setCurrentPhase('complete');
              setLoadingText('Analisi Completata!');
              
              setTimeout(() => {
                setIsLoading(false);
                onComplete();
              }, 1000);
            }
          }, 100);
          
          return () => clearInterval(analysisInterval);
        }
        
      } catch (error) {
        console.error('Loading failed:', error);
        setLoadingText('Continuando...');
        // Even if loading fails, continue with the app
        setTimeout(() => {
          setIsLoading(false);
          onComplete();
        }, 1000);
      }
    };

    loadImages();
  }, [onComplete, mode, analysisProgress]);

  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      
      {/* Modal Container - Same as SkinAnalysisModal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative w-full bg-white overflow-hidden flex flex-col h-full md:max-w-[540px] w-full h-full md:max-h-[95vh]"
      >
        {/* Header - Same as modal */}
        <div className="px-4 py-3 flex items-center justify-center border-b border-primary-200/70 bg-primary-800">
          <div className="flex-1 text-center flex items-center justify-center">
            <Image src={LogoWhite} alt="Dermaself" className="h-8 w-auto" priority />
          </div>
        </div>

        {/* Loading Content */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
          <div className="text-center max-w-sm w-full mx-4">
            {/* Loading Animation */}
            <div className="mb-6">
              <motion.div
                className="w-16 h-16 bg-gradient-to-r from-primary-600 to-primary-500 rounded-full mx-auto mb-4"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 180, 360]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {loadingText}
              </h2>
              
              <p className="text-sm text-gray-600">
                {mode === 'initial' 
                  ? 'Preparing your skincare analysis experience...'
                  : 'Our AI is analyzing your skin and creating personalized recommendations...'
                }
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <motion.div
                className="bg-gradient-to-r from-primary-600 to-primary-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            
            <div className="text-center">
              <span className="text-sm font-medium text-gray-700">
                {progress}%
              </span>
            </div>

            {/* Phase Indicator for Analysis Mode */}
            {mode === 'analysis' && (
              <div className="mt-4 flex justify-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${currentPhase === 'preparing' ? 'bg-primary-600' : 'bg-gray-300'}`} />
                <div className={`w-2 h-2 rounded-full ${currentPhase === 'analyzing' ? 'bg-primary-600' : 'bg-gray-300'}`} />
                <div className={`w-2 h-2 rounded-full ${currentPhase === 'complete' ? 'bg-primary-600' : 'bg-gray-300'}`} />
              </div>
            )}
          </div>
        </div>

        {/* Footer - Same as modal */}
        <div className="bg-primary-800 px-4 py-2 border-t border-primary-900">
          <div className="flex items-center justify-center">
            <p className="text-xs text-white/70">
              {mode === 'initial' 
                ? 'Optimizing your experience...'
                : 'Please wait while we process your image...'
              }
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
