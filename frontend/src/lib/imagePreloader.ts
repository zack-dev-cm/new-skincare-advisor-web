import { ASSETS } from './assets';

interface PreloadResult {
  success: boolean;
  url: string;
  error?: string;
}

class ImagePreloader {
  private loadedImages = new Set<string>();
  private loadingPromises = new Map<string, Promise<PreloadResult>>();

  /**
   * Preload a single image
   */
  private preloadImage(url: string): Promise<PreloadResult> {
    if (this.loadedImages.has(url)) {
      return Promise.resolve({ success: true, url });
    }

    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    const promise = new Promise<PreloadResult>((resolve) => {
      const img = new Image();
      
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.warn(`⏰ Image preload timeout: ${url}`);
        this.loadingPromises.delete(url);
        resolve({ 
          success: false, 
          url, 
          error: `Timeout loading image: ${url}` 
        });
      }, 10000); // 10 second timeout
      
      img.onload = () => {
        clearTimeout(timeout);
        this.loadedImages.add(url);
        this.loadingPromises.delete(url);
        console.log(`✅ Image loaded: ${url}`);
        resolve({ success: true, url });
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        this.loadingPromises.delete(url);
        console.warn(`❌ Image failed to load: ${url}`);
        resolve({ 
          success: false, 
          url, 
          error: `Failed to load image: ${url}` 
        });
      };
      
      img.src = url;
    });

    this.loadingPromises.set(url, promise);
    return promise;
  }

  /**
   * Preload multiple images in parallel
   */
  async preloadImages(urls: string[]): Promise<PreloadResult[]> {
    const promises = urls.map(url => this.preloadImage(url));
    return Promise.all(promises);
  }

  /**
   * Preload all step-related images
   */
  async preloadStepImages(): Promise<PreloadResult[]> {
    const allImageUrls = [
      // Background images
      ASSETS.images.backgrounds.main,
      ASSETS.images.backgrounds.bg1,
      ASSETS.images.backgrounds.bg2,
      
      // Skin type images
      ASSETS.images.skinTypes.normal,
      ASSETS.images.skinTypes.dry,
      ASSETS.images.skinTypes.oily,
      ASSETS.images.skinTypes.combination,
      ASSETS.images.skinTypes.dontKnow,
      
      // Icon images
      ASSETS.images.icons.results,
      ASSETS.images.icons.routine,
      ASSETS.images.icons.glasses,
      ASSETS.images.icons.hair,
      ASSETS.images.icons.position,
      ASSETS.images.icons.expression,
      ASSETS.images.icons.wrinkles,
    ];

    console.log('🖼️ Preloading step images...', allImageUrls.length, 'images');
    console.log('📁 Image URLs:', allImageUrls);
    
    const results = await this.preloadImages(allImageUrls);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Image preloading complete: ${successful}/${allImageUrls.length} successful`);
    
    if (failed.length > 0) {
      console.warn('⚠️ Failed to preload images:', failed);
    }
    
    return results;
  }

  /**
   * Check if an image is already loaded
   */
  isImageLoaded(url: string): boolean {
    return this.loadedImages.has(url);
  }

  /**
   * Get loading progress
   */
  getLoadingProgress(): { loaded: number; total: number; percentage: number } {
    const total = this.loadingPromises.size + this.loadedImages.size;
    const loaded = this.loadedImages.size;
    const percentage = total > 0 ? Math.round((loaded / total) * 100) : 100;
    
    return { loaded, total, percentage };
  }
}

// Export singleton instance
export const imagePreloader = new ImagePreloader();

// Export utility functions
export const preloadStepImages = () => imagePreloader.preloadStepImages();
export const isImageLoaded = (url: string) => imagePreloader.isImageLoaded(url);
export const getLoadingProgress = () => imagePreloader.getLoadingProgress();
