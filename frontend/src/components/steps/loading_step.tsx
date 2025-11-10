"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface LoadingStepProps {
  // Add any props you might need for loading state
}

export default function LoadingStep({}: LoadingStepProps) {
  const { t } = useTranslation();
  
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 h-full flex flex-col items-center justify-center"
    >
      <div className="flex flex-col items-center justify-center py-12 px-4 flex-1">
        <div className="loader__wrapper">
          <div className="loader">&nbsp;</div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2 mt-4">{t('steps:loading.analyzing')}</h2>
        <p className="text-gray-600 text-center max-w-md">
          {t('steps:loading.processing')}
        </p>
      </div>
    </motion.div>
  );
}
