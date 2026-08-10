'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { MarketingHeader } from '@/components/MarketingHeader';
import { PricingTable } from '@/components/PricingTable';
import { BrandMark } from '@/components/BrandMark';
import { useBranding } from '@/components/BrandingProvider';

export default function PricingPage() {
  const { t } = useTranslation('common');
  const branding = useBranding();
  const companyName = branding.companyName || 'Stampz';

  return (
    <main className="landing-shell min-h-screen">
      <MarketingHeader active="pricing" />
      <div className="pb-8 pt-4 md:pt-8">
        <PricingTable />
      </div>
      <footer className="border-t border-[var(--stampz-line)] bg-[var(--stampz-surface)]/70 px-5 py-10 text-base text-[var(--stampz-muted)] md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <BrandMark href="/" />
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/">{t('product')}</Link>
            <Link href="/privacy">{t('privacy')}</Link>
            <Link href="/terms">{t('terms')}</Link>
            <Link href="/login">{t('businessLogin')}</Link>
          </div>
        </div>
        <div className="mx-auto mt-6 max-w-6xl">
          © {new Date().getFullYear()} {companyName}
        </div>
      </footer>
    </main>
  );
}
