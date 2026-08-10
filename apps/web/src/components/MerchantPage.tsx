'use client';

import Link from 'next/link';

export function MerchantPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#8E8E93]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function MerchantSurface({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-5">
      {children}
    </div>
  );
}

export function MerchantSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <MerchantPageHeader title={title} subtitle={description} />
      <MerchantSurface>
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFE8EA] text-xl text-[#FF5A5F]">
            ✎
          </div>
          <h2 className="font-extrabold">Ready for your business</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#8E8E93]">
            This section is part of the Merchant Dashboard. Use Overview quick actions meanwhile.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex rounded-full bg-[#FF5A5F] px-5 py-2.5 text-sm font-bold text-white"
          >
            Back to Overview
          </Link>
        </div>
      </MerchantSurface>
    </div>
  );
}
