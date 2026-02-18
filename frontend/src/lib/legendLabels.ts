import translations from './legend-translations.json';
import i18n from './i18n';

export type AnalysisView = 'acne' | 'redness' | 'wrinkles';

function toTitleCaseFromSnakeCase(input: string): string {
  if (!input) return input;
  // If already contains spaces, title-case words; otherwise split on underscore
  const words = input.includes('_') ? input.split('_') : input.split(' ');
  return words
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Resolve locale: explicit param > i18n current language > 'en'. */
function resolveLocale(locale?: string): string {
  if (locale && (locale === 'it' || locale === 'en')) return locale;
  const lng = (typeof i18n !== 'undefined' && (i18n.language || i18n.resolvedLanguage))
    ? (i18n.language || i18n.resolvedLanguage).split('-')[0]
    : '';
  return lng === 'it' ? 'it' : 'en';
}

export function getLegendLabel(view: AnalysisView, className: string, locale?: string): string {
  const lng = resolveLocale(locale);
  try {
    const viewMap: any = (translations as any)[view] || {};
    const entry: any = viewMap[className];
    if (entry) {
      return entry[lng] || entry['en'] || className;
    }

    // No explicit entry: provide a safe fallback
    // - For wrinkles often snake_case: convert to Title Case
    // - For acne, className might already be human readable
    if (view === 'wrinkles') {
      return toTitleCaseFromSnakeCase(className);
    }
    return className;
  } catch {
    return className;
  }
}


