"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { ASSETS } from '../../lib/assets';
import Image from 'next/image';

interface OnboardingStepProps {
  onNext: () => void;
  onClose: () => void;
}

export default function OnboardingStep({ onNext, onClose }: OnboardingStepProps) {
  const [consentGiven, setConsentGiven] = useState(false);

  return (
    <motion.div
      key="onboarding"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-primary-200 bg-cover bg-center flex flex-col h-full"
    >
      {/* Main content */}
      <div className="flex flex-col justify-center text-center m-8 mt-auto bg-white/50 backdrop-blur-sm rounded-lg p-8 overflow-y-auto h-fit">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 leading-tight">
          Scopri la Tua Routine di Cura della Pelle Perfetta con Analisi Powered by AI
        </h1>
        
        <div className="text-gray-600 mb-8 space-y-4">
          <p className="text-sm leading-relaxed">
            Utilizzando questo servizio, accetti la nostra{' '}
            <a 
              href="https://dermaself.it/pages/privacy-policy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 underline"
            >
              Informativa sulla Privacy
            </a>
            . I tuoi dati saranno elaborati in modo sicuro e utilizzati solo per fornire raccomandazioni personalizzate per la cura della pelle.
          </p>
        </div>

        {/* Consent checkbox */}
        <div className="mb-8">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">
              Acconsento al trattamento dei miei dati personali per ricevere raccomandazioni personalizzate per la cura della pelle.
            </span>
          </label>
        </div>

        {/* Start button */}
        <motion.button
          onClick={() => {
            if (consentGiven) {
              onNext();
            }
          }}
          disabled={!consentGiven}
            className={`py-3 px-8 rounded-lg transition-colors duration-200 w-full md:w-auto mx-auto ${
            consentGiven 
              ? 'bg-primary-600 hover:bg-primary-700 text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          whileHover={consentGiven ? { scale: 1.02 } : {}}
          whileTap={consentGiven ? { scale: 0.98 } : {}}
        >
          <span>Inizia Analisi</span>
        </motion.button>
        {/* Fake login button */}
        <motion.button
          onClick={() => { /* fake button - no action */ }}
          className="mt-3 py-3 px-8 rounded-lg transition-colors duration-200 w-full md:w-auto mx-auto bg-primary-200 hover:bg-primary-300 text-gray-900 flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>Accedi con</span>
          <div className="flex items-center">
            <span className="text-sm font-semibold text-primary-600">Dermaself</span>
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}
