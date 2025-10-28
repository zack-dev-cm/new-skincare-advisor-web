"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { preloadStepImages, getLoadingProgress } from '../lib/imagePreloader';
import LogoWhite from '../app/RGB_Logo_White.png';

interface ImagePreloaderProps {
  onComplete: () => void;
  children: React.ReactNode;
  mode?: 'initial' | 'analysis'; // Nuova prop per differenziare le modalità di caricamento
  analysisProgress?: number; // Progresso dell'analisi opzionale per la modalità analisi
}

export default function ImagePreloader({ 
  onComplete, 
  children, 
  mode = 'initial',
  analysisProgress = 0 
}: ImagePreloaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Preparando la tua analisi della pelle...');
  const [currentPhase, setCurrentPhase] = useState<'preparing' | 'analyzing' | 'complete'>('preparing');

  useEffect(() => {
    const loadImages = async () => {
      try {
        if (mode === 'initial') {
          // Precaricamento iniziale delle immagini
          setLoadingText('Dermaself - Analisi della Pelle AI');
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
          setLoadingText('Analizzando la Tua Foto');
          setCurrentPhase('analyzing');
          
          // Simula il progresso dell'analisi
          const analysisInterval = setInterval(() => {
            setProgress(analysisProgress);
            
            if (analysisProgress >= 100) {
              clearInterval(analysisInterval);
              setCurrentPhase('complete');
              setLoadingText('Analisi Completata!');
              
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
        setLoadingText('Continuando...');
        // Anche se il caricamento fallisce, continua con l'app
        setTimeout(() => {
          setIsLoading(false);
          onComplete();
        }, 1000);
      }
    };

    loadImages();
  }, [onComplete, mode, analysisProgress]);

  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Sfondo */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      
      {/* Contenitore Modale - Stesso stile di SkinAnalysisModal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative w-full bg-white overflow-hidden flex flex-col h-full md:max-w-[540px] w-full h-full md:max-h-[95vh]"
      >
        {/* Intestazione - Stesso stile della modale */}
        <div className="px-4 py-3 flex items-center justify-center border-b border-primary-200/70 bg-primary-800">
          <div className="flex-1 text-center flex items-center justify-center">
            <Image src={LogoWhite} alt="Dermaself" className="h-12 w-auto" priority />
          </div>
        </div>

        {/* Contenuto di Caricamento */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
          <div className="text-center max-w-sm w-full mx-4">
            {/* Animazione di Caricamento */}
            <div className="mb-6">
              <motion.div
                className="w-16 h-16 bg-gradient-to-r from-primary-600 to-primary-500 rounded-full mx-auto mb-4"
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
                  ? 'Preparazione della tua esperienza di analisi della pelle...'
                  : 'La nostra AI sta analizzando la tua pelle e creando raccomandazioni personalizzate...'
                }
              </p>
            </div>

            {/* Barra di Progresso */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <motion.div
                className="bg-gradient-to-r from-primary-600 to-primary-500 h-2 rounded-full"
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
                <div className={`w-2 h-2 rounded-full ${currentPhase === 'preparing' ? 'bg-primary-600' : 'bg-gray-300'}`} />
                <div className={`w-2 h-2 rounded-full ${currentPhase === 'analyzing' ? 'bg-primary-600' : 'bg-gray-300'}`} />
                <div className={`w-2 h-2 rounded-full ${currentPhase === 'complete' ? 'bg-primary-600' : 'bg-gray-300'}`} />
              </div>
            )}
          </div>
        </div>

        {/* Piè di pagina - Stesso stile della modale */}
        <div className="bg-primary-800 px-4 py-2 border-t border-primary-900">
          <div className="flex items-center justify-center">
            <p className="text-xs text-white/70">
              {mode === 'initial' 
                ? 'Ottimizzazione della tua esperienza...'
                : 'Attendi mentre elaboriamo la tua immagine...'
              }
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
