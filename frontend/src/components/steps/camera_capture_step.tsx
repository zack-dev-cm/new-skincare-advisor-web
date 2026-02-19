'use client'

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from 'react'
import { motion } from 'framer-motion'
import {
  Camera,
  SwitchCameraIcon,
  Upload,
  CheckCircle2,
  Redo2,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { v4 as uuidv4 } from 'uuid'
import { useTranslation } from 'react-i18next'
import DesktopPhotoReceiver from './DesktopPhotoReceiver'

import { Camera as MPCamera } from '@mediapipe/camera_utils'
import {
  loadFaceMeshWithFallback,
  type FaceMeshInstance,
  type FaceMeshResults,
  type FaceMeshLandmark,
} from '@/lib/medialib-loader'
import {
  calculateBrightness,
  calculateFaceSpanNormalized,
  isFaceInsideFrame,
  isFaceVisible,
  getFaceFrameRect,
  calculateZoomThresholds,
  determineZoomStatus,
} from '@/lib/face-utils'
import { BestFrameSelector } from '@/lib/best-frame-selector'

import LightingBar from '../common/LightingBar'
import FaceFrameOverlay from '../common/FaceFrameOverlay'
import CaptureCountdown from '../common/CaptureCountdown'
import ScreenFlash from '../common/ScreenFlash'

interface Props {
  onNext: (imageData: string) => void
  onBack: () => void
}

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) || window.innerWidth <= 768
  )
}

export default function CameraCaptureStep({ onNext }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)

  const faceMeshRef = useRef<FaceMeshInstance | null>(null)
  const faceResultsRef = useRef<FaceMeshResults | null>(null)
  const cameraRef = useRef<MPCamera | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const frameReqRef = useRef<number | null>(null)
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const stabilizedTimerRef = useRef<NodeJS.Timeout | null>(null)
  const perfectAlignmentRef = useRef<boolean>(false)
  const bestFrameSelectorRef = useRef<BestFrameSelector | null>(null)

  const [isCameraReady, setIsCameraReady] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showDesktopGate, setShowDesktopGate] = useState(false)
  const [session, setSession] = useState<string>('')

  const [cameraSide, setCameraSide] = useState<'front' | 'back'>('front')

  const [brightness, setBrightness] = useState(0)
  const [zoomStatus, setZoomStatus] =
    useState<'too-close' | 'too-far' | 'perfect'>('too-far')
  const [faceCentered, setFaceCentered] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)

  const [perfectAlignment, setPerfectAlignment] = useState(false)
  const [stableAlignment, setStableAlignment] = useState(false)

  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 })

  const [countdown, setCountdown] = useState<number | null>(null)
  const [showFlash, setShowFlash] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [cameraState, setCameraState] = useState<'live' | 'preview'>('live')
  const [isResolutionAdjusting, setIsResolutionAdjusting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Detect mobile vs desktop & desktop-gate QR mode
  useEffect(() => {
    const mobile = isMobileDevice()
    setIsMobile(mobile)
    if (!mobile && typeof window !== 'undefined') {
      setShowDesktopGate(true)
      setSession(uuidv4())
    }
  }, [])

  /** Cleanup camera + timers */
  const cleanup = useCallback(() => {
    if (frameReqRef.current) cancelAnimationFrame(frameReqRef.current)
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    if (stabilizedTimerRef.current) clearTimeout(stabilizedTimerRef.current)

    if (cameraRef.current) cameraRef.current.stop()
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((t) => t.stop())
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    if (bestFrameSelectorRef.current) {
      bestFrameSelectorRef.current.destroy()
      bestFrameSelectorRef.current = null
    }

    cameraRef.current = null
    frameReqRef.current = null
  }, [])

  /** MediaPipe Initialization */
  const startCamera = useCallback(async () => {
    cleanup()
    setStreamError(null)
    setIsResolutionAdjusting(true)

    try {
      const faceMesh = await loadFaceMeshWithFallback()
      faceMesh.onResults((results: FaceMeshResults) => {
        faceResultsRef.current = results
        renderOverlay()
      })
      faceMeshRef.current = faceMesh

      let stream: MediaStream | undefined
      const resolutionStrategies = [
        {
          video: {
            facingMode: cameraSide === 'front' ? 'user' : 'environment',
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 2560, min: 2000 },
          },
          audio: false,
        },
        {
          video: {
            facingMode: cameraSide === 'front' ? 'user' : 'environment',
            width: { ideal: 1920 },
            height: { ideal: 2560 },
          },
          audio: false,
        },
        {
          video: {
            facingMode: cameraSide === 'front' ? 'user' : 'environment',
            aspectRatio: { ideal: 3 / 4 }, // Portrait: height/width = 3/4
          },
          audio: false,
        },
        {
          video: {
            facingMode: cameraSide === 'front' ? 'user' : 'environment',
          },
          audio: false,
        },
      ]
      let lastError: Error | null = null
      for (const constraints of resolutionStrategies) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints)
          console.log('Camera stream obtained with resolution strategy')
          break
        } catch (error) {
          lastError = error as Error
          console.warn('Camera constraint failed, trying next strategy:', error)
        }
      }

      if (!stream) {
        throw lastError || new Error('Failed to get camera stream with any constraints')
      }
      if (!videoRef.current) return

      streamRef.current = stream
      videoRef.current.srcObject = stream

      await new Promise<void>((resolve) => {
        const onLoaded = () => {
          videoRef.current?.removeEventListener('loadedmetadata', onLoaded)
          resolve()
        }
        videoRef.current?.addEventListener('loadedmetadata', onLoaded)
      })

      await videoRef.current.play()

      // Wait a bit for video to stabilize
      await new Promise(resolve => setTimeout(resolve, 500))

      let videoWidth = videoRef.current.videoWidth || 1920
      let videoHeight = videoRef.current.videoHeight || 2560
      let isLandscape = videoWidth > videoHeight

      console.log(`Initial camera resolution: ${videoWidth}x${videoHeight} (${isLandscape ? 'landscape' : 'portrait'})`)

      // If landscape, try to apply portrait constraints to the video track
      if (isLandscape && streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0]
        if (videoTrack && typeof videoTrack.applyConstraints === 'function') {
          try {
            console.log('Adjusting camera to portrait resolution in background...')
            // Apply portrait constraints (swap width/height)
            await videoTrack.applyConstraints({
              width: { ideal: videoHeight },
              height: { ideal: videoWidth },
            })
            
            // Wait for constraints to apply and video to update
            await new Promise(resolve => setTimeout(resolve, 400))
            
            // Re-read video dimensions after constraints applied
            if (videoRef.current) {
              videoWidth = videoRef.current.videoWidth || videoWidth
              videoHeight = videoRef.current.videoHeight || videoHeight
              isLandscape = videoWidth > videoHeight
              
              console.log(`After applying constraints: ${videoWidth}x${videoHeight} (${isLandscape ? 'landscape' : 'portrait'})`)
              
              if (!isLandscape) {
                console.log('✅ Successfully changed to portrait resolution!')
              } else {
                console.warn('⚠️ Could not change to portrait - will crop during capture')
              }
            }
          } catch (error) {
            console.warn('Failed to apply portrait constraints:', error)
            console.warn('Will crop to portrait during capture')
          }
        }
      }

      // Initialize best frame selector
      if (!bestFrameSelectorRef.current) {
        bestFrameSelectorRef.current = new BestFrameSelector(true)
      } else {
        bestFrameSelectorRef.current.reset()
      }

      // Use final video dimensions (after applying constraints if needed)
      const finalVideoWidth = videoRef.current.videoWidth || videoWidth
      const finalVideoHeight = videoRef.current.videoHeight || videoHeight

      const cam = new MPCamera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && faceMeshRef.current) {
            await faceMeshRef.current.send({ image: videoRef.current })
            
            if (perfectAlignmentRef.current && bestFrameSelectorRef.current) {
              try {
                await bestFrameSelectorRef.current.send(videoRef.current)
              } catch (error) {
                // Silently handle errors in best frame selection
                console.warn('Best frame selection error:', error)
              }
            }
          }
        },
        width: finalVideoWidth,
        height: finalVideoHeight,
      })

      cameraRef.current = cam
      await cam.start()

      await new Promise(resolve => setTimeout(resolve, 200))
      setIsResolutionAdjusting(false)
      setIsCameraReady(true)
    } catch (err) {
      console.error('Camera start error:', err)
      setStreamError('Could not access camera. Check permissions.')
      setIsResolutionAdjusting(false) // Remove loading on error
    }
  }, [cameraSide, cleanup])

	useEffect(() => {
		return () => cleanup()
	}, [cleanup])

  const renderOverlay = () => {
    const canvas = overlayCanvasRef.current
    const video = videoRef.current
    const results = faceResultsRef.current

    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return

    const cw = canvas.width
    const ch = canvas.height
    ctx.clearRect(0, 0, cw, ch)

    setBrightness(calculateBrightness(video))

    if (!results || !results.multiFaceLandmarks?.length) {
      setFaceDetected(false)
      setPerfectAlignment(false)
      setStableAlignment(false)
      perfectAlignmentRef.current = false
      return
    }

    setFaceDetected(true)

    const windowSize = { width: cw, height: ch }
    const { videoRect } = getFaceFrameRect(
      windowSize,
      { top: 0, bottom: 0 },
      { width: vw, height: vh },
    )

    const zoomThresholds = calculateZoomThresholds(
      windowSize,
      { top: 0, bottom: 0 },
      { width: vw, height: vh },
    )

    const lm = results.multiFaceLandmarks[0]
    const flipped = lm.map((pt: FaceMeshLandmark) => ({
      ...pt,
      x: 1 - pt.x,
    }))

    const span = calculateFaceSpanNormalized(flipped)
    const newZoom = determineZoomStatus(span, zoomThresholds, zoomStatus)
    setZoomStatus(newZoom)

    const visible = isFaceVisible(flipped, vw, vh)
    const centered = isFaceInsideFrame(flipped, vw, vh, videoRect)
    setFaceCentered(centered)

    // DISPLAY (canvas) transform
    const scale = Math.max(cw / vw, ch / vh)
    const scaledW = vw * scale
    const scaledH = vh * scale
    const offsetX = (scaledW - cw) / 2
    const offsetY = (scaledH - ch) / 2

    // Nose → display coords
    const nose = flipped[1]
    const noseX = nose.x * vw
    const noseY = nose.y * vh
    const displayX = noseX * scale - offsetX
    const displayY = noseY * scale - offsetY

    // TARGET → convert into SAME coordinate space
    const targetVideoX = videoRect.x + videoRect.width / 2
    const targetVideoY = videoRect.y + (videoRect.height * 2) / 3

    const targetDisplayX = targetVideoX * scale - offsetX
    const targetDisplayY = targetVideoY * scale - offsetY

    const dx = displayX - targetDisplayX
    const dy = displayY - targetDisplayY
    const tolerance = Math.min(videoRect.width * scale, videoRect.height * scale) * 0.08

    const aligned = visible && centered && newZoom === 'perfect' && Math.sqrt(dx * dx + dy * dy) < tolerance
    setPerfectAlignment(aligned)
    perfectAlignmentRef.current = aligned

    if (aligned) {
      if (stabilizedTimerRef.current) 
        clearTimeout(stabilizedTimerRef.current)
      stabilizedTimerRef.current = setTimeout(() => {
        setStableAlignment(true)
      }, 600)
    } else {
      setStableAlignment(false)
    }

    if (!aligned && centered && newZoom === 'perfect' && visible) {
      ctx.beginPath()
      ctx.arc(displayX, displayY, 10, 0, 2 * Math.PI)
      ctx.fillStyle = 'white'
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur = 6
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }

  /** Countdown auto-trigger */
  useEffect(() => {
    if (perfectAlignment && countdown === null) {
      // debounce so it doesn't trigger instantly on flicker
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

      debounceTimerRef.current = setTimeout(() => {
        // check again after debounce period - make sure alignment is still good and no countdown is running
        if (perfectAlignmentRef.current && !countdownTimerRef.current) {
          startCountdown()
        }
      }, 600)
    } else if (!perfectAlignment) {
      // Stop countdown and clear debounce only if alignment is lost
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
        setCountdown(null)
      }
    }
  }, [perfectAlignment])

  const startCountdown = () => {
    // Don't start if countdown is already running
    if (countdownTimerRef.current) return
    
    setCountdown(3)
    countdownTimerRef.current = setInterval(() => {
      // Check if alignment is still valid before continuing countdown
      if (!perfectAlignmentRef.current) {
        clearInterval(countdownTimerRef.current!)
        countdownTimerRef.current = null
        setCountdown(null)
        return
      }

      setCountdown((prev) => {
        if (prev === null) return null
        if (prev === 1) {
          clearInterval(countdownTimerRef.current!)
          countdownTimerRef.current = null
          setCountdown(null)
          capturePhoto()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const capturePhoto = async () => {
    if (!videoRef.current) return
    
    // Try to use best frame if available, otherwise use current video frame
    let sourceImage: HTMLVideoElement | ImageBitmap = videoRef.current
    let useBestFrame = false
    
    if (bestFrameSelectorRef.current) {
      const bestFrame = bestFrameSelectorRef.current.getBestFrame()
      if (bestFrame && bestFrame.image.width > 0) {
        sourceImage = bestFrame.image
        useBestFrame = true
        console.log('Using best frame with blur score:', bestFrame.quality.blurScore)
      } else {
        console.log('No best frame available, using current frame')
      }
    }

    const video = videoRef.current
    
    let videoWidth: number
    let videoHeight: number
    
    if (sourceImage instanceof ImageBitmap) {
      videoWidth = sourceImage.width
      videoHeight = sourceImage.height
    } else {
      videoWidth = video.videoWidth
      videoHeight = video.videoHeight
    }

    // Always output portrait - if landscape, crop x-axis (sides) to make it portrait
    const isLandscape = videoWidth > videoHeight
    let finalWidth = videoWidth
    let finalHeight = videoHeight
    let cropX = 0
    let cropY = 0
    let sourceWidth = videoWidth
    let sourceHeight = videoHeight

    if (isLandscape) {
      finalHeight = videoHeight
      finalWidth = Math.round(videoHeight * (3 / 4)) 
      cropX = (videoWidth - finalWidth) / 2 
      cropY = 0
      sourceWidth = finalWidth
      sourceHeight = finalHeight
      console.log('Landscape detected - cropping x-axis to make portrait')
    }

    console.log('=== CAPTURE DEBUG ===')
    console.log('Using best frame:', useBestFrame)
    console.log('Original resolution:', videoWidth, 'x', videoHeight, `(${isLandscape ? 'landscape' : 'portrait'})`)
    console.log('Final resolution (portrait):', finalWidth, 'x', finalHeight)
    console.log('Crop offset:', cropX, cropY)
    console.log('Aspect ratio:', (finalWidth / finalHeight).toFixed(3))

    // Create canvas at portrait dimensions
    const canvas = document.createElement('canvas')
    canvas.width = finalWidth
    canvas.height = finalHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw the frame - crop x-axis if landscape, no rotation
    // Only handle mirroring for front camera
    if (cameraSide === 'front') {
      ctx.scale(-1, 1)
      ctx.drawImage(
        sourceImage,
        cropX, cropY, sourceWidth, sourceHeight, // Source: crop from original
        -finalWidth, 0, finalWidth, finalHeight  // Destination: full canvas
      )
    } else {
      ctx.drawImage(
        sourceImage,
        cropX, cropY, sourceWidth, sourceHeight, // Source: crop from original
        0, 0, finalWidth, finalHeight            // Destination: full canvas
      )
    }

    const data = canvas.toDataURL('image/jpeg', 1.0)
    
    // Log actual captured image info
    console.log('=== CAPTURE COMPLETE ===')
    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height)
    console.log('Image data URL size:', Math.round(data.length / 1024), 'KB')
    
    setCapturedImage(data)
    setCameraState('preview')

    setShowFlash(true)
    setTimeout(() => setShowFlash(false), 250)

    if (bestFrameSelectorRef.current) {
      bestFrameSelectorRef.current.reset()
    }

    cleanup()
  }

  /** Manual trigger */
  const handleManualCapture = () => capturePhoto()

  const retakePhoto = () => {
    setCapturedImage(null)
    setCameraState('live')
    startCamera()
  }

  useEffect(() => {
    if (cameraState === 'live' && videoRef.current) {
      const video = videoRef.current
      const handleLoaded = () => {
        sizeCanvas()
      }

      video.addEventListener('loadedmetadata', handleLoaded)
      return () => video.removeEventListener('loadedmetadata', handleLoaded)
    }
  }, [cameraState])

  const confirmPhoto = () => {
    if (capturedImage) onNext(capturedImage)
  }

  /** Upload fallback */
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = ev.target?.result as string
      if (!img) return
      setCapturedImage(img)
      setCameraState('preview')
      setShowDesktopGate(false)  // Close desktop gate to show preview
      cleanup()
    }
    reader.readAsDataURL(file)
  }

  const switchCamera = () => {
    setCameraSide((p) => (p === 'front' ? 'back' : 'front'))
    if (cameraState === 'live') startCamera()
  }

  /** Initially start camera when entering live mode */
  useEffect(() => {
    if (cameraState === 'live') startCamera()
  }, [cameraState, startCamera])

	/** Resize canvas & overlay to match the camera container */
  const sizeCanvas = () => {
		const canvas = overlayCanvasRef.current
		if (!canvas) return
		const parent = canvas.parentElement
		if (!parent) return
		const rect = parent.getBoundingClientRect()
		const width = rect.width
		const height = rect.height
		canvas.width = width
		canvas.height = height
		setOverlaySize({ width, height })
  }

  useLayoutEffect(() => {
    sizeCanvas()
    window.addEventListener('resize', sizeCanvas)
    return () => window.removeEventListener('resize', sizeCanvas)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-main bg-cover bg-center h-full flex flex-col"
    >
      {showFlash && <ScreenFlash />}

      {/* Desktop gate for QR */}
      {showDesktopGate && !isMobile && (
        <div className="flex-1 bg-black/70 flex flex-col items-center justify-center gap-6 p-8">
          <QRCodeSVG
            value={`${window.location.origin}/mobile-capture?session=${session}`}
            size={240}
          />
          <DesktopPhotoReceiver
            session={session}
            onPhotoReceived={(image) => {
              setCapturedImage(image)
              setCameraState('preview')
              setShowDesktopGate(false)
              cleanup()
            }}
          />
          <button
            onClick={() => {
              setShowDesktopGate(false)
              setCameraState('live')
            }}
            className="bg-white/20 px-4 py-3 rounded-lg text-white"
          >
            {t('camera:buttons.continue_desktop')}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-white/20 px-4 py-3 rounded-lg text-white"
          >
            {t('camera:buttons.upload_device')}
          </button>
        </div>
      )}

      {!showDesktopGate && (
        <div className="flex-1 relative bg-black">
          {cameraState === 'live' && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
                  isResolutionAdjusting ? 'blur-md' : 'blur-0'
                }`}
                style={{
                  transform: cameraSide === 'front' ? 'scaleX(-1)' : 'none',
                }}
              />
              {isResolutionAdjusting && (
                <div className="absolute inset-0 bg-black flex items-center justify-center z-10">
                  <div className="text-white text-sm opacity-80">{t('camera:status.preparing')}</div>
                </div>
              )}
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 pointer-events-none w-full h-full"
              />

              {overlaySize.width > 0 && overlaySize.height > 0 && (
                <FaceFrameOverlay
                  hasFace={faceDetected}
                  isCentered={faceCentered}
                  zoomStatus={zoomStatus}
                  isPerfectAlignment={perfectAlignment}
                  windowSize={overlaySize}
                  processId="camera"
                />
              )}

              <LightingBar brightness={brightness} />

              {countdown !== null && (
                <div className="absolute top-[15%] w-full z-30 flex justify-center pointer-events-none">
                  <CaptureCountdown count={countdown} />
                </div>
              )}
            </>
          )}

          {cameraState === 'preview' && capturedImage && (
            <img
              src={capturedImage}
              className="absolute inset-0 w-full h-full object-cover"
              alt="Captured photo preview"
              onLoad={(e) => {
                const img = e.target as HTMLImageElement
                console.log('Preview - Natural size:', img.naturalWidth, 'x', img.naturalHeight)
                console.log('Preview - Displayed size:', img.offsetWidth, 'x', img.offsetHeight)
              }}
            />
          )}
        </div>
      )}

      {!showDesktopGate && (
        <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-center gap-4">
          {cameraState === 'live' ? (
            <>
              <button
                onClick={switchCamera}
                className="p-3 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-700 transition-colors"
              >
                <SwitchCameraIcon className="w-6 h-6" />
              </button>

              <button
                onClick={handleManualCapture}
                className="p-4 sm:p-5 bg-primary-600 rounded-full shadow-lg"
              >
                <Camera className="text-white" size={28} />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-700 transition-colors"
              >
                <Upload className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={retakePhoto}
                className="px-6 py-3 bg-gray-300 rounded-lg flex items-center gap-3"
              >
                <Redo2 size={20} /> {t('camera:buttons.retake')}
              </button>
              <button
                onClick={confirmPhoto}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg flex items-center gap-3"
              >
                <CheckCircle2 size={20} /> {t('camera:buttons.send')}
              </button>
            </>
          )}
        </div>
      )}

      {/* File input - always rendered but hidden, so it's accessible from any state */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </motion.div>
  )
}
