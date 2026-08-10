'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MerchantPageHeader, MerchantSurface } from '@/components/MerchantPage';

type Row = {
  id: string;
  rewardTitle: string;
  estimatedSavings?: number | null;
  createdAt: string;
  customer: { name: string; email: string };
};

export default function MerchantRedemptionsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api<Row[]>('/merchants/me/redemptions', { token })
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [token]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <MerchantPageHeader title="Redemptions" subtitle="Rewards claimed by your customers." />
      {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}
      <MerchantSurface>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs uppercase tracking-wide text-[#8E8E93]">
                <th className="pb-3 pr-3 font-bold">Reward</th>
                <th className="pb-3 pr-3 font-bold">Customer</th>
                <th className="pb-3 pr-3 font-bold">Savings</th>
                <th className="pb-3 font-bold">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-black/4 last:border-0">
                  <td className="py-3.5 pr-3 font-bold">{r.rewardTitle}</td>
                  <td className="py-3.5 pr-3">
                    <div className="font-semibold">{r.customer.name}</div>
                    <div className="text-xs text-[#8E8E93]">{r.customer.email}</div>
                  </td>
                  <td className="py-3.5 pr-3 font-bold text-[#FF5A5F]">
                    {(r.estimatedSavings ?? 0).toLocaleString()}
                  </td>
                  <td className="py-3.5 text-[#8E8E93]">{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && !error && (
            <p className="py-8 text-center text-sm text-[#8E8E93]">No redemptions yet.</p>
          )}
        </div>
      </MerchantSurface>
    </div>
  );
}
