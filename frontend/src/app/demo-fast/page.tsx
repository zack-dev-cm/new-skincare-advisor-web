'use client';

import { useState, useEffect } from 'react';
import { AppConfigProvider } from '@/lib/AppConfigContext';
import SkinAnalysisModal from '@/components/SkinAnalysisModal';
import { startBackgroundLoading } from '@/lib/backgroundLoader';
import { AppConfig } from '@/types/app-config';
import { SHISEIDO_DEMO_THEME } from '@/lib/widget-theme';

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
  skipOnboarding: false,
  defaultUserData: {
    skin_type: 'normal',
    ageRange: '26 - 35',
    gender: 'female',
    budget_level: 'High',
    sensitivity: 'medium'
  }
};

export default function DemoFastPage() {
  const [showModal, setShowModal] = useState(true);
  const [isInIframe, setIsInIframe] = useState(false);

  // Start background loading for face detection and images
  useEffect(() => {
    setIsInIframe(window.parent !== window);
    startBackgroundLoading();
    console.log('🚀 Demo Fast: Background loading started, modal opened immediately');
  }, []);

  const handleCloseModal = () => {
    setShowModal(false);
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'DEMO_FAST_CLOSED' }, '*');
    }
    console.log('Demo modal closed');
  };

  return (
    <AppConfigProvider config={DEMO_CONFIG}>
      <div className={`demo-fast-shiseido w-full h-screen ${isInIframe ? 'bg-white' : 'bg-black/20'} flex items-center justify-center p-0 md:p-4`}>
        <SkinAnalysisModal 
          isOpen={showModal} 
          onClose={handleCloseModal} 
          embedded={isInIframe}
          fastMode={true}
          initialStep="gender"
          themeConfig={SHISEIDO_DEMO_THEME}
        />
      </div>
    </AppConfigProvider>
  );
}
