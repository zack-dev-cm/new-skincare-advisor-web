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

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export default function ShopifyTestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [shopifyDomain, setShopifyDomain] = useState('');
  const [detectedShop, setDetectedShop] = useState('');
  const [sessionStatus, setSessionStatus] = useState<'unknown' | 'authenticated' | 'unauthenticated'>('unknown');

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

      const response = await fetch(`/api/shopify?shop=${encodeURIComponent(targetShop)}`, {
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