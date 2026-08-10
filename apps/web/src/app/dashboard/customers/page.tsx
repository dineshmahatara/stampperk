'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MerchantPageHeader, MerchantSurface } from '@/components/MerchantPage';
import { EntityAvatar } from '@/components/EntityAvatar';

type Segment = 'ALL' | 'NEW' | 'RETURNING' | 'VIP' | 'AT_RISK';

type Row = {
  id: string;
  name: string;
  email: string;
  photoUrl?: string | null;
  stampCount: number;
  visitCount: number;
  availableRewards: number;
  programTitle: string;
  totalStamps: number;
  rewardTitle: string;
  spend: number;
  joinedAt: string;
  lastVisitAt?: string | null;
  dateOfBirth?: string | null;
  segment: Exclude<Segment, 'ALL'>;
};

const TABS: { id: Segment; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'NEW', label: 'New' },
  { id: 'RETURNING', label: 'Returning' },
  { id: 'VIP', label: 'VIP' },
  { id: 'AT_RISK', label: 'At-risk' },
];

const segmentStyle: Record<Exclude<Segment, 'ALL'>, string> = {
  NEW: 'bg-sky-50 text-sky-700',
  RETURNING: 'bg-emerald-50 text-emerald-700',
  VIP: 'bg-amber-50 text-amber-800',
  AT_RISK: 'bg-rose-50 text-rose-700',
};

function formatWhen(v?: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function MerchantCustomersPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Segment>('ALL');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api<Row[]>('/merchants/me/customers', { token })
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [token]);

  const counts = useMemo(() => {
    const c: Record<Segment, number> = {
      ALL: rows.length,
      NEW: 0,
      RETURNING: 0,
      VIP: 0,
      AT_RISK: 0,
    };
    for (const r of rows) c[r.segment] = (c[r.segment] || 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== 'ALL' && r.segment !== tab) return false;
      if (!s) return true;
      return `${r.name} ${r.email} ${r.programTitle} ${r.segment}`.toLowerCase().includes(s);
    });
  }, [rows, q, tab]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <MerchantPageHeader title="Customers" subtitle="CRM segments from visits, spend, and loyalty." />
      {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}
      <MerchantSurface>
        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                tab === t.id
                  ? 'bg-[#FF5A5F] text-white'
                  : 'bg-[#F4F5F7] text-[#8E8E93] hover:text-[#1C1C1E]'
              }`}
            >
              {t.label}
              <span className="ml-1.5 opacity-80">{counts[t.id]}</span>
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customers…"
          className="mb-4 w-full rounded-xl border border-black/8 bg-[#F4F5F7] px-3 py-2.5 text-sm"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs uppercase tracking-wide text-[#8E8E93]">
                <th className="pb-3 pr-3 font-bold">Customer</th>
                <th className="pb-3 pr-3 font-bold">Segment</th>
                <th className="pb-3 pr-3 font-bold">Program</th>
                <th className="pb-3 pr-3 font-bold">Stamps</th>
                <th className="pb-3 pr-3 font-bold">Visits</th>
                <th className="pb-3 pr-3 font-bold">Last visit</th>
                <th className="pb-3 pr-3 font-bold">Spend</th>
                <th className="pb-3 font-bold">Rewards ready</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-black/4 last:border-0">
                  <td className="py-3.5 pr-3">
                    <div className="flex items-center gap-3">
                      <EntityAvatar src={r.photoUrl} name={r.name} size="md" rounded="full" />
                      <div className="min-w-0">
                        <div className="font-bold">{r.name}</div>
                        <div className="truncate text-xs text-[#8E8E93]">{r.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 pr-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${segmentStyle[r.segment]}`}
                    >
                      {r.segment === 'AT_RISK' ? 'At-risk' : r.segment}
                    </span>
                  </td>
                  <td className="py-3.5 pr-3">{r.programTitle}</td>
                  <td className="py-3.5 pr-3 font-extrabold text-[#FF5A5F]">
                    {r.stampCount}/{r.totalStamps}
                  </td>
                  <td className="py-3.5 pr-3 font-bold">{r.visitCount}</td>
                  <td className="py-3.5 pr-3 text-[#8E8E93]">{formatWhen(r.lastVisitAt)}</td>
                  <td className="py-3.5 pr-3 font-bold">Rs. {Math.round(r.spend).toLocaleString()}</td>
                  <td className="py-3.5 font-bold text-emerald-600">{r.availableRewards}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <p className="py-8 text-center text-sm text-[#8E8E93]">No customers yet.</p>}
        </div>
      </MerchantSurface>
    </div>
  );
}
