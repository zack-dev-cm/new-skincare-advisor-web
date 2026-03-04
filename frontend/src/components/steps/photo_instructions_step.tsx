"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ASSETS } from '../../lib/assets';

interface PhotoInstruction {
  id: string;
  icon: string;
  textKey: string;
}

interface PhotoInstructionsStepProps {
  onNext: () => void;
  onBack: () => void;
}

export default function PhotoInstructionsStep({ onNext, onBack }: PhotoInstructionsStepProps) {
  const { t } = useTranslation();
  
  const photoInstructions: PhotoInstruction[] = [
    {
      id: 'glasses',
      icon: ASSETS.images.icons.glasses,
      textKey: 'photo_instructions:instructions.remove_glasses'
    },
    {
      id: 'hair',
      icon: ASSETS.images.icons.hair,
      textKey: 'photo_instructions:instructions.pull_hair_back'
    },
    {
      id: 'position',
      icon: ASSETS.images.icons.position,
      textKey: 'photo_instructions:instructions.position_camera'
    },
    {
      id: 'expression',
      icon: ASSETS.images.icons.expression,
      textKey: 'photo_instructions:instructions.neutral_expression'
    }
  ];
  return (
    <motion.div
      key="photo-instructions"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-main bg-cover bg-center min-h-full flex flex-col"
    >
      {/* Photo Instructions */}
      <div className="step-content-card flex flex-col px-4 py-4 overflow-y-auto p-4 overflow-y-auto mt-auto mx-4 mb-4">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {t('photo_instructions:title')}
          </h1>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {photoInstructions.map((instruction) => (
            <div 
              key={instruction.id}
              className="flex flex-col justify-center items-center bg-transparent"
            >
              <div className="w-12 h-12 bg-transparent rounded-lg flex items-center justify-center flex-shrink-0">
                <img 
                  src={instruction.icon}
                  alt={t(instruction.textKey)}
                  className="w-8 h-8 text-gray-700"
                  onError={(e) => {
                    console.error(`Failed to load icon: ${instruction.icon}`);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-900">
                  {t(instruction.textKey)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 justify-center items-center">
          <motion.button
            onClick={onNext}
            className="py-3 px-8 rounded-lg transition-all duration-200 bg-primary-600 text-white hover:bg-primary-700 shadow-lg w-full md:w-48 flex items-center justify-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Camera className="w-5 h-5 mr-2" />
            {t('photo_instructions:button')}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
