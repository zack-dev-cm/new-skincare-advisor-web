"use client";
import React from 'react';
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
  return (
    <div className={`border-t border-primary-900 bg-primary-800 safe-area-bottom w-full flex-shrink-0 ${className}`}>
      {/* Tab Navigation - Only show on results step */}
      {(showTabButtons && onTabChange) ? (
        <div className="routine-btns w-full flex">
          <button
            onClick={() => onTabChange('results')}
            className={activeTab === 'results' ? 'w-full flex flex-col items-center justify-center text-white py-1 border-b-4 border-white' : 'w-full flex flex-col items-center justify-center text-white/70 py-1 border-b-4 border-transparent'}
          >
            <img 
              src={ASSETS.images.icons.results} 
              alt=""
              width={30}
              height={30}
              className="opacity-90"
            />
            <p className="heading-4">RISULTATI</p>
          </button>
          <button
            onClick={() => onTabChange('routine')}
            className={activeTab === 'routine' ? 'w-full flex flex-col items-center justify-center text-white py-1 border-b-4 border-white' : 'w-full flex flex-col items-center justify-center text-white/70 py-1 border-b-4 border-transparent'}
          >
            <img 
              src={ASSETS.images.icons.routine} 
              alt="" 
              width={30}
              height={30}
              className="opacity-90"
            />
            <p className="heading-4">ROUTINE</p>
          </button>
        </div>
      ) : (
        <div className="px-4 py-3">
          <div className="flex justify-center space-x-2">
            {Array.from({ length: totalSteps }, (_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index < currentStep ? 'bg-gray-700' : 'bg-primary-500'
                }`}
              />
            ))}
          </div>
          <p className="pt-2 text-center text-gray-500 text-sm">
            Powered by Dermaself
          </p>
        </div>
      )}
    </div>
  );
}
