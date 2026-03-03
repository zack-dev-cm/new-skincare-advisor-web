const axios = require('axios');
const Joi = require('joi');
const pRetry = require('p-retry');
const { ServiceBusClient } = require('@azure/service-bus');

const config = require('../shared/config');
const { createLogger } = require('../shared/logger');
const { rateLimitMiddleware } = require('../shared/rateLimit');
const cache = require('../shared/cache');
const { enrichWithRecommendations } = require('../shared/recommendations');
const { calculateSkinMetrics, getBenchmarks } = require('../shared/skinMetrics');
const { v4: uuidv4 } = require('uuid');

const logger = createLogger('infer');

const disableCache =
  (process.env.DISABLE_INFER_CACHE || '').toLowerCase() === 'true';

// Schema di validazione robusto
const requestSchema = Joi.object({
  mode: Joi.string()
    .valid('full', 'recommendationOnly')
    .default('full'),

  imageUrl: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(2048)
    .optional()
    .custom((value, helpers) => {
      if (!value) return value; // Se non fornito, skip validation
      // Durante i test, permette URL pubblici
      const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
      const isValidPublicUrl = value.startsWith('https://') && (value.includes('.jpg') || value.includes('.jpeg') || value.includes('.png'));
      
      // Valida che sia un URL Azure Blob Storage (pubblico o con SAS) o URL pubblico durante i test
      if (!value.includes('.blob.core.windows.net/') && !(isTestEnvironment && isValidPublicUrl)) {
        return helpers.error('custom.invalidStorageUrl');
      }
      return value;
    })
    .messages({
      'custom.invalidStorageUrl': 'URL deve essere un Azure Blob Storage valido'
    }),
  
  inferenceId: Joi.string().uuid().optional(),
  
  sync: Joi.boolean().default(true),
  userId: Joi.string().max(100).optional(),
  webhookUrl: Joi.string().uri().max(512).optional(),

  // Dati di analisi passati dal client in modalità recommendationOnly
  acneData: Joi.object({
    acne_classification: Joi.string().max(50).optional(),
    acne_severity: Joi.string().max(50).optional(),
    spot_severity: Joi.string().max(50).optional(),
    erythema: Joi.boolean().optional()
  }).optional(),

  skinMetrics: Joi.object({
    acne: Joi.number().optional(),
    spots: Joi.number().optional(),
    dryness: Joi.number().optional(),
    wrinkles: Joi.number().optional(),
    pores: Joi.number().allow(null).optional(),
    redness: Joi.number().optional(),
    laxity: Joi.number().optional()
  }).optional(),

  skinBenchmarks: Joi.object({
    acne: Joi.number().optional(),
    spots: Joi.number().optional(),
    dryness: Joi.number().optional(),
    wrinkles: Joi.number().optional(),
    pores: Joi.number().allow(null).optional(),
    redness: Joi.number().optional(),
    laxity: Joi.number().optional()
  }).optional(),
  
  // Dati utente opzionali per raccomandazioni prodotti
  userData: Joi.object({
    first_name: Joi.string().max(50).optional(),
    last_name: Joi.string().max(50).optional(), 
    birthdate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    ageRange: Joi.string().max(50).optional(),
    gender: Joi.string().max(50).optional(),
    skin_type: Joi.string().max(50).optional(),
    concerns: Joi.array().items(Joi.string().max(50)).optional(),
    budget_level: Joi.string().valid('Low', 'Medium', 'High').optional(),
    shop_domain: Joi.string().max(50).optional()
  }).optional().default({}),
  
  // Flag per includere raccomandazioni prodotti
  includeRecommendations: Joi.boolean().default(true),

  // Codice lingua per raccomandazioni prodotti (opzionale)
  language_code: Joi.string().valid('it', 'en', 'es').optional(),
  
  // Metadati opzionali per tracking e debugging
  metadata: Joi.object({
    source: Joi.string().max(50).optional(),
    fileName: Joi.string().max(255).optional(),
    fileSize: Joi.number().integer().min(0).optional(),
    timestamp: Joi.number().integer().min(0).optional(),
    apiVersion: Joi.string().max(20).optional(),
    clientTimestamp: Joi.number().integer().min(0).optional(),
    mimeType: Joi.string().max(50).optional()
  }).optional()
}).custom((value, helpers) => {
  // In modalità full, almeno uno tra imageUrl e inferenceId deve essere presente
  if (value.mode !== 'recommendationOnly' && !value.imageUrl && !value.inferenceId) {
    return helpers.error('custom.missingImageIdentifier');
  }
  return value;
}).messages({
  'custom.missingImageIdentifier': 'imageUrl o inferenceId deve essere fornito'
});

// Rate limiter per inferenze
const inferRateLimiter = rateLimitMiddleware({
  limit: 20, // 20 inferenze per ora per utente
  window: '1h',
  keyGenerator: (context) => {
    // Priorità: user ID > IP > anonymous
    return context.req.headers['x-user-id'] || 
           context.req.headers['x-forwarded-for'] || 
           'anonymous';
  }
});

// Circuit breaker per Acne Detection Full API
const acneBreaker = cache.createCircuitBreaker(callAcneDetectionFullAPI, {
  timeout: config.acneDetectionFull.timeout,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  name: 'AcneDetectionFullAPI',
  fallback: async (base64Image) => {
    logger.warn('Acne circuit breaker open, returning fallback response');
    return {
      predictions: [],
      "spot-predictions": [],
      "acne-classification": "no-acne",
      "acne-severity": "None",
      "spot-severity": "None",
      image: { width: 0, height: 0 },
      fallback: true
    };
  }
});

// Circuit breaker per Laxity-Redness API
const laxityRednessBreaker = cache.createCircuitBreaker(callLaxityRednessAPI, {
  timeout: config.laxityRedness.timeout,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  name: 'LaxityRednessAPI',
  fallback: async (base64Image) => {
    logger.warn('Laxity-Redness circuit breaker open, returning fallback response');
    return {
      predictions: {
        laxity: { predictedClass: 1, class: "none" },
        redness: { predictedClass: 1, class: "none" },
        dryness: { predictedClass: 1, class: "none" }
      },
      fallback: true
    };
  }
});

// Circuit breaker per Wrinkles API
const wrinklesBreaker = cache.createCircuitBreaker(callWrinklesAPI, {
  timeout: config.wrinkles.timeout,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  name: 'WrinklesAPI',
  fallback: async (base64Image) => {
    logger.warn('Wrinkles circuit breaker open, returning fallback response');
    return {
      inference_id: uuidv4(),
      predictions: [],
      image: { width: 0, height: 0 },
      time: 0,
      wrinkleSeverity: { overall: { severity: 1 } },
      fallback: true,
      message: 'Wrinkles detection service temporarily unavailable'
    };
  }
});

// Circuit breaker per Pores API (Cloud Run)
const poresBreaker = cache.createCircuitBreaker(callPoresAPI, {
  timeout: config.pores.timeout,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  name: 'PoresAPI',
  fallback: async () => {
    logger.warn('Pores circuit breaker open, returning fallback response');
    return null;
  }
});

// Variables globali per Service Bus
let serviceBusClient = null;
let queueSender = null;

async function initServiceBus() {
  if (!process.env.SERVICE_BUS_CONNECTION_STRING || serviceBusClient) return;
  
  try {
    serviceBusClient = new ServiceBusClient(process.env.SERVICE_BUS_CONNECTION_STRING);
    queueSender = serviceBusClient.createSender('inference-queue');
    logger.info('Service Bus initialized');
  } catch (error) {
    logger.error('Failed to initialize Service Bus', error);
  }
}

module.exports = async function (context, req) {
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-forwarded-for',
        'Access-Control-Max-Age': '86400'
      },
      body: {}
    };
    return;
  }
  
  try {
    // Rate limiting
    const rateLimitPassed = await inferRateLimiter(context);
    if (!rateLimitPassed) return;

    // Validazione schema
    const { error, value } = requestSchema.validate(req.body);
    if (error) {
      logger.warn('Validation failed', { error: error.message });
      context.res = {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-forwarded-for'
        },
        body: {
          error: 'Validation Error',
          message: error.details[0].message
        }
      };
      return;
    }

    const {
      mode,
      imageUrl: providedImageUrl,
      inferenceId,
      sync,
      userId,
      webhookUrl,
      userData,
      includeRecommendations,
      language_code,
      metadata,
      acneData,
      skinMetrics: clientSkinMetrics,
      skinBenchmarks: clientSkinBenchmarks
    } = value;

    // Modalità solo raccomandazioni: non richiede immagine né analisi pelle
    if (mode === 'recommendationOnly') {
      const inference_id = inferenceId || uuidv4();

      const normalizedAcneData = acneData || {};
      const acneFullData = {
        'acne-classification':
          normalizedAcneData.acne_classification || 'no-acne',
        'acne-severity':
          normalizedAcneData.acne_severity || 'None',
        'spot-severity':
          normalizedAcneData.spot_severity || 'None',
        image: { width: 0, height: 0 }
      };

      const erythema =
        typeof normalizedAcneData.erythema === 'boolean'
          ? normalizedAcneData.erythema
          : false;

      // Usa metriche/benchmark passate dal client se presenti
      const metrics = clientSkinMetrics || null;
      const benchmarks =
        clientSkinBenchmarks ||
        (metrics
          ? getBenchmarks(
              userData.ageRange || '26-35',
              userData.gender || 'female'
            )
          : null);

      let finalResult = {
        inference_id,
        acneFullData,
        erythema,
        skinMetrics: metrics || undefined,
        skinBenchmarks: benchmarks || undefined,
        isNewScan: true,
        userData: userData,
        recommendationMode: 'recommendationOnly'
      };

      // Enrich con raccomandazioni mantenendo la stessa firma delle funzioni
      if (includeRecommendations) {
        const enriched = await enrichWithRecommendations(finalResult, userData, language_code);
        finalResult = {
          ...enriched,
          recommendationData: enriched.recommendations
        };
        if (!finalResult.recommendations_meta) {
          finalResult.recommendations_meta = {};
        }
        if (!finalResult.recommendations_meta.deprecated_fields) {
          finalResult.recommendations_meta.deprecated_fields = [];
        }
        if (
          !finalResult.recommendations_meta.deprecated_fields.includes(
            'recommendationData'
          )
        ) {
          finalResult.recommendations_meta.deprecated_fields.push(
            'recommendationData'
          );
        }
      }

      context.res = {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers':
            'Content-Type, Authorization, x-user-id, x-forwarded-for'
        },
        // In modalità recommendationOnly ritorniamo solo le recommendations
        body: includeRecommendations ? finalResult.recommendations : null
      };

      const duration = Date.now() - startTime;
      logger.info('Inference completed (recommendationOnly)', {
        mode,
        inference_id,
        duration,
        cached: false,
        metadata: metadata || null
      });

      logger.trackEvent(
        'InferenceCompleted',
        {
          userId,
          mode,
          cached: false,
          metadata: metadata || null
        },
        { duration }
      );

      return;
    }

    // Ricostruisci imageUrl se inferenceId è fornito (modalità full)
    let imageUrl = providedImageUrl;
    if (inferenceId && !imageUrl) {
      const accountName = await config.azure.storage.getAccount();
      const container = config.azure.storage.container;
      const today = new Date().toISOString().split('T')[0];
      // Determina estensione dal mimeType nei metadata o default jpeg
      let ext = 'jpeg'; // default
      if (metadata?.mimeType) {
        const mimeExt = metadata.mimeType.split('/')[1];
        // Normalizza estensioni comuni
        if (mimeExt === 'jpg' || mimeExt === 'jpeg') {
          ext = 'jpeg';
        } else if (mimeExt === 'png') {
          ext = 'png';
        } else if (mimeExt === 'webp') {
          ext = 'webp';
        } else {
          ext = mimeExt;
        }
      }
      imageUrl = `https://${accountName}.blob.core.windows.net/${container}/uploads/${today}/${inferenceId}.${ext}`;
      
      logger.info('Reconstructed imageUrl from inferenceId', {
        inferenceId,
        imageUrl,
        ext,
        mimeType: metadata?.mimeType
      });
    }

    // Validazione input - almeno uno deve essere presente (già validato nello schema)
    if (!imageUrl) {
      logger.warn('Validation failed', { error: 'URL immagine richiesta' });
      context.res = {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-forwarded-for'
        },
        body: { error: 'URL immagine richiesta' }
      };
      return;
    }

    // Validazione formato URL - permette URL pubblici durante i test
    const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
    const isValidAzureUrl = imageUrl.includes('blob.core.windows.net');
    const isValidPublicUrl = imageUrl.startsWith('https://') && (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg') || imageUrl.includes('.png'));
    
    // Debug logging
    logger.info('URL validation debug', {
      imageUrl,
      inferenceId,
      isTestEnvironment,
      isValidAzureUrl,
      isValidPublicUrl,
      startsWithHttps: imageUrl.startsWith('https://'),
      hasImageExtension: imageUrl.includes('.jpg') || imageUrl.includes('.jpeg') || imageUrl.includes('.png'),
      NODE_ENV: process.env.NODE_ENV,
      JEST_WORKER_ID: process.env.JEST_WORKER_ID,
      allEnvVars: Object.keys(process.env).filter(key => key.includes('TEST') || key.includes('JEST'))
    });
    
    // Accetta URL Azure Blob Storage (pubblici o con SAS) o URL pubblici durante i test
    if (!isValidAzureUrl && !(isTestEnvironment && isValidPublicUrl)) {
      logger.warn('Validation failed', { 
        error: 'URL deve essere un Azure Blob Storage valido',
        isTestEnvironment,
        isValidAzureUrl,
        isValidPublicUrl
      });
      context.res = {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-forwarded-for'
        },
        body: { error: 'URL deve essere un Azure Blob Storage valido' }
      };
      return;
    }

    // Verifica permessi SAS solo per URL Azure con SAS token
    if (isValidAzureUrl && imageUrl.includes('?sv=') && !validateSasPermissions(imageUrl)) {
      context.res = {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-forwarded-for'
        },
        body: {
          error: 'Invalid Permissions',
          message: 'URL immagine non ha permessi di lettura'
        }
      };
      return;
    }

    // Inizializza Service Bus se necessario
    await initServiceBus();

    // Se elaborazione asincrona e Service Bus disponibile
    if (!sync && queueSender) {
      const messageId = await enqueueInference({
        imageUrl,
        userId,
        webhookUrl,
        timestamp: new Date().toISOString()
      });

      logger.info('Inference queued', { messageId, imageUrl });
      
      context.res = {
        status: 202, // Accepted
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-forwarded-for'
        },
        body: {
          message: 'Richiesta accettata per elaborazione',
          jobId: messageId,
          status: 'queued'
        }
      };
      return;
    }

    // Elaborazione sincrona
    const cacheKey = `inference:${imageUrl}`;
    
    // Controlla cache
    if (disableCache) {
      logger.info('Cache bypassed via DISABLE_INFER_CACHE flag', { imageUrl });
    }

    const cached = !disableCache ? await cache.get(cacheKey) : null;
    if (cached) {
      logger.info('Cache hit for inference', { imageUrl, cacheDisabled: disableCache });
      context.res = {
        headers: { 
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-forwarded-for'
        },
        body: cached
      };
      return;
    }

    // Esegui chiamate alle tre API in parallelo
    const base64Image = await imageUrlToBase64(imageUrl);
    
    const [acneFullResp, laxityRednessResp, wrinklesResp, poresResp] = await Promise.allSettled([
      pRetry(() => acneBreaker.fire(base64Image), {
        retries: 3,
        onFailedAttempt: error => logger.warn(`Acne attempt ${error.attemptNumber} failed. Retries left: ${error.retriesLeft}`)
      }),
      pRetry(() => laxityRednessBreaker.fire(base64Image), {
        retries: 3,
        onFailedAttempt: error => logger.warn(`Laxity-Redness attempt ${error.attemptNumber} failed. Retries left: ${error.retriesLeft}`)
      }),
      pRetry(() => wrinklesBreaker.fire(base64Image), {
        retries: 3,
        onFailedAttempt: error => logger.warn(`Wrinkles attempt ${error.attemptNumber} failed. Retries left: ${error.retriesLeft}`)
      }),
      // Pores runs without retry to stay within the Azure Functions 60s wall-clock budget
      poresBreaker.fire(base64Image)
    ]);
    
    // Handle fulfilled/rejected responses
    logApiOutcome('AcneDetectionFullAPI', acneFullResp);
    logApiOutcome('LaxityRednessAPI', laxityRednessResp);
    logApiOutcome('WrinklesAPI', wrinklesResp);
    logApiOutcome('PoresAPI', poresResp);

    const acneFullData = acneFullResp.status === 'fulfilled' ? acneFullResp.value : {
      predictions: [],
      "spot-predictions": [],
      "acne-classification": "no-acne",
      "acne-severity": "None",
      "spot-severity": "None",
      image: { width: 0, height: 0 }
    };
    
    const laxityRednessData = laxityRednessResp.status === 'fulfilled' ? laxityRednessResp.value : {
      predictions: {
        laxity: { predictedClass: 1, class: "none" },
        redness: { predictedClass: 1, class: "none" },
        dryness: { predictedClass: 1, class: "none" }
      }
    };
    
    // Add mapped class strings for compatibility with JavaScript frontend
    if (laxityRednessData.predictions) {
      if (laxityRednessData.predictions.laxity) {
        laxityRednessData.predictions.laxity.class = mapLaxityClass(
          laxityRednessData.predictions.laxity.predictedClass
        );
      }
      if (laxityRednessData.predictions.redness) {
        laxityRednessData.predictions.redness.class = mapRednessClass(
          laxityRednessData.predictions.redness.predictedClass
        );
      }
      if (laxityRednessData.predictions.dryness) {
        laxityRednessData.predictions.dryness.class = mapDrynessClass(
          laxityRednessData.predictions.dryness.predictedClass
        );
      }
    }
    
    const wrinklesData = wrinklesResp.status === 'fulfilled' ? wrinklesResp.value : {
      predictions: [],
      image: { width: 0, height: 0 },
      time: 0,
      wrinkleSeverity: { overall: { severity: 1 } }
    };

    // Pores: null when failed/timed-out — skinMetrics.pores stays null gracefully
    const poresData = (poresResp.status === 'fulfilled' && poresResp.value !== null)
      ? poresResp.value
      : null;

    // Calculate erythema from redness predictedClass
    const rednessClass = laxityRednessData.predictions?.redness?.predictedClass || 1;
    const erythema = rednessClass >= 3; // moderate or severe
    
    // Combine predictions and spot-predictions for detectionData
    const detectionData = {
      image: acneFullData.image,
      predictions: [
        ...(acneFullData.predictions || []),
        ...(acneFullData["spot-predictions"] || [])
      ]
    };
    
    // Calculate skin metrics (poresData populates skinMetrics.pores)
    const skinMetrics = calculateSkinMetrics(acneFullData, laxityRednessData, wrinklesData, poresData);
    const skinBenchmarks = getBenchmarks(userData.ageRange || '26-35', userData.gender || 'female');

    // Build final result matching JavaScript structure EXACTLY
    let finalResult = {
      inference_id: inferenceId || uuidv4(),
      // Add base64 image for frontend canvas rendering (with data URI prefix)
      base64: `data:image/jpeg;base64,${base64Image}`,
      // Include all acneFullData fields (predictions, spot-predictions, classifications, severities, image)
      ...acneFullData,
      // Add acneFullData as nested object for recommendations logic
      acneFullData,
      // Add detection data for backward compatibility
      detectionData,
      // Add laxity/redness/dryness data with mapped class strings
      laxityRednessData,
      // Add wrinkles data
      wrinklesData,
      // Add pores data (null if analysis failed or timed out)
      poresData,
      // Add calculated erythema
      erythema,
      // Add skin metrics and benchmarks
      skinMetrics,
      skinBenchmarks,
      // Add isNewScan flag for email/contact updates
      isNewScan: true,
      // Add userData for frontend access (age, gender, etc.)
      userData: userData
    };
    
    // Enrich with recommendations if requested
    if (includeRecommendations) {
      const enriched = await enrichWithRecommendations(finalResult, userData, language_code);
      // Add both "recommendations" and "recommendationData" for JavaScript compatibility
      finalResult = {
        ...enriched,
        recommendationData: enriched.recommendations, // Alias for JavaScript frontend
      };
      // Add deprecation hint
      if (!finalResult.recommendations_meta) finalResult.recommendations_meta = {};
      finalResult.recommendations_meta.deprecated_fields = ['recommendationData'];
    }
    
    // Save to cache only when all APIs returned real data (no fallbacks, pores not null)
    if (!disableCache && !acneFullData.fallback && !laxityRednessData.fallback && !wrinklesData.fallback && poresData !== null) {
      await cache.set(cacheKey, finalResult, 300); // Cache for 5 minutes
    }

    context.res = {
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-forwarded-for'
      },
      body: finalResult
    };

    // Log metriche
    const duration = Date.now() - startTime;
    logger.info('Inference completed', {
      imageUrl,
      duration,
      predictionsCount: (acneFullData.predictions?.length || 0) + (acneFullData["spot-predictions"]?.length || 0),
      acneClassification: acneFullData["acne-classification"],
      acneSeverity: acneFullData["acne-severity"],
      spotSeverity: acneFullData["spot-severity"],
      rednessClass: rednessClass,
      erythema: erythema,
      wrinklesSeverity: wrinklesData.wrinkleSeverity?.overall?.severity,
      wrinklesPredictions: wrinklesData.predictions?.length || 0,
      wrinklesProcessingTime: wrinklesData.time || 0,
      cached: false,
      metadata: metadata || null
    });
 
    logger.trackEvent('InferenceCompleted', {
      userId,
      predictionsCount: (acneFullData.predictions?.length || 0) + (acneFullData["spot-predictions"]?.length || 0),
      acneClassification: acneFullData["acne-classification"],
      acneSeverity: acneFullData["acne-severity"],
      spotSeverity: acneFullData["spot-severity"],
      erythema: erythema,
      wrinklesSeverity: wrinklesData.wrinkleSeverity?.overall?.severity,
      wrinklesPredictions: wrinklesData.predictions?.length || 0,
      cached: false,
      metadata: metadata || null
    }, { duration });

  } catch (error) {
    logger.error('Inference failed', error);
    
    context.res = {
      status: 503,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-forwarded-for'
      },
      body: {
        error: 'Service Unavailable',
        message: 'Servizio temporaneamente non disponibile',
        retryAfter: 30
      }
    };
  }
};

/**
 * Calls Acne Detection Full API (wrapped by circuit breaker)
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<Object>} Acne detection result
 */
async function callAcneDetectionFullAPI(base64Image) {
  const apiUrl = await config.acneDetectionFull.getApiUrl();
  const apiKey = await config.acneDetectionFull.getApiKey();
  const fullUrl = `${apiUrl}?code=${apiKey}`;

  const startTime = Date.now();
  
  try {
    logger.info('Calling Acne Detection Full API', { url: apiUrl });
    
    const response = await axios.post(fullUrl, 
      { base64image: base64Image, code: apiKey },
      { 
        timeout: config.acneDetectionFull.timeout,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const duration = Date.now() - startTime;
    
    logger.info('Acne Detection Full API success', {
      status: response.status,
      duration,
      payload: sanitizeForLogging(response.data)
    });

    return response.data;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Acne Detection Full API failed', {
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      payload: sanitizeForLogging(error.response?.data),
      duration
    });

    // Return fallback
    return {
      predictions: [],
      "spot-predictions": [],
      "acne-classification": "no-acne",
      "acne-severity": "None",
      "spot-severity": "None",
      image: { width: 0, height: 0 },
      error: 'Acne Detection Full API call failed'
    };
  }
}

/**
 * Converte un'immagine da URL a stringa base64.
 * @param {string} imageUrl - L'URL dell'immagine.
 * @returns {Promise<string>} La stringa base64 dell'immagine (senza data URI prefix).
 */
async function imageUrlToBase64(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer'
    });
    
    const imageBuffer = Buffer.from(response.data, 'binary');
    
    logger.info('Image converted to base64', {
      sizeMB: (imageBuffer.length / (1024 * 1024)).toFixed(2)
    });
    
    return imageBuffer.toString('base64');
  } catch (error) {
    logger.error('Failed to convert image URL to base64', { imageUrl, error: error.message });
    throw new Error('Could not fetch or convert image from URL.');
  }
}

/**
 * Maps redness predictedClass to class string
 */
function mapRednessClass(predictedClass) {
  const classNum = parseInt(predictedClass);
  switch(classNum) {
    case 1: return "none";
    case 2: return "mild";
    case 3: return "moderate";
    case 4: return "severe";
    case 5: return "severe";
    default: return "none";
  }
}

/**
 * Maps laxity predictedClass to class string
 */
function mapLaxityClass(predictedClass) {
  const classNum = parseInt(predictedClass);
  switch(classNum) {
    case 1: return "none";
    case 2: return "mild";
    case 3: return "moderate";
    case 4: return "severe";
    default: return "none";
  }
}

/**
 * Maps dryness predictedClass to class string
 */
function mapDrynessClass(predictedClass) {
  const classNum = parseInt(predictedClass);
  switch(classNum) {
    case 1: return "none";
    case 2: return "mild";
    case 3: return "moderate";
    case 4: return "severe";
    case 5: return "severe";
    default: return "none";
  }
}

/**
 * Normalizza la risposta dell'API Laxity-Redness per gestire diversi formati
 * Gestisce sia il formato con predictions come oggetto {laxity: {...}, redness: {...}, dryness: {...}}
 * sia il formato con predictions come dizionario con chiavi numeriche (come restituito da Roboflow)
 * @param {Object} data - Risposta grezza dall'API
 * @returns {Object} Risposta normalizzata
 */
function normalizeLaxityRednessResponse(data) {
  // Helper per convertire predictedClass in number
  const toPredictedClassNumber = (value) => {
    if (value === null || value === undefined) return 1;
    const num = typeof value === 'number' ? value : parseInt(String(value), 10);
    return isNaN(num) ? 1 : num;
  };

  // Se la struttura è già nel formato atteso, normalizzala comunque per garantire che predictedClass sia number
  if (data.predictions && 
      typeof data.predictions === 'object' && 
      !Array.isArray(data.predictions) &&
      (data.predictions.laxity || data.predictions.redness || data.predictions.dryness)) {
    // Verifica che ogni tipo abbia predictedClass e convertilo in number
    const normalizedPredictions = {};
    ['laxity', 'redness', 'dryness'].forEach(type => {
      if (data.predictions[type]) {
        const pred = data.predictions[type];
        normalizedPredictions[type] = {
          ...pred, // Mantieni altri campi
          predictedClass: toPredictedClassNumber(pred.predictedClass || pred.class || pred.class_id),
          confidence: pred.confidence || null
        };
      } else {
        normalizedPredictions[type] = { predictedClass: 1, confidence: null };
      }
    });
    return { ...data, predictions: normalizedPredictions };
  }

  // Se predictions è un dizionario con chiavi diverse (es. chiavi numeriche da Roboflow)
  if (data.predictions && typeof data.predictions === 'object' && !Array.isArray(data.predictions)) {
    const normalizedPredictions = {};
    
    // Se c'è un campo predicted_classes che indica quali classi sono state predette
    const predictedClasses = data.predicted_classes || data.predictedClasses;
    
    // Trova la predizione con la confidence più alta
    let bestClass = null;
    let bestConfidence = -1;
    let bestValue = null;
    
    for (const key in data.predictions) {
      const value = data.predictions[key];
      if (value && typeof value === 'object') {
        const confidence = value.confidence || (typeof value === 'number' ? value : 0);
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestClass = key;
          bestValue = value;
        }
      }
    }
    
    // Estrai predictedClass dalla migliore predizione o dalla chiave stessa
    let predictedClass = null;
    if (bestValue) {
      predictedClass = bestValue.predictedClass || bestValue.class || bestValue.class_id || bestClass;
    } else if (predictedClasses && predictedClasses.length > 0) {
      predictedClass = predictedClasses[0];
    } else if (bestClass) {
      predictedClass = bestClass;
    }
    
    // Converti in number per compatibilità con TypeScript
    const predictedClassNum = toPredictedClassNumber(predictedClass);
    
    // Se abbiamo una sola predizione, usala per tutti i tipi (fallback)
    // Nota: in realtà dovremmo avere predizioni separate per laxity, redness, dryness
    // Questo è un fallback per compatibilità
    normalizedPredictions.laxity = {
      predictedClass: predictedClassNum,
      confidence: bestConfidence >= 0 ? bestConfidence : null
    };
    normalizedPredictions.redness = {
      predictedClass: predictedClassNum,
      confidence: bestConfidence >= 0 ? bestConfidence : null
    };
    normalizedPredictions.dryness = {
      predictedClass: predictedClassNum,
      confidence: bestConfidence >= 0 ? bestConfidence : null
    };
    
    logger.info('Normalized Laxity-Redness response from dictionary format', {
      originalKeys: Object.keys(data.predictions),
      normalizedClass: predictedClass,
      confidence: bestConfidence
    });
    
    return {
      ...data,
      predictions: normalizedPredictions
    };
  }

  // Se predictions è un array, prova a estrarre la prima predizione
  if (Array.isArray(data.predictions) && data.predictions.length > 0) {
    const firstPred = data.predictions[0];
    const predictedClassRaw = firstPred.class || firstPred.class_id || firstPred.predictedClass || '1';
    const predictedClass = toPredictedClassNumber(predictedClassRaw);
    const confidence = firstPred.confidence || null;
    
    return {
      ...data,
      predictions: {
        laxity: { predictedClass: predictedClass, confidence: confidence },
        redness: { predictedClass: predictedClass, confidence: confidence },
        dryness: { predictedClass: predictedClass, confidence: confidence }
      }
    };
  }

  // Se ci sono valori top-level (formato Classify API standard)
  if (data.top || data.confidence || data.predicted_class || data.predictedClass) {
    const predictedClassRaw = data.top || data.predicted_class || data.predictedClass || '1';
    const predictedClass = toPredictedClassNumber(predictedClassRaw);
    const confidence = data.confidence || null;
    
    return {
      ...data,
      predictions: {
        laxity: { predictedClass: predictedClass, confidence: confidence },
        redness: { predictedClass: predictedClass, confidence: confidence },
        dryness: { predictedClass: predictedClass, confidence: confidence }
      }
    };
  }

  // Se non riusciamo a normalizzare, logga un warning e restituisci default
  logger.warn('Unable to normalize Laxity-Redness response, using defaults', {
    predictionsType: typeof data.predictions,
    predictionsIsArray: Array.isArray(data.predictions),
    hasPredictions: !!data.predictions,
    keys: data.predictions ? Object.keys(data.predictions) : [],
    topLevelKeys: Object.keys(data)
  });
  
  return {
    ...data,
    predictions: {
      laxity: { predictedClass: 1, confidence: null },
      redness: { predictedClass: 1, confidence: null },
      dryness: { predictedClass: 1, confidence: null }
    }
  };
}

/**
 * Calls Laxity-Redness-Dryness API (wrapped by circuit breaker)
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<Object>} Laxity/redness/dryness detection result
 */
async function callLaxityRednessAPI(base64Image) {
  const apiUrl = await config.laxityRedness.getApiUrl();
  const apiKey = await config.laxityRedness.getApiKey();
  const fullUrl = `${apiUrl}?code=${apiKey}`;
  
  const startTime = Date.now();

  try {
    logger.info('Calling Laxity-Redness-Dryness API', { url: apiUrl });
    
    const response = await axios.post(fullUrl, 
      { imageBase64: base64Image },
      { 
        timeout: config.laxityRedness.timeout,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    const duration = Date.now() - startTime;
    
    logger.info('Laxity-Redness-Dryness API success', {
      status: response.status,
      duration,
      payload: sanitizeForLogging(response.data)
    });
    
    // Normalizza la risposta per gestire sia il formato con predictions come oggetto
    // con chiavi laxity/redness/dryness, sia il formato con predictions come dizionario
    const normalizedData = normalizeLaxityRednessResponse(response.data);
    
    return normalizedData;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Laxity-Redness-Dryness API failed', { 
      error: error.message,
      status: error.response?.status,
      payload: sanitizeForLogging(error.response?.data),
      duration
    });
    
    // Return fallback
    return {
      predictions: {
        laxity: { predictedClass: 1, class: "none" },
        redness: { predictedClass: 1, class: "none" },
        dryness: { predictedClass: 1, class: "none" }
      },
      error: 'Laxity-Redness-Dryness API call failed'
    };
  }
}

/**
 * Calls Wrinkles Detection API (wrapped by circuit breaker)
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<Object>} Wrinkles detection result
 */
async function callWrinklesAPI(base64Image) {
  const apiUrl = await config.wrinkles.getApiUrl();
  const apiKey = await config.wrinkles.getApiKey();
  const fullUrl = `${apiUrl}?code=${apiKey}`;
  
  const startTime = Date.now();

  try {
    logger.info('Calling Wrinkles API', { url: apiUrl });
    
    const response = await axios.post(fullUrl, 
      { base64image: base64Image, code: apiKey },
      { 
        timeout: config.wrinkles.timeout,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    const duration = Date.now() - startTime;
    const wrinklesData = response.data;
    
    // Add wrinkleSeverity structure if not present
    if (!wrinklesData.wrinkleSeverity) {
      const severityMap = { 'None': 1, 'Mild': 2, 'Moderate': 3, 'Severe': 4 };
      const severityNum = severityMap[wrinklesData.severity] || 1;
      wrinklesData.wrinkleSeverity = {
        overall: { severity: severityNum }
      };
    }
    
    logger.info('Wrinkles API success', {
      status: response.status,
      duration,
      payload: sanitizeForLogging(wrinklesData)
    });
    
    return wrinklesData;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Wrinkles API failed', { 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      payload: sanitizeForLogging(error.response?.data),
      url: fullUrl,
      duration
    });
    
    // Return fallback
    return {
      inference_id: uuidv4(),
      predictions: [],
      image: { width: 0, height: 0 },
      time: 0,
      wrinkleSeverity: { overall: { severity: 1 } },
      error: 'Wrinkles API call failed'
    };
  }
}

/**
 * Calls Pores Detection API on Cloud Run (multipart upload + async polling)
 * @param {string} base64Image - Base64 encoded image (no data URI prefix)
 * @returns {Promise<Object|null>} Pores analysis result, or null on failure
 */
async function callPoresAPI(base64Image) {
  const apiUrl = await config.pores.getApiUrl();
  if (!apiUrl) throw new Error('PORES_API_URL not configured');

  const startTime = Date.now();
  const imageBuffer = Buffer.from(base64Image, 'base64');

  // Build multipart form using Node.js 20 native FormData + Blob
  const form = new FormData();
  form.append('image', new Blob([imageBuffer], { type: 'image/jpeg' }), 'photo.jpg');
  form.append('task', 'pores');
  form.append('run_async', 'true');
  form.append('face_focus', 'true');
  form.append('remove_background', 'true');

  logger.info('Calling Pores API (submit)', { url: apiUrl });

  // Submit the analysis job
  const startResp = await axios.post(`${apiUrl}/v1/analyze`, form, { timeout: 15000 });
  const { job_id, progress_url, results_url } = startResp.data;

  logger.info('Pores API job submitted', { job_id });

  // Poll progress — pipeline on Cloud Run takes 100-250+ s.
  // Budget set to 270s (4.5 min); circuit breaker wraps at 300s (5 min);
  // Azure Function hard limit is 600s (10 min) — all three are now aligned.
  const deadline = Date.now() + 270000;
  let lastStatus = 'pending';
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 1500));
    const prog = await axios.get(`${apiUrl}${progress_url}`, { timeout: 5000 });
    lastStatus = prog.data.status;
    if (lastStatus === 'completed') break;
    if (lastStatus === 'failed') throw new Error(`Pores analysis job failed: ${prog.data.detail || 'unknown reason'}`);
  }

  if (lastStatus !== 'completed') {
    throw new Error('Pores analysis timed out before completion');
  }

  // Fetch final results
  const resultsResp = await axios.get(`${apiUrl}${results_url}`, { timeout: 10000 });
  const r = resultsResp.data;

  const duration = Date.now() - startTime;
  logger.info('Pores API success', {
    job_id,
    duration,
    pore_total: r.summary?.aggregate?.pore_total,
    pore_severity_1_5: r.summary?.aggregate?.pore_severity_1_5
  });

  const poreSeverity = r.summary?.analysis?.pore_severity ?? {};
  const assessment = r.summary?.analysis?.assessment ?? {};
  const poreMetrics = r.summary?.analysis?.pore_metrics ?? {};
  const regionBreakdown = r.summary?.analysis?.region_breakdown ?? {};
  const preprocess = r.preprocess ?? r.summary?.yolo_pores?.preprocess ?? {};

  // Project region bounding boxes — bbox_full is already in original-image pixel space
  const regions = {};
  for (const [region, data] of Object.entries(regionBreakdown)) {
    if (data && typeof data === 'object') {
      regions[region] = {
        bbox_full: data.bbox_full ?? null,     // coordinates on the original selfie (pixels)
        pore_count: data.pores?.metrics?.count ?? 0,
        visible_count: data.pores?.metrics?.visible_count ?? 0,
        visible_fraction: data.pores?.metrics?.visible_fraction ?? null,
        quality_visibility: data.quality?.visibility ?? null,
      };
    }
  }

  return {
    job_id,
    // Aggregate counts + severity (1–5 scale)
    pore_total: r.summary?.aggregate?.pore_total ?? 0,
    pore_severity_1_5: r.summary?.aggregate?.pore_severity_1_5 ?? null,
    pore_size_severity_1_5: r.summary?.aggregate?.pore_size_severity_1_5 ?? null,
    // Severity detail
    score_label: poreSeverity.score_label ?? null,          // "minimal"|"mild"|"moderate"|"high"|"very_high"
    score_0_100: poreSeverity.score_0_100 ?? null,          // normalized 0-100 index
    // Visible pore stats (pores clearly detectable vs low-contrast)
    visible_count: poreMetrics.visible_count ?? null,
    visible_fraction: poreMetrics.visible_fraction ?? null, // 0.0-1.0
    // Assessment flags
    large_pores_present: assessment.large_pores_present ?? null,
    pores_visibility: assessment.pores_visibility ?? null,  // "low"|"medium"|"high"
    // Per-region breakdown with bbox_full in original image coordinates
    // → use these to draw colored region overlays on the selfie in the frontend
    regions,
    // Preprocessor metadata (crop_bbox + resized_scale needed to map crop-space → original space)
    preprocess: {
      crop_bbox: preprocess.crop_bbox ?? null,
      resized_scale: preprocess.resized_scale ?? null,
      resized_from: preprocess.resized_from ?? null,
    },
    // Pre-rendered overlay image — easiest path for frontend display
    overlay_preview_url: r.selected_overlay_preview_url
      ? `${apiUrl}${r.selected_overlay_preview_url}`
      : null,
    overlay_url: r.selected_overlay_url
      ? `${apiUrl}${r.selected_overlay_url}`
      : null,
    // Circles-only overlay: pores rendered as green dots only, no region masks
    overlay_circles_preview_url: r.overlay_preview_urls?.pores_circles
      ? `${apiUrl}${r.overlay_preview_urls.pores_circles}`
      : null,
  };
}

/**
 * Valida permessi SAS nell'URL
 */
function validateSasPermissions(url) {
  // Verifica presenza parametro sp con permesso 'r'
  const urlObj = new URL(url);
  const sp = urlObj.searchParams.get('sp');
  return !sp || sp.includes('r');
}

function logApiOutcome(apiName, result) {
  if (result.status === 'fulfilled') {
    logger.info(`${apiName} settled`, {
      outcome: 'fulfilled',
      payload: sanitizeForLogging(result.value)
    });
  } else {
    logger.warn(`${apiName} settled`, {
      outcome: 'rejected',
      reason: result.reason?.message || result.reason,
      payload: sanitizeForLogging(result.reason?.response?.data)
    });
  }
}

function sanitizeForLogging(data) {
  if (!data) return null;
  try {
    const cloned = JSON.parse(JSON.stringify(data));
    if (cloned.base64) {
      cloned.base64 = '[trimmed base64]';
    }
    if (Array.isArray(cloned.predictions) && cloned.predictions.length > 20) {
      cloned.predictions = cloned.predictions.slice(0, 20);
      cloned.predictions_truncated = true;
    }
    return cloned;
  } catch (error) {
    return '[unserializable payload]';
  }
}

/**
 * Accoda inferenza per elaborazione asincrona
 */
async function enqueueInference(data) {
  const message = {
    body: data,
    contentType: 'application/json',
    messageId: `inf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  
  await queueSender.sendMessages(message);
  return message.messageId;
}
