import translations from './legend-translations.json';

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

export function getLegendLabel(view: AnalysisView, className: string, locale: string = 'it'): string {
  try {
    const viewMap: any = (translations as any)[view] || {};
    const entry: any = viewMap[className];
    if (entry) {
      return entry[locale] || entry['en'] || className;
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


