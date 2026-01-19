'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Loader2, CheckCircle, Trash2, Info, X } from 'lucide-react';
import { useCart } from './CartContext';
import { translateModuleName } from '../lib/moduleTranslations';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../lib/LocaleContext';
import { useAppConfig } from '@/lib/AppConfigContext';

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

interface RoutineProductCardProps {
  product: Product;
  stepNumber: number;
  stepTitle: string;
  categoryTitle?: string;
  isLastStep?: boolean;
  showAddAllButton?: boolean;
  onAddAllToCart?: () => void;
  // UI extensions
  whyPicked?: string;
  alternatives?: any[]; // TransformedProduct[] from fetcher; keep loose to avoid backend change
  alternativesExpanded?: boolean;
  onToggleAlternatives?: () => void;
}

export default function RoutineProductCard({ 
  product, 
  stepNumber, 
  stepTitle, 
  categoryTitle,
  isLastStep = false,
  showAddAllButton = false,
  onAddAllToCart,
  whyPicked,
  alternatives = [],
  alternativesExpanded = false,
  onToggleAlternatives
}: RoutineProductCardProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useLocale();
  const appConfig = useAppConfig();
  
  // Optimize Shopify CDN image URLs to requested width for faster loads
  const getOptimizedImageUrl = (url?: string, width: number = 160): string => {
    if (!url) return 'https://via.placeholder.com/96';
    try {
      const u = new URL(url);
      // Shopify CDN supports width param; keep existing params
      if (u.hostname.includes('cdn.shopify.com')) {
        u.searchParams.set('width', String(width));
        return u.toString();
      }
      return url;
    } catch {
      return url;
    }
  };

  // Early return if product is invalid
  if (!product) {
    console.error('RoutineProductCard: Product is undefined');
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error: Product data is missing</p>
      </div>
    );
  }

  // Ensure variants array exists and has at least one item
  const safeVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0 
    ? product.variants 
    : [{
        id: 'default',
        title: 'Default',
        price: '0',
        inventory_quantity: 1
      }];

  const { addToCart, removeFromCart, isProductInCart, getCartItemLineId, state } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    safeVariants[0] || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState<'added' | 'removed' | false>(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [whyExpanded, setWhyExpanded] = useState(false);

  // Check if product is in cart
  const variantId = selectedVariant ? `gid://shopify/ProductVariant/${selectedVariant.id}` : null;
  const isInCart = variantId ? isProductInCart(variantId) : false;
  const cartLineId = variantId ? getCartItemLineId(variantId) : null;

  // Refresh cart state when component mounts or cart changes
  useEffect(() => {
    // This will be handled by the cart context automatically
  }, [state.cart]);

  const handleAddToCart = async () => {
    if (!selectedVariant || !variantId) {
      console.error('Cannot add to cart: missing variant or variantId');
      setErrorMessage('Product variant not available');
      setShowError(true);
      return;
    }

    setIsLoading(true);
    setShowSuccess(false);
    setShowError(false);
    setErrorMessage('');

    try {
      // Add custom attributes for tracking recommended products
      const customAttributes = [
        {
          key: 'source',
          value: 'dermaself_recommendation'
        },
        {
          key: 'recommendation_type',
          value: 'skin_analysis'
        },
        {
          key: 'product_step',
          value: stepTitle.toLowerCase().replace('step ', '').replace(':', '')
        },
        {
          key: 'added_at',
          value: new Date().toISOString()
        }
      ];
      
      // Prepare product info for the modal
      const productInfo = {
        name: product.title || (product as any).name || 'Unknown Product',
        image: product.images[0]?.src || 'https://via.placeholder.com/300x300?text=Product',
        price: parseFloat(selectedVariant.price || '0') * 100 // Convert to cents
      };
      
      await addToCart(variantId, 1, customAttributes, productInfo);
      
      // Show success overlay briefly
      setShowSuccess('added');
      setTimeout(() => setShowSuccess(false), 1000);
      
      // The cart success modal will be shown automatically by the CartContext
    } catch (error) {
      console.error('Failed to add to cart:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to add to cart');
      setShowError(true);
      
      // Hide error message after 3 seconds
      setTimeout(() => setShowError(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromCart = async () => {
    if (!cartLineId) return;

    setIsLoading(true);
    setShowSuccess(false);
    setShowError(false);
    setErrorMessage('');

    try {
      await removeFromCart(cartLineId);
      setShowSuccess('removed');
      
      // Hide success message after 2 seconds
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to remove from cart');
      setShowError(true);
      
      // Hide error message after 3 seconds
      setTimeout(() => setShowError(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };


  const formatPrice = (price: string) => {
    return formatCurrency(parseFloat(price));
  };

  const isVariantAvailable = (variant: ProductVariant) => {
    return variant.inventory_quantity > 0;
  };

  // Extract tags from product tags string
  const productTags = (product.tags && typeof product.tags === 'string') 
    ? product.tags.split(',').map(tag => tag.trim()).filter(tag => tag) 
    : [];
  
  // Get tag colors based on tag content
  const getTagColor = (tag: string) => {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes('oily')) return 'rgb(248, 194, 27)'; // Yellow
    if (tagLower.includes('dark') || tagLower.includes('uneven')) return 'rgb(177, 206, 81)'; // Green
    if (tagLower.includes('dry') || tagLower.includes('sensitive')) return 'rgb(255, 99, 132)'; // Red
    return 'rgb(100, 149, 237)'; // Default blue
  };
  

  return (
    <section className="routine-steps">
      {/* Step Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center h-7 px-3 rounded-full bg-neutral-900 text-white text-sm font-semibold">
          {`Passo ${stepNumber}`}
        </span>
        <h2 className="text-2xl font-semibold tracking-tight truncate flex-1">{translateModuleName(stepTitle)}</h2>
        {categoryTitle && (
          <span className="ml-2 hidden sm:inline-flex items-center text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {categoryTitle}
          </span>
        )}
      </div>
      
      {/* Separator between header and product content */}
      <div className="border-b border-gray-200 my-4"></div>
      
      <div className="step-content">
        {/* Product Info */}
        <div className="product-info__tablet">
          {/* Product main row */}
          <div className="flex items-start gap-3">
            <img 
              key={`product-${product.id}`}
              width="80" 
              height="80"
              src={getOptimizedImageUrl(product.images[0]?.src, 160) || 'https://via.placeholder.com/80'} 
              alt={product.title}
              loading="lazy"
              decoding="async"
              fetchPriority="auto"
              sizes="(max-width: 640px) 80px, 80px"
              className="w-20 h-20 rounded-xl object-cover bg-white p-1 cursor-pointer"
              onClick={() => setShowDetailsModal(true)}
              onLoad={() => {
                console.log('✅ Routine image loaded successfully:', product.images[0]?.src);
              }}
              onError={(e) => {
                console.error('❌ Routine image failed to load:', product.images[0]?.src);
                const target = e.target as HTMLImageElement;
                const placeholderUrl = 'https://via.placeholder.com/80';
                if (target.src !== placeholderUrl) {
                  target.src = placeholderUrl;
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <div className="min-w-0">
                  <div className="text-lg font-semibold leading-snug line-clamp-2">{product.title || 'Unknown Product'}</div>
                  <div className="text-sm text-muted-foreground line-clamp-1">{product.vendor || 'Unknown Brand'}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="inline-flex px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {selectedVariant ? formatPrice(selectedVariant.price) : formatCurrency(0)}
                </span>
                {(() => {
                  const ratingValue = (product as any).rating ?? (product as any).rating_value;
                  const ratingText = typeof ratingValue === 'number' ? ratingValue.toFixed(2) : (ratingValue || null);
                  return ratingText ? (
                    <span className="inline-flex items-center text-xs text-gray-700">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      <span className="ml-1">{ratingText}</span>
                    </span>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
          
          {/* Fit and Verified Chips */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {/* Fit percentage chip */}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold text-white bg-amber-800">
              93% fit
            </span>
            
            {/* Verified chip */}
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold text-white bg-blue-600">
              <CheckCircle className="w-3 h-3" />
              Dermaself Verified
            </span>
            
            {/* Star rating moved next to price */}
          </div>
          
          {/* Why picked bubble */}
          {whyPicked && (
            <div className="mt-4 rounded-3xl bg-muted p-4 text-sm leading-relaxed">
              <div className="font-semibold text-sm mb-1">Perchè l'abbiamo scelta</div>
              <p className={`text-gray-900 ${whyExpanded ? '' : 'line-clamp-3'}`}>{whyPicked}</p>
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-primary-700 hover:text-primary-800"
                onClick={() => setWhyExpanded(prev => !prev)}
              >
                {whyExpanded ? 'Show less' : 'Show more'}
              </button>
            </div>
          )}

          {/* Footer actions: Add to cart + Alternatives toggle */}
          {/* Footer actions: stacked on mobile, inline on md+ */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full">
            {/* Show cart button only when cart is enabled (not in demo mode) */}
            {appConfig.enableCart && (
              <button 
                className={`inline-flex items-center justify-center h-12 sm:h-11 w-full sm:w-auto px-4 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 disabled:opacity-60 ${showSuccess ? 'bg-green-600' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
                onClick={isInCart ? handleRemoveFromCart : handleAddToCart}
                disabled={isLoading || !selectedVariant || !isVariantAvailable(selectedVariant) || state.loading}
                aria-label={isInCart ? 'Rimuovi dal carrello' : 'Aggiungi al carrello'}
              >
                {isLoading || state.loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span aria-live="polite">{isInCart ? t('products:cart.adding') : t('products:cart.adding')}</span>
                  </>
                ) : isInCart ? (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    <span aria-live="polite">{t('products:cart.remove')}</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    <span aria-live="polite">{t('products:cart.add_to_cart')}</span>
                  </>
                )}
              </button>
            )}

            {alternatives && alternatives.length > 0 && (
              <button 
                type="button"
                className="flex-1 h-12 inline-flex items-center justify-between rounded-full bg-white hover:bg-gray-50 text-sm font-semibold px-4 transition-colors shadow-sm border border-primary-100"
                onClick={onToggleAlternatives}
                aria-controls={`alt-list-${product.id}`}
              >
                <span className="text-gray-900">{alternatives.length} alternative</span>
                <svg className={`w-4 h-4 transition-transform text-gray-600 ${alternativesExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 11.188l3.71-3.956a.75.75 0 011.08 1.04l-4.25 4.53a.75.75 0 01-1.08 0l-4.25-4.53a.75.75 0 01.03-1.06z"/></svg>
              </button>
            )}
          </div>

          {/* Alternatives list when expanded */}
          {alternativesExpanded && alternatives && alternatives.length > 0 && (
            <div id={`alt-list-${product.id}`} className="mt-4 space-y-3">
              <div className="text-sm text-muted-foreground px-1">Other great AI-picked options</div>
              <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
                <div className="flex gap-4 w-max pr-3 pb-1">
                  {alternatives.map((alt: any) => (
                    <div key={alt.id || alt.title} className="rounded-2xl bg-white shadow-sm border border-primary-100 p-3 min-w-[280px] sm:min-w-[300px]">
                      <div className="flex items-start gap-3">
                        <img
                          width="96"
                          height="96"
                          src={getOptimizedImageUrl(alt.images?.[0]?.src, 200) || 'https://via.placeholder.com/96'}
                          alt={alt.title}
                          loading="lazy"
                          decoding="async"
                          fetchPriority="low"
                          sizes="(max-width: 640px) 96px, 80px"
                          srcSet={`${getOptimizedImageUrl(alt.images?.[0]?.src, 120)} 120w, ${getOptimizedImageUrl(alt.images?.[0]?.src, 160)} 160w, ${getOptimizedImageUrl(alt.images?.[0]?.src, 200)} 200w`}
                          className="w-24 h-24 sm:w-20 sm:h-20 rounded-xl object-cover bg-muted"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate max-w-[180px]">{alt.title}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]">{alt.vendor}</div>
                          {alt.variants?.[0]?.price && (
                            <div className="mt-2 inline-flex px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                              {formatCurrency(parseFloat(alt.variants[0].price))}
                            </div>
                          )}
                        </div>
                        {/* Add/Remove alt from cart - only show when cart is enabled */}
                        {appConfig.enableCart && (
                          <div className="ml-auto pl-2">
                            {(() => {
                              const altVariantId = alt?.variants?.[0]?.id ? `gid://shopify/ProductVariant/${alt.variants[0].id}` : null;
                              const isAltInCart = altVariantId ? isProductInCart(altVariantId) : false;
                              const altCartLineId = altVariantId ? getCartItemLineId(altVariantId) : null;
                              
                              return (
                                <button
                                  type="button"
                                  className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors"
                                  onClick={async () => {
                                    try {
                                      if (!alt?.variants?.[0]?.id) return;
                                      const altVariantId = `gid://shopify/ProductVariant/${alt.variants[0].id}`;
                                      
                                      if (isAltInCart && altCartLineId) {
                                        // Remove from cart
                                        await removeFromCart(altCartLineId);
                                        setShowSuccess('removed');
                                        setTimeout(() => setShowSuccess(false), 800);
                                      } else {
                                        // Add to cart
                                        const info = {
                                          name: alt.title,
                                          image: alt.images?.[0]?.src || 'https://via.placeholder.com/300x300?text=Product',
                                          price: alt.variants?.[0]?.price ? parseFloat(alt.variants[0].price) * 100 : 0
                                        };
                                        await addToCart(altVariantId, 1, [
                                          { key: 'source', value: 'dermaself_recommendation' },
                                          { key: 'recommendation_type', value: 'skin_analysis_alternative' },
                                          { key: 'product_step', value: stepTitle.toLowerCase().replace('step ', '').replace(':', '') },
                                          { key: 'added_at', value: new Date().toISOString() }
                                        ], info);
                                        setShowSuccess('added');
                                        setTimeout(() => setShowSuccess(false), 800);
                                      }
                                    } catch (e) {
                                      console.error('Failed to modify cart:', e);
                                      setErrorMessage('Failed to modify cart');
                                      setShowError(true);
                                      setTimeout(() => setShowError(false), 2000);
                                    }
                                  }}
                                  aria-label={isAltInCart ? `Rimuovi ${alt.title} dal carrello` : `Aggiungi ${alt.title} al carrello`}
                                >
                                  {isAltInCart ? (
                                    <Trash2 className="w-4 h-4" />
                                  ) : (
                                    <ShoppingCart className="w-4 h-4" />
                                  )}
                                </button>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

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
              <p className="font-semibold">
                {showSuccess === 'added' ? 'Added to Cart!' : 'Removed from Cart!'}
              </p>
            </div>
          </motion.div>
        )}

        {/* Error Overlay */}
        {showError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-500 bg-opacity-90 flex items-center justify-center rounded-lg"
          >
            <div className="text-white text-center">
              <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{errorMessage}</p>
            </div>
          </motion.div>
        )}
      </div>

      


      {/* Add All to Bag Button for Last Step */}
      {isLastStep && showAddAllButton && onAddAllToCart && (
            <button 
              className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
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

      {/* Removed style jsx in favor of Tailwind utilities */}

      {/* Product Details Modal */}
      {showDetailsModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailsModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg w-[calc(100%-2rem)] max-w-md md:w-full max-h-[80vh] mx-auto overflow-y-auto scrollbar-thin scrollbar-thumb-primary-600 scrollbar-track-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Product Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              {/* Product Image */}
              <div className="mb-4">
                <img
                  src={product.images[0]?.src || 'https://via.placeholder.com/300x300/f0f0f0/999999?text=Product+Image'}
                  alt={product.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>

              {/* Product Info */}
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-lg">{product.title}</h4>
                  <p className="text-gray-600">{product.vendor}</p>
                </div>

                {/* Price */}
                <div>
                  <p className="text-xl font-bold text-primary-600">
                    {selectedVariant ? formatPrice(selectedVariant.price) : formatCurrency(0)}
                  </p>
                </div>

                {/* Tags */}
                {productTags.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {productTags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs rounded-full border border-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {product.body_html && (
                  <div>
                    <p className="font-medium mb-2">Description:</p>
                    <div 
                      className="text-sm text-gray-700 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: product.body_html.replace(/<[^>]*>/g, '').substring(0, 500) + '...' 
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </section>
  );
} 