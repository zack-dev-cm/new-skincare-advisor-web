"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, SwitchCameraIcon, Upload, CheckCircle2, Redo2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';
import DesktopPhotoReceiver from './DesktopPhotoReceiver';
import { ensureTfBackendReady } from '@/lib/tfBackend';
import { cropFaceFromImage } from '@/lib/imageCropper';

interface CameraCaptureStepProps {
  onNext: (imageData: string) => void;
  onBack: () => void;
  faceDetection?: {
    modelsLoaded: boolean;
    faceApiAvailable: boolean;
    isLoading: boolean;
    error: string | null;
    faceapi: any;
  };
}

interface FacePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768;
};

const BrightnessBar: React.FC<{ value: number }> = ({ value }) => {
  const bars = [0, 25, 50, 75, 100];
  const activeCount = Math.ceil((value / 100) * bars.length);

  return (
    <div className="flex items-center justify-center gap-1 mt-2">
      {bars.map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.4 }}
          animate={{
            opacity: i < activeCount ? 1 : 0.3,
            scaleY: i < activeCount ? 1.05 : 1.0,
          }}
          style={{
            boxShadow:
              '0 0 8px rgba(255, 255, 255, 0.9), 0 0 16px rgba(68, 68, 68, 0.7)',
            filter: 'brightness(1.2)',
          }}
          transition={{ duration: 0.25 }}
          className="w-4 h-4 bg-white rounded-sm"
        />
      ))}
    </div>
  );
};

export default function CameraCaptureStep({ onNext, onBack, faceDetection }: CameraCaptureStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [currentCamera, setCurrentCamera] = useState<'front' | 'back'>('front');
  const [cameraState, setCameraState] = useState<'live' | 'preview'>('live');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showDesktopGate, setShowDesktopGate] = useState<boolean>(false);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [cropBox, setCropBox] = useState<any | null>(null);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const previewRef = useRef<HTMLDivElement>(null);
  const [facePosition, setFacePosition] = useState<FacePosition | null>(null);
  const [faceAngle, setFaceAngle] = useState<{ x: number, y: number, z: number } | null>(null);
  const [detectedFaces, setDetectedFaces] = useState<any[]>([]);
  const [brightness, setBrightness] = useState<number>(0);
  const [guidanceMessage, setGuidanceMessage] = useState<string>(
    faceDetection?.isLoading ? 'Loading face detection...' : ''
  );
  const [guidanceType, setGuidanceType] = useState<'loading' | 'detecting' | 'positioning' | 'ready'>(
    faceDetection?.isLoading ? 'loading' : 'detecting'
  );
  const [lastFaceDetectionTime, setLastFaceDetectionTime] = useState<number>(0);
  const [session, setSession] = useState<string>('');

  // from props
  const modelsLoaded = faceDetection?.modelsLoaded ?? false;
  const faceApiAvailable = faceDetection?.faceApiAvailable ?? false;
  const faceapi = faceDetection?.faceapi ?? null;

  // refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  const initializationInProgressRef = useRef(false);

  // detection loop control
  const detectionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectingRef = useRef<boolean>(false);
  const brightnessCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectedFacesRef = useRef<any[]>([]);

  useEffect(() => {
    isMountedRef.current = true;
    const mobile = isMobileDevice();
    setIsMobile(mobile);
    if (typeof window !== 'undefined' && !mobile) {
      setShowDesktopGate(true);
      setSession(uuidv4());
    } else {
      startCamera();
    }
    return () => {
      isMountedRef.current = false;
      stopCamera();
      if (detectionTimerRef.current) {
        clearInterval(detectionTimerRef.current);
        detectionTimerRef.current = null;
      }
      detectingRef.current = false;
    };
  }, []);

  // log readiness
  useEffect(() => {
    console.log('📸 Camera step - Face detection status:', {
      modelsLoaded,
      faceApiAvailable,
      hasFaceapi: !!faceapi
    });
  }, [modelsLoaded, faceApiAvailable, faceapi]);

  // restart detection when models loaded
  useEffect(() => {
    if (modelsLoaded && isCameraActive && !detectionTimerRef.current) {
      startFaceDetection();
    }
  }, [modelsLoaded, isCameraActive]);

  const startCamera = async (desiredFacing?: 'front' | 'back') => {
    if (initializationInProgressRef.current || !isMountedRef.current) return;
    initializationInProgressRef.current = true;

    try {
      setIsLoading(true);
      setError(null);

      if (stream) stream.getTracks().forEach((t) => t.stop());

      const facingMode = desiredFacing || currentCamera;

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode === 'front' ? 'user' : 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!isMountedRef.current) {
        newStream.getTracks().forEach((t) => t.stop());
        return;
      }

      setStream(newStream);

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = null;
        video.srcObject = newStream;

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Video timeout')), 5000);
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

        // small delay then start detection (if models are ready)
        setTimeout(() => {
          if (modelsLoaded && isMountedRef.current) startFaceDetection();
        }, 800);
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err instanceof Error && err.name === 'AbortError') return;

      // Fallback
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (!isMountedRef.current) {
          fallbackStream.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(fallbackStream);

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = null;
          video.srcObject = fallbackStream;

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

          setTimeout(() => {
            if (modelsLoaded && isMountedRef.current) startFaceDetection();
          }, 400);
        }
      } catch (fallbackErr) {
        console.error('Fallback camera error:', fallbackErr);
        setError('Could not access camera. Please check permissions and try again.');
        setIsLoading(false);
      }
    } finally {
      initializationInProgressRef.current = false;
    }

    function onError(e: Event) { /* noop helper for above */ }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (detectionTimerRef.current) {
      clearInterval(detectionTimerRef.current);
      detectionTimerRef.current = null;
    }
    setIsCameraActive(false);
    initializationInProgressRef.current = false;
    detectingRef.current = false;
  };

  const switchCamera = () => {
    const newCamera = currentCamera === 'front' ? 'back' : 'front';
    setCurrentCamera(newCamera);
    if (isCameraActive) {
      stopCamera();
      setTimeout(() => { if (isMountedRef.current) startCamera(newCamera); }, 100);
    }
  };

  const startFaceDetection = async () => {
    if (!videoRef.current) return;
    if (!modelsLoaded) return;
    try { await ensureTfBackendReady(); } catch { /* ignore */ }

    if (detectionTimerRef.current) {
      clearInterval(detectionTimerRef.current);
      detectionTimerRef.current = null;
    }

    // run every 250ms to avoid overlap / race
    detectionTimerRef.current = setInterval(() => {
      detectFacePosition();
    }, 250);
  };

  const calculateFaceAngle = (landmarks: any) => {
    if (!landmarks || !landmarks.positions) {
      return { yaw: 0, pitch: 0, roll: 0 };
    }
    const points = landmarks.positions;
    const noseTip = points[30];
    const leftEye = points[36];
    const rightEye = points[45];
    const leftMouth = points[48];
    const rightMouth = points[54];
    const chin = points[8];

    const eyeVector = { x: rightEye.x - leftEye.x, y: rightEye.y - leftEye.y };
    const mouthVector = { x: rightMouth.x - leftMouth.x, y: rightMouth.y - leftMouth.y };
    const avgHorizontalVector = { x: (eyeVector.x + mouthVector.x) / 2, y: (eyeVector.y + mouthVector.y) / 2 };
    const yaw = Math.atan2(avgHorizontalVector.y, avgHorizontalVector.x) * (180 / Math.PI);

    const faceHeight = Math.abs(chin.y - ((leftEye.y + rightEye.y) / 2));
    const noseToEyeDistance = Math.abs(noseTip.y - ((leftEye.y + rightEye.y) / 2));
    const pitchRatio = faceHeight ? noseToEyeDistance / faceHeight : 0;
    const pitch = (pitchRatio - 0.3) * 90;

    const roll = Math.atan2(eyeVector.y, eyeVector.x) * (180 / Math.PI);

    return {
      yaw: Math.max(-45, Math.min(45, yaw)),
      pitch: Math.max(-30, Math.min(30, pitch)),
      roll: Math.max(-30, Math.min(30, roll))
    };
  };

  const detectFacePosition = async () => {
    // prevent parallel runs
    if (detectingRef.current) return;
    detectingRef.current = true;

    try {
      if (!videoRef.current) { detectingRef.current = false; return; }
      const video = videoRef.current;

      // video must be ready
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        detectingRef.current = false;
        return;
      }

      // --- Brightness analysis (reused canvas) ---
      if (!brightnessCanvasRef.current) {
        brightnessCanvasRef.current = document.createElement('canvas');
      }
      const tempCanvas = brightnessCanvasRef.current;
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        const frameData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        let totalLuminance = 0;
        let pixelCount = 0;
        const data = frameData.data;
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          totalLuminance += (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          pixelCount++;
        }
        const avgLuminance = pixelCount > 0 ? totalLuminance / pixelCount : 0;
        setBrightness(Math.round(avgLuminance * 100));

        let brightnessMsg = '';
        if (avgLuminance < 0.20) brightnessMsg = 'Face toward a light source - lighting is too dark';
        else if (avgLuminance > 0.80) brightnessMsg = 'Move away from bright light - lighting is too bright';
        else if (avgLuminance < 0.35) brightnessMsg = 'Turn toward more light for better visibility';

        if (brightnessMsg) {
          if (guidanceMessage !== brightnessMsg) {
            setGuidanceMessage(brightnessMsg);
            setGuidanceType('positioning');
          }
          detectingRef.current = false;
          return;
        }
      }

      setGuidanceType('positioning');
      clearOverlayCanvas();
      setDetectedFaces([]);
      setFaceAngle(null);

      // --- Face detection (no configurable options for @vladmandic builds) ---
      if (!modelsLoaded || !faceApiAvailable || !faceapi) {
        // wait for models
        setGuidanceMessage('Loading recognition models...');
        setGuidanceType('loading');
        detectingRef.current = false;
        return;
      }

      // Create default options object — do NOT set inputSize/scoreThreshold in this build
      const options = new faceapi.TinyFaceDetectorOptions();

      const detections = await faceapi
        .detectAllFaces(video, options)
        .withFaceLandmarks();

      detectedFacesRef.current = detections;
      setDetectedFaces(detections);

      if (detections.length > 0) {
        const detection = detections[0];
        const { detection: box, landmarks } = detection;

        const normalized = normalizeFaceBox(box);
        const facePos = normalized ? {
          x: normalized.x,
          y: normalized.y,
          width: normalized.width,
          height: normalized.height
        } : null;

        setFacePosition(facePos);

        if (landmarks) {
          const angles = calculateFaceAngle(landmarks);
          setFaceAngle(angles as any);
        } else {
          setFaceAngle({ x: 0, y: 0, z: 0 });
        }

        updateGuidance(detections);
      } else {
        setFaceAngle(null);
        updateGuidance([]);
      }
    } catch (err) {
      console.error('face-api.js face detection error:', err);
    } finally {
      // ALWAYS release lock
      detectingRef.current = false;
    }
  };

  const clearOverlayCanvas = () => {
    if (!overlayCanvasRef.current) return;
    const ctx = overlayCanvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
  };

  const updateGuidance = (detections: any[]) => {
    if (!faceApiAvailable) {
      const newMessage = 'Loading recognition models...';
      if (guidanceMessage !== newMessage) {
        setGuidanceMessage(newMessage);
        setGuidanceType('loading');
      }
      return;
    }

    setLastFaceDetectionTime(Date.now());

    if (detections.length === 0) {
      const newMessage = '';
      if (guidanceMessage !== newMessage) {
        setGuidanceMessage(newMessage);
        setGuidanceType('detecting');
      }
      return;
    }

    const detection = detections[0];
    const { detection: box, landmarks } = detection;
    const normalizedBox = normalizeFaceBox(box);
    if (!normalizedBox) return;

    if (landmarks && landmarks.positions.length > 0) {
      const allInBox = areLandmarksInGuideBox(landmarks.positions, normalizedBox);
      if (!allInBox) {
        const newMessage = 'Center your face in the guide box';
        if (guidanceMessage !== newMessage) {
          setGuidanceMessage(newMessage);
          setGuidanceType('positioning');
        }
        return;
      }
    }

    const distanceGuidance = getDistanceGuidance(normalizedBox);
    if (distanceGuidance.needsAdjustment) {
      if (guidanceMessage !== distanceGuidance.message) {
        setGuidanceMessage(distanceGuidance.message);
        setGuidanceType('positioning');
      }
      return;
    }

    if (landmarks && landmarks.positions.length > 0) {
      const angleGuidance = getAngleGuidance(landmarks.positions, normalizedBox);
      if (angleGuidance.shouldCorrect) {
        if (guidanceMessage !== angleGuidance.message) {
          setGuidanceMessage(angleGuidance.message);
          setGuidanceType('positioning');
        }
        return;
      }
    }

    const newMessage = 'Perfect! Keep this position';
    if (guidanceMessage !== newMessage) {
      setGuidanceMessage(newMessage);
      setGuidanceType('ready');
    }
  };

  const normalizeFaceBox = (rawBox: any): { x: number; y: number; width: number; height: number } | null => {
    if (!rawBox || typeof rawBox !== 'object') return null;
    const candidate = (rawBox.box && typeof rawBox.box === 'object') ? rawBox.box : rawBox;
    const x = Number((candidate as any).x);
    const y = Number((candidate as any).y);
    const width = Number((candidate as any).width);
    const height = Number((candidate as any).height);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
      return null;
    }
    return { x, y, width, height };
  };

  const getDistanceGuidance = (faceBox: any): { needsAdjustment: boolean; message: string } => {
    if (!videoRef.current || !faceBox) {
      return { needsAdjustment: false, message: '' };
    }
    const video = videoRef.current;
    const frameWidth = video.videoWidth || video.clientWidth || 0;
    const frameHeight = video.videoHeight || video.clientHeight || 0;
    if (!frameWidth || !frameHeight) {
      return { needsAdjustment: false, message: '' };
    }
    const faceArea = Math.max(1, Number(faceBox.width)) * Math.max(1, Number(faceBox.height));
    const frameArea = frameWidth * frameHeight;
    const faceAreaRatio = faceArea / frameArea;

    if (faceAreaRatio < 0.1) {
      return { needsAdjustment: true, message: 'Move closer to the camera' };
    }
    if (faceAreaRatio > 0.25) {
      return { needsAdjustment: true, message: 'Move a bit farther from the camera' };
    }
    return { needsAdjustment: false, message: '' };
  };

  const getAngleGuidance = (landmarks: any[], faceBox: any): { shouldCorrect: boolean; message: string } => {
    if (!landmarks || landmarks.length < 68) return { shouldCorrect: false, message: '' };
    const leftCheek = landmarks[0];
    const rightCheek = landmarks[16];
    const noseTip = landmarks[30];
    const noseBridge = landmarks[27];
    if (!leftCheek || !rightCheek || !noseTip || !noseBridge) return { shouldCorrect: false, message: '' };

    const leftDistance = Math.hypot(leftCheek.x - noseTip.x, leftCheek.y - noseTip.y);
    const rightDistance = Math.hypot(rightCheek.x - noseTip.x, rightCheek.y - noseTip.y);
    const asym = Math.abs(leftDistance - rightDistance);
    const avg = (leftDistance + rightDistance) / 2;
    const ratio = avg > 0 ? asym / avg : 0;

    if (ratio > 0.25) {
      if (leftDistance > rightDistance) return { shouldCorrect: true, message: 'Turn your head slightly right' };
      return { shouldCorrect: true, message: 'Turn your head slightly left' };
    }
    return { shouldCorrect: false, message: '' };
  };

  const areLandmarksInGuideBox = (landmarks: any[], faceBox: any): boolean => {
    if (!videoRef.current) return false;
    const video = videoRef.current;

    const guideBoxWidth = 192; // w-48
    const guideBoxHeight = 240; // h-60

    const videoCenterX = video.clientWidth / 2;
    const videoCenterY = video.clientHeight / 2;

    const scaleX = video.clientWidth / video.videoWidth;
    const scaleY = video.clientHeight / video.videoHeight;

    const guideBoxLeft = (videoCenterX - guideBoxWidth / 2) / scaleX;
    const guideBoxRight = (videoCenterX + guideBoxWidth / 2) / scaleX;
    const guideBoxTop = (videoCenterY - guideBoxHeight / 2) / scaleY;
    const guideBoxBottom = (videoCenterY + guideBoxHeight / 2) / scaleY;

    const keyLandmarks = [0, 16, 8, 36, 45, 48, 54, 27, 30];
    let landmarksInBox = 0;
    const requiredLandmarks = 5;

    for (const index of keyLandmarks.slice(0, requiredLandmarks)) {
      const landmark = landmarks[index];
      if (
        landmark &&
        landmark.x >= guideBoxLeft && landmark.x <= guideBoxRight &&
        landmark.y >= guideBoxTop && landmark.y <= guideBoxBottom
      ) {
        landmarksInBox++;
      }
    }
    return landmarksInBox >= requiredLandmarks;
  };

  // guidance timeout effect
  useEffect(() => {
    const timeout = setTimeout(() => {
      const elapsed = Date.now() - lastFaceDetectionTime;
      if (elapsed > 3000 && guidanceType !== 'loading') {
        setGuidanceMessage('');
        setGuidanceType('detecting');
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [lastFaceDetectionTime, guidanceType]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const originalWidth = video.videoWidth;
    const originalHeight = video.videoHeight;

    canvas.width = originalWidth;
    canvas.height = originalHeight;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, originalWidth, originalHeight);

    if (currentCamera === 'front') {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(
        video,
        0,
        0,
        originalWidth,
        originalHeight,
        -originalWidth,
        0,
        originalWidth,
        originalHeight
      );
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, originalWidth, originalHeight);
    }

    const imageData = canvas.toDataURL('image/jpeg', 1.0);

    // Crop and get bounding box + original dimensions
    const { croppedData, box, originalWidth: ow, originalHeight: oh }: any =
      await cropFaceFromImage(imageData, faceapi);

    setCapturedImage(imageData);
    setCroppedImage(croppedData);
    setCropBox(box);
    setOriginalSize({ width: ow, height: oh });

    setCameraState('preview');
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCameraState('live');
    startCamera();
  };

  const confirmPhoto = () => {
    if (croppedImage) onNext(croppedImage);
  };

  const computeDisplayBox = () => {
    if (!cropBox || !previewRef.current || !capturedImage) return null;

    const { width: imgW, height: imgH } = originalSize;
    const container = previewRef.current;

    // container dimensions
    const contW = container.clientWidth;
    const contH = container.clientHeight;

    // scale factor for object-contain
    const scale = Math.min(contW / imgW, contH / imgH);

    const displayedW = imgW * scale;
    const displayedH = imgH * scale;

    // center offsets
    const offsetX = (contW - displayedW) / 2;
    const offsetY = (contH - displayedH) / 2;

    return {
      x: cropBox.x * scale + offsetX,
      y: cropBox.y * scale + offsetY,
      width: cropBox.width * scale,
      height: cropBox.height * scale,
    };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      if (imageData) {
        setCapturedImage(imageData);
        setCameraState('preview');
        setShowDesktopGate(false);
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
  };

  const openFileDialog = () => fileInputRef.current?.click();

  return (
    <motion.div
      key="camera-capture"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-main bg-cover bg-center h-full flex flex-col"
    >
      {/* Desktop Gate (desktop only) */}
      {showDesktopGate && !isMobile && (
        <div className="flex-1 relative bg-black/70 backdrop-blur-md overflow-y-auto p-6">
          <div className="flex size-full flex-col items-center p-4 max-w-full">
            <div className="my-auto flex flex-col items-center justify-center gap-6">
              <div className="relative mb-10 flex items-center justify-center overflow-hidden rounded-2xl bg-white text-white p-4">
                {session && (
                  <QRCodeSVG
                    value={`${window.location.origin}/mobile-capture?session=${session}`}
                    size={256}
                  />
                )}
              </div>
              <div className="flex flex-col gap-2 text-center text-white">
                <h2 className="text-xl sm:text-2xl">Scan this QR code to take a photo with your smartphone</h2>
              </div>
            </div>
            <div className="mt-8 w-full flex flex-col items-center justify-center">
              {session && (
                <DesktopPhotoReceiver
                  session={session}
                  onPhotoReceived={(image) => {
                    setCapturedImage(image);
                    setCameraState('preview');
                    setShowDesktopGate(false);
                    console.log('Photo received, switching to preview step');
                  }}
                />
              )}
            </div>
            <div className="flex w-full flex-col items-center justify-center gap-2 mt-6">
              <button
                onClick={() => {
                  setShowDesktopGate(false);
                  startCamera();
                }}
                className="w-full relative rounded-md bg-white/20 hover:bg-white/30 text-white px-4 py-3 transition flex items-center justify-center gap-2 cursor-pointer"
                aria-label="Continue on desktop"
              >
                <Camera />
                <span>Continue on desktop</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                aria-label="Seleziona file immagine"
              />
              <label
                className="w-full relative rounded-md bg-white/20 hover:bg-white/30 text-white px-4 py-3 text-center transition cursor-pointer flex items-center justify-center gap-4"
                aria-label="Upload from device"
                role="button"
                tabIndex={0}
                onClick={openFileDialog}
              >
                <Upload />
                <span>Upload from device</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Camera Content */}
      {!showDesktopGate && (
        <div className="flex-1 relative bg-black overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Avvio fotocamera...</p>
              </div>
            </div>
          )}

          {!capturedImage && error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
              <div className="text-white text-center p-4">
                <p className="mb-4">{error}</p>
                <button
                  onClick={() => { setError(null); startCamera(); }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Riprova
                </button>
              </div>
            </div>
          )}

          {cameraState === 'live' && (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`max-w-full max-h-full object-contain ${currentCamera === 'front' ? 'scale-x-[-1]' : ''}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  display: 'block',
                  transform: currentCamera === 'front' ? 'scaleX(-1)' : 'none'
                }}
              />

              {/* Face guide overlay */}
              {guidanceMessage !== 'Center your face in the guide box' && (
                <AnimatePresence>
                  <motion.div
                    key="guide-overlay"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-5"
                  >
                    <div
                      aria-hidden
                      className="absolute rounded-lg"
                      style={{
                        width: '12rem',
                        height: '15rem',
                        boxShadow: '0 12px 40px rgba(139, 75, 241, 0.8), 0 0 80px rgba(196, 24, 212, 0.23)',
                        filter: 'blur(10px)',
                        transform: 'translateZ(0)',
                        pointerEvents: 'none'
                      }}
                    />
                    <div
                      className="relative w-48 h-60 rounded-lg"
                      style={{
                        border: '2px solid rgba(132, 45, 245, 0.95)',
                        background: 'linear-gradient(180deg, rgba(29, 123, 231, 0.02), rgba(255,255,255,0))',
                        boxShadow: '0 4px 18px rgba(48, 156, 245, 0.04) inset',
                        pointerEvents: 'none'
                      }}
                    />
                  </motion.div>
                </AnimatePresence>
              )}

              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                <span
                  className="text-xs text-white mb-1"
                  style={{
                    textShadow: '0 0 8px rgba(255, 255, 255, 0.9), 0 0 16px rgba(68, 68, 68, 0.7)',
                    filter: 'brightness(1.2)',
                  }}
                >
                  Lighting
                </span>
                <BrightnessBar value={brightness} />
              </div>

              {/* Dynamic Guidance Text */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
                <div className="px-6 py-3 text-sm text-center max-w-xs text-white footer-medium">
                  <AnimatePresence mode="wait" initial={false}>
                    {guidanceType === 'loading' ? (
                      <motion.div
                        key={`loading-${guidanceMessage}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="flex items-center justify-center gap-2"
                      >
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>{guidanceMessage}</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={`msg-${guidanceMessage}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="flex items-center justify-center"
                      >
                        {guidanceMessage}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}

          {cameraState === 'preview' && capturedImage && (
            <div
              ref={previewRef}
              className="relative w-full h-full flex items-center justify-center bg-black"
            >
              {/* Full original image */}
              <img
                src={capturedImage}
                alt="Captured"
                className="max-w-full max-h-full object-contain"
              />

              {(() => {
                const displayBox = computeDisplayBox();
                if (!displayBox) return null;

                return (
                  <>
                    {/* Mask */}
                    <div className="absolute inset-0 bg-black opacity-60 pointer-events-none"></div>

                    {/* Highlight */}
                    <div
                      className="absolute border-4 border-white/90 rounded-md shadow-lg pointer-events-none"
                      style={{
                        left: `${displayBox.x}px`,
                        top: `${displayBox.y}px`,
                        width: `${displayBox.width}px`,
                        height: `${displayBox.height}px`,
                      }}
                    />

                    {/* Cropped overlay */}
                    <img
                      src={croppedImage ?? ""}
                      className="absolute rounded-md pointer-events-none"
                      style={{
                        left: `${displayBox.x}px`,
                        top: `${displayBox.y}px`,
                        width: `${displayBox.width}px`,
                        height: `${displayBox.height}px`,
                      }}
                    />
                  </>
                );
              })()}
            </div>
          )}

          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Hidden file input for photo upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            aria-label="Seleziona file immagine"
          />
        </div>
      )}

      {/* Controls */}
      {!showDesktopGate && (
        <div className="bg-white/50 backdrop-blur-sm border-t border-white/30 p-4">
          {cameraState === 'live' && (
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              <button
                onClick={switchCamera}
                className="p-3 sm:p-4 bg-white/20 hover:bg-white/30 rounded-full transition-colors touch-manipulation"
                title="Cambia Fotocamera"
                aria-label="Cambia tra fotocamera anteriore e posteriore"
              >
                <SwitchCameraIcon size={24} className="text-white" />
              </button>

              <button
                onClick={capturePhoto}
                className="p-4 sm:p-5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 rounded-full transition-colors shadow-lg touch-manipulation min-w-[60px] min-h-[60px] sm:min-w-[70px] sm:min-h-[70px]"
                title="Scatta Foto"
                aria-label="Scatta foto"
              >
                <Camera size={28} className="text-white" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                aria-label="Seleziona file immagine"
              />
              <button
                onClick={openFileDialog}
                className="p-3 sm:p-4 bg-white/20 hover:bg-white/30 rounded-full transition-colors touch-manipulation"
                title="Carica Foto"
                aria-label="Carica foto dalla galleria"
              >
                <Upload size={24} className="text-white" />
              </button>
            </div>
          )}

          {cameraState === 'preview' && (
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={retakePhoto}
                className="px-6 py-3 sm:px-8 sm:py-4 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 rounded-lg transition-colors flex items-center gap-2 touch-manipulation font-semibold"
                title="Retake"
                aria-label="Retake"
              >
                <Redo2 size={20} />
                Retake
              </button>

              <button
                onClick={confirmPhoto}
                className="px-6 py-3 sm:px-8 sm:py-4 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-lg transition-colors flex items-center gap-2 touch-manipulation font-semibold"
                title="Send"
                aria-label="Usa questa foto per l'analisi"
              >
                <CheckCircle2 size={20} />
                Send
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
