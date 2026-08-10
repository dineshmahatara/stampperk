'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MerchantPageHeader, MerchantSurface } from '@/components/MerchantPage';
import { LoyaltyCardWizard } from '@/components/LoyaltyCardWizard';
import { StampCardPreview, type ProfileContact } from '@/components/StampCardPreview';
import { categoryLabelFromSlug, merchantEssentialsReady } from '@stampz/shared';

type Program = {
  id: string;
  title: string;
  totalStamps: number;
  rewardTitle: string;
  rewardDescription?: string | null;
  active: boolean;
  cardType?: string;
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
  doubleSided?: boolean;
  expiresAt?: string | null;
  expiryDays?: number | null;
};

type MerchantMeta = ProfileContact & {
  businessName?: string;
  logoUrl?: string | null;
  category?: string;
};

export default function CardsPage() {
  const { token } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [merchant, setMerchant] = useState<MerchantMeta | null>(null);
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editing, setEditing] = useState<Program | null>(null);
  const [msg, setMsg] = useState('');
  const essentialsOk = merchantEssentialsReady(merchant);

  function load() {
    if (!token) return;
    api<Program[]>('/loyalty/programs', { token }).then(setPrograms).catch(() => undefined);
    api<MerchantMeta>('/merchants/me', { token }).then(setMerchant).catch(() => undefined);
  }

  useEffect(load, [token]);

  async function deactivate(id: string) {
    if (!token || !confirm('Deactivate this loyalty card?')) return;
    await api(`/loyalty/programs/${id}`, { method: 'DELETE', token });
    setMsg('Card deactivated');
    load();
  }

  async function reactivate(id: string) {
    if (!token) return;
    await api(`/loyalty/programs/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ active: true }),
    });
    setMsg('Card reactivated');
    load();
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="mx-auto max-w-3xl">
        <MerchantSurface>
          <LoyaltyCardWizard
            mode={mode === 'edit' ? 'edit-card' : 'create-card'}
            initial={mode === 'edit' ? editing : null}
            defaults={{
              businessName: merchant?.businessName,
              logoUrl: merchant?.logoUrl || undefined,
            }}
            onComplete={async ({ program }) => {
              if (!token) throw new Error('Not signed in');
              if (mode === 'edit' && editing?.id) {
                await api(`/loyalty/programs/${editing.id}`, {
                  method: 'PATCH',
                  token,
                  body: JSON.stringify(program),
                });
                setMsg('Loyalty card updated');
              } else {
                await api('/loyalty/programs', {
                  method: 'POST',
                  token,
                  body: JSON.stringify(program),
                });
                setMsg('Loyalty card created');
              }
              load();
            }}
            onDone={() => {
              setMode('list');
              setEditing(null);
            }}
            onCancel={() => {
              setMode('list');
              setEditing(null);
            }}
          />
        </MerchantSurface>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <MerchantPageHeader
        title="Loyalty Programs"
        subtitle="Create, edit, and manage stamp cards. Contact on the back comes from Business Profile."
        action={
          essentialsOk ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setMode('create');
              }}
              className="rounded-full bg-[#FF5A5F] px-4 py-2.5 text-sm font-bold text-white"
            >
              Create loyalty card
            </button>
          ) : (
            <Link
              href="/dashboard/onboarding"
              className="rounded-full bg-[#FF5A5F] px-4 py-2.5 text-sm font-bold text-white"
            >
              Complete business profile
            </Link>
          )
        }
      />
      {msg && <p className="mb-4 text-sm font-semibold text-emerald-700">{msg}</p>}
      {!essentialsOk && (
        <MerchantSurface>
          <p className="text-sm text-[#8E8E93]">
            Add your business name, logo, phone, and city first — then create a stamp card.{' '}
            <Link href="/dashboard/onboarding" className="font-bold text-[#FF5A5F]">
              Continue setup →
            </Link>
          </p>
        </MerchantSurface>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {programs.map((p) => (
          <MerchantSurface key={p.id}>
            <StampCardPreview
              businessName={p.businessName || merchant?.businessName || p.title}
              categorySlug={p.categorySlug || undefined}
              categoryLabel={p.categorySlug ? categoryLabelFromSlug(p.categorySlug) : merchant?.category}
              logoUrl={p.logoUrl || merchant?.logoUrl || undefined}
              promoImageUrl={p.promoImageUrl || undefined}
              logoScale={p.logoScale ?? 1}
              logoOffsetX={p.logoOffsetX ?? 0}
              logoOffsetY={p.logoOffsetY ?? 0}
              logoPosX={p.logoPosX ?? 50}
              logoPosY={p.logoPosY ?? 32}
              tagline={merchant?.tagline || undefined}
              totalStamps={p.totalStamps}
              filledStamps={Math.min(3, p.totalStamps - 1)}
              rewardTitle={p.rewardTitle}
              rewardDescription={p.rewardDescription || undefined}
              stampColor={p.stampColor || undefined}
              emptyStampColor={p.emptyStampColor || undefined}
              accentColor={p.accentColor || undefined}
              fontStyle={p.fontStyle || undefined}
              doubleSided={p.doubleSided !== false}
              profile={merchant || undefined}
              expiryLabel={
                p.expiresAt
                  ? String(p.expiresAt).slice(0, 10)
                  : p.expiryDays
                    ? `${p.expiryDays} days`
                    : undefined
              }
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-extrabold">{p.title}</div>
                <div className="text-xs text-[#8E8E93]">
                  {p.cardType || 'CLASSIC'} · {p.active ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full bg-[#FFF1F2] px-3 py-1.5 text-xs font-bold text-[#1C1C1E]"
                  onClick={() => {
                    setEditing(p);
                    setMode('edit');
                  }}
                >
                  Edit
                </button>
                {p.active ? (
                  <button
                    type="button"
                    className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700"
                    onClick={() => deactivate(p.id)}
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
                    onClick={() => reactivate(p.id)}
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          </MerchantSurface>
        ))}
      </div>
      {!programs.length && (
        <MerchantSurface>
          <p className="py-8 text-center text-sm text-[#8E8E93]">No loyalty cards yet. Create your first stamp card.</p>
        </MerchantSurface>
      )}
    </div>
  );
}
