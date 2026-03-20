import { NextRequest, NextResponse } from 'next/server';
import { getShopifySession } from '../../../../../lib/shopify-session-store';
import { validateShopParameter } from '../../../../../lib/shopify-oauth';
import { getStorefrontAccessTokenForShop } from '../../../../../lib/shopify-storefront-token';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
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

    const { productId } = await context.params;

    // Handle different product ID formats
    let graphqlProductId: string;
    
    if (productId.startsWith('gid://')) {
      // Already in GraphQL format
      graphqlProductId = productId;
    } else {
      // Convert numeric ID to GraphQL format
      // Remove any non-numeric characters and ensure it's a valid number
      const numericId = productId.toString().replace(/[^\d]/g, '');
      if (!numericId || isNaN(Number(numericId))) {
        console.error('Invalid product ID format:', productId);
        return NextResponse.json(
          { error: 'Invalid product ID format' },
          { status: 400 }
        );
      }
      graphqlProductId = `gid://shopify/Product/${numericId}`;
    }

    console.log('🛍️ Fetching product for ID:', graphqlProductId, 'from original:', productId);

    const query = `
      query getProduct($productId: ID!) {
        product(id: $productId) {
          id
          title
          vendor
          description
          productType
          tags
          metafields(identifiers: [
            {namespace: "reviews", key: "rating"},
            {namespace: "reviews", key: "rating_count"},
            {namespace: "yotpo", key: "reviews_average"},
            {namespace: "yotpo", key: "reviews_count"},
            {namespace: "spr", key: "rating"},
            {namespace: "spr", key: "reviews"},
            {namespace: "dermaself", key: "rating"},
            {namespace: "dermaself", key: "rating_count"}
          ]) {
            namespace
            key
            value
          }
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
    `;

    const response = await fetch(`https://${session.shop}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': storefrontToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { productId: graphqlProductId }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify API error:', response.status, errorText);
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return NextResponse.json(
        { error: 'GraphQL errors', details: data.errors },
        { status: 400 }
      );
    }

    const product = data.data.product;
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Transform the Shopify product to our expected format
    // Extract rating
    let rating: number | null = null;
    let ratingCount: number | null = null;
    try {
      const mfs = product.metafields || [];
      const findMf = (ns: string, key: string) => mfs.find((m: any) => m.namespace === ns && m.key === key)?.value;
      const candidates: Array<string | undefined> = [
        findMf('reviews', 'rating'),
        findMf('yotpo', 'reviews_average'),
        findMf('spr', 'rating'),
        findMf('dermaself', 'rating')
      ];
      const countCandidates: Array<string | undefined> = [
        findMf('reviews', 'rating_count'),
        findMf('yotpo', 'reviews_count'),
        findMf('spr', 'reviews'),
        findMf('dermaself', 'rating_count')
      ];
      const parsed = candidates.map(v => v ? parseFloat(v) : NaN).find(v => !Number.isNaN(v));
      if (typeof parsed === 'number' && !Number.isNaN(parsed)) rating = parsed;
      const parsedCount = countCandidates.map(v => v ? parseInt(v as string, 10) : NaN).find(v => !Number.isNaN(v));
      if (typeof parsedCount === 'number' && !Number.isNaN(parsedCount)) ratingCount = parsedCount;
    } catch {}

    const transformedProduct = {
      id: product.id.split('/').pop() || product.id,
      title: product.title,
      vendor: product.vendor,
      product_type: product.productType || 'Skincare',
      tags: product.tags.join(', '),
      rating,
      rating_count: ratingCount,
      variants: product.variants.edges.map((variantEdge: any) => {
        const variantNode = variantEdge.node;
        return {
          id: variantNode.id.split('/').pop() || variantNode.id,
          title: variantNode.title,
          price: variantNode.price.amount,
          inventory_quantity: variantNode.availableForSale ? 1 : 0
        };
      }),
      images: product.images.edges.map((imageEdge: any, index: number) => {
        const imageNode = imageEdge.node;
        // Ensure image URL is absolute
        let imageUrl = imageNode.url;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = `https:${imageUrl}`;
        }
        
        console.log(`🖼️ API: Processing image ${index + 1}:`, {
          originalUrl: imageNode.url,
          transformedUrl: imageUrl
        });
        
        return {
          id: index + 1,
          src: imageUrl,
          alt: imageNode.altText || product.title
        };
      }),
      body_html: product.description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('✅ Product fetched successfully:', transformedProduct.title);
    return NextResponse.json({ success: true, product: transformedProduct });

  } catch (error) {
    console.error('Failed to fetch product by ID:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 