import { NextRequest, NextResponse } from 'next/server';
import { getShopifySession } from '../../../../../lib/shopify-session-store';
import { validateShopParameter } from '../../../../../lib/shopify-oauth';
import { getStorefrontAccessTokenForShop } from '../../../../../lib/shopify-storefront-token';

export async function GET(request: NextRequest) {
  try {
    const shop =
      request.nextUrl.searchParams.get('shop') ||
      request.headers.get('x-shopify-shop-domain') ||
      request.headers.get('x-shopify-shop') ||
      request.cookies.get('ds_shopify_shop')?.value;

    if (!validateShopParameter(shop)) {
      return NextResponse.json({
        success: false,
        error: 'Missing or invalid shop identifier',
      });
    }

    const session = getShopifySession(shop!);

    const storefrontToken = session
      ? getStorefrontAccessTokenForShop(session.shop)
      : undefined;
    const envCheck = {
      shop: shop,
      session: session ? 'Loaded' : 'Missing',
      storefrontTokenForShop: storefrontToken ? 'Set' : 'Missing',
      hasSession: !!session,
      hasToken: !!storefrontToken,
    };

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Shop has not completed OAuth',
        envCheck,
      });
    }

    if (!storefrontToken) {
      return NextResponse.json({
        success: false,
        error: 'Missing Shopify Storefront access token for this shop',
        envCheck,
      });
    }

    // Test Shopify Storefront API connection
    // Using a simple products query that works with Storefront API
    const testQuery = `
      query {
        products(first: 1) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `;

    const response = await fetch(`https://${session.shop}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': storefrontToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: testQuery }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: `Shopify API connection failed: ${response.status} ${response.statusText}`,
        details: errorText,
        envCheck
      });
    }

    const data = await response.json();
    
    if (data.errors) {
      return NextResponse.json({
        success: false,
        error: 'GraphQL errors occurred',
        details: data.errors,
        envCheck
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Storefront API connection successful',
      productsCount: data.data.products.edges.length,
      envCheck
    });

  } catch (error) {
    console.error('Cart test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test cart configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 