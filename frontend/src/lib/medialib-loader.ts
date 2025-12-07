interface LibraryLoadOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

const DEFAULT_CDN_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh';

interface FaceMeshConstructor {
  new (config: {
    locateFile: (file: string) => string;
  }): FaceMeshInstance;
}

export interface FaceMeshLandmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceMeshResults {
  multiFaceLandmarks?: Array<Array<FaceMeshLandmark>>;
  image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap;
}

export interface FaceMeshInstance {
  setOptions(options: {
    maxNumFaces?: number;
    refineLandmarks?: boolean;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }): void;
  onResults(callback: (results: FaceMeshResults) => void): void;
  send(input: { image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement }): Promise<void>;
  close(): void;
}

declare global {
  interface Window {
    FaceMesh: FaceMeshConstructor;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadFaceMeshLibrary(timeout: number = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.FaceMesh) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `${DEFAULT_CDN_BASE_URL}/face_mesh.js`;
    script.crossOrigin = 'anonymous';
    
    const timeoutId = setTimeout(() => {
      reject(new Error(`Failed to load FaceMesh library within ${timeout}ms`));
    }, timeout);

    script.onload = () => {
      clearTimeout(timeoutId);
      setTimeout(() => {
        if (window.FaceMesh) {
          resolve();
        } else {
          reject(new Error('FaceMesh constructor not available after library load'));
        }
      }, 100);
    };

    script.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error('Failed to load FaceMesh library script'));
    };

    document.head.appendChild(script);
  });
}

async function waitForFaceMesh(timeout: number = 5000): Promise<FaceMeshConstructor> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (typeof window !== 'undefined' && window.FaceMesh) {
      return window.FaceMesh;
    }
    await delay(50);
  }
  
  throw new Error('FaceMesh constructor not available on window object');
}

export async function loadFaceMeshWithFallback(
  options: LibraryLoadOptions = {}
): Promise<FaceMeshInstance> {
  const {
    maxRetries = 10,
    retryDelay: initialRetryDelay = 1000,
    timeout = 10000
  } = options;

  let lastError: Error | null = null;
  let currentRetryDelay = initialRetryDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} to load FaceMesh...`);
      
      if (typeof window === 'undefined' || !window.FaceMesh) {
        await loadFaceMeshLibrary(timeout);
      }
      
      const FaceMeshConstructor = await waitForFaceMesh(timeout);
      
      const faceMesh = new FaceMeshConstructor({
        locateFile: (file: string) => `${DEFAULT_CDN_BASE_URL}/${file}`,
      });

      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`FaceMesh initialization timeout after ${timeout}ms`));
        }, timeout);

        try {
          faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
          
          clearTimeout(timeoutId);
          resolve();
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      });

      console.log('FaceMesh loaded successfully!');
      return faceMesh;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt} failed:`, lastError.message);

      if (attempt < maxRetries) {
        console.log(`Retrying in ${currentRetryDelay}ms...`);
        await delay(currentRetryDelay);
        
        currentRetryDelay *= 1.5;
      }
    }
  }

  throw new Error(
    `Failed to load FaceMesh after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`
  );
}

export async function checkMediaPipeAvailability(): Promise<{
  isAvailable: boolean;
  error?: string;
}> {
  try {
    if (typeof window !== 'undefined' && window.FaceMesh) {
      return { isAvailable: true };
    }
    
    const testUrl = `${DEFAULT_CDN_BASE_URL}/face_mesh.js`;
    const response = await fetch(testUrl, { 
      method: 'HEAD',
      cache: 'no-cache'
    });
    
    return {
      isAvailable: response.ok
    };
  } catch (error) {
    return {
      isAvailable: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 