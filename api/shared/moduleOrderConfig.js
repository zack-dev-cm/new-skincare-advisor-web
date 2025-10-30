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
      'Makeup Remover',
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

  const stepMap = new Map();
  const normalizedStepMap = new Map();
  for (const m of modules) {
    const title = m.module || m.step || '';
    stepMap.set(title, m);
    normalizedStepMap.set(normalizeModuleName(title), m);
  }

  const ordered = [];
  for (const cfgName of categoryConfig) {
    let step = stepMap.get(cfgName);
    if (!step) {
      const normalized = normalizeModuleName(cfgName);
      step = normalizedStepMap.get(normalized);
    }
    if (step) {
      ordered.push(step);
      stepMap.delete(step.module || step.step);
      normalizedStepMap.delete(normalizeModuleName(step.module || step.step));
    }
  }

  for (const remaining of stepMap.values()) {
    ordered.push(remaining);
  }

  return ordered;
}

module.exports = {
  loadModuleOrderConfig,
  normalizeModuleName,
  findBestModuleMatch,
  reorderWithinCategory
};


