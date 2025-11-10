'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Loader2, CheckCircle } from 'lucide-react';
import { useCart } from './CartContext';
import { TransformedProduct } from '../lib/shopify-product-fetcher';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../lib/LocaleContext';

interface SkincareRoutineCardProps {
  categoryTitle: string;
  mainProduct: TransformedProduct;
  alternativeProducts: TransformedProduct[];
  stepNumber: number;
  isLastStep?: boolean;
  showAddAllButton?: boolean;
  onAddAllToCart?: () => void;
}

export default function SkincareRoutineCard({
  categoryTitle,
  mainProduct,
  alternativeProducts,
  stepNumber,
  isLastStep = false,
  showAddAllButton = false,
  onAddAllToCart
}: SkincareRoutineCardProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useLocale();
  const { addToCart, state } = useCart();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const handleAddToCart = async () => {
    if (!mainProduct.variants[0]) return;

    setIsAddingToCart(true);
    setShowSuccess(false);

    try {
      const variantId = `gid://shopify/ProductVariant/${mainProduct.variants[0].id}`;
      const productInfo = {
        name: mainProduct.title,
        image: mainProduct.images[0]?.src || 'https://via.placeholder.com/300x300?text=Product',
        price: parseFloat(mainProduct.variants[0].price) * 100
      };
      
      await addToCart(variantId, 1, [
        {
          key: 'source',
          value: 'dermaself_recommendation'
        },
        {
          key: 'recommendation_type',
          value: 'skin_analysis_routine'
        },
        {
          key: 'added_at',
          value: new Date().toISOString()
        }
      ], productInfo);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleAddAlternativeToCart = async (product: TransformedProduct) => {
    if (!product.variants[0]) return;

    try {
      const variantId = `gid://shopify/ProductVariant/${product.variants[0].id}`;
      const productInfo = {
        name: product.title,
        image: product.images[0]?.src || 'https://via.placeholder.com/300x300?text=Product',
        price: parseFloat(product.variants[0].price) * 100
      };
      
      await addToCart(variantId, 1, [
        {
          key: 'source',
          value: 'dermaself_recommendation'
        },
        {
          key: 'recommendation_type',
          value: 'skin_analysis_alternative'
        },
        {
          key: 'added_at',
          value: new Date().toISOString()
        }
      ], productInfo);
    } catch (error) {
      console.error('Failed to add alternative to cart:', error);
    }
  };

  const formatPrice = (price: string) => {
    return formatCurrency(parseFloat(price));
  };


  return (
    <section className="card-section module-card collapsible expanded">
      <div className="collapsible-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h2 className="section-title">{categoryTitle}</h2>
        <span className="collapsible-arrow">{isExpanded ? '▼' : '▶'}</span>
      </div>
      
      {isExpanded && (
        <div className="collapsible-content">
          <img 
            src={mainProduct.images[0]?.src || 'https://via.placeholder.com/300x300?text=Product'} 
            alt="Immagine Prodotto" 
            className="main-product-img"
            onError={(e) => {
              console.error('Image failed to load:', mainProduct.images[0]?.src);
              e.currentTarget.src = 'https://via.placeholder.com/300x300?text=Failed+to+Load';
            }}
            onLoad={() => {
              console.log('Image loaded successfully:', mainProduct.images[0]?.src);
            }}
          />
          
          <div className="main-product-info">
            <h3>{mainProduct.title}</h3>
            <p><strong>Brand:</strong> {mainProduct.vendor}</p>
            <p><strong>Prezzo:</strong> {formatPrice(mainProduct.variants[0]?.price || '0')}</p>
          </div>
          
          <div className="module-buttons">
            <button 
              className="alt-btn-refactor" 
              onClick={() => setShowAlternatives(!showAlternatives)}
              disabled={alternativeProducts.length === 0}
            >
              Alternative
            </button>
            <button className="info-btn">Info</button>
          </div>
          
          <button 
            className="purchase-btn" 
            onClick={handleAddToCart}
            disabled={isAddingToCart || state.loading}
          >
            {isAddingToCart || state.loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Aggiungendo...
              </div>
            ) : (
              'Acquista'
            )}
          </button>

          {/* Success Overlay */}
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-green-500 bg-opacity-90 flex items-center justify-center rounded-lg"
            >
              <div className="text-white text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                <p className="font-semibold">Added to Cart!</p>
              </div>
            </motion.div>
          )}

          {/* Alternative Products */}
          {showAlternatives && alternativeProducts.length > 0 && (
            <div className="alternative-products mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-3">Alternative Products</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alternativeProducts.map((product, index) => (
                  <div key={index} className="bg-white p-3 rounded-lg shadow-sm">
                    <img 
                      src={product.images[0]?.src || 'https://via.placeholder.com/150x150?text=Product'} 
                      alt={product.title}
                      className="w-full h-32 object-cover rounded mb-2"
                      onError={(e) => {
                        console.error('Alternative image failed to load:', product.images[0]?.src);
                        e.currentTarget.src = 'https://via.placeholder.com/150x150?text=Product+Not+Found';
                      }}
                    />
                    <h5 className="font-medium text-sm mb-1">{product.title}</h5>
                    <p className="text-xs text-gray-600 mb-1">{product.vendor}</p>
                    <p className="text-sm font-bold mb-2">{formatPrice(product.variants[0]?.price || '0')}</p>
                    <button 
                      onClick={() => handleAddAlternativeToCart(product)}
                      disabled={state.loading}
                      className="w-full bg-primary-600 text-white py-1 px-2 rounded text-xs hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {state.loading ? t('products:cart.adding') : t('products:cart.add_to_cart')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add All to Bag Button for Last Step */}
          {isLastStep && showAddAllButton && onAddAllToCart && (
            <button 
              className="add-all-to-bag mt-4 w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onAddAllToCart}
              disabled={state.loading}
            >
              {state.loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Aggiungendo Routine...
                </div>
              ) : (
                'AGGIUNGI ROUTINE COMPLETA AL CARRELLO'
              )}
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        .card-section {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
          overflow: hidden;
        }

        .collapsible-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .collapsible-header:hover {
          background: #f1f5f9;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .collapsible-arrow {
          font-size: 14px;
          color: #64748b;
          transition: transform 0.2s;
        }

        .collapsible-content {
          padding: 20px;
          position: relative;
        }

        .main-product-img {
          width: 100%;
          max-width: 300px;
          height: 300px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 16px;
          display: block;
          background-color: #f3f4f6;
        }

        .main-product-info h3 {
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 8px 0;
        }

        .main-product-info p {
          margin: 4px 0;
          color: #64748b;
        }

        .module-buttons {
          display: flex;
          gap: 12px;
          margin: 16px 0;
        }

        .alt-btn-refactor, .info-btn {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .alt-btn-refactor:hover:not(:disabled) {
          background: #f3f4f6;
        }

        .alt-btn-refactor:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .info-btn:hover {
          background: #f3f4f6;
        }

        .purchase-btn {
          width: 100%;
          background: #8b5cf6;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .purchase-btn:hover:not(:disabled) {
          background: #7c3aed;
        }

        .purchase-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .add-all-to-bag {
          background: #10b981;
        }

        .add-all-to-bag:hover:not(:disabled) {
          background: #059669;
        }
      `}</style>
    </section>
  );
}
