"use client";
import React from 'react';
/* eslint-disable jsx-a11y/aria-proptypes */
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { ASSETS } from '../../lib/assets';

interface SkinType {
  name: string;
  image: string;
  description: string;
}

interface SkinTypeStepProps {
  selectedSkinType: string;
  onSkinTypeSelect: (skinType: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const skinTypes: SkinType[] = [
  {
    name: 'Normale',
    image: ASSETS.images.skinTypes.normal,
    description: 'Tessuto cutaneo regolare senza problemi significativi'
  },
  {
    name: 'Secca',
    image: ASSETS.images.skinTypes.dry,
    description: 'Opaca, a volte tesa e irritata'
  },
  {
    name: 'Grassa',
    image: ASSETS.images.skinTypes.oily,
    description: 'Lucida nella zona T, con pori visibili e punti neri.'
  },
  {
    name: 'Mista',
    image: ASSETS.images.skinTypes.combination,
    description: 'Grassa nella zona T (fronte, naso e mento) e secca o normale sulle guance.'
  },
  {
    name: 'Non lo so',
    image: ASSETS.images.skinTypes.dontKnow,
    description: 'Scopriamolo insieme!'
  }
];

export default function SkinTypeStep({ selectedSkinType, onSkinTypeSelect, onNext, onBack }: SkinTypeStepProps) {
  return (
    <motion.div
      key="skin-type"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-main bg-cover bg-center h-full flex flex-col"
    >
      {/* Skin Type Selection */}
      <div className="flex flex-col px-4 py-4 overflow-y-auto bg-white/50 backdrop-blur-sm p-4 overflow-y-auto mt-auto mx-4 mb-4 rounded-lg">
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Qual è il tuo tipo di pelle?
          </h1>
        </div>
        
        
        <div className="grid grid-cols-2 gap-3 items-stretch">
          {skinTypes.map((type) => (
            // eslint-disable-next-line jsx-a11y/aria-proptypes
            <div 
              key={type.name} 
              role="radio"
              aria-checked={selectedSkinType === type.name}
              tabIndex={0}
              className={`relative cursor-pointer transition-all duration-200 ${
                selectedSkinType === type.name 
                  ? 'transform scale-[1.02]' 
                  : 'hover:transform hover:scale-[1.01]'
              }`}
              onClick={() => onSkinTypeSelect(type.name)}
            >
              <div className={`relative rounded-2xl overflow-hidden h-full border-2 transition-all duration-200 ${
                selectedSkinType === type.name
                  ? 'border-primary-500 shadow-lg shadow-primary-100'
                  : 'border-transparent hover:border-primary-300'
              }`}>
                <div className="flex h-16 md:h-full bg-white">
                  <div className="w-16 overflow-hidden flex-shrink-0">
                    <img
                      src={type.image}
                      alt={type.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 px-3 flex flex-col justify-center items-center">
                    <div className="font-semibold text-gray-900 text-sm mb-1">
                      {type.name}
                    </div>
                    <div className="text-xs text-gray-600 hidden md:block">
                      {type.description}
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
            className="py-3 px-8 rounded-lg transition-all duration-200 bg-primary-600 text-white hover:bg-primary-700 shadow-lg w-full md:w-48 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
              Avanti
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
