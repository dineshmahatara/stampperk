import {
  BILLING_REGIONS,
  PLAN_DISPLAY_NAMES,
  PLAN_LIMITS,
  type BillingRegionCode,
} from '@stampz/shared';

export type PlanCatalogId = 'FREE' | 'MONTHLY' | 'YEARLY';

export type RegionCatalogRow = {
  regionCode: BillingRegionCode;
  currency: string;
  label: string;
  monthlyAmount: number;
  yearlyAmount: number;
  yearlyWasAmount: number;
  trialDays: number;
};

export type PlanCatalogRow = {
  planId: PlanCatalogId;
  displayName: string;
  label: string;
  title: string;
  description: string;
  features: string[];
  priceNote: string | null;
  cta: string | null;
  footer: string | null;
  businesses: number;
  loyaltyCards: number;
  stampsPerMonth: number;
  campaigns: number;
  branches: number;
  galleryPhotos: number;
  staff: number;
};

/** English CMS defaults (seed + fallback). */
export const DEFAULT_PLAN_COPY: Record<
  PlanCatalogId,
  Pick<PlanCatalogRow, 'label' | 'title' | 'description' | 'features' | 'priceNote' | 'cta' | 'footer'>
> = {
  FREE: {
    label: 'Free',
    title: 'Explore Stampz',
    description: 'Start without a bank card and experience the essentials.',
    features: [
      'Create 1 loyalty card',
      'Core QR stamp & redeem',
      '1 campaign / offer',
      'No bank card required',
    ],
    priceNote: 'Upgrade when you reach a free limit.',
    cta: 'Get Started Free',
    footer: 'No payment details needed.',
  },
  MONTHLY: {
    label: 'Pro',
    title: 'Grow every month',
    description: 'CRM segments, coupons, automations, analytics — billed monthly.',
    features: [
      'CRM, coupons & automations',
      'More cards, stamps & staff',
      'Leaflets, push & analytics',
      'Cancel anytime',
    ],
    priceNote: 'Billed monthly until cancelled',
    cta: 'Start Free Trial',
    footer: 'Bank card required · Automatically renews unless cancelled',
  },
  YEARLY: {
    label: 'Business',
    title: 'Scale with the best value',
    description: 'Everything in Pro for a full year — best rate for growing shops.',
    features: [
      'Everything in Pro',
      'Higher staff & branch limits',
      'Analytics, leaflets & push',
      'Save vs monthly billing',
    ],
    priceNote: null,
    cta: 'Choose Business',
    footer: 'One annual payment.',
  },
};

export function defaultRegions(): RegionCatalogRow[] {
  return (Object.keys(BILLING_REGIONS) as BillingRegionCode[]).map((code) => {
    const r = BILLING_REGIONS[code];
    return {
      regionCode: code,
      currency: r.currency,
      label: r.label,
      monthlyAmount: r.monthlyAmount,
      yearlyAmount: r.yearlyAmount,
      yearlyWasAmount: r.yearlyWasAmount,
      trialDays: 14,
    };
  });
}

export function defaultPlans(): PlanCatalogRow[] {
  return (Object.keys(PLAN_LIMITS) as PlanCatalogId[]).map((planId) => {
    const limits = PLAN_LIMITS[planId];
    const copy = DEFAULT_PLAN_COPY[planId];
    return {
      planId,
      displayName: PLAN_DISPLAY_NAMES[planId],
      ...copy,
      businesses: limits.businesses,
      loyaltyCards: limits.loyaltyCards,
      stampsPerMonth: limits.stampsPerMonth,
      campaigns: limits.campaigns,
      branches: limits.branches,
      galleryPhotos: limits.galleryPhotos,
      staff: limits.staff,
    };
  });
}
