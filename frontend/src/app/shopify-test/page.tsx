'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Cart from '../../components/Cart';
import ProductCard from '../../components/ProductCard';
import CartDebug from '../../components/CartDebug';

interface ShopifyProduct {
  id: number;
  title: string;
  vendor: string;
  product_type: string;
  tags: string;
  variants: Array<{
    id: number;
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

interface StorefrontVariant {
  id: string;
  title: string;
  price: string;
  availableForSale: boolean;
}

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

const MARKETS = [
  { name: 'Italy', locale: 'it', currency: 'EUR', market: 'italy', country: 'IT' },
  { name: 'Spain', locale: 'es', currency: 'EUR', market: 'spain', country: 'ES' },
  { name: 'United Kingdom', locale: 'en', currency: 'GBP', market: 'united-kingdom', country: 'GB' },
  { name: 'United States', locale: 'en', currency: 'USD', market: 'united-states', country: 'US' },
];

export default function ShopifyTestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [shopifyDomain, setShopifyDomain] = useState('');
  const [detectedShop, setDetectedShop] = useState('');
  const [sessionStatus, setSessionStatus] = useState<'unknown' | 'authenticated' | 'unauthenticated'>('unknown');
  const [selectedMarket, setSelectedMarket] = useState(MARKETS[0]);
  const [randomVariants, setRandomVariants] = useState<StorefrontVariant[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [cartTestResults, setCartTestResults] = useState<TestResult[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const qsShop = params.get('shop');
    if (qsShop) {
      setDetectedShop(qsShop);
      if (!shopifyDomain) {
        setShopifyDomain(qsShop);
      }
    }
  }, [shopifyDomain]);

  const authUrl = useMemo(() => {
    if (!shopifyDomain) return null;
    return `/api/shopify/auth/start?shop=${encodeURIComponent(shopifyDomain)}`;
  }, [shopifyDomain]);

  const testShopifyAPI = async () => {
    setIsLoading(true);
    const results: TestResult[] = [];

    try {
      const targetShop = shopifyDomain || detectedShop;

      if (!targetShop) {
        throw new Error('Provide a shop domain (your-store.myshopify.com) and complete OAuth first.');
      }

      // Normalize shop domain - remove https:// if present
      const normalizedShop = targetShop.replace(/^https?:\/\//, '').split('/')[0];

      const response = await fetch(`/api/shopify?shop=${encodeURIComponent(normalizedShop)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.details || `API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      results.push({
        success: data.success,
        message: 'Admin API Connection Test',
        data: {
          status: response.status,
          productCount: data.total || 0,
        },
      });

      if (data.products && data.products.length > 0) {
        setProducts(data.products);
        results.push({
          success: true,
          message: 'Products Data Test',
          data: {
            totalProducts: data.products.length,
            sampleProduct: {
              id: data.products[0].id,
              title: data.products[0].title,
              vendor: data.products[0].vendor,
            },
          },
        });
      } else {
        results.push({
          success: false,
          message: 'Products Data Test',
          error: 'No products found in store',
        });
      }

      setSessionStatus('authenticated');
    } catch (error) {
      setSessionStatus('unauthenticated');
      results.push({
        success: false,
        message: 'Admin API Connection Test',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const fetchRandomVariants = async () => {
    setIsLoadingVariants(true);
    setCartTestResults([]);
    
    try {
      const targetShop = shopifyDomain || detectedShop;

      if (!targetShop) {
        throw new Error('Provide a shop domain first.');
      }

      // Normalize shop domain
      const normalizedShop = targetShop.replace(/^https?:\/\//, '').split('/')[0];

      const response = await fetch(`/api/shopify/products/list?shop=${encodeURIComponent(normalizedShop)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || body.details || `API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.products && data.products.length > 0) {
        // Collect all variants from all products
        const allVariants: StorefrontVariant[] = [];
        data.products.forEach((product: any) => {
          if (product.variants && product.variants.length > 0) {
            product.variants.forEach((variant: any) => {
              allVariants.push({
                id: variant.id,
                title: `${product.title} - ${variant.title}`,
                price: variant.price,
                availableForSale: variant.availableForSale
              });
            });
          }
        });

        // Select 3 random variants (or less if not enough)
        const shuffled = allVariants.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, Math.min(3, allVariants.length));
        setRandomVariants(selected);

        setCartTestResults([{
          success: true,
          message: 'Variants Loaded Successfully',
          data: {
            totalVariants: allVariants.length,
            selectedVariants: selected.length
          }
        }]);
      } else {
        throw new Error('No products with variants found');
      }
    } catch (error) {
      setCartTestResults([{
        success: false,
        message: 'Failed to Load Variants',
        error: error instanceof Error ? error.message : 'Unknown error',
      }]);
    } finally {
      setIsLoadingVariants(false);
    }
  };

  const testCartWithVariant = async (variantId: string, variantTitle: string) => {
    const results: TestResult[] = [...cartTestResults];
    
    try {
      const targetShop = shopifyDomain || detectedShop;

      if (!targetShop) {
        throw new Error('Provide a shop domain first.');
      }

      // Normalize shop domain
      const normalizedShop = targetShop.replace(/^https?:\/\//, '').split('/')[0];

      const response = await fetch(`/api/shopify/cart?shop=${encodeURIComponent(normalizedShop)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_cart',
          variantId: variantId,
          quantity: 1
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || body.details || `API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.cart) {
        results.push({
          success: true,
          message: `Cart Created with ${variantTitle}`,
          data: {
            cartId: data.cart.id,
            itemsCount: data.cart.lines.edges.length,
            checkoutUrl: data.cart.checkoutUrl
          }
        });
      } else {
        throw new Error('Cart creation failed');
      }
    } catch (error) {
      results.push({
        success: false,
        message: `Cart Test Failed for ${variantTitle}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    setCartTestResults(results);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-6 mb-8"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shopify API Test</h1>
              <p className="text-gray-600">Authenticate via OAuth and verify cart/product integrations</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Detected Context</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Query shop parameter</label>
                <input
                  type="text"
                  value={detectedShop || 'Not detected'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session status</label>
                <input
                  type="text"
                  value={
                    sessionStatus === 'authenticated'
                      ? 'Authenticated'
                      : sessionStatus === 'unauthenticated'
                      ? 'Unauthenticated'
                      : 'Unknown'
                  }
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shop to test</label>
                <input
                  type="text"
                  placeholder="your-store.myshopify.com"
                  value={shopifyDomain}
                  onChange={(e) => setShopifyDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Market Selector */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-3">Market & Localization Test</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Market</label>
                <select
                  value={MARKETS.findIndex(m => m.market === selectedMarket.market)}
                  onChange={(e) => setSelectedMarket(MARKETS[parseInt(e.target.value)])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {MARKETS.map((market, index) => (
                    <option key={market.market} value={index}>
                      {market.name} ({market.currency})
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Market Settings:</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Locale:</span> {selectedMarket.locale}</p>
                  <p><span className="font-medium">Currency:</span> {selectedMarket.currency}</p>
                  <p><span className="font-medium">Market:</span> {selectedMarket.market}</p>
                  <p><span className="font-medium">Country:</span> {selectedMarket.country}</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Test URL with market params:</p>
              <code className="block bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                /embed-fast?locale={selectedMarket.locale}&currency={selectedMarket.currency}&market={selectedMarket.market}&country={selectedMarket.country}&shop=your-store.myshopify.com
              </code>
            </div>
          </div>

          {/* Cart & Variants Test Section */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-3">Cart API Test with Real Variants</h2>
            <p className="text-sm text-gray-600 mb-4">
              Load random product variants from your store and test cart creation with the Storefront API.
            </p>
            <button
              onClick={fetchRandomVariants}
              disabled={isLoadingVariants || !shopifyDomain}
              className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isLoadingVariants ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}
              <span>Load Random Variants</span>
            </button>

            {randomVariants.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="font-semibold text-gray-700">Random Variants from Store:</h3>
                {randomVariants.map((variant, index) => (
                  <div key={variant.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{variant.title}</p>
                        <p className="text-sm text-gray-600">Price: {variant.price}</p>
                        <p className="text-xs text-gray-500 font-mono mt-1">{variant.id}</p>
                        <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${variant.availableForSale ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {variant.availableForSale ? 'Available' : 'Not Available'}
                        </span>
                      </div>
                      <button
                        onClick={() => testCartWithVariant(variant.id, variant.title)}
                        disabled={!variant.availableForSale}
                        className="ml-4 flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Test Cart</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cartTestResults.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-gray-700 mb-2">Cart Test Results:</h3>
                <div className="space-y-2">
                  {cartTestResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        {result.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-medium text-sm">{result.message}</span>
                      </div>
                      {result.data && (
                        <div className="text-xs text-gray-600 ml-6">
                          <pre className="bg-white p-2 rounded border overflow-x-auto">{JSON.stringify(result.data, null, 2)}</pre>
                        </div>
                      )}
                      {result.error && <p className="text-xs text-red-600 ml-6">{result.error}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <a
              href={authUrl || '#'}
              onClick={(e) => {
                if (!authUrl) {
                  e.preventDefault();
                  alert('Enter a valid shop domain first.');
                }
              }}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Start OAuth Install</span>
            </a>
            <button
              onClick={testShopifyAPI}
              disabled={isLoading || !shopifyDomain}
              className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              <span>Test Authenticated API</span>
            </button>
          </div>

          <button
            onClick={() => window.open('https://shopify.dev/docs/api/usage/authentication', '_blank', 'noopener')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Learn more about Shopify OAuth requirements
          </button>

          {testResults.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Test Results</h3>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-semibold">{result.message}</span>
                    </div>
                    {result.data && (
                      <div className="text-sm text-gray-600">
                        <pre className="bg-white p-2 rounded border">{JSON.stringify(result.data, null, 2)}</pre>
                      </div>
                    )}
                    {result.error && <p className="text-sm text-red-600">Error: {result.error}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Currency Formatting Demo */}
          <div className="mt-6 mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold mb-4 text-blue-900">Currency Formatting Test</h3>
            <p className="text-sm text-blue-700 mb-4">
              Sample price formatted for current market: <span className="font-mono font-bold">{selectedMarket.locale}</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded border">
                <p className="text-sm text-gray-600 mb-2">Amount: 49.99</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat(
                    selectedMarket.locale === 'en' ? 'en-US' : selectedMarket.locale === 'es' ? 'es-ES' : 'it-IT',
                    { style: 'currency', currency: selectedMarket.currency }
                  ).format(49.99)}
                </p>
              </div>
              <div className="bg-white p-4 rounded border">
                <p className="text-sm text-gray-600 mb-2">Amount: 125.50</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat(
                    selectedMarket.locale === 'en' ? 'en-US' : selectedMarket.locale === 'es' ? 'es-ES' : 'it-IT',
                    { style: 'currency', currency: selectedMarket.currency }
                  ).format(125.50)}
                </p>
              </div>
            </div>
          </div>

          {products.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Products Found ({products.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.slice(0, 9).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {products.length > 9 && (
                <p className="text-sm text-gray-600 mt-4 text-center">
                  Showing first 9 products of {products.length} total
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>

      <div className="mt-8">
        <Cart />
      </div>

      <div className="mt-8">
        <CartDebug />
      </div>
    </div>
  );
}