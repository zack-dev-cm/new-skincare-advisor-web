'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WIDGET_HEADER_LOGO_IMG_CLASS } from '@/lib/widget-theme';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import PhotoInstructionsStep from './steps/photo_instructions_step';
import CameraCaptureStep from './steps/camera_capture_step';
import { ModalFooter } from './steps';
import dynamic from 'next/dynamic';

const ScanStep = dynamic(() => import('./steps/scan_step'), { ssr: false });
const ResultsStep = dynamic(() => import('./steps/results_step'), { ssr: false });
import ImagePreloader from './ImagePreloader';
import { useLocale } from '@/lib/LocaleContext';
import { useAppConfig } from '@/lib/AppConfigContext';

// Brand logo (violet SVG) – same default as SkinAnalysisModal
const LOGO_VIOLET = '/RGM_Logo_Violet.svg';

interface QuizOption {
  id: string;
  label: string;
  value: string;
  imageUrl?: string;
}

interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'slider' | 'text' | 'image-choice';
  question: string;
  options?: QuizOption[];
  required: boolean;
  order: number;
  min?: number;
  max?: number;
  default?: number;
}

interface QuizConfig {
  version: string;
  questions: QuizQuestion[];
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

interface QuizFormProps {
  config: QuizConfig;
  isOpen: boolean;
  onClose: () => void;
  storeData?: any;
  translations?: QuizTranslations | null;
  /** Custom logo URL from merchant theme config. Falls back to Dermaself logo. */
  logoUrl?: string;
}

interface QuizAnswers {
  [questionId: string]: string | number | string[];
}

type QuizStep = 'quiz' | 'photo-instructions' | 'camera-capture' | 'scan' | 'results';

export default function QuizForm({ config, isOpen, onClose, storeData, translations, logoUrl }: QuizFormProps) {
  const { t } = useTranslation(['steps', 'common']);
  const { locale } = useLocale();
  const appConfig = useAppConfig();
  const [currentStep, setCurrentStep] = useState<QuizStep>('quiz');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'routine'>('results');

  // Helper function to get translated text, falling back to i18n or default
  const getTranslation = (key: string, fallbackKey?: string, params?: Record<string, any>): string => {
    // First try custom translations from API
    if (translations && translations[key]) {
      let translated = translations[key];
      // Handle placeholders like {current} and {total}
      if (params) {
        Object.keys(params).forEach(paramKey => {
          translated = translated.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]));
        });
      }
      return translated;
    }
    // Fall back to i18n translations
    if (fallbackKey) {
      return t(fallbackKey, params);
    }
    return key;
  };

  // Helper function to get translated question title
  const getQuestionTitle = (question: QuizQuestion): string => {
    const translationKey = `question.${question.id}.title`;
    const translated = getTranslation(translationKey, undefined, undefined);
    // If no custom translation is found, getTranslation returns the key itself
    return translated === translationKey ? question.question : translated;
  };

  // Helper function to get translated option label
  const getOptionLabel = (questionId: string, option: QuizOption): string => {
    const translationKey = `question.${questionId}.option.${option.id}.label`;
    const translated = getTranslation(translationKey, undefined, undefined);
    return translated === translationKey ? option.label : translated;
  };

  // Helper functions to map user selections to backend API format
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

  // Sort questions by order
  const sortedQuestions = [...config.questions].sort((a, b) => a.order - b.order);
  const currentQuestion = sortedQuestions[currentQuestionIndex];

  // Total steps = quiz questions + photo-instructions + camera-capture + scan + results
  const totalSteps = sortedQuestions.length + 4;

  // Get the current step number for the progress dots (1-based)
  const getCurrentStepNumber = (): number => {
    if (currentStep === 'quiz') {
      return currentQuestionIndex + 1;
    }
    const quizStepsCount = sortedQuestions.length;
    switch (currentStep) {
      case 'photo-instructions': return quizStepsCount + 1;
      case 'camera-capture': return quizStepsCount + 2;
      case 'scan': return quizStepsCount + 3;
      case 'results': return quizStepsCount + 4;
      default: return 1;
    }
  };

  // Initialize default answers
  useEffect(() => {
    const defaultAnswers: QuizAnswers = {};
    sortedQuestions.forEach((question) => {
      if (question.type === 'slider' && question.default !== undefined) {
        defaultAnswers[question.id] = question.default;
      }
    });
    setAnswers(defaultAnswers);
  }, [config]);

  const handleAnswerChange = (questionId: string, value: string | number | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < sortedQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep === 'quiz') {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
      }
    } else if (currentStep === 'photo-instructions') {
      setCurrentStep('quiz');
      setCurrentQuestionIndex(sortedQuestions.length - 1);
    } else if (currentStep === 'camera-capture') {
      setCurrentStep('photo-instructions');
    } else if (currentStep === 'results') {
      setCurrentStep('camera-capture');
    }
  };

  const handleSkip = () => {
    if (config.settings.allowSkipping) {
      handleNext();
    }
  };

  const handleComplete = () => {
    // Send quiz answers to parent if in iframe
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({
        type: 'QUIZ_COMPLETE',
        answers,
        shop: storeData?.shop,
      }, '*');
    }
    // Transition to photo instructions
    setCurrentStep('photo-instructions');
  };

  const handlePhotoInstructionsNext = () => {
    setCurrentStep('camera-capture');
  };

  const handlePhotoInstructionsBack = () => {
    setCurrentStep('quiz');
    setCurrentQuestionIndex(sortedQuestions.length - 1);
  };

  const handleImageCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setLoading(true);
    setCurrentStep('results');

    try {
      const { analyzeSkinWithRecommendations } = await import('../lib/api');

      const defaults = appConfig.defaultUserData;
      const selectedAge = typeof answers.age === 'string' ? answers.age : '';
      const selectedGender = typeof answers.gender === 'string' ? answers.gender : '';
      const selectedSkinType = typeof answers.skinType === 'string' ? answers.skinType : '';
      const selectedConcerns = Array.isArray(answers.concerns) ? answers.concerns : (answers.concerns ? [String(answers.concerns)] : []);
      const selectedSensitivity = (typeof answers.sensitivity === 'string' ? answers.sensitivity : undefined);

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

      const analysisResult = await analyzeSkinWithRecommendations(imageData, userData, undefined, locale);
      setAnalysisData(analysisResult);
      setCurrentStep('results');
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisData({
        image_url: imageData,
        skin_type: answers.skinType || 'Normale',
        concerns: Array.isArray(answers.concerns) ? answers.concerns : ['Fine Lines'],
        recommendations: 'Personalized routine suggested'
      });
      setCurrentStep('results');
    } finally {
      setLoading(false);
    }
  };

  const handleCameraBack = () => {
    setCurrentStep('photo-instructions');
  };

  const handleRestart = () => {
    setCurrentStep('quiz');
    setCurrentQuestionIndex(0);
    setCapturedImage(null);
    setAnalysisData(null);
    setLoading(false);
    setActiveTab('results');
  };

  const canProceed = () => {
    if (!currentQuestion) return false;
    if (!currentQuestion.required) return true;
    const answer = answers[currentQuestion.id];
    if (Array.isArray(answer)) return answer.length > 0;
    return answer !== undefined && answer !== null && answer !== '';
  };

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // Layout: same structure as SkinAnalysisModal
  //   1. Sticky header   – modal-header-bar with back, logo, close
  //   2. Scrollable body – derma-step-content
  //   3. Sticky footer   – ModalFooter with progress dots + "Powered by Dermaself"
  // ---------------------------------------------------------------------------

  // Determine if back button should be shown
  const showBack = currentStep !== 'quiz' || currentQuestionIndex > 0;

  return (
    <div className="relative w-full h-full bg-white overflow-clip flex flex-col md:max-w-[540px] md:max-h-[100vh]">
      {/* ─── Fixed Header ─── same as SkinAnalysisModal ─── */}
      <div className="sticky top-0 z-50 modal-header-bar px-4 py-2 safe-area-top flex items-center justify-between border-b flex-shrink-0">
        {/* Back Button */}
        <div className="flex items-center min-w-[32px]">
          {showBack && (
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
          <div>
            <img
              src={logoUrl || LOGO_VIOLET}
              alt="Dermaself"
              className={WIDGET_HEADER_LOGO_IMG_CLASS}
            />
          </div>
        </div>

        {/* Close Button */}
        <div className="flex items-center min-w-[32px]">
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition-colors text-gray-700"
            aria-label={t('common:buttons.close_modal_aria')}
            title={t('common:buttons.close_modal_aria')}
          >
            <X className="w-5 h-5 text-current" />
          </button>
        </div>
      </div>

      {/* ─── Content – Scrollable area ─── */}
      <div className="derma-step-content flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <AnimatePresence mode="wait">
          {/* ── Quiz Questions ── */}
          {currentStep === 'quiz' && currentQuestion && (
            <motion.div
              key={`quiz-${currentQuestion.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-bg2 bg-cover bg-center min-h-full flex flex-col justify-center"
            >
              <div className="step-content-card flex flex-col px-4 py-4 overflow-y-auto my-4 mx-4">
                <div className="mb-4">
                  <h1 className="text-xl font-bold text-gray-900 mb-2">
                    {getQuestionTitle(currentQuestion)}
                  </h1>
                  {config.settings.showProgress && (
                    <p className="text-sm text-muted-foreground">
                      {getTranslation(
                        'progressLabel',
                        'common:quiz.question_of',
                        { current: currentQuestionIndex + 1, total: sortedQuestions.length }
                      )}
                    </p>
                  )}
                </div>

                {/* Multiple Choice */}
                {currentQuestion.type === 'multiple-choice' && (
                  <div className="space-y-3">
                    {currentQuestion.options?.map((option) => {
                      const isSelected = answers[currentQuestion.id] === option.value;
                      return (
                        <div
                          key={option.id}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          className={`relative cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'transform scale-[1.02]'
                              : 'hover:transform hover:scale-[1.01]'
                          }`}
                          onClick={() => handleAnswerChange(currentQuestion.id, option.value)}
                        >
                          <div className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
                            isSelected
                              ? 'border-primary-500 shadow-lg shadow-primary-100'
                              : 'border-transparent hover:border-primary-300'
                          }`}>
                            <div className="flex bg-white">
                              <div className="flex-1 min-w-0 px-6 py-4 flex flex-col justify-center">
                                <div className="font-semibold text-gray-900 text-sm">
                                  {getOptionLabel(currentQuestion.id, option)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Image Choice */}
                {currentQuestion.type === 'image-choice' && (
                  <div className="grid grid-cols-2 gap-3">
                    {currentQuestion.options?.map((option) => {
                      const isSelected = answers[currentQuestion.id] === option.value;
                      return (
                        <div
                          key={option.id}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          className={`relative cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'transform scale-[1.02]'
                              : 'hover:transform hover:scale-[1.01]'
                          }`}
                          onClick={() => handleAnswerChange(currentQuestion.id, option.value)}
                        >
                          <div className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
                            isSelected
                              ? 'border-primary-500 shadow-lg shadow-primary-100'
                              : 'border-transparent hover:border-primary-300'
                          }`}>
                            <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                              {option.imageUrl ? (
                                <img
                                  src={option.imageUrl}
                                  alt={getOptionLabel(currentQuestion.id, option)}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-sm text-muted-foreground px-2 text-center">
                                  {getOptionLabel(currentQuestion.id, option)}
                                </span>
                              )}
                            </div>
                            <div className="px-3 py-2 text-sm font-semibold text-center text-gray-900 bg-white">
                              {getOptionLabel(currentQuestion.id, option)}
                            </div>
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center bg-primary-500">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Slider */}
                {currentQuestion.type === 'slider' && (
                  <div className="space-y-4">
                    <input
                      type="range"
                      min={currentQuestion.min || 1}
                      max={currentQuestion.max || 10}
                      value={(answers[currentQuestion.id] as number) || currentQuestion.default || 5}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, parseInt(e.target.value))}
                      className="w-full accent-primary-500"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{currentQuestion.min || 1}</span>
                      <span className="text-lg font-bold text-gray-900">
                        {answers[currentQuestion.id] || currentQuestion.default || 5}
                      </span>
                      <span>{currentQuestion.max || 10}</span>
                    </div>
                  </div>
                )}

                {/* Text */}
                {currentQuestion.type === 'text' && (
                  <textarea
                    value={(answers[currentQuestion.id] as string) || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="w-full p-4 border-2 rounded-2xl focus:outline-none focus:border-primary-500 border-gray-200"
                    rows={6}
                    placeholder={getTranslation('placeholder', 'common:quiz.placeholder')}
                  />
                )}

                {/* Action Buttons – inside the step content card */}
                <div className="flex gap-3 mt-6">
                  {config.settings.allowSkipping && (
                    <motion.button
                      onClick={handleSkip}
                      className="px-6 py-3 rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {getTranslation('skipButton', 'common:quiz.skip')}
                    </motion.button>
                  )}
                  <motion.button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className={`flex-1 py-3 px-8 rounded-lg transition-all duration-200 font-medium ${
                      canProceed()
                        ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    whileHover={canProceed() ? { scale: 1.02 } : {}}
                    whileTap={canProceed() ? { scale: 0.98 } : {}}
                  >
                    {currentQuestionIndex < sortedQuestions.length - 1
                      ? getTranslation('nextButton', 'common:buttons.next')
                      : getTranslation('submitButton', 'common:buttons.next')}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Photo Instructions ── */}
          {currentStep === 'photo-instructions' && (
            <PhotoInstructionsStep
              onNext={handlePhotoInstructionsNext}
              onBack={handlePhotoInstructionsBack}
            />
          )}

          {/* ── Camera Capture ── */}
          {currentStep === 'camera-capture' && (
            <CameraCaptureStep
              onNext={handleImageCapture}
              onBack={handleCameraBack}
            />
          )}

          {/* ── Scan / Results ── */}
          {currentStep === 'results' && (
            loading ? (
              <ImagePreloader
                mode="analysis"
                analysisProgress={loading ? 75 : 100}
                analysisImageUrl={capturedImage || ''}
                themeConfig={{ logoUrl }}
                onComplete={() => setLoading(false)}
              >
                <ResultsStep
                  analysisData={analysisData}
                  routine={null}
                  routineType="essential"
                  onRoutineTypeChange={() => {}}
                  onRestart={handleRestart}
                  capturedImage={capturedImage}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
              </ImagePreloader>
            ) : (
              <ResultsStep
                analysisData={analysisData}
                routine={null}
                routineType="essential"
                onRoutineTypeChange={() => {}}
                onRestart={handleRestart}
                capturedImage={capturedImage}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            )
          )}

          {currentStep === 'scan' && (
            <ScanStep
              onBack={handleBack}
              onImageCapture={handleImageCapture}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ─── Fixed Footer ─── same as SkinAnalysisModal ─── */}
      <div className="sticky bottom-0 z-50 flex-shrink-0">
        <ModalFooter
          currentStep={getCurrentStepNumber()}
          totalSteps={totalSteps}
          showTabButtons={currentStep === 'results' && !loading}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </div>
  );
}
