import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PLATFORM_BRANDING } from '@stampz/shared';
import { api } from './api';

const CACHE_KEY = 'stampz_platform_branding';

export type AppBranding = {
  companyName: string;
  tagline?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  contactEmail?: string | null;
  supportEmail?: string | null;
};

export function defaultAppBranding(): AppBranding {
  return {
    companyName: DEFAULT_PLATFORM_BRANDING.companyName,
    tagline: DEFAULT_PLATFORM_BRANDING.tagline,
    logoUrl: null,
    faviconUrl: null,
    contactEmail: DEFAULT_PLATFORM_BRANDING.contactEmail,
    supportEmail: DEFAULT_PLATFORM_BRANDING.supportEmail,
  };
}

export async function loadBranding(token?: string | null): Promise<AppBranding> {
  try {
    const data = await api<AppBranding>('/branding', { token: token || undefined });
    const next: AppBranding = {
      ...defaultAppBranding(),
      ...data,
      companyName: data.companyName || DEFAULT_PLATFORM_BRANDING.companyName,
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next));
    return next;
  } catch {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      try {
        return { ...defaultAppBranding(), ...JSON.parse(raw) };
      } catch {
        /* ignore */
      }
    }
    return defaultAppBranding();
  }
}

export function useAppBranding(token?: string | null) {
  const [branding, setBranding] = useState<AppBranding>(defaultAppBranding());

  const refresh = useCallback(async () => {
    const next = await loadBranding(token);
    setBranding(next);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (!cancelled && raw) {
        try {
          setBranding({ ...defaultAppBranding(), ...JSON.parse(raw) });
        } catch {
          /* ignore */
        }
      }
      const next = await loadBranding(token);
      if (!cancelled) setBranding(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return { branding, refresh };
}
