'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface SpideringChartProps {
  analysisData: any;
  userAge?: number;
  userGender?: string;
  ageRange?: string;
}

export default function SpideringChart({ 
  analysisData, 
  userAge = 30, 
  userGender = 'female',
  ageRange = '26-35'
}: SpideringChartProps) {
  const { t } = useTranslation('analysis');
  
  /**
   * Helper: converts age range to category (from JavaScript)
   */
  const mapAgeRangeToCategory = (ageRangeLabel: string): string => {
    if (!ageRangeLabel) return "<30";
    const label = ageRangeLabel.toLowerCase();
    
    // Map Typeform labels
    if (label.includes("17") || label.includes("meno") || (label.includes("18") && label.includes("25"))) {
      return "<30";
    }
    if (label.includes("26") && label.includes("35")) {
      return "30-40";
    }
    if (label.includes("36") && label.includes("45")) {
      return "41-50";
    }
    if (label.includes("più") || label.includes("oltre") || label.includes(">") || label.includes("51")) {
      return ">50";
    }

    // Backward compatibility
    if ((label.includes("26") && label.includes("30")) || (label.includes("31") && label.includes("40"))) {
      return label.includes("26") && label.includes("30") ? "<30" : "30-40";
    }
    if (label.includes("41") && label.includes("50")) {
      return "41-50";
    }
    
    return "<30";
  };

  /**
   * Helper: normalize gender (from JavaScript)
   */
  const normalizeGender = (gender: string): string => {
    if (!gender) return "non_binary";
    const label = gender.toLowerCase();
    if (label === "maschio" || label === "male") return "male";
    if (label === "femmina" || label === "female") return "female";
    return "non_binary";
  };

  /**
   * Gets benchmark values based on age and gender (from JavaScript lines 1458-1494)
   */
  const getBenchmarks = (ageRangeLabel: string, gender: string) => {
    const ageCategory = mapAgeRangeToCategory(ageRangeLabel);
    const genderNormalized = normalizeGender(gender);
    
    const isMale = genderNormalized === "male";
    
    // Benchmark for females and non-binary
    const femaleBenchmarks: Record<string, any> = {
      "<30": { acne: 2, dryness: 1, redness: 1, wrinkles: 1, spots: 1, laxity: 1 },
      "30-40": { acne: 1, dryness: 2, redness: 1.5, wrinkles: 1.8, spots: 1, laxity: 1.5 },
      "41-50": { acne: 1, dryness: 3, redness: 1.5, wrinkles: 3, spots: 2, laxity: 2 },
      ">50": { acne: 1, dryness: 4, redness: 2, wrinkles: 4, spots: 3, laxity: 3 }
    };
    
    // Benchmark for males
    const maleBenchmarks: Record<string, any> = {
      "<30": { acne: 2, dryness: 1, redness: 1, wrinkles: 1, spots: 1, laxity: 1 },
      "30-40": { acne: 1, dryness: 2, redness: 1.5, wrinkles: 1.8, spots: 1, laxity: 1.5 },
      "41-50": { acne: 1, dryness: 3, redness: 1.5, wrinkles: 3, spots: 2, laxity: 2.5 },
      ">50": { acne: 1, dryness: 4, redness: 2, wrinkles: 4, spots: 3, laxity: 3 }
    };
    
    const benchmarks = isMale ? maleBenchmarks[ageCategory] : femaleBenchmarks[ageCategory];
    
    return {
      acne: benchmarks.acne,
      spots: benchmarks.spots,
      dryness: benchmarks.dryness,
      wrinkles: benchmarks.wrinkles,
      pores: null,
      redness: benchmarks.redness,
      laxity: benchmarks.laxity
    };
  };

  /**
   * Build user metrics and benchmarks using the same logic as JavaScript (lines 1382-1440)
   */
  const getMetricsAndBenchmarks = () => {
    // Use skinMetrics and skinBenchmarks from API if available
    if (analysisData.skinMetrics && analysisData.skinBenchmarks) {
      return {
        userMetrics: analysisData.skinMetrics,
        benchmarks: analysisData.skinBenchmarks
      };
    }
    
    // Fallback: calculate locally (should not happen with updated API)
    const benchmarks = getBenchmarks(ageRange, userGender || 'female');
    
    // User metrics from API data
    const userMetrics = {
      acne: 1,
      spots: 1,
      dryness: 1,
      wrinkles: 1,
      pores: null,
      redness: 1,
      laxity: 1
    };
    
    return { userMetrics, benchmarks };
  };

  const { userMetrics, benchmarks } = getMetricsAndBenchmarks();

  // Pores: include in chart only when the Cloud Run API returned a real value
  const hasPores = userMetrics.pores != null && typeof userMetrics.pores === 'number';

  // Build chart data array (6 base metrics + optional pores)
  const chartData = [
    { labelKey: 'chart.acne', label: t('chart.acne'), userValue: userMetrics.acne, benchmarkValue: benchmarks.acne, max: 4, color: '#ff6b6b' },
    { labelKey: 'chart.dryness', label: t('chart.dryness'), userValue: userMetrics.dryness, benchmarkValue: benchmarks.dryness, max: 5, color: '#4dabf7' },
    { labelKey: 'chart.wrinkles', label: t('chart.wrinkles'), userValue: userMetrics.wrinkles, benchmarkValue: benchmarks.wrinkles, max: 5, color: '#ff922b' },
    { labelKey: 'chart.spots', label: t('chart.spots'), userValue: userMetrics.spots, benchmarkValue: benchmarks.spots, max: 4, color: '#9775fa' },
    { labelKey: 'chart.redness', label: t('chart.redness'), userValue: userMetrics.redness, benchmarkValue: benchmarks.redness, max: 5, color: '#ff6b9d' },
    { labelKey: 'chart.laxity_skin', label: t('chart.laxity_skin'), userValue: userMetrics.laxity, benchmarkValue: benchmarks.laxity, max: 4, color: '#20c997' },
    ...(hasPores ? [{
      labelKey: 'chart.pores',
      label: t('chart.pores'),
      userValue: userMetrics.pores as number,
      benchmarkValue: (benchmarks.pores as number | null) ?? 2, // 2 = "mild" reference
      max: 5,
      color: '#6362EE'
    }] : [])
  ];

  const centerX = 150;
  const centerY = 150;
  const radius = 88;

  // Calculate polygon points for user data
  const getUserPolygonPoints = () => {
    return chartData.map((metric, index) => {
      const angle = (index * 2 * Math.PI) / chartData.length - Math.PI / 2;
      // Normalize to 0-1 range using max=5 for all (radar chart scale)
      const normalizedValue = metric.userValue / 5;
      const x = centerX + Math.cos(angle) * radius * normalizedValue;
      const y = centerY + Math.sin(angle) * radius * normalizedValue;
      return `${x},${y}`;
    }).join(' ');
  };

  // Calculate polygon points for benchmark data
  const getBenchmarkPolygonPoints = () => {
    return chartData.map((metric, index) => {
      const angle = (index * 2 * Math.PI) / chartData.length - Math.PI / 2;
      // Normalize to 0-1 range using max=5 for all (radar chart scale)
      const normalizedValue = metric.benchmarkValue / 5;
      const x = centerX + Math.cos(angle) * radius * normalizedValue;
      const y = centerY + Math.sin(angle) * radius * normalizedValue;
      return `${x},${y}`;
    }).join(' ');
  };

  // Calculate label positions
  const getLabelPosition = (index: number) => {
    const angle = (index * 2 * Math.PI) / chartData.length - Math.PI / 2;
    const labelRadius = radius + 35;
    let x = centerX + Math.cos(angle) * labelRadius;
    const y = centerY + Math.sin(angle) * labelRadius;
    // Fix for "Lassità Cutanea" label that gets cut off on desktop
    if (index === 5) x += 15;
    return { x, y };
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 text-center">{t('chart.overview_title')}</h3>
      
      {/* Legend info - Above chart */}
      <div className="mb-4 flex items-center justify-center gap-4 text-xs sm:text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-purple-600"></div>
          <span>{t('chart.your_skin')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 border-t-2 border-green-600 border-dashed"></div>
          <span>{t('chart.reference_value')}</span>
        </div>
      </div>
      
      {/* Radar Chart */}
      <div className="flex items-center justify-center w-full max-w-sm sm:max-w-md mx-auto">
        <motion.svg
          width="100%"
          viewBox="0 0 300 300"
          preserveAspectRatio="xMidYMid meet"
          className="max-w-[280px] sm:max-w-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Background circles (scale 0-5) */}
          {[1, 2, 3, 4, 5].map((level, index) => (
            <circle
              key={index}
              cx={centerX}
              cy={centerY}
              r={(radius / 5) * level}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          ))}

          {/* Axis lines */}
          {chartData.map((_, index) => {
            const angle = (index * 2 * Math.PI) / chartData.length - Math.PI / 2;
            const endX = centerX + Math.cos(angle) * radius;
            const endY = centerY + Math.sin(angle) * radius;
            return (
              <line
                key={index}
                x1={centerX}
                y1={centerY}
                x2={endX}
                y2={endY}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            );
          })}

          {/* Benchmark polygon (green, dashed) */}
          <motion.polygon
            points={getBenchmarkPolygonPoints()}
            fill="rgba(34,197,94,0.1)"
            stroke="#22c55e"
            strokeWidth="2"
            strokeDasharray="5,5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          />

          {/* User data polygon (purple) */}
          <motion.polygon
            points={getUserPolygonPoints()}
            fill="rgba(124, 58, 237, 0.2)"
            stroke="#7C3AED"
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />

          {/* User data points */}
          {chartData.map((metric, index) => {
            const angle = (index * 2 * Math.PI) / chartData.length - Math.PI / 2;
            const normalizedValue = metric.userValue / 5;
            const x = centerX + Math.cos(angle) * radius * normalizedValue;
            const y = centerY + Math.sin(angle) * radius * normalizedValue;
            
            return (
              <motion.circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill="#7C3AED"
                stroke="white"
                strokeWidth="2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              />
            );
          })}

          {/* Benchmark points */}
          {chartData.map((metric, index) => {
            const angle = (index * 2 * Math.PI) / chartData.length - Math.PI / 2;
            const normalizedValue = metric.benchmarkValue / 5;
            const x = centerX + Math.cos(angle) * radius * normalizedValue;
            const y = centerY + Math.sin(angle) * radius * normalizedValue;
            
            return (
              <motion.circle
                key={`bench-${index}`}
                cx={x}
                cy={y}
                r="3"
                fill="#22c55e"
                stroke="white"
                strokeWidth="1.5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.25 + index * 0.1 }}
              />
            );
          })}

          {/* Labels */}
          {chartData.map((metric, index) => {
            const pos = getLabelPosition(index);
            const displayLabel = metric.labelKey === 'chart.laxity_skin' ? metric.label.replace(/\s/g, '\n') : metric.label;
            return (
              <text
                key={index}
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] sm:text-xs font-medium fill-gray-600"
              >
                {displayLabel}
              </text>
            );
          })}
        </motion.svg>
      </div>

      {/* Legend with Status Badges (from JavaScript renderSkinStatusList) */}
      <div className="mt-4 sm:mt-6 space-y-2">
        {chartData.map((metric, index) => {
          const isOk = metric.userValue <= metric.benchmarkValue;
          
          return (
            <motion.div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
            >
              {/* Left: Indicator + Label */}
              <div className="flex items-center space-x-3">
                <div 
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: metric.color }}
                />
                <span className="text-sm sm:text-base font-medium text-gray-700">
                  {metric.label.replace(/\n/g, ' ')}
                </span>
              </div>
              
              {/* Right: Status Badge */}
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                isOk 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-amber-100 text-amber-700'
              }`}>
                <span className="mr-1">{isOk ? '✓' : '⚠'}</span>
                <span>{isOk ? t('chart.ok') : t('chart.needs_improvement')}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
