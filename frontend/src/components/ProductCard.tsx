'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Loader2, CheckCircle } from 'lucide-react';
import { useCart } from './CartContext';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../lib/LocaleContext';

interface ProductVariant {
  id: string | number;
  title: string;
  price: string;
  inventory_quantity: number;
}

interface ProductImage {
  id: number;
  src: string;
  alt: string;
}

interface Product {
  id: number;
  title: string;
  vendor: string;
  product_type: string;
  tags: string;
  variants: ProductVariant[];
  images: ProductImage[];
  body_html: string;
  created_at: string;
  updated_at: string;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useLocale();
  const { addToCart, state } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants[0] || null
  );
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    setIsAddingToCart(true);
    setShowSuccess(false);

    try {
      // Convert variant ID to GraphQL format for Storefront API cart
      let variantId: string;
      
      if (typeof selectedVariant.id === 'string' && selectedVariant.id.startsWith('gid://')) {
        // Already in GraphQL format
        variantId = selectedVariant.id;
      } else {
        // Numeric ID from Admin API - convert to GraphQL format
        const numericId = typeof selectedVariant.id === 'string' 
          ? selectedVariant.id 
          : selectedVariant.id.toString();
        variantId = `gid://shopify/ProductVariant/${numericId}`;
      }
      
      // Prepare product info for the modal
      const productInfo = {
        name: product.title,
        image: product.images[0]?.src || '/placeholder-product.png',
        price: parseFloat(selectedVariant.price) * 100 // Convert to cents
      };
      
      await addToCart(variantId, quantity, undefined, productInfo);
      setShowSuccess(true);
      
      // Hide success message after 2 seconds
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= 99) {
      setQuantity(newQuantity);
    }
  };

  const formatPrice = (price: string) => {
    return formatCurrency(parseFloat(price));
  };

  const isVariantAvailable = (variant: ProductVariant) => {
    return variant.inventory_quantity > 0;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
    >
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden">
        {product.images[0] ? (
          <img
            src={product.images[0].src}
            alt={product.images[0].alt || product.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <ShoppingCart className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Success overlay */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-green-500 bg-opacity-90 flex items-center justify-center"
          >
            <div className="text-white text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-2" />
              <p className="font-semibold">{t('products:cart.added')}</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
          {product.title}
        </h3>
        <p className="text-sm text-gray-600 mb-2">{product.vendor}</p>
        
        {/* Price */}
        {selectedVariant && (
          <p className="text-lg font-bold text-gray-900 mb-3">
            {formatPrice(selectedVariant.price)}
          </p>
        )}

        {/* Variant Selection */}
        {product.variants.length > 1 && (
          <div className="mb-3">
            <label htmlFor="variant-select" className="block text-sm font-medium text-gray-700 mb-2">
              {t('products:price.variant')}
            </label>
            <select
              id="variant-select"
              value={selectedVariant?.id || ''}
              onChange={(e) => {
                const variant = product.variants.find(v => v.id.toString() === e.target.value);
                setSelectedVariant(variant || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {product.variants.map((variant) => (
                <option
                  key={variant.id}
                  value={variant.id}
                  disabled={!isVariantAvailable(variant)}
                >
                  {variant.title} - {formatPrice(variant.price)}
                  {!isVariantAvailable(variant) && ` (${t('products:price.out_of_stock')})`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quantity Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('products:price.quantity')}
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
              aria-label="Diminuisci quantità"
              title="Diminuisci quantità"
            >
              <Minus className="w-4 h-4" />
            </button>
            
            <span className="w-12 text-center font-medium">
              {quantity}
            </span>
            
            <button
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={quantity >= 99}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
              aria-label="Aumenta quantità"
              title="Aumenta quantità"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={
            isAddingToCart ||
            !selectedVariant ||
            !isVariantAvailable(selectedVariant) ||
            state.loading
          }
          className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors duration-200"
        >
          {isAddingToCart || state.loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ShoppingCart className="w-5 h-5" />
          )}
          <span>
            {isAddingToCart
              ? t('products:cart.adding')
              : !selectedVariant
              ? t('products:price.select_variant')
              : !isVariantAvailable(selectedVariant)
              ? t('products:price.out_of_stock')
              : t('products:cart.add_to_cart')}
          </span>
        </button>

        {/* Error Display */}
        {state.error && (
          <p className="text-red-600 text-sm mt-2">{state.error}</p>
        )}
      </div>
    </motion.div>
  );
} 