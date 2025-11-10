const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const APP_URL = process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_APP_URL;
const SCOPES = process.env.SHOPIFY_API_SCOPES || process.env.SHOPIFY_SCOPES || '';

if (!API_KEY || !API_SECRET) {
  console.warn(
    'Shopify API credentials are not fully configured. OAuth routes will fail until SHOPIFY_API_KEY and SHOPIFY_API_SECRET are set.'
  );
}

export const shopifyConfig = {
  apiKey: API_KEY ?? '',
  apiSecret: API_SECRET ?? '',
  appUrl: APP_URL ?? '',
  scopes: SCOPES,
};

export function getCallbackUrl() {
  if (!shopifyConfig.appUrl) {
    throw new Error('SHOPIFY_APP_URL (or NEXT_PUBLIC_APP_URL) must be configured for OAuth callbacks');
  }
  const base = shopifyConfig.appUrl.replace(/\/$/, '');
  return `${base}/api/shopify/auth/callback`;
}

