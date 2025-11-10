# Shopify Compliance Notes

## Required Environment Variables

Set the following (server-side unless indicated):

- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_APP_URL` (public HTTPS entrypoint of the app)
- `SHOPIFY_API_SCOPES` (comma-separated scopes, e.g. `read_products,write_checkouts,write_cart,write_storefront_access_tokens`)
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN` (Storefront API token stored server-side)
- `SHOPIFY_WEBHOOK_SECRET` (shared secret used to validate incoming webhooks)
- `NEXT_PUBLIC_SHOPIFY_API_KEY` (client-side key required for App Bridge bootstrap)

Legacy `NEXT_PUBLIC_SHOPIFY_ACCESS_TOKEN` is no longer used; Admin tokens stay server-side.

## OAuth Flow

1. Install via `GET /api/shopify/auth/start?shop={shop-domain}`.
2. Shopify redirects to `/api/shopify/auth/callback`; the handler validates the HMAC/state, exchanges the code for an Admin token, and stores the session in memory.
3. On success the user is redirected to `SHOPIFY_APP_URL` with `shop`/`scope` query params. The cookie `ds_shopify_shop` is set for subsequent API calls.

> **Note**: The current session store is in-memory. For production, persist sessions (e.g. database, Redis) so tokens survive restarts.

## API Behaviour

- Admin endpoints (`/api/shopify`) require an authenticated session. The server retrieves the access token from the session store; no public env tokens are used.
- Storefront endpoints (`/api/shopify/cart`, `/api/shopify/storefront`, product lookups) inspect the session to determine the shop domain and call the Storefront API with the server-held token.
- SSE endpoint `/api/shopify/cart-events` now validates that the shop is authenticated before streaming updates.
- Webhook registration (`/api/shopify/setup-webhooks`) pulls the Admin token from the session and uses `SHOPIFY_WEBHOOK_SECRET` for signature verification.

## App Bridge Integration

- Added `@shopify/app-bridge` and `@shopify/app-bridge-utils`. Install dependencies:
  ```bash
  npm install
  ```
- `CartContext` now uses App Bridge authenticated fetch for cart mutations; `CART::UPDATE` events trigger server refreshes. Custom `postMessage` bridge is used only as a fallback when App Bridge is unavailable.
- Client helpers are in `frontend/src/lib/app-bridge-client.ts`.

## Testing

- Use `/shopify-test` to drive OAuth and verify the Admin API:
  1. Enter the shop domain (e.g. `your-store.myshopify.com`).
  2. Click **Start OAuth Install**.
  3. After redirect back, click **Test Authenticated API** to confirm tokens and fetch sample products.
- Cart flows automatically hit `/api/shopify/cart` using session-authenticated requests; to validate run through add/update/remove operations and ensure webhooks broadcast updates (SSE clients require authentication).

## Deployment Checklist

1. Configure environment variables above for each merchant.
2. Deploy updated code and install dependencies.
3. Ensure the app is reachable at `SHOPIFY_APP_URL` over HTTPS.
4. Run the OAuth install for each shop.
5. (Optional) Swap the in-memory session store with a persistent implementation before scaling.

