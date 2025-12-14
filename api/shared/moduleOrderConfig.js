const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');

const logger = createLogger('moduleOrderConfig');

let cachedConfig = null;

function getConfigFilePath() {
  return path.join(__dirname, 'config', 'module-order.json');
}

function getDefaultConfig() {
  return {
    skincare_morning: [
      'Cleansing',
      'Tonic/Serum',
      'Pimple Patches',
      'Eye Contour',
      'Hydration',
      'Lip Balm',
      'SPF'
    ],
    skincare_evening: [
      'Makeup Remover',
      'Cleansing',
      'Tonic/Serum',
      'Pimple Patches',
      'Eye Contour',
      'Night Cream',
      'Lip Balm'
    ],
    skincare_weekly: [
      'Face Mask/Scrub',
      'Eye Patches',
      'Lip Scrub'
    ],
    makeup: [
      'Eye Makeup Remover',
      'BB Cream',
      'Concealer',
      'Foundation',
      'Powder',
      'Bronzer',
      'Blush',
      'Fixing Spray',
      'Makeup Brush Disinfectant',
      'Beauty Blender Disinfectant'
    ]
  };
}

function normalizeModuleName(moduleName) {
  return (moduleName || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findBestModuleMatch(stepTitle, configModules) {
  const normalizedStep = normalizeModuleName(stepTitle);
  for (const configModule of configModules) {
    if (normalizeModuleName(configModule) === normalizedStep) {
      return configModule;
    }
  }
  for (const configModule of configModules) {
    const normalizedConfig = normalizeModuleName(configModule);
    if (normalizedStep.includes(normalizedConfig) || normalizedConfig.includes(normalizedStep)) {
      return configModule;
    }
  }
  return null;
}

async function loadModuleOrderConfig() {
  if (cachedConfig) return cachedConfig;
  try {
    const filePath = getConfigFilePath();
    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
    const def = getDefaultConfig();
    cachedConfig = {
      skincare_morning: Array.isArray(json.skincare_morning) ? json.skincare_morning : (Array.isArray(json.skincare) ? json.skincare : def.skincare_morning),
      skincare_evening: Array.isArray(json.skincare_evening) ? json.skincare_evening : def.skincare_evening,
      skincare_weekly: Array.isArray(json.skincare_weekly) ? json.skincare_weekly : def.skincare_weekly,
      makeup: Array.isArray(json.makeup) ? json.makeup : def.makeup
    };
    return cachedConfig;
  } catch (err) {
    logger.warn('Failed to read module order config, using defaults', { error: err.message });
    cachedConfig = getDefaultConfig();
    return cachedConfig;
  }
}

function reorderWithinCategory(modules, categoryConfig) {
  if (!Array.isArray(modules) || modules.length === 0) return modules || [];
  if (!Array.isArray(categoryConfig) || categoryConfig.length === 0) return modules;

  // Helper function to check if cfgName matches module name using findBestModuleMatch logic
  function doesConfigNameMatchModule(cfgName, moduleName) {
    if (!cfgName || !moduleName) return false;
    
    const normalizedCfg = normalizeModuleName(cfgName);
    const normalizedModule = normalizeModuleName(moduleName);
    
    // Exact normalized match
    if (normalizedCfg === normalizedModule) return true;
    
    // Partial match (same logic as findBestModuleMatch)
    if (normalizedModule.includes(normalizedCfg) || normalizedCfg.includes(normalizedModule)) {
      return true;
    }
    
    return false;
  }

  // Build maps and list - handle duplicates within same category by keeping all instances
  const stepMap = new Map(); // Maps exact title to first matching module
  const normalizedStepMap = new Map(); // Maps normalized title to first matching module
  const moduleList = []; // Keep all modules with their titles for partial matching
  
  for (const m of modules) {
    const title = m.module || m.step || '';
    // Only set in maps if not already present (first occurrence wins for exact/normalized match)
    if (!stepMap.has(title)) {
      stepMap.set(title, m);
    }
    const normalized = normalizeModuleName(title);
    if (!normalizedStepMap.has(normalized)) {
      normalizedStepMap.set(normalized, m);
    }
    moduleList.push({ module: m, title: title, used: false });
  }

  const ordered = [];
  
  for (const cfgName of categoryConfig) {
    let step = null;
    let stepIndex = -1;
    
    // Try exact match first
    step = stepMap.get(cfgName);
    if (step) {
      // Find first unused instance in moduleList
      for (let i = 0; i < moduleList.length; i++) {
        const { module: m, title, used } = moduleList[i];
        if (!used && (m === step || title === cfgName)) {
          step = m;
          stepIndex = i;
          break;
        }
      }
    }
    
    if (!step) {
      // Try normalized exact match
      const normalized = normalizeModuleName(cfgName);
      step = normalizedStepMap.get(normalized);
      if (step) {
        // Find first unused instance with matching normalized name
        for (let i = 0; i < moduleList.length; i++) {
          const { module: m, title, used } = moduleList[i];
          if (!used && normalizeModuleName(title) === normalized) {
            step = m;
            stepIndex = i;
            break;
          }
        }
      }
    }
    
    if (!step) {
      // Try findBestModuleMatch-style partial matching
      for (let i = 0; i < moduleList.length; i++) {
        const { module: m, title, used } = moduleList[i];
        if (!used && doesConfigNameMatchModule(cfgName, title)) {
          step = m;
          stepIndex = i;
          break;
        }
      }
    }
    
    if (step && stepIndex >= 0) {
      ordered.push(step);
      moduleList[stepIndex].used = true; // Mark as used to avoid duplicates within same category
    }
  }

  // Add remaining modules that weren't in config order
  for (const { module: m, used } of moduleList) {
    if (!used) {
      ordered.push(m);
    }
  }

  return ordered;
}

module.exports = {
  loadModuleOrderConfig,
  normalizeModuleName,
  findBestModuleMatch,
  reorderWithinCategory
};


