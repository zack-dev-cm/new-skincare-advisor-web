'use client'

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  SwitchCameraIcon,
  Upload,
  CheckCircle2,
  Redo2,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { v4 as uuidv4 } from 'uuid'
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)

  const faceMeshRef = useRef<FaceMeshInstance | null>(null)
  const faceResultsRef = useRef<FaceMeshResults | null>(null)
  const cameraRef = useRef<MPCamera | null>(null)
  const frameReqRef = useRef<number | null>(null)
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const stabilizedTimerRef = useRef<NodeJS.Timeout | null>(null)

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

    cameraRef.current = null
    frameReqRef.current = null
  }, [])

  /** MediaPipe Initialization */
  const startCamera = useCallback(async () => {
    cleanup()
    setStreamError(null)

    try {
			const faceMesh = await loadFaceMeshWithFallback()
			// Attach results handler *after* FaceMesh is loaded, so guidance &
			// overlay run whenever we get new landmarks.
			faceMesh.onResults((results: FaceMeshResults) => {
				faceResultsRef.current = results
				renderOverlay()
			})
			faceMeshRef.current = faceMesh

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraSide === 'front' ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (!videoRef.current) return

      videoRef.current.srcObject = stream

      await new Promise<void>((resolve) => {
        const onLoaded = () => {
          videoRef.current?.removeEventListener('loadedmetadata', onLoaded)
          resolve()
        }
        videoRef.current?.addEventListener('loadedmetadata', onLoaded)
      })

      await videoRef.current.play()

      const cam = new MPCamera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && faceMeshRef.current) {
            await faceMeshRef.current.send({ image: videoRef.current })
          }
        },
        width: 1280,
        height: 720,
      })

      cameraRef.current = cam
      await cam.start()

      setIsCameraReady(true)
    } catch (err) {
      console.error('Camera start error:', err)
      setStreamError('Could not access camera. Check permissions.')
    }
  }, [cameraSide, cleanup])

	useEffect(() => {
		return () => cleanup()
	}, [cleanup])

  const renderOverlay = () => {
    const canvas = overlayCanvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return

    const cw = canvas.width
    const ch = canvas.height
    ctx.clearRect(0, 0, cw, ch)

		// Update lighting guidance on every frame where we have a valid video.
		// Brightness is a value between 0 and 1.
		const brightnessValue = calculateBrightness(video)
		setBrightness(brightnessValue)

		const results = faceResultsRef.current
		if (!results || !results.multiFaceLandmarks?.length) {
      setFaceDetected(false)
      setFaceCentered(false)
      setPerfectAlignment(false)
      return
    }
    
    setFaceDetected(true)

    const windowSize = {
      width: cw,
      height: ch,
    }

    const { videoRect } = getFaceFrameRect(windowSize, { top: 0, bottom: 0 }, {
      width: vw,
      height: vh,
    })

    const zoomThresholds = calculateZoomThresholds(
      windowSize,
      { top: 0, bottom: 0 },
      { width: vw, height: vh },
    )

    const lm = results.multiFaceLandmarks[0]
    const flipped = lm.map((pt: FaceMeshLandmark) => ({
      ...pt,
      x: 1 - pt.x, // mirror for front camera
    }))

    const span = calculateFaceSpanNormalized(flipped)
    const newZoom = determineZoomStatus(span, zoomThresholds, zoomStatus)
    setZoomStatus(newZoom)

    const visible = isFaceVisible(flipped, vw, vh)
    setFaceCentered(isFaceInsideFrame(flipped, vw, vh, videoRect))

    const nose = flipped[1]
    const targetX = videoRect.x + videoRect.width / 2
    const targetY = videoRect.y + (videoRect.height * 2) / 3

    const px = nose.x * vw
    const py = nose.y * vh
    const dx = px - targetX
    const dy = py - targetY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const tolerance = Math.min(videoRect.width, videoRect.height) * 0.08

    const aligned =
      visible &&
      faceCentered &&
      newZoom === 'perfect' &&
      dist < tolerance

    setPerfectAlignment(aligned)

    if (!aligned) {
      setStableAlignment(false)
      return
    }

    if (stabilizedTimerRef.current) clearTimeout(stabilizedTimerRef.current)
    stabilizedTimerRef.current = setTimeout(
      () => setStableAlignment(true),
      600,
    )
  }

  /** Countdown auto-trigger */
  useEffect(() => {
    if (stableAlignment) {
      if (countdown === null) {
        debounceTimerRef.current = setTimeout(() => {
          if (stableAlignment) startCountdown()
        }, 800)
      }
    } else {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
        setCountdown(null)
      }
    }
  }, [stableAlignment])

  const startCountdown = () => {
    setCountdown(3)
    countdownTimerRef.current = setInterval(() => {
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

  /** Capture full-frame image */
  const capturePhoto = async () => {
    if (!videoRef.current) return
    const video = videoRef.current

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.scale(-1, 1)
    ctx.drawImage(video, -video.videoWidth, 0)

    const data = canvas.toDataURL('image/jpeg', 1.0)
    setCapturedImage(data)
    setCameraState('preview')

    setShowFlash(true)
    setTimeout(() => setShowFlash(false), 250)

    cleanup()
  }

  /** Manual trigger */
  const handleManualCapture = () => capturePhoto()

  const retakePhoto = () => {
    setCapturedImage(null)
    setCameraState('live')
    startCamera()
  }

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
            Continue on Desktop
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-white/20 px-4 py-3 rounded-lg text-white"
          >
            Upload from Device
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
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  transform: cameraSide === 'front' ? 'scaleX(-1)' : 'none',
                }}
              />

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
            />
          )}
        </div>
      )}

      {!showDesktopGate && (
        <div className="bg-white/50 backdrop-blur-sm border-t border-white/30 p-4 flex justify-center gap-4">
          {cameraState === 'live' ? (
            <>
              <button
                onClick={switchCamera}
                className="p-3 bg-white/20 rounded-full"
              >
                <SwitchCameraIcon className="text-white" />
              </button>

              <button
                onClick={handleManualCapture}
                className="p-4 sm:p-5 bg-primary-600 rounded-full shadow-lg"
              >
                <Camera className="text-white" size={28} />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-white/20 rounded-full"
              >
                <Upload className="text-white" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
            </>
          ) : (
            <>
              <button
                onClick={retakePhoto}
                className="px-6 py-3 bg-gray-300 rounded-lg flex items-center gap-3"
              >
                <Redo2 size={20} /> Retake
              </button>
              <button
                onClick={confirmPhoto}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg flex items-center gap-3"
              >
                <CheckCircle2 size={20} /> Send
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  )
}
