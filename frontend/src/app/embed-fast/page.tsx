'use client';

import { useState, useEffect } from 'react';
import SkinAnalysisModal from '@/components/SkinAnalysisModal';
import { startBackgroundLoading } from '@/lib/backgroundLoader';
import i18n from '@/lib/i18n';
import dynamic from 'next/dynamic';

const QuizForm = dynamic(() => import('@/components/QuizForm'), {
  ssr: false,
});

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

interface QuizConfig {
  version: string;
  questions: any[];
  settings: {
    showProgress: boolean;
    allowSkipping: boolean;
    theme: {
      primaryColor: string;
      secondaryColor: string;
      fontFamily: string;
    };
  };
  resultPage: {
    enabled: boolean;
    showRecommendations: boolean;
    redirectUrl: string | null;
  };
}

interface QuizTranslations {
  [key: string]: string;
}

export default function FastEmbedPage() {
  const [showModal, setShowModal] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null);
  const [quizTranslations, setQuizTranslations] = useState<QuizTranslations | null>(null);
  const [mode, setMode] = useState<'default' | 'quiz'>('default');
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Function to fetch quiz config (reusable)
  const fetchQuizConfig = async (shop: string, locale?: string) => {
    try {
      const connectorApiUrl = (process.env.NEXT_PUBLIC_SHOPIFY_CONNECTOR_URL || 'https://connector.dermaself.it').replace(/\/$/, '');
      
      if (connectorApiUrl) {
        // Determine locale for API request - use provided locale or fallback to detected language
        const apiLocale = locale || i18n.language || 'en';
        // Normalize locale to match API expectations (e.g., 'en-US' -> 'en')
        const normalizedLocale = apiLocale.split('-')[0];
        
        const apiUrl = `${connectorApiUrl}/api/quiz-config?shop=${encodeURIComponent(shop)}&locale=${encodeURIComponent(normalizedLocale)}`;
        console.log('📥 Fetching quiz configuration from:', apiUrl);
        console.log('🌍 Using locale for translations:', normalizedLocale);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.config && result.isActive) {
            console.log('✅ Quiz configuration loaded from API:', result.config);
            console.log('📝 Quiz translations loaded:', result.translations);
            setQuizConfig(result.config);
            setQuizTranslations(result.translations || null);
            setMode('quiz');
            setShowModal(true);
            return true;
          } else {
            console.log('ℹ️ No active quiz configuration found, using default flow');
            return false;
          }
        } else {
          console.warn('⚠️ Failed to fetch quiz config, using default flow');
          return false;
        }
      } else {
        console.warn('⚠️ NEXT_PUBLIC_SHOPIFY_CONNECTOR_URL not set, skipping quiz config load');
        return false;
      }
    } catch (error) {
      console.error('❌ Error loading quiz configuration:', error);
      return false;
    }
  };

  // Load quiz configuration from API and initialize
  useEffect(() => {
    const initialize = async () => {
      // Avvia background loading NON BLOCCANTE
      startBackgroundLoading();
      console.log('🚀 Fast embed: Modal opened immediately, background loading started');
      
      // Read query parameters
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

      // Fetch quiz configuration from API if shop is provided
      if (shop) {
        fetchQuizConfig(shop, locale ?? undefined);
      }
      
      setLoadingConfig(false);
    };

    initialize();
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
        const payload = event.data.payload;
        setStoreData(payload);
        console.log('Store data received via postMessage:', payload);
        
        // Update i18n language if locale is provided
        if (payload.locale && ['it', 'es', 'en'].includes(payload.locale) && i18n.language !== payload.locale) {
          i18n.changeLanguage(payload.locale);
          console.log('🌍 Language changed to:', payload.locale);
        }
        
        // Re-fetch quiz config with the new locale if shop is provided
        if (payload.shop) {
          fetchQuizConfig(payload.shop, payload.locale);
        }
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

  // Show quiz form if config is loaded, otherwise show default modal
  if (loadingConfig) {
    // Show loading state while fetching config
    return (
      <div className="w-full h-screen bg-black/20 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
        <div className="w-full max-w-[540px] h-[95vh] max-h-[800px] bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 relative md:rounded-xl rounded-none flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (mode === 'quiz' && quizConfig) {
    return (
      <div className="w-full h-screen bg-black/20 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
        <div className="w-full max-w-[540px] h-[95vh] max-h-[800px] bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 relative md:rounded-xl rounded-none">
          <QuizForm 
            config={quizConfig}
            isOpen={showModal}
            onClose={handleCloseModal}
            storeData={storeData}
            translations={quizTranslations}
          />
        </div>
      </div>
    );
  }

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

