"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera } from 'lucide-react';

// Import face detection hook
import { useFaceDetection } from '../lib/useFaceDetection';

// Import step components
import {
  OnboardingStep,
  SkinTypeStep,
  SkinConcernsStep,
  GenderStep,
  AgeStep,
  PhotoInstructionsStep,
  ResultsStep,
  ModalFooter
} from './steps';

// Import unified loading component
import ImagePreloader from './ImagePreloader';

import dynamic from 'next/dynamic';

// Brand logo
import LogoWhite from '../app/RGB_Logo_White.png';

const CameraCaptureStep = dynamic(() => import('./steps/camera_capture_step'), {
  loading: () => <ImagePreloader mode="initial" onComplete={() => {}}><div></div></ImagePreloader>,
  ssr: false,
});

const ScanStep = dynamic(() => import('./steps/scan_step'), {
  loading: () => <ImagePreloader mode="initial" onComplete={() => {}}><div></div></ImagePreloader>,
  ssr: false,
});

interface SkinAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
  onReady?: () => void;
}

type Step = 'onboarding' | 'skin-type' | 'skin-concerns' | 'gender' | 'age' | 'photo-instructions' | 'camera-capture' | 'scan' | 'results';

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

export default function SkinAnalysisModal({ isOpen, onClose, embedded = false, onReady }: SkinAnalysisModalProps) {
  // Initialize face detection models when modal opens
  const faceDetection = useFaceDetection();

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

  // Step navigation
  const handleNext = () => {
    const stepOrder: Step[] = ['onboarding', 'skin-type', 'skin-concerns', 'gender', 'age', 'photo-instructions', 'camera-capture', 'scan', 'results'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepOrder: Step[] = ['onboarding', 'skin-type', 'skin-concerns', 'gender', 'age', 'photo-instructions', 'camera-capture', 'scan', 'results'];
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
    setCurrentStep('onboarding');
    setSelectedSkinType('');
    setSelectedConcerns([]);
    setSelectedGender('');
    setSelectedAge('');
    setOpenInfo(null);
    setLoading(false);
    setRealProducts([]);
    setActiveTab('results');
    setRoutineType('essential');
    setRecommendationSource('ai');
  };

  // Get current step number for progress indicator
  const getCurrentStepNumber = () => {
    const stepOrder = ['onboarding', 'skin-type', 'skin-concerns', 'gender', 'age', 'photo-instructions', 'camera-capture', 'scan', 'results'];
    return stepOrder.indexOf(currentStep) + 1;
  };

  // Image capture handler
  const handleImageCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setImageMetadata({ timestamp: new Date().toISOString() }); // Default metadata
    setShowCamera(false);
    
    // Set default skin type if empty to ensure proper flow
    if (!selectedSkinType) {
      setSelectedSkinType('Normale');
    }
    
    // Show loading state immediately
    setLoading(true);
    
    // Use unified loading component instead of separate loading step
    // The loading will be handled by wrapping the results step
    setCurrentStep('results');
      
    // Trigger analysis immediately with user data and recommendations
    try {
      // Prepare user data from skin type selection
      const userData = {
        first_name: 'User',
        last_name: 'Test',
        birthdate: '1990-01-01', // Default birthdate
        gender: 'female' as const, // Default for now, can be enhanced with gender selection
        budget_level: 'High' as const
      };
      
      // Call the new API with recommendations
      const { analyzeSkinWithRecommendations } = await import('../lib/api');
      const analysisResult = await analyzeSkinWithRecommendations(
        imageData,
        userData
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-full bg-white overflow-hidden flex flex-col h-full md:max-w-[540px] w-full h-full md:max-h-[95vh]"
      >
        {/* Fixed Header inside Modal */}
        <div className="bg-primary-800 px-4 py-3 flex items-center justify-between border-b border-primary-200/70">
          {/* Back Button */}
          <div className="flex items-center">
            {currentStep !== 'onboarding' && (
              <button
                onClick={handleBack}
                className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="Go back"
                title="Go back"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
          </div>

          {/* Centered Brand Logo */}
          <div className="flex-1 text-center flex items-center justify-center">
            <div className={`${currentStep === 'onboarding' ? 'pl-8' : ''}`}>
              <Image
                src={LogoWhite}
                alt="Dermaself"
                priority
                className="inline-block h-8 w-auto"
              />
            </div>
          </div>

          {/* Close Button */}
          <div className="flex items-center">
              <button
              onClick={handleClose}
                className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label="Close modal"
              title="Close modal"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

          {/* Content */}
        <div className="derma-step-content flex-1 overflow-y-auto overflow-x-clip">
            <AnimatePresence key="content-steps" mode="wait">
              {currentStep === 'onboarding' && (
              <OnboardingStep
                onNext={handleNext}
                onClose={handleClose}
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
                faceDetection={faceDetection}
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

        {/* Fixed Footer */}
        <ModalFooter
          currentStep={getCurrentStepNumber()}
          totalSteps={9}
          showTabButtons={currentStep === 'results'}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </motion.div>
    </div>
  );
}
