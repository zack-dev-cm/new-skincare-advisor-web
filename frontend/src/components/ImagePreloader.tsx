"use client";
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { preloadStepImages, getLoadingProgress } from '../lib/imagePreloader';
import UploadingScreen from './common/UploadingScreen';

interface ImagePreloaderProps {
  onComplete: () => void;
  children: React.ReactNode;
	  mode?: 'initial' | 'analysis'; // Nuova prop per differenziare le modalità di caricamento
	  analysisProgress?: number; // Progresso dell'analisi opzionale per la modalità analisi
	  analysisImageUrl?: string; // Immagine da mostrare durante l'analisi (per UploadingScreen)
}

const PRELOADER_LOGO = '/shiseido_logo.png';

export default function ImagePreloader({ 
  onComplete, 
  children, 
  mode = 'initial',
	  analysisProgress = 0,
	  analysisImageUrl,
}: ImagePreloaderProps) {
  const { t } = useTranslation('analysis');
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [currentPhase, setCurrentPhase] = useState<'preparing' | 'analyzing' | 'complete'>('preparing');

  useEffect(() => {
    const loadImages = async () => {
      try {
        if (mode === 'initial') {
          // Precaricamento iniziale delle immagini
          setLoadingText(t('preloader.dermaself_title'));
          setCurrentPhase('preparing');
          
          // Avvia il precaricamento delle immagini
          const preloadPromise = preloadStepImages();
          
          // Aggiorna il progresso periodicamente
          const progressInterval = setInterval(() => {
            const { percentage } = getLoadingProgress();
            setProgress(percentage);
            
            if (percentage >= 100) {
              clearInterval(progressInterval);
            }
          }, 100);
          
          // Attende il completamento del precaricamento
          const results = await preloadPromise;
          
          clearInterval(progressInterval);
          setProgress(100);
          
          // Verifica se ci sono caricamenti riusciti
          const successful = results.filter(r => r.success).length;
          const total = results.length;
          
          if (successful === 0) {
            console.warn('⚠️ Nessuna immagine caricata con successo, ma si continua...');
          } else {
            console.log(`✅ Precaricamento immagini completato: ${successful}/${total} immagini caricate`);
          }
          
          // Breve ritardo per mostrare il completamento
          setTimeout(() => {
            setIsLoading(false);
            onComplete();
          }, 500);
          
        } else if (mode === 'analysis') {
          // Modalità caricamento analisi
          setLoadingText(t('preloader.analyzing_photo'));
          setCurrentPhase('analyzing');
          
          // Simula il progresso dell'analisi
          const analysisInterval = setInterval(() => {
            setProgress(analysisProgress);
            
            if (analysisProgress >= 100) {
              clearInterval(analysisInterval);
              setCurrentPhase('complete');
              setLoadingText(t('preloader.analysis_complete'));
              
              setTimeout(() => {
                setIsLoading(false);
                onComplete();
              }, 1000);
            }
          }, 100);
          
          return () => clearInterval(analysisInterval);
        }
        
      } catch (error) {
        console.error('Caricamento fallito:', error);
        setLoadingText(t('preloader.continuing'));
        // Anche se il caricamento fallisce, continua con l'app
        setTimeout(() => {
          setIsLoading(false);
          onComplete();
        }, 1000);
      }
    };

    loadImages();
  }, [onComplete, mode, analysisProgress, t]);

	  if (!isLoading) {
	    return <>{children}</>;
	  }

	  // Durante la fase di analisi: overlay assoluto sopra il modal esistente.
	  // Si usa `absolute` (non `fixed`) per evitare il problema del transform-containing-block
	  // di Framer Motion, e z-[100] per sovrastare lo sticky header (z-50).
	  if (mode === 'analysis' && analysisImageUrl) {
	    return (
	      <motion.div
	        initial={{ opacity: 0 }}
	        animate={{ opacity: 1 }}
	        transition={{ duration: 0.15 }}
	        className="absolute inset-0 z-[100] bg-white flex flex-col overflow-hidden"
	      >
	        <div className="px-4 py-3 flex items-center justify-center border-b modal-header-bar flex-shrink-0">
	          <div className="flex-1 text-center flex items-center justify-center">
	            <img src={PRELOADER_LOGO} alt="Shiseido" className="h-9 w-auto object-contain logo-violet" />
	          </div>
	        </div>
	        <div className="flex-1 min-h-0 flex flex-col">
	          <UploadingScreen imageUrl={analysisImageUrl} contained />
	        </div>
	        <div className="modal-footer-bar px-4 py-2 border-t flex-shrink-0">
	          <p className="text-xs text-muted-foreground text-center">
	            {t('preloader.processing_image')}
	          </p>
	        </div>
	      </motion.div>
	    );
	  }

	  return (
	    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Sfondo */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      
      {/* Contenitore Modale - Stesso stile di SkinAnalysisModal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="relative w-full bg-white overflow-hidden flex flex-col h-full md:max-w-[540px] w-full h-full md:max-h-[95vh]"
      >
        {/* Intestazione - Stesso stile della modale */}
        <div className="px-4 py-3 flex items-center justify-center border-b modal-header-bar">
          <div className="flex-1 text-center flex items-center justify-center">
            <img src={PRELOADER_LOGO} alt="Shiseido" className="h-9 w-auto object-contain logo-violet" />
          </div>
        </div>

        {/* Contenuto di Caricamento */}
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center max-w-sm w-full mx-4">
            {/* Animazione di Caricamento */}
            <div className="mb-6">
              <motion.div
                className="w-16 h-16 border border-black bg-white mx-auto mb-4"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 180, 360]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {loadingText}
              </h2>
              
              <p className="text-sm text-gray-600">
                {mode === 'initial' 
                  ? t('preloader.preparing_experience')
                  : t('preloader.ai_analyzing')
                }
              </p>
            </div>

            {/* Barra di Progresso */}
            <div className="w-full bg-gray-200 h-2 mb-4">
              <motion.div
                className="bg-black h-2"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            
            <div className="text-center">
              <span className="text-sm font-medium text-gray-700">
                {progress}%
              </span>
            </div>

            {/* Indicatore di Fase per la Modalità Analisi */}
            {mode === 'analysis' && (
              <div className="mt-4 flex justify-center space-x-2">
                <div className={`w-2 h-2 ${currentPhase === 'preparing' ? 'bg-black' : 'bg-gray-300'}`} />
                <div className={`w-2 h-2 ${currentPhase === 'analyzing' ? 'bg-black' : 'bg-gray-300'}`} />
                <div className={`w-2 h-2 ${currentPhase === 'complete' ? 'bg-black' : 'bg-gray-300'}`} />
              </div>
            )}
          </div>
        </div>

        {/* Piè di pagina - Stesso stile della modale */}
        <div className="modal-footer-bar px-4 py-2 border-t">
          <div className="flex items-center justify-center">
            <p className="text-xs text-muted-foreground">
              {mode === 'initial' 
                ? t('preloader.optimizing')
                : t('preloader.processing_image')
              }
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
