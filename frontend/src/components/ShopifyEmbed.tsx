'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import SkinAnalysis from './SkinAnalysis';

interface ShopifyEmbedProps {
  shopifyDomain?: string;
  productId?: string;
  onProductRecommendation?: (productId: string) => void;
}

export default function ShopifyEmbed({ 
  shopifyDomain, 
  productId, 
  onProductRecommendation 
}: ShopifyEmbedProps) {
  const { t } = useTranslation('common');
  const [isShopify, setIsShopify] = useState(false);
  const [shopifyData, setShopifyData] = useState<any>(null);

  useEffect(() => {
    // Detect if running in Shopify
    const detectShopify = () => {
      if (typeof window !== 'undefined') {
        // Check for Shopify-specific elements
        const hasShopifyElements = document.querySelector('[data-shopify]') !== null;
        const hasShopifyScript = document.querySelector('script[src*="shopify"]') !== null;
        const isInShopifyFrame = window.location.hostname.includes('myshopify.com') || 
                                window.location.hostname.includes('shopify.com');
        
        setIsShopify(hasShopifyElements || hasShopifyScript || isInShopifyFrame);
        
        // Try to get Shopify data from parent window
        if (window.parent !== window) {
          try {
            // Listen for messages from parent Shopify page
            window.addEventListener('message', (event) => {
              if (event.data.type === 'SHOPIFY_DATA') {
                setShopifyData(event.data.payload);
              }
            });
            
            // Request Shopify data from parent
            window.parent.postMessage({ type: 'REQUEST_SHOPIFY_DATA' }, '*');
          } catch (error) {
            console.log('Not in Shopify environment or cross-origin restrictions');
          }
        }
      }
    };

    detectShopify();
  }, []);

  const handleProductRecommendation = (productId: string) => {
    if (onProductRecommendation) {
      onProductRecommendation(productId);
    }
    
    // If in Shopify, try to communicate with parent
    if (isShopify && window.parent !== window) {
      try {
        window.parent.postMessage({
          type: 'SHOPIFY_PRODUCT_RECOMMENDATION',
          payload: { productId }
        }, '*');
      } catch (error) {
        console.log('Could not communicate with parent window');
      }
    }
  };

  return (
    <div className="shopify-embed">
      {/* Shopify-specific styling */}
      <style jsx>{`
        .shopify-embed {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 100%;
          margin: 0 auto;
        }
        
        /* Hide header/footer when embedded */
        .shopify-embed :global(.header),
        .shopify-embed :global(.footer) {
          display: none;
        }
        
        /* Adjust spacing for embedded view */
        .shopify-embed :global(.container) {
          padding: 1rem;
        }
        
        /* Make cards more compact */
        .shopify-embed :global(.card) {
          margin-bottom: 1rem;
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-white"
      >
        {/* Compact header for embedded view */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold">{t('embed.ai_skin_analysis')}</h1>
              <p className="text-sm opacity-90">{t('embed.get_recommendations')}</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            <SkinAnalysis />
          </div>
        </div>

        {/* Shopify integration notice */}
        {isShopify && (
          <div className="bg-blue-50 border-t border-blue-200 p-4 text-center">
            <p className="text-sm text-blue-700">
              💡 {t('embed.analysis_help')}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Shopify-specific utilities
export const shopifyUtils = {
  // Add product to cart
  addToCart: async (productId: string, quantity: number = 1) => {
    if (typeof window !== 'undefined' && window.parent !== window) {
      try {
        window.parent.postMessage({
          type: 'SHOPIFY_ADD_TO_CART',
          payload: { productId, quantity }
        }, '*');
      } catch (error) {
        console.log('Could not add to cart');
      }
    }
  },

  // Navigate to product page
  navigateToProduct: (productId: string) => {
    if (typeof window !== 'undefined' && window.parent !== window) {
      try {
        window.parent.postMessage({
          type: 'SHOPIFY_NAVIGATE',
          payload: { productId }
        }, '*');
      } catch (error) {
        console.log('Could not navigate to product');
      }
    }
  },

  // Get current cart
  getCart: () => {
    if (typeof window !== 'undefined' && window.parent !== window) {
      try {
        window.parent.postMessage({
          type: 'SHOPIFY_GET_CART'
        }, '*');
      } catch (error) {
        console.log('Could not get cart');
      }
    }
  }
}; 