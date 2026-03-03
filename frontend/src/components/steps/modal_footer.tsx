"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';

function ResultsIcon({ className }: { className?: string }) {
  return (
    <svg width={24} height={24} viewBox="0 0 46 47" fill="none" className={className} aria-hidden>
      <path fillRule="evenodd" clipRule="evenodd" d="M13.0773 19.2208L21.0557 13.4225C20.8011 13.2329 20.5411 13.0407 20.3434 12.7671C20.1457 12.4963 20.0428 12.1903 19.9399 11.887L11.9182 17.715C12.43 18.0942 12.8579 18.5817 13.0773 19.2208Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M24.8889 13.4447L32.8375 19.2214C33.0569 18.5795 33.4848 18.0947 33.9912 17.7156L25.9614 11.8794C25.761 12.4806 25.4306 13.0385 24.8889 13.4447Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M27.9196 36.4063C27.7328 35.8024 27.6678 35.1579 27.8655 34.5133H18.0455C18.2432 35.1579 18.1809 35.8024 17.9913 36.4063H27.9196Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M13.9686 32.3862C14.2881 32.2833 14.6104 32.2778 14.93 32.2751L11.8724 22.856C11.6097 23.0428 11.347 23.2297 11.0274 23.3326C10.7079 23.4355 10.3883 23.4409 10.0687 23.4436L13.1263 32.8628C13.3863 32.6759 13.649 32.4891 13.9686 32.3862Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M34.886 23.3331C34.5664 23.2302 34.3037 23.0433 34.041 22.8564L30.9835 32.2756C31.303 32.2783 31.6253 32.2837 31.9449 32.3866C32.2617 32.4896 32.5271 32.6764 32.7871 32.8633L35.8447 23.4441C35.5251 23.4414 35.2056 23.436 34.886 23.3331Z" fill="currentColor"/>
      <path d="M22.9555 14.135V21.022" stroke="currentColor"/>
      <path d="M32.6539 21.0218L25.4202 23.1884" stroke="currentColor"/>
      <path d="M29.3003 33.2036L24.8886 26.8501" stroke="currentColor"/>
      <path d="M16.5923 32.5954L21.2017 26.2473" stroke="currentColor"/>
      <path d="M12.6727 20.6411L20.5102 23.1868" stroke="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M13.2942 20.2629C13.2942 22.0639 11.8318 23.5263 10.0281 23.5263C8.22714 23.5263 6.76471 22.0639 6.76471 20.2629C6.76471 18.4593 8.22714 16.9968 10.0281 16.9968C11.8318 16.9968 13.2942 18.4593 13.2942 20.2629Z" stroke="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M39.1333 20.2468C39.1333 22.0478 37.6708 23.5102 35.8672 23.5102C34.0662 23.5102 32.6038 22.0478 32.6038 20.2468C32.6038 18.4431 34.0662 16.9807 35.8672 16.9807C37.6708 16.9807 39.1333 18.4431 39.1333 20.2468Z" stroke="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M26.2219 10.8686C26.2219 12.6723 24.7595 14.1347 22.9558 14.1347C21.1548 14.1347 19.6924 12.6723 19.6924 10.8686C19.6924 9.06766 21.1548 7.60522 22.9558 7.60522C24.7595 7.60522 26.2219 9.06766 26.2219 10.8686Z" stroke="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M26.2059 24.2353C26.2059 26.039 24.7435 27.4987 22.9425 27.4987C21.1388 27.4987 19.6764 26.039 19.6764 24.2353C19.6764 22.4317 21.1388 20.9692 22.9425 20.9692C24.7435 20.9692 26.2059 22.4317 26.2059 24.2353Z" stroke="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M18.2321 35.4595C18.2321 37.2604 16.7696 38.7229 14.966 38.7229C13.165 38.7229 11.7026 37.2604 11.7026 35.4595C11.7026 33.6558 13.165 32.1934 14.966 32.1934C16.7696 32.1934 18.2321 33.6558 18.2321 35.4595Z" stroke="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M34.1878 35.4436C34.1878 37.2446 32.7254 38.707 30.9244 38.707C29.1208 38.707 27.6583 37.2446 27.6583 35.4436C27.6583 33.6399 29.1208 32.1775 30.9244 32.1775C32.7254 32.1775 34.1878 33.6399 34.1878 35.4436Z" stroke="currentColor"/>
    </svg>
  );
}

function RoutineIcon({ className }: { className?: string }) {
  return (
    <svg width={24} height={24} viewBox="0 0 31 31" fill="none" className={className} aria-hidden>
      <path d="M22.2013 2.60986H10.1133V4.79088H22.2013V2.60986Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.3867 4.79077H22.0681C21.4323 11.4004 20.7891 18.0099 20.1532 24.6195H12.3016C11.6658 18.0099 11.0225 11.4004 10.3867 4.79077Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.1602 24.6196H19.2079V27.6287C19.2079 28.0427 18.8752 28.3754 18.4611 28.3754H13.9143C13.5002 28.3754 13.1675 28.0427 13.1675 27.6287V24.6196H13.1602Z" stroke="currentColor" strokeMiterlimit={10}/>
      <path d="M12.2656 22.2537H20.3465" stroke="currentColor" strokeMiterlimit={10}/>
    </svg>
  );
}

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
            <ResultsIcon className="opacity-90 shrink-0" />
            <p className="text-xs font-semibold">{t('modal_footer.results_tab')}</p>
          </button>
          <button
            onClick={() => onTabChange('routine')}
            className={activeTab === 'routine' ? 'w-full flex flex-col items-center justify-center text-primary-600 py-0.5 border-b-2 border-primary-600' : 'w-full flex flex-col items-center justify-center text-muted-foreground py-0.5 border-b-2 border-transparent'}
          >
            <RoutineIcon className="opacity-90 shrink-0" />
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
