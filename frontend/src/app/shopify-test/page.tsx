'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, AlertCircle, CheckCircle, Loader2, Play, X, ExternalLink, RefreshCw } from 'lucide-react';
import Cart from '../../components/Cart';
import CartDebug from '../../components/CartDebug';
import * as CartAPI from '../../lib/cart-api';

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

interface SyncTestResult {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'waiting';
  message: string;
  timestamp?: string;
  data?: any;
}

export default function ShopifyTestPage() {
  const [shopifyDomain, setShopifyDomain] = useState('');
  const [detectedShop, setDetectedShop] = useState('');
  const [sessionStatus, setSessionStatus] = useState<'unknown' | 'authenticated' | 'unauthenticated'>('unknown');
  
  // Variants for testing
  const [randomVariants, setRandomVariants] = useState<StorefrontVariant[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  
  // Ajax Cart API Test States
  const [ajaxCartResults, setAjaxCartResults] = useState<TestResult[]>([]);
  const [ajaxVariantId, setAjaxVariantId] = useState('');
  const [ajaxQuantity, setAjaxQuantity] = useState(1);
  const [ajaxLineKey, setAjaxLineKey] = useState('');
  const [ajaxNewQuantity, setAjaxNewQuantity] = useState(2);

  // Sync Test States
  const [syncTestResults, setSyncTestResults] = useState<SyncTestResult[]>([]);
  const [currentSyncTest, setCurrentSyncTest] = useState<number | null>(null);
  const [syncTestVariantId, setSyncTestVariantId] = useState('');

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

  // Load random variants for testing
  const fetchRandomVariants = async () => {
    setIsLoadingVariants(true);
    
    try {
      const targetShop = shopifyDomain || detectedShop;
      if (!targetShop) throw new Error('Provide a shop domain first.');

      const normalizedShop = targetShop.replace(/^https?:\/\//, '').split('/')[0];
      const response = await fetch(`/api/shopify/products/list?shop=${encodeURIComponent(normalizedShop)}`);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || body.details || `API Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.products && data.products.length > 0) {
        const allVariants: StorefrontVariant[] = [];
        data.products.forEach((product: any) => {
          if (product.variants && product.variants.length > 0) {
            product.variants.forEach((variant: any) => {
              // Extract numeric ID from GraphQL ID
              const numericId = variant.id.includes('gid://') 
                ? variant.id.split('/').pop() 
                : variant.id;
              
              allVariants.push({
                id: numericId,
                title: `${product.title} - ${variant.title}`,
                price: variant.price,
                availableForSale: variant.availableForSale
              });
            });
          }
        });

        const shuffled = allVariants.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, Math.min(5, allVariants.length));
        setRandomVariants(selected);
        
        // Auto-fill first variant ID for sync tests
        if (selected.length > 0) {
          setSyncTestVariantId(selected[0].id);
          setAjaxVariantId(selected[0].id);
        }

        setSessionStatus('authenticated');
        logAjaxResult(`Loaded ${selected.length} variants successfully!`, true, { totalVariants: allVariants.length });
      } else {
        throw new Error('No products with variants found');
      }
    } catch (error) {
      setSessionStatus('unauthenticated');
      logAjaxResult('Failed to load variants', false, undefined, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoadingVariants(false);
    }
  };

  // Ajax Cart API Test Functions
  const logAjaxResult = (message: string, success: boolean, data?: any, error?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setAjaxCartResults(prev => [{
      success,
      message: `[${timestamp}] ${message}`,
      data,
      error
    }, ...prev].slice(0, 10)); // Keep last 10 results
  };

  const testGetCart = async () => {
    try {
      const targetShop = shopifyDomain || detectedShop;
      if (!targetShop) throw new Error('Provide a shop domain first');
      
      const normalizedShop = targetShop.replace(/^https?:\/\//, '').split('/')[0];
      logAjaxResult('Fetching cart via Storefront API...', true);
      
      const cartId = CartAPI.getStoredCartId();
      if (!cartId) {
        logAjaxResult('ℹ️ No cart exists yet. Add items to create a cart.', true);
        return;
      }
      
      const result = await CartAPI.getCart(normalizedShop, cartId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get cart');
      }
      
      const cart = result.cart!;
      
      // Auto-populate line key from first item
      if (cart.lines && cart.lines.length > 0) {
        setAjaxLineKey(cart.lines[0].id);
      }
      
      logAjaxResult(
        `✅ Cart: ${cart.lines.length} items, Total: ${cart.cost.totalAmount.currencyCode} ${cart.cost.totalAmount.amount}`,
        true,
        { 
          cartId: cart.id,
          items: cart.lines.map((line) => ({ 
            id: line.id, 
            title: line.merchandise.product.title, 
            qty: line.quantity 
          })) 
        }
      );
    } catch (error) {
      logAjaxResult('❌ Failed to fetch cart', false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testAddToCart = async () => {
    try {
      if (!ajaxVariantId) throw new Error('Enter a variant ID');
      
      const targetShop = shopifyDomain || detectedShop;
      if (!targetShop) throw new Error('Provide a shop domain first');
      
      const normalizedShop = targetShop.replace(/^https?:\/\//, '').split('/')[0];
      logAjaxResult(`Adding variant ${ajaxVariantId} (qty: ${ajaxQuantity})...`, true);
      
      const cartId = CartAPI.getStoredCartId();
      const attributes = [
        { key: 'test', value: 'true' },
        { key: 'added_from', value: 'shopify-test-page' }
      ];
      
      let result;
      if (!cartId) {
        // Create new cart
        result = await CartAPI.createCart(normalizedShop, ajaxVariantId, ajaxQuantity, attributes);
      } else {
        // Add to existing cart
        result = await CartAPI.addToCart(normalizedShop, cartId, ajaxVariantId, ajaxQuantity, attributes);
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to add to cart');
      }

      logAjaxResult(`✅ Product added! Cart has ${result.cart!.lines.length} items`, true, result.cart);
      
      // Auto-refresh cart
      setTimeout(testGetCart, 500);
    } catch (error) {
      logAjaxResult('❌ Failed to add to cart', false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testUpdateCart = async () => {
    try {
      if (!ajaxLineKey) throw new Error('Enter a line item ID');
      
      const targetShop = shopifyDomain || detectedShop;
      if (!targetShop) throw new Error('Provide a shop domain first');
      
      const normalizedShop = targetShop.replace(/^https?:\/\//, '').split('/')[0];
      const cartId = CartAPI.getStoredCartId();
      
      if (!cartId) throw new Error('No cart found. Add items first.');
      
      logAjaxResult(`Updating line to quantity ${ajaxNewQuantity}...`, true);
      
      const result = await CartAPI.updateCartLine(normalizedShop, cartId, ajaxLineKey, ajaxNewQuantity);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update cart');
      }

      logAjaxResult(`✅ Quantity updated! Cart has ${result.cart!.lines.length} items`, true, result.cart);
      
      // Auto-refresh cart
      setTimeout(testGetCart, 500);
    } catch (error) {
      logAjaxResult('❌ Failed to update cart', false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testClearCart = async () => {
    try {
      if (!confirm('Are you sure you want to clear the cart?')) return;
      
      logAjaxResult('Clearing cart...', true);
      
      CartAPI.clearCart();
      
      logAjaxResult('✅ Cart cleared successfully!', true);
      
      // Auto-refresh cart
      setTimeout(testGetCart, 500);
    } catch (error) {
      logAjaxResult('❌ Failed to clear cart', false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const openShopifyCart = () => {
    const targetShop = shopifyDomain || detectedShop;
    if (!targetShop) {
      alert('Enter a shop domain first');
      return;
    }
    const shopUrl = `https://${targetShop.replace(/^https?:\/\//, '').split('/')[0]}`;
    window.open(`${shopUrl}/cart`, '_blank');
  };

  // Sync Test Functions
  const initializeSyncTests = () => {
    const tests: SyncTestResult[] = [
      { id: 1, name: 'App → Store: Add Product', status: 'pending', message: 'Not started' },
      { id: 2, name: 'Store → App: Add Product (Manual)', status: 'pending', message: 'Requires manual verification' },
      { id: 3, name: 'App → Store: Update Quantity', status: 'pending', message: 'Not started' },
      { id: 4, name: 'Store → App: Update Quantity (Manual)', status: 'pending', message: 'Requires manual verification' },
      { id: 5, name: 'App → Store: Remove Product', status: 'pending', message: 'Not started' },
      { id: 6, name: 'Store → App: Remove Product (Manual)', status: 'pending', message: 'Requires manual verification' },
      { id: 7, name: 'App → Store: Clear Cart', status: 'pending', message: 'Not started' },
      { id: 8, name: 'Store → App: Clear Cart (Manual)', status: 'pending', message: 'Requires manual verification' },
      { id: 9, name: 'Polling Auto-Sync (30s)', status: 'pending', message: 'Requires manual verification' },
      { id: 10, name: 'Focus Event Sync', status: 'pending', message: 'Requires manual verification' },
    ];
    setSyncTestResults(tests);
  };

  const updateSyncTest = (id: number, updates: Partial<SyncTestResult>) => {
    setSyncTestResults(prev => prev.map(test => 
      test.id === id ? { ...test, ...updates, timestamp: new Date().toLocaleTimeString() } : test
    ));
  };

  const runSyncTest = async (testId: number) => {
    if (!syncTestVariantId && [1, 3, 5, 7].includes(testId)) {
      alert('Please load variants first (click "Load Random Variants")');
      return;
    }

    const targetShop = shopifyDomain || detectedShop;
    if (!targetShop) {
      alert('Enter a shop domain first');
      return;
    }

    const normalizedShop = targetShop.replace(/^https?:\/\//, '').split('/')[0];
    setCurrentSyncTest(testId);
    updateSyncTest(testId, { status: 'running', message: 'Running...' });

    try {
      switch (testId) {
        case 1: // App → Store: Add Product
          {
            const cartId = CartAPI.getStoredCartId();
            const attributes = [{ key: 'sync_test', value: 'test-1' }];
            
            let result;
            if (!cartId) {
              result = await CartAPI.createCart(normalizedShop, syncTestVariantId, 1, attributes);
            } else {
              result = await CartAPI.addToCart(normalizedShop, cartId, syncTestVariantId, 1, attributes);
            }

            if (!result.success) throw new Error(`Failed to add: ${result.error}`);
            const cartData = result.cart!;

            updateSyncTest(testId, { 
              status: 'passed', 
              message: `✅ Added to cart! ${cartData.lines.length} items total. Verify at /cart on store.`,
              data: { items: cartData.lines.length }
            });

            window.open(`https://${normalizedShop}/cart`, '_blank');
          }
          break;

        case 3: // App → Store: Update Quantity
          {
            const cartId = CartAPI.getStoredCartId();
            if (!cartId) throw new Error('No cart found. Run Test 1 first');
            
            const cartResult = await CartAPI.getCart(normalizedShop, cartId);
            if (!cartResult.success) throw new Error('Failed to fetch cart');
            
            const cart = cartResult.cart!;
            if (!cart.lines || cart.lines.length === 0) {
              throw new Error('Cart is empty. Run Test 1 first');
            }

            const firstItem = cart.lines[0];
            const newQuantity = firstItem.quantity + 1;

            const updateResult = await CartAPI.updateCartLine(normalizedShop, cartId, firstItem.id, newQuantity);

            if (!updateResult.success) throw new Error('Failed to update quantity');

            updateSyncTest(testId, {
              status: 'passed',
              message: `✅ Updated quantity from ${firstItem.quantity} to ${newQuantity}! Verify at /cart.`,
            });

            window.open(`https://${normalizedShop}/cart`, '_blank');
          }
          break;

        case 5: // App → Store: Remove Product
          {
            const cartId = CartAPI.getStoredCartId();
            if (!cartId) throw new Error('No cart found. Run Test 1 first');
            
            const cartResult = await CartAPI.getCart(normalizedShop, cartId);
            if (!cartResult.success) throw new Error('Failed to fetch cart');
            
            const cart = cartResult.cart!;
            if (!cart.lines || cart.lines.length === 0) {
              throw new Error('Cart is empty. Run Test 1 first');
            }

            const firstItem = cart.lines[0];

            const removeResult = await CartAPI.removeFromCart(normalizedShop, cartId, firstItem.id);

            if (!removeResult.success) throw new Error('Failed to remove product');
            const updatedCart = removeResult.cart!;

            updateSyncTest(testId, {
              status: 'passed',
              message: `✅ Removed ${firstItem.merchandise.product.title}! ${updatedCart.lines.length} items remaining.`,
            });

            window.open(`https://${normalizedShop}/cart`, '_blank');
          }
          break;

        case 7: // App → Store: Clear Cart
          {
            CartAPI.clearCart();

            updateSyncTest(testId, {
              status: 'passed',
              message: '✅ Cart cleared! Cart ID removed from storage.',
            });

            window.open(`https://${normalizedShop}/cart`, '_blank');
          }
          break;

        default:
          updateSyncTest(testId, {
            status: 'waiting',
            message: 'Manual test - follow instructions below'
          });
      }
    } catch (error) {
      updateSyncTest(testId, {
        status: 'failed',
        message: `❌ ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setCurrentSyncTest(null);
    }
  };

  const getTestInstructions = (testId: number): string[] => {
    switch (testId) {
      case 2:
        return [
          '1. Open store in new tab',
          '2. Add product to cart from store',
          '3. Return to this tab (switch tabs)',
          '4. Check if cart icon updates in app',
          '5. Mark PASSED if synced immediately'
        ];
      case 4:
        return [
          '1. Open /cart on store',
          '2. Change product quantity',
          '3. Click "Update Cart"',
          '4. Return to this tab',
          '5. Check if app shows new quantity'
        ];
      case 6:
        return [
          '1. Open /cart on store',
          '2. Remove a product',
          '3. Return to this tab',
          '4. Check if app reflects removal'
        ];
      case 8:
        return [
          '1. Open /cart on store',
          '2. Remove all products',
          '3. Return to this tab',
          '4. Check if app shows empty cart'
        ];
      case 9:
        return [
          '1. Keep this tab open',
          '2. In another tab, modify cart on store',
          '3. Wait 30 seconds WITHOUT switching tabs',
          '4. After 30s, check this tab',
          '5. Mark PASSED if cart auto-synced'
        ];
      case 10:
        return [
          '1. Open store in new tab',
          '2. Modify cart on store',
          '3. Switch back to this tab immediately',
          '4. Cart should sync INSTANTLY',
          '5. Mark PASSED if instant sync'
        ];
      default:
        return ['Click "Run Test" to execute automated test'];
    }
  };

  const markSyncTestAs = (testId: number, status: 'passed' | 'failed') => {
    const message = status === 'passed' 
      ? '✅ Manual verification: PASSED' 
      : '❌ Manual verification: FAILED';
    updateSyncTest(testId, { status, message });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-50 border-green-300 text-green-800';
      case 'failed': return 'bg-red-50 border-red-300 text-red-800';
      case 'running': return 'bg-blue-50 border-blue-300 text-blue-800';
      case 'waiting': return 'bg-yellow-50 border-yellow-300 text-yellow-800';
      default: return 'bg-gray-50 border-gray-300 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed': return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'running': return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'waiting': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  // Calculate test statistics
  const syncStats = useMemo(() => {
    if (syncTestResults.length === 0) return null;
    
    const total = syncTestResults.length;
    const passed = syncTestResults.filter(t => t.status === 'passed').length;
    const failed = syncTestResults.filter(t => t.status === 'failed').length;
    const pending = syncTestResults.filter(t => t.status === 'pending').length;
    
    return { total, passed, failed, pending, percentage: Math.round((passed / total) * 100) };
  }, [syncTestResults]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Shopify Integration Test Suite</h1>
                <p className="text-gray-600 mt-1">Cart synchronization & API testing dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                sessionStatus === 'authenticated' ? 'bg-green-100 text-green-700' :
                sessionStatus === 'unauthenticated' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {sessionStatus === 'authenticated' ? '✓ Authenticated' :
                 sessionStatus === 'unauthenticated' ? '✗ Not Authenticated' :
                 '? Unknown'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Setup Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-6"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ Setup & Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Shop Domain</label>
              <input
                type="text"
                placeholder="your-store.myshopify.com"
                value={shopifyDomain}
                onChange={(e) => setShopifyDomain(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Detected from URL</label>
              <input
                type="text"
                value={detectedShop || 'Not detected'}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={authUrl || '#'}
              onClick={(e) => {
                if (!authUrl) {
                  e.preventDefault();
                  alert('Enter a shop domain first');
                }
              }}
              className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md"
            >
              <ExternalLink className="w-5 h-5" />
              <span>Start OAuth</span>
            </a>
            
            <button
              onClick={fetchRandomVariants}
              disabled={isLoadingVariants || !shopifyDomain}
              className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 transition-all shadow-md"
            >
              {isLoadingVariants ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              <span>Load Random Variants</span>
            </button>

            <button
              onClick={() => {
                if (syncTestResults.length === 0) {
                  initializeSyncTests();
                } else {
                  setSyncTestResults([]);
                }
              }}
              className="flex items-center space-x-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-all shadow-md"
            >
              <Play className="w-5 h-5" />
              <span>{syncTestResults.length === 0 ? 'Initialize Sync Tests' : 'Reset Sync Tests'}</span>
            </button>
          </div>

          {randomVariants.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-900 mb-2">✓ Loaded {randomVariants.length} variants for testing</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {randomVariants.map((variant, idx) => (
                  <div key={variant.id} className="text-xs bg-white p-2 rounded border border-green-200">
                    <p className="font-medium truncate">{variant.title}</p>
                    <p className="text-gray-600">ID: {variant.id} • ${variant.price}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Bidirectional Sync Tests */}
        {syncTestResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">🔄 Bidirectional Cart Synchronization Tests</h2>
                <p className="text-gray-600 mt-1">Verify that cart changes sync between app and store</p>
              </div>
              {syncStats && (
                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{syncStats.percentage}%</div>
                    <div className="text-gray-600">Complete</div>
                  </div>
                  <div className="text-gray-400">|</div>
                  <div className="space-y-1">
                    <div className="text-green-600">✓ {syncStats.passed} passed</div>
                    <div className="text-red-600">✗ {syncStats.failed} failed</div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {syncTestResults.map((test) => (
                <div
                  key={test.id}
                  className={`border-2 rounded-lg p-4 transition-all ${getStatusColor(test.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getStatusIcon(test.status)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{test.name}</h3>
                          {test.timestamp && (
                            <span className="text-xs opacity-75">{test.timestamp}</span>
                          )}
                        </div>
                        <p className="text-sm mt-1">{test.message}</p>
                        
                        {/* Instructions for manual tests */}
                        {['waiting', 'pending'].includes(test.status) && [2, 4, 6, 8, 9, 10].includes(test.id) && (
                          <div className="mt-3 p-3 bg-white/50 rounded border border-current/20">
                            <p className="text-xs font-semibold mb-2">📋 Manual Test Instructions:</p>
                            <ol className="text-xs space-y-1">
                              {getTestInstructions(test.id).map((instruction, idx) => (
                                <li key={idx}>{instruction}</li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {test.data && (
                          <details className="mt-2">
                            <summary className="text-xs cursor-pointer hover:underline">View details</summary>
                            <pre className="mt-2 text-xs bg-white/50 p-2 rounded overflow-x-auto">
                              {JSON.stringify(test.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {[1, 3, 5, 7].includes(test.id) && (
                        <button
                          onClick={() => runSyncTest(test.id)}
                          disabled={currentSyncTest !== null || test.status === 'running'}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
                        >
                          {test.status === 'running' ? 'Running...' : 'Run Test'}
                        </button>
                      )}
                      
                      {[2, 4, 6, 8, 9, 10].includes(test.id) && test.status === 'waiting' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => markSyncTestAs(test.id, 'passed')}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700"
                          >
                            ✓ Pass
                          </button>
                          <button
                            onClick={() => markSyncTestAs(test.id, 'failed')}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700"
                          >
                            ✗ Fail
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Testing Tips:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Automated tests (1, 3, 5, 7) will open store cart in new tab for verification</li>
                <li>• Manual tests (2, 4, 6, 8, 9, 10) require you to follow instructions and mark as passed/failed</li>
                <li>• Test 9 verifies 30-second polling - don't switch tabs for 30s</li>
                <li>• Test 10 verifies focus event - switch tabs immediately after modifying cart</li>
                <li>• Check the Cart component below to see if changes sync to the app</li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* Ajax Cart API Direct Tests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">🛒 Cart Ajax API Direct Tests</h2>
              <p className="text-gray-600 mt-1">Low-level cart operations using Ajax API proxy</p>
            </div>
            <button
              onClick={openShopifyCart}
              disabled={!shopifyDomain}
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Store Cart</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Get Cart */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">Read Cart</h3>
              <button
                onClick={testGetCart}
                disabled={!shopifyDomain}
                className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                GET /cart.js
              </button>
            </div>

            {/* Add to Cart */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">Add Product</h3>
              <input
                type="text"
                placeholder="Variant ID"
                value={ajaxVariantId}
                onChange={(e) => setAjaxVariantId(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
              />
              <button
                onClick={testAddToCart}
                disabled={!shopifyDomain || !ajaxVariantId}
                className="w-full bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                POST /cart/add.js
              </button>
            </div>

            {/* Update Cart */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">Update Qty</h3>
              <input
                type="text"
                placeholder="Line Key"
                value={ajaxLineKey}
                onChange={(e) => setAjaxLineKey(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
              />
              <input
                type="number"
                placeholder="New Qty"
                value={ajaxNewQuantity}
                onChange={(e) => setAjaxNewQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
              />
              <button
                onClick={testUpdateCart}
                disabled={!shopifyDomain || !ajaxLineKey}
                className="w-full bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 text-sm"
              >
                POST /cart/change.js
              </button>
            </div>

            {/* Clear Cart */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">Clear Cart</h3>
              <button
                onClick={testClearCart}
                disabled={!shopifyDomain}
                className="w-full bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
              >
                POST /cart/clear.js
              </button>
            </div>
          </div>

          {/* Ajax Results */}
          {ajaxCartResults.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-700">Recent Operations:</h3>
                <button
                  onClick={() => setAjaxCartResults([])}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear Log
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {ajaxCartResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border text-sm ${
                      result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-xs">{result.message}</p>
                        {result.data && (
                          <details className="mt-1">
                            <summary className="text-xs text-gray-600 cursor-pointer">Details</summary>
                            <pre className="mt-1 text-xs bg-white p-2 rounded overflow-x-auto">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </details>
                        )}
                        {result.error && <p className="text-xs text-red-600 mt-1">{result.error}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Live Cart Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <Cart />
        </motion.div>

        {/* Cart Debug */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <CartDebug />
        </motion.div>
      </div>
    </div>
  );
}
