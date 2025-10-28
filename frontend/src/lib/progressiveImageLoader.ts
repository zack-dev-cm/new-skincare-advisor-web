/**
 * PROGRESSIVE IMAGE LOADER
 * 
 * Carica immagini on-demand quando diventano visibili o necessarie
 * Pattern: Intersection Observer + lazy loading intelligente
 */

interface ImageLoadOptions {
  priority?: 'high' | 'medium' | 'low';
  preload?: boolean;
}

/**
 * Carica un'immagine progressivamente con priorità
 */
export function loadImageProgressive(
  url: string, 
  options: ImageLoadOptions = {}
): Promise<void> {
  const { priority = 'low', preload = false } = options;
  
  return new Promise((resolve, reject) => {
    // Check se già in cache del browser
    const img = new Image();
    
    // Timeout basato su priorità
    const timeoutDuration = priority === 'high' ? 5000 : priority === 'medium' ? 10000 : 15000;
    const timeout = setTimeout(() => {
      console.warn(`⏰ Image load timeout (${priority}):`, url);
      resolve(); // Resolve comunque per non bloccare
    }, timeoutDuration);
    
    img.onload = () => {
      clearTimeout(timeout);
      console.log(`✅ Image loaded (${priority}):`, url);
      resolve();
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      console.warn(`❌ Image failed (${priority}):`, url);
      resolve(); // Resolve comunque
    };
    
    // Imposta priorità di fetch se supportata
    if ('fetchPriority' in img) {
      (img as any).fetchPriority = priority;
    }
    
    img.src = url;
  });
}

/**
 * Carica immagini in batch con priorità
 */
export async function loadImageBatch(
  urls: string[], 
  priority: 'high' | 'medium' | 'low' = 'low'
): Promise<void> {
  const promises = urls.map(url => loadImageProgressive(url, { priority }));
  await Promise.all(promises);
}

/**
 * Carica immagini solo quando necessarie per uno step specifico
 */
export function preloadForStep(stepName: string): Promise<void> {
  const { ASSETS } = require('./assets');
  
  switch (stepName) {
    case 'onboarding':
      // Solo background principale
      return loadImageProgressive(ASSETS.images.backgrounds.main, { priority: 'high' });
    
    case 'skin-type':
      // Immagini tipi di pelle
      return loadImageBatch([
        ASSETS.images.skinTypes.normal,
        ASSETS.images.skinTypes.dry,
        ASSETS.images.skinTypes.oily,
        ASSETS.images.skinTypes.combination,
        ASSETS.images.skinTypes.dontKnow,
      ], 'high');
    
    case 'skin-concerns':
      // Icone preoccupazioni
      return loadImageBatch([
        ASSETS.images.icons.wrinkles,
        ASSETS.images.icons.eyebags,
        ASSETS.images.icons.dullSkin,
        ASSETS.images.icons.aging,
        ASSETS.images.icons.poreDilation,
      ], 'medium');
    
    case 'photo-instructions':
      // Icone istruzioni
      return loadImageBatch([
        ASSETS.images.icons.glasses,
        ASSETS.images.icons.hair,
        ASSETS.images.icons.position,
        ASSETS.images.icons.expression,
      ], 'high');
    
    default:
      return Promise.resolve();
  }
}

/**
 * Hook React per lazy loading di immagini
 */
export function useLazyImage(src: string, options: ImageLoadOptions = {}) {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  
  React.useEffect(() => {
    loadImageProgressive(src, options)
      .then(() => setLoaded(true))
      .catch(() => setError(true));
  }, [src]);
  
  return { loaded, error };
}

// Export per compatibilità
import React from 'react';

