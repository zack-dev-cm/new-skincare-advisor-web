/**
 * Best Frame Selector
 * 
 * Continuously analyzes video frames for blur and selects the frame with the lowest blur score.
 * Based on the approach used in liqa.haut.ai reference implementation.
 */

export interface QualityMetrics {
  blurScore: number
  timestamp: number
}

export interface BestFrame {
  image: ImageBitmap
  quality: QualityMetrics
}

/**
 * Calculates blur score using Laplacian variance method
 * Lower blur score = sharper image (better quality)
 */
function calculateBlurScore(imageData: ImageData): number {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  
  if (width === 0 || height === 0) return Infinity
  
  // Convert to grayscale and calculate Laplacian variance
  // This is a simplified version - for production, consider using WebAssembly like liqa does
  let sum = 0
  let sumSquared = 0
  let count = 0
  
  // Sample every 4th pixel for performance (can be adjusted)
  const step = 4
  
  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const idx = (y * width + x) * 4
      
      // Get grayscale values of surrounding pixels
      const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      const rightIdx = (y * width + x + 1) * 4
      const right = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3
      const bottomIdx = ((y + 1) * width + x) * 4
      const bottom = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / 3
      
      // Calculate Laplacian (second derivative approximation)
      const laplacian = Math.abs(2 * center - right - bottom)
      
      sum += laplacian
      sumSquared += laplacian * laplacian
      count++
    }
  }
  
  if (count === 0) return Infinity
  
  const mean = sum / count
  const variance = (sumSquared / count) - (mean * mean)
  
  // Return negative variance as blur score (lower = sharper)
  // We invert it so lower values mean better quality
  return Math.max(0, 1000 - variance)
}

/**
 * Best Frame Selector class
 * Tracks frames and selects the one with the best (lowest) blur score
 */
export class BestFrameSelector {
  private bestFrame: BestFrame | null = null
  private isEnabled: boolean = true
  
  constructor(enabled: boolean = true) {
    this.isEnabled = enabled
  }
  
  /**
   * Process a frame and update best frame if this one is better
   */
  async send(frame: HTMLVideoElement | HTMLImageElement | ImageBitmap | HTMLCanvasElement): Promise<void> {
    if (!this.isEnabled) return
    
    try {
      // Convert frame to ImageBitmap if needed
      let bitmap: ImageBitmap
      if (frame instanceof ImageBitmap) {
        bitmap = frame
      } else if (frame instanceof HTMLVideoElement || frame instanceof HTMLImageElement || frame instanceof HTMLCanvasElement) {
        bitmap = await createImageBitmap(frame)
      } else {
        return
      }
      
      // Get image data for blur calculation
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        if (bitmap !== frame) bitmap.close()
        return
      }
      
      ctx.drawImage(bitmap, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // Calculate blur score
      const blurScore = calculateBlurScore(imageData)
      
      const quality: QualityMetrics = {
        blurScore,
        timestamp: Date.now()
      }
      
      // Update best frame if this one is better (lower blur score = sharper)
      if (
        !this.bestFrame ||
        quality.blurScore < this.bestFrame.quality.blurScore ||
        (this.bestFrame.image.width === 0) // Check for detached ImageBitmap
      ) {
        // Close previous best frame
        if (this.bestFrame?.image && this.bestFrame.image.width > 0) {
          this.bestFrame.image.close()
        }
        
        // Create a copy of the bitmap for storage
        const bestBitmap = frame instanceof ImageBitmap && bitmap === frame
          ? await createImageBitmap(frame)
          : bitmap
        
        this.bestFrame = {
          image: bestBitmap,
          quality
        }
      } else {
        // Not the best frame, close it
        if (bitmap !== frame) bitmap.close()
      }
    } catch (error) {
      console.error('Error processing frame for best frame selection:', error)
    }
  }
  
  /**
   * Get the best frame found so far
   */
  getBestFrame(): BestFrame | null {
    if (!this.bestFrame || this.bestFrame.image.width === 0) {
      return null
    }
    return this.bestFrame
  }
  
  /**
   * Reset the selector (clears best frame)
   */
  reset(): void {
    if (this.bestFrame?.image && this.bestFrame.image.width > 0) {
      this.bestFrame.image.close()
    }
    this.bestFrame = null
  }
  
  /**
   * Enable or disable the selector
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    if (!enabled) {
      this.reset()
    }
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    this.reset()
  }
}

