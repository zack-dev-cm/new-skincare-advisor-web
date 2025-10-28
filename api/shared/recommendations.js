const axios = require('axios');
const config = require('./config');
const { createLogger } = require('./logger');
const { isYoungWithAcne, calculateSkinMetrics, getBenchmarks, calculatePrioritySkinCondition } = require('./skinMetrics');
const { mapClassificationToAcneType, mapSeverityToLevel, mapAgeRangeToBirthdate, mapGender } = require('./mappings');

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
    // Use pre-calculated skinMetrics if available, otherwise calculate
    const metrics = inferenceResult.skinMetrics || calculateSkinMetrics(
      inferenceResult.acneFullData,
      inferenceResult.laxityRednessData,
      inferenceResult.wrinklesData
    );
    const benchmarks = inferenceResult.skinBenchmarks || getBenchmarks(ageRange, userData.gender || 'female');
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
function mapAcneToRecommendationPayload(inferenceResult, userData) {
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
function mapSkinToRecommendationPayload(inferenceResult, userData, skinCondition) {
  const payload = {
    first_name: userData.first_name || 'User',
    last_name: userData.last_name || '',
    birthdate: mapAgeRangeToBirthdate(userData.ageRange || '26-35'),
    gender: mapGender(userData.gender || 'female'),
    skin_condition: skinCondition,
    budget_level: 'High', // Always High as per JavaScript
    shop_domain: userData.shop_domain || 'dermaself'
  };

  logger.info('Mapped to skin recommendation payload', { payload });

  return payload;
}

/**
 * Calls the appropriate recommendations API
 * @param {Object} inferenceResult - Complete inference result
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Recommendations response
 */
async function getProductRecommendations(inferenceResult, userData = {}) {
  const startTime = Date.now();
  
  try {
    // Determine which API to use
    const strategy = determineRecommendationStrategy(inferenceResult, userData);
    
    let apiUrl, payload;
    
    if (strategy.useAcneApi) {
      // Young with acne: use RecommendationFunction
      apiUrl = config.recommendations.acneApiUrl;
      payload = mapAcneToRecommendationPayload(inferenceResult, userData);
    } else {
      // Adults or no acne: use SkinRecommendationFunction
      apiUrl = config.recommendations.skinApiUrl;
      payload = mapSkinToRecommendationPayload(inferenceResult, userData, strategy.skinCondition);
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
      timeout: config.recommendations.timeout
    });

    const duration = Date.now() - startTime;

    logger.info('Recommendations API response received', {
      status: response.status,
      duration: duration,
      hasRoutine: !!response.data.skincare_routine,
      routineModules: response.data.skincare_routine?.length || 0
    });

    return {
      success: true,
      data: response.data,
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
async function enrichWithRecommendations(inferenceResult, userData = {}) {
  try {
    const recommendations = await getProductRecommendations(inferenceResult, userData);
    
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
