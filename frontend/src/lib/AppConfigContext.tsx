'use client';

import React, { createContext, useContext } from 'react';
import { AppConfig } from '@/types/app-config';

/**
 * Default configuration for the app
 * This maintains backward compatibility with existing implementations
 * by enabling cart and using standalone mode by default
 */
const defaultConfig: AppConfig = {
  mode: 'standalone',
  enableCart: true,
  enableShopifyIntegration: false,
  skipOnboarding: false,
};

/**
 * Context for app-wide configuration
 * Allows different pages to run in different modes (Shopify, Demo, Standalone)
 */
export const AppConfigContext = createContext<AppConfig>(defaultConfig);

/**
 * Hook to access the current app configuration
 * Always returns a valid config (defaults to standalone mode if no provider)
 */
export function useAppConfig(): AppConfig {
  const context = useContext(AppConfigContext);
  return context || defaultConfig;
}

/**
 * Provider component for app configuration
 */
export function AppConfigProvider({ 
  children, 
  config 
}: { 
  children: React.ReactNode; 
  config: AppConfig;
}) {
  return (
    <AppConfigContext.Provider value={config}>
      {children}
    </AppConfigContext.Provider>
  );
}
