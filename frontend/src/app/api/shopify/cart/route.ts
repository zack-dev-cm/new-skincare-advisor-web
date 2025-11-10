import { NextRequest, NextResponse } from 'next/server';
import { getShopifySession } from '../../../../lib/shopify-session-store';
import { validateShopParameter } from '../../../../lib/shopify-oauth';

const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { action, cartId, lineId, variantId, quantity, customAttributes } = body;

    switch (action) {
      case 'create_cart':
        return await createCart(shop, variantId, quantity, customAttributes);
      
      case 'add_to_cart':
        return await addToCart(shop, cartId, variantId, quantity, customAttributes);
      
      case 'update_cart_item':
        return await updateCartItem(shop, cartId, lineId, quantity);
      
      case 'remove_from_cart':
        return await removeFromCart(shop, cartId, lineId);
      
      case 'get_cart':
        return await getCart(shop, cartId);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Cart API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      hasToken: !!SHOPIFY_STOREFRONT_ACCESS_TOKEN
    });
    return NextResponse.json(
      { 
        error: 'Failed to process cart request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function createCart(
  shop: string,
  variantId: string,
  quantity: number = 1,
  customAttributes?: Array<{ key: string; value: string }>
) {
  const mutation = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                attributes {
                  key
                  value
                }
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      title
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
            }
          }
          cost {
            subtotalAmount {
              amount
              currencyCode
            }
            totalAmount {
              amount
              currencyCode
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await fetch(`https://${shop}/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        input: {
          lines: [
            {
              merchandiseId: variantId,
              quantity: quantity,
              attributes: customAttributes || []
            }
          ]
        }
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Create cart failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  if (data.data.cartCreate.userErrors.length > 0) {
    throw new Error(`Cart creation errors: ${JSON.stringify(data.data.cartCreate.userErrors)}`);
  }

  return NextResponse.json({
    success: true,
    cart: data.data.cartCreate.cart
  });
}

async function addToCart(
  shop: string,
  cartId: string,
  variantId: string,
  quantity: number = 1,
  customAttributes?: Array<{ key: string; value: string }>
) {
  const mutation = `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                attributes {
                  key
                  value
                }
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      title
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
            }
          }
          cost {
            subtotalAmount {
              amount
              currencyCode
            }
            totalAmount {
              amount
              currencyCode
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await fetch(`https://${shop}/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        cartId: cartId,
        lines: [
          {
            merchandiseId: variantId,
            quantity: quantity,
            attributes: customAttributes || []
          }
        ]
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Add to cart failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  if (data.data.cartLinesAdd.userErrors.length > 0) {
    throw new Error(`Add to cart errors: ${JSON.stringify(data.data.cartLinesAdd.userErrors)}`);
  }

  return NextResponse.json({
    success: true,
    cart: data.data.cartLinesAdd.cart
  });
}

async function updateCartItem(shop: string, cartId: string, lineId: string, quantity: number) {
  const mutation = `
    mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                attributes {
                  key
                  value
                }
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      title
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
            }
          }
          cost {
            subtotalAmount {
              amount
              currencyCode
            }
            totalAmount {
              amount
              currencyCode
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await fetch(`https://${shop}/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        cartId: cartId,
        lines: [
          {
            id: lineId,
            quantity: quantity
          }
        ]
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Update cart item failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  if (data.data.cartLinesUpdate.userErrors.length > 0) {
    throw new Error(`Update cart item errors: ${JSON.stringify(data.data.cartLinesUpdate.userErrors)}`);
  }

  return NextResponse.json({
    success: true,
    cart: data.data.cartLinesUpdate.cart
  });
}

async function removeFromCart(shop: string, cartId: string, lineId: string) {
  const mutation = `
    mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                attributes {
                  key
                  value
                }
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      title
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
            }
          }
          cost {
            subtotalAmount {
              amount
              currencyCode
            }
            totalAmount {
              amount
              currencyCode
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await fetch(`https://${shop}/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        cartId: cartId,
        lineIds: [lineId]
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Remove from cart failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  if (data.data.cartLinesRemove.userErrors.length > 0) {
    throw new Error(`Remove from cart errors: ${JSON.stringify(data.data.cartLinesRemove.userErrors)}`);
  }

  return NextResponse.json({
    success: true,
    cart: data.data.cartLinesRemove.cart
  });
}

async function getCart(shop: string, cartId: string) {
  const query = `
    query cart($id: ID!) {
      cart(id: $id) {
        id
        checkoutUrl
        lines(first: 10) {
          edges {
            node {
              id
              quantity
              attributes {
                key
                value
              }
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    title
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
          }
        }
        cost {
          subtotalAmount {
            amount
            currencyCode
          }
          totalAmount {
            amount
            currencyCode
          }
        }
      }
    }
  `;

  const response = await fetch(`https://${shop}/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: query,
      variables: {
        id: cartId
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Get cart failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return NextResponse.json({
    success: true,
    cart: data.data.cart
  });
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