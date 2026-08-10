import {
  BILLING_REGIONS,
  type BillingRegionCode,
  billingRegionFromCountry,
} from '@stampz/shared';

export type PricingRegionCode = BillingRegionCode;

export type PricingRegion = {
  code: PricingRegionCode;
  currency: string;
  localeTag: string;
  flag: string;
  regionNameKey: string;
  freePrice: number;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyWasPrice: number;
  trialDays: number;
  trialPrice: number;
};

/** Canonical plan IDs rendered by PricingTable */
export const PLAN_IDS = ['free', 'monthly', 'yearly'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

const LOCALE_TAGS: Record<PricingRegionCode, string> = {
  NP: 'ne-NP',
  US: 'en-US',
  AU: 'en-AU',
  IN: 'hi-IN',
  EU: 'de-DE',
  CN: 'zh-CN',
};

const FLAGS: Record<PricingRegionCode, string> = {
  NP: '🇳🇵',
  US: '🇺🇸',
  AU: '🇦🇺',
  IN: '🇮🇳',
  EU: '🇪🇺',
  CN: '🇨🇳',
};

function toPricingRegion(code: PricingRegionCode): PricingRegion {
  const b = BILLING_REGIONS[code];
  return {
    code,
    currency: b.currency,
    localeTag: LOCALE_TAGS[code],
    flag: FLAGS[code],
    regionNameKey: `pricingPage.regions.${code}`,
    freePrice: 0,
    monthlyPrice: b.monthlyAmount,
    yearlyPrice: b.yearlyAmount,
    yearlyWasPrice: b.yearlyWasAmount,
    trialDays: 14,
    trialPrice: 0,
  };
}

export const PRICING_REGIONS: Record<PricingRegionCode, PricingRegion> = {
  NP: toPricingRegion('NP'),
  US: toPricingRegion('US'),
  AU: toPricingRegion('AU'),
  IN: toPricingRegion('IN'),
  EU: toPricingRegion('EU'),
  CN: toPricingRegion('CN'),
};

/** Map i18n language → default pricing region */
export const LOCALE_TO_REGION: Record<string, PricingRegionCode> = {
  en: 'US',
  ne: 'NP',
  hi: 'IN',
  es: 'EU',
  fr: 'EU',
  de: 'EU',
  zh: 'CN',
  ar: 'US',
  he: 'US',
};

export function getRegionForLocale(lng?: string | null): PricingRegion {
  const raw = (lng || 'en').toLowerCase();
  if (raw.startsWith('en-au') || raw === 'au') return PRICING_REGIONS.AU;
  if (raw.startsWith('en-us')) return PRICING_REGIONS.US;
  const base = raw.split('-')[0];
  const code = LOCALE_TO_REGION[base] || 'US';
  return PRICING_REGIONS[code];
}

export function getRegionForCountry(country?: string | null): PricingRegion {
  const b = billingRegionFromCountry(country);
  return PRICING_REGIONS[b.code];
}

export function formatMoney(amount: number, region: PricingRegion) {
  const hasCents = Math.abs(amount % 1) > 0;
  const fractionDigits =
    region.currency === 'USD' ||
    region.currency === 'EUR' ||
    region.currency === 'AUD' ||
    hasCents
      ? 2
      : 0;
  try {
    return new Intl.NumberFormat(region.localeTag, {
      style: 'currency',
      currency: region.currency,
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    return `${region.currency} ${amount}`;
  }
}

export function yearlyMonthlyEquivalent(region: PricingRegion) {
  return region.yearlyPrice / 12;
}

export function yearlySavingsPercent(region: PricingRegion) {
  if (!region.yearlyWasPrice) return 0;
  return Math.round((1 - region.yearlyPrice / region.yearlyWasPrice) * 100);
}

export type PlanDefinition = {
  id: PlanId;
  featured?: boolean;
  ribbon?: 'save' | null;
  badge?: 'popular' | null;
};

/** Structural plan metadata (copy comes from i18n) */
export const PLAN_DEFINITIONS: PlanDefinition[] = [
  { id: 'free' },
  { id: 'monthly', featured: true, badge: 'popular' },
  { id: 'yearly', ribbon: 'save' },
];
