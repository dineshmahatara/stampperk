'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EntityAvatar } from '@/components/EntityAvatar';

type Overview = {
  activeMerchants: number;
  activeMerchantCount?: number;
  customers: number;
  stamps: number;
  redemptions: number;
  payingMerchants: number;
  loyaltyPrograms?: number;
  trends?: {
    merchants: number;
    customers: number;
    stamps: number;
    redemptions: number;
  };
  stampSeries?: { label: string; count: number }[];
  categories?: { name: string; count: number; percent: number }[];
  recentMerchants?: {
    id: string;
    businessName: string;
    category: string;
    city?: string | null;
    country?: string;
    status: string;
    createdAt: string;
    logoUrl?: string | null;
    subscription?: { plan?: string };
  }[];
  activity?: { type: string; title: string; detail: string; at: string }[];
  platform?: {
    activeMerchants: number;
    loyaltyPrograms: number;
    payingMerchants: number;
    stampsThisMonth: number;
    redemptionsThisMonth: number;
  };
};

const CAT_COLORS = ['#FF5A5F', '#8B5CF6', '#F59E0B', '#10B981', '#64748B'];

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 1 : 2)}K`.replace(/\.00K/, 'K');
  return String(n);
}

function Trend({ value }: { value?: number }) {
  const v = value ?? 0;
  const up = v >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      <span aria-hidden>{up ? '↑' : '↓'}</span>
      {Math.abs(v)}%
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700',
    PENDING: 'bg-amber-50 text-amber-700',
    SUSPENDED: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status === 'ACTIVE' ? 'Active' : status === 'PENDING' ? 'Pending' : status}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const palette = [
    'bg-violet-50 text-violet-700',
    'bg-emerald-50 text-emerald-700',
    'bg-sky-50 text-sky-700',
    'bg-orange-50 text-orange-700',
    'bg-pink-50 text-pink-700',
  ];
  const idx = category.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${palette[idx]}`}>{category}</span>
  );
}

function StampAreaChart({ series }: { series: { label: string; count: number }[] }) {
  const max = Math.max(...series.map((s) => s.count), 1);
  const w = 560;
  const h = 200;
  const pad = 12;
  const points = series.map((s, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(series.length - 1, 1);
    const y = h - pad - (s.count / max) * (h - pad * 2);
    return { x, y, ...s };
  });
  const line = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  const peak = points.reduce((a, b) => (b.count >= a.count ? b : a), points[0]);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-52 w-full">
        <defs>
          <linearGradient id="stampFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF5A5F" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FF5A5F" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={pad}
            x2={w - pad}
            y1={pad + t * (h - pad * 2)}
            y2={pad + t * (h - pad * 2)}
            stroke="#E5E7EB"
            strokeDasharray="4 4"
          />
        ))}
        <polygon points={area} fill="url(#stampFill)" />
        <polyline points={line} fill="none" stroke="#FF5A5F" strokeWidth="3" strokeLinejoin="round" />
        {peak && (
          <>
            <circle cx={peak.x} cy={peak.y} r="5" fill="#FF5A5F" stroke="#fff" strokeWidth="2" />
            <foreignObject x={Math.min(peak.x - 70, w - 150)} y={Math.max(peak.y - 48, 0)} width="140" height="40">
              <div className="rounded-lg bg-[#1B1F2A] px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-lg">
                {peak.label} · {peak.count.toLocaleString()}
              </div>
            </foreignObject>
          </>
        )}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10px] font-medium text-[#8E8E93]">
        <span>{series[0]?.label}</span>
        <span>{series[Math.floor(series.length / 2)]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function DonutChart({
  categories,
  total,
}: {
  categories: { name: string; percent: number }[];
  total: number;
}) {
  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle cx="70" cy="70" r={r} fill="none" stroke="#F1F5F9" strokeWidth="18" />
          {categories.map((cat, i) => {
            const len = (cat.percent / 100) * c;
            const el = (
              <circle
                key={cat.name}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={CAT_COLORS[i % CAT_COLORS.length]}
                strokeWidth="18"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xl font-extrabold">{formatCompact(total)}</div>
          <div className="text-[10px] font-semibold text-[#8E8E93]">Total</div>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {categories.map((cat, i) => (
          <li key={cat.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-medium text-[#1C1C1E]">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: CAT_COLORS[i % CAT_COLORS.length] }}
              />
              {cat.name}
            </span>
            <span className="font-bold text-[#8E8E93]">{cat.percent}%</span>
          </li>
        ))}
        {!categories.length && <li className="text-[#8E8E93]">No category data yet</li>}
      </ul>
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - +new Date(iso);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminOverviewPage() {
  const { token, user } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api<Overview>('/admin/overview', { token })
      .then(setOverview)
      .catch((e) => setError(e.message));
  }, [token]);

  const kpis = useMemo(() => {
    if (!overview) return [];
    return [
      {
        label: 'Total Merchants',
        value: formatCompact(overview.activeMerchants),
        trend: overview.trends?.merchants,
        iconBg: 'bg-[#FFE8EA]',
        iconColor: 'text-[#FF5A5F]',
        icon: 'store',
      },
      {
        label: 'Total Customers',
        value: formatCompact(overview.customers),
        trend: overview.trends?.customers,
        iconBg: 'bg-[#EDE9FE]',
        iconColor: 'text-[#7C3AED]',
        icon: 'users',
      },
      {
        label: 'Total Stamps Issued',
        value: formatCompact(overview.stamps),
        trend: overview.trends?.stamps,
        iconBg: 'bg-[#FFEDD5]',
        iconColor: 'text-[#EA580C]',
        icon: 'stamp',
      },
      {
        label: 'Rewards Redeemed',
        value: formatCompact(overview.redemptions),
        trend: overview.trends?.redemptions,
        iconBg: 'bg-[#D1FAE5]',
        iconColor: 'text-[#059669]',
        icon: 'gift',
      },
    ];
  }, [overview]);

  const quickActions = [
    { href: '/admin/merchants', label: 'Add New Merchant', tint: 'bg-[#FFE8EA] text-[#FF5A5F]' },
    { href: '/admin/loyalty-programs', label: 'Create Loyalty Program', tint: 'bg-[#EDE9FE] text-[#7C3AED]' },
    { href: '/admin/rewards', label: 'Add New Reward', tint: 'bg-[#FFEDD5] text-[#EA580C]' },
    { href: '/admin/reports', label: 'View Reports', tint: 'bg-[#DBEAFE] text-[#2563EB]' },
    { href: '/admin/promotions', label: 'Send Announcement', tint: 'bg-[#D1FAE5] text-[#059669]' },
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Welcome back, {user?.name?.split(' ')[0] || 'Admin'}! 👋
          </h1>
          <p className="mt-1 text-sm text-[#8E8E93]">
            Here&apos;s what&apos;s happening with your Stampza platform today.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-black/6 bg-white px-3 py-2 text-sm font-semibold text-[#1C1C1E] shadow-sm">
          <svg className="h-4 w-4 text-[#FF5A5F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          Last 30 days
        </div>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${k.iconBg} ${k.iconColor}`}>
                {k.icon === 'store' && (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l1.5-5h15L21 9M4 9v10h16V9" />
                  </svg>
                )}
                {k.icon === 'users' && (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="8" r="3" />
                    <path d="M3 19a6 6 0 0112 0" />
                  </svg>
                )}
                {k.icon === 'stamp' && (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="3" />
                    <path d="M8 14h8l1 6H7l1-6z" />
                  </svg>
                )}
                {k.icon === 'gift' && (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="10" width="18" height="11" rx="1.5" />
                    <path d="M12 10v11M3 14h18" />
                  </svg>
                )}
              </div>
              <Trend value={k.trend} />
            </div>
            <div className="mt-4 text-2xl font-extrabold tracking-tight">{overview ? k.value : '—'}</div>
            <div className="mt-0.5 text-sm font-medium text-[#8E8E93]">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-extrabold">Stamp Transactions Overview</h2>
                <span className="text-xs font-semibold text-[#8E8E93]">14 days</span>
              </div>
              {overview?.stampSeries ? (
                <StampAreaChart series={overview.stampSeries} />
              ) : (
                <div className="flex h-52 items-center justify-center text-sm text-[#8E8E93]">Loading chart…</div>
              )}
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <h2 className="mb-4 text-base font-extrabold">Top Loyalty Program Categories</h2>
              <DonutChart
                categories={overview?.categories || []}
                total={overview?.activeMerchants || 0}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-extrabold">Recent Merchants</h2>
              <Link href="/admin/merchants" className="text-sm font-bold text-[#FF5A5F] hover:underline">
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-xs uppercase tracking-wide text-[#8E8E93]">
                    <th className="pb-3 pr-3 font-bold">Merchant</th>
                    <th className="pb-3 pr-3 font-bold">Business Type</th>
                    <th className="pb-3 pr-3 font-bold">Plan</th>
                    <th className="pb-3 pr-3 font-bold">Joined</th>
                    <th className="pb-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.recentMerchants || []).map((m) => (
                    <tr key={m.id} className="border-b border-black/4 last:border-0">
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-3">
                          <EntityAvatar src={m.logoUrl} name={m.businessName} size="md" rounded="xl" />
                          <div>
                            <div className="font-bold">{m.businessName}</div>
                            <div className="text-xs text-[#8E8E93]">
                              {[m.city, m.country].filter(Boolean).join(', ') || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-3">
                        <CategoryBadge category={m.category} />
                      </td>
                      <td className="py-3.5 pr-3 font-semibold text-[#1C1C1E]">
                        {m.subscription?.plan || 'FREE'}
                      </td>
                      <td className="py-3.5 pr-3 text-[#8E8E93]">
                        {new Date(m.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5">
                        <StatusBadge status={m.status} />
                      </td>
                    </tr>
                  ))}
                  {!overview?.recentMerchants?.length && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#8E8E93]">
                        No merchants yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <h2 className="mb-3 text-base font-extrabold">Quick Actions</h2>
            <div className="space-y-2">
              {quickActions.map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition hover:brightness-95 ${a.tint}`}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/70 text-base leading-none">
                    +
                  </span>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <h2 className="mb-3 text-base font-extrabold">Platform Summary</h2>
            <ul className="space-y-3 text-sm">
              {[
                ['Active Merchants', overview?.platform?.activeMerchants],
                ['Active Loyalty Programs', overview?.platform?.loyaltyPrograms],
                ['Paying Merchants', overview?.platform?.payingMerchants],
                ['Stamps (30d)', overview?.platform?.stampsThisMonth],
                ['Redeems (30d)', overview?.platform?.redemptionsThisMonth],
              ].map(([label, value]) => (
                <li key={String(label)} className="flex items-center justify-between gap-3">
                  <span className="text-[#8E8E93]">{label}</span>
                  <span className="inline-flex items-center gap-1 font-extrabold">
                    <span className="text-emerald-500">↑</span>
                    {value ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-xl bg-[#FFF0F1] px-3 py-3">
              <div className="text-xs font-bold uppercase tracking-wide text-[#FF5A5F]">Paying plans</div>
              <div className="mt-1 text-xl font-extrabold text-[#1C1C1E]">
                {overview?.payingMerchants ?? '—'}{' '}
                <span className="text-sm font-semibold text-[#8E8E93]">active</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <h2 className="mb-3 text-base font-extrabold">Recent Activity</h2>
            <ul className="space-y-3">
              {(overview?.activity || []).map((a, i) => (
                <li key={`${a.title}-${i}`} className="flex gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${
                      a.type === 'merchant'
                        ? 'bg-[#FFE8EA] text-[#FF5A5F]'
                        : a.type === 'redeem'
                          ? 'bg-[#D1FAE5] text-[#059669]'
                          : 'bg-[#EDE9FE] text-[#7C3AED]'
                    }`}
                  >
                    {a.type === 'merchant' ? 'M' : a.type === 'redeem' ? 'R' : 'S'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-snug">{a.title}</div>
                    <div className="text-xs text-[#8E8E93]">
                      {a.detail} · {timeAgo(a.at)}
                    </div>
                  </div>
                </li>
              ))}
              {!overview?.activity?.length && (
                <li className="text-sm text-[#8E8E93]">No recent activity</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
