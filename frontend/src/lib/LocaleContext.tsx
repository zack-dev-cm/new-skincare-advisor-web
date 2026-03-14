'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n from './i18n';
import type { Locale } from './translations';

interface LocaleContextType {
  locale: Locale;
  currency: string;
  market: string | null;
  country: string | null;
  formatCurrency: (amount: number | string, currencyOverride?: string) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocale] = useState<Locale>('en');
  const [currency, setCurrency] = useState<string>('EUR');
  const [market, setMarket] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Read from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const localeParam = urlParams.get('locale') as Locale | null;
    const currencyParam = urlParams.get('currency');
    const marketParam = urlParams.get('market');
    const countryParam = urlParams.get('country');

    const supported: Locale[] = ['it', 'es', 'en'];

    if (localeParam && supported.includes(localeParam)) {
      setLocale(localeParam);
      i18n.changeLanguage(localeParam);
    } else {
      // Force English by default for local demo/landing unless URL explicitly asks another locale.
      setLocale('en');
      i18n.changeLanguage('en');
    }

    setCurrency(currencyParam || 'EUR');
    setMarket(marketParam);
    setCountry(countryParam);

    console.log('🌍 Locale initialized:', {
      locale: localeParam || i18n.language || 'en',
      currency: currencyParam || 'EUR',
      market: marketParam,
      country: countryParam,
    });
  }, [i18n]);

  const formatCurrency = (amount: number | string, currencyOverride?: string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const currencyCode = currencyOverride || currency;

    try {
      return new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'it-IT', {
        style: 'currency',
        currency: currencyCode,
      }).format(numAmount);
    } catch (error) {
      console.error('Currency formatting error:', error);
      return `${currencyCode} ${numAmount.toFixed(2)}`;
    }
  };

  return (
    <LocaleContext.Provider value={{ locale, currency, market, country, formatCurrency }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextType {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
