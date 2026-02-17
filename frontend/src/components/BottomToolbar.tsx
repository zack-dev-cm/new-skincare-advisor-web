'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface BottomToolbarProps {
  isVisible: boolean;
  onProceedToCheckout: () => void;
  onClose: () => void;
  cartItemCount: number;
  totalAmount: number;
  currencyCode: string;
}

export default function BottomToolbar({
  isVisible,
  onProceedToCheckout,
  onClose,
  cartItemCount,
  totalAmount,
  currencyCode
}: BottomToolbarProps) {
  const { t } = useTranslation('products');
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg"
        ref={toolbarRef}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Cart info */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-primary-600" />
                <span className="text-sm font-medium text-gray-900">
                  {t('cart.items_count', { count: cartItemCount })}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {t('cart.total')}: {currencyCode} {(totalAmount / 100).toFixed(2)}
              </div>
            </div>

            {/* Checkout button */}
            <button
              onClick={onProceedToCheckout}
              className="flex items-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              <span>{t('cart.proceed_checkout')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
