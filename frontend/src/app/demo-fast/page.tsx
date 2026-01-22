'use client';

import { useState, useEffect } from 'react';
import { AppConfigProvider } from '@/lib/AppConfigContext';
import SkinAnalysisModal from '@/components/SkinAnalysisModal';
import { startBackgroundLoading } from '@/lib/backgroundLoader';
import { AppConfig } from '@/types/app-config';

/**
 * DEMO FAST PAGE
 * 
 * This page is designed for B2B customers to test the skin analysis feature
 * without Shopify integration. It:
 * - Skips onboarding steps and goes directly to camera capture
 * - Uses fixed shop domain "dermaself"
 * - Shows product recommendations from API only (no Shopify integration)
 * - Disables cart and checkout functionality
 * 
 * Load time: ~100-300ms with background loading
 */

const DEMO_CONFIG: AppConfig = {
  mode: 'demo',
  shopDomain: 'dermaself',
  enableCart: false,
  enableShopifyIntegration: false,
  skipOnboarding: true,
  defaultUserData: {
    skin_type: 'Normale',
    ageRange: '26 - 35',
    gender: 'female',
    budget_level: 'High'
  }
};

export default function DemoFastPage() {
  const [showModal, setShowModal] = useState(true);

  // Start background loading for face detection and images
  useEffect(() => {
    startBackgroundLoading();
    console.log('🚀 Demo Fast: Background loading started, modal opened immediately');
    
    // Fix viewport height for mobile browsers
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);
    
    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  const handleCloseModal = () => {
    setShowModal(false);
    console.log('Demo modal closed');
  };

  return (
    <AppConfigProvider config={DEMO_CONFIG}>
      <div className="w-full h-screen h-[calc(var(--vh,1vh)*100)] bg-black/20 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
        <div className="w-full h-full max-w-[540px] max-h-[100vh] max-h-[calc(var(--vh,1vh)*100)] md:h-[95vh] md:max-h-[800px] bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 relative md:rounded-xl rounded-none">
          <SkinAnalysisModal 
            isOpen={showModal} 
            onClose={handleCloseModal} 
            embedded={false}
            fastMode={true}
            initialStep="photo-instructions"
          />
        </div>
      </div>
    </AppConfigProvider>
  );
}
