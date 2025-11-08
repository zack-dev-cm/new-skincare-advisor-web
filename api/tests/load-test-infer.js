import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

const isBaselineMode = (__ENV.BASELINE_MODE || '').toLowerCase() === 'true';
const baselineFileName = __ENV.BASELINE_FILE || 'baseline-response.json';
const mismatchLogLimit = parseInt(__ENV.MISMATCH_LOG_LIMIT || '5', 10);
const logMismatches = (__ENV.LOG_MISMATCHES || '').toLowerCase() === 'true';

// Configurazione scenari
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
    http_req_failed: ['rate<0.05'],          // <5% errori
    http_req_duration: ['p(95)<5000'],       // p95 < 5s
    'infer_status_429': ['count==0'],        // idealmente nessun 429
    'infer_status_503': ['count==0'],
  },
  discardResponseBodies: false,
};

// Endpoint e payload (override via env se necessario)
const INFER_URL = __ENV.INFER_URL || 'https://new-skincare-advisor-api-fqc8dffvg5ghene2.westeurope-01.azurewebsites.net/api/infer';
const IMAGE_URL = __ENV.IMAGE_URL || 'https://stdermaselfprdwesteurope.blob.core.windows.net/selfies/uploads/2025-10-31/f9b1f0f9-8c57-4a1e-9bab-53fbe70229e8.jpeg';

const BASE_PAYLOAD = {
  imageUrl: IMAGE_URL,
  userData: {
    first_name: 'Lorenzo',
    last_name: 'Musso',
    gender: 'Maschio',
    budget_level: 'High',
    ageRange: '36 - 45',
    shop_domain: 'dermaself',
  },
  includeRecommendations: true,
  metadata: {
    apiVersion: '1.0',
    clientTimestamp: Date.now(),
    source: 'k6-load-test',
  },
};

// Baseline reference (per run di confronto)
let baselineReference = null;
if (!isBaselineMode) {
  try {
    const raw = open(baselineFileName);
    baselineReference = normalizeResponse(JSON.parse(raw));
  } catch (error) {
    console.warn(`Baseline file "${baselineFileName}" non disponibile o invalido: ${error.message}`);
  }
}

let mismatchesLogged = 0;

// Metriche custom
const inferDuration = new Trend('infer_duration');
const inferOk = new Rate('infer_ok');
const inferReqs = new Counter('infer_reqs');
const status429 = new Counter('infer_status_429');
const status503 = new Counter('infer_status_503');
const statusOtherErr = new Counter('infer_status_other');
const responseMatch = new Counter('infer_response_match');
const responseMismatch = new Counter('infer_response_mismatch');
const responseInvalid = new Counter('infer_response_invalid');

export default function () {
  if (isBaselineMode) {
    return;
  }

  const { res, parsedBody, duration } = executeRequest();

  inferReqs.add(1);
  inferDuration.add(duration);

  const ok = check(res, { 'status is 200': (r) => r.status === 200 });
  inferOk.add(ok);

  if (!parsedBody) {
    responseInvalid.add(1);
    if (logMismatches && mismatchesLogged < mismatchLogLimit) {
      mismatchesLogged += 1;
      console.error(`Risposta non JSON (status ${res.status})`);
    }
  } else if (baselineReference) {
    const normalized = normalizeResponse(parsedBody);
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

  if (res.status === 429) status429.add(1);
  else if (res.status === 503) status503.add(1);
  else if (res.status >= 400) statusOtherErr.add(1);

  // Piccola pausa per jitter
  sleep(Math.random() * 0.5);
}

// Esporta sommario (JSON) per analisi post-run
export function handleSummary(data) {
  const summary = {
    startTime: new Date(data.state.testRunDurationMs ? Date.now() - data.state.testRunDurationMs : Date.now()).toISOString(),
    metrics: {
      http_req_duration: data.metrics.http_req_duration,
      http_req_failed: data.metrics.http_req_failed,
      http_reqs: data.metrics.http_reqs,
      infer_duration: data.metrics.infer_duration,
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
    stdout: `\nSaved summary to summary.json\n`,
  };

  if (isBaselineMode) {
    const baselineRun = executeRequest();
    if (baselineRun.res.status === 200 && baselineRun.parsedBody) {
      outputs[baselineFileName] = JSON.stringify(baselineRun.parsedBody, null, 2);
    } else {
      outputs['baseline-error.json'] = JSON.stringify({
        status: baselineRun.res.status,
        bodySample: baselineRun.res.body?.slice?.(0, 512) || null,
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

function executeRequest() {
  const headers = {
    'Content-Type': 'application/json',
  };

  const payloadObj = buildPayload();
  const payload = JSON.stringify(payloadObj);

  const res = http.post(INFER_URL, payload, { headers, timeout: '60s', tags: { endpoint: 'infer' } });
  let parsedBody = null;
  try {
    parsedBody = res.json();
  } catch (error) {
    // verrà gestito dal chiamante
  }

  return {
    res,
    parsedBody,
    duration: res.timings.duration,
  };
}

function buildPayload() {
  return {
    imageUrl: BASE_PAYLOAD.imageUrl,
    userData: BASE_PAYLOAD.userData,
    includeRecommendations: BASE_PAYLOAD.includeRecommendations,
    metadata: {
      apiVersion: BASE_PAYLOAD.metadata.apiVersion,
      clientTimestamp: Date.now(),
      source: BASE_PAYLOAD.metadata.source,
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
    delete clone.recommendationData; // alias ridondante
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


