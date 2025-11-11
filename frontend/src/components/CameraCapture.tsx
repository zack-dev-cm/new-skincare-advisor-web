'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, X, Upload, SwitchCameraIcon, User, Move, CheckCircle, Target, MoveHorizontal, Sun, Check, ArrowLeft } from 'lucide-react';
import ImageUpload from './ImageUpload';
import { ensureTfBackendReady } from '@/lib/tfBackend';
// Dynamic face-api holder (assigned after init)
let faceapi: any = null;

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
  embedded?: boolean;
}

interface FacePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Device detection function
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         window.innerWidth <= 768;
};

const CameraCapture = ({ onCapture, onClose, embedded = false }: CameraCaptureProps) => {
  const [cameraState, setCameraState] = useState<'live' | 'preview'>('live');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [currentCamera, setCurrentCamera] = useState<'front' | 'back'>('front');
  const [luminosity, setLuminosity] = useState<number>(0);
  const [videoHeight, setVideoHeight] = useState<number>(0);

  const [facePosition, setFacePosition] = useState<FacePosition | null>(null);
  const [detectionInterval, setDetectionInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoCaptureTimer, setAutoCaptureTimer] = useState<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceAngle, setFaceAngle] = useState<{x: number, y: number, z: number} | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceApiAvailable, setFaceApiAvailable] = useState(false);
  const [faceCenter, setFaceCenter] = useState<{x: number, y: number} | null>(null);
  const [detectedFaces, setDetectedFaces] = useState<any[]>([]);
  const detectedFacesRef = useRef<any[]>([]);
  const [guidanceMessage, setGuidanceMessage] = useState<string>('Posiziona il tuo viso al centro');
  const [guidanceType, setGuidanceType] = useState<'default' | 'position' | 'distance' | 'angle' | 'lighting'>('default');

  // Helper function to set appropriate error message
  const setCameraError = (message: string) => {
    setError(message);
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const initializationInProgressRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Load face-api.js models
    const loadModels = async () => {
      try {
        console.log('Loading face-api.js models...');
        
        // Ensure TFJS backend, then load face-api.js dynamically
        try {
          await ensureTfBackendReady();
          const module = await import('@vladmandic/face-api');
          faceapi = module;
          setFaceApiAvailable(true);
          
          // Load models from the correct CDN URL
          const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
          
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
          ]);
          
          setModelsLoaded(true);
          console.log('face-api.js models loaded successfully');
        } catch (faceApiError) {
          console.warn('face-api.js not available, continuing without face detection:', faceApiError);
          setModelsLoaded(true); // Mark as loaded so we can continue without face detection
        }
      } catch (error) {
        console.error('Error in loadModels:', error);
        setModelsLoaded(true); // Mark as loaded so we can continue
      }
    };

    // Only load models if we're not in SSR
    if (typeof window !== 'undefined') {
      loadModels();
    }

    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, []);

  // Restart face detection when models are loaded
  useEffect(() => {
    if (modelsLoaded && isCameraActive && !detectionInterval) {
      console.log('Models loaded, restarting face detection...');
      startFaceDetection();
    }
  }, [modelsLoaded, isCameraActive]);

  useEffect(() => {
    if (cameraState === 'live') {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          startCamera();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [cameraState]);

  // Replace the complex startCamera function with this simplified version
  const startCamera = async (desiredFacing?: 'front' | 'back') => {
    if (initializationInProgressRef.current || !isMountedRef.current) {
      return;
    }
    
    initializationInProgressRef.current = true;
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Starting camera...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }
      
      // Stop existing stream
      if (stream) {
        console.log('Stopping existing stream...');
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      // Camera constraints - use native resolution without artificial limits
      const constraints = {
        video: {
          facingMode: { ideal: (desiredFacing || currentCamera) === 'front' ? 'user' : 'environment' },
          // Remove resolution constraints to use native camera resolution
          // This allows the camera to use its maximum supported resolution
        },
        audio: false
      };
      
      console.log('Requesting camera access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!isMountedRef.current) {
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      setStream(mediaStream);
      
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Clear any existing srcObject first
        video.srcObject = null;
        
        // Set the new stream
        video.srcObject = mediaStream;
        
        // Wait for the video to be ready
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video load timeout'));
          }, 10000); // 10 second timeout
          
          const onLoadedMetadata = () => {
            clearTimeout(timeout);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            console.log('Video metadata loaded successfully');
            resolve();
          };
          
          const onError = (e: Event) => {
            clearTimeout(timeout);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            console.error('Video error:', e);
            reject(e);
          };
          
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
        });
        
        // Start video playback
        try {
          await video.play();
          console.log('Video playing successfully');
          setIsCameraActive(true);
          setIsLoading(false);
          
          // Start face detection after a delay (optional)
          setTimeout(() => {
            if (modelsLoaded && isMountedRef.current) {
              startFaceDetection();
            }
          }, 1000);
          
        } catch (playError) {
          console.error('Video play failed:', playError);
          throw new Error('Could not start video playback');
        }
      }
      
    } catch (err) {
      console.error('Camera error:', err);
      
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Don't show error for abort
      }
      
      // Try fallback with minimal constraints
      try {
        console.log('Trying fallback with minimal constraints...');
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            facingMode: { ideal: (desiredFacing || currentCamera) === 'front' ? 'user' : 'environment' }
          }, 
          audio: false 
        });
        
        if (!isMountedRef.current) {
          fallbackStream.getTracks().forEach(track => track.stop());
          return;
        }
        
        setStream(fallbackStream);
        
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = null;
          video.srcObject = fallbackStream;
          
          // Wait for video to be ready
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Fallback timeout')), 5000);
            
            const onLoadedMetadata = () => {
              clearTimeout(timeout);
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              resolve();
            };
            
            const onError = (e: Event) => {
              clearTimeout(timeout);
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              reject(e);
            };
            
            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('error', onError);
          });
          
          await video.play();
          setIsCameraActive(true);
          setIsLoading(false);
          console.log('Camera started with fallback constraints');
        }
        
      } catch (fallbackErr) {
        console.error('Fallback camera error:', fallbackErr);
        setError('Could not access camera. Please check permissions and try again.');
        setIsLoading(false);
      }
    } finally {
      initializationInProgressRef.current = false;
    }
  };

  const startFaceDetection = () => {
    if (!videoRef.current) {
      console.log('Cannot start face detection - no video element');
      return;
    }
    
    console.log('Starting face detection (face-api.js:', !!modelsLoaded, ')');
    
    // Wait for models to be loaded before starting detection
    if (!modelsLoaded) {
      console.log('Waiting for models to load before starting face detection...');
      return;
    }
    
    // Add a small delay to ensure video is fully loaded
    setTimeout(() => {
      if (!videoRef.current || !isMountedRef.current) return;
      
      const interval = setInterval(async () => {
        if (!videoRef.current || !isMountedRef.current) {
          clearInterval(interval);
          return;
        }
        
        await detectFacePosition();
        getLuminosityStatus();
        drawFaceOverlay();
      }, 200); // Faster detection for better responsiveness
      
      setDetectionInterval(interval);
    }, 1000); // Increased delay to ensure video is ready
  };

  const drawFaceOverlay = () => {
    // Face boundary detection rectangle removed
    // This function is kept for potential future use but no longer draws rectangles
  };

  const detectFacePosition = async () => {
    if (!videoRef.current) {
      console.log('Face detection skipped - no video element');
      return;
    }
    
    try {
      const video = videoRef.current;
      
      // Only process if video is ready
      if (video.readyState < 2) {
        console.log('Video not ready, skipping face detection');
        return;
      }
      
      // If models are loaded and face-api.js is available, use it
      if (modelsLoaded && faceApiAvailable && faceapi) {
        try {
                               const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.5
          }));
          
          console.log('Face detection results:', detections.length, 'faces detected');
          if (detections.length > 0) {
            console.log('First face detection:', detections[0]);
          }
          
          detectedFacesRef.current = detections;
          setDetectedFaces(detections);
          setFaceDetected(detections.length > 0);
          
          // Update guidance based on detection results
          updateGuidance(detections, facePosition, 0.5); // Default luminosity for now
          
          if (detections.length > 0) {
            const detection = detections[0];
            const { box } = detection;
            
            console.log('Face detected:', box);
            
            const facePos = {
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height
            };
            
            setFacePosition(facePos);
            setFaceAngle({ x: 0, y: 0, z: 0 }); // face-api.js doesn't provide angle
            
            // Check if face is in good position (auto-capture disabled)
            if (isFaceInPosition(facePos)) {
              console.log('Face in good position');
              // Auto-capture disabled - user must manually take photo
            } else {
              if (autoCaptureTimer) {
                clearTimeout(autoCaptureTimer);
                setAutoCaptureTimer(null);
                setCountdown(0);
              }
            }
                        } else {
                console.log('No face detected');
                setFaceDetected(false);
                setFacePosition(null);
                setFaceAngle(null);
                
                // Update guidance for no face detected
                updateGuidance([], null, 0.5);
            
            if (autoCaptureTimer) {
              clearTimeout(autoCaptureTimer);
              setAutoCaptureTimer(null);
              setCountdown(0);
            }
          }
                 } catch (faceApiError) {
           console.error('face-api.js face detection error:', faceApiError);
         }
       } else {
         console.log('face-api.js models not loaded yet');
       }
      
     } catch (error) {
       console.error('Face detection error:', error);
     }
   };

  const isFaceInPosition = (face: FacePosition): boolean => {
    if (!videoRef.current) return false;
    
          const video = videoRef.current;
    const centerX = video.videoWidth / 2;
    const centerY = video.videoHeight / 2;
    const tolerance = 50;
    
    return Math.abs(face.x + face.width / 2 - centerX) < tolerance &&
           Math.abs(face.y + face.height / 2 - centerY) < tolerance;
  };

  const getLuminosityStatus = () => {
    // Luminosity detection disabled for now
    console.log('Luminosity detection disabled');
  };

  const updateGuidance = (detections: any[], facePosition: any, luminosity: number) => {
    // If face detection is not available, show default guidance
    if (!faceApiAvailable) {
      setGuidanceMessage('Posiziona il tuo viso al centro');
      setGuidanceType('position');
      return;
    }
    
    if (detections.length === 0) {
      setGuidanceMessage('Posiziona il viso all\'interno del riquadro');
      setGuidanceType('position');
      return;
    }

    const detection = detections[0];
    const { box } = detection;
    
    // Check if face is too far (too small)
    const faceArea = box.width * box.height;
    const videoArea = videoRef.current ? videoRef.current.videoWidth * videoRef.current.videoHeight : 0;
    const faceRatio = videoArea > 0 ? faceArea / videoArea : 0;
    
    if (faceRatio < 0.1) { // Face is too small (too far)
      setGuidanceMessage('Avvicina la fotocamera');
      setGuidanceType('distance');
      return;
    }
    
    // Check if face is too close (too large)
    if (faceRatio > 0.6) {
      setGuidanceMessage('Allontana la fotocamera');
      setGuidanceType('distance');
      return;
    }
    
    // Check if face is centered
    const videoWidth = videoRef.current?.videoWidth || 640;
    const videoHeight = videoRef.current?.videoHeight || 480;
    const centerX = videoWidth / 2;
    const centerY = videoHeight / 2;
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;
    
    const xOffset = Math.abs(faceCenterX - centerX) / centerX;
    const yOffset = Math.abs(faceCenterY - centerY) / centerY;
    
    if (xOffset > 0.3 || yOffset > 0.3) {
      setGuidanceMessage('Centra il tuo viso nel riquadro');
      setGuidanceType('position');
      return;
    }
    
    // Check lighting (if we had luminosity detection)
    if (luminosity < 0.3) {
      setGuidanceMessage('Rivolgiti verso la fonte di luce');
      setGuidanceType('lighting');
      return;
    }
    
    // All good!
    setGuidanceMessage('Perfetto! Resta fermo');
    setGuidanceType('default');
  };

  const getGuidanceMessage = (): string => {
    if (countdown > 0) {
      return `Resta fermo... ${countdown}`;
    } else if (!faceDetected) {
      return 'Per favore posiziona il viso nel riquadro';
    } else if (facePosition && !isFaceInPosition(facePosition)) {
      return 'Centra il tuo viso nel riquadro';
    } else if (faceDetected && facePosition && isFaceInPosition(facePosition)) {
      return 'Perfetto! Resta fermo...';
    } else {
      return 'Posiziona il tuo viso al centro';
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (detectionInterval) {
      clearInterval(detectionInterval);
      setDetectionInterval(null);
    }
    
    if (autoCaptureTimer) {
      clearTimeout(autoCaptureTimer);
      setAutoCaptureTimer(null);
    setCountdown(0);
    }
    
    setIsCameraActive(false);
    setFacePosition(null);
    initializationInProgressRef.current = false;
  };

  const switchCamera = () => {
    const newCamera = currentCamera === 'front' ? 'back' : 'front';
    setCurrentCamera(newCamera);
    
    if (isCameraActive) {
      stopCamera();
      setTimeout(() => {
        if (isMountedRef.current) {
          startCamera(newCamera);
        }
      }, 100);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;
    
    // Use original video dimensions for maximum quality
    const originalWidth = video.videoWidth;
    const originalHeight = video.videoHeight;
    
    // Validate video dimensions
    if (originalWidth === 0 || originalHeight === 0) {
      console.error('Invalid video dimensions:', originalWidth, 'x', originalHeight);
      return;
    }
    
    // Log video element dimensions and styling
    console.log('=== CAPTURE DEBUG ===');
    console.log('1. Video natural dimensions:', video.videoWidth, 'x', video.videoHeight);
    console.log('2. Video display dimensions:', video.offsetWidth, 'x', video.offsetHeight);
    console.log('3. Video client dimensions:', video.clientWidth, 'x', video.clientHeight);
    console.log('4. Video aspect ratio:', (originalWidth / originalHeight).toFixed(3));
    console.log('5. Video display aspect ratio:', (video.offsetWidth / video.offsetHeight).toFixed(3));
    console.log('6. Video transform:', video.style.transform);
    console.log('7. Video scale:', currentCamera === 'front' ? 'scaleX(-1)' : 'none');
    
    // Calculate the actual displayed area of the video
    // Since the video uses object-contain, we need to calculate the actual rendered area
    const videoAspectRatio = originalWidth / originalHeight;
    const displayAspectRatio = video.offsetWidth / video.offsetHeight;
    
    let sourceX = 0, sourceY = 0, sourceWidth = originalWidth, sourceHeight = originalHeight;
    let destX = 0, destY = 0, destWidth = originalWidth, destHeight = originalHeight;
    
    if (videoAspectRatio > displayAspectRatio) {
      // Video is wider than display area - video is letterboxed vertically
      // The video fills the width and is centered vertically
      const scale = video.offsetWidth / originalWidth;
      const scaledHeight = originalHeight * scale;
      const letterboxHeight = (video.offsetHeight - scaledHeight) / 2;
      
      // Calculate the actual video area in the display
      const actualDisplayHeight = scaledHeight;
      const actualDisplayWidth = video.offsetWidth;
      
      // Map this back to the original video coordinates
      sourceY = (letterboxHeight / scale);
      sourceHeight = actualDisplayHeight / scale;
      sourceX = 0;
      sourceWidth = originalWidth;
      
      console.log('8. Video is letterboxed vertically');
      console.log('9. Scale factor:', scale);
      console.log('10. Letterbox height:', letterboxHeight);
      console.log('11. Source area:', sourceX, sourceY, sourceWidth, sourceHeight);
    } else {
      // Video is taller than display area - video is letterboxed horizontally
      // The video fills the height and is centered horizontally
      const scale = video.offsetHeight / originalHeight;
      const scaledWidth = originalWidth * scale;
      const letterboxWidth = (video.offsetWidth - scaledWidth) / 2;
      
      // Calculate the actual video area in the display
      const actualDisplayWidth = scaledWidth;
      const actualDisplayHeight = video.offsetHeight;
      
      // Map this back to the original video coordinates
      sourceX = (letterboxWidth / scale);
      sourceWidth = actualDisplayWidth / scale;
      sourceY = 0;
      sourceHeight = originalHeight;
      
      console.log('8. Video is letterboxed horizontally');
      console.log('9. Scale factor:', scale);
      console.log('10. Letterbox width:', letterboxWidth);
      console.log('11. Source area:', sourceX, sourceY, sourceWidth, sourceHeight);
    }
    
    // Set canvas to original dimensions for maximum quality
    canvas.width = originalWidth;
    canvas.height = originalHeight;
    
    // Clear canvas with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, originalWidth, originalHeight);
    
    // Handle mirroring for front-facing camera
    // Front-facing cameras are mirrored by default, so we need to flip the image
    // to match what the user sees on their iPhone
    if (currentCamera === 'front') {
      // Flip horizontally for front camera to match iPhone behavior
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(
        video, 
        sourceX, sourceY, sourceWidth, sourceHeight,
        -originalWidth, 0, originalWidth, originalHeight
      );
      ctx.restore();
      console.log('12. Applied horizontal flip for front camera');
    } else {
      // Back camera doesn't need flipping
      ctx.drawImage(
        video, 
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, originalWidth, originalHeight
      );
      console.log('12. No flip applied for back camera');
    }
    
    console.log('13. Canvas dimensions set to:', canvas.width, 'x', canvas.height);
    
    // Use maximum quality JPEG compression
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    
    // Log the captured image data size
    console.log('14. Captured image data URL length:', imageData.length);
    console.log('15. Estimated image size in KB:', Math.round(imageData.length * 0.75 / 1024));
    console.log('=== END CAPTURE DEBUG ===');
    
    setCapturedImage(imageData);
    setCameraState('preview');
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCameraState('live');
    setFacePosition(null);
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Log the original file size
    console.log('Original file size:', file.size, 'bytes');
    console.log('Original file type:', file.type);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        // Log the data URL size
        console.log('File data URL length:', result.length);
        console.log('Estimated file size in KB:', Math.round(result.length * 0.75 / 1024));
        
        setCapturedImage(result);
        setCameraState('preview');
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const calculateVideoHeight = () => {
    if (!modalRef.current || !headerRef.current || !controlsRef.current) return;
    
    const modalHeight = modalRef.current.offsetHeight;
    const headerHeight = headerRef.current.offsetHeight;
    const controlsHeight = controlsRef.current.offsetHeight;
    
    const availableHeight = modalHeight - headerHeight - controlsHeight;
    const calculatedHeight = Math.floor(availableHeight * 0.95);
    
    setVideoHeight(calculatedHeight);
  };

  const handleTakePhotoClick = () => {
    // Always try to start camera first, regardless of device
    startCamera();
  };

  // Auto-fallback to upload if camera fails
  useEffect(() => {
    if (error && error.includes('Permissions policy violation')) {
      // Automatically show upload option after a short delay
      setTimeout(() => {
        setError(null);
        triggerFileUpload();
      }, 2000);
    }
  }, [error]);



  useEffect(() => {
    // Calculate video height on mount
    calculateVideoHeight();
    
    // Add resize listener
    const handleResize = () => {
      calculateVideoHeight();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      stopCamera();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Recalculate video height when camera state changes
  useEffect(() => {
    // Small delay to ensure DOM is updated
    setTimeout(calculateVideoHeight, 100);
  }, [cameraState]);

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`${embedded ? 'absolute' : 'fixed'} inset-0 z-50 flex items-center justify-center bg-transparent bg-opacity-75 py-4`}
      >
        <div className="bg-white rounded-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-blue-500 mb-4">
              <Upload size={48} className="mx-auto" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Fotocamera Non Disponibile</h3>
            <p className="text-gray-600 mb-6">
              Nessun problema! Puoi caricare una foto invece per continuare con la tua analisi della pelle.
            </p>
          </div>
          
          <ImageUpload onImageSelect={(imageData: string) => {
            setError(null);
            onCapture(imageData);
          }} />
          
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={() => {
                setError(null);
                startCamera();
              }}
              className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Riprova Fotocamera
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${embedded ? 'absolute' : 'fixed'} inset-0 z-50 flex items-center justify-center bg-transparent bg-opacity-75 py-4`}
    >
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes slideIn { 
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes fadeInOut {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        
        .help {
          position: relative;
          z-index: 20;
        }
        
        .guidance {
          background: rgba(0, 0, 0, 0.9);
          border-radius: 1rem;
          padding: 0.75rem 1rem;
          backdrop-filter: blur(10px);
          animation: slideIn 0.3s ease-out;
          min-width: 200px;
          text-align: center;
        }
        
        .casing {
          position: relative;
          overflow: hidden;
          height: 1.25rem;
        }
        
        .placeholder, .reel {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          text-align: center;
        }
        
        .reel {
          animation: fadeInOut 2s infinite;
        }
        
        .countdown {
          animation: pulse 1s infinite;
        }
        
        .face-box {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        
        /* Mobile-specific fixes */
        
        @media (max-width: 480px) {
          .modal-container {
            max-width: 100vw !important;
            width: 100vw !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
      
      <div 
        ref={modalRef}
        className={`modal-container bg-white w-full ${embedded ? 'h-full' : 'max-w-sm h-full max-h-[98vh]'} rounded-2xl flex flex-col overflow-hidden`}
        style={{ height: '100%' }}
      >
        {/* Header */}
        <div ref={headerRef} className="flex items-center justify-between px-2 sm:px-4 py-1 sm:py-2 border-b border-gray-200 flex-shrink-0">
            <div>
              <h3 className="text-sm sm:text-lg font-bold text-gray-900">
                Fotocamera Analisi Pelle
              </h3>
              <p className="text-xs text-gray-600">
                Scatta una foto per l'analisi
              </p>
            </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Chiudi fotocamera"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="relative bg-black flex-1 flex items-center justify-center min-h-0 overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Avvio fotocamera...</p>
              </div>
            </div>
          )}
          
          {cameraState === 'live' && (
            <div className="relative w-full h-full overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain ${currentCamera === 'front' ? 'scale-x-[-1]' : ''}`}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  transform: currentCamera === 'front' ? 'scaleX(-1)' : 'none',
                  backgroundColor: '#000' // Black background for letterboxing
                }}
                onLoadedMetadata={() => {
                  console.log('Video metadata loaded');
                  if (videoRef.current) {
                    console.log('Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
                    console.log('Video element dimensions:', videoRef.current.offsetWidth, 'x', videoRef.current.offsetHeight);
                    console.log('Video srcObject:', videoRef.current.srcObject);
                    console.log('Video readyState:', videoRef.current.readyState);
                    console.log('Video paused:', videoRef.current.paused);
                    console.log('Dimensions match:', videoRef.current.videoWidth === videoRef.current.offsetWidth && videoRef.current.videoHeight === videoRef.current.offsetHeight);
                  }
                }}
                onCanPlay={() => {
                  console.log('Video can play');
                }}
                onPlaying={() => {
                  console.log('Video is playing');
                }}
                onError={(e) => {
                  console.error('Video error:', e);
                }}
              />
              
              {/* Dynamic Guidance Text */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
                <div className={`px-6 py-3 rounded-lg text-sm text-center max-w-xs transition-all duration-300 ${
                  guidanceType === 'default' ? 'bg-green-500 bg-opacity-90 text-white' :
                  guidanceType === 'position' ? 'bg-blue-500 bg-opacity-90 text-white' :
                  guidanceType === 'distance' ? 'bg-yellow-500 bg-opacity-90 text-black' :
                  guidanceType === 'lighting' ? 'bg-orange-500 bg-opacity-90 text-white' :
                  'bg-black bg-opacity-75 text-white'
                }`}>
                  <div className="font-medium flex items-center justify-center gap-2">
                    {guidanceType === 'default' && <Check size={16} />}
                    {guidanceType === 'position' && <Target size={16} />}
                    {guidanceType === 'distance' && <MoveHorizontal size={16} />}
                    {guidanceType === 'lighting' && <Sun size={16} />}
                    {guidanceMessage}
                  </div>
                </div>
              </div>
            </div>
          )}

          {cameraState === 'preview' && (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedImage!}
                alt="Captured photo"
                className="max-w-full max-h-full object-contain"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto'
                }}
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                }}
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div ref={controlsRef} className="pt-4 px-2 pb-1 bg-gray-50 flex-shrink-0">

          {cameraState === 'live' && (isCameraActive || stream) && (
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              {/* Camera controls */}
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={switchCamera}
                  className="w-16 p-1.5 sm:p-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 flex items-center justify-center"
                  aria-label="Cambia fotocamera"
                >
                  <SwitchCameraIcon className="w-5 h-5" />
                </button>
                
              <button
                onClick={capturePhoto}
                disabled={!isCameraActive || isLoading}
                  className="w-20 h-12 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center rounded-full shadow-lg"
                  aria-label="Scatta foto"
              >
                  <Camera className="w-6 h-6" />
              </button>
                
                <button
                  onClick={triggerFileUpload}
                  className="w-16 p-1.5 sm:p-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 flex items-center justify-center "
                  aria-label="Carica foto"
                >
                  <Upload className="w-5 h-5" />
                </button>
              </div>
              
              {/* Tips */}
              <div className="text-center text-xs text-gray-600">
                <p className="flex items-center justify-center gap-1 mb-1">
                  <Move className="w-3 h-3" />
                  <span>Posiziona il tuo viso al centro</span>
                </p>
                <p className="flex items-center justify-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Buona illuminazione per i migliori risultati</span>
                </p>
              </div>
            </div>
          )}

          {cameraState === 'preview' && (
            <div className="flex gap-1 sm:gap-2">
              <button
                onClick={retakePhoto}
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors rounded-xl font-semibold text-sm"
              >
                Retake
              </button>
              <button
                onClick={confirmPhoto}
                className="flex-1 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors rounded-xl font-semibold text-sm"
              >
                Send
              </button>
            </div>
          )}
        </div>

        {/* Hidden elements */}
        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          aria-label="Seleziona file immagine"
        />
      </div>
    </motion.div>
  );
};

export default CameraCapture;