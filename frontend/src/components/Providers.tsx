'use client';

import { ReactNode } from 'react';
import { CartProvider } from './CartContext';
import { LocaleProvider } from '../lib/LocaleContext';
import '../lib/i18n'; // Initialize i18n

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <LocaleProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </LocaleProvider>
  );
}

