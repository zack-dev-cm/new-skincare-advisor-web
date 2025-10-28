const { createLogger } = require('./logger');
const logger = createLogger('WrinklesMetrics');

/**
 * @deprecated This module is deprecated. Wrinkles metrics are now provided directly by the Wrinkles Detection API.
 * The external API returns wrinkleSeverity.overall.severity directly.
 * This function is kept for backward compatibility only.
 * 
 * Calcola le metriche delle rughe dalla risposta dell'API.
 * @param {Array} predictions - Array di predizioni dalle API di rilevamento rughe
 * @returns {Object} Un oggetto con metriche calcolate
 */
function computeWrinklesMetrics(predictions = []) {
  // Valid wrinkle classes (excluding background)
  const validClasses = [
    'bunny_line',
    'crows_feet', 
    'droppy_eyelid',
    'forehead',
    'frown',
    'marionette_line',
    'mental_crease',
    'nasolabial_fold',
    'neck_lines',
    'purse_string',
    'tear_through'
  ];

  // Filter out background predictions and invalid classes
  const filteredPredictions = predictions.filter(p => 
    p.class && p.class !== 'background' && validClasses.includes(p.class)
  );

  // Initialize counts for all valid classes
  const counts = {};
  validClasses.forEach(className => {
    counts[className] = 0;
  });

  let totalConfidence = 0;
  let highConfidencePredictions = 0;

  // Process filtered predictions
  filteredPredictions.forEach(prediction => {
    if (counts.hasOwnProperty(prediction.class)) {
      counts[prediction.class]++;
    }
    
    totalConfidence += prediction.confidence || 0;
    if ((prediction.confidence || 0) > 0.5) {
      highConfidencePredictions++;
    }
  });

  const totalPredictions = filteredPredictions.length;
  const averageConfidence = totalPredictions > 0 ? totalConfidence / totalPredictions : 0;
  
  // Determine severity based on total predictions and confidence
  const severity = getSeverity(totalPredictions, highConfidencePredictions, averageConfidence);
  
  // Group into main categories
  const has_forehead_wrinkles = counts['forehead'] > 0;
  
  const has_expression_lines = (
    counts['bunny_line'] + 
    counts['frown'] + 
    counts['marionette_line'] + 
    counts['mental_crease'] + 
    counts['nasolabial_fold'] + 
    counts['neck_lines'] + 
    counts['purse_string']
  ) > 0;
  
  const has_under_eye_concerns = (
    counts['crows_feet'] + 
    counts['droppy_eyelid'] + 
    counts['tear_through']
  ) > 0;

  logger.info('Wrinkles metrics calculated', {
    totalPredictions,
    highConfidencePredictions, 
    averageConfidence: parseFloat(averageConfidence.toFixed(3)),
    severity,
    has_forehead_wrinkles,
    has_expression_lines,
    has_under_eye_concerns,
    classCounts: counts
  });

  return {
    counts,
    total_predictions: totalPredictions,
    high_confidence_predictions: highConfidencePredictions,
    average_confidence: parseFloat(averageConfidence.toFixed(3)),
    severity,
    has_forehead_wrinkles,
    has_expression_lines,
    has_under_eye_concerns
  };
}

/**
 * Determina la severità delle rughe basata su numero e confidenza delle predizioni
 */
function getSeverity(total, highConfidence, avgConfidence) {
  if (total === 0 || avgConfidence < 0.3) return 'None';
  if (total <= 3 && avgConfidence < 0.6) return 'Mild';
  if (total <= 8 || avgConfidence < 0.7) return 'Moderate';
  return 'Severe';
}

module.exports = { computeWrinklesMetrics };
