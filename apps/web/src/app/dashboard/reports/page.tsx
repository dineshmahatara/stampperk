'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MerchantPageHeader, MerchantSurface } from '@/components/MerchantPage';

type ReportKey = 'customers' | 'stamps' | 'redemptions' | 'campaigns';

const REPORTS: { key: ReportKey; label: string; description: string }[] = [
  { key: 'customers', label: 'Customers', description: 'CRM segments, visits, and spend' },
  { key: 'stamps', label: 'Stamps', description: 'Stamp transactions in range' },
  { key: 'redemptions', label: 'Redemptions', description: 'Reward and coupon redemptions' },
  { key: 'campaigns', label: 'Campaigns', description: 'Campaign performance snapshot' },
];

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86400000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { token } = useAuth();
  const initial = useMemo(defaultRange, []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [busy, setBusy] = useState<ReportKey | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function download(key: ReportKey) {
    if (!token) return;
    setBusy(key);
    setError('');
    setMsg('');
    try {
      const qs = new URLSearchParams({ from, to }).toString();
      const res = await api<{ csv: string; count: number }>(`/merchants/me/reports/${key}?${qs}`, {
        token,
      });
      downloadCsv(`stampperk-${key}-${from}-to-${to}.csv`, res.csv);
      setMsg(`Downloaded ${res.count} ${key} row(s)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <MerchantPageHeader
        title="Reports"
        subtitle="Download CSV reports for your business performance."
      />
      {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}
      {msg && <p className="mb-4 text-sm font-semibold text-emerald-700">{msg}</p>}
      <MerchantSurface>
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
              From
            </span>
            <input
              type="date"
              className="w-full rounded-xl border border-black/8 px-3 py-2.5 text-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
              To
            </span>
            <input
              type="date"
              className="w-full rounded-xl border border-black/8 px-3 py-2.5 text-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {REPORTS.map((r) => (
            <button
              key={r.key}
              type="button"
              disabled={!!busy}
              onClick={() => download(r.key)}
              className="rounded-2xl border border-black/6 bg-[#F4F5F7] p-4 text-left transition hover:border-[#FF5A5F]/30 hover:bg-white disabled:opacity-60"
            >
              <div className="font-extrabold">{r.label}</div>
              <div className="mt-1 text-xs text-[#8E8E93]">{r.description}</div>
              <div className="mt-3 text-xs font-bold text-[#FF5A5F]">
                {busy === r.key ? 'Preparing…' : 'Download CSV'}
              </div>
            </button>
          ))}
        </div>
      </MerchantSurface>
    </div>
  );
}
