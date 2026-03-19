"use client";
import React, { createContext, useContext } from 'react';
import type { WidgetThemeConfig } from './widget-theme';

const WidgetThemeConfigContext = createContext<Partial<WidgetThemeConfig> | null>(null);

export function WidgetThemeConfigProvider({
  value,
  children,
}: {
  value: Partial<WidgetThemeConfig> | null;
  children: React.ReactNode;
}) {
  return (
    <WidgetThemeConfigContext.Provider value={value}>
      {children}
    </WidgetThemeConfigContext.Provider>
  );
}

export function useWidgetThemeConfig() {
  return useContext(WidgetThemeConfigContext);
}

