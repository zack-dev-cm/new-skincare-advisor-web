const { v4: uuid } = require('uuid');
const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions
} = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
const Joi = require('joi');

const config = require('../shared/config');
const { createLogger } = require('../shared/logger');
const { rateLimitMiddleware } = require('../shared/rateLimit');

const logger = createLogger('upload-url');

// Schema di validazione
const requestSchema = Joi.object({
  mimeType: Joi.string()
    .required()
    .valid('image/jpeg', 'image/jpg', 'image/png', 'image/webp')
    .messages({
      'any.only': 'Formato immagine non supportato. Usa JPEG, PNG o WebP',
      'any.required': 'mimeType è obbligatorio'
    }),
  metadata: Joi.object({
    userId: Joi.string().optional(),
    source: Joi.string().optional()
  }).optional()
});

// Rate limiter specifico per upload
const uploadRateLimiter = rateLimitMiddleware({
  limit: 30, // 30 upload per ora per utente
  window: '1h',
  keyGenerator: (context) => {
    // Priorità: user ID > IP > anonymous
    return context.req.headers['x-user-id'] || 
           context.req.headers['x-forwarded-for'] || 
           'anonymous';
  }
});

module.exports = async function (context, req) {
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
        'Content-Type': 'application/json'
      },
      body: {}
    };
    return;
  }
  
  try {
    // Rate limiting
    const rateLimitPassed = await uploadRateLimiter(context);
    if (!rateLimitPassed) return; // Response già impostata dal middleware

    // Validazione input
    const { error, value } = requestSchema.validate(req.body);
    if (error) {
      logger.warn('Validation failed', { error: error.message });
          context.res = {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      },
      body: {
        error: 'Validation Error',
        message: error.details[0].message
      }
    };
      return;
    }

    const { mimeType, metadata = {} } = value;
    
    // Genera inferenceId (UUID) e nome file univoco
    const inferenceId = uuid();
    const ext = mimeType.split('/')[1];
    const fileName = `${inferenceId}.${ext}`;
    const blobName = `uploads/${new Date().toISOString().split('T')[0]}/${fileName}`;

    // Inizializza blob client
    const blobClient = await getBlobClient(blobName);
    
    // Genera SAS token con permessi limitati (solo scrittura, no lettura)
    // NOTA: L'uploadUrl contiene il path completo del blob, necessario per upload diretto.
    // Il token SAS ha solo permessi di scrittura (sp=w) e scade dopo 15 minuti.
    // Il path è visibile ma il file non può essere scaricato senza permessi di lettura.
    const sasToken = await generateSasToken(blobClient, 'w'); // Solo scrittura
    const uploadUrl = `${blobClient.url}?${sasToken}`;
    
    // Verifica che il token abbia solo permessi di scrittura
    if (!sasToken.includes('sp=w') || sasToken.includes('sp=rw') || sasToken.includes('sp=r')) {
      logger.warn('SAS token may have incorrect permissions', { sasToken: sasToken.substring(0, 50) });
    }

    // Log evento
    logger.info('Upload URL generated', {
      blobName,
      inferenceId,
      mimeType,
      metadata,
      uploadUrl: uploadUrl,
      duration: Date.now() - startTime
    });
    
    logger.trackEvent('UploadUrlGenerated', {
      mimeType,
      userId: metadata.userId,
      source: metadata.source
    });

    context.res = {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      },
      body: {
        uploadUrl,
        inferenceId,
        expiresAt: new Date(Date.now() + config.limits.uploadUrlTTL * 1000).toISOString()
      }
    };

  } catch (error) {
    logger.error('Failed to generate upload URL', error);
    
    context.res = {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      },
      body: {
        error: 'Internal Server Error',
        message: 'Impossibile generare URL di upload'
      }
    };
  }
};

/**
 * Ottieni blob client con autenticazione appropriata
 */
async function getBlobClient(blobName) {
  const accountName = await config.azure.storage.getAccount();
  const accountKey = await config.azure.storage.getKey();
  
  let credential;
  if (accountKey) {
    // Usa chiave se disponibile (dev/legacy)
    credential = new StorageSharedKeyCredential(accountName, accountKey);
  } else {
    // Usa Managed Identity in produzione
    credential = new DefaultAzureCredential();
  }
  
  const blobServiceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    credential
  );
  
  const containerClient = blobServiceClient.getContainerClient(config.azure.storage.container);
  return containerClient.getBlobClient(blobName);
}

/**
 * Genera SAS token con permessi specifici
 */
async function generateSasToken(blobClient, permissions = 'r') {
  const accountName = await config.azure.storage.getAccount();
  const accountKey = await config.azure.storage.getKey();
  
  if (!accountKey) {
    throw new Error('Storage key required for SAS generation');
  }
  
  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  
  const sasOptions = {
    containerName: config.azure.storage.container,
    blobName: blobClient.name,
    permissions: BlobSASPermissions.parse(permissions),
    startsOn: new Date(Date.now() - 5 * 60 * 1000), // 5 min prima per clock skew
    expiresOn: new Date(Date.now() + config.limits.uploadUrlTTL * 1000),
    protocol: 'https'
  };
  
  return generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
}

/**
 * Restituisce sempre un URL pubblico per garantire accesso a servizi esterni come Roboflow.
 */
async function getReadUrl(blobClient) {
  // Per container pubblico, usa l'URL base senza SAS token
  const publicUrl = blobClient.url;
  
  // Log dettagliato per debugging
  logger.info('Generated public URL', {
    blobName: blobClient.name,
    blobUrl: blobClient.url,
    publicUrl: publicUrl,
    containerPublic: true
  });
  
  return publicUrl;
}
