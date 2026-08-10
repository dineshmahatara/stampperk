'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  AdminEmpty,
  AdminError,
  AdminPageHeader,
  AdminSurface,
  StatusBadge,
  fmtDate,
} from '@/components/AdminPage';
import { EntityAvatar } from '@/components/EntityAvatar';
import { AdminPricingEditor } from '@/components/AdminPricingEditor';

type PlanId = 'FREE' | 'MONTHLY' | 'YEARLY';

type SubRow = {
  id: string;
  plan: PlanId;
  status: string;
  provider?: string;
  currentPeriodEnd?: string | null;
  createdAt: string;
  updatedAt: string;
  merchant?: {
    id?: string;
    businessName?: string;
    slug?: string;
    logoUrl?: string | null;
    status?: string;
    country?: string;
  };
};

type PlanDef = {
  id: PlanId;
  name: string;
  cycle: string;
  price: number;
  description: string;
  limits: { businesses: number; loyaltyCards: number; campaigns: number; branches: number };
};

type BillingOverview = {
  currency: string;
  prices: Record<PlanId, number>;
  metrics: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    mrr: number;
    yrr: number;
    cancelledThisMonth: number;
    trends: {
      totalSubscriptions: number;
      activeSubscriptions: number;
      mrr: number;
      yrr: number;
      cancelledThisMonth: number;
    };
  };
  planCounts: Record<string, number>;
  planRevenue: Record<string, number>;
  revenueTrend: { label: string; revenue: number }[];
  totals: { totalRevenue: number; averageRevenue: number };
  subscriptions: SubRow[];
  plans: PlanDef[];
};

type TabId = 'subscriptions' | 'plans' | 'payments' | 'invoices' | 'coupons' | 'settings';

type InvoiceAdminRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description?: string | null;
  paidAt?: string | null;
  createdAt: string;
  pdfUrl?: string | null;
  merchant?: {
    id?: string;
    businessName?: string;
    slug?: string;
    logoUrl?: string | null;
  };
  subscription?: {
    id?: string;
    plan?: PlanId;
    status?: string;
  };
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'plans', label: 'Plans' },
  { id: 'payments', label: 'Payments' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'settings', label: 'Billing Settings' },
];

const PLAN_META: Record<
  PlanId,
  { label: string; badge: string; cycle: string }
> = {
  FREE: {
    label: 'Starter',
    badge: 'bg-sky-50 text-sky-700 ring-sky-100',
    cycle: '—',
  },
  MONTHLY: {
    label: 'Pro Monthly',
    badge: 'bg-[#FFF0F1] text-[#FF5A5F] ring-[#FFD6DA]',
    cycle: 'Monthly',
  },
  YEARLY: {
    label: 'Business Yearly',
    badge: 'bg-violet-50 text-violet-700 ring-violet-100',
    cycle: 'Yearly',
  },
};

const DONUT_COLORS: Record<string, string> = {
  MONTHLY: '#FF5A5F',
  YEARLY: '#8B5CF6',
  FREE: '#38BDF8',
  CANCELED: '#94A3B8',
};

function money(n: number, currency = 'NPR') {
  try {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

function Trend({ value, invert }: { value: number; invert?: boolean }) {
  const up = value >= 0;
  const good = invert ? !up : up;
  return (
    <span className={`text-xs font-bold ${good ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? '+' : ''}
      {value}% vs last 30 days
    </span>
  );
}

function StatCard({
  label,
  value,
  trend,
  invertTrend,
  icon,
}: {
  label: string;
  value: string;
  trend: number;
  invertTrend?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <AdminSurface className="!p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0F1] text-[#FF5A5F]">
          {icon}
        </div>
      </div>
      <div className="mt-3 text-xs font-bold uppercase tracking-wide text-[#8E8E93]">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="mt-1">
        <Trend value={trend} invert={invertTrend} />
      </div>
    </AdminSurface>
  );
}

function PlanBadge({ plan }: { plan: PlanId }) {
  const meta = PLAN_META[plan] || PLAN_META.FREE;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${meta.badge}`}>
      {meta.label}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-100">
        Active
      </span>
    );
  }
  if (status === 'TRIALING') {
    return (
      <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700 ring-1 ring-inset ring-teal-100">
        Trialing
      </span>
    );
  }
  if (status === 'PAST_DUE') {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-100">
        Paused
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 ring-1 ring-inset ring-red-100">
      Cancelled
    </span>
  );
}

export default function AdminSubscriptionsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<BillingOverview | null>(null);
  const [invoices, setInvoices] = useState<InvoiceAdminRow[]>([]);
  const [tab, setTab] = useState<TabId>('subscriptions');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [cycleFilter, setCycleFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    if (!token) return;
    setLoading(true);
    api<BillingOverview>('/admin/billing-overview', { token })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load billing'))
      .finally(() => setLoading(false));
    api<InvoiceAdminRow[]>('/admin/invoices', { token })
      .then(setInvoices)
      .catch(() => setInvoices([]));
  }

  useEffect(load, [token]);

  async function patch(id: string, body: { plan?: string; status?: string }) {
    if (!token) return;
    setMenuId(null);
    await api(`/admin/subscriptions/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    });
    setMsg('Subscription updated');
    load();
  }

  const rows = data?.subscriptions || [];
  const prices = data?.prices || { FREE: 0, MONTHLY: 699, YEARLY: 4999 };
  const currency = data?.currency || 'NPR';

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PAUSED' && r.status !== 'PAST_DUE') return false;
        if (statusFilter === 'CANCELLED' && r.status !== 'CANCELED') return false;
        if (statusFilter === 'ACTIVE' && r.status !== 'ACTIVE' && r.status !== 'TRIALING') return false;
      }
      if (planFilter !== 'ALL' && r.plan !== planFilter) return false;
      if (cycleFilter === 'Monthly' && r.plan !== 'MONTHLY') return false;
      if (cycleFilter === 'Yearly' && r.plan !== 'YEARLY') return false;
      if (cycleFilter === 'None' && r.plan !== 'FREE') return false;
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return `${r.merchant?.businessName || ''} ${r.merchant?.slug || ''} ${r.plan} ${r.status} ${r.id}`
        .toLowerCase()
        .includes(s);
    });
  }, [rows, q, statusFilter, planFilter, cycleFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, pageCount);
  const pageRows = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  useEffect(() => {
    setPage(1);
  }, [q, statusFilter, planFilter, cycleFilter, pageSize]);

  const donutData = useMemo(() => {
    const counts = data?.planCounts || {};
    return [
      { key: 'MONTHLY', name: 'Pro Monthly', value: counts.MONTHLY || 0 },
      { key: 'YEARLY', name: 'Business Yearly', value: counts.YEARLY || 0 },
      { key: 'FREE', name: 'Starter', value: counts.FREE || 0 },
      { key: 'CANCELED', name: 'Cancelled', value: counts.CANCELED || 0 },
    ].filter((d) => d.value > 0);
  }, [data]);

  const topPlans = useMemo(() => {
    const rev = data?.planRevenue || {};
    const total = (rev.YEARLY || 0) + (rev.MONTHLY || 0) || 1;
    return [
      {
        name: 'Business Yearly',
        amount: rev.YEARLY || 0,
        pct: Math.round(((rev.YEARLY || 0) / total) * 1000) / 10,
        color: '#8B5CF6',
      },
      {
        name: 'Pro Monthly',
        amount: rev.MONTHLY || 0,
        pct: Math.round(((rev.MONTHLY || 0) / total) * 1000) / 10,
        color: '#FF5A5F',
      },
      { name: 'Starter', amount: 0, pct: 0, color: '#38BDF8' },
    ];
  }, [data]);

  const m = data?.metrics;
  const rangeLabel = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  }, []);

  function amountFor(plan: PlanId) {
    return prices[plan] ?? 0;
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <AdminPageHeader
        title="Plans & Billing"
        subtitle="Manage subscription plans, billing and merchant subscriptions."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-black/8 bg-white px-3 py-2 text-sm font-semibold text-[#636366]">
              {rangeLabel}
            </div>
            <button
              type="button"
              onClick={() => setTab('plans')}
              className="rounded-xl bg-[#FF5A5F] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(255,90,95,0.28)]"
            >
              Edit Pricing CMS
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
          label="Total Subscriptions"
          value={String(m?.totalSubscriptions ?? (loading ? '…' : 0))}
          trend={m?.trends.totalSubscriptions ?? 0}
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          }
        />
        <StatCard
          label="Active Subscriptions"
          value={String(m?.activeSubscriptions ?? 0)}
          trend={m?.trends.activeSubscriptions ?? 0}
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          }
        />
        <StatCard
          label="Monthly Recurring Revenue"
          value={money(m?.mrr ?? 0, currency)}
          trend={m?.trends.mrr ?? 0}
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v18M17 8H9.5a2.5 2.5 0 000 5H14a2.5 2.5 0 010 5H6" />
            </svg>
          }
        />
        <StatCard
          label="Yearly Recurring Revenue"
          value={money(m?.yrr ?? 0, currency)}
          trend={m?.trends.yrr ?? 0}
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 10h18" />
            </svg>
          }
        />
        <StatCard
          label="Cancelled This Month"
          value={String(m?.cancelledThisMonth ?? 0)}
          trend={m?.trends.cancelledThisMonth ?? 0}
          invertTrend
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M8 12h8" />
            </svg>
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.85fr)]">
        <AdminSurface className="!p-0 overflow-hidden">
          <div className="flex gap-1 overflow-x-auto border-b border-black/5 px-3 pt-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap rounded-t-xl px-3 py-2.5 text-sm font-bold transition ${
                  tab === t.id
                    ? 'bg-white text-[#FF5A5F] shadow-[0_-1px_0_#fff] ring-1 ring-black/5 ring-b-0'
                    : 'text-[#8E8E93] hover:text-[#1C1C1E]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'subscriptions' && (
            <div className="p-4">
              <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]">
                    ⌕
                  </span>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search merchants, plan, status…"
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
                  <option value="PAUSED">Paused</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="rounded-xl border border-black/8 bg-white px-3 py-2.5 text-sm font-semibold"
                >
                  <option value="ALL">All Plans</option>
                  <option value="FREE">Starter</option>
                  <option value="MONTHLY">Pro Monthly</option>
                  <option value="YEARLY">Business Yearly</option>
                </select>
                <select
                  value={cycleFilter}
                  onChange={(e) => setCycleFilter(e.target.value)}
                  className="rounded-xl border border-black/8 bg-white px-3 py-2.5 text-sm font-semibold"
                >
                  <option value="ALL">All Billing Cycles</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                  <option value="None">None</option>
                </select>
              </div>

              <div className="overflow-x-auto rounded-xl border border-black/5">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#F8F8FA] text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
                    <tr>
                      <th className="px-4 py-3">Merchant / Business</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Billing Cycle</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Next Billing</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((s) => (
                      <tr key={s.id} className="border-t border-black/5 hover:bg-[#FFF8F7]/70">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <EntityAvatar
                              src={s.merchant?.logoUrl}
                              name={s.merchant?.businessName || 'Merchant'}
                              size="md"
                              rounded="xl"
                            />
                            <div className="min-w-0">
                              <div className="font-bold">{s.merchant?.businessName || 'Unknown'}</div>
                              <div className="text-xs text-[#8E8E93]">
                                ID: {(s.merchant?.id || s.id).slice(0, 10)}…
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <PlanBadge plan={s.plan} />
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#636366]">
                          {PLAN_META[s.plan]?.cycle || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={s.status} />
                        </td>
                        <td className="px-4 py-3 text-[#636366]">
                          {s.currentPeriodEnd
                            ? fmtDate(s.currentPeriodEnd)
                            : s.plan === 'FREE'
                              ? '—'
                              : fmtDate(s.updatedAt)}
                        </td>
                        <td className="px-4 py-3 font-extrabold">
                          {money(amountFor(s.plan), currency)}
                        </td>
                        <td className="relative px-4 py-3 text-right">
                          <button
                            type="button"
                            className="rounded-lg px-2 py-1 text-lg font-bold text-[#8E8E93] hover:bg-black/5"
                            onClick={() => setMenuId(menuId === s.id ? null : s.id)}
                            aria-label="Actions"
                          >
                            ⋯
                          </button>
                          {menuId === s.id && (
                            <div className="absolute right-4 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-black/8 bg-white py-1 text-left shadow-lg">
                              {(['FREE', 'MONTHLY', 'YEARLY'] as PlanId[]).map((plan) => (
                                <button
                                  key={plan}
                                  type="button"
                                  className="block w-full px-3 py-2 text-left text-xs font-bold hover:bg-[#FFF0F1]"
                                  onClick={() => patch(s.id, { plan })}
                                >
                                  Set {PLAN_META[plan].label}
                                </button>
                              ))}
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                                onClick={() => patch(s.id, { status: 'ACTIVE' })}
                              >
                                Activate
                              </button>
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-xs font-bold text-amber-700 hover:bg-amber-50"
                                onClick={() => patch(s.id, { status: 'PAST_DUE' })}
                              >
                                Pause
                              </button>
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50"
                                onClick={() => patch(s.id, { status: 'CANCELED' })}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!pageRows.length && (
                      <tr>
                        <td colSpan={7}>
                          <AdminEmpty message="No subscriptions match these filters." />
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
                          pageSafe === n
                            ? 'bg-[#FF5A5F] text-white'
                            : 'border border-black/8 bg-white'
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
          )}

          {tab === 'plans' && token && (
            <AdminPricingEditor
              token={token}
              onMessage={(m) => {
                setMsg(m);
                setError('');
                load();
              }}
              onError={(m) => {
                setError(m);
                setMsg('');
              }}
            />
          )}

          {tab === 'invoices' && (
            <div className="overflow-x-auto">
              {!invoices.length ? (
                <AdminEmpty message="No invoices yet — paid checkout and Stripe invoice.paid events will show up here." />
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#F8F8FA] text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
                    <tr>
                      <th className="px-4 py-3">Merchant</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-t border-black/5">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <EntityAvatar
                              name={inv.merchant?.businessName || 'Merchant'}
                              src={inv.merchant?.logoUrl}
                              size="sm"
                            />
                            <div>
                              <div className="font-bold">{inv.merchant?.businessName || '—'}</div>
                              <div className="text-xs text-[#8E8E93]">{inv.merchant?.slug || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{inv.description || 'Subscription'}</td>
                        <td className="px-4 py-3 font-semibold">
                          {inv.currency} {Number(inv.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {inv.pdfUrl ? (
                            <a
                              href={inv.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-[#FF5A5F] underline"
                            >
                              {inv.status}
                            </a>
                          ) : (
                            <StatusBadge status={inv.status} />
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#636366]">
                          {fmtDate(inv.paidAt || inv.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {(tab === 'payments' || tab === 'coupons') && (
            <div className="p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0F1] text-xl text-[#FF5A5F]">
                {tab === 'payments' ? '💳' : '🏷️'}
              </div>
              <h3 className="text-lg font-extrabold capitalize">{tab}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#8E8E93]">
                {tab === 'payments' &&
                  'Stripe / provider payment ledger will appear here as live charges sync in.'}
                {tab === 'coupons' &&
                  'Promo codes and discount coupons can be managed here in a follow-up release.'}
              </p>
            </div>
          )}

          {tab === 'settings' && (
            <div className="space-y-4 p-4">
              <div className="rounded-xl border border-black/5 bg-[#F8F8FA] p-4">
                <div className="text-sm font-extrabold">Default currency</div>
                <div className="mt-1 text-sm text-[#636366]">{currency} (Nepal list prices)</div>
              </div>
              <div className="rounded-xl border border-black/5 bg-[#F8F8FA] p-4">
                <div className="text-sm font-extrabold">Plan catalog</div>
                <div className="mt-1 text-sm text-[#636366]">
                  Starter {money(prices.FREE, currency)} · Pro Monthly {money(prices.MONTHLY, currency)} ·
                  Business Yearly {money(prices.YEARLY, currency)}
                </div>
              </div>
              <div className="rounded-xl border border-black/5 bg-[#F8F8FA] p-4">
                <div className="text-sm font-extrabold">Providers</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge status="MANUAL" />
                  <StatusBadge status="STRIPE" />
                  <StatusBadge status="APPLE" />
                  <StatusBadge status="GOOGLE" />
                </div>
              </div>
            </div>
          )}
        </AdminSurface>

        <div className="space-y-4">
          <AdminSurface>
            <h2 className="text-sm font-extrabold">Subscription Overview</h2>
            <div className="relative mx-auto mt-2 h-52 w-full max-w-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {donutData.map((d) => (
                      <Cell key={d.key} fill={DONUT_COLORS[d.key] || '#CBD5E1'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [String(value ?? 0), 'Subscriptions']}
                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-extrabold">{m?.totalSubscriptions ?? 0}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#8E8E93]">
                  Total
                </div>
              </div>
            </div>
            <div className="mt-2 space-y-1.5">
              {donutData.map((d) => (
                <div key={d.key} className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2 text-[#636366]">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: DONUT_COLORS[d.key] }}
                    />
                    {d.name}
                  </span>
                  <span className="font-extrabold">{d.value}</span>
                </div>
              ))}
            </div>
          </AdminSurface>

          <AdminSurface>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-extrabold">Revenue Overview</h2>
              <div className="text-right">
                <div className="text-xs text-[#8E8E93]">Total Revenue</div>
                <div className="text-sm font-extrabold">
                  {money(data?.totals.totalRevenue ?? 0, currency)}
                </div>
              </div>
            </div>
            <div className="mt-1 text-xs font-semibold text-emerald-600">
              Avg {money(data?.totals.averageRevenue ?? 0, currency)} / active
            </div>
            <div className="mt-3 h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.revenueTrend || []}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value) => [money(Number(value || 0), currency), 'Revenue']}
                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#FF5A5F"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#FF5A5F' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </AdminSurface>

          <AdminSurface>
            <h2 className="mb-3 text-sm font-extrabold">Top Plans by Revenue</h2>
            <div className="space-y-3">
              {topPlans.map((p, idx) => (
                <div key={p.name}>
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#636366]">
                      {idx + 1}. {p.name}
                    </span>
                    <span className="font-extrabold">
                      {money(p.amount, currency)} · {p.pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#F4F5F7]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(p.pct, p.amount ? 4 : 0)}%`, background: p.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </AdminSurface>
        </div>
      </div>
    </div>
  );
}
