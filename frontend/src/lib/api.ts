import axios from 'axios';
import { getShopifyDomain } from './shopify';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://new-skincare-advisor-api-fqc8dffvg5ghene2.westeurope-01.azurewebsites.net/api';
const API_TIMEOUT_MS = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || '120000', 10);

// Axios instance pre-configured for our API
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS, // Configurable client timeout (default 120s)
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    // Handle specific error cases
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 429:
          throw new Error('Rate limit exceeded. Please try again later.');
        case 413:
          throw new Error('Image file too large. Please use a smaller image.');
        case 400:
          throw new Error(data?.message || 'Invalid request. Please check your image.');
        case 500:
          throw new Error('Server error. Please try again later.');
        default:
          throw new Error(data?.message || 'An unexpected error occurred.');
      }
    } else if (error.request) {
      throw new Error('Network error. Please check your connection.');
    } else {
      throw new Error('An unexpected error occurred.');
    }
  }
);

export interface UploadUrlResponse {
  uploadUrl: string;
  inferenceId: string;
  expiresAt: string;
}

export interface AnalysisResponse {
  // Roboflow inference data
  predictions: Array<any>;
  image: {
    width: number;
    height: number;
  };
  
  // Acne analysis
  acne: {
    counts: Record<string, number>;
    severity: 'None' | 'Mild' | 'Moderate' | 'Severe';
    classification: string;
  };
  
  // Redness analysis
  redness?: {
    num_polygons: number;
    polygons: Array<Array<[number, number]>>;
    analysis_width: number;
    analysis_height: number;
    erythema: boolean;
    redness_perc: number;
    scaling_factors?: { x: number; y: number };
    original_resolution?: { width: number; height: number };
  };
  
  wrinkles?: {
    predictions: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number;
      class: string;
      detection_id?: string;
      points?: Array<{ x: number; y: number }>;
    }>;
    image: { width: number; height: number };
    scaling_factors?: { x: number; y: number };
    original_resolution?: { width: number; height: number };
    counts?: Record<string, number>;
    severity?: string;
    has_forehead_wrinkles?: boolean;
    has_expression_lines?: boolean;
    has_under_eye_concerns?: boolean;
  };
  
  // Product recommendations
  recommendations?: {
    user: {
      first_name: string;
      last_name: string;
      age: string;
      gender: string;
    };
    skincare_routine: Array<{
      category: string;
      modules: Array<{
        module: string;
        main_product: any;
        alternative_products: Array<any>;
      }>;
    }>;
  };
  
  // Metadata
  recommendations_meta?: {
    success: boolean;
    duration: number;
    error?: string;
  };
  
  // Pores analysis from Cloud Run
  poresData?: {
    job_id: string;
    pore_total: number;
    pore_severity_1_5: number | null;
    pore_size_severity_1_5: number | null;
    score_label: string | null;
    score_0_100: number | null;
    visible_count: number | null;
    visible_fraction: number | null;
    large_pores_present: boolean | null;
    pores_visibility: string | null;
    regions: Record<string, {
      bbox_full: { x0: number; y0: number; x1: number; y1: number } | null;
      pore_count: number;
      visible_count: number;
      visible_fraction: number | null;
      quality_visibility: string | null;
    }>;
    preprocess: {
      crop_bbox: { x0: number; y0: number; x1: number; y1: number } | null;
      resized_scale: number | null;
      resized_from: { width: number; height: number } | null;
    };
    overlay_preview_url: string | null;
    overlay_url: string | null;
    overlay_circles_preview_url: string | null;
  };

  // Legacy compatibility
  concerns?: Array<{
    name: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  overallHealth?: number;
  imageUrl?: string;
}

export interface ImageMetadata {
  source: 'camera' | 'file';
  facingMode?: 'user' | 'environment';
  fileName?: string;
  fileSize?: number;
  timestamp: number;
}

export interface UserData {
  first_name?: string;
  last_name?: string;
  birthdate?: string;
  ageRange?: string;
  gender?: string;
  skin_type?: string;
  concerns?: string[];
  sensitivity?: 'high' | 'medium' | 'low';
  budget_level?: 'Low' | 'Medium' | 'High';
  shop_domain?: string;
}

export interface HealthCheckResponse {
  status: string;
  version: string;
  checks: {
    storage: { status: string; latency: number };
    redis: { status: string; latency: number };
    roboflow: { status: string };
    memory: { status: string; percentage: number };
  };
}

/**
 * Get upload URL for image
 */
export async function getUploadUrl(mimeType: string = 'image/jpeg'): Promise<UploadUrlResponse> {
  // OWASP: Validate MIME type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(mimeType)) {
    throw new Error('Invalid image type. Only JPEG, PNG, and WebP are allowed.');
  }

  const response = await api.post('/upload-url', { mimeType });
  return response.data;
}

/**
 * Upload image file to blob storage
 */
export async function uploadImageFile(file: File): Promise<string> {
  // Log the original file size
  console.log('Uploading file - original size:', file.size, 'bytes');
  console.log('File type:', file.type);
  
  // Extract image dimensions from file
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await new Promise((resolve) => {
    img.onload = () => {
      console.log('API Upload - Image dimensions from file:', img.naturalWidth, 'x', img.naturalHeight);
      URL.revokeObjectURL(img.src);
      resolve(null);
    };
  });
  
  // OWASP: Validate file
  const maxSize = 10 * 1024 * 1024; // 10MB
  const minSize = 1024; // 1KB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
  }
  
  if (file.size > maxSize) {
    throw new Error('File is too large. Maximum size is 10MB.');
  }
  
  if (file.size < minSize) {
    throw new Error('File is too small. Minimum size is 1KB.');
  }

  try {
    // Get upload URL with correct MIME type
    const { uploadUrl, inferenceId } = await getUploadUrl(file.type);
    
    if (!inferenceId) {
      throw new Error('Upload URL response missing inferenceId');
    }
    
    // Upload file to Azure Blob Storage
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
        'x-ms-blob-type': 'BlockBlob',
      },
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status ${uploadResponse.status}`);
    }
    
    // Return inferenceId instead of URL
    return inferenceId;
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
}

/**
 * Resize image only if file size exceeds the threshold.
 *
 * Files ≤ 2MB are uploaded at their original resolution — this preserves
 * full quality for the acne/laxity/wrinkles APIs and for file uploads where
 * the user already has a compact image.
 *
 * Files > 2MB (typically camera captures) are resized to max 1800px per side.
 * 1800px is large enough for pore detection (Cloud Run's internal preprocessing
 * handles final downsampling) and keeps the upload under ~3MB.
 */
async function resizeImageIfNeeded(imageDataUrl: string): Promise<string> {
  const MAX_SIZE_MB = 2;
  // For files that do need resizing, cap at 1800px to give pore detection
  // enough resolution while keeping uploads manageable.
  const MAX_SIDE_PX = 1800;

  return new Promise((resolve, reject) => {
    fetch(imageDataUrl)
      .then(res => res.blob())
      .then(blob => {
        const sizeMB = blob.size / (1024 * 1024);
        console.log(`Image file size: ${sizeMB.toFixed(2)}MB`);

        // Files under the threshold: upload as-is, no quality loss.
        if (blob.size <= MAX_SIZE_MB * 1024 * 1024) {
          console.log(`File size ≤ ${MAX_SIZE_MB}MB, uploading at original resolution`);
          resolve(imageDataUrl);
          return;
        }

        console.log(`File size > ${MAX_SIZE_MB}MB, resizing to max ${MAX_SIDE_PX}px side @ 90% quality...`);

        const img = new Image();
        img.src = imageDataUrl;

        img.onload = () => {
          try {
            const originalWidth = img.naturalWidth;
            const originalHeight = img.naturalHeight;

            const ratio = Math.min(MAX_SIDE_PX / originalWidth, MAX_SIDE_PX / originalHeight, 1);
            const newWidth = Math.round(originalWidth * ratio);
            const newHeight = Math.round(originalHeight * ratio);

            console.log(`Resizing image: ${originalWidth}×${originalHeight} → ${newWidth}×${newHeight}`);

            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            // 90% quality retains enough detail for all skin analysis models.
            const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            console.log('Image resized successfully');
            resolve(resizedDataUrl);
          } catch (error) {
            console.error('Error resizing image:', error);
            reject(error);
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image for resizing'));
        };
      })
      .catch(error => {
        console.error('Error checking file size:', error);
        reject(error);
      });
  });
}

/**
 * Upload base64 image to blob storage
 */
export async function uploadBase64Image(imageDataUrl: string): Promise<string> {
  try {
    // Resize image if file size > 2MB (match JavaScript logic EXACTLY)
    const resizedDataUrl = await resizeImageIfNeeded(imageDataUrl);
    
    // Log the data URL size
    console.log('Uploading base64 image - data URL length:', resizedDataUrl.length);
    console.log('Estimated size in KB:', Math.round(resizedDataUrl.length * 0.75 / 1024));
    
    // Convert data URL to blob
    const response = await fetch(resizedDataUrl);
    const blob = await response.blob();
    
    // Log the blob size
    console.log('Blob size:', blob.size, 'bytes');
    console.log('Blob type:', blob.type);
    
    // Validate blob size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (blob.size > maxSize) {
      throw new Error('Image is too large. Maximum size is 10MB.');
    }
    
    // Get upload URL
    const { uploadUrl, inferenceId } = await getUploadUrl(blob.type);
    
    if (!inferenceId) {
      throw new Error('Upload URL response missing inferenceId');
    }
    
    // Upload to Azure Blob Storage
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': blob.type,
        'x-ms-blob-type': 'BlockBlob',
      },
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status ${uploadResponse.status}`);
    }
    
    // Return inferenceId instead of URL
    return inferenceId;
  } catch (error) {
    console.error('Base64 upload failed:', error);
    throw error;
  }
}

/**
 * Analyze skin image with user data and recommendations
 */
export async function analyzeSkinWithRecommendations(
  imageSource: string | File,
  userData?: UserData,
  metadata?: ImageMetadata,
  language_code?: string
): Promise<AnalysisResponse> {
  try {
    let inferenceId: string;
    let mimeType: string;
    
    // Upload image based on source type
    if (typeof imageSource === 'string') {
      // Base64 data URL from camera - extract mimeType from data URL
      const mimeMatch = imageSource.match(/data:([^;]+)/);
      mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      inferenceId = await uploadBase64Image(imageSource);
    } else {
      // File from upload
      mimeType = imageSource.type || 'image/jpeg';
      inferenceId = await uploadImageFile(imageSource);
    }
    
    // Validate inferenceId was received
    if (!inferenceId) {
      throw new Error('Failed to get inferenceId from upload');
    }
    
    // Prepare inference request
    const resolvedShopDomain = userData?.shop_domain || getShopifyDomain();
    const requestBody: Record<string, unknown> = {
      inferenceId,
      userData: {
        ...(userData || {}),
        ...(resolvedShopDomain ? { shop_domain: resolvedShopDomain } : {})
      },
      includeRecommendations: true,
      metadata: {
        ...metadata,
        mimeType,
        apiVersion: '1.0',
        clientTimestamp: Date.now()
      }
    };

    if (language_code) {
      requestBody.language_code = language_code;
    }
    
    console.log('Calling /infer with inferenceId:', inferenceId);
    
    // Call inference API
    const response = await api.post('/infer', requestBody);
    
    // Log the returned image dimensions from analysis
    if (response.data && response.data.image) {
      console.log('API Analysis - Returned image dimensions:', response.data.image.width, 'x', response.data.image.height);
    }
    
    return response.data;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function analyzeSkin(imageDataUrl: string): Promise<AnalysisResponse> {
  return analyzeSkinWithRecommendations(imageDataUrl);
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<HealthCheckResponse> {
  const response = await api.get('/health');
  return response.data;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries - 1) {
        throw lastError;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export default api; 