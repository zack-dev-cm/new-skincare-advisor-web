"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ASSETS } from '../../lib/assets';

interface ModalFooterProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
  showTabButtons?: boolean;
  activeTab?: 'results' | 'routine';
  onTabChange?: (tab: 'results' | 'routine') => void;
}

export default function ModalFooter({
  currentStep,
  totalSteps,
  className = "",
  showTabButtons = false,
  activeTab = 'results',
  onTabChange
}: ModalFooterProps) {
  const { t } = useTranslation('steps');
  return (
    <div className={`border-t modal-footer-bar safe-area-bottom-nav ${className}`}>
      {/* Tab Navigation - Only show on results step */}
      {(showTabButtons && onTabChange) ? (
        <div className="routine-btns w-full flex">
          <button
            onClick={() => onTabChange('results')}
            className={activeTab === 'results' ? 'w-full flex flex-col items-center justify-center text-primary-600 py-0.5 border-b-2 border-primary-600' : 'w-full flex flex-col items-center justify-center text-muted-foreground py-0.5 border-b-2 border-transparent'}
          >
            <img 
              src={ASSETS.images.icons.results} 
              alt=""
              width={24}
              height={24}
              className="opacity-90"
            />
            <p className="text-xs font-semibold">{t('modal_footer.results_tab')}</p>
          </button>
          <button
            onClick={() => onTabChange('routine')}
            className={activeTab === 'routine' ? 'w-full flex flex-col items-center justify-center text-primary-600 py-0.5 border-b-2 border-primary-600' : 'w-full flex flex-col items-center justify-center text-muted-foreground py-0.5 border-b-2 border-transparent'}
          >
            <img 
              src={ASSETS.images.icons.routine} 
              alt="" 
              width={24}
              height={24}
              className="opacity-90"
            />
            <p className="text-xs font-semibold">{t('modal_footer.routine_tab')}</p>
          </button>
        </div>
      ) : (
        <div className="px-4 py-2">
          <div className="flex justify-center space-x-2">
            {Array.from({ length: totalSteps }, (_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index < currentStep ? 'bg-primary-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="pt-2 text-center text-muted-foreground text-sm">
            {t('modal_footer.powered_by')}
          </p>
        </div>
      )}
    </div>
  );
}
