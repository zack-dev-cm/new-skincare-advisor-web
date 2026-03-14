"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';
/* eslint-disable jsx-a11y/aria-proptypes */
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { ASSETS } from '../../lib/assets';

interface GenderOption {
  id: string;
  nameKey: string;
}

interface GenderStepProps {
  selectedGender: string;
  onGenderSelect: (gender: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function GenderStep({ selectedGender, onGenderSelect, onNext, onBack }: GenderStepProps) {
  const { t } = useTranslation(['steps', 'common']);
  const genderOptions: GenderOption[] = [
    { id: 'woman', nameKey: 'steps:gender.female' },
    { id: 'man', nameKey: 'steps:gender.male' },
    { id: 'non-binary', nameKey: 'steps:gender.non_binary' },
    { id: 'prefer-not-to-specify', nameKey: 'steps:gender.prefer_not_say' }
  ];
  return (
    <motion.div
      key="gender"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-bg2 bg-cover bg-center min-h-full flex flex-col justify-center"
    >
      {/* Gender Selection */}
      <div className="step-content-card flex flex-col px-4 py-4 overflow-y-auto p-4 overflow-y-auto my-4 mx-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {t('steps:gender.gender_question')}
          </h1>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {genderOptions.map((option) => (
            // eslint-disable-next-line jsx-a11y/aria-proptypes
            <div 
              key={option.id} 
              role="radio"
              aria-checked={selectedGender === option.id}
              tabIndex={0}
              className={`relative cursor-pointer transition-all duration-200 ${
                selectedGender === option.id 
                  ? 'transform scale-[1.02]' 
                  : 'hover:transform hover:scale-[1.01]'
              }`}
              onClick={() => onGenderSelect(option.id)}
            >
              <div className={`relative overflow-hidden h-full transition-all duration-200 ${
                selectedGender === option.id
                  ? 'ds-sh-option-card ds-sh-option-card-active'
                  : 'ds-sh-option-card ds-sh-option-card-idle'
              }`}>
                <div className="flex h-full bg-white">
                  <div className="flex-1 min-w-0 px-6 py-4 flex flex-col justify-center items-center">
                    <div className="font-semibold text-gray-900 text-sm mb-1">
                      {t(option.nameKey)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="flex justify-center mt-6">
          <motion.button
            onClick={onNext}
            disabled={!selectedGender}
            className="ds-sh-btn-primary py-3 px-8 transition-all duration-200 w-full md:w-48 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t('common:buttons.next')}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
