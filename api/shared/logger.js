const appInsights = require('applicationinsights');
const config = require('./config');

const connectionString = config.monitoring.appInsightsConnectionString;
const instrumentationKey = config.monitoring.appInsightsInstrumentationKey;

// Inizializza Application Insights (preferisce instrumentation key per schema legacy)
const appInsightsConfigValue = instrumentationKey || connectionString;
if (appInsightsConfigValue) {
  appInsights.setup(appInsightsConfigValue)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(true)
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
    .start();

  if (instrumentationKey) {
    appInsights.defaultClient.config.instrumentationKey = instrumentationKey;
  }
}

// Client personalizzato per logging
const client = appInsights.defaultClient;

class Logger {
  constructor(functionName) {
    this.functionName = functionName;
  }

  /**
   * Log informativo
   */
  info(message, properties = {}) {
    const enrichedProps = this._enrichProperties(properties);
    console.info(`[${this.functionName}] ${message}`, enrichedProps);
    
    if (client) {
      client.trackTrace({
        message,
        severity: appInsights.Contracts.SeverityLevel.Information,
        properties: enrichedProps
      });
    }
  }

  /**
   * Log di warning
   */
  warn(message, properties = {}) {
    const enrichedProps = this._enrichProperties(properties);
    console.warn(`[${this.functionName}] ${message}`, enrichedProps);
    
    if (client) {
      client.trackTrace({
        message,
        severity: appInsights.Contracts.SeverityLevel.Warning,
        properties: enrichedProps
      });
    }
  }

  /**
   * Log di errore
   */
  error(message, error = null, properties = {}) {
    const enrichedProps = this._enrichProperties(properties);
    if (error) {
      enrichedProps.errorStack = error.stack;
      enrichedProps.errorMessage = error.message;
    }
    
    console.error(`[${this.functionName}] ${message}`, error || '', enrichedProps);
    
    if (client) {
      if (error) {
        client.trackException({
          exception: error,
          properties: enrichedProps
        });
      } else {
        client.trackTrace({
          message,
          severity: appInsights.Contracts.SeverityLevel.Error,
          properties: enrichedProps
        });
      }
    }
  }

  /**
   * Track eventi custom
   */
  trackEvent(name, properties = {}, measurements = {}) {
    const enrichedProps = this._enrichProperties(properties);
    
    if (client) {
      client.trackEvent({
        name,
        properties: enrichedProps,
        measurements
      });
    }
  }

  /**
   * Track metriche custom
   */
  trackMetric(name, value, properties = {}) {
    if (client) {
      client.trackMetric({
        name,
        value,
        properties: this._enrichProperties(properties)
      });
    }
  }

  /**
   * Track dipendenze esterne
   */
  trackDependency(name, data, duration, success, properties = {}) {
    if (client) {
      client.trackDependency({
        name,
        data,
        duration,
        success,
        dependencyTypeName: 'HTTP',
        properties: this._enrichProperties(properties)
      });
    }
  }

  /**
   * Arricchisce le proprietà con metadata
   */
  _enrichProperties(properties) {
    return {
      ...properties,
      functionName: this.functionName,
      timestamp: new Date().toISOString(),
      environment: process.env.AZURE_FUNCTIONS_ENVIRONMENT || 'development'
    };
  }
}

// Factory per creare logger per funzione
function createLogger(functionName) {
  return new Logger(functionName);
}

module.exports = { createLogger, appInsightsClient: client }; 