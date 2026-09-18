import {
  DEFAULT_PLATFORM_BRANDING,
  resolveSeoTitle,
  type PlatformBrandingInput,
} from '@stampperk/shared';

export type PlatformBranding = PlatformBrandingInput & {
  id?: string;
  companyName: string;
  updatedAt?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function defaultBranding(): PlatformBranding {
  return {
    ...DEFAULT_PLATFORM_BRANDING,
    companyName: DEFAULT_PLATFORM_BRANDING.companyName,
  };
}

export async function fetchBranding(): Promise<PlatformBranding> {
  try {
    const res = await fetch(`${API_URL}/api/branding`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return defaultBranding();
    const data = (await res.json()) as PlatformBranding;
    return {
      ...defaultBranding(),
      ...data,
      companyName: data.companyName || DEFAULT_PLATFORM_BRANDING.companyName,
    };
  } catch {
    return defaultBranding();
  }
}

export function brandingTitle(b: PlatformBranding) {
  return resolveSeoTitle(b);
}

export { resolveSeoTitle };
