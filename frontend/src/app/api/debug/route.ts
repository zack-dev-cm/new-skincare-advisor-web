import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    SHOPIFY_PUBLIC_DOMAIN: process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN || 'NOT_SET',
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET',
    SHOPIFY_API_KEY_SET: !!process.env.SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET_SET: !!process.env.SHOPIFY_API_SECRET,
    SHOPIFY_STOREFRONT_ACCESS_TOKEN_SET: !!process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    SHOPIFY_STOREFRONT_ACCESS_TOKENS_JSON_SET:
      !!process.env.SHOPIFY_STOREFRONT_ACCESS_TOKENS_JSON,
    ALL_ENV_KEYS: Object.keys(process.env).filter((key) => key.includes('SHOPIFY')),
  });
} 