'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import LogoWhite from './RGB_Logo_White.png';

// Lazy load the modal to reduce initial bundle size
const SkinAnalysisModal = lazy(() => import('@/components/SkinAnalysisModal'));
const ImagePreloader = lazy(() => import('@/components/ImagePreloader'));

export default function Home() {
  const { t } = useTranslation('common');
  const [showModal, setShowModal] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [isModalReady, setIsModalReady] = useState(false);
  const [imagesPreloaded, setImagesPreloaded] = useState(false);

  // Check if we're embedded in Shopify
  useEffect(() => {
    // Check if we're in an iframe or have Shopify-specific parameters
    const isInIframe = window.parent !== window;
    const urlParams = new URLSearchParams(window.location.search);
    const isShopifyEmbed = urlParams.get('embed') === 'true' || urlParams.get('shopify') === 'true';
    
    setIsEmbedded(isInIframe || isShopifyEmbed);
    
    // If embedded, show modal automatically after images are preloaded
    if (isInIframe || isShopifyEmbed) {
      // Don't set showModal immediately - wait for images to preload
    }
  }, []);

  // Listen for messages from parent Shopify page
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'OPEN_SKIN_ANALYSIS') {
        setShowModal(true);
      } else if (event.data.type === 'CLOSE_SKIN_ANALYSIS') {
        setShowModal(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle modal ready state
  const handleModalReady = () => {
    setIsModalReady(true);
  };

  // Handle image preloading completion
  const handleImagesPreloaded = () => {
    setImagesPreloaded(true);
    // If embedded, show modal after images are preloaded
    if (isEmbedded) {
      setShowModal(true);
    }
  };

  // Reset modal ready state when modal closes
  useEffect(() => {
    if (!showModal) {
      setIsModalReady(false);
    }
  }, [showModal]);

  // Fallback timeout in case onReady doesn't fire
  useEffect(() => {
    if (showModal && !isModalReady) {
      const fallbackTimer = setTimeout(() => {
        console.log('Modal ready fallback triggered');
        setIsModalReady(true);
      }, 2000); // 2 second fallback

      return () => clearTimeout(fallbackTimer);
    }
  }, [showModal, isModalReady]);

  const handleCloseModal = () => {
    setShowModal(false);
    
    // If embedded, notify parent that modal was closed
    if (isEmbedded && window.parent !== window) {
      window.parent.postMessage({
        type: 'SKIN_ANALYSIS_CLOSED',
        payload: {}
      }, '*');
    }
  };

  // If embedded, show only the modal
  if (isEmbedded) {
    return (
      <div className="w-full h-full relative">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="loader__wrapper">
                <div className="loader">&nbsp;</div>
              </div>
              <p className="text-gray-600 text-sm">{t('home.loading_skin_analysis')}</p>
            </div>
          </div>
        }>
          {!imagesPreloaded ? (
            <div>{t('home.loading')}</div>
          ) : (
            <SkinAnalysisModal 
              isOpen={showModal} 
              onClose={handleCloseModal} 
              embedded={true}
              onReady={handleModalReady}
            />
          )}
        </Suspense>
      </div>
    );
  }

  // For standalone mode, show a simple trigger button
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      <div className="bg-[#e9d5ff] border-b border-primary-200/70 flex items-center justify-center py-2">
        <Image src={LogoWhite} alt="Dermaself" className="h-12 w-auto" priority />
      </div>
      <div className="text-center flex flex-col items-center gap-6 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          {t('home.dermaself_title')}
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          {t('home.hero_description')}
        </p>
        <button
          suppressHydrationWarning
          onClick={() => setShowModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
        >
          {t('home.start_skin_analysis')}
        </button>
        
        <Suspense>
          {showModal ? (
            <ImagePreloader onComplete={() => setIsModalReady(true)}>
              <SkinAnalysisModal 
                isOpen={showModal} 
                onClose={handleCloseModal} 
                embedded={false} 
              />
            </ImagePreloader>
          ) : (
            <SkinAnalysisModal 
              isOpen={showModal} 
              onClose={handleCloseModal} 
              embedded={false} 
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
