const SIZES = { SMALL: 'small', NORMAL: 'normal' } as const;

/**
 * Returns Tailwind/CSS class string for the fit score pill based on percentage and size.
 * - ≥ 71: excellent (green)
 * - 61–70: good (lighter green)
 * - < 61: safe (yellow)
 */
export function getFitPillClass(
  fitPct: number,
  size: 'normal' | 'small' = 'normal'
): string {
  let className = 'fit-pill-normal';
  if (size === SIZES.SMALL) {
    className = 'fit-pill-small';
  }

  let colorPill = 'fit-pill-safe';
  if (fitPct >= 71) {
    colorPill = 'fit-pill-excellent';
  } else if (fitPct >= 61) {
    colorPill = 'fit-pill-good';
  }

  return `${className} ${colorPill}`;
}
