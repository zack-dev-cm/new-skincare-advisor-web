'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  ReactNode,
  useRef,
  useCallback,
} from 'react';
import { Cart as AppBridgeCart } from '@shopify/app-bridge/actions';
import CartToast from './CartToast';
import BottomToolbar from './BottomToolbar';
import { getAppBridge, getAuthenticatedFetch } from '../lib/app-bridge-client';
import { getShopifyDomain } from '../lib/shopify';
import * as CartAPI from '../lib/cart-api';

// Types
export interface CartItem {
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
  lines: CartItem[];
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

interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  showCartToast: boolean;
  lastAddedProduct: {
    name: string;
    image: string;
    price: number;
  } | null;
  showGlobalLoading: boolean;
  showBottomToolbar: boolean;
}

type CartAction =
  | { type: 'SET_CART'; payload: Cart }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_CART' }
  | { type: 'SHOW_CART_TOAST'; payload: {name: string; image: string; price: number} }
  | { type: 'HIDE_CART_TOAST' }
  | { type: 'SHOW_BOTTOM_TOOLBAR' }
  | { type: 'HIDE_BOTTOM_TOOLBAR' }
  | { type: 'SHOW_GLOBAL_LOADING' }
  | { type: 'HIDE_GLOBAL_LOADING' };

// Initial state
const initialState: CartState = {
  cart: null,
  loading: false,
  error: null,
  showCartToast: false,
  lastAddedProduct: null,
  showGlobalLoading: false,
  showBottomToolbar: false,
};

// Reducer
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'SET_CART':
      return {
        ...state,
        cart: action.payload,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    case 'CLEAR_CART':
      return {
        ...state,
        cart: null,
        error: null,
        showBottomToolbar: false,
      };
    case 'SHOW_CART_TOAST':
      return {
        ...state,
        showCartToast: true,
        lastAddedProduct: action.payload,
      };
    case 'HIDE_CART_TOAST':
      return {
        ...state,
        showCartToast: false,
        lastAddedProduct: null,
      };
    case 'SHOW_BOTTOM_TOOLBAR':
      return {
        ...state,
        showBottomToolbar: true,
      };
    case 'HIDE_BOTTOM_TOOLBAR':
      return {
        ...state,
        showBottomToolbar: false,
      };
    case 'SHOW_GLOBAL_LOADING':
      return {
        ...state,
        showGlobalLoading: true,
      };
    case 'HIDE_GLOBAL_LOADING':
      return {
        ...state,
        showGlobalLoading: false,
      };
    default:
      return state;
  }
}

// Context
interface CartContextType {
  state: CartState;
  addToCart: (variantId: string, quantity?: number, customAttributes?: Array<{key: string, value: string}>, productInfo?: {name: string; image: string; price: number}) => Promise<void>;
  updateCartItem: (lineId: string, quantity: number) => Promise<void>;
  removeFromCart: (lineId: string) => Promise<void>;
  getCart: (cartId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  isProductInCart: (variantId: string) => boolean;
  getCartItemLineId: (variantId: string) => string | null;
  refreshCart: () => Promise<void>;
  showCartToast: (product: {name: string; image: string; price: number}) => void;
  hideCartToast: () => void;
  showBottomToolbar: () => void;
  hideBottomToolbar: () => void;
  proceedToCheckout: () => void;
  showGlobalLoading: () => void;
  hideGlobalLoading: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Provider component
interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const [lastSuccessModalTime, setLastSuccessModalTime] = useState<number>(0);
  const shopDomainRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      shopDomainRef.current = getShopifyDomain() || null;
    }
  }, []);

  const performCartRequest = useCallback(async (payload: Record<string, unknown>) => {
    const fetchImpl = getAuthenticatedFetch();
    const executor = fetchImpl ?? fetch;
    const shop = shopDomainRef.current;
    const url = shop ? `/api/shopify/cart?shop=${encodeURIComponent(shop)}` : '/api/shopify/cart';

    return executor(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
  }, []);


  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('shopify-cart');
    if (savedCart) {
      try {
        const cart = JSON.parse(savedCart);
        dispatch({ type: 'SET_CART', payload: cart });
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
        localStorage.removeItem('shopify-cart');
      }
    }
  }, []);

  // Save cart to localStorage when it changes
  useEffect(() => {
    if (state.cart) {
      localStorage.setItem('shopify-cart', JSON.stringify(state.cart));
    } else {
      localStorage.removeItem('shopify-cart');
    }
  }, [state.cart]);

  // Listen for cart updates from Shopify integration
  useEffect(() => {
    if (getAppBridge()) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      console.log('CartContext received message:', event.data);
      
      if (event.data.type === 'CART_UPDATE_SUCCESS' || event.data.type === 'CART_INITIAL_STATE') {
        const cartData = event.data.payload.cart;
        console.log('Processing cart data:', cartData);
        console.log('Cart has items:', cartData?.items?.length || 0);
        
        if (cartData && cartData.items && cartData.items.length > 0) {
          // Transform the cart data to match our expected format
          const transformedCart: Cart = {
            id: cartData.id || 'cart',
            checkoutUrl: cartData.checkout_url || '/cart',
            lines: cartData.items.map((item: any) => ({
              id: item.key || item.id,
              quantity: item.quantity,
              merchandise: {
                id: `gid://shopify/ProductVariant/${item.variant_id}`,
                title: item.product_title || item.title,
                price: {
                  amount: (item.final_price / 100).toString(),
                  currencyCode: 'EUR'
                },
                product: {
                  title: item.product_title || item.title,
                  images: item.image ? [{
                    url: item.image,
                    altText: item.product_title || item.title,
                  }] : [],
                },
              },
              attributes: item.properties ? Object.entries(item.properties).map(([key, value]) => ({
                key,
                value: value as string
              })) : [],
            })),
            cost: {
              subtotalAmount: {
                amount: (cartData.total_price / 100).toString(),
                currencyCode: 'EUR'
              },
              totalAmount: {
                amount: (cartData.total_price / 100).toString(),
                currencyCode: 'EUR'
              },
            },
          };

          console.log('Transformed cart:', transformedCart);
          console.log('Cart lines count:', transformedCart.lines.length);
          dispatch({ type: 'SET_CART', payload: transformedCart });
          
          // Only show cart toast for CART_UPDATE_SUCCESS (not CART_INITIAL_STATE)
          // and only if we have specific added products info
          if (event.data.type === 'CART_UPDATE_SUCCESS' && event.data.payload.addedProducts) {
            console.log('Showing cart toast for added products:', event.data.payload.addedProducts);
            // Prevent multiple toasts by checking if we've shown a toast recently
            const now = Date.now();
            if (now - lastSuccessModalTime > 2000) { // 2 second cooldown
              // Use the product info from the message if available
              const addedProduct = event.data.payload.addedProducts[0]; // Show only first product
              if (addedProduct) {
                const productInfo = {
                  name: addedProduct.name || addedProduct.title || addedProduct.product_title || 'Product',
                  image: addedProduct.image || '/placeholder-product.png',
                  price: addedProduct.price || addedProduct.final_price || 0
                };
                dispatch({ type: 'SHOW_CART_TOAST', payload: productInfo });
                dispatch({ type: 'SHOW_BOTTOM_TOOLBAR' });
                setLastSuccessModalTime(now);
              }
            } else {
              console.log('Skipping success toast - too soon since last one');
            }
          } else {
            console.log('Not showing success toast - type:', event.data.type, 'has addedProducts:', !!event.data.payload.addedProducts);
          }
          // Remove the fallback that shows all cart items - we only want to show newly added products
        } else {
          // Handle empty cart
          console.log('Cart is empty, clearing cart state');
          dispatch({ type: 'CLEAR_CART' });
        }
      } else if (event.data.type === 'CART_DATA') {
        console.log('Processing CART_DATA message');
        // Handle the CART_DATA format from Shopify's /cart.js API
        const cartData = event.data.payload.cart;
        
        if (cartData && cartData.items && cartData.items.length > 0) {
          // Transform the cart data to match our expected format
          const transformedCart: Cart = {
            id: cartData.token || 'cart',
            checkoutUrl: '/cart',
            lines: cartData.items.map((item: any) => ({
              id: item.key || item.id,
              quantity: item.quantity,
              merchandise: {
                id: `gid://shopify/ProductVariant/${item.variant_id}`,
                title: item.product_title || item.title,
                price: {
                  amount: (item.final_price / 100).toString(),
                  currencyCode: cartData.currency || 'EUR'
                },
                product: {
                  title: item.product_title || item.title,
                  images: item.image ? [{
                    url: item.image,
                    altText: item.product_title || item.title,
                  }] : [],
                },
              },
              attributes: item.properties ? Object.entries(item.properties).map(([key, value]) => ({
                key,
                value: value as string
              })) : [],
            })),
            cost: {
              subtotalAmount: {
                amount: (cartData.total_price / 100).toString(),
                currencyCode: cartData.currency || 'EUR'
              },
              totalAmount: {
                amount: (cartData.total_price / 100).toString(),
                currencyCode: cartData.currency || 'EUR'
              },
            },
          };

          console.log('Transformed cart from CART_DATA:', transformedCart);
          dispatch({ type: 'SET_CART', payload: transformedCart });
        } else {
          // Handle empty cart
          console.log('Cart is empty from CART_DATA, clearing cart state');
          dispatch({ type: 'CLEAR_CART' });
        }
      } else if (event.data.type === 'ROUTINE_ADD_SUCCESS') {
        console.log('Processing ROUTINE_ADD_SUCCESS message');
        // Handle routine added to cart
        const routineData = event.data.payload;
        console.log('Routine added to cart:', routineData);
        
        // Show cart toast for the added routine products
        if (routineData && routineData.products) {
          // Prevent multiple toasts by checking if we've shown a toast recently
          const now = Date.now();
          if (now - lastSuccessModalTime > 2000) { // 2 second cooldown
            const addedProduct = routineData.products[0]; // Show only first product
            if (addedProduct) {
              const productInfo = {
                name: addedProduct.name || addedProduct.title || addedProduct.product_title || 'Product',
                image: addedProduct.image || '/placeholder-product.png',
                price: addedProduct.price || addedProduct.final_price || 0
              };
              dispatch({ type: 'SHOW_CART_TOAST', payload: productInfo });
              dispatch({ type: 'SHOW_BOTTOM_TOOLBAR' });
              setLastSuccessModalTime(now);
            }
          } else {
            console.log('Skipping routine success toast - too soon since last one');
          }
        }
      } else {
        console.log('Unhandled message type:', event.data.type);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Cart state is managed via Storefront API only
  // No need to request legacy cart state


  // Helper function to extract numeric ID from GraphQL ID
  const extractNumericId = (graphqlId: string): string => {
    if (!graphqlId) return '';
    // Extract the numeric part from gid://shopify/ProductVariant/123456789
    const match = graphqlId.match(/\/(\d+)$/);
    return match ? match[1] : graphqlId;
  };

  // Helper function to check if a product is in cart
  const isProductInCart = (variantId: string): boolean => {
    if (!state.cart) return false;
    const numericId = extractNumericId(variantId);
    return state.cart.lines.some(line => {
      const lineNumericId = extractNumericId(line.merchandise.id);
      return lineNumericId === numericId;
    });
  };

  // Helper function to get cart item line ID
  const getCartItemLineId = (variantId: string): string | null => {
    if (!state.cart) return null;
    const numericId = extractNumericId(variantId);
    const line = state.cart.lines.find(line => {
      const lineNumericId = extractNumericId(line.merchandise.id);
      return lineNumericId === numericId;
    });
    return line ? line.id : null;
  };

  // Helper function to refresh cart from server
  const refreshCart = useCallback(async () => {
    try {
      const shop = getShopifyDomain();
      if (!shop) {
        console.error('No shop domain available');
        return;
      }
      
      // Get cart ID from storage
      const cartId = CartAPI.getStoredCartId();
      if (!cartId) {
        console.log('No cart ID found in storage');
        return;
      }
      
      // Use Storefront API to get cart
      const result = await CartAPI.getCart(shop, cartId);
      
      if (result.success && result.cart) {
        dispatch({ type: 'SET_CART', payload: result.cart });
      } else {
        console.error('Failed to refresh cart:', result.error);
        // If cart not found or expired, clear the cart state
        if (result.error?.includes('not found')) {
          dispatch({ type: 'CLEAR_CART' });
        }
      }
    } catch (error) {
      console.error('Failed to refresh cart:', error);
    }
  }, []);

  // Subscribe to App Bridge cart updates
  useEffect(() => {
    const app = getAppBridge();
    if (!app) return;
    const unsubscribe = app.subscribe(AppBridgeCart.Action.UPDATE, () => {
      refreshCart();
    });
    return () => {
      unsubscribe();
    };
  }, [refreshCart]);

  // Automatic cart polling every 30 seconds to sync with Shopify store
  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshCart();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(intervalId);
  }, [refreshCart]);

  // Refresh cart when page gains focus (user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      console.log('Page focused - refreshing cart');
      refreshCart();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page visible - refreshing cart');
        refreshCart();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshCart]);

  // Initial cart load on mount
  useEffect(() => {
    console.log('CartContext mounted - loading initial cart');
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (
    variantId: string,
    quantity: number = 1,
    customAttributes?: Array<{ key: string; value: string }>,
    productInfo?: { name: string; image: string; price: number }
  ) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SHOW_GLOBAL_LOADING' });

    try {
      const shop = getShopifyDomain();
      if (!shop) {
        throw new Error('No shop domain available');
      }

      // Add recommended_by_dermaself attribute
      const attributes = [
        { key: 'recommended_by_dermaself', value: 'true' },
        ...(customAttributes || [])
      ];

      // Check if cart exists
      const cartId = CartAPI.getStoredCartId();
      
      let result;
      if (!cartId) {
        // Create new cart with first item
        console.log('Creating new cart with variant:', variantId);
        result = await CartAPI.createCart(shop, variantId, quantity, attributes);
      } else {
        // Add to existing cart
        console.log('Adding to existing cart:', cartId);
        result = await CartAPI.addToCart(shop, cartId, variantId, quantity, attributes);
      }

      if (result.success && result.cart) {
        dispatch({ type: 'SET_CART', payload: result.cart });
        
        // Show success toast
        const now = Date.now();
        if (now - lastSuccessModalTime > 2000) {
          const addedProduct = productInfo || {
            name: result.cart.lines[result.cart.lines.length - 1]?.merchandise.product.title || 'Product',
            image: result.cart.lines[result.cart.lines.length - 1]?.merchandise.product.images[0]?.url || '/placeholder-product.png',
            price: parseFloat(result.cart.lines[result.cart.lines.length - 1]?.merchandise.price.amount || '0') * 100
          };
          dispatch({ type: 'SHOW_CART_TOAST', payload: addedProduct });
          dispatch({ type: 'SHOW_BOTTOM_TOOLBAR' });
          setLastSuccessModalTime(now);
        }
      } else {
        throw new Error(result.error || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to add item to cart' 
      });
    } finally {
      setTimeout(() => {
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'HIDE_GLOBAL_LOADING' });
      }, 1000);
    }
  };

  const updateCartItem = async (lineId: string, quantity: number) => {
    if (!state.cart) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SHOW_GLOBAL_LOADING' });

    try {
      const shop = getShopifyDomain();
      if (!shop) {
        throw new Error('No shop domain available');
      }
      
      const cartId = state.cart.id;
      
      // Use Storefront API to update cart line
      const result = await CartAPI.updateCartLine(shop, cartId, lineId, quantity);

      if (result.success && result.cart) {
        dispatch({ type: 'SET_CART', payload: result.cart });
      } else {
        throw new Error(result.error || 'Failed to update cart item');
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to update cart item' 
      });
    } finally {
      setTimeout(() => {
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'HIDE_GLOBAL_LOADING' });
      }, 1500);
    }
  };

  const removeFromCart = async (lineId: string) => {
    console.log('removeFromCart called with lineId:', lineId);
    if (!state.cart) {
      console.log('No cart state available');
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SHOW_GLOBAL_LOADING' });

    try {
      const shop = getShopifyDomain();
      if (!shop) {
        throw new Error('No shop domain available');
      }
      
      const cartId = state.cart.id;
      
      // Use Storefront API to remove cart line
      const result = await CartAPI.removeFromCart(shop, cartId, lineId);

      if (result.success && result.cart) {
        dispatch({ type: 'SET_CART', payload: result.cart });
      } else {
        throw new Error(result.error || 'Failed to remove item from cart');
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to remove item from cart' 
      });
    } finally {
      setTimeout(() => {
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'HIDE_GLOBAL_LOADING' });
      }, 1500);
    }
  };

  const getCart = async (cartId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const shop = getShopifyDomain();
      if (!shop) {
        throw new Error('No shop domain available');
      }
      
      // Use Storefront API to get cart
      const result = await CartAPI.getCart(shop, cartId);

      if (result.success && result.cart) {
        dispatch({ type: 'SET_CART', payload: result.cart });
      } else {
        throw new Error(result.error || 'Failed to get cart');
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to get cart' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearCart = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SHOW_GLOBAL_LOADING' });

    try {
      // Clear cart ID from storage (Storefront API doesn't have a "clear" mutation)
      CartAPI.clearCart();
      
      // Clear local state
      dispatch({ type: 'CLEAR_CART' });
    } catch (error) {
      console.error('Error clearing cart:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to clear cart' 
      });
    } finally {
      setTimeout(() => {
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'HIDE_GLOBAL_LOADING' });
      }, 1000);
    }
  };

  const showCartToast = (product: {name: string; image: string; price: number}) => {
    dispatch({ type: 'SHOW_CART_TOAST', payload: product });
  };

  const hideCartToast = () => {
    dispatch({ type: 'HIDE_CART_TOAST' });
  };

  const showBottomToolbar = () => {
    dispatch({ type: 'SHOW_BOTTOM_TOOLBAR' });
  };

  const hideBottomToolbar = () => {
    dispatch({ type: 'HIDE_BOTTOM_TOOLBAR' });
  };

  const proceedToCheckout = async () => {
    // Hide the toast first
    dispatch({ type: 'HIDE_CART_TOAST' });
    
    // Set loading state for checkout
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      if (typeof window === 'undefined') return;
      
      // Use the Storefront API checkout URL directly
      if (state.cart && state.cart.checkoutUrl) {
        console.log('Navigating to Storefront API checkout:', state.cart.checkoutUrl);
        
        if (window.parent !== window) {
          // For embedded apps, navigate parent window
          window.parent.location.href = state.cart.checkoutUrl;
        } else {
          window.location.href = state.cart.checkoutUrl;
        }
      } else {
        console.error('No checkout URL available in cart');
        throw new Error('No checkout URL available');
      }
    } catch (error) {
      console.error('Error proceeding to checkout:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to proceed to checkout' 
      });
    } finally {
      // Reset loading state after a short delay to allow navigation to complete
      setTimeout(() => {
        dispatch({ type: 'SET_LOADING', payload: false });
      }, 1000);
    }
  };



  const showGlobalLoading = () => {
    dispatch({ type: 'SHOW_GLOBAL_LOADING' });
  };

  const hideGlobalLoading = () => {
    dispatch({ type: 'HIDE_GLOBAL_LOADING' });
  };

  const value: CartContextType = {
    state,
    addToCart,
    updateCartItem,
    removeFromCart,
    getCart,
    clearCart,
    isProductInCart,
    getCartItemLineId,
    refreshCart,
    showCartToast,
    hideCartToast,
    showBottomToolbar,
    hideBottomToolbar,
    proceedToCheckout,
    showGlobalLoading,
    hideGlobalLoading,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      
      {/* Cart Toast */}
      {state.showCartToast && state.lastAddedProduct && (
        <CartToast
          isVisible={state.showCartToast}
          onClose={hideCartToast}
          onGoToCart={() => {
            hideCartToast();
            // Navigate to Storefront API checkout URL
            if (typeof window !== 'undefined' && state.cart?.checkoutUrl) {
              if (window.parent !== window) {
                window.parent.location.href = state.cart.checkoutUrl;
              } else {
                window.location.href = state.cart.checkoutUrl;
              }
            }
          }}
          productName={state.lastAddedProduct.name}
          cartItemCount={state.cart?.lines.reduce((total, line) => total + line.quantity, 0) || 0}
        />
      )}

      {/* Bottom Toolbar */}
      {state.cart && state.cart.lines.length > 0 && state.showBottomToolbar && (
        <BottomToolbar
          isVisible={true}
          onProceedToCheckout={proceedToCheckout}
          onClose={hideBottomToolbar}
          cartItemCount={state.cart.lines.reduce((total, line) => total + line.quantity, 0)}
          totalAmount={parseFloat(state.cart.cost.totalAmount.amount) * 100}
          currencyCode={state.cart.cost.totalAmount.currencyCode}
        />
      )}
      
      {/* Global Loading Overlay */}
      {state.showGlobalLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}
    </CartContext.Provider>
  );
}

// Hook to use cart context
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
} 