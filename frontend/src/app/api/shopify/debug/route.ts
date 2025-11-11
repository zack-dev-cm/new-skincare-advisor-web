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
      return NextResponse.json({
        success: false,
        error: 'Missing or invalid shop identifier',
      });
    }

    const session = getShopifySession(shop!);

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Shop has not completed OAuth',
      });
    }

    if (!SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'Missing Shopify Storefront access token',
      });
    }

    const results: any = {
      shop: session.shop,
      tests: []
    };

    // Test 1: Admin API - Get products count
    try {
      const adminResponse = await fetch(`https://${session.shop}/admin/api/2024-01/products.json?limit=5`, {
        headers: {
          'X-Shopify-Access-Token': session.accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        results.tests.push({
          name: 'Admin API - Products',
          status: 'success',
          productsCount: adminData.products?.length || 0,
          products: adminData.products?.slice(0, 2).map((p: any) => ({
            id: p.id,
            title: p.title,
            status: p.status,
            published_at: p.published_at,
            variants: p.variants?.slice(0, 2).map((v: any) => ({
              id: v.id,
              title: v.title,
              price: v.price
            }))
          }))
        });
      } else {
        results.tests.push({
          name: 'Admin API - Products',
          status: 'error',
          error: `${adminResponse.status} ${adminResponse.statusText}`
        });
      }
    } catch (error) {
      results.tests.push({
        name: 'Admin API - Products',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 2: Storefront API - Simple query
    try {
      const simpleQuery = `
        query {
          products(first: 5) {
            edges {
              node {
                id
                title
                availableForSale
                publishedAt
              }
            }
          }
        }
      `;

      const storefrontResponse = await fetch(`https://${session.shop}/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: simpleQuery }),
      });

      if (storefrontResponse.ok) {
        const storefrontData = await storefrontResponse.json();
        
        if (storefrontData.errors) {
          results.tests.push({
            name: 'Storefront API - Products Query',
            status: 'error',
            errors: storefrontData.errors
          });
        } else {
          results.tests.push({
            name: 'Storefront API - Products Query',
            status: 'success',
            productsCount: storefrontData.data?.products?.edges?.length || 0,
            products: storefrontData.data?.products?.edges?.slice(0, 2).map((edge: any) => edge.node)
          });
        }
      } else {
        const errorText = await storefrontResponse.text();
        results.tests.push({
          name: 'Storefront API - Products Query',
          status: 'error',
          error: `${storefrontResponse.status} ${storefrontResponse.statusText}`,
          details: errorText
        });
      }
    } catch (error) {
      results.tests.push({
        name: 'Storefront API - Products Query',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 3: Check Sales Channels (Admin API)
    try {
      const publicationsResponse = await fetch(`https://${session.shop}/admin/api/2024-01/publications.json`, {
        headers: {
          'X-Shopify-Access-Token': session.accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (publicationsResponse.ok) {
        const publicationsData = await publicationsResponse.json();
        results.tests.push({
          name: 'Sales Channels (Publications)',
          status: 'success',
          channels: publicationsData.publications?.map((p: any) => ({
            id: p.id,
            name: p.name
          }))
        });
      }
    } catch (error) {
      results.tests.push({
        name: 'Sales Channels (Publications)',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 4: Check product publication status
    try {
      const adminResponse = await fetch(`https://${session.shop}/admin/api/2024-01/products.json?limit=1&fields=id,title,published_scope`, {
        headers: {
          'X-Shopify-Access-Token': session.accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        if (adminData.products && adminData.products.length > 0) {
          const productId = adminData.products[0].id;
          
          // Get product resources (where it's published)
          const resourcesResponse = await fetch(`https://${session.shop}/admin/api/2024-01/products/${productId}/publications.json`, {
            headers: {
              'X-Shopify-Access-Token': session.accessToken,
              'Content-Type': 'application/json',
            },
          });

          if (resourcesResponse.ok) {
            const resourcesData = await resourcesResponse.json();
            results.tests.push({
              name: 'Sample Product Publication Status',
              status: 'success',
              product: {
                id: productId,
                title: adminData.products[0].title,
                published_scope: (adminData.products[0] as any).published_scope
              },
              publications: resourcesData.publications
            });
          }
        }
      }
    } catch (error) {
      results.tests.push({
        name: 'Sample Product Publication Status',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run debug tests',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

