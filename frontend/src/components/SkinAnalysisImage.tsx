'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Info, AlertTriangle, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { getLegendLabel } from '@/lib/legendLabels';

// Test comment to verify compilation
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

// NEW: Wrinkles color mapping with transparency (66 = ~40% opacity)
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
  // Convert hex to RGB
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

export default function SkinAnalysisImage({ 
  imageUrl, 
  analysisData, 
  className = '' 
}: SkinAnalysisImageProps) {
  const [currentView, setCurrentView] = useState<'acne' | 'wrinkles'>('acne');
  const [showOverlays, setShowOverlays] = useState(true);
  const [hoveredDetection, setHoveredDetection] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [scaleFactors, setScaleFactors] = useState({ x: 1, y: 1 });

  // Create multiple images for carousel (analysis versions only)
  const carouselImages = [
    { url: imageUrl, label: 'Analisi Imperfezioni', view: 'acne' as const },
    { url: imageUrl, label: 'Analisi Rughe', view: 'wrinkles' as const }
  ];

  // Canvas drawing functions
  const drawImage = useCallback((ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
    if (!img || !canvasSize.width || !canvasSize.height) return;

    // Clear canvas first
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw the image to fill the canvas
    ctx.drawImage(img, 0, 0, canvasSize.width, canvasSize.height);
  }, [canvasSize]);

  const drawAcneDetections = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!analysisData.predictions || analysisData.predictions.length === 0) return;

    analysisData.predictions.forEach((prediction) => {
      const color = getAcneColor(prediction.class);
      const x = (prediction.x - prediction.width / 2) * scaleFactors.x;
      const y = (prediction.y - prediction.height / 2) * scaleFactors.y;
      const width = prediction.width * scaleFactors.x;
      const height = prediction.height * scaleFactors.y;
      const radius = Math.min(width, height) / 3.14; // Use smaller radius - min instead of max, divided by PI
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      // Draw filled circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.globalAlpha = hoveredDetection === prediction.detection_id ? 0.8 : 0.6;
      ctx.fill();

      // Draw border
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = color;
      ctx.lineWidth = hoveredDetection === prediction.detection_id ? 3 : 2;
      ctx.globalAlpha = hoveredDetection === prediction.detection_id ? 1 : 0.8;
      ctx.stroke();

      // Draw hover highlight
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
  }, [analysisData.predictions, scaleFactors, hoveredDetection]);

  // Redness visualization removed - redness is now a metric from laxityRednessData.predictions

  const drawWrinklesDetections = useCallback((ctx: CanvasRenderingContext2D) => {
    const wrinklesData = analysisData.wrinklesData || analysisData.wrinkles;
    if (!wrinklesData?.predictions) return;

    wrinklesData.predictions.forEach((prediction) => {
      const color = getWrinkleColor(prediction.class);
      ctx.fillStyle = color; // Use fillStyle instead of strokeStyle
      
      if (prediction.points && prediction.points.length >= 2) {
        // Draw filled polygon areas using points
        let adjustedPoints = prediction.points;
        if (analysisData.wrinkles?.scaling_factors && 
            (analysisData.wrinkles.scaling_factors.x !== 1 || analysisData.wrinkles.scaling_factors.y !== 1)) {
          adjustedPoints = prediction.points.map(point => ({
            x: point.x * analysisData.wrinkles!.scaling_factors!.x,
            y: point.y * analysisData.wrinkles!.scaling_factors!.y
          }));
        }

        ctx.beginPath();
        const firstPoint = adjustedPoints[0];
        ctx.moveTo(firstPoint.x * scaleFactors.x, firstPoint.y * scaleFactors.y);
        
        for (let i = 1; i < adjustedPoints.length; i++) {
          const point = adjustedPoints[i];
          ctx.lineTo(point.x * scaleFactors.x, point.y * scaleFactors.y);
        }
        
        ctx.closePath(); // Close the polygon
        ctx.fill();      // Fill the area instead of stroking
      } else {
        // Fallback: render filled bounding box
        const x = (prediction.x - prediction.width / 2) * scaleFactors.x;
        const y = (prediction.y - prediction.height / 2) * scaleFactors.y;
        const width = prediction.width * scaleFactors.x;
        const height = prediction.height * scaleFactors.y;
        
        ctx.fillRect(x, y, width, height);
      }
    });
  }, [analysisData.wrinkles, scaleFactors]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    
    if (!canvas || !ctx || !img || !imageLoaded) return;

    // First draw the image
    drawImage(ctx, img);

    // Then draw overlays if enabled
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

  // Handle canvas resize and setup
  useEffect(() => {
    if (imageRef.current && imageLoaded && containerRef.current && canvasRef.current) {
      const img = imageRef.current;
      const container = containerRef.current;
      const canvas = canvasRef.current;
      
      // Get container dimensions
      const containerWidth = container.offsetWidth;
      
      // Calculate height maintaining aspect ratio
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      const containerHeight = Math.max(384, containerWidth * aspectRatio);
      
      // Set canvas size
      canvas.width = containerWidth;
      canvas.height = containerHeight;
      
      // Calculate scale factors from original image to canvas
      const scaleX = containerWidth / img.naturalWidth;
      const scaleY = containerHeight / img.naturalHeight;
      
      setCanvasSize({ width: containerWidth, height: containerHeight });
      setScaleFactors({ x: scaleX, y: scaleY });
      
      console.log('Canvas setup:', {
        containerWidth,
        containerHeight,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        scaleX,
        scaleY,
        aspectRatio
      });
    }
  }, [imageLoaded]);

  // Redraw canvas when view changes or overlays toggle
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Redraw canvas when carousel image changes
  useEffect(() => {
    if (imageLoaded) {
      // Small delay to ensure image is fully loaded
      setTimeout(() => redrawCanvas(), 50);
    }
  }, [currentImageIndex, redrawCanvas, imageLoaded]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current && containerRef.current && canvasRef.current) {
        const img = imageRef.current;
        const container = containerRef.current;
        const canvas = canvasRef.current;
        
        const containerWidth = container.offsetWidth;
        const aspectRatio = img.naturalHeight / img.naturalWidth;
        const containerHeight = Math.max(384, containerWidth * aspectRatio);
        
        canvas.width = containerWidth;
        canvas.height = containerHeight;
        
        const scaleX = containerWidth / img.naturalWidth;
        const scaleY = containerHeight / img.naturalHeight;
        
        setCanvasSize({ width: containerWidth, height: containerHeight });
        setScaleFactors({ x: scaleX, y: scaleY });
        
        // Redraw after resize
        setTimeout(() => redrawCanvas(), 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

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
      
      // Verify dimensions match (only if image data available)
      const dimensionsMatch = analysisData.image 
        ? (img.naturalWidth === analysisData.image.width && img.naturalHeight === analysisData.image.height)
        : false;
      console.log('5. Dimensions match:', dimensionsMatch);
      
      if (!dimensionsMatch) {
        console.warn('⚠️ Image dimensions mismatch - annotations may not align correctly');
      }

      // Force canvas setup after image loads
      if (containerRef.current && canvasRef.current) {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        
        const containerWidth = container.offsetWidth;
        const aspectRatio = img.naturalHeight / img.naturalWidth;
        const containerHeight = Math.max(384, containerWidth * aspectRatio);
        
        canvas.width = containerWidth;
        canvas.height = containerHeight;
        
        const scaleX = containerWidth / img.naturalWidth;
        const scaleY = containerHeight / img.naturalHeight;
        
        setCanvasSize({ width: containerWidth, height: containerHeight });
        setScaleFactors({ x: scaleX, y: scaleY });
        
        // Trigger canvas redraw after setup
        setTimeout(() => redrawCanvas(), 100);
      }
    }
  };

  // Canvas click handler for interactions
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || currentView !== 'acne') return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if click is on any acne detection
    if (analysisData.predictions) {
      for (const prediction of analysisData.predictions) {
        const detectionX = (prediction.x - prediction.width / 2) * scaleFactors.x;
        const detectionY = (prediction.y - prediction.height / 2) * scaleFactors.y;
        const width = prediction.width * scaleFactors.x;
        const height = prediction.height * scaleFactors.y;
        const radius = Math.max(width, height) / 2;
        const centerX = detectionX + width / 2;
        const centerY = detectionY + height / 2;

        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
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

  const nextImage = () => {
    setImageLoaded(false); // Reset image loaded state
    setCurrentImageIndex((prev: number) => (prev + 1) % carouselImages.length);
  };

  const prevImage = () => {
    setImageLoaded(false); // Reset image loaded state
    setCurrentImageIndex((prev: number) => (prev - 1 + carouselImages.length) % carouselImages.length);
  };

  const goToImage = (index: number) => {
    setImageLoaded(false); // Reset image loaded state
    setCurrentImageIndex(index);
    setCurrentView(carouselImages[index].view);
  };

  // Sync view with current image when image changes
  useEffect(() => {
    console.log('Carousel image changed:', {
      currentImageIndex,
      view: carouselImages[currentImageIndex].view,
      currentView
    });
    setCurrentView(carouselImages[currentImageIndex].view);
  }, [currentImageIndex]);

  useEffect(() => {
    if (analysisData && analysisData.predictions && analysisData.predictions.length > 0) {
      console.log('Setting acne view on first load:', {
        predictionsCount: analysisData.predictions.length,
        currentView,
        currentImageIndex
      });
      if (currentImageIndex === 0) {
        setCurrentView('acne');
      }
    }
  }, [analysisData, currentImageIndex]);

  // Get unique classes for current view to show in legend
  const getUniqueClasses = () => {
    const classes = new Set<string>();
    
    switch (currentView) {
      case 'acne':
        analysisData.predictions?.forEach(p => classes.add(p.class));
        break;
      case 'wrinkles':
        const wrinklesData = analysisData.wrinklesData || analysisData.wrinkles;
        wrinklesData?.predictions?.forEach(p => classes.add(p.class));
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
      default:
        return '#666666';
    }
  };

  // Helper function to convert snake_case class names to human-readable format
  const getReadableClassName = (className: string): string => {
    // Handle special cases first
    const specialCases: Record<string, string> = {
      'crows_feet': 'Crow\'s feet',
      'marionette_line': 'Marionette line',
      'droppy_eyelid': 'Droopy eyelid',
      'tear_through': 'Tear through',
      'mental_crease': 'Mental crease',
      'purse_string': 'Purse string lines',
      'neck_lines': 'Neck lines'
    };

    if (specialCases[className]) {
      return specialCases[className];
    }

    return className
      .split('_')
      .join(' ')
      .toLowerCase()
      .replace(/^./, match => match.toUpperCase());
  };

  return (
    <div className={`relative ${className}`}>
      {/* Image Carousel */}
      <div className="relative mb-6">
        <div className="relative overflow-hidden bg-gray-100 rounded-2xl">
          {/* Carousel Images */}
          <div 
            ref={containerRef}
            className="relative w-full flex justify-center items-center bg-gray-50" 
            style={{ 
              minHeight: '384px'
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentImageIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Hidden image for loading and getting dimensions */}
                <img
                  ref={imageRef}
                  src={carouselImages[currentImageIndex].url}
                  alt={carouselImages[currentImageIndex].label}
                  className="hidden"
                  onLoad={handleImageLoad}
                  key={`${carouselImages[currentImageIndex].url}-${currentImageIndex}`}
                />

                {/* Canvas that contains both image and overlays */}
                {imageLoaded && (
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full pointer-events-auto cursor-pointer"
                    onClick={handleCanvasClick}
                    style={{ 
                      maxWidth: '100%',
                      height: 'auto'
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Carousel Navigation */}
          <div className="absolute top-1/2 left-4 transform -translate-y-1/2">
            <button
              onClick={prevImage}
              className="bg-white/20 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all"
              title="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          
          <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
            <button
              onClick={nextImage}
              className="bg-white/20 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all"
              title="Next image"
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
                  title={`Go to image ${index + 1}`}
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

        {/* Color Legend Bar */}
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            {carouselImages[currentImageIndex].label} - Legenda
          </h3>
          <div className="flex flex-wrap gap-2 align-center justify-center">
            {getUniqueClasses().map((className) => {
              const color = getClassColor(className);
              const textColor = getTextColor(color);
              const translated = getLegendLabel(currentView, className, 'it');
              
              return (
                <div
                  key={className}
                  className="px-3 py-1 rounded rounded-full text-sm font-medium transition-all hover:opacity-80"
                  style={{
                    backgroundColor: color,
                    color: textColor
                  }}
                >
                  {translated}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 