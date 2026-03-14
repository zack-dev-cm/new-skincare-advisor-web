export function normalizeShopifyDomain(input: string): string {
  try {
    const url = input.includes('://') ? new URL(input) : new URL(`https://${input}`);
    return url.hostname;
  } catch {
    return input.replace(/^https?:\/\//, '').split('/')[0];
  }
}

function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');
}

/**
 * Returns the Shopify shop domain (e.g., "your-store.myshopify.com").
 * Prefers parent window when embedded, otherwise current hostname, then environment variable.
 */
export function getShopifyDomain(): string | undefined {
  // Browser-first detection
  if (typeof window !== 'undefined') {
    // 1) Prefer explicit ?shop= param when present (standard in embedded apps and storefront embeds)
    const qsShop = new URLSearchParams(window.location.search).get('shop');
    if (qsShop) {
      return normalizeShopifyDomain(qsShop);
    }

    // If embedded, try to read from parent window
    if (window.parent !== window) {
      try {
        const parentHost = normalizeShopifyDomain(window.parent.location.origin);
        if (!isLocalHost(parentHost)) {
          return parentHost;
        }
      } catch {
        // Cross-origin; fall back below
      }
    }

    // If running on a myshopify domain directly
    if (window.location.hostname.includes('myshopify.com')) {
      return window.location.hostname;
    }

    // Fallback to referrer (useful when opened from a Shopify domain)
    if (document.referrer) {
      try {
        const refHost = new URL(document.referrer).hostname;
        if (refHost.includes('myshopify.com')) {
          return refHost;
        }
      } catch {
        // ignore
      }
    }
  }

  // Fallback to environment variable
  if (process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN) {
    return normalizeShopifyDomain(process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN);
  }

  return undefined;
}


