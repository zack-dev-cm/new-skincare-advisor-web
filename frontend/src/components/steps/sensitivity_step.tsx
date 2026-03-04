"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';
/* eslint-disable jsx-a11y/aria-proptypes */
import { motion } from 'framer-motion';

interface SensitivityOption {
  id: string;
  nameKey: string;
}

interface SensitivityStepProps {
  selectedSensitivity: string;
  onSensitivitySelect: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function SensitivityStep({ selectedSensitivity, onSensitivitySelect, onNext, onBack }: SensitivityStepProps) {
  const { t } = useTranslation(['steps', 'common']);

  const sensitivityOptions: SensitivityOption[] = [
    { id: 'high',   nameKey: 'steps:sensitivity.high' },
    { id: 'medium', nameKey: 'steps:sensitivity.medium' },
    { id: 'low',    nameKey: 'steps:sensitivity.low' },
  ];

  return (
    <motion.div
      key="sensitivity"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-bg2 bg-cover bg-center min-h-full flex flex-col"
    >
      <div className="step-content-card flex flex-col px-4 py-4 overflow-y-auto p-4 mt-auto mx-4 mb-4">
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {t('steps:sensitivity.title')}
          </h1>
          <p className="text-sm text-gray-600">
            {t('steps:sensitivity.subtitle')}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {sensitivityOptions.map((option) => (
            <div
              key={option.id}
              role="radio"
              aria-checked={selectedSensitivity === option.id}
              tabIndex={0}
              className={`relative cursor-pointer transition-all duration-200 ${
                selectedSensitivity === option.id
                  ? 'transform scale-[1.02]'
                  : 'hover:transform hover:scale-[1.01]'
              }`}
              onClick={() => onSensitivitySelect(option.id)}
              onKeyDown={(e) => e.key === 'Enter' && onSensitivitySelect(option.id)}
            >
              <div className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
                selectedSensitivity === option.id
                  ? 'border-primary-500 shadow-lg shadow-primary-100'
                  : 'border-transparent hover:border-primary-300'
              }`}>
                <div className="flex bg-white">
                  <div className="flex-1 min-w-0 px-5 py-4 flex flex-col justify-center">
                    <div className="font-semibold text-gray-900 text-sm leading-snug">
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
            disabled={!selectedSensitivity}
            className="py-3 px-8 rounded-lg transition-all duration-200 bg-primary-600 text-white hover:bg-primary-700 shadow-lg w-full md:w-48 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
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
