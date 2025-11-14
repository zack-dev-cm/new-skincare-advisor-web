'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Plus, Minus, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { useCart } from './CartContext';

export default function Cart() {
  const { state, updateCartItem, removeFromCart, clearCart, proceedToCheckout } = useCart();
  const { cart, loading, error } = state;
  const [isClearing, setIsClearing] = React.useState(false);

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Carrello</h2>
            <p className="text-gray-600">Il tuo carrello è vuoto</p>
          </div>
        </div>
      </div>
    );
  }

  const handleQuantityChange = async (lineId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeFromCart(lineId);
    } else {
      await updateCartItem(lineId, newQuantity);
    }
  };

  const handleRemoveItem = async (lineId: string) => {
    await removeFromCart(lineId);
  };

  const handleCheckout = () => {
    proceedToCheckout();
  };

  const handleClearCart = async () => {
    if (!confirm('Sei sicuro di voler svuotare il carrello? Questa azione non può essere annullata.')) {
      return;
    }
    
    setIsClearing(true);
    try {
      await clearCart();
    } catch (error) {
      console.error('Failed to clear cart:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const totalItems = cart.lines.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = parseFloat(cart.cost.subtotalAmount.amount);
  const total = parseFloat(cart.cost.totalAmount.amount);
  const currency = cart.cost.totalAmount.currencyCode;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Carrello</h2>
            <p className="text-gray-600">{totalItems} articol{totalItems !== 1 ? 'i' : 'o'}</p>
          </div>
        </div>
        <button
          onClick={handleClearCart}
          disabled={loading || isClearing}
          className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
        >
          {isClearing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Svuotamento...</span>
            </>
          ) : (
            <span>Svuota Carrello</span>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <AnimatePresence key="cart-items">
        {cart.lines.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg mb-4"
          >
            {/* Product Image */}
            <div className="flex-shrink-0">
              {item.merchandise.product.images[0] ? (
                <img
                  src={item.merchandise.product.images[0].url}
                  alt={item.merchandise.product.images[0].altText || item.merchandise.product.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">
                {item.merchandise.product.title}
              </h3>
              <p className="text-sm text-gray-600 truncate">
                {item.merchandise.title}
              </p>
              <p className="text-sm font-medium text-gray-900">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: item.merchandise.price.currencyCode,
                }).format(parseFloat(item.merchandise.price.amount))}
              </p>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                disabled={loading}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                aria-label="Diminuisci quantità"
              >
                <Minus className="w-4 h-4" />
              </button>
              
              <span className="w-12 text-center font-medium">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  item.quantity
                )}
              </span>
              
              <button
                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                disabled={loading}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                aria-label="Aumenta quantità"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Remove Button */}
            <button
              onClick={() => handleRemoveItem(item.id)}
              disabled={loading}
              className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 disabled:opacity-50"
              aria-label="Rimuovi articolo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Cart Summary */}
      <div className="border-t border-gray-200 pt-4 mt-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotale</span>
            <span className="font-medium">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
              }).format(subtotal)}
            </span>
          </div>
          
          {total !== subtotal && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Totale</span>
              <span className="font-medium">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: currency,
                }).format(total)}
              </span>
            </div>
          )}
        </div>

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full mt-4 bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>Procedi al Checkout</span>
              <ExternalLink className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center mt-2">
          Sarai reindirizzato al checkout sicuro di Shopify
        </p>
      </div>
    </div>
  );
} 