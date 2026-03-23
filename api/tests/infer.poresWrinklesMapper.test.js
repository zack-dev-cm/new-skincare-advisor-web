const {
  deriveWrinkleSeverityFromTotal,
  mapCombinedPoresWrinklesResult,
  mergeWrinklesData,
} = require('../infer/poresWrinklesMapper');

describe('poresWrinklesMapper', () => {
  const apiUrl = 'https://gpu.example.com';

  const samplePayload = {
    selected_overlay_preview_url: '/v1/results/job-123/overlay/combined?format=jpg',
    selected_overlay_url: '/v1/results/job-123/overlay/combined',
    overlay_preview_urls: {
      pores_circles: '/v1/results/job-123/overlay/pores_circles?format=jpg',
      wrinkles: '/v1/results/job-123/overlay/wrinkles?format=jpg',
    },
    overlay_urls: {
      wrinkles: '/v1/results/job-123/overlay/wrinkles',
    },
    mask_overlay_preview_urls: {
      wrinkles: '/v1/results/job-123/mask-overlay/wrinkles?format=jpg',
      wrinkles_forehead: '/v1/results/job-123/mask-overlay/wrinkles_forehead?format=jpg',
    },
    mask_overlay_urls: {
      wrinkles: '/v1/results/job-123/mask-overlay/wrinkles',
      wrinkles_forehead: '/v1/results/job-123/mask-overlay/wrinkles_forehead',
    },
    summary: {
      aggregate: {
        pore_total: 12,
        pore_severity_1_5: 2,
        pore_size_severity_1_5: 3,
        wrinkle_total: 18,
      },
      analysis: {
        assessment: {
          pores_visibility: 'medium',
          wrinkles_visibility: 'medium',
          estimated_age_band: '18-35',
          skin_quality_score_0_100: 61,
          large_pores_present: false,
        },
        pore_severity: {
          score_label: 'mild',
          score_0_100: 41,
        },
        pore_metrics: {
          visible_count: 9,
          visible_fraction: 0.75,
        },
        wrinkle_metrics: {
          count: 18,
          density_per_mpx: 44.5,
        },
        region_breakdown: {
          forehead: {
            bbox_full: { x0: 10, y0: 20, x1: 100, y1: 120 },
            color_hex: '#B8A8FF',
            pores: {
              metrics: {
                count: 4,
                visible_count: 3,
                visible_fraction: 0.75,
              },
            },
            quality: {
              visibility: 'high',
            },
            wrinkles: {
              mask_key: 'wrinkles_forehead',
              color_hex: '#B8A8FF',
              metrics: {
                count: 18,
                density_per_mpx: 123.4,
                mean_length_px: 35.2,
              },
            },
          },
          glabellar: {
            bbox_full: { x0: 30, y0: 25, x1: 80, y1: 90 },
            color_hex: '#FF7FA3',
            wrinkles: {
              mask_key: 'wrinkles_glabellar',
              color_hex: '#FF7FA3',
              metrics: {
                count: 4,
              },
            },
          },
        },
      },
    },
  };

  test('maps combined service payload into pores and wrinkle contracts', () => {
    const mapped = mapCombinedPoresWrinklesResult({ ...samplePayload, job_id: 'job-123' }, apiUrl);

    expect(mapped.poresData.job_id).toBe('job-123');
    expect(mapped.poresData.overlay_circles_preview_url).toBe(
      'https://gpu.example.com/v1/results/job-123/overlay/pores_circles?format=jpg'
    );
    expect(mapped.poresData.regions.forehead.pore_count).toBe(4);

    expect(mapped.wrinklesData.wrinkleSeverity.overall.severity).toBe(3);
    expect(mapped.wrinklesData.service_overlays.selected_preview_url).toBe(
      'https://gpu.example.com/v1/results/job-123/overlay/wrinkles?format=jpg'
    );
    expect(mapped.wrinklesData.service_overlays.regions).toHaveLength(2);
    expect(mapped.wrinklesData.service_overlays.regions[0]).toMatchObject({
      key: 'forehead',
      label: 'Horizontal forehead lines',
      color_hex: '#B8A8FF',
      wrinkle_count: 18,
      preview_url: 'https://gpu.example.com/v1/results/job-123/mask-overlay/wrinkles_forehead?format=jpg',
    });
    expect(mapped.wrinklesData.service_overlays.regions[1]).toMatchObject({
      key: 'glabellar',
      label: 'Glabellar lines',
      color_hex: '#FF7FA3',
      wrinkle_count: 4,
    });
  });

  test('merge keeps legacy polygons and severity while attaching service overlays', () => {
    const combined = mapCombinedPoresWrinklesResult(samplePayload, apiUrl).wrinklesData;
    const legacy = {
      predictions: [
        {
          class: 'forehead',
          confidence: 0.9,
          width: 10,
          height: 10,
          x: 100,
          y: 100,
        },
      ],
      image: { width: 1024, height: 1024 },
      wrinkleSeverity: { overall: { severity: 4 } },
      severity: 'Severe',
    };

    const merged = mergeWrinklesData(legacy, combined);

    expect(merged.predictions).toHaveLength(1);
    expect(merged.image).toEqual({ width: 1024, height: 1024 });
    expect(merged.wrinkleSeverity.overall.severity).toBe(4);
    expect(merged.service_overlays.regions[0].key).toBe('forehead');
  });

  test('merge prefers combined severity when legacy payload is only a fallback error', () => {
    const combined = mapCombinedPoresWrinklesResult(samplePayload, apiUrl).wrinklesData;
    const legacyFallback = {
      predictions: [],
      image: { width: 0, height: 0 },
      wrinkleSeverity: { overall: { severity: 1 } },
      error: 'Wrinkles API call failed',
    };

    const merged = mergeWrinklesData(legacyFallback, combined);

    expect(merged.predictions).toEqual([]);
    expect(merged.wrinkleSeverity.overall.severity).toBe(3);
    expect(merged.error).toBeUndefined();
    expect(merged.service_overlays.selected_preview_url).toContain('/overlay/wrinkles');
  });

  test('derives stable wrinkle severity buckets from totals', () => {
    expect(deriveWrinkleSeverityFromTotal(0)).toBe(1);
    expect(deriveWrinkleSeverityFromTotal(8)).toBe(2);
    expect(deriveWrinkleSeverityFromTotal(18)).toBe(3);
    expect(deriveWrinkleSeverityFromTotal(34)).toBe(4);
    expect(deriveWrinkleSeverityFromTotal(51)).toBe(5);
  });
});
