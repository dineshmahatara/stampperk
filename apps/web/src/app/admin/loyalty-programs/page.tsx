'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  AdminEmpty,
  AdminError,
  AdminPageHeader,
  AdminSurface,
} from '@/components/AdminPage';
import { EntityAvatar } from '@/components/EntityAvatar';

type UiStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'DRAFT' | 'SCHEDULED';
type Perf = 'HIGH' | 'MEDIUM' | 'LOW' | 'SCHEDULED' | 'EXPIRED';

type ProgramRow = {
  id: string;
  title: string;
  description?: string | null;
  totalStamps: number;
  rewardTitle: string;
  active: boolean;
  cardType: string;
  typeLabel: string;
  campaignPreset?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  merchant: {
    id: string;
    businessName: string;
    slug: string;
    status: string;
    category?: string;
    logoUrl?: string | null;
  };
  members: number;
  stamps: number;
  redeemed: number;
  status: UiStatus;
  performance: Perf;
  sparkline: number[];
  tag?: string | null;
};

type Overview = {
  metrics: {
    totalPrograms: number;
    activePrograms: number;
    totalMembers: number;
    stampsCollected: number;
    rewardsRedeemed: number;
    trends: {
      totalPrograms: number;
      activePrograms: number;
      totalMembers: number;
      stampsCollected: number;
      rewardsRedeemed: number;
    };
  };
  tabCounts: {
    all: number;
    active: number;
    inactive: number;
    draft: number;
    scheduled: number;
    expired: number;
  };
  performance: { key: string; name: string; value: number; color: string }[];
  topByMembers: { id: string; title: string; merchant: string; members: number }[];
  insight: { message: string; href: string };
  merchants: { id: string; businessName: string; slug: string }[];
  programs: ProgramRow[];
};

type TabId = 'all' | 'active' | 'inactive' | 'draft' | 'scheduled' | 'expired';

function Trend({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`text-xs font-bold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? '▲' : '▼'} {up ? '+' : ''}
      {value}%
    </span>
  );
}

function StatCard({
  label,
  value,
  trend,
  iconBg,
  icon,
}: {
  label: string;
  value: string;
  trend: number;
  iconBg: string;
  icon: React.ReactNode;
}) {
  return (
    <AdminSurface className="!p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>{icon}</div>
      <div className="mt-3 text-xs font-bold uppercase tracking-wide text-[#8E8E93]">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="text-2xl font-extrabold tracking-tight">{value}</div>
        <Trend value={trend} />
      </div>
    </AdminSurface>
  );
}

function StatusDot({ status }: { status: UiStatus }) {
  const map: Record<UiStatus, { label: string; className: string }> = {
    ACTIVE: { label: 'Active', className: 'text-emerald-700' },
    INACTIVE: { label: 'Inactive', className: 'text-slate-500' },
    DRAFT: { label: 'Draft', className: 'text-amber-700' },
    SCHEDULED: { label: 'Scheduled', className: 'text-sky-700' },
    EXPIRED: { label: 'Expired', className: 'text-red-600' },
  };
  const dot: Record<UiStatus, string> = {
    ACTIVE: 'bg-emerald-500',
    INACTIVE: 'bg-slate-400',
    DRAFT: 'bg-amber-400',
    SCHEDULED: 'bg-sky-500',
    EXPIRED: 'bg-red-500',
  };
  const m = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${m.className}`}>
      <span className={`h-2 w-2 rounded-full ${dot[status]}`} />
      {m.label}
    </span>
  );
}

function TypeBadge({ label }: { label: string }) {
  const colors: Record<string, string> = {
    'Stamp Card': 'bg-[#FFF0F1] text-[#FF5A5F] ring-[#FFD6DA]',
    'Points Based': 'bg-violet-50 text-violet-700 ring-violet-100',
    Tiered: 'bg-sky-50 text-sky-700 ring-sky-100',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${
        colors[label] || 'bg-slate-50 text-slate-600 ring-slate-100'
      }`}
    >
      {label}
    </span>
  );
}

function Sparkline({ values, tone }: { values: number[]; tone: Perf }) {
  const max = Math.max(...values, 1);
  const w = 72;
  const h = 28;
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const y = h - (v / max) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');
  const stroke =
    tone === 'HIGH' ? '#10B981' : tone === 'MEDIUM' ? '#F59E0B' : tone === 'LOW' ? '#EF4444' : '#3B82F6';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function num(n: number) {
  return n.toLocaleString();
}

export default function AdminLoyaltyProgramsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [tab, setTab] = useState<TabId>('all');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [merchantFilter, setMerchantFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    merchantId: '',
    title: '',
    rewardTitle: '',
    totalStamps: 10,
    cardType: 'CLASSIC',
    description: '',
  });

  function load() {
    if (!token) return;
    setLoading(true);
    api<Overview>('/admin/loyalty-programs-overview', { token })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load programs'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  async function toggle(id: string, active: boolean) {
    if (!token) return;
    setMenuId(null);
    await api(`/admin/loyalty-programs/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ active }),
    });
    setMsg(active ? 'Program activated' : 'Program paused');
    load();
  }

  async function createProgram(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setError('');
    try {
      await api('/admin/loyalty-programs', {
        method: 'POST',
        token,
        body: JSON.stringify(form),
      });
      setMsg('Program created');
      setCreateOpen(false);
      setForm({
        merchantId: '',
        title: '',
        rewardTitle: '',
        totalStamps: 10,
        cardType: 'CLASSIC',
        description: '',
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  const rows = data?.programs || [];

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab === 'active' && r.status !== 'ACTIVE') return false;
      if (tab === 'inactive' && r.status !== 'INACTIVE') return false;
      if (tab === 'draft' && r.status !== 'DRAFT') return false;
      if (tab === 'scheduled' && r.status !== 'SCHEDULED') return false;
      if (tab === 'expired' && r.status !== 'EXPIRED') return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (merchantFilter !== 'ALL' && r.merchant.id !== merchantFilter) return false;
      if (typeFilter !== 'ALL' && r.typeLabel !== typeFilter) return false;
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return `${r.title} ${r.rewardTitle} ${r.merchant.businessName} ${r.id}`
        .toLowerCase()
        .includes(s);
    });
  }, [rows, tab, q, statusFilter, merchantFilter, typeFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, pageCount);
  const pageRows = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  useEffect(() => {
    setPage(1);
  }, [tab, q, statusFilter, merchantFilter, typeFilter, pageSize]);

  const m = data?.metrics;
  const counts = data?.tabCounts;
  const rangeLabel = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  }, []);

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'all', label: 'All Programs', count: counts?.all ?? 0 },
    { id: 'active', label: 'Active', count: counts?.active ?? 0 },
    { id: 'inactive', label: 'Inactive', count: counts?.inactive ?? 0 },
    { id: 'draft', label: 'Draft', count: counts?.draft ?? 0 },
    { id: 'scheduled', label: 'Scheduled', count: counts?.scheduled ?? 0 },
    { id: 'expired', label: 'Expired', count: counts?.expired ?? 0 },
  ];

  function exportCsv() {
    const header = [
      'Program',
      'Merchant',
      'Type',
      'Stamps',
      'Reward',
      'Members',
      'Status',
      'Performance',
    ];
    const lines = filtered.map((r) =>
      [
        r.title,
        r.merchant.businessName,
        r.typeLabel,
        r.totalStamps,
        r.rewardTitle,
        r.members,
        r.status,
        r.performance,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'loyalty-programs.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const perfTotal = (data?.performance || []).reduce((s, p) => s + p.value, 0) || 1;

  return (
    <div className="mx-auto max-w-[1500px]">
      <AdminPageHeader
        title="Loyalty Programs"
        subtitle="Create and manage stamp based loyalty programs across all merchants."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-xl border border-black/8 bg-white px-3 py-2.5 text-sm font-bold"
            >
              Export
            </button>
            <div className="rounded-xl border border-black/8 bg-white px-3 py-2.5 text-sm font-semibold text-[#636366]">
              {rangeLabel}
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-xl bg-[#FF5A5F] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(255,90,95,0.28)]"
            >
              + Create New Program
            </button>
          </div>
        }
      />

      <AdminError message={error} />
      {msg && (
        <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {msg}
        </p>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Programs"
          value={loading && !data ? '…' : num(m?.totalPrograms ?? 0)}
          trend={m?.trends.totalPrograms ?? 0}
          iconBg="bg-violet-50 text-violet-600"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 10h18" />
            </svg>
          }
        />
        <StatCard
          label="Active Programs"
          value={num(m?.activePrograms ?? 0)}
          trend={m?.trends.activePrograms ?? 0}
          iconBg="bg-emerald-50 text-emerald-600"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          }
        />
        <StatCard
          label="Total Members"
          value={num(m?.totalMembers ?? 0)}
          trend={m?.trends.totalMembers ?? 0}
          iconBg="bg-orange-50 text-orange-600"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="8" r="3.5" />
              <path d="M3.5 19a5.5 5.5 0 0111 0" />
            </svg>
          }
        />
        <StatCard
          label="Stamps Collected"
          value={num(m?.stampsCollected ?? 0)}
          trend={m?.trends.stampsCollected ?? 0}
          iconBg="bg-sky-50 text-sky-600"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M8 14h8l1 6H7l1-6z" />
            </svg>
          }
        />
        <StatCard
          label="Rewards Redeemed"
          value={num(m?.rewardsRedeemed ?? 0)}
          trend={m?.trends.rewardsRedeemed ?? 0}
          iconBg="bg-[#FFF0F1] text-[#FF5A5F]"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="10" width="18" height="11" rx="1.5" />
              <path d="M12 10v11M3 14h18" />
            </svg>
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.85fr)]">
        <AdminSurface className="!p-0 overflow-hidden">
          <div className="flex gap-1 overflow-x-auto border-b border-black/5 px-3 pt-3">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap rounded-t-xl px-3 py-2.5 text-sm font-bold transition ${
                  tab === t.id
                    ? 'bg-white text-[#FF5A5F] shadow-[0_-1px_0_#fff] ring-1 ring-black/5'
                    : 'text-[#8E8E93] hover:text-[#1C1C1E]'
                }`}
              >
                {t.label}
                <span className="ml-1.5 text-xs font-extrabold opacity-70">({t.count})</span>
              </button>
            ))}
          </div>

          <div className="p-4">
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]">
                  ⌕
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search programs, merchants…"
                  className="w-full rounded-xl border border-black/8 bg-[#F8F8FA] py-2.5 pl-9 pr-3 text-sm outline-none ring-[#FF5A5F]/20 focus:bg-white focus:ring-2"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-black/8 bg-white px-3 py-2.5 text-sm font-semibold"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="EXPIRED">Expired</option>
              </select>
              <select
                value={merchantFilter}
                onChange={(e) => setMerchantFilter(e.target.value)}
                className="rounded-xl border border-black/8 bg-white px-3 py-2.5 text-sm font-semibold"
              >
                <option value="ALL">All Merchants</option>
                {(data?.merchants || []).map((mrow) => (
                  <option key={mrow.id} value={mrow.id}>
                    {mrow.businessName}
                  </option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-black/8 bg-white px-3 py-2.5 text-sm font-semibold"
              >
                <option value="ALL">All Program Types</option>
                <option value="Stamp Card">Stamp Card</option>
                <option value="Points Based">Points Based</option>
                <option value="Tiered">Tiered</option>
              </select>
            </div>

            <div className="overflow-x-auto rounded-xl border border-black/5">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#F8F8FA] text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
                  <tr>
                    <th className="px-4 py-3">Program</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Stamps / Reward</th>
                    <th className="px-4 py-3">Members</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Performance</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((p) => (
                    <tr key={p.id} className="border-t border-black/5 hover:bg-[#FFF8F7]/70">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <EntityAvatar
                            src={p.merchant.logoUrl}
                            name={p.merchant.businessName}
                            size="md"
                            rounded="xl"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold">{p.title}</span>
                              {p.tag && (
                                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                                  {p.tag}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-xs font-semibold text-[#8E8E93]">
                              {p.merchant.businessName}
                            </div>
                            <div className="text-[11px] text-[#AEAEB2]">ID: {p.id.slice(0, 10)}…</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge label={p.typeLabel} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold">{p.totalStamps} Stamps</div>
                        <div className="text-xs text-[#8E8E93]">→ {p.rewardTitle}</div>
                      </td>
                      <td className="px-4 py-3 font-extrabold">{num(p.members)}</td>
                      <td className="px-4 py-3">
                        <StatusDot status={p.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Sparkline values={p.sparkline} tone={p.performance} />
                      </td>
                      <td className="relative px-4 py-3 text-right">
                        <button
                          type="button"
                          className="rounded-lg px-2 py-1 text-lg font-bold text-[#8E8E93] hover:bg-black/5"
                          onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                          aria-label="Actions"
                        >
                          ⋯
                        </button>
                        {menuId === p.id && (
                          <div className="absolute right-4 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-black/8 bg-white py-1 text-left shadow-lg">
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                              onClick={() => toggle(p.id, true)}
                            >
                              Activate
                            </button>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-xs font-bold text-amber-700 hover:bg-amber-50"
                              onClick={() => toggle(p.id, false)}
                            >
                              Pause
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!pageRows.length && (
                    <tr>
                      <td colSpan={7}>
                        <AdminEmpty message="No loyalty programs match these filters." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-[#8E8E93]">
                Showing {(pageSafe - 1) * pageSize + (filtered.length ? 1 : 0)} to{' '}
                {Math.min(pageSafe * pageSize, filtered.length)} of {filtered.length} results
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={pageSafe <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-black/8 px-2.5 py-1.5 text-xs font-bold disabled:opacity-40"
                >
                  ‹
                </button>
                {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
                  const n = i + 1;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={`h-8 w-8 rounded-lg text-xs font-bold ${
                        pageSafe === n ? 'bg-[#FF5A5F] text-white' : 'border border-black/8 bg-white'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={pageSafe >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  className="rounded-lg border border-black/8 px-2.5 py-1.5 text-xs font-bold disabled:opacity-40"
                >
                  ›
                </button>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-lg border border-black/8 px-2 py-1.5 text-xs font-bold"
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>
          </div>
        </AdminSurface>

        <div className="space-y-4">
          <AdminSurface>
            <h2 className="text-sm font-extrabold">Program Performance</h2>
            <div className="relative mx-auto mt-2 h-52 w-full max-w-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.performance || []}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {(data?.performance || []).map((d) => (
                      <Cell key={d.key} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [String(value ?? 0), 'Programs']}
                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-extrabold">{m?.totalPrograms ?? 0}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#8E8E93]">
                  Total
                </div>
              </div>
            </div>
            <div className="mt-2 space-y-1.5">
              {(data?.performance || []).map((d) => (
                <div key={d.key} className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2 text-[#636366]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className="font-extrabold">
                    {d.value} · {Math.round((d.value / perfTotal) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </AdminSurface>

          <AdminSurface>
            <h2 className="mb-3 text-sm font-extrabold">Top Programs by Members</h2>
            <div className="space-y-2.5">
              {(data?.topByMembers || []).map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-bold">
                      {idx + 1}. {p.title}
                    </div>
                    <div className="truncate text-xs text-[#8E8E93]">{p.merchant}</div>
                  </div>
                  <div className="shrink-0 font-extrabold text-[#FF5A5F]">{num(p.members)}</div>
                </div>
              ))}
              {!data?.topByMembers?.length && (
                <p className="text-sm text-[#8E8E93]">No member data yet.</p>
              )}
            </div>
          </AdminSurface>

          <AdminSurface className="bg-gradient-to-br from-[#FFF8F7] to-white">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F1] text-lg">
                💡
              </div>
              <div>
                <h2 className="text-sm font-extrabold">Program Insights</h2>
                <p className="mt-1 text-sm text-[#636366]">
                  {data?.insight.message || 'Collecting insight from recent stamp activity…'}
                </p>
                <Link
                  href={data?.insight.href || '/admin/analytics'}
                  className="mt-3 inline-flex rounded-full bg-[#FF5A5F] px-3.5 py-1.5 text-xs font-bold text-white"
                >
                  View Analytics
                </Link>
              </div>
            </div>
          </AdminSurface>
        </div>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={createProgram}
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Create New Program</h2>
              <button type="button" className="text-[#8E8E93]" onClick={() => setCreateOpen(false)}>
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Merchant</span>
                <select
                  required
                  value={form.merchantId}
                  onChange={(e) => setForm((f) => ({ ...f, merchantId: e.target.value }))}
                  className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm font-semibold"
                >
                  <option value="">Select merchant…</option>
                  {(data?.merchants || []).map((mrow) => (
                    <option key={mrow.id} value={mrow.id}>
                      {mrow.businessName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">
                  Program title
                </span>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm font-semibold"
                  placeholder="Buy 9 Get 1 Free Coffee"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Reward</span>
                <input
                  required
                  value={form.rewardTitle}
                  onChange={(e) => setForm((f) => ({ ...f, rewardTitle: e.target.value }))}
                  className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm font-semibold"
                  placeholder="Free Coffee"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">
                    Total stamps
                  </span>
                  <input
                    type="number"
                    min={3}
                    max={30}
                    value={form.totalStamps}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, totalStamps: Number(e.target.value) || 10 }))
                    }
                    className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm font-semibold"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Type</span>
                  <select
                    value={form.cardType}
                    onChange={(e) => setForm((f) => ({ ...f, cardType: e.target.value }))}
                    className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm font-semibold"
                  >
                    <option value="CLASSIC">Stamp Card</option>
                    <option value="THRESHOLD">Points Based</option>
                    <option value="MULTI_STEP">Tiered</option>
                  </select>
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">
                  Description
                </span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm font-semibold"
                  rows={2}
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-black/8 px-4 py-2 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-[#FF5A5F] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {creating ? 'Creating…' : 'Create Program'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
