import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import encoding from 'k6/encoding';

const isBaselineMode = (__ENV.BASELINE_MODE || '').toLowerCase() === 'true';
const baselineFileName = __ENV.BASELINE_FILE || 'baseline-response.json';
const mismatchLogLimit = parseInt(__ENV.MISMATCH_LOG_LIMIT || '5', 10);
const logMismatches = (__ENV.LOG_MISMATCHES || '').toLowerCase() === 'true';

const INFER_URL = __ENV.INFER_URL || 'https://new-skincare-advisor-api-fqc8dffvg5ghene2.westeurope-01.azurewebsites.net/api/infer';
const UPLOAD_URL_ENDPOINT = __ENV.UPLOAD_URL || 'https://new-skincare-advisor-api-fqc8dffvg5ghene2.westeurope-01.azurewebsites.net/api/upload-url';
const SOURCE_IMAGE_URL = __ENV.IMAGE_URL || 'https://stdermaselfprdwesteurope.blob.core.windows.net/selfies/uploads/2025-10-31/f9b1f0f9-8c57-4a1e-9bab-53fbe70229e8.jpeg';
const UPLOAD_MIME_TYPE = __ENV.UPLOAD_MIME_TYPE || 'image/jpeg';

const BASE_USER_DATA = {
  first_name: 'Lorenzo',
  last_name: 'Musso',
  gender: 'Maschio',
  budget_level: 'High',
  ageRange: '36 - 45',
  shop_domain: 'dermaself',
};

const BASE_METADATA = {
  apiVersion: '1.0',
  source: 'k6-e2e-load-test',
};

let baselineReference = null;
let setupArtifact = null;

if (!isBaselineMode) {
  try {
    const raw = open(baselineFileName);
    baselineReference = normalizeResponse(JSON.parse(raw));
  } catch (error) {
    console.warn(`Baseline file "${baselineFileName}" non disponibile o invalido: ${error.message}`);
  }
}

let mismatchesLogged = 0;

export const options = isBaselineMode ? {
  scenarios: {
    baseline_capture: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      gracefulStop: '10s',
    },
  },
} : {
  scenarios: {
    two_minute_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2m',
      gracefulStop: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<5000'],
    infer_status_429: ['count==0'],
    infer_status_503: ['count==0'],
  },
  discardResponseBodies: false,
};

const uploadUrlDuration = new Trend('upload_url_duration');
const uploadPutDuration = new Trend('upload_put_duration');
const inferDuration = new Trend('infer_duration');
const flowOk = new Rate('e2e_flow_ok');
const inferOk = new Rate('infer_ok');
const inferReqs = new Counter('infer_reqs');
const uploadReqs = new Counter('upload_url_reqs');
const uploadPutReqs = new Counter('upload_put_reqs');
const status429 = new Counter('infer_status_429');
const status503 = new Counter('infer_status_503');
const statusOtherErr = new Counter('infer_status_other');
const responseMatch = new Counter('infer_response_match');
const responseMismatch = new Counter('infer_response_mismatch');
const responseInvalid = new Counter('infer_response_invalid');

export function setup() {
  setupArtifact = createArtifact();
  return {
    base64: setupArtifact.base64,
    imageLength: setupArtifact.imageLength,
  };
}

export default function (data) {
  const artifact = ensureArtifact(data);
  if (isBaselineMode) {
    return;
  }

  const flowResult = runFlow(artifact);
  recordResult(flowResult);
  sleep(Math.random() * 0.5);
}

export function handleSummary(data) {
  const artifactForSummary = ensureArtifact(setupArtifact || data?.state?.setupData);
  const summary = {
    startTime: new Date(data.state.testRunDurationMs ? Date.now() - data.state.testRunDurationMs : Date.now()).toISOString(),
    metrics: {
      http_req_duration: data.metrics.http_req_duration,
      http_req_failed: data.metrics.http_req_failed,
      http_reqs: data.metrics.http_reqs,
      upload_url_duration: data.metrics.upload_url_duration,
      upload_put_duration: data.metrics.upload_put_duration,
      infer_duration: data.metrics.infer_duration,
      e2e_flow_ok: data.metrics.e2e_flow_ok,
      infer_ok: data.metrics.infer_ok,
      infer_reqs: data.metrics.infer_reqs,
      infer_status_429: data.metrics.infer_status_429,
      infer_status_503: data.metrics.infer_status_503,
      infer_status_other: data.metrics.infer_status_other,
    },
    thresholds: data.root_group.thresholds,
  };

  const outputs = {
    'summary.json': JSON.stringify(summary, null, 2),
    stdout: '\nSaved summary to summary.json\n',
  };

  if (isBaselineMode) {
    const baselineRun = runFlow(artifactForSummary, { captureOnly: true });
    if (baselineRun.infer.status === 200 && baselineRun.parsedBody) {
      outputs[baselineFileName] = JSON.stringify(baselineRun.parsedBody, null, 2);
    } else {
      outputs['baseline-error.json'] = JSON.stringify({
        uploadStatus: baselineRun.upload.status,
        uploadBodySample: baselineRun.upload.body?.slice?.(0, 512) || null,
        inferStatus: baselineRun.infer.status,
        inferBodySample: baselineRun.infer.body?.slice?.(0, 512) || null,
        parsed: baselineRun.parsedBody ? true : false,
      }, null, 2);
    }
  } else {
    const matches = data.metrics.infer_response_match?.values?.count || 0;
    const mismatches = data.metrics.infer_response_mismatch?.values?.count || 0;
    const invalid = data.metrics.infer_response_invalid?.values?.count || 0;
    outputs['comparison-results.json'] = JSON.stringify({
      baselineFile: baselineFileName,
      baselineLoaded: !!baselineReference,
      matches,
      mismatches,
      invalidResponses: invalid,
    }, null, 2);
  }

  return outputs;
}

function runFlow(artifact, options = {}) {
  if (!artifact || !artifact.imageBody) {
    console.error('Artifact immagine non disponibile, impossibile procedere con PUT/Infer');
    return {
      upload: { status: 0, body: null, timings: { duration: 0 } },
      uploadPut: null,
      infer: { status: 0, body: null, timings: { duration: 0 } },
      parsedBody: null,
    };
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  const uploadUrlRes = http.post(
    UPLOAD_URL_ENDPOINT,
    JSON.stringify({ mimeType: UPLOAD_MIME_TYPE }),
    { headers, timeout: '60s', tags: { endpoint: 'upload-url' } },
  );
  uploadReqs.add(1);
  uploadUrlDuration.add(uploadUrlRes.timings.duration);

  if (uploadUrlRes.status !== 200) {
    return {
      upload: uploadUrlRes,
      uploadPut: null,
      infer: {
        status: 0,
        body: null,
        timings: { duration: 0 },
      },
      parsedBody: null,
    };
  }

  const uploadPayload = safeJson(uploadUrlRes.body);
  const uploadUrl = uploadPayload?.uploadUrl;
  const blobUrl = uploadPayload?.blobUrl || uploadPayload?.blobName;

  if (!uploadUrl || !blobUrl) {
    console.error(`Upload URL response priva di uploadUrl/blobUrl: ${uploadUrlRes.body?.slice?.(0, 256)}`);
    return {
      upload: uploadUrlRes,
      uploadPut: null,
      infer: {
        status: 0,
        body: null,
        timings: { duration: 0 },
      },
      parsedBody: null,
    };
  }

  const payloadLength = artifact?.imageLength ?? artifact?.imageBody?.byteLength ?? 0;

  const putHeaders = {
    'Content-Type': UPLOAD_MIME_TYPE,
    'x-ms-blob-type': 'BlockBlob',
    'Content-Length': String(payloadLength),
  };

  const uploadPutRes = http.put(
    uploadUrl,
    artifact?.imageBody,
    { headers: putHeaders, timeout: '120s', tags: { endpoint: 'blob-upload' } },
  );
  uploadPutReqs.add(1);
  uploadPutDuration.add(uploadPutRes.timings.duration);

  if (uploadPutRes.status >= 400) {
    console.error(`Blob upload failed: status ${uploadPutRes.status}, body: ${uploadPutRes.body?.slice?.(0, 256)}`);
    return {
      upload: uploadUrlRes,
      uploadPut: uploadPutRes,
      infer: {
        status: 0,
        body: null,
        timings: { duration: 0 },
      },
      parsedBody: null,
    };
  }

  const payload = buildInferPayload(blobUrl);
  const inferRes = http.post(
    INFER_URL,
    JSON.stringify(payload),
    { headers, timeout: '60s', tags: { endpoint: 'infer' } },
  );

  inferReqs.add(1);
  inferDuration.add(inferRes.timings.duration);

  let parsedBody = null;
  try {
    parsedBody = inferRes.json();
  } catch (error) {
    // handled downstream
  }

  return {
    upload: uploadUrlRes,
    uploadPut: uploadPutRes,
    infer: inferRes,
    parsedBody,
  };
}

function recordResult(result) {
  const okUpload = result.upload.status === 200;
  const okPut = result.uploadPut && result.uploadPut.status >= 200 && result.uploadPut.status < 400;
  const okInfer = result.infer.status === 200;

  const flowSuccess = okUpload && okPut && okInfer;
  flowOk.add(flowSuccess);
  inferOk.add(okInfer);

  if (!result.parsedBody) {
    if (!okUpload) {
      console.error(`Upload URL failed with status ${result.upload.status} body sample: ${result.upload.body?.slice?.(0, 256)}`);
    } else if (!okPut) {
      console.error(`Upload PUT failed with status ${result.uploadPut?.status}`);
    } else {
      console.error(`Infer response missing JSON; status ${result.infer.status}, body sample: ${result.infer.body?.slice?.(0, 256)}`);
    }
    responseInvalid.add(1);
    if (logMismatches && mismatchesLogged < mismatchLogLimit) {
      mismatchesLogged += 1;
      console.error(`Risposta infer non JSON (status ${result.infer.status})`);
    }
  } else if (baselineReference) {
    const normalized = normalizeResponse(result.parsedBody);
    if (deepEqual(normalized, baselineReference)) {
      responseMatch.add(1);
    } else {
      responseMismatch.add(1);
      if (logMismatches && mismatchesLogged < mismatchLogLimit) {
        mismatchesLogged += 1;
        console.warn(`Payload differente dal baseline (iter ${__ITER}, vu ${__VU})`);
      }
    }
  }

  if (result.infer.status === 429) status429.add(1);
  else if (result.infer.status === 503) status503.add(1);
  else if (result.infer.status >= 400) statusOtherErr.add(1);
}

function buildInferPayload(imageUrl) {
  return {
    imageUrl,
    userData: BASE_USER_DATA,
    includeRecommendations: true,
    metadata: {
      ...BASE_METADATA,
      clientTimestamp: Date.now(),
    },
  };
}

function normalizeResponse(data) {
  const clone = sortObject(JSON.parse(JSON.stringify(data)));
  delete clone.inference_id;
  delete clone.base64;
  delete clone.metadata;

  if (clone.recommendations_meta) {
    delete clone.recommendations_meta.duration;
    delete clone.recommendations_meta.generated_at;
  }

  if (clone.recommendationData) {
    delete clone.recommendationData;
  }

  return clone;
}

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (value && typeof value === 'object') {
    const sorted = {};
    Object.keys(value).sort().forEach((key) => {
      sorted[key] = sortObject(value[key]);
    });
    return sorted;
  }
  return value;
}

function deepEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (a === null || b === null || typeof a !== typeof b) {
    return false;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) {
      return false;
    }
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key) || !deepEqual(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function ensureArtifact(data) {
  if (setupArtifact?.imageBody) {
    return setupArtifact;
  }

  if (data?.base64) {
    const decoded = encoding.b64decode(data.base64, 'binary');
    setupArtifact = {
      imageBody: decoded,
      imageLength: data.imageLength ?? decoded?.byteLength ?? 0,
      base64: data.base64,
    };
    return setupArtifact;
  }

  try {
    setupArtifact = createArtifact();
    return setupArtifact;
  } catch (error) {
    console.error(`Impossibile generare artifact: ${error.message}`);
    return null;
  }
}

function createArtifact() {
  const imageResponse = http.get(SOURCE_IMAGE_URL, { responseType: 'binary', timeout: '120s' });
  if (imageResponse.status !== 200) {
    throw new Error(`Failed to download source image: status ${imageResponse.status}`);
  }

  const buffer = imageResponse.body;
  const imageLength = buffer?.byteLength ?? buffer?.length ?? 0;
  const base64 = encoding.b64encode(buffer);

  return {
    imageBody: buffer,
    imageLength,
    base64,
  };
}


