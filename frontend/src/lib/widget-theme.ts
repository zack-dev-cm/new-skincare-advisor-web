/**
 * Widget Theme Configuration
 *
 * Defines the minimal set of theming properties that merchants can customise
 * from the Shopify Admin.  Each property maps 1:1 to a CSS custom property
 * applied on the widget modal root element at render time.
 *
 * Primary scale steps, header/footer backgrounds, shadow colours, and button
 * hover colour are **not** exposed — they are derived from --primary-600 and
 * the design system on the widget side.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WidgetThemeConfig {
  /** Brand / primary colour → --primary-600 */
  primaryColor: string;
  /** Modal body / header / footer background → --background */
  backgroundColor: string;
  /** Headings and option labels → --foreground */
  textColor: string;
  /** Captions, step counter, inactive tabs → --muted-foreground (optional) */
  mutedTextColor?: string;
  /** Header/footer separators, card borders → --border */
  borderColor: string;
  /** All text in the widget → --kiko-font-family */
  fontFamily: string;
  /** Cards, buttons, option items → --radius */
  borderRadius: string;
  /** Replace src of header logo <img>; if empty, widget default logo is used */
  logoUrl?: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const THEME_DEFAULTS: Required<WidgetThemeConfig> = {
  primaryColor: '#7547F2',
  backgroundColor: '#FFFFFF',
  textColor: '#333333',
  mutedTextColor: '#737373',
  borderColor: '#E5E5E5',
  fontFamily: "'Space Grotesk', system-ui",
  borderRadius: '1rem',
  logoUrl: '',
};

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

/**
 * Convert a hex colour (#RRGGBB) to an HSL string **without** the `hsl()`
 * wrapper, e.g. "256 87% 61%".  This matches the format used in the existing
 * CSS custom properties defined in globals.css.
 */
function hexToHslValues(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 0%';

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Derive a lighter/darker variant of an HSL value string.
 * `delta` is added to the lightness percentage (can be negative for darker).
 */
function shiftLightness(hslValues: string, delta: number): string {
  const parts = hslValues.match(/(\d+)\s+(\d+)%?\s+(\d+)%?/);
  if (!parts) return hslValues;
  const h = parseInt(parts[1]);
  const s = parseInt(parts[2]);
  const l = Math.max(0, Math.min(100, parseInt(parts[3]) + delta));
  return `${h} ${s}% ${l}%`;
}

// ---------------------------------------------------------------------------
// Primary colour scale generator
// ---------------------------------------------------------------------------

/**
 * Generate a full primary colour scale (50–900) from a single hex colour.
 * The input colour maps to the --primary-600 slot; lighter/darker variants
 * are derived automatically.
 */
function generatePrimaryScale(hex: string): Record<string, string> {
  const base = hexToHslValues(hex);

  return {
    '--primary-50': shiftLightness(base, 42),
    '--primary-100': shiftLightness(base, 39),
    '--primary-200': shiftLightness(base, 33),
    '--primary-300': shiftLightness(base, 23),
    '--primary-400': shiftLightness(base, 13),
    '--primary-500': shiftLightness(base, 6),
    '--primary-600': base,
    '--primary-700': shiftLightness(base, -7),
    '--primary-800': shiftLightness(base, -27),
    '--primary-900': shiftLightness(base, -37),
    '--primary': shiftLightness(base, 6), // matches --primary-500
    '--primary-glow': shiftLightness(base, 15),
    '--ring': shiftLightness(base, 6),
    '--violet-fit': base,
  };
}

// ---------------------------------------------------------------------------
// Theme applicator
// ---------------------------------------------------------------------------

/**
 * Apply the merchant theme configuration to a root DOM element by setting
 * CSS custom properties.  If `logoUrl` is provided, the header logo `<img>`
 * `src` is also updated.
 *
 * All design-system derivations (primary scale, shadows, hover shades) are
 * computed from the single `primaryColor` knob.
 */
export function applyThemeConfig(
  rootEl: HTMLElement,
  config: Partial<WidgetThemeConfig>,
): void {
  const c: WidgetThemeConfig = { ...THEME_DEFAULTS, ...config };

  // --- Primary colour scale ---
  const primaryScale = generatePrimaryScale(c.primaryColor);
  for (const [prop, value] of Object.entries(primaryScale)) {
    rootEl.style.setProperty(prop, value);
  }

  // --- Background ---
  const bgHsl = hexToHslValues(c.backgroundColor);
  rootEl.style.setProperty('--background', bgHsl);
  rootEl.style.setProperty('--card', bgHsl);
  rootEl.style.setProperty('--popover', bgHsl);

  // --- Foreground / text ---
  const fgHsl = hexToHslValues(c.textColor);
  rootEl.style.setProperty('--foreground', fgHsl);
  rootEl.style.setProperty('--card-foreground', fgHsl);
  rootEl.style.setProperty('--popover-foreground', fgHsl);

  // --- Muted text ---
  const mutedHsl = hexToHslValues(c.mutedTextColor ?? THEME_DEFAULTS.mutedTextColor);
  rootEl.style.setProperty('--muted-foreground', mutedHsl);

  // --- Border ---
  const borderHsl = hexToHslValues(c.borderColor);
  rootEl.style.setProperty('--border', borderHsl);
  rootEl.style.setProperty('--input', borderHsl);

  // --- Typography ---
  rootEl.style.setProperty('--kiko-font-family', c.fontFamily);
  rootEl.style.fontFamily = c.fontFamily;

  // --- Shape ---
  rootEl.style.setProperty('--radius', c.borderRadius);

  // --- Logo ---
  if (c.logoUrl) {
    const logoImg = rootEl.querySelector('.logo-violet') as HTMLImageElement | null;
    if (logoImg) {
      logoImg.src = c.logoUrl;
    }
  }
}
