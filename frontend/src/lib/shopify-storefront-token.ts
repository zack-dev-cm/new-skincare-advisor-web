import { normalizeShopifyDomain } from './shopify';

/**
 * Storefront API access tokens are scoped to a single Shopify store.
 * For multiple merchants, set JSON mapping (keys = myshopify.com hostnames):
 * SHOPIFY_STOREFRONT_ACCESS_TOKENS_JSON={"df18-cosmetics.myshopify.com":"your_storefront_token"}
 * Single-store / dev: set only SHOPIFY_STOREFRONT_ACCESS_TOKEN (used when shop is absent from the map).
 */
export function getStorefrontAccessTokenForShop(shop: string): string | undefined {
  const normalized = normalizeShopifyDomain(shop);
  const raw = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKENS_JSON;
  if (raw) {
    try {
      const map = JSON.parse(raw) as Record<string, string>;
      for (const key of [normalized, shop]) {
        if (key && map[key]) {
          const t = String(map[key]).trim();
          if (t) return t;
        }
      }
    } catch (e) {
      console.error('SHOPIFY_STOREFRONT_ACCESS_TOKENS_JSON parse error:', e);
    }
  }
  const fallback = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN?.trim();
  return fallback || undefined;
}
