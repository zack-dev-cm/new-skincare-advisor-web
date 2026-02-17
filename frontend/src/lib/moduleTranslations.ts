import i18n from './i18n';

// Mappatura per tradurre i nomi dei moduli dall'inglese all'italiano
export const moduleTranslations: Record<string, string> = {
  // Skincare Morning
  'Cleansing': 'Detergente',
  'Tonic/Serum': 'Tonico/Siero',
  'Pimple Patches': 'Cerotti Anti-Brufolo',
  'Eye Contour': 'Contorno Occhi',
  'Hydration': 'Idratazione',
  'Lip Balm': 'Balsamo Labbra',
  'SPF': 'Protezione Solare',
  
  // Skincare Evening
  'Night Cream': 'Crema Notturna',
  
  // Skincare Weekly
  'Face Mask/Scrub': 'Maschera/Scrub Viso',
  'Eye Patches': 'Cerotti Occhi',
  'Lip Scrub': 'Scrub Labbra',
  
  // Makeup
  'Eye Makeup Remover': 'Struccante Occhi',
  'Makeup Remover': 'Struccante',
  'BB Cream': 'BB Cream',
  'Concealer': 'Correttore',
  'Foundation': 'Fondotinta',
  'Powder': 'Cipria',
  'Bronzer': 'Bronzer',
  'Blush': 'Fard',
  'Highlighter': 'Illuminante',
  'Fixing Spray': 'Spray Fissante',
  'Makeup Brush Disinfectant': 'Disinfettante Pennelli',
  'Beauty Blender Disinfectant': 'Disinfettante Beauty Blender',
  
  // Fallback generici
  'Skincare Step': 'Passo Skincare',
  'SKINCARE STEP': 'PASSO SKINCARE'
};

// Cache per le traduzioni caricate dinamicamente
let dynamicTranslations: Record<string, string> | null = null;

/**
 * Carica le traduzioni dal file di configurazione esterno
 */
async function loadDynamicTranslations(): Promise<Record<string, string>> {
  if (dynamicTranslations) {
    return dynamicTranslations;
  }

  try {
    const response = await fetch('/config/module-translations.json');
    if (response.ok) {
      const config = await response.json();
      const translations: Record<string, string> = {};
      
      // Unisci tutte le traduzioni da tutte le categorie
      Object.values(config).forEach((category: any) => {
        if (typeof category === 'object') {
          Object.assign(translations, category);
        }
      });
      
      dynamicTranslations = translations;
      return translations;
    }
  } catch (error) {
    console.warn('Failed to load dynamic module translations:', error);
  }
  
  return {};
}

/** Lingua supportata per i nomi moduli: solo 'it' ha mappa EN→IT; 'en' e 'es' usano il nome in inglese. */
function shouldTranslateToItalian(): boolean {
  const lng = (i18n.language || i18n.resolvedLanguage || '').split('-')[0];
  return lng === 'it';
}

/**
 * Restituisce il nome del modulo nella lingua corrente (EN/ES = inglese, IT = italiano).
 * @param moduleName - Nome del modulo in inglese (es. "Cleansing")
 * @returns Nome tradotto in italiano se locale=it, altrimenti il nome originale
 */
export function translateModuleName(moduleName: string): string {
  if (!moduleName) return moduleName;
  if (!shouldTranslateToItalian()) return moduleName;

  if (moduleTranslations[moduleName]) return moduleTranslations[moduleName];
  const lower = moduleName.toLowerCase();
  for (const [english, italian] of Object.entries(moduleTranslations)) {
    if (english.toLowerCase() === lower) return italian;
  }
  return moduleName;
}

/**
 * Restituisce il nome del modulo nella lingua corrente (versione async con config esterno).
 * Con locale=en/es restituisce il nome in inglese; con locale=it usa le traduzioni (statiche o da JSON).
 */
export async function translateModuleNameAsync(moduleName: string): Promise<string> {
  if (!moduleName) return moduleName;
  if (!shouldTranslateToItalian()) return moduleName;

  const staticTranslation = translateModuleName(moduleName);
  if (staticTranslation !== moduleName) return staticTranslation;

  try {
    const dynamicTranslations = await loadDynamicTranslations();
    if (dynamicTranslations[moduleName]) return dynamicTranslations[moduleName];
    const lower = moduleName.toLowerCase();
    for (const [english, italian] of Object.entries(dynamicTranslations)) {
      if (english.toLowerCase() === lower) return italian;
    }
  } catch (error) {
    console.warn('Failed to load dynamic module translations:', error);
  }
  return moduleName;
}

/**
 * Traduce un array di nomi di moduli
 * @param moduleNames - Array di nomi di moduli in inglese
 * @returns Array di nomi di moduli tradotti in italiano
 */
export function translateModuleNames(moduleNames: string[]): string[] {
  return moduleNames.map(translateModuleName);
}
