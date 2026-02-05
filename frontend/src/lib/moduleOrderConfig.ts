/**
 * Deprecated: Module ordering is performed server-side by infer.
 * This file is retained temporarily for backward compatibility and will be removed.
 */

export interface ModuleOrderConfig {
  skincare_morning: string[];
  skincare_evening: string[];
  skincare_weekly: string[];
  makeup: string[];
}

// Default fallback order (same as config file for consistency)
const DEFAULT_MODULE_ORDER: ModuleOrderConfig = {
  skincare_morning: [
    "Cleansing",
    "Tonic/Serum", 
    "Pimple Patches",
    "Eye Contour",
    "Hydration",
    "Lip Balm",
    "SPF"
  ],
  skincare_evening: [
    "Cleansing",
    "Tonic/Serum", 
    "Pimple Patches",
    "Eye Contour",
    "Night Cream",
    "Lip Balm"
  ],
  skincare_weekly: [
    "Face Mask/Scrub",
    "Eye Patches",
    "Lip Scrub"
  ],
  makeup: [
    "Eye Makeup Remover",
    "Makeup Remover",
    "BB Cream",
    "Concealer", 
    "Foundation",
    "Powder",
    "Bronzer",
    "Blush",
    "Highlighter",
    "Fixing Spray",
    "Makeup Brush Disinfectant",
    "Beauty Blender Disinfectant"
  ]
};

let cachedConfig: ModuleOrderConfig | null = null;

/**
 * Loads the module order configuration from the JSON file
 * Falls back to default order if file doesn't exist or is invalid
 */
export async function loadModuleOrderConfig(): Promise<ModuleOrderConfig> {
  // Server now dictates module ordering; return defaults for legacy fallbacks only
  cachedConfig = DEFAULT_MODULE_ORDER;
  return cachedConfig;
}

/**
 * Reorders routine steps based on the configuration
 * @param routineSteps - Array of routine steps from API
 * @param config - Module order configuration
 * @returns Reordered routine steps
 */
export function reorderRoutineSteps(routineSteps: any[], config: ModuleOrderConfig): any[] {
  // No-op; ordering is server-side now
  return routineSteps || [];
}

/**
 * Utility function to check if a module name matches (case-insensitive, flexible matching)
 */
export function normalizeModuleName(moduleName: string): string {
  return moduleName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Utility function to find best match for module names (handles variations)
 */
export function findBestModuleMatch(
  stepTitle: string, 
  configModules: string[]
): string | null {
  const normalizedStep = normalizeModuleName(stepTitle);
  
  // Try exact match first
  for (const configModule of configModules) {
    if (normalizeModuleName(configModule) === normalizedStep) {
      return configModule;
    }
  }

  // Try partial match
  for (const configModule of configModules) {
    const normalizedConfig = normalizeModuleName(configModule);
    if (normalizedStep.includes(normalizedConfig) || normalizedConfig.includes(normalizedStep)) {
      return configModule;
    }
  }

  return null;
}
