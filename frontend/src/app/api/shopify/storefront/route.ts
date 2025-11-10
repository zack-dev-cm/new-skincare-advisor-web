import { NextRequest, NextResponse } from 'next/server';
import { getShopifySession } from '../../../../lib/shopify-session-store';
import { validateShopParameter } from '../../../../lib/shopify-oauth';

const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export async function GET(request: NextRequest) {
  try {
    const shop =
      request.nextUrl.searchParams.get('shop') ||
      request.headers.get('x-shopify-shop-domain') ||
      request.headers.get('x-shopify-shop') ||
      request.cookies.get('ds_shopify_shop')?.value;

    if (!validateShopParameter(shop)) {
      return NextResponse.json(
        { error: 'Missing or invalid shop identifier' },
        { status: 400 }
      );
    }

    const session = getShopifySession(shop!);
    if (!session) {
      return NextResponse.json(
        {
          error: 'Shop not authenticated',
          details: 'Start OAuth at /api/shopify/auth/start?shop=your-store.myshopify.com',
        },
        { status: 401 }
      );
    }

    if (!SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Missing Shopify Storefront access token' },
        { status: 500 }
      );
    }

    // Use GraphQL Storefront API
    const query = `
      query {
        products(first: 50) {
          edges {
            node {
              id
              title
              vendor
              description
              images(first: 1) {
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

    const response = await fetch(`https://${session.shop}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Storefront API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform GraphQL response to match our expected format
    const products = data.data.products.edges.map((edge: any) => {
      const product = edge.node;
      const firstImage = product.images.edges[0]?.node;
      const firstVariant = product.variants.edges[0]?.node;
      
      return {
        id: product.id.split('/').pop(),
        title: product.title,
        vendor: product.vendor,
        description: product.description,
        images: firstImage ? [{
          id: 1,
          src: firstImage.url,
          alt: firstImage.altText || product.title
        }] : [],
        variants: product.variants.edges.map((variantEdge: any) => {
          const variant = variantEdge.node;
          return {
            id: variant.id.split('/').pop(),
            title: variant.title,
            price: variant.price.amount,
            inventory_quantity: variant.availableForSale ? 1 : 0
          };
        })
      };
    });

    return NextResponse.json({
      success: true,
      products,
      total: products.length
    });

  } catch (error) {
    console.error('Storefront API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch products from Storefront API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 