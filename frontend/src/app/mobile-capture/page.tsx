'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function MobileCapturePageInner() {
  const searchParams = useSearchParams();
  const session = searchParams.get('session');

  const [image, setImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const startCamera = async () => {
      console.log('Starting camera...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user',
            // Prefer 4:3 aspect ratio (matches iPhone camera format)
            // For 7MP camera: ~3055 x 2291 pixels
            aspectRatio: { ideal: 4 / 3 },
            // Support various iPhone resolutions (7MP to 12MP)
            width: { ideal: 3024, max: 4032 },
            height: { ideal: 2268, max: 3024 },
          },
          audio: false,
        });
        console.log('Got stream:', stream);

        const video = videoRef.current;
        if (!video) {
          console.error('Video element not ready.');
          setError('Video not ready. Try refreshing.');
          return;
        }

        video.srcObject = stream;
        video.muted = true;
        video.setAttribute('playsinline', 'true');

        // Wait for video metadata (camera dimensions)
        video.onloadedmetadata = async () => {
          await video.play().catch((err) => {
            console.error('Video play() failed:', err);
            setError('Unable to start camera. Tap the screen to allow playback.');
          });

          const w = video.videoWidth;
          const h = video.videoHeight;
          console.log(`Camera resolution: ${w}x${h}`);

          // Set exact native resolution
          video.width = w;
          video.height = h;

          // Responsive scaling
          video.style.maxWidth = '100%';
          video.style.height = 'auto';
          video.style.backgroundColor = 'black';

          setCameraActive(true);
          console.log('Camera started successfully.');
        };
      } catch (err) {
        console.error('Camera error:', err);
        setError('Unable to access camera. Please check permissions.');
      }
    };

    const timer = setTimeout(startCamera, 300);
    return () => clearTimeout(timer);
  }, []);

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capture at full native resolution for maximum quality
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Use high quality JPEG (1.0 = 100% quality)
    const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
    setImage(dataUrl);
    stopCamera(); // stop and hide camera
    uploadPhoto(dataUrl);
  };

  const uploadPhoto = async (base64: string) => {
    if (!session) return setError('Missing session.');
    setStatus('uploading');
    try {
      const res = await fetch('/api/photo-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, image: base64 }),
      });
      if (res.ok) setStatus('done');
      else setStatus('error');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Take a Selfie</h1>

      {error && <p className="text-red-500 mb-2">{error}</p>}

      {/* 👇 Show either the camera or the captured photo */}
      <div className="flex flex-col items-center justify-center w-full">
        {!image && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="rounded shadow mb-4 bg-black"
          />
        )}

        {image && (
          <img
            src={image}
            alt="Captured"
            className="rounded shadow mb-4 max-w-full"
          />
        )}
      </div>

      {/* Show capture button only when camera is active */}
      {cameraActive && !image && (
        <button
          onClick={capturePhoto}
          className="bg-primary-600 text-white px-6 py-2 rounded shadow"
        >
          Capture Photo
        </button>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {status === 'uploading' && <p>Uploading...</p>}
      {status === 'done' && (
        <p className="text-green-600 mt-2">Photo uploaded! You can return to your desktop.</p>
      )}
      {status === 'error' && <p className="text-red-500 mt-2">Upload failed. Try again.</p>}
    </main>
  );
}

export default function MobileCapturePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MobileCapturePageInner />
    </Suspense>
  );
}
