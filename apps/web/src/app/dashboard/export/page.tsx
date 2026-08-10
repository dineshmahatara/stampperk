'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MerchantPageHeader, MerchantSurface } from '@/components/MerchantPage';

type ExportKey = 'customers' | 'stamps' | 'redemptions' | 'campaigns';

const EXPORTS: { key: ExportKey; label: string; description: string }[] = [
  { key: 'customers', label: 'Export customers', description: 'Names, segments, visits, spend' },
  { key: 'stamps', label: 'Export stamps', description: 'Every stamp issued in the range' },
  {
    key: 'redemptions',
    label: 'Export redemptions',
    description: 'Reward and coupon redemptions',
  },
  { key: 'campaigns', label: 'Export campaigns', description: 'Campaign views and clicks' },
];

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 90 * 86400000);
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

export default function ExportPage() {
  const { token } = useAuth();
  const initial = useMemo(defaultRange, []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [busy, setBusy] = useState<ExportKey | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function runExport(key: ExportKey) {
    if (!token) return;
    setBusy(key);
    setError('');
    setMsg('');
    try {
      const qs = new URLSearchParams({ from, to }).toString();
      const res = await api<{ csv: string; count: number }>(`/merchants/me/reports/${key}?${qs}`, {
        token,
      });
      downloadCsv(`stampz-export-${key}-${from}-to-${to}.csv`, res.csv);
      setMsg(`Exported ${res.count} row(s)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <MerchantPageHeader
        title="Export Data"
        subtitle="Download customers, stamps, redemptions, and campaigns as CSV."
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
        <div className="space-y-3">
          {EXPORTS.map((item) => (
            <div
              key={item.key}
              className="flex flex-col gap-3 rounded-2xl border border-black/6 bg-[#F4F5F7] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-extrabold">{item.label}</div>
                <div className="mt-0.5 text-xs text-[#8E8E93]">{item.description}</div>
              </div>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => runExport(item.key)}
                className="rounded-full bg-[#FF5A5F] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy === item.key ? 'Exporting…' : 'Download CSV'}
              </button>
            </div>
          ))}
        </div>
      </MerchantSurface>
    </div>
  );
}
