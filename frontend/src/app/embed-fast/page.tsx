'use client';

import { useState, useEffect } from 'react';
import SkinAnalysisModal from '@/components/SkinAnalysisModal';
import { startBackgroundLoading } from '@/lib/backgroundLoader';
import i18n from '@/lib/i18n';

/**
 * ULTRA-FAST EMBED PAGE
 * 
 * Ottimizzazioni implementate:
 * 1. NO lazy loading - componenti caricati direttamente
 * 2. NO image preloader bloccante - modal si apre subito
 * 3. Background loading di face-api.js e immagini
 * 4. Skeleton UI per instant feedback
 * 
 * Tempo di apertura: ~100-300ms (vs 3-5 secondi precedenti)
 */
export default function FastEmbedPage() {
  const [showModal, setShowModal] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);

  // Avvia background loading NON BLOCCANTE
  useEffect(() => {
    // Inizia a caricare face-api.js e immagini in background
    // Il modal si apre comunque SUBITO
    startBackgroundLoading();
    
    console.log('🚀 Fast embed: Modal opened immediately, background loading started');
    
    // Read query parameters for market, locale, currency
    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get('shop');
    const locale = urlParams.get('locale');
    const currency = urlParams.get('currency');
    const market = urlParams.get('market');
    const country = urlParams.get('country');
    
    // Change i18n language if locale param is provided
    if (locale && ['it', 'es', 'en'].includes(locale) && i18n.language !== locale) {
      i18n.changeLanguage(locale);
      console.log('🌍 Language changed to:', locale);
    }
    
    if (shop || locale || currency || market || country) {
      setStoreData({ shop, locale, currency, market, country });
      console.log('Store data from URL params:', { shop, locale, currency, market, country });
    }
  }, []);

  // Listen for messages from parent Shopify page
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'OPEN_SKIN_ANALYSIS') {
        setShowModal(true);
        // Riavvia background loading se necessario
        startBackgroundLoading();
      } else if (event.data.type === 'CLOSE_SKIN_ANALYSIS') {
        setShowModal(false);
      } else if (event.data.type === 'SHOPIFY_STORE_DATA') {
        // Receive store data via postMessage (preferred method to avoid query param issues)
        setStoreData(event.data.payload);
        console.log('Store data received via postMessage:', event.data.payload);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCloseModal = () => {
    setShowModal(false);
    
    // Notify parent that modal was closed
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'SKIN_ANALYSIS_CLOSED',
        payload: {}
      }, '*');
    }
  };

  return (
    <div className="w-full h-screen bg-black/20 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
      <div className="w-full max-w-[540px] h-[95vh] max-h-[800px] bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 relative md:rounded-xl rounded-none">
        {/* Modal si renderizza SUBITO - nessun Suspense, nessun preloader */}
        <SkinAnalysisModal 
          isOpen={showModal} 
          onClose={handleCloseModal} 
          embedded={true}
          fastMode={true} // Nuova prop per modalità ultra-veloce
        />
      </div>
    </div>
  );
}

