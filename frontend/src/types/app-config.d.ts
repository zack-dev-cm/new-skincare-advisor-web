/**
 * App Configuration Types
 * 
 * Defines the different modes and configurations for the application
 * to support Shopify integration, demo mode, and standalone usage.
 */

export type AppMode = 'shopify' | 'demo' | 'standalone';

export interface AppConfig {
  /** The mode in which the app is running */
  mode: AppMode;
  
  /** Shopify store domain (e.g., 'dermaself') */
  shopDomain?: string;
  
  /** Whether cart functionality should be enabled */
  enableCart: boolean;
  
  /** Whether Shopify integration features should be enabled */
  enableShopifyIntegration: boolean;
  
  /** Whether to skip onboarding steps and go directly to camera capture */
  skipOnboarding: boolean;
  
  /** Default user data to use when skipping onboarding steps */
  defaultUserData?: {
    skin_type: string;
    ageRange: string;
    gender: string;
    budget_level: string;
  };
}
