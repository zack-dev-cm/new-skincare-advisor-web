import { NextRequest, NextResponse } from 'next/server';
import { buildAuthUrl, validateShopParameter } from '../../../../../lib/shopify-oauth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');

  if (!validateShopParameter(shop)) {
    return NextResponse.json({ error: 'Invalid shop parameter' }, { status: 400 });
  }

  try {
    const { url } = await buildAuthUrl(shop!);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Failed to build Shopify auth URL:', error);
    return NextResponse.json(
      {
        error: 'Failed to start Shopify OAuth',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

