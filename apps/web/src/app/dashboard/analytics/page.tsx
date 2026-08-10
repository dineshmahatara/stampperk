'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MerchantPageHeader, MerchantSurface } from '@/components/MerchantPage';

type Analytics = {
  stamps: { daily7: number; weekly30: number; monthly90: number };
  redemptionRate: number;
  activeMembers: number;
  newVsReturning: { new: number; returning: number; atRisk: number };
  topRewards: { title: string; count: number }[];
  topBranches: { id: string | null; name: string; stamps: number }[];
  staffPerformance: { id: string; name: string; stamps: number }[];
  campaignConversion: { id: string; title: string; views: number; clicks: number; ctr: number }[];
  couponRedemptions30: number;
  retentionProxy: number;
  loyaltyAttributedSpend30: number;
  stampSeries: { label: string; count: number }[];
};

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    api<Analytics>('/merchants/me/analytics', { token })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);

  useEffect(load, [load]);

  const maxSeries = Math.max(1, ...(data?.stampSeries.map((s) => s.count) || [1]));

  return (
    <div className="mx-auto max-w-[1400px]">
      <MerchantPageHeader
        title="Analytics"
        subtitle="Stamps, retention, staff, branches, and campaign conversion."
      />
      {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}
      {!data ? (
        <p className="text-sm text-[#8E8E93]">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Stamps (7d)', value: data.stamps.daily7 },
              { label: 'Stamps (30d)', value: data.stamps.weekly30 },
              { label: 'Redemption rate', value: `${data.redemptionRate}%` },
              { label: 'Active members', value: data.activeMembers },
              { label: 'Retention proxy', value: `${data.retentionProxy}%` },
              { label: 'Loyalty spend (30d)', value: Math.round(data.loyaltyAttributedSpend30) },
              { label: 'Coupon redeems (30d)', value: data.couponRedemptions30 },
              {
                label: 'New / Returning / At-risk',
                value: `${data.newVsReturning.new} / ${data.newVsReturning.returning} / ${data.newVsReturning.atRisk}`,
              },
            ].map((k) => (
              <MerchantSurface key={k.label}>
                <div className="text-xs font-bold uppercase tracking-wide text-[#8E8E93]">{k.label}</div>
                <div className="mt-1 text-2xl font-extrabold text-[#FF5A5F]">{k.value}</div>
              </MerchantSurface>
            ))}
          </div>

          <MerchantSurface>
            <h3 className="font-extrabold">Stamp volume (14 days)</h3>
            <div className="mt-4 flex h-36 items-end gap-1">
              {data.stampSeries.map((s) => (
                <div key={s.label} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-[#FF5A5F]"
                    style={{ height: `${Math.max(4, (s.count / maxSeries) * 100)}%` }}
                    title={`${s.label}: ${s.count}`}
                  />
                </div>
              ))}
            </div>
          </MerchantSurface>

          <div className="grid gap-4 lg:grid-cols-2">
            <MerchantSurface>
              <h3 className="mb-3 font-extrabold">Top rewards</h3>
              <ul className="space-y-2">
                {data.topRewards.map((r) => (
                  <li key={r.title} className="flex justify-between text-sm">
                    <span className="font-semibold">{r.title}</span>
                    <span className="font-bold text-[#FF5A5F]">{r.count}</span>
                  </li>
                ))}
                {!data.topRewards.length && <li className="text-sm text-[#8E8E93]">No redemptions yet.</li>}
              </ul>
            </MerchantSurface>
            <MerchantSurface>
              <h3 className="mb-3 font-extrabold">Top branches</h3>
              <ul className="space-y-2">
                {data.topBranches.map((b) => (
                  <li key={String(b.id)} className="flex justify-between text-sm">
                    <span className="font-semibold">{b.name}</span>
                    <span className="font-bold text-[#FF5A5F]">{b.stamps}</span>
                  </li>
                ))}
                {!data.topBranches.length && <li className="text-sm text-[#8E8E93]">No branch data.</li>}
              </ul>
            </MerchantSurface>
            <MerchantSurface>
              <h3 className="mb-3 font-extrabold">Staff performance</h3>
              <ul className="space-y-2">
                {data.staffPerformance.map((s) => (
                  <li key={s.id} className="flex justify-between text-sm">
                    <span className="font-semibold">{s.name}</span>
                    <span className="font-bold text-[#FF5A5F]">{s.stamps} stamps</span>
                  </li>
                ))}
                {!data.staffPerformance.length && <li className="text-sm text-[#8E8E93]">No staff stamps yet.</li>}
              </ul>
            </MerchantSurface>
            <MerchantSurface>
              <h3 className="mb-3 font-extrabold">Campaign conversion</h3>
              <ul className="space-y-2">
                {data.campaignConversion.map((c) => (
                  <li key={c.id} className="text-sm">
                    <div className="font-semibold">{c.title}</div>
                    <div className="text-xs text-[#8E8E93]">
                      {c.views} views · {c.clicks} clicks · CTR {c.ctr}%
                    </div>
                  </li>
                ))}
                {!data.campaignConversion.length && (
                  <li className="text-sm text-[#8E8E93]">No campaigns yet.</li>
                )}
              </ul>
            </MerchantSurface>
          </div>
        </div>
      )}
    </div>
  );
}
