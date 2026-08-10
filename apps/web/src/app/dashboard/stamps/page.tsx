'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MerchantPageHeader, MerchantSurface } from '@/components/MerchantPage';

type Stamp = {
  id: string;
  saleAmount?: number | null;
  createdAt: string;
  customer: { name: string; email: string };
  program: { title: string };
  issuedBy: { name: string };
};

export default function MerchantStampsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Stamp[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api<Stamp[]>('/merchants/me/stamps', { token })
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [token]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      `${r.customer.name} ${r.program.title} ${r.issuedBy.name}`.toLowerCase().includes(s),
    );
  }, [rows, q]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <MerchantPageHeader title="Stamp Transactions" subtitle="Every stamp issued at your business." />
      {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}
      <MerchantSurface>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="mb-4 w-full rounded-xl border border-black/8 bg-[#F4F5F7] px-3 py-2.5 text-sm"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs uppercase tracking-wide text-[#8E8E93]">
                <th className="pb-3 pr-3 font-bold">Customer</th>
                <th className="pb-3 pr-3 font-bold">Program</th>
                <th className="pb-3 pr-3 font-bold">Issued by</th>
                <th className="pb-3 pr-3 font-bold">Sale</th>
                <th className="pb-3 font-bold">When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-black/4 last:border-0">
                  <td className="py-3.5 pr-3">
                    <div className="font-bold">{r.customer.name}</div>
                    <div className="text-xs text-[#8E8E93]">{r.customer.email}</div>
                  </td>
                  <td className="py-3.5 pr-3">{r.program.title}</td>
                  <td className="py-3.5 pr-3 text-[#8E8E93]">{r.issuedBy.name}</td>
                  <td className="py-3.5 pr-3 font-bold text-[#FF5A5F]">
                    {r.saleAmount != null ? `Rs. ${r.saleAmount}` : '—'}
                  </td>
                  <td className="py-3.5 text-[#8E8E93]">{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <p className="py-8 text-center text-sm text-[#8E8E93]">No stamps yet.</p>}
        </div>
      </MerchantSurface>
    </div>
  );
}
