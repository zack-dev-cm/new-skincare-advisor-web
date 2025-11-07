/**
 * BACKGROUND LOADER
 * 
 * Carica risorse pesanti in background SENZA bloccare il rendering iniziale.
 * Pattern: Fire-and-forget loading che migliora progressivamente l'UX.
 */

import { ASSETS } from './assets';
import { ensureTfBackendReady } from './tfBackend';

// Stato globale del background loading
let faceApiLoadingStarted = false;
let faceApiLoaded = false;
let faceApiPromise: Promise<any> | null = null;

let imagesLoadingStarted = false;
let imagesLoaded = false;

export let cachedFaceApi: any = null;

/**
 * Avvia il caricamento in background di face-api.js
 * NON blocca, ritorna immediatamente
 */
export function startFaceApiBackgroundLoading(): void {
  if (faceApiLoadingStarted) return;
  
  faceApiLoadingStarted = true;
  console.log('🔄 Starting face-api.js background loading...');

  // Fire-and-forget - non aspettiamo
  faceApiPromise = (async () => {
    try {
      // Ensure TFJS backend is initialized before face-api usage
      await ensureTfBackendReady();
      // Dynamic import non bloccante
      const module = await import('face-api.js');
      cachedFaceApi = module;
      
      // Carica modelli da CDN in parallelo
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      
      await Promise.all([
        module.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        module.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        module.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      
      faceApiLoaded = true;
      console.log('✅ face-api.js loaded in background and ready!');
      
      return module;
    } catch (error) {
      console.warn('⚠️ face-api.js background loading failed (will work without face detection):', error);
      faceApiLoaded = false;
      return null;
    }
  })();
}

/**
 * Ottiene face-api.js se già caricato, altrimenti aspetta
 * Usare questo quando serve davvero (step camera)
 */
export async function getFaceApi(): Promise<any> {
  if (cachedFaceApi && faceApiLoaded) {
    return cachedFaceApi;
  }
  
  if (!faceApiLoadingStarted) {
    startFaceApiBackgroundLoading();
  }
  
  // Aspetta che finisca il caricamento
  return faceApiPromise;
}

/**
 * Check se face-api.js è già pronto (sincrono)
 */
export function isFaceApiReady(): boolean {
  return faceApiLoaded && cachedFaceApi !== null;
}

/**
 * Avvia il caricamento in background delle immagini
 * Carica solo quelle critiche subito, il resto in background
 */
export function startImagesBackgroundLoading(): void {
  if (imagesLoadingStarted) return;
  
  imagesLoadingStarted = true;
  console.log('🔄 Starting images background loading...');

  // Fire-and-forget - non aspettiamo
  (async () => {
    try {
      // FASE 1: Immagini critiche (primo step)
      const criticalImages = [
        ASSETS.images.backgrounds.main, // Background onboarding
      ];

      // FASE 2: Immagini secondarie (steps successivi) - carica DOPO le critiche
      const secondaryImages = [
        ASSETS.images.backgrounds.bg1,
        ASSETS.images.backgrounds.bg2,
        ASSETS.images.skinTypes.normal,
        ASSETS.images.skinTypes.dry,
        ASSETS.images.skinTypes.oily,
        ASSETS.images.skinTypes.combination,
        ASSETS.images.skinTypes.dontKnow,
      ];

      // FASE 3: Icone (meno prioritarie) - SVG leggeri
      const iconImages = [
        ASSETS.images.icons.results,
        ASSETS.images.icons.routine,
        ASSETS.images.icons.glasses,
        ASSETS.images.icons.hair,
        ASSETS.images.icons.position,
        ASSETS.images.icons.expression,
        ASSETS.images.icons.wrinkles,
        ASSETS.images.icons.eyebags,
        ASSETS.images.icons.dullSkin,
        ASSETS.images.icons.aging,
        ASSETS.images.icons.poreDilation,
      ];

      // Carica in cascata con priorità
      await preloadImageBatch(criticalImages);
      console.log('✅ Critical images loaded');
      
      // Procedi con le secondarie (non aspettare)
      preloadImageBatch(secondaryImages).then(() => {
        console.log('✅ Secondary images loaded');
      });
      
      // Icone per ultime (non aspettare)
      preloadImageBatch(iconImages).then(() => {
        console.log('✅ Icon images loaded');
      });
      
      imagesLoaded = true;
    } catch (error) {
      console.warn('⚠️ Image background loading had errors:', error);
      imagesLoaded = true; // Continua comunque
    }
  })();
}

/**
 * Precarica un batch di immagini in parallelo
 */
async function preloadImageBatch(urls: string[]): Promise<void> {
  const promises = urls.map(url => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      
      const timeout = setTimeout(() => {
        console.warn(`⏰ Image timeout: ${url}`);
        resolve(); // Resolve comunque
      }, 5000); // 5 secondi timeout
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        console.warn(`❌ Image failed: ${url}`);
        resolve(); // Resolve comunque per non bloccare
      };
      
      img.src = url;
    });
  });

  await Promise.all(promises);
}

/**
 * Avvia TUTTO il background loading
 * Chiamare all'apertura del modal
 */
export function startBackgroundLoading(): void {
  console.log('🚀 Starting ALL background loading (non-blocking)...');
  
  // Avvia entrambi in parallelo
  startFaceApiBackgroundLoading();
  startImagesBackgroundLoading();
  
  console.log('✅ Background loading initiated - app is ready to use immediately!');
}

/**
 * Utility per preload progressivo basato sull'attuale step
 */
export function preloadForStep(stepName: string): void {
  switch (stepName) {
    case 'skin-type':
      // Precarica le immagini dei tipi di pelle se non già fatto
      console.log('📸 Preloading skin type images for upcoming step');
      break;
    
    case 'photo-instructions':
      // Assicurati che face-api.js sia in caricamento
      if (!faceApiLoadingStarted) {
        startFaceApiBackgroundLoading();
      }
      break;
    
    case 'camera-capture':
      // Qui abbiamo bisogno di face-api, ma dovrebbe essere già pronto
      console.log('📸 Camera step - face-api.js ready:', isFaceApiReady());
      break;
  }
}

