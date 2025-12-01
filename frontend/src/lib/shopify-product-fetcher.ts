import { getShopifyDomain } from './shopify';

export interface ShopifyProductVariant {
  id: string;
  title: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  availableForSale: boolean;
}

export interface ShopifyProductImage {
  url: string;
  altText: string | null;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  vendor: string;
  description: string;
  images: ShopifyProductImage[];
  variants: ShopifyProductVariant[];
}

export interface TransformedProduct {
  id: string;
  title: string;
  vendor: string;
  product_type: string;
  tags: string;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    inventory_quantity: number;
  }>;
  images: Array<{
    id: number;
    src: string;
    alt: string;
  }>;
  body_html: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches product information from Shopify Storefront API by variant ID
 */
export async function fetchProductByVariantId(variantId: string): Promise<TransformedProduct | null> {
  try {
    const shopDomain = getShopifyDomain();
    const url = shopDomain
      ? `/api/shopify/products/by-variant-ids?shop=${encodeURIComponent(shopDomain)}`
      : '/api/shopify/products/by-variant-ids';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variantIds: [variantId]
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.products || data.products.length === 0) {
      console.error('No product found for variant:', variantId);
      return null;
    }

    return data.products[0];

  } catch (error) {
    console.error('Error fetching product for variant', variantId, ':', error);
    return null;
  }
}

/**
 * Fetches multiple products by their variant IDs
 */
export async function fetchProductsByVariantIds(variantIds: string[]): Promise<TransformedProduct[]> {
  try {
    const shopDomain = getShopifyDomain();
    const url = shopDomain
      ? `/api/shopify/products/by-variant-ids?shop=${encodeURIComponent(shopDomain)}`
      : '/api/shopify/products/by-variant-ids';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variantIds
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.products) {
      console.error('Failed to fetch products:', data.error || 'Unknown error');
      return [];
    }

    console.log(`Successfully fetched ${data.products.length} products for ${variantIds.length} variant IDs`);
    return data.products;

  } catch (error) {
    console.error('Error fetching products by variant IDs:', error);
    return [];
  }
}
