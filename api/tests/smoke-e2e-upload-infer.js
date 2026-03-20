#!/usr/bin/env node

const DEFAULT_INFER_URL =
  process.env.INFER_URL ||
  'https://new-skincare-advisor-api-fqc8dffvg5ghene2.westeurope-01.azurewebsites.net/api/infer';
const DEFAULT_UPLOAD_URL =
  process.env.UPLOAD_URL ||
  'https://new-skincare-advisor-api-fqc8dffvg5ghene2.westeurope-01.azurewebsites.net/api/upload-url';
const DEFAULT_IMAGE_URL =
  process.env.IMAGE_URL ||
  'https://stdermaselfprdwesteurope.blob.core.windows.net/selfies/uploads/2025-10-31/f9b1f0f9-8c57-4a1e-9bab-53fbe70229e8.jpeg';
const UPLOAD_MIME_TYPE = process.env.UPLOAD_MIME_TYPE || 'image/jpeg';
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '180000', 10);
const INCLUDE_RECOMMENDATIONS =
  (process.env.INCLUDE_RECOMMENDATIONS || 'true').toLowerCase() === 'true';
const EXPECT_WRINKLE_SERVICE_OVERLAYS =
  (process.env.EXPECT_WRINKLE_SERVICE_OVERLAYS || 'false').toLowerCase() === 'true';

async function main() {
  const sourceImage = await fetchWithTimeout(DEFAULT_IMAGE_URL);
  if (!sourceImage.ok) {
    throw new Error(`Failed to download source image: ${sourceImage.status} ${sourceImage.statusText}`);
  }

  const imageBytes = Buffer.from(await sourceImage.arrayBuffer());

  const uploadRes = await fetchJson(DEFAULT_UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: UPLOAD_MIME_TYPE }),
  });

  if (!uploadRes.body?.uploadUrl || !uploadRes.body?.inferenceId) {
    throw new Error(`Upload URL response missing fields: ${JSON.stringify(uploadRes.body)}`);
  }

  const putRes = await fetchWithTimeout(uploadRes.body.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': UPLOAD_MIME_TYPE,
      'x-ms-blob-type': 'BlockBlob',
      'Content-Length': String(imageBytes.length),
    },
    body: imageBytes,
  });

  if (!putRes.ok) {
    throw new Error(`Blob upload failed: ${putRes.status} ${putRes.statusText}`);
  }

  const inferPayload = {
    inferenceId: uploadRes.body.inferenceId,
    includeRecommendations: INCLUDE_RECOMMENDATIONS,
    userData: {
      first_name: 'Lorenzo',
      last_name: 'Musso',
      gender: 'Maschio',
      budget_level: 'High',
      ageRange: '36 - 45',
      shop_domain: 'dermaself',
    },
    metadata: {
      apiVersion: '1.0',
      source: 'node-smoke-e2e',
      clientTimestamp: Date.now(),
    },
  };

  const inferRes = await fetchJson(DEFAULT_INFER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inferPayload),
  });

  const response = inferRes.body;
  const poresOverlayUrl = response?.poresData?.overlay_circles_preview_url || null;
  const wrinkleOverlayUrl = response?.wrinklesData?.service_overlays?.selected_preview_url || null;

  if (!response?.inference_id) {
    throw new Error(`Infer response missing inference_id: ${JSON.stringify(response).slice(0, 1000)}`);
  }

  if (EXPECT_WRINKLE_SERVICE_OVERLAYS && !wrinkleOverlayUrl) {
    throw new Error('Expected wrinklesData.service_overlays.selected_preview_url in infer response');
  }

  const overlayChecks = [];
  if (poresOverlayUrl) {
    overlayChecks.push(checkImageUrl('pores_overlay', poresOverlayUrl));
  }
  if (wrinkleOverlayUrl) {
    overlayChecks.push(checkImageUrl('wrinkle_overlay', wrinkleOverlayUrl));
  }

  const overlayResults = await Promise.all(overlayChecks);

  console.log(
    JSON.stringify(
      {
        upload_url_status: uploadRes.status,
        upload_put_status: putRes.status,
        infer_status: inferRes.status,
        inference_id: response.inference_id,
        partial: response.partial,
        skipped_apis: response.skippedApis || null,
        has_pores_data: response.poresData !== null && response.poresData !== undefined,
        pores_data_keys: response.poresData ? Object.keys(response.poresData) : null,
        wrinkles_data_keys: response.wrinklesData ? Object.keys(response.wrinklesData) : null,
        pores_overlay_url: poresOverlayUrl,
        wrinkle_service_overlay_url: wrinkleOverlayUrl,
        has_wrinkle_service_overlays: Boolean(response?.wrinklesData?.service_overlays),
        wrinkle_service_region_count: response?.wrinklesData?.service_overlays?.regions?.length || 0,
        overlay_checks: overlayResults,
      },
      null,
      2
    )
  );
}

async function checkImageUrl(name, url) {
  const res = await fetchWithTimeout(url, { method: 'GET' });
  return {
    name,
    url,
    status: res.status,
    content_type: res.headers.get('content-type'),
    ok: res.ok,
  };
}

async function fetchJson(url, init) {
  const response = await fetchWithTimeout(url, init);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (error) {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 400)}`);
  }
  if (!response.ok) {
    throw new Error(`Request failed ${response.status} ${response.statusText}: ${JSON.stringify(body).slice(0, 1000)}`);
  }
  return { status: response.status, body };
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
