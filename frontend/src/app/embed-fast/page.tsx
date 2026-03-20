'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import SkinAnalysisModal from '@/components/SkinAnalysisModal';
import { startBackgroundLoading } from '@/lib/backgroundLoader';
import i18n from '@/lib/i18n';
import dynamic from 'next/dynamic';
import { applyThemeConfig, type WidgetThemeConfig } from '@/lib/widget-theme';

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
  const [themeConfig, setThemeConfig] = useState<Partial<WidgetThemeConfig> | null>(null);
  const [mode, setMode] = useState<'default' | 'quiz'>('default');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [hasBuilderConfig, setHasBuilderConfig] = useState(false);
  const previewFallbackTimerRef = useRef<number | null>(null);
  // Handshake with parent: parent opens the modal and waits until config is ready,
  // so we don't show intermediate "Loading..." UI.
  const loadingConfigRef = useRef<boolean>(loadingConfig);
  const openRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadingConfigRef.current = loadingConfig;
  }, [loadingConfig]);

  useEffect(() => {
    if (loadingConfigRef.current) return;
    const requestId = openRequestIdRef.current;
    if (!requestId) return;
    openRequestIdRef.current = null;
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'SKIN_ANALYSIS_CONFIG_READY',
          payload: { requestId },
        },
        '*',
      );
    }
  }, [loadingConfig]);

  // Callback ref: applies theme as soon as the DOM node is attached (or when
  // themeConfig changes, which creates a new callback identity and causes React
  // to re-attach the ref).  This avoids the timing gap where a useEffect fires
  // before the loading → content transition has mounted the ref target.
  const widgetRootCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && themeConfig) {
        applyThemeConfig(node, themeConfig);
        console.log('🎨 Theme applied to widget root');
      }
    },
    [themeConfig],
  );

  // Function to fetch quiz config (reusable, stable across renders)
  const fetchQuizConfig = useCallback(async (shop: string, locale?: string, connectorUrlOverride?: string) => {
    try {
      const connectorApiUrl = (connectorUrlOverride || process.env.NEXT_PUBLIC_SHOPIFY_CONNECTOR_URL || 'https://connector.dermaself.it').replace(/\/$/, '');
      
      if (!connectorApiUrl) {
        console.warn('⚠️ NEXT_PUBLIC_SHOPIFY_CONNECTOR_URL not set, skipping quiz config load');
        return false;
      }

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
          const tpl = result.template;
          if (tpl && typeof tpl === 'object' && !Array.isArray(tpl)) {
            console.log('🎨 Widget theme config loaded:', tpl);
            setThemeConfig(tpl as Partial<WidgetThemeConfig>);
          }
          setQuizConfig(result.config);
          setQuizTranslations(result.translations || null);
          setMode('quiz');
          setShowModal(true);
          return true;
        } else {
          // Even without active quiz, apply template theme if present
          const tplInactive = result.template;
          if (tplInactive && typeof tplInactive === 'object' && !Array.isArray(tplInactive)) {
            console.log('🎨 Widget theme config loaded (no quiz):', tplInactive);
            setThemeConfig(tplInactive as Partial<WidgetThemeConfig>);
          }
          console.log('ℹ️ No active quiz configuration found, using default flow');
          return false;
        }
      } else {
        console.warn('⚠️ Failed to fetch quiz config, using default flow');
        return false;
      }
    } catch (error) {
      console.error('❌ Error loading quiz configuration:', error);
      return false;
    }
  }, []);

  /** Preview iframe skips full quiz-config fetch; still load template from API so branding matches the live widget. */
  const fetchWidgetTemplateForPreview = useCallback(
    async (shop: string, locale?: string, connectorUrlOverride?: string) => {
      try {
        const connectorApiUrl = (
          connectorUrlOverride ||
          process.env.NEXT_PUBLIC_SHOPIFY_CONNECTOR_URL ||
          'https://connector.dermaself.it'
        ).replace(/\/$/, '');
        if (!connectorApiUrl) return;

        const apiLocale = (locale || i18n.language || 'en').split('-')[0];
        const apiUrl = `${connectorApiUrl}/api/quiz-config?shop=${encodeURIComponent(shop)}&locale=${encodeURIComponent(apiLocale)}`;
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) return;
        const result = await response.json();
        const tpl = result.template;
        if (tpl && typeof tpl === 'object' && !Array.isArray(tpl)) {
          // Let postMessage template override when present (arrives after this fetch).
          setThemeConfig((prev) => ({ ...(tpl as Partial<WidgetThemeConfig>), ...(prev || {}) }));
        }
      } catch (e) {
        console.warn('Quiz builder preview: could not load widget template from API', e);
      }
    },
    [],
  );

  // Load quiz configuration from API and initialize
  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      // Avvia background loading NON BLOCCANTE
      startBackgroundLoading();
      console.log('🚀 Fast embed: Modal opened immediately, background loading started');
      
      // Read query parameters
      const urlParams = new URLSearchParams(window.location.search);
      const shop = urlParams.get('shop');
      const rawLocale = urlParams.get('locale');
      const currency = urlParams.get('currency');
      const market = urlParams.get('market');
      const country = urlParams.get('country');
      const connectorUrlParam = urlParams.get('connectorUrl');
      const quizBuilderPreview = urlParams.get('quizBuilderPreview') === '1';

      // Normalize locale from URL params (e.g., 'it-IT' -> 'it')
      const locale = rawLocale?.split('-')[0] ?? null;
      
      // Change i18n language if locale param is provided
      if (locale && ['it', 'es', 'en'].includes(locale) && i18n.language !== locale) {
        i18n.changeLanguage(locale);
        console.log('🌍 Language changed to:', locale);
      }
      
      if (shop || locale || currency || market || country) {
        setStoreData({ shop, locale, currency, market, country, connectorUrl: connectorUrlParam });
        console.log('Store data from URL params:', { shop, locale, currency, market, country, connectorUrl: connectorUrlParam });
      }

      // Quiz Builder preview: do not use API for quiz steps (order). Load template from API + questions from parent.
      if (shop && quizBuilderPreview) {
        console.log(
          '🧪 quizBuilderPreview: loading template from API; requesting quiz config from parent via QUIZ_CONFIG_REQUEST',
        );
        void fetchWidgetTemplateForPreview(shop, locale ?? undefined, connectorUrlParam ?? undefined);
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'QUIZ_CONFIG_REQUEST' }, '*');
        }
        if (previewFallbackTimerRef.current != null) window.clearTimeout(previewFallbackTimerRef.current);
        previewFallbackTimerRef.current = window.setTimeout(() => {
          if (!cancelled) {
            setLoadingConfig(false);
            console.warn('⚠️ quizBuilderPreview: no config from parent within 15s');
          }
          previewFallbackTimerRef.current = null;
        }, 15000) as unknown as number;
        return;
      }

      // Fetch quiz configuration from API if shop is provided in URL params
      if (shop) {
        await fetchQuizConfig(shop, locale ?? undefined, connectorUrlParam ?? undefined);
        if (!cancelled) setLoadingConfig(false);
      } else {
        // No shop in URL params — iframe might have been loaded without query params.
        // Ask parent Shopify page for store data via postMessage and wait briefly.
        console.log('📡 No shop in URL params, requesting store data from parent...');
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'REQUEST_STORE_DATA' }, '*');
        }
        // Give the parent a short window to respond with SHOPIFY_STORE_DATA
        // before falling back to the default flow
        setTimeout(() => {
          if (!cancelled) setLoadingConfig(false);
        }, 2000);
      }
    };

    void initialize();
    return () => {
      cancelled = true;
      if (previewFallbackTimerRef.current) {
        window.clearTimeout(previewFallbackTimerRef.current);
        previewFallbackTimerRef.current = null;
      }
    };
  }, [fetchQuizConfig, fetchWidgetTemplateForPreview]);

  // Listen for messages from parent Shopify page
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const raw = event.data;
      const data =
        raw && typeof raw === 'object' && 'type' in raw
          ? raw
          : typeof raw === 'string'
            ? (() => {
                try {
                  return JSON.parse(raw) as { type?: string };
                } catch {
                  return null;
                }
              })()
            : null;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'OPEN_SKIN_ANALYSIS') {
        const payload = (data as { payload?: Record<string, unknown> }).payload;
        const requestId = payload && typeof payload.requestId === 'string' ? payload.requestId : null;
        openRequestIdRef.current = requestId;
        setShowModal(true);
        // Riavvia background loading se necessario
        startBackgroundLoading();

        // If config already loaded, acknowledge immediately.
        if (requestId && !loadingConfigRef.current) {
          openRequestIdRef.current = null;
          if (window.parent !== window) {
            window.parent.postMessage(
              {
                type: 'SKIN_ANALYSIS_CONFIG_READY',
                payload: { requestId },
              },
              '*',
            );
          }
        }
      } else if (data.type === 'CLOSE_SKIN_ANALYSIS') {
        setShowModal(false);
      } else if (data.type === 'SHOPIFY_STORE_DATA') {
        // Receive store data via postMessage from Shopify parent page
        // This is the primary way locale is passed from Shopify's Liquid context
        const payload = (data as { payload?: Record<string, unknown> }).payload;
        setStoreData(payload);
        console.log('🌍 Store data received via postMessage:', payload);
        
        // Normalize locale from Shopify (e.g. "it-IT" → "it")
        const locale =
          payload && typeof payload.locale === 'string' ? payload.locale.split('-')[0] : undefined;
        if (locale && ['it', 'es', 'en'].includes(locale) && i18n.language !== locale) {
          i18n.changeLanguage(locale);
          console.log('🌍 Language changed to:', locale);
        }
        
        // Fetch quiz config with the Shopify locale only if we are NOT in preview
        // mode using builder-provided config.
        if (!hasBuilderConfig && payload && typeof payload === 'object' && 'shop' in payload && (payload as { shop?: string }).shop) {
          const p = payload as { shop: string; locale?: string };
          fetchQuizConfig(p.shop, locale).finally(() => {
            setLoadingConfig(false);
          });
        } else {
          setLoadingConfig(false);
        }
      } else if (data.type === 'QUIZ_CONFIG_UPDATE') {
        // Preview mode from Shopify Quiz Builder: use config sent via postMessage,
        // including the question order defined there.
        const payload = data as {
          type: string;
          shop?: string;
          config?: QuizConfig;
          template?: Partial<WidgetThemeConfig>;
        };

        if (payload.config) {
          if (previewFallbackTimerRef.current) {
            window.clearTimeout(previewFallbackTimerRef.current);
            previewFallbackTimerRef.current = null;
          }
          console.log('🧩 QUIZ_CONFIG_UPDATE received from parent, using builder config for preview');
          setQuizConfig(payload.config);
          setQuizTranslations(null);
          setMode('quiz');
          setShowModal(true);
          setLoadingConfig(false);
          setHasBuilderConfig(true);
          // postMessage template wins over API preview fetch (same DB; supports newer admin fields).
          const tpl = payload.template;
          if (tpl && typeof tpl === 'object' && !Array.isArray(tpl)) {
            setThemeConfig((prev) => ({ ...(prev || {}), ...(tpl as Partial<WidgetThemeConfig>) }));
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchQuizConfig, hasBuilderConfig]);

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
    // Theme is applied inside QuizForm (useLayoutEffect on quiz root). Skip outer ref so we do not run
    // applyThemeConfig before the lazy-loaded form (and .logo-violet) have mounted.
    return (
      <div className="w-full h-screen bg-black/20 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
        <div className="w-full max-w-[540px] h-[95vh] max-h-[800px] bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 relative md:rounded-xl rounded-none">
          <QuizForm 
            config={quizConfig}
            isOpen={showModal}
            onClose={handleCloseModal}
            storeData={storeData}
            translations={quizTranslations}
            themeConfig={themeConfig ?? undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black/20 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
        <div ref={widgetRootCallback} className="w-full max-w-[540px] h-[95vh] max-h-[800px] bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 relative md:rounded-xl rounded-none">
        {/* Modal si renderizza SUBITO - nessun Suspense, nessun preloader */}
        <SkinAnalysisModal 
          isOpen={showModal} 
          onClose={handleCloseModal} 
          embedded={true}
          fastMode={true} // Nuova prop per modalità ultra-veloce
          themeConfig={themeConfig ?? undefined}
        />
      </div>
    </div>
  );
}

