import crypto from 'crypto';
import { cookies } from 'next/headers';
import { shopifyConfig, getCallbackUrl } from './shopify-config';
import {
  storeOAuthState,
  consumeOAuthState,
  storeShopifySession,
  type StoredShopifySession,
} from './shopify-session-store';

const NONCE_COOKIE = 'ds_shopify_nonce';

export function createNonce(length = 16) {
  return crypto.randomBytes(length).toString('hex');
}

export function validateShopParameter(shop?: string | null) {
  if (!shop) return false;
  const expression = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
  return expression.test(shop);
}

export async function buildAuthUrl(shop: string) {
  if (!shopifyConfig.apiKey) {
    throw new Error('SHOPIFY_API_KEY is not set');
  }

  const state = createNonce();
  const redirectUri = encodeURIComponent(getCallbackUrl());
  const scopes = encodeURIComponent(shopifyConfig.scopes);

  storeOAuthState(state, shop);

  const nonce = createNonce();
  const cookieStore = await cookies();
  cookieStore.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 600,
  });

  const baseUrl = `https://${shop}/admin/oauth/authorize`;
  const params = [
    `client_id=${shopifyConfig.apiKey}`,
    `scope=${scopes}`,
    `redirect_uri=${redirectUri}`,
    `state=${state}`,
    `grant_options[]=per-user`,
  ];

  return { url: `${baseUrl}?${params.join('&')}`, state, nonce };
}

export function validateHmac(params: URLSearchParams) {
  const receivedHmac = params.get('hmac');
  if (!receivedHmac) {
    throw new Error('Missing HMAC parameter');
  }

  const sortedParams = Array.from(params.entries())
    .filter(([key]) => key !== 'hmac')
    .sort(([a], [b]) => a.localeCompare(b));

  const message = sortedParams.map(([key, value]) => `${key}=${value}`).join('&');
  const generatedHmac = crypto
    .createHmac('sha256', shopifyConfig.apiSecret)
    .update(message)
    .digest('hex');

  const bufferFromReceived = Buffer.from(receivedHmac, 'utf-8');
  const bufferFromGenerated = Buffer.from(generatedHmac, 'utf-8');

  if (bufferFromGenerated.length !== bufferFromReceived.length) {
    throw new Error('Invalid HMAC');
  }

  if (!crypto.timingSafeEqual(bufferFromGenerated as any, bufferFromReceived as any)) {
    throw new Error('Invalid HMAC');
  }
}

export function consumeState(state: string) {
  const shop = consumeOAuthState(state);
  if (!shop) {
    throw new Error('Invalid OAuth state');
  }
  return shop;
}

export async function exchangeToken(shop: string, code: string) {
  if (!shopifyConfig.apiSecret || !shopifyConfig.apiKey) {
    throw new Error('Shopify API credentials are missing');
  }

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: shopifyConfig.apiKey,
      client_secret: shopifyConfig.apiSecret,
      code,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to exchange token: ${response.status} ${body}`);
  }

  const payload = await response.json();

  const session: StoredShopifySession = {
    shop,
    accessToken: payload.access_token,
    scope: payload.scope,
    expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000) : undefined,
  };

  storeShopifySession(session);
  return session;
}

export async function getShopCookie() {
  const cookieStore = await cookies();
  return cookieStore.get('ds_shopify_shop')?.value;
}

export async function setShopCookie(shop: string) {
  const cookieStore = await cookies();
  cookieStore.set('ds_shopify_shop', shop, {
    httpOnly: false,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

