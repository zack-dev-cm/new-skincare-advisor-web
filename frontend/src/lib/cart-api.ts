/**
 * Cart API - Storefront API Cart Management
 * 
 * This module provides a clean interface for cart operations using
 * the Shopify Storefront API (GraphQL), which is the correct approach
 * for embedded apps, headless storefronts, and custom applications.
 * 
 * DO NOT use the Ajax Cart API (/cart.js) - that's only for Shopify themes.
 */

const CART_ID_STORAGE_KEY = 'shopify_cart_id';

export interface CartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    price: {
      amount: string;
      currencyCode: string;
    };
    product: {
      title: string;
      images: Array<{
        url: string;
        altText: string;
      }>;
    };
  };
  attributes?: Array<{
    key: string;
    value: string;
  }>;
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  lines: CartLine[];
  cost: {
    subtotalAmount: {
      amount: string;
      currencyCode: string;
    };
    totalAmount: {
      amount: string;
      currencyCode: string;
    };
  };
}

export interface CartResponse {
  success: boolean;
  cart?: Cart;
  error?: string;
  details?: string;
}

/**
 * Get the stored cart ID from localStorage
 */
export function getStoredCartId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CART_ID_STORAGE_KEY);
}

/**
 * Store cart ID in localStorage
 */
export function storeCartId(cartId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_ID_STORAGE_KEY, cartId);
}

/**
 * Clear stored cart ID
 */
export function clearStoredCartId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_ID_STORAGE_KEY);
}

/**
 * Transform Storefront API cart response to our Cart format
 */
function transformStorefrontCart(storefrontCart: any): Cart {
  return {
    id: storefrontCart.id,
    checkoutUrl: storefrontCart.checkoutUrl,
    lines: storefrontCart.lines.edges.map((edge: any) => ({
      id: edge.node.id,
      quantity: edge.node.quantity,
      merchandise: {
        id: edge.node.merchandise.id,
        title: edge.node.merchandise.title,
        price: {
          amount: edge.node.merchandise.price.amount,
          currencyCode: edge.node.merchandise.price.currencyCode,
        },
        product: {
          title: edge.node.merchandise.product.title,
          images: edge.node.merchandise.product.images.edges.map((imgEdge: any) => ({
            url: imgEdge.node.url,
            altText: imgEdge.node.altText || edge.node.merchandise.product.title,
          })),
        },
      },
      attributes: edge.node.attributes || [],
    })),
    cost: {
      subtotalAmount: {
        amount: storefrontCart.cost.subtotalAmount.amount,
        currencyCode: storefrontCart.cost.subtotalAmount.currencyCode,
      },
      totalAmount: {
        amount: storefrontCart.cost.totalAmount.amount,
        currencyCode: storefrontCart.cost.totalAmount.currencyCode,
      },
    },
  };
}

/**
 * Create a new cart with an initial item
 */
export async function createCart(
  shop: string,
  variantId: string,
  quantity: number = 1,
  customAttributes?: Array<{ key: string; value: string }>
): Promise<CartResponse> {
  try {
    // Ensure variantId is in GraphQL format
    const gqlVariantId = variantId.startsWith('gid://shopify/ProductVariant/')
      ? variantId
      : `gid://shopify/ProductVariant/${variantId}`;

    const response = await fetch(`/api/shopify/cart?shop=${encodeURIComponent(shop)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create_cart',
        variantId: gqlVariantId,
        quantity,
        customAttributes,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to create cart',
        details: data.details,
      };
    }

    const cart = transformStorefrontCart(data.cart);
    storeCartId(cart.id);

    return {
      success: true,
      cart,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error creating cart',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Add an item to an existing cart
 */
export async function addToCart(
  shop: string,
  cartId: string,
  variantId: string,
  quantity: number = 1,
  customAttributes?: Array<{ key: string; value: string }>
): Promise<CartResponse> {
  try {
    // Ensure variantId is in GraphQL format
    const gqlVariantId = variantId.startsWith('gid://shopify/ProductVariant/')
      ? variantId
      : `gid://shopify/ProductVariant/${variantId}`;

    const response = await fetch(`/api/shopify/cart?shop=${encodeURIComponent(shop)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'add_to_cart',
        cartId,
        variantId: gqlVariantId,
        quantity,
        customAttributes,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to add to cart',
        details: data.details,
      };
    }

    const cart = transformStorefrontCart(data.cart);

    return {
      success: true,
      cart,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error adding to cart',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update a line item's quantity
 */
export async function updateCartLine(
  shop: string,
  cartId: string,
  lineId: string,
  quantity: number
): Promise<CartResponse> {
  try {
    const response = await fetch(`/api/shopify/cart?shop=${encodeURIComponent(shop)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'update_cart_item',
        cartId,
        lineId,
        quantity,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to update cart item',
        details: data.details,
      };
    }

    const cart = transformStorefrontCart(data.cart);

    return {
      success: true,
      cart,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error updating cart',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Remove a line item from cart
 */
export async function removeFromCart(
  shop: string,
  cartId: string,
  lineId: string
): Promise<CartResponse> {
  try {
    const response = await fetch(`/api/shopify/cart?shop=${encodeURIComponent(shop)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'remove_from_cart',
        cartId,
        lineId,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to remove from cart',
        details: data.details,
      };
    }

    const cart = transformStorefrontCart(data.cart);

    return {
      success: true,
      cart,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error removing from cart',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get cart by ID
 */
export async function getCart(
  shop: string,
  cartId: string
): Promise<CartResponse> {
  try {
    const response = await fetch(
      `/api/shopify/cart?shop=${encodeURIComponent(shop)}&cartId=${encodeURIComponent(cartId)}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      // If cart not found, clear stored cart ID
      if (response.status === 404 || data.error?.includes('not found')) {
        clearStoredCartId();
      }

      return {
        success: false,
        error: data.error || 'Failed to get cart',
        details: data.details,
      };
    }

    const cart = transformStorefrontCart(data.cart);

    return {
      success: true,
      cart,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error getting cart',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clear all items from cart (by creating a new empty cart)
 * Note: Storefront API doesn't have a "clear" mutation,
 * so we just clear the stored cart ID
 */
export async function clearCart(): Promise<void> {
  clearStoredCartId();
}

