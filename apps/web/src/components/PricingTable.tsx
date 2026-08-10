'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import {
  PLAN_DEFINITIONS,
  PRICING_REGIONS,
  formatMoney,
  getRegionForLocale,
  yearlyMonthlyEquivalent,
  yearlySavingsPercent,
  type PlanId,
  type PricingRegion,
  type PricingRegionCode,
} from '@/data/pricing';

type BillingCycle = 'monthly' | 'yearly';

type PricingTableProps = {
  compact?: boolean;
  className?: string;
};

type CatalogPlan = {
  label?: string;
  title?: string;
  description?: string;
  features?: string[];
  priceNote?: string | null;
  cta?: string | null;
  footer?: string | null;
  displayName?: string;
};

type PlansApi = {
  regions?: Array<{
    code: string;
    currency: string;
    label: string;
    monthlyAmount: number;
    yearlyAmount: number;
    yearlyWasAmount: number;
    trialDays?: number;
  }>;
  catalog?: {
    free?: CatalogPlan;
    monthly?: CatalogPlan;
    yearly?: CatalogPlan;
  };
};

function CheckIcon() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--stampz-pink)] text-[11px] font-bold text-[var(--stampz-coral)]">
      ✓
    </span>
  );
}

function PlanArt({ id, badge }: { id: PlanId; badge: string }) {
  if (id === 'free') {
    return (
      <div className="relative mx-auto mb-5 flex h-28 w-full max-w-[200px] items-center justify-center">
        <div className="absolute h-20 w-28 -rotate-6 rounded-2xl bg-gradient-to-br from-[#ff8a95] to-[var(--stampz-coral)] shadow-lg" />
        <div className="absolute h-16 w-16 translate-x-8 translate-y-2 rounded-full bg-[var(--stampz-surface)] shadow-md ring-4 ring-[var(--stampz-coral)]/20" />
        <div className="relative z-10 rounded-xl bg-[var(--stampz-surface)] px-3 py-2 text-xs font-bold text-[var(--stampz-coral)] shadow">
          {badge}
        </div>
      </div>
    );
  }
  if (id === 'monthly') {
    return (
      <div className="relative mx-auto mb-5 flex h-28 w-full max-w-[200px] items-center justify-center">
        <div className="absolute h-20 w-24 rounded-2xl bg-gradient-to-br from-[#ffe4e8] to-[#ffb3bc] shadow-inner" />
        <div className="relative z-10 rounded-2xl bg-[var(--stampz-coral)] px-3 py-2 text-center text-xs font-extrabold leading-tight text-white shadow-lg">
          {badge}
        </div>
      </div>
    );
  }
  return (
    <div className="relative mx-auto mb-5 flex h-28 w-full max-w-[200px] items-center justify-center">
      <div className="absolute h-20 w-24 rounded-2xl bg-gradient-to-br from-[#fff1f2] to-[#ffd0d6] shadow" />
      <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--stampz-coral)] text-sm font-black text-white shadow-lg">
        {badge.slice(0, 3)}
      </div>
    </div>
  );
}

function priceBlock(
  id: PlanId,
  region: PricingRegion,
  t: (k: string, o?: Record<string, unknown>) => string,
  cms?: CatalogPlan | null,
) {
  if (id === 'free') {
    return (
      <>
        <div className="text-3xl font-extrabold tracking-tight md:text-4xl">
          {formatMoney(region.freePrice, region)}
        </div>
        <p className="mt-1 text-sm text-[var(--stampz-muted)]">
          {cms?.priceNote || t('pricingPage.plans.free.priceNote')}
        </p>
      </>
    );
  }

  if (id === 'monthly') {
    return (
      <>
        <div className="text-2xl font-extrabold tracking-tight md:text-3xl">
          {t('pricingPage.plans.monthly.trialPrice', {
            price: formatMoney(region.trialPrice, region),
            days: region.trialDays,
          })}
        </div>
        <p className="mt-1 text-base font-bold">
          {t('pricingPage.plans.monthly.thenPrice', {
            price: formatMoney(region.monthlyPrice, region),
          })}
        </p>
        <p className="mt-1 text-sm text-[var(--stampz-muted)]">
          {cms?.priceNote || t('pricingPage.plans.monthly.priceNote')}
        </p>
      </>
    );
  }

  const perMonth = yearlyMonthlyEquivalent(region);
  const save = yearlySavingsPercent(region);
  return (
    <>
      <div className="text-3xl font-extrabold tracking-tight md:text-4xl">
        {formatMoney(region.yearlyPrice, region)}
        <span className="text-base font-semibold text-[var(--stampz-muted)]">
          {' '}
          {t('pricingPage.perYear')}
        </span>
      </div>
      <p className="mt-1 text-sm font-semibold text-[var(--stampz-coral)]">
        {t('pricingPage.plans.yearly.perMonth', {
          price: formatMoney(Number(perMonth.toFixed(2)), region),
        })}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--stampz-muted)] line-through">
          {formatMoney(region.yearlyWasPrice, region)} {t('pricingPage.perYear')}
        </span>
        <span className="rounded-full bg-[var(--stampz-pink)] px-2 py-0.5 text-xs font-bold text-[var(--stampz-coral)]">
          {t('pricingPage.bestValueBadge')} · {save}%
        </span>
      </div>
    </>
  );
}

const REGION_ORDER: PricingRegionCode[] = ['US', 'AU', 'NP', 'IN', 'EU', 'CN'];

export function PricingTable({ compact = false, className = '' }: PricingTableProps) {
  const { t, i18n } = useTranslation('common');
  const localeDefault = useMemo(() => getRegionForLocale(i18n.language), [i18n.language]);
  const [regionCode, setRegionCode] = useState<PricingRegionCode | null>(null);
  const [apiRegions, setApiRegions] = useState<Record<string, PricingRegion> | null>(null);
  const [catalog, setCatalog] = useState<PlansApi['catalog'] | null>(null);
  const [billing, setBilling] = useState<BillingCycle>('yearly');

  useEffect(() => {
    const code = regionCode || localeDefault.code;
    api<PlansApi>(`/billing/plans?country=${encodeURIComponent(code)}`)
      .then((data) => {
        if (data.regions?.length) {
          const map: Record<string, PricingRegion> = {};
          for (const r of data.regions) {
            const base = PRICING_REGIONS[r.code as PricingRegionCode] || PRICING_REGIONS.US;
            map[r.code] = {
              ...base,
              code: r.code as PricingRegionCode,
              currency: r.currency || base.currency,
              monthlyPrice: r.monthlyAmount,
              yearlyPrice: r.yearlyAmount,
              yearlyWasPrice: r.yearlyWasAmount,
              trialDays: r.trialDays ?? base.trialDays,
              freePrice: 0,
              trialPrice: 0,
            };
          }
          setApiRegions(map);
        }
        if (data.catalog) setCatalog(data.catalog);
      })
      .catch(() => {
        /* keep static defaults */
      });
  }, [regionCode, localeDefault.code]);

  const region: PricingRegion = useMemo(() => {
    const code = regionCode || localeDefault.code;
    return apiRegions?.[code] || PRICING_REGIONS[code] || localeDefault;
  }, [apiRegions, regionCode, localeDefault]);

  const savePercent = yearlySavingsPercent(region);

  const orderedPlans = useMemo(() => {
    const free = PLAN_DEFINITIONS.find((p) => p.id === 'free')!;
    const monthly = PLAN_DEFINITIONS.find((p) => p.id === 'monthly')!;
    const yearly = PLAN_DEFINITIONS.find((p) => p.id === 'yearly')!;
    if (billing === 'yearly') return [free, yearly, monthly];
    return [free, monthly, yearly];
  }, [billing]);

  function cmsFor(id: PlanId): CatalogPlan | null {
    if (!catalog) return null;
    return catalog[id] || null;
  }

  function text(id: PlanId, field: keyof CatalogPlan, i18nKey: string) {
    const cms = cmsFor(id);
    const v = cms?.[field];
    if (typeof v === 'string' && v.trim()) return v;
    return t(i18nKey);
  }

  function featuresFor(id: PlanId): string[] {
    const cms = cmsFor(id);
    if (cms?.features?.length) return cms.features;
    const fromI18n = t(`pricingPage.plans.${id}.features`, { returnObjects: true }) as string[];
    return Array.isArray(fromI18n) ? fromI18n : [];
  }

  return (
    <section className={className} id="pricing">
      <div className={`mx-auto max-w-6xl ${compact ? '' : 'px-5 md:px-6'}`}>
        <div className="mx-auto mb-8 max-w-3xl text-center md:mb-10">
          <div className="mb-4 inline-flex rounded-full border border-[var(--stampz-coral)]/25 bg-[var(--stampz-pink)] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--stampz-coral)]">
            {t('pricingPage.badge')}
          </div>
          <h1
            className={`${compact ? 'text-3xl md:text-4xl' : 'text-4xl md:text-5xl'} font-extrabold tracking-tight`}
            style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
          >
            {t('pricingPage.titleBefore')}{' '}
            <span className="text-[var(--stampz-coral)]">{t('pricingPage.titleAccent')}</span>{' '}
            {t('pricingPage.titleAfter')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--stampz-muted)] md:text-lg">
            {t('pricingPage.subtitle')}
          </p>
          <p className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-[var(--stampz-muted)]">
            <span className="text-base" aria-hidden>
              {region.flag}
            </span>
            {t('pricingPage.pricesShownIn', {
              currency: region.currency,
              region: t(region.regionNameKey),
            })}
          </p>

          <div
            role="group"
            aria-label={t('pricingPage.regionPicker')}
            className="mt-5 flex flex-wrap items-center justify-center gap-2"
          >
            {REGION_ORDER.map((code) => {
              const r = apiRegions?.[code] || PRICING_REGIONS[code];
              const active = region.code === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setRegionCode(code)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition sm:text-sm ${
                    active
                      ? 'border-[var(--stampz-coral)] bg-[var(--stampz-pink)] text-[var(--stampz-coral)]'
                      : 'border-[var(--stampz-line)] bg-[var(--stampz-surface)] text-[var(--stampz-muted)] hover:border-[var(--stampz-coral)]/40 hover:text-[var(--stampz-ink)]'
                  }`}
                >
                  <span aria-hidden>{r.flag}</span>
                  {t(r.regionNameKey)}
                </button>
              );
            })}
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <div
              role="group"
              aria-label={t('pricingPage.billingToggle')}
              className="inline-flex items-center rounded-full border border-[var(--stampz-line)] bg-[var(--stampz-surface)] p-1.5 shadow-[0_10px_30px_rgba(226,61,74,0.08)]"
            >
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                  billing === 'monthly'
                    ? 'bg-[var(--stampz-coral)] text-white shadow-md shadow-[#e23d4a]/25'
                    : 'text-[var(--stampz-muted)] hover:text-[var(--stampz-ink)]'
                }`}
              >
                {t('pricingPage.monthly')}
              </button>
              <button
                type="button"
                onClick={() => setBilling('yearly')}
                className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                  billing === 'yearly'
                    ? 'bg-[var(--stampz-coral)] text-white shadow-md shadow-[#e23d4a]/25'
                    : 'text-[var(--stampz-muted)] hover:text-[var(--stampz-ink)]'
                }`}
              >
                {t('pricingPage.yearly')}
              </button>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-200">
              {t('pricingPage.saveRibbon', { percent: savePercent })}
            </span>
          </div>
        </div>

        <div className="grid items-stretch gap-4 pt-4 sm:gap-5 lg:grid-cols-3">
          {orderedPlans.map((plan) => {
            const features = featuresFor(plan.id);
            const cms = cmsFor(plan.id);
            const isFeatured =
              (billing === 'monthly' && plan.id === 'monthly') ||
              (billing === 'yearly' && plan.id === 'yearly');
            const ctaHref = plan.id === 'yearly' ? '/dashboard/billing' : '/register';
            const badge =
              cms?.displayName ||
              cms?.label ||
              t(`pricingPage.plans.${plan.id}.label`);

            return (
              <article
                key={plan.id}
                className={`relative flex flex-col rounded-[1.75rem] border bg-[var(--stampz-surface)] p-5 pt-7 shadow-[0_18px_50px_rgba(226,61,74,0.08)] transition duration-300 sm:p-6 sm:pt-8 md:p-7 md:pt-9 ${
                  isFeatured
                    ? 'border-2 border-[var(--stampz-coral)] ring-4 ring-[var(--stampz-coral)]/10 lg:-translate-y-2 lg:shadow-[0_24px_60px_rgba(226,61,74,0.16)]'
                    : 'border-[var(--stampz-line)] hover:-translate-y-0.5'
                }`}
              >
                {plan.id === 'yearly' && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.75rem]">
                    <div className="absolute -right-11 top-6 z-10 rotate-45 bg-[var(--stampz-coral)] px-12 py-1 text-xs font-extrabold text-white shadow">
                      {t('pricingPage.saveRibbon', { percent: savePercent })}
                    </div>
                  </div>
                )}
                {isFeatured && (
                  <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[var(--stampz-coral)] px-4 py-1 text-xs font-extrabold tracking-wide text-white shadow-md">
                    ★ {t('pricingPage.mostPopular')}
                  </div>
                )}

                <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--stampz-coral)]">
                  {text(plan.id, 'label', `pricingPage.plans.${plan.id}.label`)}
                </div>
                <h2 className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">
                  {text(plan.id, 'title', `pricingPage.plans.${plan.id}.title`)}
                </h2>
                <p className="mt-2 min-h-[2.5rem] text-sm text-[var(--stampz-muted)] sm:min-h-[3rem] sm:text-base">
                  {text(plan.id, 'description', `pricingPage.plans.${plan.id}.description`)}
                </p>

                <PlanArt id={plan.id} badge={String(badge)} />

                <ul className="mb-6 space-y-3">
                  {features.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-[var(--stampz-ink)] sm:text-base">
                      <CheckIcon />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto border-t border-[var(--stampz-line)] pt-5">
                  {priceBlock(plan.id, region, t as (k: string, o?: Record<string, unknown>) => string, cms)}

                  <Link
                    href={ctaHref}
                    className={`mt-5 flex w-full items-center justify-center rounded-full px-5 py-3.5 text-sm font-bold transition sm:text-base ${
                      plan.id === 'free'
                        ? 'border-2 border-[var(--stampz-coral)] bg-[var(--stampz-surface)] text-[var(--stampz-coral)] hover:bg-[var(--stampz-pink)]'
                        : isFeatured
                          ? 'bg-[var(--stampz-coral)] text-white shadow-lg shadow-[#e23d4a]/25 hover:brightness-105'
                          : 'border-2 border-[var(--stampz-coral)] bg-[var(--stampz-surface)] text-[var(--stampz-coral)] hover:bg-[var(--stampz-pink)]'
                    }`}
                  >
                    {text(plan.id, 'cta', `pricingPage.plans.${plan.id}.cta`)} →
                  </Link>

                  <p className="mt-3 text-center text-xs text-[var(--stampz-muted)] sm:text-sm">
                    {text(plan.id, 'footer', `pricingPage.plans.${plan.id}.footer`)}
                  </p>

                  {plan.id === 'monthly' && (
                    <p className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-[var(--stampz-ink)]">
                      <span aria-hidden>🔔</span>
                      {t('pricingPage.trialReminder')}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4">
          {(['secure', 'cancel', 'data', 'support'] as const).map((key) => (
            <div key={key} className="text-center sm:text-left">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--stampz-pink)] text-lg text-[var(--stampz-coral)] sm:mx-0">
                {{ secure: '🛡', cancel: '↺', data: '🔒', support: '🎧' }[key]}
              </div>
              <div className="font-bold">{t(`pricingPage.trust.${key}.title`)}</div>
              <p className="mt-1 text-sm text-[var(--stampz-muted)]">
                {t(`pricingPage.trust.${key}.body`)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-[var(--stampz-muted)]">
          {t('pricingPage.allPlansInclude')}
        </p>
      </div>
    </section>
  );
}
