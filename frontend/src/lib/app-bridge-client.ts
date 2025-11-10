import type { AppConfigV2 } from '@shopify/app-bridge';
import type { ClientApplication } from '@shopify/app-bridge/client';
import createApp from '@shopify/app-bridge';
import { authenticatedFetch } from '@shopify/app-bridge-utils';

const APP_BRIDGE_INSTANCE_KEY = '__dermaself_app_bridge';
const HOST_STORAGE_KEY = 'dermaself_shopify_host';

declare global {
  interface Window {
    [APP_BRIDGE_INSTANCE_KEY]?: ClientApplication<any>;
  }
}

function getHostParam(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const host = params.get('host');
  if (host) {
    sessionStorage.setItem(HOST_STORAGE_KEY, host);
    return host;
  }
  return sessionStorage.getItem(HOST_STORAGE_KEY);
}

export function getAppBridge() {
  if (typeof window === 'undefined') return null;

  if (window[APP_BRIDGE_INSTANCE_KEY]) {
    return window[APP_BRIDGE_INSTANCE_KEY]!;
  }

  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY;
  const host = getHostParam();

  if (!apiKey || !host) {
    return null;
  }

  const app = createApp({
    apiKey,
    host,
  });

  window[APP_BRIDGE_INSTANCE_KEY] = app;
  return app;
}

export function getAuthenticatedFetch() {
  const app = getAppBridge();
  if (!app) return null;
  return authenticatedFetch(app);
}

