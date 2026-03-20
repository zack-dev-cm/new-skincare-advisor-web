const axios = require('axios');
const config = require('./config');
const { createLogger } = require('./logger');
const { isYoungWithAcne, calculateSkinMetrics, getBenchmarks, calculatePrioritySkinCondition } = require('./skinMetrics');
const { mapClassificationToAcneType, mapSeverityToLevel, mapAgeRangeToBirthdate, mapGender } = require('./mappings');
const { loadModuleOrderConfig, findBestModuleMatch, normalizeModuleName, reorderWithinCategory } = require('./moduleOrderConfig');

const logger = createLogger('recommendations');

/**
 * Determines which recommendation API to use and prepares payload
 * @param {Object} inferenceResult - Complete inference result
 * @param {Object} userData - User data including ageRange, gender, etc
 * @returns {Object} Strategy object with useAcneApi flag and relevant data
 */
function determineRecommendationStrategy(inferenceResult, userData) {
  const ageRange = userData.ageRange || '26-35';
  const acneClassification = inferenceResult.acneFullData?.["acne-classification"] || "no-acne";
  
  const youngWithAcne = isYoungWithAcne(ageRange, acneClassification);
  
  if (youngWithAcne) {
    logger.info('Using RecommendationFunction (young with acne)', { ageRange, acneClassification });
    return {
      useAcneApi: true,
      ageRange,
      acneClassification
    };
  } else {
    // Calculate priority skin condition for adults or non-acne users
    let metrics;
    let benchmarks;

    // In modalità recommendationOnly evitiamo di calcolare metriche da dati di analisi mancanti
    if (inferenceResult.recommendationMode === 'recommendationOnly') {
      metrics = inferenceResult.skinMetrics || null;
      benchmarks =
        inferenceResult.skinBenchmarks ||
        (metrics
          ? getBenchmarks(ageRange, userData.gender || 'female')
          : null);

      if (!metrics || !benchmarks) {
        const skinCondition = 'dryness';
        logger.info('Using SkinRecommendationFunction (default condition) in recommendationOnly mode', {
          ageRange,
          skinCondition
        });

        return {
          useAcneApi: false,
          skinCondition,
          ageRange
        };
      }
    } else {
      // Use pre-calculated skinMetrics if available, otherwise calculate
      metrics =
        inferenceResult.skinMetrics ||
        calculateSkinMetrics(
          inferenceResult.acneFullData,
          inferenceResult.laxityRednessData,
          inferenceResult.wrinklesData
        );
      benchmarks =
        inferenceResult.skinBenchmarks ||
        getBenchmarks(ageRange, userData.gender || 'female');
    }

    const skinCondition = calculatePrioritySkinCondition(metrics, benchmarks);
    
    logger.info('Using SkinRecommendationFunction (skin conditions)', { 
      ageRange, 
      skinCondition,
      metrics 
    });
    
    return {
      useAcneApi: false,
      skinCondition,
      ageRange
    };
  }
}

/**
 * Maps inference result to acne recommendation payload
 * @param {Object} inferenceResult - Complete inference result
 * @param {Object} userData - User data
 * @returns {Object} Payload for RecommendationFunction
 */
function mapAcneToRecommendationPayload(inferenceResult, userData, languageCode) {
  const acneFullData = inferenceResult.acneFullData || {};
  const acneClassification = acneFullData["acne-classification"] || "no-acne";
  const acneSeverity = acneFullData["acne-severity"] || "None";
  
  const payload = {
    first_name: userData.first_name || 'User',
    last_name: userData.last_name || '',
    birthdate: mapAgeRangeToBirthdate(userData.ageRange || '26-35'),
    gender: mapGender(userData.gender || 'female'),
    acne_type: mapClassificationToAcneType(acneClassification),
    acne_severity: mapSeverityToLevel(acneSeverity),
    erythema: inferenceResult.erythema || false,
    budget_level: 'High', // Always High as per JavaScript
    shop_domain: userData.shop_domain || 'dermaself'
  };

  if (languageCode) {
    payload.language_code = languageCode;
  }

  logger.info('Mapped to acne recommendation payload', { payload });

  return payload;
}

/**
 * Maps inference result to skin condition recommendation payload
 * @param {Object} inferenceResult - Complete inference result
 * @param {Object} userData - User data
 * @param {string} skinCondition - Priority skin condition
 * @returns {Object} Payload for SkinRecommendationFunction
 */
function mapSkinToRecommendationPayload(inferenceResult, userData, skinCondition, languageCode) {
  const payload = {
    first_name: userData.first_name || 'User',
    last_name: userData.last_name || '',
    birthdate: mapAgeRangeToBirthdate(userData.ageRange || '26-35'),
    gender: mapGender(userData.gender || 'female'),
    skin_condition: skinCondition,
    budget_level: 'High', // Always High as per JavaScript
    shop_domain: userData.shop_domain || 'dermaself'
  };

  if (languageCode) {
    payload.language_code = languageCode;
  }

  logger.info('Mapped to skin recommendation payload', { payload });

  return payload;
}

/**
 * Calls the appropriate recommendations API
 * @param {Object} inferenceResult - Complete inference result
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Recommendations response
 */
async function getProductRecommendations(inferenceResult, userData = {}, languageCode, options = {}) {
  const startTime = Date.now();
  const timeoutMs = Math.max(
    parseInt(options.timeoutMs || '', 10) || config.recommendations.timeout,
    500
  );
  
  try {
    // Determine which API to use
    const strategy = determineRecommendationStrategy(inferenceResult, userData);
    
    let apiUrl, payload;
    
    if (strategy.useAcneApi) {
      // Young with acne: use RecommendationFunction
      apiUrl = config.recommendations.acneApiUrl;
      payload = mapAcneToRecommendationPayload(inferenceResult, userData, languageCode);
    } else {
      // Adults or no acne: use SkinRecommendationFunction
      apiUrl = config.recommendations.skinApiUrl;
      payload = mapSkinToRecommendationPayload(inferenceResult, userData, strategy.skinCondition, languageCode);
    }
    
    logger.info('Calling recommendations API', {
      url: apiUrl,
      useAcneApi: strategy.useAcneApi,
      payload: payload
    });

    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: timeoutMs
    });

    const duration = Date.now() - startTime;

    logger.info('Recommendations API response received', {
      status: response.status,
      duration: duration,
      hasRoutine: !!response.data.skincare_routine,
      routineModules: response.data.skincare_routine?.length || 0
    });

    // Shape response: categorize and order modules server-side
    const shaped = await shapeRecommendationsResponse(response.data, userData);

    return {
      success: true,
      data: shaped,
      duration: duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Recommendations API failed', {
      error: error.message,
      status: error.response?.status,
      duration: duration
    });

    // Return fallback
    return {
      success: false,
      error: error.message,
      fallback: {
        user: {
          first_name: userData.first_name || 'User',
          last_name: userData.last_name || '',
          age: '25',
          gender: mapGender(userData.gender || 'female')
        },
        skincare_routine: [],
        message: 'Raccomandazioni temporaneamente non disponibili'
      },
      duration: duration
    };
  }
}

/**
 * Enriches inference result with product recommendations
 * @param {Object} inferenceResult - Inference result
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Enriched result
 */
async function enrichWithRecommendations(inferenceResult, userData = {}, languageCode, options = {}) {
  try {
    const recommendations = await getProductRecommendations(inferenceResult, userData, languageCode, options);
    
    return {
      ...inferenceResult,
      recommendations: recommendations.success ? recommendations.data : recommendations.fallback,
      recommendations_meta: {
        success: recommendations.success,
        duration: recommendations.duration,
        error: recommendations.error || null
      }
    };
    
  } catch (error) {
    logger.error('Error enriching with recommendations', error);
    
    // Return original result without recommendations on error
    return {
      ...inferenceResult,
      recommendations: null,
      recommendations_meta: {
        success: false,
        error: error.message
      }
    };
  }
}

module.exports = {
  getProductRecommendations,
  enrichWithRecommendations,
  determineRecommendationStrategy,
  mapAcneToRecommendationPayload,
  mapSkinToRecommendationPayload
}; 

/**
 * Shapes recommendations: assigns modules to categories and orders them
 * Preserves product schema and fields.
 */
async function shapeRecommendationsResponse(recData, userData) {
  try {
    // Skip if already shaped
    if (recData && recData.recommendations_version === 2) {
      return recData;
    }

    const config = await loadModuleOrderConfig();

    // Prepare category containers
    const categories = {
      skincare_morning: [],
      skincare_evening: [],
      skincare_weekly: [],
      makeup: []
    };

    const routine = Array.isArray(recData?.skincare_routine) ? recData.skincare_routine : [];

    // Always derive categories from module names (makeup passthrough), regardless of incoming blocks
    for (const block of routine) {
      const modules = Array.isArray(block?.modules) ? block.modules : [];
      for (const module of modules) {
        const moduleName = module.module || 'Skincare Step';
        const apiCategory = String(block?.category || '').toLowerCase();
        const targetCategories = [];

        if (apiCategory === 'makeup') {
          targetCategories.push('makeup');
        } else {
          const inMorning = findBestModuleMatch(moduleName, config.skincare_morning || []) !== null;
          const inEvening = findBestModuleMatch(moduleName, config.skincare_evening || []) !== null;
          const inWeekly = findBestModuleMatch(moduleName, config.skincare_weekly || []) !== null;
          if (inMorning) targetCategories.push('skincare_morning');
          if (inEvening) targetCategories.push('skincare_evening');
          if (inWeekly) targetCategories.push('skincare_weekly');
          if (targetCategories.length === 0) {
            const nameLc = (moduleName || '').toLowerCase();
            if (/(night|notte|evening|sera)/.test(nameLc)) targetCategories.push('skincare_evening');
            if (/(mask|scrub|weekly|settimanale)/.test(nameLc)) targetCategories.push('skincare_weekly');
            if (/(patch)/.test(nameLc)) targetCategories.push('skincare_morning');
            if (targetCategories.length === 0) targetCategories.push('skincare_morning');
          }
        }

        for (const cat of targetCategories) {
          categories[cat].push(module);
        }
      }
    }

    // Reorder each category per config
    categories.skincare_morning = reorderWithinCategory(categories.skincare_morning, config.skincare_morning);
    categories.skincare_evening = reorderWithinCategory(categories.skincare_evening, config.skincare_evening);
    categories.skincare_weekly = reorderWithinCategory(categories.skincare_weekly, config.skincare_weekly);
    categories.makeup = reorderWithinCategory(categories.makeup, config.makeup);

    // Build final blocks array
    const finalBlocks = [];
    for (const key of ['skincare_morning','skincare_evening','skincare_weekly','makeup']) {
      const mods = categories[key];
      if (mods && mods.length) {
        finalBlocks.push({ category: key, modules: mods });
      }
    }

    // Assign step numbers inside each category for consumers that use it
    for (const block of finalBlocks) {
      block.modules = block.modules.map((m, idx) => ({ ...m, stepNumber: idx + 1 }));
    }

    return {
      ...recData,
      skincare_routine: finalBlocks,
      recommendations_version: 2
    };
  } catch (e) {
    logger.warn('Failed shaping recommendations, returning original', { error: e.message });
    return recData;
  }
}
