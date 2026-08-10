import type { Metadata } from 'next';
import {
  Outfit,
  Fraunces,
  Noto_Sans_Devanagari,
  Noto_Sans_Arabic,
  Noto_Sans_Hebrew,
} from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { PreferencesProvider } from '@/lib/preferences';
import { I18nProvider } from '@/i18n/I18nProvider';
import { BrandingProvider } from '@/components/BrandingProvider';
import { ReferralClaimOnAuth } from '@/components/ReferralClaimOnAuth';
import { brandingTitle, fetchBranding } from '@/lib/branding';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-devanagari',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-arabic',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const notoHebrew = Noto_Sans_Hebrew({
  subsets: ['hebrew'],
  variable: '--font-hebrew',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await fetchBranding();
  const title = brandingTitle(branding);
  const description =
    branding.metaDescription ||
    'Create a digital punch card, earn repeat customers, and manage your loyalty program.';
  const keywords = branding.metaKeywords
    ? branding.metaKeywords.split(',').map((k) => k.trim()).filter(Boolean)
    : undefined;

  const icons: Metadata['icons'] = {};
  if (branding.faviconUrl) {
    icons.icon = [{ url: branding.faviconUrl }];
  }
  if (branding.appleTouchIconUrl) {
    icons.apple = [{ url: branding.appleTouchIconUrl }];
  }

  return {
    metadataBase: new URL(APP_URL),
    title: {
      default: title,
      template: `%s | ${branding.companyName}`,
    },
    description,
    keywords,
    icons: Object.keys(icons).length ? icons : undefined,
    openGraph: {
      title,
      description,
      siteName: branding.companyName,
      type: 'website',
      ...(branding.ogImageUrl || branding.logoUrl
        ? { images: [{ url: branding.ogImageUrl || branding.logoUrl! }] }
        : {}),
    },
    twitter: {
      card: branding.ogImageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(branding.ogImageUrl || branding.logoUrl
        ? { images: [branding.ogImageUrl || branding.logoUrl!] }
        : {}),
    },
    applicationName: branding.companyName,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const branding = await fetchBranding();

  return (
    <html
      lang="en"
      dir="ltr"
      data-theme="light"
      data-font-scale="lg"
      data-dir="ltr"
      className={`${outfit.variable} ${fraunces.variable} ${notoDevanagari.variable} ${notoArabic.variable} ${notoHebrew.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=JSON.parse(localStorage.getItem('stampz_prefs_v2')||'{}');var l=(p.locale||localStorage.getItem('stampz_i18nextLng')||'en').toString().split('-')[0].toLowerCase();var rtl=['ar','he','fa','ur'].indexOf(l)>=0;document.documentElement.lang=l;document.documentElement.dir=rtl?'rtl':'ltr';document.documentElement.dataset.dir=rtl?'rtl':'ltr';}catch(e){}})();`,
          }}
        />
        <I18nProvider>
          <PreferencesProvider>
            <BrandingProvider value={branding}>
              <AuthProvider>
                <ReferralClaimOnAuth />
                {children}
              </AuthProvider>
            </BrandingProvider>
          </PreferencesProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
