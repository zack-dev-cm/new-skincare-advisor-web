"use client";
import React from 'react';
/* eslint-disable jsx-a11y/aria-proptypes */
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { ASSETS } from '../../lib/assets';

interface SkinConcern {
  id: string;
  name: string;
  icon: string;
}

interface SkinConcernsStepProps {
  selectedConcerns: string[];
  onConcernToggle: (concernId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const skinConcerns: SkinConcern[] = [
  {
    id: 'wrinkles',
    name: 'Rughe visibili e mancanza di tono',
    icon: ASSETS.images.icons.wrinkles
  },
  {
    id: 'eyebags',
    name: 'Borse e occhiaie',
    icon: ASSETS.images.icons.eyebags
  },
  {
    id: 'dullSkin',
    name: 'Carnagione spenta',
    icon: ASSETS.images.icons.dullSkin
  },
  {
    id: 'aging',
    name: 'Primi segni di invecchiamento',
    icon: ASSETS.images.icons.aging
  },
  {
    id: 'pores',
    name: 'Pori visibili e punti neri',
    icon: ASSETS.images.icons.poreDilation
  },
  {
    id: 'none',
    name: 'Nessuna preoccupazione specifica',
    icon: ''
  }
];

export default function SkinConcernsStep({ selectedConcerns, onConcernToggle, onNext, onBack }: SkinConcernsStepProps) {
  return (
    <motion.div
      key="skin-concerns"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-primary-200 bg-cover bg-center h-full flex flex-col"
    >
      {/* Skin Concerns Selection */}
      <div className="flex flex-col px-4 py-4 overflow-y-auto bg-white/50 backdrop-blur-sm p-4 overflow-y-auto mt-auto mx-4 mb-4 rounded-lg">
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Cosa pensi della tua pelle? Indica quali sono le principali preoccupazioni della tua pelle, se ce ne sono.
          </h1>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {skinConcerns.map((concern) => (
            <div 
              key={concern.id} 
              tabIndex={0}
              className={`relative h-full cursor-pointer transition-all duration-200 ${
                selectedConcerns.includes(concern.id) 
                  ? 'transform scale-[1.02]' 
                  : 'hover:transform hover:scale-[1.01]'
              }`}
              onClick={() => onConcernToggle(concern.id)}
            >
              <div className={`relative rounded-2xl overflow-hidden border-2 transition-all h-full duration-200 ${
                selectedConcerns.includes(concern.id)
                  ? 'border-primary-500 shadow-lg shadow-primary-100'
                  : 'border-transparent hover:border-primary-300'
              }`}>
                <div className="flex bg-white h-full">
                  <div className="w-16 overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center py-2">
                    {concern.icon ? (
                      <img
                        src={concern.icon}
                        alt={concern.name}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          console.error(`Failed to load icon: ${concern.icon}`);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        N/A
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 px-3 py-2 flex flex-col justify-center items-center">
                    <div className="font-semibold text-gray-900 text-center text-xs sm:text-sm leading-tight break-words">
                      {concern.name}
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
            Avanti
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
