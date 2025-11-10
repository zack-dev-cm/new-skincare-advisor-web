import { NextRequest, NextResponse } from 'next/server';
import {
  consumeState,
  exchangeToken,
  setShopCookie,
  validateHmac,
  validateShopParameter,
} from '../../../../../lib/shopify-oauth';
import { getShopifySession } from '../../../../../lib/shopify-session-store';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const params = url.searchParams;

  try {
    validateHmac(params);
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid HMAC', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }

  const state = params.get('state');
  const shop = params.get('shop');
  const code = params.get('code');

  if (!state || !shop || !code) {
    return NextResponse.json({ error: 'Missing OAuth parameters' }, { status: 400 });
  }

  if (!validateShopParameter(shop)) {
    return NextResponse.json({ error: 'Invalid shop parameter' }, { status: 400 });
  }

  try {
    const stateShop = consumeState(state);
    if (stateShop !== shop) {
      return NextResponse.json({ error: 'State mismatch' }, { status: 400 });
    }

    await exchangeToken(shop, code);
    await setShopCookie(shop);

    const existingSession = getShopifySession(shop);

    return NextResponse.redirect(
      `${process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_APP_URL || '/'}?shop=${shop}${
        existingSession?.scope ? `&scope=${encodeURIComponent(existingSession.scope)}` : ''
      }`
    );
  } catch (error) {
    console.error('Shopify OAuth callback error:', error);
    return NextResponse.json(
      { error: 'OAuth callback failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

