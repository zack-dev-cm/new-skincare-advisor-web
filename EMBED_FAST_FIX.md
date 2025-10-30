# Embed-Fast 404 Error Fix

## Problem
When accessing `/embed-fast` with query parameters from a Shopify iframe, the page was returning 404 errors for JavaScript chunks:

```
GET https://proud-sand-065a1dc03.2.azurestaticapps.net/_next/static/chunks/1172-fed562944da47f92.js net::ERR_ABORTED 404
GET ...app/embed-fast/page-8cb1710b02d5eec8.js net::ERR_ABORTED 404
GET ...webpack-5b86216bbc153c6e.js net::ERR_ABORTED 404
```

The issue occurred only when query parameters were present in the URL (e.g., `/embed-fast?shop=...&locale=en&currency=EUR`), but worked fine when accessing the page directly without parameters.

## Root Cause
Azure Static Web Apps' `staticwebapp.config.json` was using a catch-all route that served all requests to `index.html`, including Next.js static assets (`/_next/*` files). When query parameters were present, the routing mechanism was interfering with asset loading.

## Solution

### 1. Fixed `staticwebapp.config.json`
Updated the Azure Static Web Apps configuration to properly exclude Next.js assets from the navigation fallback:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": [
      "/_next/*",           // Exclude all Next.js assets
      "/static/*",          // Exclude static files
      "/*.css",             // Exclude CSS files
      "/*.js",              // Exclude JS files
      /* ... other assets ... */
    ]
  }
}
```

This ensures that JavaScript chunks and other assets are served directly by Azure Static Web Apps, not through the fallback route.

### 2. Improved `next.config.js`
- Added specific cache headers for `/_next/static/*` paths
- Ensured proper trailing slash handling
- Clarified that basePath/assetPrefix shouldn't be used

### 3. Updated Embed Implementation
Created a new embed snippet (`shopify-embed-fixed.html`) that:
- **Loads iframe WITHOUT query parameters** to avoid routing issues
- **Sends store data via postMessage** after iframe loads
- Maintains backward compatibility with query parameter approach

### 4. Updated `embed-fast/page.tsx`
- Added support for receiving store data via postMessage (preferred method)
- Maintained fallback to query parameters for backward compatibility

## Files Changed

1. `frontend/staticwebapp.config.json` - Fixed asset routing
2. `frontend/next.config.js` - Improved caching configuration
3. `frontend/src/app/embed-fast/page.tsx` - Added postMessage support
4. `shopify-embed-fixed.html` - New embed snippet (use this!)

## How to Use the Fix

### For New Implementations (Recommended)
Use the new embed snippet from `shopify-embed-fixed.html` in your Shopify theme. This version:
- ✅ Avoids query parameter routing issues
- ✅ Loads faster and more reliably
- ✅ Better security (data passed via postMessage)

### For Existing Implementations
The fix maintains backward compatibility with query parameters. However, you'll need to redeploy the app to Azure Static Web Apps for the `staticwebapp.config.json` changes to take effect.

## Deployment Steps

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "Fix embed-fast 404 errors with query parameters"
   git push
   ```

2. **Redeploy to Azure Static Web Apps:**
   - The deployment should automatically trigger
   - Wait for deployment to complete

3. **Test the fix:**
   - Try accessing `/embed-fast` without parameters (should still work)
   - Try accessing with query parameters (should now work)
   - Test the new embed snippet in Shopify

4. **Update Shopify theme** (optional, for new implementation):
   - Replace the existing embed code with `shopify-embed-fixed.html`
   - This avoids the issue entirely

## Verification

After deployment, test both approaches:

### Old Approach (Query Parameters)
```
https://proud-sand-065a1dc03.2.azurestaticapps.net/embed-fast?shop=test.myshopify.com&locale=en&currency=EUR
```
Should now load without 404 errors.

### New Approach (postMessage)
Use `shopify-embed-fixed.html` - no query parameters, data sent via postMessage after page load.

## Expected Behavior

- ✅ Iframe loads successfully
- ✅ JavaScript chunks load without 404 errors
- ✅ Modal opens and functions correctly
- ✅ Store data is passed correctly (either method)
- ✅ No console errors

## Troubleshooting

If you still see issues after deployment:

1. **Clear browser cache** - Old chunks might be cached
2. **Check Azure deployment logs** - Ensure config was deployed
3. **Verify staticwebapp.config.json** - Should be in the built output
4. **Check browser console** - Look for specific error messages

## Additional Notes

- The fix works with both approaches (query params and postMessage)
- Query parameters are kept as a fallback for existing implementations
- The new postMessage approach is preferred for new implementations
- No breaking changes for existing integrations

