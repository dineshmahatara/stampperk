'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MerchantPageHeader, MerchantSurface } from '@/components/MerchantPage';

type Reward = {
  id: string;
  rewardTitle: string;
  rewardDescription?: string | null;
  programTitle: string;
  totalStamps: number;
  active: boolean;
  cards: number;
};

export default function MerchantRewardsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Reward[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api<Reward[]>('/merchants/me/rewards', { token })
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [token]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <MerchantPageHeader title="Rewards" subtitle="Rewards unlocked from your loyalty programs." />
      {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <MerchantSurface key={r.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="font-extrabold">{r.rewardTitle}</div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  r.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {r.active ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#8E8E93]">
              {r.rewardDescription || `After ${r.totalStamps} stamps`}
            </p>
            <div className="mt-3 text-xs text-[#8E8E93]">
              {r.programTitle} · {r.cards} customers
            </div>
          </MerchantSurface>
        ))}
        {!rows.length && !error && (
          <p className="text-sm text-[#8E8E93]">No rewards yet — create a loyalty program first.</p>
        )}
      </div>
    </div>
  );
}
