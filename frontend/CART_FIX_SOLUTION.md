# Cart Implementation Fix - Using Storefront API Instead of Ajax API

## Problem Summary

Your app was using the **Shopify Ajax Cart API** which is ONLY for Shopify Themes, not for standalone/embedded apps. The error logs show:

```
{"error":"Failed to get cart","details":"fetch failed"}
```

This happens because the Ajax Cart API (`/cart.js`, `/cart/add.js`) requires:
1. Browser cookies from the customer's storefront session
2. Direct access from the customer's browser (not from a server proxy)
3. The app to be running within a Shopify-hosted theme

## Solution: Use Storefront API Cart (GraphQL)

The **Storefront API Cart** is the correct approach for:
- Headless storefronts
- Embedded apps
- Standalone apps
- Any non-theme integration

### Key Differences

| Feature | Ajax Cart API (❌ Wrong) | Storefront API Cart (✅ Correct) |
|---------|----------------------|------------------------------|
| **Usage** | Themes only | Apps, headless, custom storefronts |
| **Protocol** | REST/JSON | GraphQL |
| **Authentication** | Browser cookies | Storefront Access Token |
| **Cart Storage** | Server-side session | Cart ID (client manages) |
| **Endpoints** | `/cart.js`, `/cart/add.js` | GraphQL mutations |

## Implementation Changes

### 1. Cart ID Management

With Storefront API, **you manage the cart ID** on the client:

```typescript
// Store cart ID in localStorage
localStorage.setItem('shopify-cart-id', cart.id);

// Retrieve it for subsequent operations
const cartId = localStorage.getItem('shopify-cart-id');
```

### 2. Cart Operations

#### Create Cart
```graphql
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
            merchandise {
              ... on ProductVariant {
                id
                title
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
      cost {
        totalAmount {
          amount
          currencyCode
        }
      }
    }
  }
}
```

#### Add Items to Cart
```graphql
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
          }
        }
      }
    }
  }
}
```

#### Update Line Item Quantity
```graphql
mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
  cartLinesUpdate(cartId: $cartId, lines: $lines) {
    cart {
      id
      lines(first: 10) {
        edges {
          node {
            id
            quantity
          }
        }
      }
    }
  }
}
```

#### Remove Line Items
```graphql
mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
  cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
    cart {
      id
      lines(first: 10) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
}
```

#### Get Cart
```graphql
query cart($id: ID!) {
  cart(id: $id) {
    id
    checkoutUrl
    lines(first: 10) {
      edges {
        node {
          id
          quantity
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
          attributes {
            key
            value
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
```

### 3. API Endpoint Structure

Your backend endpoint `/api/shopify/cart/route.ts` should handle these actions:
- `create_cart` - Creates a new cart with initial items
- `add_to_cart` - Adds items to existing cart
- `update_cart_item` - Updates line item quantity
- `remove_from_cart` - Removes line items
- `get_cart` - Retrieves cart by ID

### 4. Cart Lifecycle

```
1. User adds first product
   → Check if cart ID exists in localStorage
   → If NO: Call cartCreate mutation → Save cart ID
   → If YES: Call cartLinesAdd mutation

2. User modifies quantities
   → Call cartLinesUpdate mutation with cart ID

3. User removes items
   → Call cartLinesRemove mutation with cart ID

4. User proceeds to checkout
   → Get checkoutUrl from cart object
   → Redirect user to checkoutUrl
```

## Migration Steps

1. ✅ Update `/api/shopify/cart/route.ts` to use Storefront API (already done)
2. ⏳ Update `CartContext.tsx` to call `/api/shopify/cart` instead of `/api/shopify/cart/ajax`
3. ⏳ Add cart ID management in localStorage
4. ⏳ Update all cart operations to use the new flow
5. ⏳ Remove or deprecate `/api/shopify/cart/ajax/route.ts`
6. ⏳ Update test page to use new implementation

## Benefits

1. **Works in all contexts** - Apps, headless, embedded
2. **More reliable** - No cookie dependency
3. **Better control** - You manage cart state
4. **Consistent** - Same API for web, mobile, etc.
5. **Modern** - GraphQL with type safety

## References

- [Storefront API Cart Documentation](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage)
- [Cart Object Reference](https://shopify.dev/docs/api/storefront/latest/objects/Cart)
- [Cart Mutations Reference](https://shopify.dev/docs/api/storefront/latest/mutations)

