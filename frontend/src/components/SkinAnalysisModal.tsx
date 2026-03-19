"use client";
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera } from 'lucide-react';

// Import step components
import {
  OnboardingStep,
  SkinTypeStep,
  SkinConcernsStep,
  GenderStep,
  AgeStep,
  SensitivityStep,
  PhotoInstructionsStep,
  ResultsStep,
  ModalFooter
} from './steps';

// Import unified loading component
import ImagePreloader from './ImagePreloader';

// Import app configuration
import { useAppConfig } from '@/lib/AppConfigContext';
import { useLocale } from '@/lib/LocaleContext';
import { WidgetThemeConfigProvider } from '@/lib/WidgetThemeConfigContext';
import {
  applyThemeConfig,
  WIDGET_HEADER_LOGO_IMG_CLASS,
  type WidgetThemeConfig,
} from '@/lib/widget-theme';

import dynamic from 'next/dynamic';

// Brand logo (violet SVG)
const LOGO_VIOLET = '/RGM_Logo_Violet.svg';

const CameraCaptureStep = dynamic(() => import('./steps/camera_capture_step'), {
  loading: () => <ImagePreloader mode="initial" onComplete={() => {}}><div></div></ImagePreloader>,
  ssr: false,
});

const ScanStep = dynamic(() => import('./steps/scan_step'), {
  loading: () => <ImagePreloader mode="initial" onComplete={() => {}}><div></div></ImagePreloader>,
  ssr: false,
});

type Step = 'onboarding' | 'gender' | 'age' | 'skin-concerns' | 'skin-type' | 'sensitivity' | 'photo-instructions' | 'camera-capture' | 'scan' | 'results';

interface SkinAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
  onReady?: () => void;
  fastMode?: boolean; // Modalità ultra-veloce per embed (no preloading bloccante)
  initialStep?: Step; // Step iniziale per saltare l'onboarding (usato in demo mode)
  themeConfig?: Partial<WidgetThemeConfig>; // Merchant widget theming
}

// Product data interfaces
interface Product {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  size: string;
  description: string;
  tags: string[];
  usage: 'morning' | 'evening' | 'both';
  step: 'cleanse' | 'moisturise' | 'protect' | 'addon';
  skinTypes: string[];
  shopifyProductId?: string;
  shopifyVariantId?: string;
  inStock: boolean;
  rating?: number;
  reviewCount?: number;
}

interface RoutineStep {
  step: string;
  title: string;
  products: Product[];
}

interface SkinRoutine {
  essential: RoutineStep[];
  expert: RoutineStep[];
  addons: Product[];
}

// API functions
const getProducts = async (): Promise<Product[]> => {
  return [];
};

export default function SkinAnalysisModal({ isOpen, onClose, embedded = false, onReady, fastMode = false, initialStep, themeConfig }: SkinAnalysisModalProps) {
  const { t } = useTranslation(['steps', 'common']);
  // Get app configuration
  const appConfig = useAppConfig();
  const { locale } = useLocale();

  // Callback ref: applies merchant theme CSS variables as soon as the
  // motion.div is mounted (or when themeConfig/isOpen changes).
  const modalRootCallback = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (node && themeConfig) {
        applyThemeConfig(node, themeConfig);
        console.log('🎨 Theme config applied to modal root');
      }
    },
    [themeConfig],
  );

  // Initialize face detection models when modal opens

  // Helper functions to map user selections to API format
  const mapAgeToAgeRange = (ageSelection: string): string => {
    switch (ageSelection) {
      case '18-24': return '18 - 25';
      case '25-34': return '26 - 35';
      case '35-44': return '36 - 45';
      case '45-54': return 'Più di 45';
      case '55+': return 'Più di 45';
      default: return '26 - 35';
    }
  };

  const mapGenderToApiFormat = (genderSelection: string): string => {
    switch (genderSelection) {
      case 'woman': return 'female';
      case 'man': return 'male';
      case 'non-binary': return 'non_binary';
      case 'prefer-not-to-specify': return 'non_binary';
      default: return 'female';
    }
  };

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // State management
  const [currentStep, setCurrentStep] = useState<Step>('onboarding');
  const [selectedSkinType, setSelectedSkinType] = useState<string>('');
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedAge, setSelectedAge] = useState<string>('');
  const [selectedSensitivity, setSelectedSensitivity] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageMetadata, setImageMetadata] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  
  // Product and routine state
  const [routine, setRoutine] = useState<SkinRoutine | null>(null);
  const [routineType, setRoutineType] = useState<'essential' | 'expert'>('essential');
  const [recommendationSource, setRecommendationSource] = useState<'ai' | 'questionnaire'>('ai');
  const [loading, setLoading] = useState(false);
  const [realProducts, setRealProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'results' | 'routine'>('results');
  
  // Cart state
  const [cartItems, setCartItems] = useState<{ [productId: string]: number }>({});
  const [cartLoading, setCartLoading] = useState<{ [productId: string]: boolean }>({});
  const [isShopify, setIsShopify] = useState(false);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('onboarding');
      setSelectedSkinType('');
      setSelectedConcerns([]);
      setSelectedGender('');
      setSelectedAge('');
      setSelectedSensitivity('');
      setCapturedImage(null);
      setImageMetadata(null);
      setAnalysisData(null);
      setShowCamera(false);
      setOpenInfo(null);
      setRoutine(null);
      setRoutineType('essential');
      setRecommendationSource('ai');
      setRealProducts([]);
      setActiveTab('results');
      setCartItems({});
      setCartLoading({});
      setIsShopify(false);
    }
  }, [isOpen]);

  // Notify when modal is ready
  useEffect(() => {
    if (isOpen && onReady) {
      // Immediate callback for faster feedback
      requestAnimationFrame(() => {
        onReady();
      });
    }
  }, [isOpen, onReady]);

  // In fastMode, avvia background loading appena il modal si apre
  useEffect(() => {
    if (isOpen && fastMode && typeof window !== 'undefined') {
      // Import background loader solo quando serve
      import('../lib/backgroundLoader').then(({ startBackgroundLoading }) => {
        startBackgroundLoading();
      });
    }
  }, [isOpen, fastMode]);

  // Set initial step if provided (demo mode)
  useEffect(() => {
    if (isOpen && initialStep) {
      setCurrentStep(initialStep);
      console.log(`🎯 Demo mode: Starting at step '${initialStep}'`);
    }
  }, [isOpen, initialStep]);

  // Step navigation
  const handleNext = () => {
    const stepOrder: Step[] = ['onboarding', 'gender', 'age', 'skin-concerns', 'skin-type', 'sensitivity', 'photo-instructions', 'camera-capture', 'scan', 'results'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      const nextStep = stepOrder[currentIndex + 1];
      setCurrentStep(nextStep);
      
      // In fastMode, precarica immagini per il PROSSIMO step in background
      if (fastMode && typeof window !== 'undefined') {
        import('../lib/progressiveImageLoader').then(({ preloadForStep }) => {
          preloadForStep(nextStep);
        });
      }
    }
  };

  const handleBack = () => {
    const stepOrder: Step[] = ['onboarding', 'gender', 'age', 'skin-concerns', 'skin-type', 'sensitivity', 'photo-instructions', 'camera-capture', 'scan', 'results'];
    const currentIndex = stepOrder.indexOf(currentStep);
    
    if (currentStep === 'results') {
      setCurrentStep('camera-capture');
      return;
    }
    
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleRestart = () => {
    // In demo mode, restart from the configured initial step (skin-type)
    setCurrentStep(initialStep ?? (appConfig.skipOnboarding ? 'photo-instructions' : 'onboarding'));
    setSelectedSkinType('');
    setSelectedConcerns([]);
    setSelectedGender('');
    setSelectedAge('');
    setSelectedSensitivity('');
    setCapturedImage(null);
    setAnalysisData(null);
    setOpenInfo(null);
    setLoading(false);
    setRealProducts([]);
    setActiveTab('results');
    setRoutineType('essential');
    setRecommendationSource('ai');
  };

  // Get current step number for progress indicator
  const getCurrentStepNumber = () => {
    const stepOrder = ['onboarding', 'gender', 'age', 'skin-concerns', 'skin-type', 'sensitivity', 'photo-instructions', 'camera-capture', 'scan', 'results'];
    return stepOrder.indexOf(currentStep) + 1;
  };

  // Image capture handler
  const handleImageCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setImageMetadata({ timestamp: new Date().toISOString() }); // Default metadata
    setShowCamera(false);
    
    // Set default skin type if empty to ensure proper flow (use key, not translated label)
    if (!selectedSkinType) {
      setSelectedSkinType('normal');
    }
    
    // Show loading state immediately
    setLoading(true);
    
    // Use unified loading component instead of separate loading step
    // The loading will be handled by wrapping the results step
    setCurrentStep('results');
      
    // Trigger analysis immediately with user data and recommendations
    try {
      // Prepare user data — user selections always take priority over defaultUserData fallbacks.
      // defaultUserData is only used when the user skipped a step (empty selection).
      const defaults = appConfig.defaultUserData;
      const userData = {
        first_name: appConfig.mode === 'demo' ? 'Demo' : 'User',
        last_name: appConfig.mode === 'demo' ? 'User' : 'Test',
        ageRange: selectedAge
          ? mapAgeToAgeRange(selectedAge)
          : (defaults?.ageRange ?? '26 - 35'),
        gender: selectedGender
          ? mapGenderToApiFormat(selectedGender)
          : (defaults?.gender ?? 'female'),
        skin_type: selectedSkinType || defaults?.skin_type || 'normal',
        concerns: selectedConcerns.length > 0 ? selectedConcerns : [],
        sensitivity: (selectedSensitivity || defaults?.sensitivity || 'medium') as 'high' | 'medium' | 'low',
        budget_level: (defaults?.budget_level ?? 'High') as 'Low' | 'Medium' | 'High',
      };
      
      // Call the new API with recommendations
      const { analyzeSkinWithRecommendations } = await import('../lib/api');
      const analysisResult = await analyzeSkinWithRecommendations(
        imageData,
        userData,
        undefined,
        locale
      );
      
      setAnalysisData(analysisResult);
      setRecommendationSource('ai');
      
      // This ensures we always get updated product information
      
      setCurrentStep('results');
    } catch (error) {
      console.error('Analysis failed:', error);
      // Fallback to mock data
      setAnalysisData({
        image_url: imageData,
        skin_type: selectedSkinType,
        concerns: ['Fine Lines', 'Dehydration'],
        recommendations: 'Personalized routine suggested'
      });
        setCurrentStep('results');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <WidgetThemeConfigProvider value={themeConfig ?? null}>
      <div className="derma-modal-root fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={appConfig.skipOnboarding ? undefined : handleClose}
        />

        {/* Modal Container */}
        <motion.div
          ref={modalRootCallback}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative w-full h-full bg-white overflow-clip flex flex-col md:max-w-[540px] md:max-h-[100vh]"
        >
          {/* Fixed Header inside Modal - Sticky on all screen sizes */}
          <div className="sticky top-0 z-50 modal-header-bar px-4 py-2 safe-area-top flex items-center justify-between border-b flex-shrink-0">
          {/* Back Button - hidden in demo mode */}
          <div className="flex items-center min-w-[32px]">
            {!appConfig.skipOnboarding && currentStep !== 'onboarding' && (
              <button
                onClick={handleBack}
                className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition-colors text-gray-700"
                aria-label={t('common:buttons.go_back')}
                title={t('common:buttons.go_back')}
              >
                <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
          </div>

          {/* Centered Brand Logo */}
          <div className="flex-1 text-center flex items-center justify-center">
            <div className={`${currentStep === 'onboarding' || appConfig.skipOnboarding ? 'pl-0' : ''}`}>
              <img
                src={themeConfig?.logoUrl || LOGO_VIOLET}
                alt="Dermaself"
                className={WIDGET_HEADER_LOGO_IMG_CLASS}
              />
            </div>
          </div>

          {/* Close Button - hidden in demo mode */}
          <div className="flex items-center min-w-[32px]">
            {!appConfig.skipOnboarding && (
              <button
                onClick={handleClose}
                className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition-colors text-gray-700"
                aria-label={t('common:buttons.close_modal_aria')}
                title={t('common:buttons.close_modal_aria')}
              >
                <X className="w-5 h-5 text-current" />
              </button>
            )}
          </div>
          </div>

          {/* Content - Scrollable area */}
          <div className="derma-step-content flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            <AnimatePresence key="content-steps" mode="wait">
            {currentStep === 'onboarding' && (
              <OnboardingStep
                onNext={handleNext}
                onClose={handleClose}
              />
            )}

              {currentStep === 'gender' && (
                <GenderStep
                  selectedGender={selectedGender}
                  onGenderSelect={setSelectedGender}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}

            {currentStep === 'age' && (
              <AgeStep
                selectedAge={selectedAge}
                onAgeSelect={setSelectedAge}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 'skin-concerns' && (
              <SkinConcernsStep
                selectedConcerns={selectedConcerns}
                onConcernToggle={(concernId) => {
                  setSelectedConcerns(prev => 
                    prev.includes(concernId) 
                      ? prev.filter(id => id !== concernId)
                      : [...prev, concernId]
                  );
                }}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 'skin-type' && (
              <SkinTypeStep
                selectedSkinType={selectedSkinType}
                onSkinTypeSelect={setSelectedSkinType}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 'sensitivity' && (
              <SensitivityStep
                selectedSensitivity={selectedSensitivity}
                onSensitivitySelect={setSelectedSensitivity}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 'photo-instructions' && (
              <PhotoInstructionsStep
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 'camera-capture' && (
              <CameraCaptureStep
                onNext={handleImageCapture}
                onBack={handleBack}
              />
            )}

            {currentStep === 'scan' && (
              <ScanStep
                onBack={handleBack}
                onImageCapture={handleImageCapture}
              />
            )}

            {currentStep === 'results' && (
              loading ? (
                <ImagePreloader 
                  mode="analysis" 
                  analysisProgress={loading ? 75 : 100}
	                analysisImageUrl={capturedImage || ''}
                  themeConfig={themeConfig}
                  onBack={handleBack}
                  onClose={handleClose}
                  showBack={!appConfig.skipOnboarding && currentStep !== 'onboarding'}
                  showClose={!appConfig.skipOnboarding}
                  onComplete={() => setLoading(false)}
                >
                  <ResultsStep
                    analysisData={analysisData}
                    routine={routine}
                    routineType={routineType}
                    onRoutineTypeChange={setRoutineType}
                    onRestart={handleRestart}
                    capturedImage={capturedImage}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                  />
                </ImagePreloader>
              ) : (
                <ResultsStep
                  analysisData={analysisData}
                  routine={routine}
                  routineType={routineType}
                  onRoutineTypeChange={setRoutineType}
                  onRestart={handleRestart}
                  capturedImage={capturedImage}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
              )
            )}
            </AnimatePresence>
          </div>

          {/* Fixed Footer - Sticky on all screen sizes */}
          <div className="sticky bottom-0 z-50 flex-shrink-0">
            <ModalFooter
              currentStep={getCurrentStepNumber()}
              totalSteps={10}
              showTabButtons={currentStep === 'results' && !loading}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
        </motion.div>
      </div>
    </WidgetThemeConfigProvider>
  );
}
