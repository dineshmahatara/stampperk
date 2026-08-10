'use client';

import Link from 'next/link';
import { useBranding } from '@/components/BrandingProvider';

export function BrandMark({
  href = '/',
  tone = 'light',
  subtitle,
  className = '',
}: {
  href?: string;
  tone?: 'light' | 'dark';
  subtitle?: string;
  className?: string;
}) {
  const branding = useBranding();
  const name = branding.companyName || 'Stampz';
  const initial = name.slice(0, 1).toUpperCase();
  const text = tone === 'dark' ? 'text-white' : 'text-[#1C1C1E]';
  const sub = tone === 'dark' ? 'text-white/45' : 'text-[#8E8E93]';

  const inner = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#FF5A5F] to-[#FF8A8E] text-sm font-black text-white shadow-[0_8px_20px_rgba(255,90,95,0.35)]">
        {branding.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </span>
      <span className="min-w-0">
        <span className={`block truncate text-[15px] font-extrabold tracking-tight ${text}`}>
          {name}
        </span>
        {subtitle && <span className={`block text-[10px] font-medium ${sub}`}>{subtitle}</span>}
      </span>
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="inline-flex">
      {inner}
    </Link>
  );
}
