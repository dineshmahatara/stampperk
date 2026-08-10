'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { PlatformBranding } from '@/lib/branding';
import { defaultBranding } from '@/lib/branding';

const BrandingContext = createContext<PlatformBranding>(defaultBranding());

export function BrandingProvider({
  value,
  children,
}: {
  value: PlatformBranding;
  children: ReactNode;
}) {
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
