'use client';

import { useEffect, useState } from 'react';
import {
  BUSINESS_CATEGORY_TREE,
  CARD_FONTS,
  CARD_TEMPLATES,
  STAMP_COLORS,
  categoryLabelFromSlug,
  type CreateLoyaltyProgramInput,
} from '@stampz/shared';
import { api } from '@/lib/api';
import { StampCardPreview, type ProfileContact } from '@/components/StampCardPreview';
import { LogoPicker } from '@/components/LogoPicker';
import { LogoAdjustPanel } from '@/components/LogoAdjustPanel';
import { PromoPhotoPicker } from '@/components/PromoPhotoPicker';
import { useAuth } from '@/lib/auth';

export type WizardMode = 'onboarding' | 'create-card' | 'edit-card';

export type LoyaltyWizardResult = {
  merchant?: {
    businessName: string;
    category: string;
    logoUrl?: string;
    phone?: string;
    city?: string;
    country: string;
  };
  program: CreateLoyaltyProgramInput;
};

export type LoyaltyProgramDraft = {
  id?: string;
  title?: string;
  totalStamps?: number;
  rewardTitle?: string;
  rewardDescription?: string | null;
  cardType?: string | null;
  categorySlug?: string | null;
  templateId?: string | null;
  businessName?: string | null;
  logoUrl?: string | null;
  logoScale?: number | null;
  logoOffsetX?: number | null;
  logoOffsetY?: number | null;
  logoPosX?: number | null;
  logoPosY?: number | null;
  promoImageUrl?: string | null;
  stampColor?: string | null;
  emptyStampColor?: string | null;
  accentColor?: string | null;
  fontStyle?: string | null;
  thresholdType?: string | null;
  thresholdValue?: number | null;
  stepsJson?: { at: number; rewardTitle: string; rewardDescription?: string }[] | null;
  doubleSided?: boolean | null;
  expiresAt?: string | null;
  expiryDays?: number | null;
  referralEnabled?: boolean | null;
  referralBonusReferrer?: number | null;
  referralBonusReferee?: number | null;
};

type StepDef = { id: number; label: string };

const ONBOARD_STEPS: StepDef[] = [
  { id: 1, label: 'Business' },
  { id: 2, label: 'Type' },
  { id: 3, label: 'Preview' },
  { id: 4, label: 'Done' },
];

const CREATE_STEPS: StepDef[] = [
  { id: 1, label: 'Brand' },
  { id: 2, label: 'Type' },
  { id: 3, label: 'Preview' },
  { id: 4, label: 'Done' },
];

const EDIT_STEPS: StepDef[] = [
  { id: 2, label: 'Type' },
  { id: 3, label: 'Edit' },
  { id: 4, label: 'Done' },
];

const inputClass =
  'w-full rounded-xl border border-black/8 bg-[#F4F5F7] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FF5A5F]/25';

function dateOnly(value?: string | null) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export function LoyaltyCardWizard({
  mode,
  defaults,
  initial,
  onComplete,
  onDone,
  onCancel,
}: {
  mode: WizardMode;
  defaults?: {
    businessName?: string;
    categorySlug?: string;
    logoUrl?: string;
  };
  initial?: LoyaltyProgramDraft | null;
  onComplete: (result: LoyaltyWizardResult) => Promise<void>;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const { token } = useAuth();
  const isEdit = mode === 'edit-card';
  const steps = mode === 'onboarding' ? ONBOARD_STEPS : mode === 'edit-card' ? EDIT_STEPS : CREATE_STEPS;
  const [step, setStep] = useState(steps[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<ProfileContact & { businessName?: string; logoUrl?: string | null; category?: string } | null>(null);

  const [businessName, setBusinessName] = useState(initial?.businessName || defaults?.businessName || '');
  const [categorySlug, setCategorySlug] = useState(initial?.categorySlug || defaults?.categorySlug || 'coffee-stamp-card');
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl || defaults?.logoUrl || '');
  const [logoScale, setLogoScale] = useState(initial?.logoScale ?? 1);
  const [logoOffsetX, setLogoOffsetX] = useState(initial?.logoOffsetX ?? 0);
  const [logoOffsetY, setLogoOffsetY] = useState(initial?.logoOffsetY ?? 0);
  const [logoPosX, setLogoPosX] = useState(initial?.logoPosX ?? 50);
  const [logoPosY, setLogoPosY] = useState(initial?.logoPosY ?? 32);
  const [promoImageUrl, setPromoImageUrl] = useState(initial?.promoImageUrl || '');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Kathmandu');

  const [cardType, setCardType] = useState<'CLASSIC' | 'THRESHOLD' | 'MULTI_STEP'>(
    (initial?.cardType as 'CLASSIC' | 'THRESHOLD' | 'MULTI_STEP') || 'CLASSIC',
  );
  const [templateId, setTemplateId] = useState(initial?.templateId || 'story-forest');
  const [totalStamps, setTotalStamps] = useState(initial?.totalStamps || 10);
  const [stampColor, setStampColor] = useState(initial?.stampColor || '#16352A');
  const [emptyStampColor, setEmptyStampColor] = useState(initial?.emptyStampColor || '#C9B08A');
  const [accentColor, setAccentColor] = useState(initial?.accentColor || '#F3EEE4');
  const [fontStyle, setFontStyle] = useState<'sans' | 'rounded' | 'display'>(
    (initial?.fontStyle as 'sans' | 'rounded' | 'display') || 'sans',
  );
  const [rewardTitle, setRewardTitle] = useState(initial?.rewardTitle || '1 Free Coffee');
  const [rewardDescription, setRewardDescription] = useState(
    initial?.rewardDescription || 'Collect stamps and unlock a free coffee',
  );
  const [title, setTitle] = useState(initial?.title || 'Loyalty Stamp Card');
  const [thresholdType, setThresholdType] = useState<'VISITS' | 'SPEND'>(
    (initial?.thresholdType as 'VISITS' | 'SPEND') || 'VISITS',
  );
  const [thresholdValue, setThresholdValue] = useState(initial?.thresholdValue || 10);
  const [stepsJson, setStepsJson] = useState(
    initial?.stepsJson?.length
      ? initial.stepsJson
      : [{ at: 4, rewardTitle: 'Small treat', rewardDescription: 'Unlock early reward' }],
  );
  const [doubleSided, setDoubleSided] = useState(initial?.doubleSided !== false);
  const [expiresAt, setExpiresAt] = useState(dateOnly(initial?.expiresAt));
  const [expiryDays, setExpiryDays] = useState(initial?.expiryDays ?? 90);
  const [referralEnabled, setReferralEnabled] = useState(Boolean(initial?.referralEnabled));
  const [referralBonusReferrer, setReferralBonusReferrer] = useState(
    initial?.referralBonusReferrer ?? 1,
  );
  const [referralBonusReferee, setReferralBonusReferee] = useState(
    initial?.referralBonusReferee ?? 1,
  );

  useEffect(() => {
    if (!token || mode === 'onboarding') return;
    api<Record<string, unknown>>('/merchants/me', { token })
      .then((m) => {
        setProfile({
          phone: m.phone as string,
          email: m.email as string,
          website: m.website as string,
          address: m.address as string,
          city: m.city as string,
          facebook: m.facebook as string,
          instagram: m.instagram as string,
          tiktok: m.tiktok as string,
          deliveryEnabled: Boolean(m.deliveryEnabled),
          contactPerson: m.contactPerson as string,
          tagline: m.tagline as string,
          slug: m.slug as string,
          businessName: m.businessName as string,
          logoUrl: m.logoUrl as string,
          category: m.category as string,
        });
        if (!businessName && m.businessName) setBusinessName(String(m.businessName));
        if (!logoUrl && m.logoUrl) setLogoUrl(String(m.logoUrl));
        if (m.phone) setPhone(String(m.phone));
        if (m.city) setCity(String(m.city));
      })
      .catch(() => undefined);
  }, [token, mode]);

  const profileForCard: ProfileContact = profile || {
    phone: phone || undefined,
    city: city || undefined,
    deliveryEnabled: false,
  };

  function applyTemplate(id: string) {
    const t = CARD_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setStampColor(t.stampColor);
    setEmptyStampColor(t.emptyStampColor);
    setAccentColor(t.accentColor);
    setFontStyle(t.fontStyle);
    if (t.cardType === 'THRESHOLD' || t.cardType === 'MULTI_STEP' || t.cardType === 'CLASSIC') {
      setCardType(t.cardType);
    }
  }

  function next() {
    setError('');
    if (step === 1) {
      if (!businessName.trim()) {
        setError('Business name is required');
        return;
      }
      if (!categorySlug) {
        setError('Please select a category');
        return;
      }
    }
    if (step === 2 && !cardType) {
      setError('Choose how rewards work');
      return;
    }
    const idx = steps.findIndex((s) => s.id === step);
    if (idx < steps.length - 1) setStep(steps[idx + 1].id);
  }

  function back() {
    const idx = steps.findIndex((s) => s.id === step);
    if (idx > 0) setStep(steps[idx - 1].id);
    else onCancel?.();
  }

  async function finish() {
    setBusy(true);
    setError('');
    try {
      const program: CreateLoyaltyProgramInput = {
        title: title || `${businessName || 'Loyalty'} Card`,
        description: `Starter ${cardType.toLowerCase()} loyalty card`,
        totalStamps,
        rewardTitle,
        rewardDescription,
        cardType,
        categorySlug,
        templateId,
        businessName: businessName || undefined,
        logoUrl: logoUrl || undefined,
        logoScale,
        logoOffsetX,
        logoOffsetY,
        logoPosX,
        logoPosY,
        promoImageUrl: promoImageUrl || undefined,
        stampColor,
        emptyStampColor,
        accentColor,
        fontStyle,
        expiryDays,
        expiresAt: expiresAt || '',
        doubleSided,
        // Contact on card back always mirrors Business Profile (snapshot at create)
        cardPhone: profileForCard.phone || phone || undefined,
        cardEmail: profileForCard.email || undefined,
        cardLocation:
          [profileForCard.address, profileForCard.city].filter(Boolean).join(', ') ||
          city ||
          undefined,
        cardWebsite: profileForCard.website || undefined,
        cardFacebook: profileForCard.facebook || undefined,
        cardInstagram: profileForCard.instagram || undefined,
        cardTiktok: profileForCard.tiktok || undefined,
        deliveryAvailable: Boolean(profileForCard.deliveryEnabled),
        referralEnabled,
        referralBonusReferrer,
        referralBonusReferee,
        ...(cardType === 'THRESHOLD'
          ? { thresholdType, thresholdValue }
          : {}),
        ...(cardType === 'MULTI_STEP'
          ? { stepsJson }
          : {}),
      };
      await onComplete({
        merchant:
          mode === 'onboarding'
            ? {
                businessName,
                category: categoryLabelFromSlug(categorySlug),
                logoUrl: logoUrl || undefined,
                phone: phone || undefined,
                city,
                country: 'NP',
              }
            : undefined,
        program,
      });
      setBusy(false);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setBusy(false);
      return false;
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-2">
        {onCancel && (
          <button type="button" onClick={back} className="rounded-full border border-black/8 px-3 py-1.5 text-sm font-bold">
            ←
          </button>
        )}
        <div className="flex flex-1 items-center justify-center gap-2">
          {steps.map((s, i) => {
            const done = step > s.id || (step === 4 && s.id === 4);
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    done || active ? 'bg-[#FF5A5F] text-white' : 'bg-[#E5E5EA] text-[#8E8E93]'
                  }`}
                >
                  {done && !active && step === 4 ? '✓' : done && s.id < step ? '✓' : s.id === 4 && step === 4 ? '✓' : active && s.id < 4 ? s.id : s.id}
                </div>
                {i < steps.length - 1 && <div className={`h-0.5 w-8 ${s.id < step ? 'bg-[#FF5A5F]' : 'bg-[#E5E5EA]'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}

      {step === 1 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-extrabold tracking-tight">
            {mode === 'create-card' ? (
              <>
                Stamp for <span className="text-[#FF5A5F]">this business</span>
              </>
            ) : (
              <>
                Tell us about <span className="text-[#FF5A5F]">your business</span>
              </>
            )}
          </h1>
          <p className="text-sm text-[#8E8E93]">
            {mode === 'create-card'
              ? 'Create a stamp card for a different brand or branch — pick category and logo.'
              : 'Add the basics so customers can recognize your brand.'}
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Business name</span>
            <input className={inputClass} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Bean & Bloom Cafe" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Select category</span>
            <select className={inputClass} value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}>
              {BUSINESS_CATEGORY_TREE.map((g) => (
                <optgroup key={g.id} label={g.label}>
                  {g.children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Logo</span>
            <LogoPicker
              token={token}
              value={logoUrl}
              categorySlug={categorySlug}
              onChange={(url) => {
                setLogoUrl(url);
                if (!url) {
                  setLogoScale(1);
                  setLogoOffsetX(0);
                  setLogoOffsetY(0);
                  setLogoPosX(50);
                  setLogoPosY(32);
                }
              }}
            />
            {logoUrl ? (
              <div className="mt-3">
                <LogoAdjustPanel
                  logoUrl={logoUrl}
                  value={{
                    scale: logoScale,
                    offsetX: logoOffsetX,
                    offsetY: logoOffsetY,
                    posX: logoPosX,
                    posY: logoPosY,
                  }}
                  onChange={(t) => {
                    setLogoScale(t.scale);
                    setLogoOffsetX(t.offsetX);
                    setLogoOffsetY(t.offsetY);
                    setLogoPosX(t.posX);
                    setLogoPosY(t.posY);
                  }}
                  stampColor={stampColor}
                />
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Phone</span>
              <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">City</span>
              <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
          </div>
          <button type="button" onClick={next} className="w-full rounded-full bg-[#FF5A5F] py-3 text-sm font-bold text-white">
            Continue →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Choose how <span className="text-[#FF5A5F]">rewards</span> work
          </h1>
          <p className="text-sm text-[#8E8E93]">Let&apos;s create your first card — just a quick demo.</p>
          {(
            [
              {
                id: 'CLASSIC' as const,
                title: 'Classic stamp card',
                desc: 'Customers collect stamps and unlock a reward.',
              },
              {
                id: 'THRESHOLD' as const,
                title: 'Threshold reward',
                desc: 'Customers unlock a reward after reaching a target.',
              },
              {
                id: 'MULTI_STEP' as const,
                title: 'Multi-step card',
                desc: 'Unlock rewards at multiple stamp milestones.',
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setCardType(opt.id)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left ${
                cardType === opt.id ? 'border-[#FF5A5F] bg-[#FFF1F2]' : 'border-black/8 bg-white'
              }`}
            >
              <span
                className={`mt-1 h-4 w-4 rounded-full border-2 ${
                  cardType === opt.id ? 'border-[#FF5A5F] bg-[#FF5A5F]' : 'border-[#C7C7CC]'
                }`}
              />
              <div>
                <div className="font-extrabold">{opt.title}</div>
                <div className="text-sm text-[#8E8E93]">{opt.desc}</div>
              </div>
            </button>
          ))}
          <div className="rounded-2xl bg-[#FFF1F2] p-3 text-sm text-[#8E8E93]">
            Start simple: choose the reward style that fits your business today. You can change card rules later.
          </div>
          <button type="button" onClick={next} className="w-full rounded-full bg-[#FF5A5F] py-3 text-sm font-bold text-white">
            Continue →
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Preview your <span className="text-[#FF5A5F]">stamp card</span>
          </h1>
          <p className="text-sm text-[#8E8E93]">Customers collect stamps, then unlock a reward.</p>
          <p className="text-center text-xs font-semibold text-[#FF5A5F]">✨ Demo card preview ✨</p>

          <StampCardPreview
            businessName={businessName || profile?.businessName || defaults?.businessName || 'Your Business'}
            categorySlug={categorySlug}
            logoUrl={logoUrl || profile?.logoUrl || defaults?.logoUrl || undefined}
            promoImageUrl={promoImageUrl || undefined}
            logoScale={logoScale}
            logoOffsetX={logoOffsetX}
            logoOffsetY={logoOffsetY}
            logoPosX={logoPosX}
            logoPosY={logoPosY}
            tagline={profile?.tagline || undefined}
            totalStamps={totalStamps}
            filledStamps={Math.min(3, totalStamps - 1)}
            rewardTitle={rewardTitle}
            rewardDescription={rewardDescription}
            stampColor={stampColor}
            emptyStampColor={emptyStampColor}
            accentColor={accentColor}
            fontStyle={fontStyle}
            doubleSided={doubleSided}
            profile={
              mode === 'onboarding'
                ? { phone, city, ...profileForCard }
                : profileForCard
            }
            expiryLabel={
              expiresAt
                ? expiresAt
                : expiryDays
                  ? `${expiryDays} days from enroll`
                  : undefined
            }
          />

          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={doubleSided} onChange={(e) => setDoubleSided(e.target.checked)} />
            Double-sided stamp card (front + back)
          </label>

          <div className="rounded-2xl border border-black/8 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-extrabold">Back side · from Business Profile</div>
              {mode !== 'onboarding' && (
                <a href="/dashboard/profile" className="text-xs font-bold text-[#FF5A5F]">
                  Edit profile →
                </a>
              )}
            </div>
            <p className="text-xs text-[#8E8E93]">
              Social, email, website, phone, and location on the stamp card come from your Business Profile.
              Update them once — they appear on all your cards.
            </p>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#8E8E93]">Phone</span>
                <div className="font-semibold">{profileForCard.phone || phone || '—'}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#8E8E93]">Email</span>
                <div className="font-semibold">{profileForCard.email || '—'}</div>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold uppercase text-[#8E8E93]">Location</span>
                <div className="font-semibold">
                  {[profileForCard.address, profileForCard.city || city].filter(Boolean).join(', ') || '—'}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#8E8E93]">Website</span>
                <div className="font-semibold truncate">{profileForCard.website || '—'}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#8E8E93]">Social</span>
                <div className="font-semibold truncate">
                  {[profileForCard.instagram, profileForCard.facebook, profileForCard.tiktok]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-black/5">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Expire date</span>
                <input className={inputClass} type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Or expiry days</span>
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value) || 0)}
                />
              </label>
            </div>

            <div className="pt-3 border-t border-black/5 space-y-3">
              <label className="flex items-start gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={referralEnabled}
                  onChange={(e) => setReferralEnabled(e.target.checked)}
                />
                <span>
                  Refer &amp; Earn
                  <span className="block text-xs font-semibold text-[#8E8E93]">
                    Reward customers who bring friends after the friend’s first stamp.
                  </span>
                </span>
              </label>
              {referralEnabled && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">
                      Stamps for referrer
                    </span>
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      max={10}
                      value={referralBonusReferrer}
                      onChange={(e) =>
                        setReferralBonusReferrer(Math.min(10, Math.max(0, Number(e.target.value) || 0)))
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">
                      Stamps for new friend
                    </span>
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      max={10}
                      value={referralBonusReferee}
                      onChange={(e) =>
                        setReferralBonusReferee(Math.min(10, Math.max(0, Number(e.target.value) || 0)))
                      }
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-extrabold">Logo</div>
            <LogoPicker
              token={token}
              value={logoUrl}
              categorySlug={categorySlug}
              onChange={(url) => {
                setLogoUrl(url);
                if (!url) {
                  setLogoScale(1);
                  setLogoOffsetX(0);
                  setLogoOffsetY(0);
                  setLogoPosX(50);
                  setLogoPosY(32);
                }
              }}
            />
            {logoUrl ? (
              <div className="mt-3">
                <LogoAdjustPanel
                  logoUrl={logoUrl}
                  value={{
                    scale: logoScale,
                    offsetX: logoOffsetX,
                    offsetY: logoOffsetY,
                    posX: logoPosX,
                    posY: logoPosY,
                  }}
                  onChange={(t) => {
                    setLogoScale(t.scale);
                    setLogoOffsetX(t.offsetX);
                    setLogoOffsetY(t.offsetY);
                    setLogoPosX(t.posX);
                    setLogoPosY(t.posY);
                  }}
                  stampColor={stampColor}
                />
              </div>
            ) : null}
          </div>

          <div>
            <div className="mb-2 text-sm font-extrabold">Promo photo</div>
            <PromoPhotoPicker token={token} value={promoImageUrl} onChange={setPromoImageUrl} />
          </div>

          <div>
            <div className="mb-2 text-sm font-extrabold">How many stamps?</div>
            <div className="flex items-center justify-between rounded-2xl border border-black/8 bg-white px-4 py-3">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F5F7] text-xl font-bold"
                onClick={() => setTotalStamps((n) => Math.max(3, n - 1))}
              >
                −
              </button>
              <div className="text-lg font-extrabold text-[#FF5A5F]">{totalStamps} stamps</div>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F5F7] text-xl font-bold"
                onClick={() => setTotalStamps((n) => Math.min(30, n + 1))}
              >
                +
              </button>
            </div>
            <p className="mt-1 text-xs text-[#8E8E93]">Only the number of stamps is adjustable here — customize more below.</p>
          </div>

          <div>
            <div className="mb-2 text-sm font-extrabold">Template</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CARD_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-bold ${
                    templateId === t.id ? 'border-[#FF5A5F] bg-[#FFF1F2]' : 'border-black/8 bg-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-extrabold">Stamp color</div>
            <div className="flex flex-wrap gap-2">
              {STAMP_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => setStampColor(c.value)}
                  className={`h-8 w-8 rounded-full border-2 ${stampColor === c.value ? 'border-[#1C1C1E]' : 'border-white'}`}
                  style={{ background: c.value }}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-extrabold">Font style</div>
            <div className="flex flex-wrap gap-2">
              {CARD_FONTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFontStyle(f.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    fontStyle === f.id ? 'bg-[#FF5A5F] text-white' : 'bg-[#F4F5F7] text-[#1C1C1E]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Card title</span>
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Reward title</span>
            <input className={inputClass} value={rewardTitle} onChange={(e) => setRewardTitle(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Reward details</span>
            <input className={inputClass} value={rewardDescription} onChange={(e) => setRewardDescription(e.target.value)} />
          </label>

          {cardType === 'THRESHOLD' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Threshold type</span>
                <select className={inputClass} value={thresholdType} onChange={(e) => setThresholdType(e.target.value as 'VISITS' | 'SPEND')}>
                  <option value="VISITS">Visits</option>
                  <option value="SPEND">Spend</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Target value</span>
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(Number(e.target.value) || 1)}
                />
              </label>
            </div>
          )}

          {cardType === 'MULTI_STEP' && (
            <div className="space-y-2 rounded-2xl border border-black/8 p-3">
              <div className="text-sm font-extrabold">Milestones</div>
              {stepsJson.map((s, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-3">
                  <input
                    className={inputClass}
                    type="number"
                    value={s.at}
                    onChange={(e) => {
                      const nextSteps = [...stepsJson];
                      nextSteps[i] = { ...s, at: Number(e.target.value) || 1 };
                      setStepsJson(nextSteps);
                    }}
                  />
                  <input
                    className={`${inputClass} sm:col-span-2`}
                    value={s.rewardTitle}
                    onChange={(e) => {
                      const nextSteps = [...stepsJson];
                      nextSteps[i] = { ...s, rewardTitle: e.target.value };
                      setStepsJson(nextSteps);
                    }}
                  />
                </div>
              ))}
              <button
                type="button"
                className="text-xs font-bold text-[#FF5A5F]"
                onClick={() =>
                  setStepsJson([...stepsJson, { at: Math.min(totalStamps - 1, 6), rewardTitle: 'Bonus reward' }])
                }
              >
                + Add milestone
              </button>
            </div>
          )}

          <div className="rounded-2xl bg-[#FFF7ED] p-3 text-sm text-[#8E8E93]">
            This is a starter setup. Later you can customize logo, business name, reward title, colors, and reward details in the app.
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const ok = await finish();
              if (ok) setStep(4);
            }}
            className="w-full rounded-full bg-[#FF5A5F] py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? (isEdit ? 'Saving…' : 'Publishing…') : isEdit ? 'Save changes →' : 'Publish loyalty card →'}
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 text-center">
          <StampCardPreview
            businessName={businessName || profile?.businessName || defaults?.businessName || 'Your Business'}
            categorySlug={categorySlug}
            logoUrl={logoUrl || profile?.logoUrl || defaults?.logoUrl || undefined}
            promoImageUrl={promoImageUrl || undefined}
            logoScale={logoScale}
            logoOffsetX={logoOffsetX}
            logoOffsetY={logoOffsetY}
            logoPosX={logoPosX}
            logoPosY={logoPosY}
            tagline={profile?.tagline || undefined}
            totalStamps={totalStamps}
            filledStamps={3}
            rewardTitle={rewardTitle}
            rewardDescription={rewardDescription}
            stampColor={stampColor}
            emptyStampColor={emptyStampColor}
            accentColor={accentColor}
            fontStyle={fontStyle}
            doubleSided={doubleSided}
            profile={mode === 'onboarding' ? { phone, city, ...profileForCard } : profileForCard}
            expiryLabel={expiresAt || (expiryDays ? `${expiryDays} days` : undefined)}
          />
          <h1 className="text-2xl font-extrabold">
            {isEdit ? (
              <>
                Card <span className="text-[#FF5A5F]">updated</span>
              </>
            ) : (
              <>
                Congratulations! Your business is <span className="text-[#FF5A5F]">ready</span>
              </>
            )}
          </h1>
          <p className="text-sm text-[#8E8E93]">
            {isEdit
              ? 'Your loyalty card changes are saved and visible to customers.'
              : 'You successfully created your business. Your profile, card, and reward setup are ready to go.'}
          </p>
          <div className="space-y-2 rounded-2xl border border-black/5 bg-white p-4 text-left">
            {(isEdit
              ? [
                  ['Loyalty card updated', 'Design, stamps, and reward are saved.'],
                  ['Ready for customers', 'Existing and new members see the latest card.'],
                ]
              : [
                  ['Business profile complete', 'Your business details are all set.'],
                  ['Loyalty card ready', 'Your loyalty card is ready to go.'],
                  ['Reward setup complete', 'Your reward is ready for customers to unlock.'],
                ]
            ).map(([t, d]) => (
              <div key={t} className="flex gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF5A5F] text-xs text-white">✓</div>
                <div>
                  <div className="text-sm font-extrabold">{t}</div>
                  <div className="text-xs text-[#8E8E93]">{d}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-[#FFF1F2] p-3 text-sm text-[#8E8E93]">
            {isEdit
              ? 'You can edit or deactivate this card anytime from Loyalty Programs.'
              : 'This is your starter setup. Continue to see advanced tools that can help grow your business.'}
          </div>
          <button
            type="button"
            onClick={() => onDone?.()}
            className="w-full rounded-full bg-[#FF5A5F] py-3 text-sm font-bold text-white"
          >
            {isEdit ? 'Back to cards →' : 'Continue →'}
          </button>
        </div>
      )}
    </div>
  );
}
