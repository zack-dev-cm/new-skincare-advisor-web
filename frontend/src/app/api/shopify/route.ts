import { NextRequest, NextResponse } from 'next/server';
import { getShopifySession } from '../../../lib/shopify-session-store';
import { validateShopParameter } from '../../../lib/shopify-oauth';

const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export async function GET(request: NextRequest) {
  try {
    const sessionResolution = resolveSession(request);
    if (!sessionResolution.ok) {
      return NextResponse.json(
        { error: sessionResolution.error, details: sessionResolution.details },
        { status: sessionResolution.status }
      );
    }

    if (!SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Missing Shopify Storefront access token' },
        { status: 500 }
      );
    }

    const { shop } = sessionResolution.session;

    // Use Storefront API to get products with correct variant IDs for cart
    const query = `
      query {
        products(first: 20) {
          edges {
            node {
              id
              title
              vendor
              productType
              tags
              description
              images(first: 5) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    availableForSale
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(`https://${shop}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    // Transform Storefront API response to match expected format
    const products = data.data.products.edges.map((edge: any) => {
      const product = edge.node;
      // Extract numeric ID from GraphQL ID for compatibility
      const numericId = product.id.split('/').pop() || product.id;
      
      return {
        id: numericId,
        title: product.title,
        vendor: product.vendor || '',
        product_type: product.productType || 'Skincare',
        tags: product.tags.join(', '),
        body_html: product.description || '',
        variants: product.variants.edges.map((vEdge: any) => {
          const variant = vEdge.node;
          return {
            id: variant.id, // Keep full GraphQL ID for cart operations
            title: variant.title,
            price: variant.price.amount,
            inventory_quantity: variant.availableForSale ? 100 : 0 // Storefront API doesn't expose exact inventory
          };
        }),
        images: product.images.edges.map((imgEdge: any, index: number) => {
          const image = imgEdge.node;
          return {
            id: index + 1,
            src: image.url,
            alt: image.altText || product.title
          };
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    return NextResponse.json({
      success: true,
      products: products,
      total: products.length
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
  | { ok: true; session: { shop: string } }
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

  return { ok: true, session: { shop: session.shop } };
}