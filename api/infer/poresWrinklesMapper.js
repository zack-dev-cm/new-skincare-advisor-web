const WRINKLE_REGION_LABELS = {
  forehead: 'Horizontal forehead lines',
  glabellar: 'Glabellar lines',
  crows_feet_left: 'Lateral canthal lines (left)',
  crows_feet_right: 'Lateral canthal lines (right)',
  under_eye_left: 'Infraorbital rhytides (left)',
  under_eye_right: 'Infraorbital rhytides (right)',
  nasolabial_left: 'Nasolabial fold (left)',
  nasolabial_right: 'Nasolabial fold (right)',
  nose: 'Nasal rhytides',
  cheek_left: 'Malar / zygomatic rhytides (left)',
  cheek_right: 'Malar / zygomatic rhytides (right)',
  perioral: 'Perioral rhytides',
};

function toAbsoluteApiUrl(apiUrl, maybePath) {
  if (!maybePath || typeof maybePath !== 'string') return null;
  if (/^https?:\/\//i.test(maybePath)) return maybePath;
  if (!apiUrl) return maybePath;
  if (maybePath.startsWith('/')) return `${apiUrl}${maybePath}`;
  return `${apiUrl}/${maybePath}`;
}

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function deriveWrinkleSeverityFromTotal(wrinkleTotal) {
  const total = Math.max(0, Math.round(toFiniteNumber(wrinkleTotal) ?? 0));
  if (total === 0) return 1;
  if (total <= 10) return 2;
  if (total <= 25) return 3;
  if (total <= 40) return 4;
  return 5;
}

function mapCombinedPoresWrinklesResult(resultPayload, apiUrl) {
  const payload = resultPayload ?? {};
  const summary = payload.summary ?? {};
  const aggregate = summary.aggregate ?? {};
  const analysis = summary.analysis ?? {};
  const assessment = analysis.assessment ?? {};
  const poreSeverity = analysis.pore_severity ?? {};
  const poreMetrics = analysis.pore_metrics ?? {};
  const regionBreakdown = analysis.region_breakdown ?? {};
  const preprocess = payload.preprocess ?? summary.yolo_pores?.preprocess ?? {};

  const poreRegions = {};
  const wrinkleRegions = [];

  for (const [regionKey, regionData] of Object.entries(regionBreakdown)) {
    if (!regionData || typeof regionData !== 'object') {
      continue;
    }

    const poreMetricsByRegion = regionData.pores?.metrics ?? {};
    const wrinkleMetricsByRegion = regionData.wrinkles?.metrics ?? {};
    const wrinkleMaskKey = regionData.wrinkles?.mask_key ?? null;

    poreRegions[regionKey] = {
      bbox_full: regionData.bbox_full ?? null,
      pore_count: poreMetricsByRegion.count ?? 0,
      visible_count: poreMetricsByRegion.visible_count ?? 0,
      visible_fraction: poreMetricsByRegion.visible_fraction ?? null,
      quality_visibility: regionData.quality?.visibility ?? null,
    };

    wrinkleRegions.push({
      key: regionKey,
      label: WRINKLE_REGION_LABELS[regionKey] ?? regionKey,
      color_hex: regionData.wrinkles?.color_hex ?? regionData.color_hex ?? null,
      mask_key: wrinkleMaskKey,
      wrinkle_count: wrinkleMetricsByRegion.count ?? 0,
      bbox_full: regionData.bbox_full ?? null,
      quality_visibility: regionData.quality?.visibility ?? null,
      density_per_mpx: wrinkleMetricsByRegion.density_per_mpx ?? null,
      mean_length_px: wrinkleMetricsByRegion.mean_length_px ?? null,
      median_length_px: wrinkleMetricsByRegion.median_length_px ?? null,
      p90_length_px: wrinkleMetricsByRegion.p90_length_px ?? null,
      median_score: wrinkleMetricsByRegion.median_score ?? null,
      median_linearity_score: wrinkleMetricsByRegion.median_linearity_score ?? null,
      orientation_std_deg: wrinkleMetricsByRegion.orientation_std_deg ?? null,
      preview_url: toAbsoluteApiUrl(apiUrl, wrinkleMaskKey ? payload.mask_overlay_preview_urls?.[wrinkleMaskKey] : null),
      url: toAbsoluteApiUrl(apiUrl, wrinkleMaskKey ? payload.mask_overlay_urls?.[wrinkleMaskKey] : null),
    });
  }

  wrinkleRegions.sort((left, right) => {
    const countDiff = (right.wrinkle_count ?? 0) - (left.wrinkle_count ?? 0);
    if (countDiff !== 0) return countDiff;
    return left.label.localeCompare(right.label);
  });

  const wrinkleTotal = toFiniteNumber(aggregate.wrinkle_total) ?? toFiniteNumber(analysis.wrinkle_metrics?.count) ?? 0;
  const wrinkleFullFacePreviewUrl = toAbsoluteApiUrl(
    apiUrl,
    payload.overlay_preview_urls?.wrinkles ??
      payload.selected_overlay_preview_url ??
      payload.mask_overlay_preview_urls?.wrinkles ??
      payload.selected_mask_overlay_preview_url
  );
  const wrinkleFullFaceUrl = toAbsoluteApiUrl(
    apiUrl,
    payload.overlay_urls?.wrinkles ??
      payload.selected_overlay_url ??
      payload.mask_overlay_urls?.wrinkles ??
      payload.selected_mask_overlay_url
  );

  return {
    poresData: {
      job_id: payload.job_id ?? null,
      pore_total: aggregate.pore_total ?? 0,
      pore_severity_1_5: aggregate.pore_severity_1_5 ?? null,
      pore_size_severity_1_5: aggregate.pore_size_severity_1_5 ?? null,
      score_label: poreSeverity.score_label ?? null,
      score_0_100: poreSeverity.score_0_100 ?? null,
      visible_count: poreMetrics.visible_count ?? null,
      visible_fraction: poreMetrics.visible_fraction ?? null,
      large_pores_present: assessment.large_pores_present ?? null,
      pores_visibility: assessment.pores_visibility ?? null,
      regions: poreRegions,
      preprocess: {
        crop_bbox: preprocess.crop_bbox ?? null,
        resized_scale: preprocess.resized_scale ?? null,
        resized_from: preprocess.resized_from ?? null,
      },
      overlay_preview_url: toAbsoluteApiUrl(apiUrl, payload.selected_overlay_preview_url),
      overlay_url: toAbsoluteApiUrl(apiUrl, payload.selected_overlay_url),
      overlay_circles_preview_url: toAbsoluteApiUrl(apiUrl, payload.overlay_preview_urls?.pores_circles),
    },
    wrinklesData: {
      predictions: [],
      image: { width: 0, height: 0 },
      wrinkleSeverity: {
        overall: {
          severity: deriveWrinkleSeverityFromTotal(wrinkleTotal),
        },
      },
      service_overlays: {
        source: 'poreswrinkles',
        wrinkle_total: wrinkleTotal,
        wrinkles_visibility: assessment.wrinkles_visibility ?? null,
        estimated_age_band: assessment.estimated_age_band ?? null,
        skin_quality_score_0_100: assessment.skin_quality_score_0_100 ?? null,
        selected_region: 'full_face',
        selected_preview_url: wrinkleFullFacePreviewUrl,
        selected_url: wrinkleFullFaceUrl,
        full_face_preview_url: wrinkleFullFacePreviewUrl,
        full_face_url: wrinkleFullFaceUrl,
        regions: wrinkleRegions,
      },
      wrinkleMetrics: analysis.wrinkle_metrics ?? null,
      wrinkleAssessment: assessment,
    },
  };
}

function mergeWrinklesData(legacyWrinklesData, combinedWrinklesData) {
  if (!combinedWrinklesData) {
    return legacyWrinklesData;
  }

  if (!legacyWrinklesData) {
    return combinedWrinklesData;
  }

  const legacyPredictions = Array.isArray(legacyWrinklesData.predictions)
    ? legacyWrinklesData.predictions
    : [];
  const combinedPredictions = Array.isArray(combinedWrinklesData.predictions)
    ? combinedWrinklesData.predictions
    : [];
  const legacySeverity = toFiniteNumber(legacyWrinklesData.wrinkleSeverity?.overall?.severity);
  const combinedSeverity = toFiniteNumber(combinedWrinklesData.wrinkleSeverity?.overall?.severity);
  const hasLegacyDetections = legacyPredictions.length > 0;
  const shouldUseLegacySeverity =
    !legacyWrinklesData.error && (hasLegacyDetections || combinedSeverity === null);

  const merged = {
    ...combinedWrinklesData,
    ...legacyWrinklesData,
    service_overlays: combinedWrinklesData.service_overlays,
    wrinkleMetrics: combinedWrinklesData.wrinkleMetrics,
    wrinkleAssessment: combinedWrinklesData.wrinkleAssessment,
    predictions:
      hasLegacyDetections ? legacyPredictions : combinedPredictions,
    image:
      legacyWrinklesData.image?.width && legacyWrinklesData.image?.height
        ? legacyWrinklesData.image
        : combinedWrinklesData.image,
    wrinkleSeverity:
      shouldUseLegacySeverity && legacySeverity !== null
        ? legacyWrinklesData.wrinkleSeverity
        : combinedWrinklesData.wrinkleSeverity,
  };

  if (legacyWrinklesData.error && combinedWrinklesData.service_overlays?.selected_preview_url) {
    delete merged.error;
  }

  return merged;
}

module.exports = {
  deriveWrinkleSeverityFromTotal,
  mapCombinedPoresWrinklesResult,
  mergeWrinklesData,
  toAbsoluteApiUrl,
};
