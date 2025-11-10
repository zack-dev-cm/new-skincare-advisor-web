import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { translations, type Locale } from './translations';

// Initialize i18next with in-memory translations for fast startup
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      it: {
        common: translations.it.common,
        analysis: translations.it.analysis,
        products: translations.it.products,
        steps: translations.it.steps,
      },
      es: {
        common: translations.es.common,
        analysis: translations.es.analysis,
        products: translations.es.products,
        steps: translations.es.steps,
      },
      en: {
        common: translations.en.common,
        analysis: translations.en.analysis,
        products: translations.en.products,
        steps: translations.en.steps,
      },
    },
    fallbackLng: 'it',
    supportedLngs: ['it', 'es', 'en'],
    
    // Namespace configuration
    ns: ['common', 'analysis', 'products', 'steps'],
    defaultNS: 'common',
    
    // Detection configuration
    detection: {
      // Order: 1) Query param, 2) localStorage, 3) Browser
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'locale',  // Read ?locale=en from URL
      caches: ['localStorage'],
    },
    
    interpolation: {
      escapeValue: false, // React already escapes
    },
    
    react: {
      useSuspense: false, // Disable Suspense for immediate rendering
    },
    
    // Synchronous initialization for fast startup
    initImmediate: true,
  });

export default i18n;
