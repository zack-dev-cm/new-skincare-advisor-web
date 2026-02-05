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

/**
 * Traduce il nome di un modulo dall'inglese all'italiano
 * @param moduleName - Nome del modulo in inglese
 * @returns Nome del modulo tradotto in italiano, o il nome originale se non trovato
 */
export function translateModuleName(moduleName: string): string {
  if (!moduleName) return moduleName;
  
  // Cerca corrispondenza esatta nelle traduzioni statiche
  if (moduleTranslations[moduleName]) {
    return moduleTranslations[moduleName];
  }
  
  // Cerca corrispondenza case-insensitive nelle traduzioni statiche
  const lowerModuleName = moduleName.toLowerCase();
  for (const [english, italian] of Object.entries(moduleTranslations)) {
    if (english.toLowerCase() === lowerModuleName) {
      return italian;
    }
  }
  
  // Se non trova corrispondenza, restituisce il nome originale
  return moduleName;
}

/**
 * Traduce il nome di un modulo dall'inglese all'italiano (versione asincrona con caricamento dinamico)
 * @param moduleName - Nome del modulo in inglese
 * @returns Promise che risolve con il nome del modulo tradotto in italiano
 */
export async function translateModuleNameAsync(moduleName: string): Promise<string> {
  if (!moduleName) return moduleName;
  
  // Prima prova con le traduzioni statiche
  const staticTranslation = translateModuleName(moduleName);
  if (staticTranslation !== moduleName) {
    return staticTranslation;
  }
  
  // Poi prova con le traduzioni dinamiche
  try {
    const dynamicTranslations = await loadDynamicTranslations();
    
    // Cerca corrispondenza esatta
    if (dynamicTranslations[moduleName]) {
      return dynamicTranslations[moduleName];
    }
    
    // Cerca corrispondenza case-insensitive
    const lowerModuleName = moduleName.toLowerCase();
    for (const [english, italian] of Object.entries(dynamicTranslations)) {
      if (english.toLowerCase() === lowerModuleName) {
        return italian;
      }
    }
  } catch (error) {
    console.warn('Failed to load dynamic translations:', error);
  }
  
  // Se non trova corrispondenza, restituisce il nome originale
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
