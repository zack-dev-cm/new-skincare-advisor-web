import { NextRequest, NextResponse } from 'next/server';
import { validateShopParameter } from '../../../../../lib/shopify-oauth';
import { normalizeShopifyDomain } from '../../../../../lib/shopify';

const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export async function POST(request: NextRequest) {
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

    const normalizedShop = normalizeShopifyDomain(shop!);

    if (!SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Missing Shopify Storefront access token' },
        { status: 500 }
      );
    }

    const { variantIds } = await request.json();

    if (!variantIds || !Array.isArray(variantIds)) {
      return NextResponse.json(
        { error: 'variantIds array is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching products for variant IDs:', variantIds);
    console.log('🔍 Variant ID types:', variantIds.map(id => typeof id));

    // Convert all variant IDs to strings to ensure consistent comparison
    const stringVariantIds = variantIds.map(id => id.toString());
    console.log('🔍 Converted to strings:', stringVariantIds);

    // Convert numeric variant IDs to Shopify GraphQL format
    const graphqlVariantIds = stringVariantIds.map(id => `gid://shopify/ProductVariant/${id}`);
    console.log('🔍 GraphQL variant IDs:', graphqlVariantIds.slice(0, 3)); // Show first 3

    // Query specific variants directly using Shopify's GraphQL API
    const query = `
      query getVariants($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on ProductVariant {
            id
            title
            price {
              amount
              currencyCode
            }
            availableForSale
            sku
            image {
              src
              altText
            }
            product {
              id
              title
              vendor
              productType
              tags
              description
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
              images(first: 1) {
                edges {
                  node {
                    src
                    altText
                  }
                }
              }
            }
          }
        }
      }
    `;

    console.log('🔍 Fetching specific variants directly from Shopify...');

    const response = await fetch(`https://${normalizedShop}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query,
        variables: { ids: graphqlVariantIds }
      }),
    });

    console.log(`📡 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Shopify API error: ${response.status} ${response.statusText}`);
      console.error(`❌ Error response: ${errorText}`);
      return NextResponse.json(
        { 
          error: 'Shopify API error',
          status: response.status,
          details: errorText
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`📦 Response data:`, JSON.stringify(data, null, 2));
    
    if (data.errors) {
      console.error('❌ GraphQL errors:', data.errors);
      return NextResponse.json(
        { 
          error: 'GraphQL errors',
          errors: data.errors
        },
        { status: 400 }
      );
    }

    const allNodes = data.data?.nodes || [];
    console.log(`📦 Received ${allNodes.length} nodes from Shopify`);
    
    // Filter out null nodes (variants that don't exist)
    const variants = allNodes.filter((node: any) => node !== null && node.id);
    const nullNodes = allNodes.filter((node: any) => node === null);
    
    console.log(`📦 Found ${variants.length} valid variants, ${nullNodes.length} null/missing variants`);
    
    // Debug: Show which variant IDs were found vs requested
    const foundVariantIds = variants.map((variant: any) => variant.id.split('/').pop());
    console.log('Found variant IDs:', foundVariantIds);
    console.log('Requested variant IDs:', stringVariantIds);
    const missingIds = stringVariantIds.filter(id => !foundVariantIds.includes(id));
    if (missingIds.length > 0) {
      console.log('Missing variant IDs:', missingIds.slice(0, 5)); // Show first 5
    }

    // Transform the variants to our expected product format
    const transformedProducts = variants.map((variant: any) => {
      const product = variant.product;
      
      // Additional null checks for product data
      if (!product || !product.id) {
        console.warn('⚠️ Skipping variant with missing product data:', variant.id);
        return null;
      }
      
      // Extract rating from known metafield namespaces/keys
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

      return {
        id: product.id.split('/').pop() || product.id,
        title: product.title || 'Unknown Product',
        vendor: product.vendor || 'Unknown Brand',
        product_type: product.productType || 'Skincare',
        tags: (product.tags && Array.isArray(product.tags)) ? product.tags.join(', ') : '',
        variants: [{
          id: variant.id.split('/').pop() || variant.id,
          title: variant.title || 'Default',
          price: variant.price?.amount || '0',
          inventory_quantity: variant.availableForSale ? 1 : 0
        }],
        images: [{
          id: 1,
          src: variant.image?.src || product.images?.edges?.[0]?.node?.src || 'https://via.placeholder.com/300x300/f0f0f0/999999?text=Product+Image',
          alt: variant.image?.altText || product.images?.edges?.[0]?.node?.altText || product.title || 'Product Image'
        }],
        rating,
        rating_count: ratingCount,
        body_html: product.description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }).filter((product: any) => product !== null); // Remove any null products

    console.log(`✅ Successfully transformed ${transformedProducts.length} products`);

    // Handle case where no products were found
    if (transformedProducts.length === 0) {
      console.warn('⚠️ No valid products found for the requested variant IDs');
      return NextResponse.json({
        success: true,
        products: [],
        total: 0,
        debug: {
          requestedVariantIds: stringVariantIds.length,
          foundVariants: variants.length,
          nullVariants: nullNodes.length,
          transformedProducts: 0,
          message: 'No valid products found for the requested variant IDs'
        }
      });
    }

    return NextResponse.json({
      success: true,
      products: transformedProducts,
      total: transformedProducts.length,
      debug: {
        requestedVariantIds: stringVariantIds.length,
        foundVariants: variants.length,
        nullVariants: nullNodes.length,
        transformedProducts: transformedProducts.length
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch products from Shopify',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
