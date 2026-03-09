'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import PhotoInstructionsStep from './steps/photo_instructions_step';
import CameraCaptureStep from './steps/camera_capture_step';
import dynamic from 'next/dynamic';

const ScanStep = dynamic(() => import('./steps/scan_step'), { ssr: false });
const ResultsStep = dynamic(() => import('./steps/results_step'), { ssr: false });
import ImagePreloader from './ImagePreloader';
import { useLocale } from '@/lib/LocaleContext';

interface QuizOption {
  id: string;
  label: string;
  value: string;
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

interface QuizFormProps {
  config: QuizConfig;
  isOpen: boolean;
  onClose: () => void;
  storeData?: any;
  translations?: QuizTranslations | null;
}

interface QuizAnswers {
  [questionId: string]: string | number | string[];
}

type QuizStep = 'quiz' | 'photo-instructions' | 'camera-capture' | 'scan' | 'results';

export default function QuizForm({ config, isOpen, onClose, storeData, translations }: QuizFormProps) {
  const { t } = useTranslation('common');
  const { locale } = useLocale();
  const [currentStep, setCurrentStep] = useState<QuizStep>('quiz');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
    return getTranslation(translationKey, undefined, undefined) || question.question;
  };

  // Helper function to get translated option label
  const getOptionLabel = (questionId: string, option: QuizOption): string => {
    const translationKey = `question.${questionId}.option.${option.id}.label`;
    return getTranslation(translationKey, undefined, undefined) || option.label;
  };

  // Sort questions by order
  const sortedQuestions = [...config.questions].sort((a, b) => a.order - b.order);
  const currentQuestion = sortedQuestions[currentQuestionIndex];

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
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
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
    setCurrentStep('scan');
    
    try {
      const { analyzeSkinWithRecommendations } = await import('../lib/api');
      
      const userData = {
        first_name: 'User',
        last_name: 'Quiz',
        ageRange: typeof answers.age === 'string' ? answers.age : (typeof answers.age === 'number' ? String(answers.age) : '26 - 35'),
        gender: typeof answers.gender === 'string' ? answers.gender : (typeof answers.gender === 'number' ? String(answers.gender) : 'female'),
        skin_type: typeof answers.skinType === 'string' ? answers.skinType : (typeof answers.skinType === 'number' ? String(answers.skinType) : 'Normale'),
        concerns: Array.isArray(answers.concerns) ? answers.concerns : (answers.concerns ? [String(answers.concerns)] : []),
        budget_level: 'High' as const,
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

  const canProceed = () => {
    if (!currentQuestion) return false;
    if (!currentQuestion.required) return true;
    const answer = answers[currentQuestion.id];
    if (Array.isArray(answer)) return answer.length > 0;
    return answer !== undefined && answer !== null && answer !== '';
  };

  // Calculate progress based on current step
  const getProgress = () => {
    if (currentStep === 'quiz') {
      return ((currentQuestionIndex + 1) / sortedQuestions.length) * 100;
    }
    // For other steps, show full progress
    return 100;
  };

  const progress = getProgress();

  if (!isOpen) return null;

  // Helper function to render header
  const renderHeader = () => (
    <div 
      className="px-4 py-3 flex items-center justify-between border-b"
      style={{ 
        backgroundColor: config.settings.theme.primaryColor,
        color: config.settings.theme.secondaryColor,
      }}
    >
      <button
        onClick={
          currentStep === 'quiz' && currentQuestionIndex > 0
            ? handleBack
            : currentStep === 'photo-instructions'
            ? handlePhotoInstructionsBack
            : currentStep === 'camera-capture'
            ? handleCameraBack
            : onClose
        }
        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex-1 text-center">
        <div className="text-sm font-medium">
          {currentStep === 'quiz' && getTranslation(
            'progressLabel',
            'quiz.question_of',
            { current: currentQuestionIndex + 1, total: sortedQuestions.length }
          )}
          {currentStep === 'photo-instructions' && getTranslation('photoInstructions', 'quiz.photo_instructions')}
          {currentStep === 'camera-capture' && getTranslation('takePhoto', 'quiz.take_photo')}
          {currentStep === 'scan' && getTranslation('loadingMessage', 'quiz.analyzing')}
          {currentStep === 'results' && getTranslation('results', 'quiz.results')}
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );

  // Helper function to render progress bar
  const renderProgressBar = () => {
    if (!config.settings.showProgress) return null;
    return (
      <div className="h-1 bg-gray-200">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            backgroundColor: config.settings.theme.primaryColor,
          }}
        />
      </div>
    );
  };

  // Handle different steps - but wrap them all with header/footer
  if (currentStep === 'photo-instructions') {
    return (
      <div 
        className="w-full h-full flex flex-col"
        style={{ 
          fontFamily: config.settings.theme.fontFamily,
          color: config.settings.theme.primaryColor,
        }}
      >
        {renderHeader()}
        {renderProgressBar()}
        <div className="flex-1 overflow-hidden relative">
          <PhotoInstructionsStep
            onNext={handlePhotoInstructionsNext}
            onBack={handlePhotoInstructionsBack}
          />
        </div>
      </div>
    );
  }

  if (currentStep === 'camera-capture') {
    return (
      <div 
        className="w-full h-full flex flex-col"
        style={{ 
          fontFamily: config.settings.theme.fontFamily,
          color: config.settings.theme.primaryColor,
        }}
      >
        {renderHeader()}
        {renderProgressBar()}
        <div className="flex-1 overflow-hidden relative">
          <CameraCaptureStep
            onNext={handleImageCapture}
            onBack={handleCameraBack}
          />
        </div>
      </div>
    );
  }

  if (currentStep === 'scan' || currentStep === 'results') {
    if (loading) {
      return (
        <div 
          className="w-full h-full flex flex-col"
          style={{ 
            fontFamily: config.settings.theme.fontFamily,
            color: config.settings.theme.primaryColor,
          }}
        >
          {renderHeader()}
          {renderProgressBar()}
          <div className="flex-1 overflow-hidden relative">
            <ImagePreloader
              mode="analysis"
              analysisProgress={75}
              analysisImageUrl={capturedImage || ''}
              onComplete={() => setLoading(false)}
            >
              {analysisData && (
                <ResultsStep
                  analysisData={analysisData}
                  routine={null}
                  routineType="essential"
                  onRoutineTypeChange={() => {}}
                  onRestart={() => {
                    setCurrentStep('quiz');
                    setCurrentQuestionIndex(0);
                    setCapturedImage(null);
                    setAnalysisData(null);
                  }}
                  capturedImage={capturedImage}
                  activeTab="results"
                  onTabChange={() => {}}
                />
              )}
            </ImagePreloader>
          </div>
        </div>
      );
    }

    if (analysisData) {
      return (
        <div 
          className="w-full h-full flex flex-col"
          style={{ 
            fontFamily: config.settings.theme.fontFamily,
            color: config.settings.theme.primaryColor,
          }}
        >
          {renderHeader()}
          {renderProgressBar()}
          <div className="flex-1 overflow-hidden relative">
            <ResultsStep
              analysisData={analysisData}
              routine={null}
              routineType="essential"
              onRoutineTypeChange={() => {}}
              onRestart={() => {
                setCurrentStep('quiz');
                setCurrentQuestionIndex(0);
                setCapturedImage(null);
                setAnalysisData(null);
              }}
              capturedImage={capturedImage}
              activeTab="results"
              onTabChange={() => {}}
            />
          </div>
        </div>
      );
    }
  }

  // Quiz step - render questions
  if (!currentQuestion) return null;

  return (
    <div 
      className="w-full h-full bg-white flex flex-col"
      style={{ 
        fontFamily: config.settings.theme.fontFamily,
        color: config.settings.theme.primaryColor,
      }}
    >
      {renderHeader()}
      {renderProgressBar()}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-2xl font-bold mb-6">{getQuestionTitle(currentQuestion)}</h2>

            {/* Multiple Choice */}
            {currentQuestion.type === 'multiple-choice' && (
              <div className="space-y-3">
                {currentQuestion.options?.map((option) => {
                  const isSelected = answers[currentQuestion.id] === option.value;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleAnswerChange(currentQuestion.id, option.value)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{
                        borderColor: isSelected ? config.settings.theme.primaryColor : undefined,
                        backgroundColor: isSelected ? `${config.settings.theme.primaryColor}10` : undefined,
                      }}
                    >
                      {getOptionLabel(currentQuestion.id, option)}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Image Choice */}
            {currentQuestion.type === 'image-choice' && (
              <div className="grid grid-cols-2 gap-4">
                {currentQuestion.options?.map((option) => {
                  const isSelected = answers[currentQuestion.id] === option.value;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleAnswerChange(currentQuestion.id, option.value)}
                      className={`relative rounded-lg border-2 overflow-hidden transition-all ${
                        isSelected ? 'border-purple-500' : 'border-gray-200'
                      }`}
                      style={{
                        borderColor: isSelected ? config.settings.theme.primaryColor : undefined,
                      }}
                    >
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        {getOptionLabel(currentQuestion.id, option)}
                      </div>
                      {isSelected && (
                        <div
                          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: config.settings.theme.primaryColor }}
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
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
                  className="w-full"
                  style={{ accentColor: config.settings.theme.primaryColor }}
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{currentQuestion.min || 1}</span>
                  <span className="text-lg font-bold">
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
                className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                rows={6}
                placeholder={getTranslation('placeholder', 'quiz.placeholder')}
                style={{ borderColor: config.settings.theme.primaryColor + '40' }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="border-t p-4 flex justify-between gap-3">
        {config.settings.allowSkipping && (
          <button
            onClick={handleSkip}
            className="px-6 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {getTranslation('skipButton', 'quiz.skip')}
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
            canProceed()
              ? 'text-white hover:opacity-90'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          style={{
            backgroundColor: canProceed() ? config.settings.theme.primaryColor : undefined,
          }}
        >
          {currentQuestionIndex < sortedQuestions.length - 1 
            ? getTranslation('nextButton', 'quiz.next')
            : getTranslation('submitButton', 'quiz.complete')}
          <ChevronRight className="inline-block ml-2 w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

