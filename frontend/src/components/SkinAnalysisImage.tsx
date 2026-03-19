'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Info, AlertTriangle, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { getLegendLabel, AnalysisView } from '@/lib/legendLabels';

interface Prediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  class_id: number;
  detection_id: string;
}

interface WrinklesPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  detection_id?: string;
  points?: Array<{ x: number; y: number }>;
}

interface AnalysisData {
  predictions: Prediction[];
  laxityRednessData?: {
    predictions: {
      redness?: { predictedClass: number; class: string };
      dryness?: { predictedClass: number; class: string };
      laxity?: { predictedClass: number; class: string };
    };
  };
  erythema?: boolean;
  wrinklesData?: {
    predictions: WrinklesPrediction[];
    image: { width: number; height: number };
    wrinkleSeverity?: {
      overall: { severity: number };
    };
    counts?: Record<string, number>;
    severity?: string;
    has_forehead_wrinkles?: boolean;
    has_expression_lines?: boolean;
    has_under_eye_concerns?: boolean;
  };
  wrinkles?: {
    predictions: WrinklesPrediction[];
    image: { width: number; height: number };
    scaling_factors?: { x: number; y: number };
    original_resolution?: { width: number; height: number };
    counts?: Record<string, number>;
    severity?: string;
    has_forehead_wrinkles?: boolean;
    has_expression_lines?: boolean;
    has_under_eye_concerns?: boolean;
  };
  poresData?: {
    pore_total: number;
    pore_severity_1_5: number | null;
    score_label: string | null;
    score_0_100: number | null;
    visible_count: number | null;
    pores_visibility: string | null;
    overlay_preview_url: string | null;
    overlay_circles_preview_url: string | null;
  };
  image: {
    width: number;
    height: number;
  };
}

interface SkinAnalysisImageProps {
  imageUrl: string;
  analysisData: AnalysisData;
  className?: string;
}

// Updated color codes as requested
const ACNE_COLORS = {
  "Post-Acne Spot": "#7547f2",
  "Comedones": "#000000",
  "Microcysts": "#45cdf8",
  "Post-Acne Scar": "#737373",
  "Mole": "#b0fdc9",
  "Papules": "#f845dc",
  "Pustules": "#fff985",
  "Cistic": "#ff7875",
  "Nodules": "#ff914d",
  "Freckles": "green",
  "Cysts": "#ff7875",
  "Spot": "#ff6b9d",
};

const REDNESS_COLOR = '#FF4757';
const REDNESS_OPACITY = 0.8;

// Wrinkles color mapping with transparency
const WRINKLES_COLORS = {
  'forehead': '#9900ff66',
  'crows_feet': '#ff660066', 
  'nasolabial_fold': '#00ccff66',
  'frown': '#ff006666',
  'tear_through': '#66ff0066',
  'mental_crease': '#ffcc0066',
  'bunny_line': '#ff990066',
  'droppy_eyelid': '#cc00ff66',
  'marionette_line': '#00ffcc66',
  'neck_lines': '#ffff0066',
  'purse_string': '#ff00cc66'
};

const getWrinkleColor = (className: string) => {
  return WRINKLES_COLORS[className as keyof typeof WRINKLES_COLORS] || '#ffffff';
};

const getAcneColor = (className: string) => {
  return ACNE_COLORS[className as keyof typeof ACNE_COLORS] || '#FF6B6B';
};

// Helper function to determine text color based on background color
const getTextColor = (backgroundColor: string) => {
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

export default function SkinAnalysisImage({ 
  imageUrl, 
  analysisData, 
  className = '' 
}: SkinAnalysisImageProps) {
  const { t } = useTranslation('analysis');
  const [currentView, setCurrentView] = useState<'acne' | 'wrinkles' | 'pores'>('acne');
  const [showOverlays, setShowOverlays] = useState(true);
  const [hoveredDetection, setHoveredDetection] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Transform to mimic object-contain
  const [drawTransform, setDrawTransform] = useState({
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
  });

  // Keep for convenience; now it's uniform (scaleX === scaleY)
  const [scaleFactors, setScaleFactors] = useState({ x: 1, y: 1 });

  const carouselImages = [
    { url: imageUrl, label: t('image.imperfections'), view: 'acne' as const },
    { url: imageUrl, label: t('image.wrinkles_analysis'), view: 'wrinkles' as const },
    ...(analysisData.poresData?.overlay_circles_preview_url
      ? [{ url: analysisData.poresData.overlay_circles_preview_url, label: t('image.pores_analysis'), view: 'pores' as const }]
      : [])
  ];

  // Clamp index if carouselImages shrinks (e.g. pores data unavailable)
  useEffect(() => {
    if (currentImageIndex >= carouselImages.length) {
      const lastIdx = carouselImages.length - 1;
      setCurrentImageIndex(lastIdx);
      setCurrentView(carouselImages[lastIdx].view);
    }
  }, [carouselImages.length]);

  const drawImage = useCallback(
    (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
      if (!img || !canvasSize.width || !canvasSize.height) return;

      const { scaleX, scaleY, offsetX, offsetY } = drawTransform;
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;

      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      ctx.drawImage(img, offsetX, offsetY, imgW * scaleX, imgH * scaleY);
    },
    [canvasSize, drawTransform]
  );

  const drawAcneDetections = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!analysisData.predictions || analysisData.predictions.length === 0) return;

      const { scaleX, scaleY, offsetX, offsetY } = drawTransform;

      analysisData.predictions.forEach((prediction) => {
        const color = getAcneColor(prediction.class);

        const x = (prediction.x - prediction.width / 2) * scaleX + offsetX;
        const y = (prediction.y - prediction.height / 2) * scaleY + offsetY;
        const width = prediction.width * scaleX;
        const height = prediction.height * scaleY;
        const radius = Math.min(width, height) / 3.14;
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        // Filled circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.globalAlpha = hoveredDetection === prediction.detection_id ? 0.8 : 0.6;
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = hoveredDetection === prediction.detection_id ? 3 : 2;
        ctx.globalAlpha = hoveredDetection === prediction.detection_id ? 1 : 0.8;
        ctx.stroke();

        // Highlight
        if (hoveredDetection === prediction.detection_id) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius + 3, 0, 2 * Math.PI);
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.globalAlpha = 1;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      ctx.globalAlpha = 1;
    },
    [analysisData.predictions, drawTransform, hoveredDetection]
  );

  const drawWrinklesDetections = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const wrinklesData = analysisData.wrinklesData || analysisData.wrinkles;
      if (!wrinklesData?.predictions) return;

      const { scaleX, scaleY, offsetX, offsetY } = drawTransform;

      wrinklesData.predictions.forEach((prediction) => {
        const color = getWrinkleColor(prediction.class);
        ctx.fillStyle = color;

        if (prediction.points && prediction.points.length >= 2) {
          let adjustedPoints = prediction.points;

          if (
            analysisData.wrinkles?.scaling_factors &&
            (analysisData.wrinkles.scaling_factors.x !== 1 ||
              analysisData.wrinkles.scaling_factors.y !== 1)
          ) {
            adjustedPoints = prediction.points.map((point) => ({
              x: point.x * analysisData.wrinkles!.scaling_factors!.x,
              y: point.y * analysisData.wrinkles!.scaling_factors!.y,
            }));
          }

          ctx.beginPath();
          const firstPoint = adjustedPoints[0];
          ctx.moveTo(
            offsetX + firstPoint.x * scaleX,
            offsetY + firstPoint.y * scaleY
          );

          for (let i = 1; i < adjustedPoints.length; i++) {
            const point = adjustedPoints[i];
            ctx.lineTo(
              offsetX + point.x * scaleX,
              offsetY + point.y * scaleY
            );
          }

          ctx.closePath();
          ctx.fill();
        } else {
          const x = (prediction.x - prediction.width / 2) * scaleX + offsetX;
          const y = (prediction.y - prediction.height / 2) * scaleY + offsetY;
          const width = prediction.width * scaleX;
          const height = prediction.height * scaleY;

          ctx.fillRect(x, y, width, height);
        }
      });
    },
    [analysisData.wrinkles, analysisData.wrinklesData, drawTransform]
  );

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;

    if (!canvas || !ctx || !img || !imageLoaded) return;

    drawImage(ctx, img);

    if (showOverlays) {
      switch (currentView) {
        case 'acne':
          drawAcneDetections(ctx);
          break;
        case 'wrinkles':
          drawWrinklesDetections(ctx);
          break;
      }
    }
  }, [currentView, showOverlays, imageLoaded, drawImage, drawAcneDetections, drawWrinklesDetections]);

  // Compute canvas & transform to mimic object-contain
  const setupCanvasTransform = useCallback(() => {
    if (!imageRef.current || !containerRef.current || !canvasRef.current) return;
    const img = imageRef.current;
    const container = containerRef.current;
    const canvas = canvasRef.current;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight || 384; // fallback

    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    // Account for device pixel ratio to avoid blurriness on retina/HiDPI screens
    const dpr = window.devicePixelRatio || 1;

    // Object-contain: uniform scale based on the limiting dimension
    const scale = Math.min(containerWidth / imgW, containerHeight / imgH);
    const drawWidth = imgW * scale;
    const drawHeight = imgH * scale;

    const offsetX = (containerWidth - drawWidth) / 2;
    const offsetY = (containerHeight - drawHeight) / 2;

    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    setCanvasSize({ width: containerWidth, height: containerHeight });
    setScaleFactors({ x: scale, y: scale });
    setDrawTransform({
      scaleX: scale,
      scaleY: scale,
      offsetX,
      offsetY,
    });

    // Debug log removed for production
    // console.log('Canvas/object-contain setup:', { ... });
  }, []);

  // Initial setup when image loaded
  useEffect(() => {
    if (!imageLoaded) return;
    setupCanvasTransform();
    const id = setTimeout(() => redrawCanvas(), 100);
    return () => clearTimeout(id);
  }, [imageLoaded, setupCanvasTransform, redrawCanvas]);

  // Redraw on view / overlay toggle (synchronous — no setTimeout needed)
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Window resize → recompute transform & redraw
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      if (!imageRef.current) return;
      setupCanvasTransform();
      clearTimeout(timerId);
      timerId = setTimeout(() => redrawCanvas(), 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timerId);
    };
  }, [setupCanvasTransform, redrawCanvas]);

  const handleImageLoad = () => {
    console.log('Image loaded for index:', currentImageIndex);
    setImageLoaded(true);

    if (imageRef.current) {
      const img = imageRef.current;
      console.log('=== IMAGE RENDERING DEBUG ===');
      console.log('1. Captured dimensions (natural):', img.naturalWidth, 'x', img.naturalHeight);
      console.log('2. Analysis dimensions from API:', analysisData.image?.width, 'x', analysisData.image?.height);
      console.log('3. Redness data:', analysisData.laxityRednessData?.predictions?.redness);
      console.log('4. Wrinkles data:', analysisData.wrinklesData || analysisData.wrinkles);

      const dimensionsMatch = analysisData.image
        ? img.naturalWidth === analysisData.image.width &&
          img.naturalHeight === analysisData.image.height
        : false;
      console.log('5. Dimensions match:', dimensionsMatch);

      if (!dimensionsMatch) {
        console.warn('⚠️ Image dimensions mismatch - annotations may not align correctly');
      }
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || currentView !== 'acne') return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const { scaleX, scaleY, offsetX, offsetY } = drawTransform;

    if (analysisData.predictions) {
      for (const prediction of analysisData.predictions) {
        const detectionX =
          (prediction.x - prediction.width / 2) * scaleX + offsetX;
        const detectionY =
          (prediction.y - prediction.height / 2) * scaleY + offsetY;
        const width = prediction.width * scaleX;
        const height = prediction.height * scaleY;
        const radius = Math.max(width, height) / 2;
        const centerX = detectionX + width / 2;
        const centerY = detectionY + height / 2;

        const distance = Math.sqrt(
          (x - centerX) ** 2 + (y - centerY) ** 2
        );
        if (distance <= radius) {
          console.log('Clicked on detection:', prediction);
          break;
        }
      }
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600';
    if (confidence >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const switchTo = (index: number) => {
    if (index === currentImageIndex) return;
    const urlChanged = carouselImages[index].url !== carouselImages[currentImageIndex].url;
    if (urlChanged) {
      setImageLoaded(false);
    }
    setCurrentImageIndex(index);
    setCurrentView(carouselImages[index].view);
  };

  const nextImage = () => switchTo((currentImageIndex + 1) % carouselImages.length);
  const prevImage = () => switchTo((currentImageIndex - 1 + carouselImages.length) % carouselImages.length);
  const goToImage = (index: number) => switchTo(index);

  const getUniqueClasses = () => {
    const classes = new Set<string>();

    switch (currentView) {
      case 'acne':
        analysisData.predictions?.forEach((p) => classes.add(p.class));
        break;
      case 'wrinkles': {
        const wrinklesData = analysisData.wrinklesData || analysisData.wrinkles;
        wrinklesData?.predictions?.forEach((p) => classes.add(p.class));
        break;
      }
      case 'pores':
        // Pores legend is handled separately via the severity info bar
        break;
    }

    return Array.from(classes);
  };

  const getClassColor = (className: string) => {
    switch (currentView) {
      case 'acne':
        return getAcneColor(className);
      case 'wrinkles':
        return getWrinkleColor(className);
      case 'pores':
      default:
        return '#7547F2';
    }
  };

  const getReadableClassName = (className: string): string => {
    const specialCases: Record<string, string> = {
      'crows_feet': "Crow's feet",
      'marionette_line': 'Marionette line',
      'droppy_eyelid': 'Droopy eyelid',
      'tear_through': 'Tear through',
      'mental_crease': 'Mental crease',
      'purse_string': 'Purse string lines',
      'neck_lines': 'Neck lines',
    };

    if (specialCases[className]) {
      return specialCases[className];
    }

    return className
      .split('_')
      .join(' ')
      .toLowerCase()
      .replace(/^./, (match) => match.toUpperCase());
  };

  return (
    <div className={`relative ${className}`}>
      {/* Image Carousel */}
      <div className="relative mb-6">
        <div className="relative overflow-hidden bg-gray-100 rounded-2xl">
          <div
            ref={containerRef}
            className="relative w-full flex justify-center items-center bg-gray-50"
            style={{ minHeight: '384px' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={carouselImages[currentImageIndex].url}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                {analysisData.poresData?.overlay_circles_preview_url && (
                  <img
                    src={analysisData.poresData.overlay_circles_preview_url}
                    alt={t('image.pores_analysis')}
                    className={`w-full object-contain rounded-xl ${currentView === 'pores' ? 'block' : 'hidden'}`}
                    style={{ maxHeight: '384px', margin: '0 auto' }}
                  />
                )}

                <div className={currentView === 'pores' ? 'hidden' : 'block'}>
                  {/* Hidden image only for dimensions & load */}
                  <img
                    ref={imageRef}
                    src={carouselImages[currentImageIndex].url}
                    alt={carouselImages[currentImageIndex].label}
                    className="hidden"
                    onLoad={handleImageLoad}
                    key={carouselImages[currentImageIndex].url}
                  />

                  {/* Canvas that contains image (object-contain) + overlays */}
                  {imageLoaded && (
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full pointer-events-auto cursor-pointer"
                      onClick={handleCanvasClick}
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        display: 'block',
                      }}
                    />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Carousel Navigation */}
          <div className="absolute top-1/2 left-4 transform -translate-y-1/2">
            <button
              onClick={prevImage}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded-full shadow-lg transition-all"
              title={t('image.prev_image')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
            <button
              onClick={nextImage}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded-full shadow-lg transition-all"
              title={t('image.next_image')}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Carousel Indicators */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-2">
              {carouselImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToImage(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentImageIndex
                      ? 'bg-white shadow-lg'
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                  title={t('image.go_to_image', { index: index + 1 })}
                />
              ))}
            </div>
          </div>
        </div>

        {/* View Toggle Buttons */}
        <div className="flex justify-center mb-4 mt-8">
          <div className="flex space-x-2 bg-white rounded-lg p-1 shadow-sm border border-primary-100">
            {carouselImages.map((image, index) => (
              <button
                key={index}
                onClick={() => goToImage(index)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                  currentImageIndex === index
                    ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow'
                    : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
                }`}
              >
                {image.label}
              </button>
            ))}
          </div>
        </div>

        {/* Legend / Info Bar */}
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            {carouselImages[currentImageIndex].label}{t('image.legend_suffix')}
          </h3>

          {currentView === 'pores' && analysisData.poresData ? (
            /* Pores view: single chip matching overlay annotation color */
            <div className="flex flex-wrap gap-2 justify-center">
              <div
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ backgroundColor: '#00FF00', color: '#000000' }}
              >
                {t('image.pores_analysis')}
              </div>
            </div>
          ) : (
            /* Acne / Wrinkles view: existing class color legend */
            <div className="flex flex-wrap gap-2 align-center justify-center">
              {getUniqueClasses().map((className) => {
                const color = getClassColor(className);
                const textColor = getTextColor(color);
                const translated = getLegendLabel(currentView as AnalysisView, className);

                return (
                  <div
                    key={className}
                    className="px-3 py-1 rounded rounded-full text-sm font-medium transition-all hover:opacity-80"
                    style={{
                      backgroundColor: color,
                      color: textColor,
                    }}
                  >
                    {translated}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
