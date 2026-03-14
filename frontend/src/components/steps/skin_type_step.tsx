"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';
/* eslint-disable jsx-a11y/aria-proptypes */
import { motion } from 'framer-motion';
import { ASSETS } from '../../lib/assets';

interface SkinTypeOption {
  id: string;
  image: string;
  nameKey: string;
  descKey: string;
}

interface SkinTypeStepProps {
  selectedSkinType: string;
  onSkinTypeSelect: (skinType: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const skinTypeOptions: SkinTypeOption[] = [
  { id: 'normal', image: ASSETS.images.skinTypes.normal, nameKey: 'steps:skin_type.normal', descKey: 'steps:skin_type.normal_desc' },
  { id: 'dry', image: ASSETS.images.skinTypes.dry, nameKey: 'steps:skin_type.dry', descKey: 'steps:skin_type.dry_desc' },
  { id: 'oily', image: ASSETS.images.skinTypes.oily, nameKey: 'steps:skin_type.oily', descKey: 'steps:skin_type.oily_desc' },
  { id: 'combination', image: ASSETS.images.skinTypes.combination, nameKey: 'steps:skin_type.combination', descKey: 'steps:skin_type.combination_desc' },
  { id: 'dont_know', image: ASSETS.images.skinTypes.dontKnow, nameKey: 'steps:skin_type.dont_know', descKey: 'steps:skin_type.dont_know_desc' },
];

export default function SkinTypeStep({ selectedSkinType, onSkinTypeSelect, onNext, onBack }: SkinTypeStepProps) {
  const { t } = useTranslation(['steps', 'common']);
  return (
    <motion.div
      key="skin-type"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-bg1 bg-cover bg-center min-h-full flex flex-col justify-center"
    >
      {/* Skin Type Selection */}
      <div className="step-content-card flex flex-col px-4 py-4 overflow-y-auto p-4 overflow-y-auto my-4 mx-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {t('steps:skin_type.title')}
          </h1>
        </div>
        
        
        <div className="grid grid-cols-2 gap-3 items-stretch">
          {skinTypeOptions.map((type) => (
            // eslint-disable-next-line jsx-a11y/aria-proptypes
            <div 
              key={type.id} 
              role="radio"
              aria-checked={selectedSkinType === type.id}
              tabIndex={0}
              className={`relative cursor-pointer transition-all duration-200 ${
                selectedSkinType === type.id 
                  ? 'transform scale-[1.02]' 
                  : 'hover:transform hover:scale-[1.01]'
              }`}
              onClick={() => onSkinTypeSelect(type.id)}
            >
              <div className={`relative overflow-hidden h-full transition-all duration-200 ${
                selectedSkinType === type.id
                  ? 'ds-sh-option-card ds-sh-option-card-active'
                  : 'ds-sh-option-card ds-sh-option-card-idle'
              }`}>
                <div className="flex h-16 md:h-full bg-white">
                  <div className="ds-sh-option-icon-wrap w-16 overflow-hidden flex-shrink-0 flex items-center justify-center p-2">
                    <img
                      src={type.image}
                      alt={t(type.nameKey)}
                      className="max-w-full max-h-full w-auto h-auto object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0 px-3 flex flex-col justify-center items-center">
                    <div className="font-semibold text-gray-900 text-sm mb-1 text-center leading-tight break-words">
                      {t(type.nameKey)}
                    </div>
                    <div className="text-xs text-gray-600 hidden md:block text-center">
                      {t(type.descKey)}
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
            disabled={!selectedSkinType}
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
