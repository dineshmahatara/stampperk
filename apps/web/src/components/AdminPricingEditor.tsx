'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

type RegionRow = {
  regionCode: string;
  currency: string;
  label: string;
  monthlyAmount: number;
  yearlyAmount: number;
  yearlyWasAmount: number;
  trialDays: number;
};

type PlanRow = {
  planId: string;
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

type Catalog = {
  regions: RegionRow[];
  plans: PlanRow[];
  note?: string;
};

const REGION_ORDER = ['US', 'AU', 'NP', 'IN', 'EU', 'CN'];
const LIMIT_FIELDS: { key: keyof PlanRow; label: string }[] = [
  { key: 'businesses', label: 'Businesses' },
  { key: 'loyaltyCards', label: 'Loyalty cards' },
  { key: 'stampsPerMonth', label: 'Stamps / month' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'branches', label: 'Branches' },
  { key: 'galleryPhotos', label: 'Gallery photos' },
  { key: 'staff', label: 'Staff' },
];

type Props = {
  token: string;
  onMessage?: (msg: string) => void;
  onError?: (msg: string) => void;
};

export function AdminPricingEditor({ token, onMessage, onError }: Props) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [regionCode, setRegionCode] = useState('US');
  const [planId, setPlanId] = useState('MONTHLY');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api<Catalog>('/admin/pricing', { token })
      .then((c) => {
        setCatalog(c);
        if (c.regions?.length && !c.regions.find((r) => r.regionCode === regionCode)) {
          setRegionCode(c.regions[0].regionCode);
        }
      })
      .catch((e) => onError?.(e instanceof Error ? e.message : 'Failed to load pricing'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  const regionsSorted = useMemo(() => {
    const list = catalog?.regions || [];
    return [...list].sort((a, b) => {
      const ai = REGION_ORDER.indexOf(a.regionCode);
      const bi = REGION_ORDER.indexOf(b.regionCode);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
  }, [catalog]);

  const region = regionsSorted.find((r) => r.regionCode === regionCode) || regionsSorted[0];
  const plan = (catalog?.plans || []).find((p) => p.planId === planId) || catalog?.plans?.[0];

  function patchRegion(patch: Partial<RegionRow>) {
    if (!catalog || !region) return;
    setCatalog({
      ...catalog,
      regions: catalog.regions.map((r) =>
        r.regionCode === region.regionCode ? { ...r, ...patch } : r,
      ),
    });
  }

  function patchPlan(patch: Partial<PlanRow>) {
    if (!catalog || !plan) return;
    setCatalog({
      ...catalog,
      plans: catalog.plans.map((p) => (p.planId === plan.planId ? { ...p, ...patch } : p)),
    });
  }

  async function save() {
    if (!token || !catalog) return;
    setSaving(true);
    try {
      const saved = await api<Catalog>('/admin/pricing', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          regions: catalog.regions,
          plans: catalog.plans,
        }),
      });
      setCatalog(saved);
      onMessage?.(saved.note || 'Pricing catalog saved');
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading && !catalog) {
    return <p className="p-4 text-sm font-semibold text-[#8E8E93]">Loading pricing CMS…</p>;
  }
  if (!catalog || !region || !plan) {
    return <p className="p-4 text-sm font-semibold text-red-600">Pricing catalog unavailable.</p>;
  }

  return (
    <div className="space-y-6 p-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
        List prices &amp; features edit here for all markets. Stripe charges still use{' '}
        <code className="rounded bg-white/80 px-1">STRIPE_PRICE_*</code> env IDs — keep them in sync
        when amounts change.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-extrabold">Region prices</h3>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-[#FF5A5F] px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save all changes'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {regionsSorted.map((r) => (
          <button
            key={r.regionCode}
            type="button"
            onClick={() => setRegionCode(r.regionCode)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
              region.regionCode === r.regionCode
                ? 'border-[#FF5A5F] bg-[#FFF0F1] text-[#FF5A5F]'
                : 'border-black/10 text-[#636366]'
            }`}
          >
            {r.regionCode} · {r.currency}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ['monthlyAmount', 'Monthly'],
            ['yearlyAmount', 'Yearly'],
            ['yearlyWasAmount', 'Yearly was'],
            ['trialDays', 'Trial days'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-xs font-bold text-[#8E8E93]">
            {label} ({region.currency})
            <input
              type="number"
              step={key === 'trialDays' ? 1 : 0.01}
              value={region[key]}
              onChange={(e) =>
                patchRegion({
                  [key]: key === 'trialDays' ? Number(e.target.value) : Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-[#1C1C1E]"
            />
          </label>
        ))}
      </div>

      <h3 className="text-base font-extrabold">Plan copy &amp; limits</h3>
      <div className="flex flex-wrap gap-2">
        {catalog.plans.map((p) => (
          <button
            key={p.planId}
            type="button"
            onClick={() => setPlanId(p.planId)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
              plan.planId === p.planId
                ? 'border-[#FF5A5F] bg-[#FFF0F1] text-[#FF5A5F]'
                : 'border-black/10 text-[#636366]'
            }`}
          >
            {p.displayName} ({p.planId})
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(
          [
            ['displayName', 'Display name'],
            ['label', 'Label'],
            ['title', 'Title'],
            ['cta', 'CTA'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-xs font-bold text-[#8E8E93]">
            {label}
            <input
              value={String(plan[key] ?? '')}
              onChange={(e) => patchPlan({ [key]: e.target.value })}
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-[#1C1C1E]"
            />
          </label>
        ))}
        <label className="block text-xs font-bold text-[#8E8E93] md:col-span-2">
          Description
          <textarea
            value={plan.description}
            onChange={(e) => patchPlan({ description: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-[#1C1C1E]"
          />
        </label>
        <label className="block text-xs font-bold text-[#8E8E93] md:col-span-2">
          Features (one per line)
          <textarea
            value={(plan.features || []).join('\n')}
            onChange={(e) =>
              patchPlan({
                features: e.target.value
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            rows={5}
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-[#1C1C1E]"
          />
        </label>
        <label className="block text-xs font-bold text-[#8E8E93]">
          Price note
          <input
            value={plan.priceNote || ''}
            onChange={(e) => patchPlan({ priceNote: e.target.value || null })}
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-[#1C1C1E]"
          />
        </label>
        <label className="block text-xs font-bold text-[#8E8E93]">
          Footer
          <input
            value={plan.footer || ''}
            onChange={(e) => patchPlan({ footer: e.target.value || null })}
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-[#1C1C1E]"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LIMIT_FIELDS.map(({ key, label }) => (
          <label key={key} className="block text-xs font-bold text-[#8E8E93]">
            {label}
            <input
              type="number"
              min={0}
              value={Number(plan[key])}
              onChange={(e) => patchPlan({ [key]: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-[#1C1C1E]"
            />
          </label>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-[#FF5A5F] px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save all changes'}
        </button>
      </div>
    </div>
  );
}
