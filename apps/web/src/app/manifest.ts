import type { MetadataRoute } from 'next';
import { fetchBranding } from '@/lib/branding';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const branding = await fetchBranding();
  const name = branding.companyName || 'Stampz';
  const icons: MetadataRoute.Manifest['icons'] = [];
  if (branding.pwaIcon192Url) {
    icons.push({ src: branding.pwaIcon192Url, sizes: '192x192', type: 'image/png' });
  }
  if (branding.pwaIcon512Url) {
    icons.push({ src: branding.pwaIcon512Url, sizes: '512x512', type: 'image/png' });
  }
  if (branding.appleTouchIconUrl) {
    icons.push({ src: branding.appleTouchIconUrl, sizes: '180x180', type: 'image/png' });
  }
  if (branding.logoUrl && !icons.length) {
    icons.push({ src: branding.logoUrl, sizes: 'any', type: 'image/png' });
  }

  return {
    name,
    short_name: name.slice(0, 12),
    description: branding.metaDescription || branding.tagline || undefined,
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF7F7',
    theme_color: '#FF5A5F',
    icons,
  };
}
