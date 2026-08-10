'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CustomerHome } from '@/components/CustomerHome';

type Dashboard = {
  businessName: string;
  slug?: string;
  city?: string | null;
  country?: string;
  currency?: string;
  plan: string;
  periodEnd?: string | null;
  kpis: {
    totalCustomers: number;
    stampsGivenWeek: number;
    rewardsRedeemedWeek: number;
    returningCustomers: number;
    returningRate: number;
    salesWeek: number;
    pendingRedemptions: number;
    pendingCards: number;
  };
  trends?: {
    customers: number;
    stamps: number;
    redemptions: number;
    sales: number;
  };
  stampSeries?: { label: string; count: number }[];
  programPerformance?: {
    id: string;
    title: string;
    rewardTitle: string;
    cards: number;
    stamps: number;
    percent: number;
    progress: number;
    totalStamps: number;
  }[];
  topCustomers?: {
    id: string;
    name: string;
    email: string;
    stamps: number;
    programTitle: string;
    spend: number;
  }[];
  recentStamps?: {
    id: string;
    customerName: string;
    programTitle: string;
    stamps: number;
    at: string;
  }[];
  recentActivity: Array<{
    type: string;
    id: string;
    customerName: string;
    programTitle?: string;
    rewardTitle?: string;
    at: string;
  }>;
};

const DONUT = ['#FF5A5F', '#8B5CF6', '#F59E0B', '#10B981', '#64748B', '#3B82F6'];

function Trend({ value }: { value?: number }) {
  const v = value ?? 0;
  const up = v >= 0;
  return (
    <span className={`text-xs font-bold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? '↑' : '↓'} {Math.abs(v)}%
    </span>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function StampChart({ series }: { series: { label: string; count: number }[] }) {
  const max = Math.max(...series.map((s) => s.count), 1);
  const w = 520;
  const h = 180;
  const pad = 10;
  const points = series.map((s, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(series.length - 1, 1);
    const y = h - pad - (s.count / max) * (h - pad * 2);
    return { x, y, ...s };
  });
  const line = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  const peak = points.reduce((a, b) => (b.count >= a.count ? b : a), points[0]);

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full">
        <defs>
          <linearGradient id="mStampFill" x1="0" y1="0" x2="0" y2="1">
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
        <polygon points={area} fill="url(#mStampFill)" />
        <polyline points={line} fill="none" stroke="#FF5A5F" strokeWidth="3" strokeLinejoin="round" />
        {peak && (
          <>
            <circle cx={peak.x} cy={peak.y} r="5" fill="#FF5A5F" stroke="#fff" strokeWidth="2" />
            <foreignObject x={Math.min(peak.x - 60, w - 130)} y={Math.max(peak.y - 42, 0)} width="120" height="36">
              <div className="rounded-lg bg-[#1B1F2A] px-2 py-1 text-[10px] font-semibold text-white">
                {peak.label}: {peak.count}
              </div>
            </foreignObject>
          </>
        )}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] font-medium text-[#8E8E93]">
        <span>{series[0]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function ProgramDonut({
  programs,
}: {
  programs: { title: string; percent: number; cards: number }[];
}) {
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const total = programs.reduce((s, p) => s + p.cards, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#F1F5F9" strokeWidth="16" />
          {programs.map((p, i) => {
            const len = ((p.percent || 0) / 100) * c;
            const el = (
              <circle
                key={`${p.title}-${i}`}
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke={DONUT[i % DONUT.length]}
                strokeWidth="16"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-lg font-extrabold">{total}</div>
          <div className="text-[10px] font-semibold text-[#8E8E93]">Cards</div>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {programs.slice(0, 5).map((p, i) => (
          <li key={`${p.title}-${i}`} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 truncate font-medium">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT[i % DONUT.length] }} />
              {p.title}
            </span>
            <span className="font-bold text-[#8E8E93]">{p.percent}%</span>
          </li>
        ))}
        {!programs.length && <li className="text-[#8E8E93]">No active programs</li>}
      </ul>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation('common');
  const { token, user, experience } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    if (experience !== 'merchant') return;
    api<Dashboard>('/merchants/me/dashboard', { token })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token, experience]);

  if (experience === 'customer' && token) {
    return <CustomerHome token={token} userName={user?.name} />;
  }

  const currency = data?.currency || 'NPR';
  const isOwner = user?.role === 'MERCHANT_OWNER';

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {greeting()}, {data?.businessName || 'Merchant'}! 👋
          </h1>
          <p className="mt-1 text-sm text-[#8E8E93]">Here&apos;s what&apos;s happening with your business today.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-black/6 bg-white px-3 py-2 text-sm font-semibold shadow-sm">
          Last 7 days
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="font-semibold text-red-600">{error}</p>
          <Link href="/dashboard/onboarding" className="mt-2 inline-block font-semibold text-[#FF5A5F]">
            Complete your business profile →
          </Link>
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              {
                label: 'Total Customers',
                value: data.kpis.totalCustomers.toLocaleString(),
                trend: data.trends?.customers,
                tint: 'bg-[#FFE8EA] text-[#FF5A5F]',
              },
              {
                label: 'Stamps Issued',
                value: data.kpis.stampsGivenWeek.toLocaleString(),
                trend: data.trends?.stamps,
                tint: 'bg-[#EDE9FE] text-[#7C3AED]',
              },
              {
                label: 'Rewards Redeemed',
                value: data.kpis.rewardsRedeemedWeek.toLocaleString(),
                trend: data.trends?.redemptions,
                tint: 'bg-[#D1FAE5] text-[#059669]',
              },
              {
                label: `Sales Through Stampza`,
                value: `${currency === 'NPR' ? 'Rs.' : currency} ${Math.round(data.kpis.salesWeek).toLocaleString()}`,
                trend: data.trends?.sales,
                tint: 'bg-[#FFEDD5] text-[#EA580C]',
              },
              {
                label: 'Pending Redemptions',
                value: String(data.kpis.pendingRedemptions),
                link: '/dashboard/redemptions',
                tint: 'bg-[#DBEAFE] text-[#2563EB]',
              },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black ${k.tint}`}>
                    •
                  </div>
                  {k.trend != null ? <Trend value={k.trend} /> : null}
                </div>
                <div className="mt-3 text-xl font-extrabold tracking-tight">{k.value}</div>
                <div className="text-xs font-semibold text-[#8E8E93]">{k.label}</div>
                {k.link && (
                  <Link href={k.link} className="mt-2 inline-block text-xs font-bold text-[#FF5A5F]">
                    View details →
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_1fr_280px]">
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-extrabold">Stamp Activity</h2>
                <span className="text-xs font-semibold text-[#8E8E93]">7 days</span>
              </div>
              {data.stampSeries ? <StampChart series={data.stampSeries} /> : null}
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <h2 className="mb-4 font-extrabold">Loyalty Program Performance</h2>
              <ProgramDonut programs={data.programPerformance || []} />
            </div>

            <div className="rounded-2xl bg-[#1B1F2A] p-5 text-white shadow-[0_8px_30px_rgba(15,23,42,0.12)]">
              <h2 className="mb-3 font-extrabold">Quick Actions</h2>
              <div className="space-y-2">
                {(isOwner
                  ? [
                      ['Create New Loyalty Program', '/dashboard/cards'],
                      ['Create New Reward', '/dashboard/rewards'],
                      ['Add Announcement', '/dashboard/announcements'],
                      ['Send Push Notification', '/dashboard/notifications'],
                      ['View Analytics Report', '/dashboard/analytics'],
                      ['Scan Customer QR', '/dashboard/scan'],
                    ]
                  : [
                      ['Scan Customer QR', '/dashboard/scan'],
                      ['View Promotions', '/dashboard/campaigns'],
                      ['Stamp Transactions', '/dashboard/stamps'],
                      ['Redemptions', '/dashboard/redemptions'],
                    ]
                ).map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    className="flex items-center gap-2 rounded-xl bg-white/8 px-3 py-2.5 text-sm font-bold text-white/95 transition hover:bg-[#FF5A5F]"
                  >
                    <span className="text-[#FF8A8E]">+</span>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-extrabold">Recent Stamp Transactions</h2>
                <Link href="/dashboard/stamps" className="text-sm font-bold text-[#FF5A5F]">
                  View all
                </Link>
              </div>
              <ul className="space-y-3">
                {(data.recentStamps || []).map((s) => (
                  <li key={s.id} className="flex items-center gap-3 border-b border-black/4 pb-3 last:border-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFE8EA] text-xs font-extrabold text-[#FF5A5F]">
                      {s.customerName.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{s.customerName}</div>
                      <div className="truncate text-xs text-[#8E8E93]">{s.programTitle}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-600">+{s.stamps} Stamp</div>
                      <div className="text-[10px] text-[#8E8E93]">
                        {new Date(s.at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </li>
                ))}
                {!data.recentStamps?.length && (
                  <li className="text-sm text-[#8E8E93]">No stamps yet — open Scan QR to start.</li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-extrabold">Top Customers</h2>
                <Link href="/dashboard/customers" className="text-sm font-bold text-[#FF5A5F]">
                  View all
                </Link>
              </div>
              <ul className="space-y-3">
                {(data.topCustomers || []).map((c) => (
                  <li key={c.id} className="flex items-center gap-3 border-b border-black/4 pb-3 last:border-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EDE9FE] text-xs font-extrabold text-[#7C3AED]">
                      {c.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{c.name}</div>
                      <div className="truncate text-xs text-[#8E8E93]">{c.programTitle}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold">
                        {currency === 'NPR' ? 'Rs.' : currency} {Math.round(c.spend).toLocaleString()}
                      </div>
                      <div className="text-[10px] font-bold text-amber-600">★ {c.stamps} stamps</div>
                    </div>
                  </li>
                ))}
                {!data.topCustomers?.length && (
                  <li className="text-sm text-[#8E8E93]">Customers will appear after enrollments.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <h2 className="mb-4 font-extrabold">Active Loyalty Programs</h2>
              <ul className="space-y-4">
                {(data.activePrograms || []).map((p) => (
                  <li key={p.id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="font-bold">{p.title}</span>
                      <span className="text-xs font-semibold text-[#8E8E93]">
                        {p.stamps}/{Math.max(p.cards * p.totalStamps, p.totalStamps)} stamps
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#FFE8EA]">
                      <div
                        className="h-full rounded-full bg-[#FF5A5F]"
                        style={{ width: `${Math.max(4, p.progress)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-[#8E8E93]">
                      {p.cards} customers · reward: {p.rewardTitle}
                    </div>
                  </li>
                ))}
                {!data.activePrograms?.length && (
                  <li className="text-sm text-[#8E8E93]">
                    No active programs.{' '}
                    <Link href="/dashboard/cards" className="font-bold text-[#FF5A5F]">
                      Create one
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <h2 className="mb-3 font-extrabold">Business Summary</h2>
              <div className="rounded-xl bg-[#FFF0F1] p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-[#FF5A5F]">Current plan</div>
                <div className="mt-1 text-xl font-extrabold">{data.plan}</div>
                <div className="mt-1 text-xs text-[#8E8E93]">
                  {data.periodEnd
                    ? `Renews ${new Date(data.periodEnd).toLocaleDateString()}`
                    : 'Manage billing anytime'}
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-[#8E8E93]">Returning rate</span>
                  <span className="font-extrabold">{data.kpis.returningRate}%</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#8E8E93]">Returning customers</span>
                  <span className="font-extrabold">{data.kpis.returningCustomers}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#8E8E93]">Pending cards</span>
                  <span className="font-extrabold">{data.kpis.pendingCards}</span>
                </li>
              </ul>
              {isOwner && (
                <Link
                  href="/dashboard/billing"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#FF5A5F] px-4 py-2.5 text-sm font-bold text-white"
                >
                  Manage Subscription
                </Link>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-2xl bg-[#FFF0F1] px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <div className="font-extrabold text-[#1C1C1E]">Keep engaging your customers!</div>
              <div className="text-sm text-[#8E8E93]">Launch a promotion and bring them back this week.</div>
            </div>
            <Link
              href="/dashboard/campaigns"
              className="rounded-full bg-[#FF5A5F] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(255,90,95,0.3)]"
            >
              Create Promotion
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
