"use client";
import React, { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Lazy load CameraCapture component
const CameraCapture = lazy(() => import('../CameraCapture'));

interface ScanStepProps {
  onBack: () => void;
  onImageCapture: (imageData: string) => void;
}

export default function ScanStep({ onBack, onImageCapture }: ScanStepProps) {
  const { t } = useTranslation();
  return (
    <motion.div
      key="scan"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col"
    >

      {/* Camera Component */}
      <div className="flex-1 relative">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('camera:status.loading')}</p>
            </div>
          </div>
        }>
          <CameraCapture onCapture={onImageCapture} onClose={onBack} />
        </Suspense>
      </div>

      {/* Instructions */}
      <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Camera className="w-5 h-5 text-primary-600 mr-2" />
            <span className="text-sm font-medium text-gray-900">{t('camera:instructions.position_face')}</span>
          </div>
          <p className="text-xs text-gray-600">
            {t('camera:instructions.good_lighting')}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
