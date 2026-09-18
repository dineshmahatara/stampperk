import { z } from 'zod';

export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  MERCHANT_OWNER: 'MERCHANT_OWNER',
  STAFF: 'STAFF',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const StaffPermission = {
  SCAN: 'SCAN',
  REDEEM: 'REDEEM',
  MANAGE: 'MANAGE',
} as const;
export type StaffPermission = (typeof StaffPermission)[keyof typeof StaffPermission];

export const SubscriptionPlan = {
  FREE: 'FREE',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const;
export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];

export const CampaignStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  SCHEDULED: 'SCHEDULED',
  ENDED: 'ENDED',
} as const;
export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export const PLAN_LIMITS = {
  FREE: {
    businesses: 1,
    loyaltyCards: 1,
    stampsPerMonth: 50,
    campaigns: 1,
    branches: 1,
    galleryPhotos: 3,
    staff: 1,
  },
  MONTHLY: {
    businesses: 5,
    loyaltyCards: 50,
    stampsPerMonth: 100000,
    campaigns: 100,
    branches: 5,
    galleryPhotos: 10,
    staff: 10,
  },
  YEARLY: {
    businesses: 10,
    loyaltyCards: 50,
    stampsPerMonth: 100000,
    campaigns: 100,
    branches: 5,
    galleryPhotos: 10,
    staff: 50,
  },
} as const;

/** Display names for SaaS packaging (enums stay FREE/MONTHLY/YEARLY). */
export const PLAN_DISPLAY_NAMES: Record<keyof typeof PLAN_LIMITS, string> = {
  FREE: 'Free',
  MONTHLY: 'Pro',
  YEARLY: 'Business',
};

export function effectivePlanLimits(sub?: {
  plan?: string | null;
  extraBranches?: number | null;
  extraStaff?: number | null;
} | null) {
  const plan = (sub?.plan || 'FREE') as keyof typeof PLAN_LIMITS;
  const base = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
  return {
    ...base,
    branches: base.branches + (sub?.extraBranches || 0),
    staff: base.staff + (sub?.extraStaff || 0),
    displayName: PLAN_DISPLAY_NAMES[plan] || plan,
  };
}

/** Billing / display pricing by market (checkout resolves Stripe Price IDs from region). */
export type BillingRegionCode = 'NP' | 'US' | 'AU' | 'IN' | 'EU' | 'CN';

export type BillingRegion = {
  code: BillingRegionCode;
  currency: string;
  label: string;
  monthlyAmount: number;
  yearlyAmount: number;
  yearlyWasAmount: number;
};

export const BILLING_REGIONS: Record<BillingRegionCode, BillingRegion> = {
  NP: {
    code: 'NP',
    currency: 'NPR',
    label: 'Nepal',
    monthlyAmount: 699,
    yearlyAmount: 4999,
    yearlyWasAmount: 7499,
  },
  US: {
    code: 'US',
    currency: 'USD',
    label: 'United States',
    monthlyAmount: 4.99,
    yearlyAmount: 39.99,
    yearlyWasAmount: 59.88,
  },
  AU: {
    code: 'AU',
    currency: 'AUD',
    label: 'Australia',
    monthlyAmount: 7.99,
    yearlyAmount: 69.99,
    yearlyWasAmount: 95.88,
  },
  IN: {
    code: 'IN',
    currency: 'INR',
    label: 'India',
    monthlyAmount: 399,
    yearlyAmount: 2999,
    yearlyWasAmount: 4788,
  },
  EU: {
    code: 'EU',
    currency: 'EUR',
    label: 'Europe',
    monthlyAmount: 4.99,
    yearlyAmount: 39.99,
    yearlyWasAmount: 59.88,
  },
  CN: {
    code: 'CN',
    currency: 'CNY',
    label: 'China',
    monthlyAmount: 35,
    yearlyAmount: 278,
    yearlyWasAmount: 420,
  },
};

/** ISO country → billing region (America / Australia / etc.). */
export const COUNTRY_TO_BILLING_REGION: Record<string, BillingRegionCode> = {
  NP: 'NP',
  US: 'US',
  CA: 'US',
  MX: 'US',
  AU: 'AU',
  NZ: 'AU',
  IN: 'IN',
  BD: 'IN',
  LK: 'IN',
  GB: 'EU',
  IE: 'EU',
  DE: 'EU',
  FR: 'EU',
  ES: 'EU',
  IT: 'EU',
  NL: 'EU',
  BE: 'EU',
  AT: 'EU',
  PT: 'EU',
  SE: 'EU',
  NO: 'EU',
  DK: 'EU',
  FI: 'EU',
  CH: 'EU',
  CN: 'CN',
  HK: 'CN',
  TW: 'CN',
  SG: 'AU',
};

export function billingRegionFromCountry(country?: string | null): BillingRegion {
  const cc = (country || 'US').trim().toUpperCase();
  const code = COUNTRY_TO_BILLING_REGION[cc] || 'US';
  return BILLING_REGIONS[code];
}

/**
 * Resolve Stripe Price ID for a plan in a region.
 * Prefers STRIPE_PRICE_MONTHLY_AU / STRIPE_PRICE_YEARLY_US, falls back to STRIPE_PRICE_MONTHLY / YEARLY.
 */
function envMap(
  env?: Record<string, string | undefined>,
): Record<string, string | undefined> {
  if (env) return env;
  if (typeof process !== 'undefined' && process.env) return process.env as Record<string, string | undefined>;
  return {};
}

export function stripePriceIdForPlan(
  plan: 'MONTHLY' | 'YEARLY',
  regionCode: BillingRegionCode,
  env?: Record<string, string | undefined>,
): string | undefined {
  const e = envMap(env);
  const keyed =
    plan === 'YEARLY'
      ? e[`STRIPE_PRICE_YEARLY_${regionCode}`]
      : e[`STRIPE_PRICE_MONTHLY_${regionCode}`];
  if (keyed) return keyed;
  return plan === 'YEARLY' ? e.STRIPE_PRICE_YEARLY : e.STRIPE_PRICE_MONTHLY;
}

export function stripeVerifiedPriceId(
  interval: 'monthly' | 'yearly',
  regionCode: BillingRegionCode,
  env?: Record<string, string | undefined>,
): string | undefined {
  const e = envMap(env);
  const suffix = interval === 'yearly' ? 'YEARLY' : 'MONTHLY';
  return e[`STRIPE_PRICE_VERIFIED_${suffix}_${regionCode}`] || e[`STRIPE_PRICE_VERIFIED_${suffix}`];
}

export const VerificationStatus = {
  NONE: 'NONE',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REVOKED: 'REVOKED',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

/** Stamp Perk Verified badge is live when admin-approved and paid period is active. */
export function isMerchantVerifiedLive(input: {
  verificationStatus?: string | null;
  verifiedAddon?: boolean | null;
  verifiedUntil?: string | Date | null;
  now?: Date;
}): boolean {
  if (input.verificationStatus !== 'APPROVED') return false;
  if (!input.verifiedAddon) return false;
  if (!input.verifiedUntil) return false;
  const until =
    input.verifiedUntil instanceof Date
      ? input.verifiedUntil
      : new Date(input.verifiedUntil);
  if (Number.isNaN(+until)) return false;
  return until > (input.now || new Date());
}

export const VERIFIED_ADDON_PRICES = {
  monthly: { price: 2.99, currency: 'USD', days: 30 },
  yearly: { price: 24.99, currency: 'USD', days: 365, savingsPercent: 30 },
} as const;

export const applyVerificationSchema = z.object({
  registrationNumber: z.string().min(2).max(80).optional(),
  panVatNumber: z.string().min(2).max(80).optional(),
  docUrls: z.array(z.string().min(4).max(500)).min(1).max(8),
  note: z.string().max(500).optional(),
});

export const adminVerificationActionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REVOKE']),
  note: z.string().max(500).optional(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(80),
  role: z.enum(['CUSTOMER', 'MERCHANT_OWNER']).default('CUSTOMER'),
  phone: z.string().optional(),
  language: z.string().default('en'),
  timezone: z.string().default('Asia/Kathmandu'),
  currency: z.string().default('NPR'),
  /** Invite code from Refer & Earn share link. */
  referralCode: z.preprocess(
    (v) => {
      if (typeof v !== 'string') return undefined;
      const t = v.trim().toUpperCase();
      return t.length ? t : undefined;
    },
    z.string().min(4).max(16).optional(),
  ),
  /** When set with referralCode, creates a merchant-scoped referral. */
  referralMerchantId: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined),
    z.string().min(1).optional(),
  ),
  referralProgramId: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined),
    z.string().min(1).optional(),
  ),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  captchaId: z.string().optional(),
  captchaAnswer: z.string().optional(),
  deviceName: z.string().max(120).optional(),
  deviceType: z.enum(['web', 'ios', 'android', 'desktop', 'unknown']).optional(),
});

export const oauthLoginSchema = z.object({
  provider: z.enum(['google', 'apple', 'microsoft']),
  idToken: z.string().min(8),
  email: z.string().email().optional(),
  name: z.string().max(120).optional(),
  sub: z.string().max(200).optional(),
  role: z.enum(['CUSTOMER', 'MERCHANT_OWNER']).optional(),
  deviceName: z.string().max(120).optional(),
  deviceType: z.enum(['web', 'ios', 'android', 'desktop', 'unknown']).optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(16),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

/** Client-side password strength helper (0–4). */
export function passwordStrength(password: string): {
  score: number;
  label: 'weak' | 'fair' | 'good' | 'strong' | 'empty';
  checks: { label: string; ok: boolean }[];
} {
  const p = password || '';
  const checks = [
    { label: 'At least 8 characters', ok: p.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(p) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(p) },
    { label: 'Number', ok: /\d/.test(p) },
    { label: 'Symbol', ok: /[^A-Za-z0-9]/.test(p) },
  ];
  if (!p) return { score: 0, label: 'empty', checks };
  const score = checks.filter((c) => c.ok).length;
  const label =
    score <= 1 ? 'weak' : score === 2 ? 'fair' : score === 3 ? 'good' : 'strong';
  return { score: Math.min(4, score), label, checks };
}

const optionalEmail = z.union([z.string().email(), z.literal('')]).optional();
const optionalText = z.string().max(200).optional();

export const createMerchantSchema = z.object({
  businessName: z.string().min(2).max(100),
  category: z.string().min(2).max(60),
  description: z.string().max(1000).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('NP'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  logoUrl: z.string().max(500).optional(),
  timezone: z.string().default('Asia/Kathmandu'),
  currency: z.string().default('NPR'),
});

/** Super-admin creates a merchant + owner account (or attaches existing user). */
export const adminCreateMerchantSchema = z
  .object({
    ownerEmail: z.string().email(),
    ownerName: z.string().min(2).max(80).optional(),
    ownerPassword: z.string().min(8).optional(),
    businessName: z.string().min(2).max(100),
    category: z.string().min(2).max(60),
    description: z.string().max(2000).optional(),
    phone: optionalText,
    email: optionalEmail,
    address: z.string().max(300).optional(),
    city: optionalText,
    country: z.string().default('NP'),
    province: optionalText,
    district: optionalText,
    municipality: optionalText,
    ward: optionalText,
    postalCode: optionalText,
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    logoUrl: z.string().max(500).optional(),
    timezone: z.string().default('Asia/Kathmandu'),
    currency: z.string().default('NPR'),
    status: z.enum(['ACTIVE', 'PENDING', 'SUSPENDED']).default('ACTIVE'),
    plan: z.enum(['FREE', 'MONTHLY', 'YEARLY']).default('FREE'),
  })
  .superRefine((v, ctx) => {
    // New owner requires name + password when email is unused — validated in service too.
    if (v.ownerPassword && v.ownerPassword.length < 8) {
      ctx.addIssue({ code: 'custom', message: 'Password must be at least 8 characters', path: ['ownerPassword'] });
    }
  });

export const adminUpdateMerchantSchema = z.object({
  businessName: z.string().min(2).max(100).optional(),
  category: z.string().min(2).max(60).optional(),
  description: z.string().max(2000).optional(),
  phone: optionalText,
  email: optionalEmail,
  address: z.string().max(300).optional(),
  city: optionalText,
  country: optionalText,
  province: optionalText,
  district: optionalText,
  municipality: optionalText,
  ward: optionalText,
  postalCode: optionalText,
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  logoUrl: z.string().max(500).optional(),
  timezone: optionalText,
  currency: optionalText,
  status: z.enum(['ACTIVE', 'PENDING', 'SUSPENDED']).optional(),
  plan: z.enum(['FREE', 'MONTHLY', 'YEARLY']).optional(),
  ownerEmail: z.string().email().optional(),
});

export type AdminCreateMerchantInput = z.infer<typeof adminCreateMerchantSchema>;
export type AdminUpdateMerchantInput = z.infer<typeof adminUpdateMerchantSchema>;

/** Full business profile update (merchant dashboard). */
export const updateMerchantProfileSchema = z.object({
  businessName: z.string().min(2).max(100).optional(),
  logoUrl: z.string().max(500).optional(),
  registrationNumber: optionalText,
  panVatNumber: optionalText,
  businessType: optionalText,
  category: z.string().min(2).max(60).optional(),
  yearEstablished: z.number().int().min(1800).max(2100).nullable().optional(),
  description: z.string().max(2000).optional(),
  tagline: z.string().max(120).optional(),
  contactPerson: optionalText,
  designation: optionalText,
  email: optionalEmail,
  phone: optionalText,
  mobile: optionalText,
  website: z.string().max(300).optional(),
  supportPhone: optionalText,
  whatsapp: optionalText,
  country: optionalText,
  province: optionalText,
  district: optionalText,
  city: optionalText,
  municipality: optionalText,
  ward: optionalText,
  address: z.string().max(300).optional(),
  postalCode: optionalText,
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  googleMapsUrl: z.string().max(500).optional(),
  facebook: z.string().max(300).optional(),
  instagram: z.string().max(300).optional(),
  linkedin: z.string().max(300).optional(),
  tiktok: z.string().max(300).optional(),
  youtube: z.string().max(300).optional(),
  twitter: z.string().max(300).optional(),
  pinterest: z.string().max(300).optional(),
  threads: z.string().max(300).optional(),
  timezone: optionalText,
  currency: optionalText,
  hoursJson: z.unknown().optional(),
  deliveryNote: z.string().max(500).optional(),
  supportNote: z.string().max(500).optional(),
  deliveryEnabled: z.boolean().optional(),
});

/** Customer (and account) profile update. */
export const updateCustomerProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: optionalText,
  alternatePhone: optionalText,
  photoUrl: z.string().max(500).optional(),
  dateOfBirth: z.union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')]).nullable().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say', '']).optional(),
  language: optionalText,
  timezone: optionalText,
  currency: optionalText,
  country: optionalText,
  province: optionalText,
  district: optionalText,
  city: optionalText,
  municipality: optionalText,
  ward: optionalText,
  streetAddress: z.string().max(300).optional(),
  postalCode: optionalText,
  marketingConsent: z.boolean().optional(),
  pushConsent: z.boolean().optional(),
  notifyOffers: z.boolean().optional(),
  notifyLoyalty: z.boolean().optional(),
  notifyExpiry: z.boolean().optional(),
  notifyTransfers: z.boolean().optional(),
  notifyStaff: z.boolean().optional(),
});

export const createLoyaltyProgramSchema = z.object({
  title: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  totalStamps: z.number().int().min(3).max(30).default(8),
  rewardTitle: z.string().min(2).max(80),
  rewardDescription: z.string().max(300).optional(),
  expiryDays: z.number().int().min(0).optional(),
  expiresAt: z.union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')]).nullable().optional(),
  cardType: z.enum(['CLASSIC', 'THRESHOLD', 'MULTI_STEP']).default('CLASSIC'),
  categorySlug: z.string().max(80).optional(),
  templateId: z.string().max(60).optional(),
  businessName: z.string().max(100).optional(),
  logoUrl: z.string().max(500).optional(),
  logoScale: z.number().min(0.6).max(3).optional(),
  logoOffsetX: z.number().min(-50).max(50).optional(),
  logoOffsetY: z.number().min(-50).max(50).optional(),
  /** Logo badge position on card front (% from left, 0–100) */
  logoPosX: z.number().min(8).max(92).optional(),
  /** Logo badge position on card front (% from top, 0–100) */
  logoPosY: z.number().min(8).max(70).optional(),
  /** Front cover promo photo (gallery / upload). */
  promoImageUrl: z.string().max(500).optional(),
  stampColor: z.string().max(40).optional(),
  emptyStampColor: z.string().max(40).optional(),
  accentColor: z.string().max(40).optional(),
  fontStyle: z.enum(['sans', 'rounded', 'display']).optional(),
  thresholdType: z.enum(['VISITS', 'SPEND']).optional(),
  thresholdValue: z.number().min(0).optional(),
  stepsJson: z
    .array(
      z.object({
        at: z.number().int().min(1).max(30),
        rewardTitle: z.string().min(1).max(80),
        rewardDescription: z.string().max(300).optional(),
      }),
    )
    .optional(),
  campaignPreset: z.string().max(60).optional(),
  doubleSided: z.boolean().optional(),
  cardPhone: z.string().max(40).optional(),
  cardEmail: z.union([z.string().email(), z.literal('')]).optional(),
  cardLocation: z.string().max(300).optional(),
  cardWebsite: z.string().max(300).optional(),
  cardFacebook: z.string().max(300).optional(),
  cardInstagram: z.string().max(300).optional(),
  cardTiktok: z.string().max(300).optional(),
  deliveryAvailable: z.boolean().optional(),
  referralEnabled: z.boolean().optional(),
  referralBonusReferrer: z.number().int().min(0).max(10).optional(),
  referralBonusReferee: z.number().int().min(0).max(10).optional(),
});

export const updateLoyaltyProgramSchema = createLoyaltyProgramSchema.partial().extend({
  active: z.boolean().optional(),
});

export const stampScanSchema = z.object({
  customerQrToken: z.string().min(4),
  programId: z.string().optional(),
  saleAmount: z.number().min(0).optional(),
  offlineId: z.string().optional(),
  scannedAt: z.string().datetime().optional(),
});

/** Merchant lookup of an existing customer by phone or email (Can't scan flow). */
export const customerLookupSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(5).max(32).optional(),
  })
  .refine((v) => Boolean(v.email || v.phone), {
    message: 'Provide email or phone',
  });

/** Create or match a customer so merchant can stamp without scanning QR. */
export const inviteCustomerSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(5).max(32).optional(),
    countryCode: z.string().min(2).max(3).optional(),
  })
  .refine((v) => Boolean(v.email || v.phone), {
    message: 'Provide email or phone',
  });

/** Common dial codes for merchant phone search / invite. */
export const PHONE_DIAL_OPTIONS = [
  { code: 'NP', dial: '+977', label: 'Nepal', flag: '🇳🇵' },
  { code: 'IN', dial: '+91', label: 'India', flag: '🇮🇳' },
  { code: 'US', dial: '+1', label: 'United States', flag: '🇺🇸' },
  { code: 'GB', dial: '+44', label: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AE', dial: '+971', label: 'UAE', flag: '🇦🇪' },
  { code: 'AU', dial: '+61', label: 'Australia', flag: '🇦🇺' },
  { code: 'CN', dial: '+86', label: 'China', flag: '🇨🇳' },
] as const;

export function normalizeDialPhone(dialCode: string, localNumber: string): string {
  const dialDigits = dialCode.replace(/\D/g, '');
  let local = localNumber.replace(/\D/g, '');
  // Drop leading 0 on national numbers (common in NP/IN)
  if (local.startsWith('0')) local = local.slice(1);
  // Avoid double-prefix if user pasted full international
  if (local.startsWith(dialDigits)) return `+${local}`;
  return `+${dialDigits}${local}`;
}

export function phoneLookupVariants(phone: string): string[] {
  const raw = phone.trim();
  const digits = raw.replace(/\D/g, '');
  const withPlus = digits ? `+${digits}` : '';
  const out = new Set<string>();
  for (const v of [raw, digits, withPlus]) {
    if (v) out.add(v);
  }
  // Common Nepal/India national forms
  for (const cc of ['977', '91']) {
    if (digits.startsWith(cc) && digits.length > cc.length) {
      const national = digits.slice(cc.length);
      out.add(national);
      out.add(`0${national}`);
      out.add(`+${cc}${national}`);
    }
  }
  return [...out];
}

/** Expected national (subscriber) digit length by ISO country code. */
const PHONE_NATIONAL_LEN: Record<string, { min: number; max: number }> = {
  NP: { min: 10, max: 10 },
  IN: { min: 10, max: 10 },
  US: { min: 10, max: 10 },
  GB: { min: 10, max: 11 },
  AE: { min: 9, max: 9 },
  AU: { min: 9, max: 9 },
  CN: { min: 11, max: 11 },
};

/** National digit length bounds for a country (defaults to a loose 7–15). */
export function phoneNationalLength(countryCode: string = 'NP'): { min: number; max: number } {
  const cc = (countryCode || 'NP').toUpperCase();
  return PHONE_NATIONAL_LEN[cc] || { min: 7, max: 15 };
}

/**
 * Digits-only local/national input, capped to the country's max length.
 * Use on every keystroke so users cannot type past the limit.
 * Strips dial-code / leading 0 when the user pastes a full international number.
 */
export function sanitizeLocalPhoneInput(localNumber: string, countryCode: string = 'NP'): string {
  const cc = (countryCode || 'NP').toUpperCase();
  const { max } = phoneNationalLength(cc);
  let digits = localNumber.replace(/\D/g, '');
  const dial = PHONE_DIAL_OPTIONS.find((d) => d.code === cc)?.dial.replace(/\D/g, '') || '';
  if (dial && digits.startsWith(dial)) digits = digits.slice(dial.length);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, max);
}

export function isValidEmailFormat(email: string): boolean {
  const t = email.trim();
  if (!t) return false;
  return z.string().email().safeParse(t).success;
}

/**
 * Format check for phone numbers.
 * Accepts local national digits or E.164 (+977…). Default country NP.
 */
export function isValidPhoneFormat(phone: string, countryCode: string = 'NP'): boolean {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 18) return false;
  const cc = (countryCode || 'NP').toUpperCase();
  const dial = PHONE_DIAL_OPTIONS.find((d) => d.code === cc)?.dial.replace(/\D/g, '') || '';
  let national = digits;
  if (dial && digits.startsWith(dial)) national = digits.slice(dial.length);
  if (national.startsWith('0')) national = national.slice(1);
  const rule = phoneNationalLength(cc);
  return national.length >= rule.min && national.length <= rule.max;
}

/** Returns an error message, or null when contacts look valid. */
export function contactFormatError(input: {
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  whatsapp?: string | null;
  supportPhone?: string | null;
  countryCode?: string | null;
  requirePhone?: boolean;
  requireEmail?: boolean;
}): string | null {
  const country = input.countryCode || 'NP';
  const email = (input.email || '').trim();
  const phone = (input.phone || '').trim();
  const mobile = (input.mobile || '').trim();
  const whatsapp = (input.whatsapp || '').trim();
  const support = (input.supportPhone || '').trim();

  if (input.requireEmail && !email) return 'Email is required';
  if (email && !isValidEmailFormat(email)) return 'Enter a valid email address';

  if (input.requirePhone && !phone && !mobile) return 'Phone number is required';
  if (phone && !isValidPhoneFormat(phone, country)) {
    const { min, max } = phoneNationalLength(country);
    const lenHint = min === max ? `${max} digits` : `${min}–${max} digits`;
    return country === 'NP'
      ? `Enter a valid Nepal phone (${lenHint}, e.g. 98xxxxxxxx)`
      : `Enter a valid phone number (${lenHint})`;
  }
  if (mobile && !isValidPhoneFormat(mobile, country)) {
    return 'Enter a valid mobile number';
  }
  if (whatsapp && !isValidPhoneFormat(whatsapp, country)) {
    return 'Enter a valid WhatsApp number';
  }
  if (support && !isValidPhoneFormat(support, country)) {
    return 'Enter a valid support phone number';
  }
  return null;
}

export const redeemSchema = z.object({
  cardId: z.string(),
  customerQrToken: z.string().optional(),
});

/** Default window for the recipient to accept a stamp transfer. */
export const STAMP_TRANSFER_OFFER_HOURS = 48;

export const createStampTransferSchema = z
  .object({
    cardId: z.string().min(1),
    amount: z.number().int().min(1).max(100),
    toEmail: z.string().email().optional(),
    toPhone: z.string().min(5).max(32).optional(),
    toQrToken: z.string().min(4).optional(),
    note: z.string().max(200).optional(),
  })
  .refine((v) => Boolean(v.toEmail || v.toPhone || v.toQrToken), {
    message: 'Provide toEmail, toPhone, or toQrToken',
  });

export const createCampaignSchema = z.object({
  title: z.string().min(2).max(40),
  description: z.string().max(100),
  badgeText: z.string().max(12),
  offerType: z.enum(['PERCENTAGE', 'FIXED', 'FREE_ITEM', 'CUSTOM']).default('PERCENTAGE'),
  discountValue: z.number().min(0).optional(),
  imageUrl: z.union([z.string().url(), z.literal('')]).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  branchIds: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'SCHEDULED']).default('DRAFT'),
  campaignPreset: z.string().max(60).optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const inviteStaffSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  permissions: z.array(z.enum(['SCAN', 'REDEEM', 'MANAGE'])).default(['SCAN', 'REDEEM']),
  branchId: z.string().optional(),
});

export const updateStaffSchema = z.object({
  active: z.boolean().optional(),
  permissions: z.array(z.enum(['SCAN', 'REDEEM', 'MANAGE'])).optional(),
  branchId: z.string().nullable().optional(),
});

const couponDateSchema = z.union([
  z.string().datetime(),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  z.null(),
]);

export const createCouponSchema = z.object({
  code: z.string().min(2).max(40),
  title: z.string().min(1).max(80),
  description: z.string().max(200).optional(),
  type: z.enum(['PERCENT', 'FIXED', 'FIRST_VISIT', 'BIRTHDAY', 'REFERRAL']).default('PERCENT'),
  value: z.number().min(0).default(10),
  expiresAt: couponDateSchema.optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  branchId: z.string().nullable().optional(),
  segment: z.enum(['ALL', 'NEW', 'RETURNING', 'VIP', 'AT_RISK']).default('ALL'),
  active: z.boolean().optional(),
});

export const updateCouponSchema = createCouponSchema.partial();

export const redeemCouponSchema = z
  .object({
    code: z.string().min(1).max(40),
    customerId: z.string().optional(),
    email: z.string().email().optional(),
  })
  .refine((v) => Boolean(v.customerId || v.email), {
    message: 'Provide customerId or email',
  });

export const PushContentType = {
  GENERAL: 'GENERAL',
  LOYALTY_CARD: 'LOYALTY_CARD',
  OFFER: 'OFFER',
} as const;
export type PushContentType = (typeof PushContentType)[keyof typeof PushContentType];

export const PushAudience = {
  LOYALTY_CUSTOMERS: 'LOYALTY_CUSTOMERS',
  NEAR_AREA: 'NEAR_AREA',
  CUSTOMERS_AND_OUTSIDE: 'CUSTOMERS_AND_OUTSIDE',
} as const;
export type PushAudience = (typeof PushAudience)[keyof typeof PushAudience];

export const estimateAudienceSchema = z.object({
  audience: z.enum(['LOYALTY_CUSTOMERS', 'NEAR_AREA', 'CUSTOMERS_AND_OUTSIDE']),
  radiusKm: z.number().min(0.5).max(100).default(5),
  branchId: z.string().optional(),
});

export const createPushSendSchema = z.object({
  contentType: z.enum(['GENERAL', 'LOYALTY_CARD', 'OFFER']),
  title: z.string().min(1).max(60),
  body: z.string().min(1).max(160),
  programId: z.string().optional(),
  campaignId: z.string().optional(),
  audience: z.enum(['LOYALTY_CUSTOMERS', 'NEAR_AREA', 'CUSTOMERS_AND_OUTSIDE']),
  radiusKm: z.number().min(0.5).max(100).default(5),
  branchId: z.string().optional(),
});

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(500),
  segment: z.enum(['ALL', 'NEW', 'RETURNING', 'VIP', 'AT_RISK']).default('ALL'),
  publish: z.boolean().default(true),
});

export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateMerchantInput = z.infer<typeof createMerchantSchema>;
export type UpdateMerchantProfileInput = z.infer<typeof updateMerchantProfileSchema>;

/** Soft-gate fields before first loyalty card (not full profile). */
export type MerchantEssentialsFields = {
  businessName?: string | null;
  category?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  mobile?: string | null;
  city?: string | null;
};

export function merchantEssentialsReady(
  m: MerchantEssentialsFields | null | undefined,
): boolean {
  if (!m) return false;
  const name = (m.businessName || '').trim();
  const category = (m.category || '').trim();
  const logo = (m.logoUrl || '').trim();
  const phone = (m.phone || m.mobile || '').trim();
  const city = (m.city || '').trim();
  return name.length >= 2 && category.length >= 2 && !!logo && !!phone && !!city;
}

export function merchantEssentialsMissing(
  m: MerchantEssentialsFields | null | undefined,
): string[] {
  const missing: string[] = [];
  if (!(m?.businessName || '').trim()) missing.push('Business name');
  if (!(m?.category || '').trim()) missing.push('Category');
  if (!(m?.logoUrl || '').trim()) missing.push('Logo');
  if (!(m?.phone || m?.mobile || '').trim()) missing.push('Phone');
  if (!(m?.city || '').trim()) missing.push('City');
  return missing;
}

export type UpdateCustomerProfileInput = z.infer<typeof updateCustomerProfileSchema>;
export type CreateLoyaltyProgramInput = z.infer<typeof createLoyaltyProgramSchema>;
export type UpdateLoyaltyProgramInput = z.infer<typeof updateLoyaltyProgramSchema>;

/** Platform Refer & Earn stamp bonuses (pending ledger → next scan). */
export const PLATFORM_REFERRAL_BONUS = {
  referrer: 2,
  referee: 2,
  dailyCapPerReferrer: 10,
} as const;
export type StampScanInput = z.infer<typeof stampScanSchema>;
export type CustomerLookupInput = z.infer<typeof customerLookupSchema>;
export type InviteCustomerInput = z.infer<typeof inviteCustomerSchema>;
export type RedeemInput = z.infer<typeof redeemSchema>;
export type CreateStampTransferInput = z.infer<typeof createStampTransferSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type RedeemCouponInput = z.infer<typeof redeemCouponSchema>;
export type EstimateAudienceInput = z.infer<typeof estimateAudienceSchema>;
export type CreatePushSendInput = z.infer<typeof createPushSendSchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

export const platformBrandingSchema = z.object({
  companyName: z.string().min(2).max(80).optional(),
  tagline: z.string().max(160).nullable().optional(),
  seoTitleTemplate: z.string().max(120).nullable().optional(),
  metaDescription: z.string().max(320).nullable().optional(),
  metaKeywords: z.string().max(300).nullable().optional(),
  logoUrl: z.string().max(500).nullable().optional(),
  faviconUrl: z.string().max(500).nullable().optional(),
  appleTouchIconUrl: z.string().max(500).nullable().optional(),
  pwaIcon192Url: z.string().max(500).nullable().optional(),
  pwaIcon512Url: z.string().max(500).nullable().optional(),
  ogImageUrl: z.string().max(500).nullable().optional(),
  contactEmail: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  supportEmail: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  website: z.string().max(300).nullable().optional(),
  facebook: z.string().max(300).nullable().optional(),
  instagram: z.string().max(300).nullable().optional(),
  twitter: z.string().max(300).nullable().optional(),
  linkedin: z.string().max(300).nullable().optional(),
  youtube: z.string().max(300).nullable().optional(),
});

export type PlatformBrandingInput = z.infer<typeof platformBrandingSchema>;

export const DEFAULT_PLATFORM_BRANDING = {
  companyName: 'Stamp Perk',
  tagline: 'Digital Loyalty Cards for Growing Businesses',
  seoTitleTemplate: '{companyName} | {tagline}',
  metaDescription:
    'Create a digital punch card, earn repeat customers, and manage your loyalty program from mobile and desktop. One account. Everything stays in sync.',
  metaKeywords: 'loyalty, stamp card, digital punch card, rewards, Stamp Perk',
  logoUrl: null as string | null,
  faviconUrl: null as string | null,
  appleTouchIconUrl: null as string | null,
  pwaIcon192Url: null as string | null,
  pwaIcon512Url: null as string | null,
  ogImageUrl: null as string | null,
  contactEmail: 'hello@stampperk.app' as string | null,
  supportEmail: 'support@stampperk.app' as string | null,
  website: null as string | null,
  facebook: null as string | null,
  instagram: null as string | null,
  twitter: null as string | null,
  linkedin: null as string | null,
  youtube: null as string | null,
};

export function resolveSeoTitle(branding: {
  companyName?: string | null;
  tagline?: string | null;
  seoTitleTemplate?: string | null;
}) {
  const company = branding.companyName || DEFAULT_PLATFORM_BRANDING.companyName;
  const tagline = branding.tagline || DEFAULT_PLATFORM_BRANDING.tagline;
  const template =
    branding.seoTitleTemplate || DEFAULT_PLATFORM_BRANDING.seoTitleTemplate || '{companyName}';
  return template.replace(/\{companyName\}/g, company).replace(/\{tagline\}/g, tagline || company);
}

export const BUSINESS_TYPES = [
  'Sole Proprietorship',
  'Partnership',
  'Private Limited',
  'Public Limited',
  'Cooperative',
  'NGO / Non-profit',
  'Other',
] as const;

export const BUSINESS_INDUSTRIES = [
  'Cafe & Coffee',
  'Restaurant & Food',
  'Bakery & Desserts',
  'Retail & Fashion',
  'Beauty & Salon',
  'Health & Fitness',
  'Digital Marketing',
  'Education',
  'Hospitality',
  'Grocery & Convenience',
  'Electronics',
  'Automotive',
  'Other',
] as const;

export const LEAFLET_LAYOUT_IDS = ['hero-a5', 'story-square', 'offer-band', 'minimal-qr'] as const;

export const createLeafletTemplateSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  previewUrl: z.string().max(500).optional(),
  layoutId: z.enum(LEAFLET_LAYOUT_IDS),
  categoryTags: z.string().max(200).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export const updateLeafletTemplateSchema = createLeafletTemplateSchema.partial();

export const createMerchantLeafletSchema = z.object({
  templateId: z.string().min(1),
  headline: z.string().min(2).max(80),
  offerText: z.string().min(2).max(200),
  promoImageUrl: z.string().max(500).optional(),
  logoUrl: z.string().max(500).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(300).optional(),
  accentColor: z.string().max(40).optional(),
  published: z.boolean().optional(),
});

export const updateMerchantLeafletSchema = createMerchantLeafletSchema.partial().extend({
  templateId: z.string().min(1).optional(),
});

export type CreateLeafletTemplateInput = z.infer<typeof createLeafletTemplateSchema>;
export type UpdateLeafletTemplateInput = z.infer<typeof updateLeafletTemplateSchema>;
export type CreateMerchantLeafletInput = z.infer<typeof createMerchantLeafletSchema>;
export type UpdateMerchantLeafletInput = z.infer<typeof updateMerchantLeafletSchema>;

export const SUPPORTED_LOCALES = ['en', 'ne'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export * from './catalogs';
export * from './locale';
export * from './address';
export * from './nepal-admin';
