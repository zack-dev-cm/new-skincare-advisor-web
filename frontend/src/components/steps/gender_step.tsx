"use client";
import React from 'react';
/* eslint-disable jsx-a11y/aria-proptypes */
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { ASSETS } from '../../lib/assets';

interface GenderOption {
  id: string;
  name: string;
}

interface GenderStepProps {
  selectedGender: string;
  onGenderSelect: (gender: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const genderOptions: GenderOption[] = [
  {
    id: 'woman',
    name: 'Donna'
  },
  {
    id: 'man',
    name: 'Uomo'
  },
  {
    id: 'non-binary',
    name: 'Non-binario'
  },
  {
    id: 'prefer-not-to-specify',
    name: 'Preferisco non specificare'
  }
];

export default function GenderStep({ selectedGender, onGenderSelect, onNext, onBack }: GenderStepProps) {
  return (
    <motion.div
      key="gender"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-main bg-cover bg-center h-full flex flex-col"
    >
      {/* Gender Selection */}
      <div className="flex flex-col px-4 py-4 overflow-y-auto bg-white/50 backdrop-blur-sm p-4 overflow-y-auto mt-auto mx-4 mb-4 rounded-lg">
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Con quale genere ti identifichi?
          </h1>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {genderOptions.map((option) => (
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
              <div className={`relative rounded-2xl overflow-hidden h-full border-2 transition-all duration-200 ${
                selectedGender === option.id
                  ? 'border-primary-500 shadow-lg shadow-primary-100'
                  : 'border-transparent hover:border-primary-300'
              }`}>
                <div className="flex h-full bg-white">
                  <div className="flex-1 min-w-0 px-6 py-4 flex flex-col justify-center items-center">
                    <div className="font-semibold text-gray-900 text-sm mb-1">
                      {option.name}
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
