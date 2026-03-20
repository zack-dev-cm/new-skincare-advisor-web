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

    const storefrontToken = getStorefrontAccessTokenForShop(session.shop);
    if (!storefrontToken) {
      return NextResponse.json(
        {
          error: 'Missing Shopify Storefront access token for this shop',
          shop: session.shop,
          hint: 'Set SHOPIFY_STOREFRONT_ACCESS_TOKENS_JSON or SHOPIFY_STOREFRONT_ACCESS_TOKEN.',
        },
        { status: 500 }
      );
    }

    // Query to fetch products with their variants
    const query = `
      query {
        products(first: 10) {
          edges {
            node {
              id
              title
              vendor
              availableForSale
              variants(first: 5) {
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
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
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
        'X-Shopify-Storefront-Access-Token': storefrontToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify API error:', response.status, errorText);
      return NextResponse.json(
        {
          error: `Shopify API connection failed: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return NextResponse.json(
        {
          error: 'GraphQL errors occurred',
          details: data.errors,
        },
        { status: 400 }
      );
    }

    // Transform products to a more usable format
    const products = data.data.products.edges.map((edge: any) => {
      const product = edge.node;
      return {
        id: product.id,
        title: product.title,
        vendor: product.vendor,
        availableForSale: product.availableForSale,
        image: product.images.edges[0]?.node.url || null,
        variants: product.variants.edges.map((vEdge: any) => ({
          id: vEdge.node.id,
          title: vEdge.node.title,
          price: `${vEdge.node.price.amount} ${vEdge.node.price.currencyCode}`,
          availableForSale: vEdge.node.availableForSale
        }))
      };
    });

    return NextResponse.json({
      success: true,
      productsCount: products.length,
      products: products,
      message: `Found ${products.length} products. Use the variant IDs from the 'variants' array to test cart operations.`
    });

  } catch (error) {
    console.error('Products list error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

