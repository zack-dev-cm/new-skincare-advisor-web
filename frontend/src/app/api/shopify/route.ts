import { NextRequest, NextResponse } from 'next/server';
import { getShopifySession } from '../../../lib/shopify-session-store';
import { validateShopParameter } from '../../../lib/shopify-oauth';

export async function GET(request: NextRequest) {
  try {
    const sessionResolution = resolveSession(request);
    if (!sessionResolution.ok) {
      return NextResponse.json(
        { error: sessionResolution.error, details: sessionResolution.details },
        { status: sessionResolution.status }
      );
    }

    const { shop, accessToken } = sessionResolution.session;
    const response = await fetch(`https://${shop}/admin/api/2024-01/products.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      products: data.products,
      total: data.products?.length || 0
    });

  } catch (error) {
    console.error('Shopify API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, productId, variantId, quantity } = body;

    const sessionResolution = resolveSession(request);
    if (!sessionResolution.ok) {
      return NextResponse.json(
        { error: sessionResolution.error, details: sessionResolution.details },
        { status: sessionResolution.status }
      );
    }

    switch (action) {
      case 'add_to_cart':
        // Note: Adding to cart typically requires Storefront API or custom implementation
        // This is a simplified example
        return NextResponse.json({
          success: true,
          message: 'Product would be added to cart',
          productId,
          quantity
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Shopify API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 

function resolveSession(request: NextRequest):
  | { ok: true; session: { shop: string; accessToken: string } }
  | { ok: false; status: number; error: string; details?: string } {
  const shop =
    request.nextUrl.searchParams.get('shop') ||
    request.headers.get('x-shopify-shop-domain') ||
    request.headers.get('x-shopify-shop') ||
    request.cookies.get('ds_shopify_shop')?.value;

  if (!validateShopParameter(shop)) {
    return { ok: false, status: 400, error: 'Missing or invalid shop identifier' };
  }

  const session = getShopifySession(shop!);
  if (!session) {
    return {
      ok: false,
      status: 401,
      error: 'Shop not authenticated',
      details: 'Start OAuth at /api/shopify/auth/start?shop=your-store.myshopify.com',
    };
  }

  return { ok: true, session: { shop: session.shop, accessToken: session.accessToken } };
}