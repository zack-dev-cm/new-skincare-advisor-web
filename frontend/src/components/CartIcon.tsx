'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X } from 'lucide-react';
import { useCart } from './CartContext';
import Cart from './Cart';

export default function CartIcon() {
  const { t } = useTranslation('products');
  const { state } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { cart } = state;

  const totalItems = cart?.lines.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <div className="relative">
      {/* Cart Icon Button */}
      <button
        onClick={() => setIsCartOpen(!isCartOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
      >
        <ShoppingCart className="w-6 h-6" />
        
        {/* Cart Count Badge */}
        {totalItems > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
          >
            {totalItems > 99 ? '99+' : totalItems}
          </motion.div>
        )}
      </button>

      {/* Cart Dropdown */}
      <AnimatePresence key="cart-dropdown">
        {isCartOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('cart.cart_title')}</h3>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label={t('cart.close_notification')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <Cart />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence key="cart-backdrop">
        {isCartOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setIsCartOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
} 