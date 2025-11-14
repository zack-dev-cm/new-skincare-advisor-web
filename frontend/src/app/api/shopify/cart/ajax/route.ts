import { NextRequest, NextResponse } from 'next/server';
import { getShopifySession } from '../../../../../lib/shopify-session-store';
import { validateShopParameter } from '../../../../../lib/shopify-oauth';

/**
 * @deprecated This endpoint uses the Ajax Cart API which ONLY works for Shopify Themes.
 * 
 * ⚠️ DO NOT USE THIS ENDPOINT ⚠️
 * 
 * The Ajax Cart API requires browser cookies from the customer's storefront session
 * and cannot be used for:
 * - Embedded apps
 * - Headless storefronts
 * - Custom applications
 * 
 * USE INSTEAD: /api/shopify/cart (Storefront API GraphQL)
 * 
 * See: CART_FIX_IMPLEMENTATION.md for migration guide
 * 
 * This endpoint is kept for backward compatibility but will fail with "fetch failed" errors.
 */
export async function GET(request: NextRequest) {
  console.warn('⚠️ DEPRECATED ENDPOINT: /api/shopify/cart/ajax is deprecated. Use /api/shopify/cart instead.');
  try {
    const shop = request.nextUrl.searchParams.get('shop') || 
                 request.headers.get('x-shopify-shop-domain') ||
                 request.cookies.get('ds_shopify_shop')?.value;

    if (!validateShopParameter(shop)) {
      return NextResponse.json(
        { error: 'Missing or invalid shop parameter' },
        { status: 400 }
      );
    }

    const session = getShopifySession(shop!);
    if (!session) {
      return NextResponse.json(
        { error: 'Shop not authenticated' },
        { status: 401 }
      );
    }

    // Get cart using Ajax Cart API
    const shopUrl = `https://${session.shop}`;
    const response = await fetch(`${shopUrl}/cart.js`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cart Ajax API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Failed to get cart: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const cart = await response.json();
    return NextResponse.json(cart);

  } catch (error) {
    console.error('Cart Ajax proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get cart',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.warn('⚠️ DEPRECATED ENDPOINT: /api/shopify/cart/ajax is deprecated. Use /api/shopify/cart instead.');
  
  try {
    const shop = request.nextUrl.searchParams.get('shop') || 
                 request.headers.get('x-shopify-shop-domain') ||
                 request.cookies.get('ds_shopify_shop')?.value;

    if (!validateShopParameter(shop)) {
      return NextResponse.json(
        { error: 'Missing or invalid shop parameter' },
        { status: 400 }
      );
    }

    const session = getShopifySession(shop!);
    if (!session) {
      return NextResponse.json(
        { error: 'Shop not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { operation, ...data } = body;

    // Validate operation
    const validOperations = ['add', 'change', 'clear'];
    if (!operation || !validOperations.includes(operation)) {
      return NextResponse.json(
        { error: 'Invalid operation. Must be one of: add, change, clear' },
        { status: 400 }
      );
    }

    // Construct endpoint
    const shopUrl = `https://${session.shop}`;
    const endpoint = `${shopUrl}/cart/${operation}.js`;

    // Make request to Cart Ajax API
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    // Only add body for operations that need it
    if (operation !== 'clear') {
      fetchOptions.body = JSON.stringify(data);
    }

    const response = await fetch(endpoint, fetchOptions);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { description: await response.text() };
      }
      
      console.error(`Cart Ajax API error (${operation}):`, response.status, errorData);
      return NextResponse.json(
        { 
          error: `Failed to ${operation} cart`,
          details: errorData.description || errorData.message || response.statusText
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Cart Ajax proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process cart operation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

