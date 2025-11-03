const { createLogger } = require('./logger');
const logger = createLogger('SkinMetrics');

/**
 * Helper: converts severity string to number (1-4 scale)
 */
function mapSeverityStringToNumber(severity) {
  if (!severity) return 1;
  const sev = severity.toLowerCase();
  if (sev === "none") return 1;
  if (sev === "mild") return 2;
  if (sev === "moderate") return 3;
  if (sev === "severe") return 4;
  return 1;
}

/**
 * Helper: converts wrinkles severity to number (1-5 scale)
 */
function mapWrinklesSeverityToNumber(severity) {
  if (!severity) return 1;
  const sev = typeof severity === 'number' ? severity : severity.toString().toLowerCase();
  
  // If already a number, return it
  if (typeof severity === 'number') {
    return Math.min(Math.max(severity, 1), 5);
  }
  
  // String mapping
  if (sev === 'none') return 1;
  if (sev === 'mild') return 2;
  if (sev === 'moderate') return 3;
  if (sev === 'severe') return 4;
  return 1;
}

/**
 * Helper: converts age range to category
 */
function mapAgeToCategory(ageRange) {
  if (!ageRange) return "<30";
  const label = ageRange.toLowerCase();
  
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

  // Backward compatibility with legacy ranges
  if ((label.includes("26") && label.includes("30")) || (label.includes("31") && label.includes("40"))) {
    return label.includes("26") && label.includes("30") ? "<30" : "30-40";
  }
  if (label.includes("41") && label.includes("50")) {
    return "41-50";
  }
  
  return "<30"; // default
}

/**
 * Helper: checks if ageRange corresponds to a young user (<=35)
 * Accepts ranges: under 18 ("17"/"meno"), 18-25, 26-35
 * Returns false otherwise
 * @param {string} ageRange
 * @returns {boolean}
 */
function isYoungAgeRange(ageRange) {
  if (!ageRange) return true; // default to young when missing
  const label = ageRange.toLowerCase();
  if (label.includes("17") || label.includes("meno")) return true;
  if (label.includes("18") && label.includes("25")) return true;
  if (label.includes("26") && label.includes("35")) return true;
  return false;
}

/**
 * Calculates all skin metrics from analysis data
 * @param {Object} acneFullData - Acne detection results
 * @param {Object} laxityRednessData - Laxity/redness/dryness results
 * @param {Object} wrinklesData - Wrinkles detection results
 * @returns {Object} Metrics with standardized scales
 */
function calculateSkinMetrics(acneFullData, laxityRednessData, wrinklesData) {
  // Validation
  if (!acneFullData || !laxityRednessData || !wrinklesData) {
    logger.error('Incomplete data in calculateSkinMetrics');
    throw new Error('Incomplete analysis data for metrics calculation');
  }
  
  if (!laxityRednessData.predictions) {
    logger.error('laxityRednessData.predictions missing');
    throw new Error('Invalid laxityRednessData structure');
  }
  
  // Acne (1-4): force to 1 if no-acne, otherwise use severity
  let acne = 1;
  const acneClassification = acneFullData["acne-classification"] || "";
  if (acneClassification.toLowerCase() === "no-acne") {
    acne = 1;
  } else {
    acne = mapSeverityStringToNumber(acneFullData["acne-severity"]);
  }
  
  // Spots/Macchie (1-4): from spot-severity
  const spots = mapSeverityStringToNumber(acneFullData["spot-severity"]);
  
  // Dryness/Secchezza (1-5): from predictedClass
  const dryness = parseInt(laxityRednessData.predictions?.dryness?.predictedClass) || 1;
  
  // Wrinkles/Rughe (1-5): from wrinkleSeverity.overall.severity
  const wrinkles = wrinklesData.wrinkleSeverity?.overall?.severity || 1;
  
  // Pores/Pori: not implemented
  const pores = null;
  
  // Redness/Rossore (1-5): from predictedClass
  const redness = parseInt(laxityRednessData.predictions?.redness?.predictedClass) || 1;
  
  // Laxity/Lassità (1-4): from predictedClass
  const laxity = parseInt(laxityRednessData.predictions?.laxity?.predictedClass) || 1;
  
  logger.info('Skin metrics calculated', {
    acne, spots, dryness, wrinkles, redness, laxity
  });
  
  return {
    acne,
    spots,
    dryness,
    wrinkles,
    pores,
    redness,
    laxity
  };
}

/**
 * Gets benchmark values based on age and gender
 * @param {string} ageRange - Age range string
 * @param {string} gender - Gender string
 * @returns {Object} Benchmark for each metric
 */
function getBenchmarks(ageRange, gender) {
  const ageCategory = mapAgeToCategory(ageRange);
  const genderNormalized = normalizeGender(gender);
  
  // Determine if using male or female/non-binary table
  const isMale = genderNormalized === "male";
  
  // Benchmark for females and non-binary
  const femaleBenchmarks = {
    "<30": { acne: 2, dryness: 1, redness: 1, wrinkles: 1, spots: 1, laxity: 1 },
    "30-40": { acne: 1, dryness: 2, redness: 1.5, wrinkles: 1.8, spots: 1, laxity: 1.5 },
    "41-50": { acne: 1, dryness: 3, redness: 1.5, wrinkles: 3, spots: 2, laxity: 2 },
    ">50": { acne: 1, dryness: 4, redness: 2, wrinkles: 4, spots: 3, laxity: 3 }
  };
  
  // Benchmark for males
  const maleBenchmarks = {
    "<30": { acne: 2, dryness: 1, redness: 1, wrinkles: 1, spots: 1, laxity: 1 },
    "30-40": { acne: 1, dryness: 2, redness: 1.5, wrinkles: 1.8, spots: 1, laxity: 1.5 },
    "41-50": { acne: 1, dryness: 3, redness: 1.5, wrinkles: 3, spots: 2, laxity: 2.5 },
    ">50": { acne: 1, dryness: 4, redness: 2, wrinkles: 4, spots: 3, laxity: 3 }
  };
  
  const benchmarks = isMale ? maleBenchmarks[ageCategory] : femaleBenchmarks[ageCategory];
  
  logger.info('Benchmarks retrieved', { ageCategory, gender: genderNormalized, benchmarks });
  
  return {
    acne: benchmarks.acne,
    spots: benchmarks.spots,
    dryness: benchmarks.dryness,
    wrinkles: benchmarks.wrinkles,
    pores: null, // not implemented
    redness: benchmarks.redness,
    laxity: benchmarks.laxity
  };
}

/**
 * Helper to normalize gender
 */
function normalizeGender(gender) {
  if (!gender) return "non_binary";
  const label = gender.toLowerCase();
  if (label === "maschio" || label === "male") return "male";
  if (label === "femmina" || label === "female") return "female";
  return "non_binary";
}

/**
 * Verifies if user is young (<=35) with acne
 * @param {string} ageRange - Age range string
 * @param {string} acneClassification - Acne classification
 * @returns {boolean}
 */
function isYoungWithAcne(ageRange, acneClassification) {
  const hasAcne = acneClassification && acneClassification.toLowerCase() !== "no-acne";
  const young = isYoungAgeRange(ageRange);
  const result = young && hasAcne;
  
  logger.info('isYoungWithAcne check (<=35)', {
    ageRange,
    young,
    acneClassification,
    hasAcne,
    result
  });
  
  return result;
}

/**
 * Calculates the priority skin condition for SkinRecommendationFunction
 * Based on gap from benchmark and hierarchy weights
 * @param {Object} metrics - User skin metrics
 * @param {Object} benchmarks - Benchmark values
 * @returns {string} Priority skin condition API value
 */
function calculatePrioritySkinCondition(metrics, benchmarks) {
  // Weights hierarchy: dryness=6, pores=5, redness=4, wrinkles=3, spots=2, laxity=1
  const hierarchy = {
    dryness: 6,
    pores: 5,
    redness: 4,
    wrinkles: 3,
    spots: 2,
    laxity: 1
  };
  
  // Calculate gap and weighted scores
  const conditions = [];
  
  if (metrics.dryness > benchmarks.dryness) {
    const gap = metrics.dryness - benchmarks.dryness;
    conditions.push({ 
      name: 'dryness', 
      apiValue: 'dryness',
      score: gap * hierarchy.dryness,
      gap 
    });
  }
  
  if (metrics.redness > benchmarks.redness) {
    const gap = metrics.redness - benchmarks.redness;
    conditions.push({ 
      name: 'redness', 
      apiValue: 'redness',
      score: gap * hierarchy.redness,
      gap 
    });
  }
  
  if (metrics.wrinkles > benchmarks.wrinkles) {
    const gap = metrics.wrinkles - benchmarks.wrinkles;
    conditions.push({ 
      name: 'wrinkles', 
      apiValue: 'wrinkles',
      score: gap * hierarchy.wrinkles,
      gap 
    });
  }
  
  if (metrics.spots > benchmarks.spots) {
    const gap = metrics.spots - benchmarks.spots;
    conditions.push({ 
      name: 'spots', 
      apiValue: 'dark_spots',
      score: gap * hierarchy.spots,
      gap 
    });
  }
  
  if (metrics.laxity > benchmarks.laxity) {
    const gap = metrics.laxity - benchmarks.laxity;
    conditions.push({ 
      name: 'laxity', 
      apiValue: 'skin_laxity',
      score: gap * hierarchy.laxity,
      gap 
    });
  }
  
  // Pores not implemented but included for completeness
  if (metrics.pores && benchmarks.pores && metrics.pores > benchmarks.pores) {
    const gap = metrics.pores - benchmarks.pores;
    conditions.push({ 
      name: 'pores', 
      apiValue: 'large_pores',
      score: gap * hierarchy.pores,
      gap 
    });
  }
  
  // Sort by score descending
  conditions.sort((a, b) => b.score - a.score);
  
  const priorityCondition = conditions.length > 0 ? conditions[0].apiValue : 'dryness';
  
  logger.info('Priority skin condition calculated', { 
    conditions: conditions.map(c => ({ name: c.name, score: c.score })),
    priority: priorityCondition
  });
  
  return priorityCondition;
}

module.exports = {
  calculateSkinMetrics,
  getBenchmarks,
  mapAgeToCategory,
  isYoungWithAcne,
  calculatePrioritySkinCondition,
  mapSeverityStringToNumber,
  mapWrinklesSeverityToNumber
};

