"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';
/* eslint-disable jsx-a11y/aria-proptypes */
import { motion } from 'framer-motion';
import { ASSETS } from '../../lib/assets';

interface SkinConcern {
  id: string;
  nameKey: string;
  icon: string;
}

interface SkinConcernsStepProps {
  selectedConcerns: string[];
  onConcernToggle: (concernId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function SkinConcernsStep({ selectedConcerns, onConcernToggle, onNext, onBack }: SkinConcernsStepProps) {
  const { t } = useTranslation(['steps', 'common']);
  const skinConcerns: SkinConcern[] = [
    { id: 'acne',     nameKey: 'steps:skin_concerns.option_acne',     icon: ASSETS.images.icons.acne },
    { id: 'spots',    nameKey: 'steps:skin_concerns.option_spots',     icon: ASSETS.images.icons.darkSpots },
    { id: 'wrinkles', nameKey: 'steps:skin_concerns.option_wrinkles',  icon: ASSETS.images.icons.wrinkles },
    { id: 'pores',    nameKey: 'steps:skin_concerns.option_pores',     icon: ASSETS.images.icons.enlargedPores },
    { id: 'dryness',  nameKey: 'steps:skin_concerns.option_dryness',   icon: ASSETS.images.icons.dryness },
    { id: 'redness',  nameKey: 'steps:skin_concerns.option_redness',   icon: ASSETS.images.icons.redness },
    { id: 'laxity',   nameKey: 'steps:skin_concerns.option_laxity',    icon: ASSETS.images.icons.skinLaxity },
  ];
  return (
    <motion.div
      key="skin-concerns"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-bg1 bg-cover bg-center min-h-full flex flex-col"
    >
      {/* Skin Concerns Selection */}
      <div className="step-content-card flex flex-col px-4 py-4 overflow-y-auto p-4 overflow-y-auto mt-auto mx-4 mb-4">
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {t('steps:skin_concerns.question_text')}
          </h1>
        </div>
        
        <div className="grid grid-cols-2 gap-3 items-stretch">
          {skinConcerns.map((concern) => (
            <div
              key={concern.id}
              role="checkbox"
              aria-checked={selectedConcerns.includes(concern.id)}
              tabIndex={0}
              className={`relative cursor-pointer transition-all duration-200 ${
                selectedConcerns.includes(concern.id)
                  ? 'transform scale-[1.02]'
                  : 'hover:transform hover:scale-[1.01]'
              }`}
              onClick={() => onConcernToggle(concern.id)}
            >
              <div className={`relative rounded-2xl overflow-hidden h-full border-2 transition-all duration-200 ${
                selectedConcerns.includes(concern.id)
                  ? 'border-primary-500 shadow-lg shadow-primary-100'
                  : 'border-transparent hover:border-primary-300'
              }`}>
                <div className="flex h-16 md:h-full bg-white">
                  <div className="w-16 overflow-hidden flex-shrink-0 flex items-center justify-center bg-primary-50 p-2">
                    {concern.icon ? (
                      <img
                        src={concern.icon}
                        alt={t(concern.nameKey)}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          console.error(`Failed to load icon: ${concern.icon}`);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        {t('steps:skin_concerns.na')}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 px-3 flex flex-col justify-center items-center">
                    <div className="font-semibold text-gray-900 text-sm mb-1 text-center leading-tight break-words">
                      {t(concern.nameKey)}
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
            disabled={selectedConcerns.length === 0}
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
