'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { AdminSurface } from '@/components/AdminPage';
import { EntityAvatar } from '@/components/EntityAvatar';

export function AdminTrend({ value, invert = false }: { value: number; invert?: boolean }) {
  const good = invert ? value <= 0 : value >= 0;
  return (
    <span className={`text-xs font-bold ${good ? 'text-emerald-600' : 'text-red-500'}`}>
      {value >= 0 ? '▲' : '▼'} {value >= 0 ? '+' : ''}
      {value}%
      <span className="ml-1 font-semibold text-[#8E8E93]">vs last 30 days</span>
    </span>
  );
}

export function AdminStatCard({
  label,
  value,
  trend,
  iconBg = 'bg-[#FFF0F1] text-[#FF5A5F]',
  icon,
  invertTrend,
}: {
  label: string;
  value: string;
  trend?: number;
  iconBg?: string;
  icon: React.ReactNode;
  invertTrend?: boolean;
}) {
  return (
    <AdminSurface className="!p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>{icon}</div>
      <div className="mt-3 text-xs font-bold uppercase tracking-wide text-[#8E8E93]">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="text-2xl font-extrabold tracking-tight">{value}</div>
        {typeof trend === 'number' && <AdminTrend value={trend} invert={invertTrend} />}
      </div>
    </AdminSurface>
  );
}

export function adminRangeLabel(days = 30) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function AdminDateRangePill({ days = 30 }: { days?: number }) {
  return (
    <div className="rounded-xl border border-black/8 bg-white px-3 py-2.5 text-sm font-semibold text-[#636366]">
      {adminRangeLabel(days)}
    </div>
  );
}

export function AdminSuccess({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
      {message}
    </p>
  );
}

export function AdminSectionTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-black/5 px-3 pt-3">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`whitespace-nowrap rounded-t-xl px-3 py-2.5 text-sm font-bold transition ${
            value === t.id
              ? 'bg-white text-[#FF5A5F] shadow-[0_-1px_0_#fff] ring-1 ring-black/5 ring-b-0'
              : 'text-[#8E8E93] hover:text-[#1C1C1E]'
          }`}
        >
          {t.label}
          {typeof t.count === 'number' && (
            <span
              className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                value === t.id ? 'bg-[#FFF0F1] text-[#FF5A5F]' : 'bg-[#F4F5F7] text-[#8E8E93]'
              }`}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function AdminToolbar({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">{children}</div>;
}

export function AdminToolbarSearch({
  value,
  onChange,
  placeholder = 'Search…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative flex-1">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]">⌕</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-black/8 bg-[#F8F8FA] py-2.5 pl-9 pr-3 text-sm outline-none ring-[#FF5A5F]/20 focus:bg-white focus:ring-2"
      />
    </div>
  );
}

export function AdminSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-black/8 bg-white px-3 py-2.5 text-sm font-semibold"
    >
      {children}
    </select>
  );
}

export function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(page, pageCount);
  const from = total === 0 ? 0 : (pageSafe - 1) * pageSize + 1;
  const to = Math.min(total, pageSafe * pageSize);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-black/5 px-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs font-semibold text-[#8E8E93]">
        {from} to {to} of {total} results
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-lg border border-black/8 bg-white px-2 py-1.5 text-xs font-bold"
        >
          {[5, 10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={pageSafe <= 1}
            onClick={() => onPageChange(pageSafe - 1)}
            className="rounded-lg border border-black/8 px-2 py-1.5 text-xs font-bold disabled:opacity-40"
          >
            ‹
          </button>
          {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
            let n = i + 1;
            if (pageCount > 5) {
              const start = Math.min(Math.max(pageSafe - 2, 1), pageCount - 4);
              n = start + i;
            }
            return (
              <button
                key={n}
                type="button"
                onClick={() => onPageChange(n)}
                className={`min-w-8 rounded-lg px-2 py-1.5 text-xs font-bold ${
                  n === pageSafe ? 'bg-[#FF5A5F] text-white' : 'border border-black/8'
                }`}
              >
                {n}
              </button>
            );
          })}
          <button
            type="button"
            disabled={pageSafe >= pageCount}
            onClick={() => onPageChange(pageSafe + 1)}
            className="rounded-lg border border-black/8 px-2 py-1.5 text-xs font-bold disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

export function useAdminPagination<T>(rows: T[], deps: unknown[] = []) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageSafe = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => rows.slice((pageSafe - 1) * pageSize, pageSafe * pageSize),
    [rows, pageSafe, pageSize],
  );

  return {
    page: pageSafe,
    pageSize,
    setPage,
    setPageSize,
    pageRows,
    total: rows.length,
  };
}

export function AdminSplit({
  main,
  side,
}: {
  main: React.ReactNode;
  side: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.85fr)]">
      {main}
      <div className="space-y-4">{side}</div>
    </div>
  );
}

export function AdminInsightCard({
  title = 'Insight',
  message,
  href,
  hrefLabel = 'View details',
}: {
  title?: string;
  message: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <AdminSurface className="bg-gradient-to-br from-[#FFF0F1] to-white">
      <div className="text-xs font-bold uppercase tracking-wide text-[#FF5A5F]">{title}</div>
      <p className="mt-2 text-sm font-semibold text-[#1C1C1E]">{message}</p>
      {href && (
        <a
          href={href}
          className="mt-3 inline-flex text-sm font-bold text-[#FF5A5F] hover:underline"
        >
          {hrefLabel} →
        </a>
      )}
    </AdminSurface>
  );
}

export function AdminDonutCard({
  title,
  centerLabel,
  centerValue,
  data,
}: {
  title: string;
  centerLabel?: string;
  centerValue: string | number;
  data: { name: string; value: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <AdminSurface>
      <h3 className="font-extrabold">{title}</h3>
      <div className="relative mx-auto mt-2 h-44 w-full max-w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={78}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, n) => {
                const numVal = typeof v === 'number' ? v : Number(v) || 0;
                return [`${numVal} (${Math.round((numVal / total) * 100)}%)`, String(n ?? '')];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-extrabold">{centerValue}</div>
          {centerLabel && <div className="text-[10px] font-bold uppercase text-[#8E8E93]">{centerLabel}</div>}
        </div>
      </div>
      <ul className="mt-2 space-y-1.5">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-semibold text-[#636366]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              {d.name}
            </span>
            <span className="font-extrabold">{d.value}</span>
          </li>
        ))}
      </ul>
    </AdminSurface>
  );
}

export function AdminLineCard({
  title,
  subtitle,
  value,
  data,
  color = '#FF5A5F',
}: {
  title: string;
  subtitle?: string;
  value?: string;
  data: { label: string; value: number }[];
  color?: string;
}) {
  return (
    <AdminSurface>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-extrabold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-[#8E8E93]">{subtitle}</p>}
        </div>
        {value && <div className="text-lg font-extrabold text-[#FF5A5F]">{value}</div>}
      </div>
      <div className="mt-3 h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={36} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AdminSurface>
  );
}

export function AdminRankList({
  title,
  items,
  empty = 'No data yet',
}: {
  title: string;
  items: {
    id: string;
    label: string;
    sub?: string;
    value: string | number;
    imageUrl?: string | null;
  }[];
  empty?: string;
}) {
  return (
    <AdminSurface>
      <h3 className="font-extrabold">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((it, i) => (
          <li key={it.id} className="flex items-center gap-3">
            {it.imageUrl !== undefined ? (
              <EntityAvatar src={it.imageUrl} name={it.label} size="sm" rounded="full" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F4F5F7] text-xs font-extrabold text-[#8E8E93]">
                {i + 1}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{it.label}</div>
              {it.sub && <div className="truncate text-xs text-[#8E8E93]">{it.sub}</div>}
            </div>
            <div className="text-sm font-extrabold text-[#FF5A5F]">{it.value}</div>
          </li>
        ))}
        {!items.length && <li className="py-4 text-center text-sm text-[#8E8E93]">{empty}</li>}
      </ul>
    </AdminSurface>
  );
}

/** Rough % change vs items older than `days` (client-side trend from list timestamps). */
export function trendFromDates(dates: (string | Date | null | undefined)[], days = 30): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = dates.filter((d) => d && new Date(d).getTime() >= cutoff).length;
  const older = dates.length - recent;
  if (older === 0) return recent > 0 ? 100 : 0;
  return Math.round(((recent - older) / older) * 100);
}

export function num(n: number) {
  return n.toLocaleString();
}

export const ICONS = {
  users: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3.5 19a5.5 5.5 0 0111 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M14 19a4 4 0 017 0" />
    </svg>
  ),
  store: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10l2-5h12l2 5" />
      <path d="M4 10h16v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9z" />
      <path d="M9 20v-6h6v6" />
    </svg>
  ),
  check: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 12l2 2 4-4" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  stamp: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M8 14h8l1 6H7l1-6z" />
    </svg>
  ),
  gift: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="10" width="18" height="11" rx="1.5" />
      <path d="M12 10v11M3 14h18" />
      <path d="M12 10c-2-3-5-3-5-1.5S9 10 12 10c2-3 5-3 5-1.5S15 10 12 10z" />
    </svg>
  ),
  money: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v18M17 8H9.5a2.5 2.5 0 000 5H14a2.5 2.5 0 010 5H6" />
    </svg>
  ),
  chart: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19V5M8 19v-8M12 19v-5M16 19V8M20 19v-3" />
    </svg>
  ),
  alert: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 4.3L2.8 17a2 2 0 001.7 3h15a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0z" />
    </svg>
  ),
  activity: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </svg>
  ),
  ticket: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 8a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 010 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 010-4V8z" />
    </svg>
  ),
  settings: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 01-1.4 3.4h-.2a1.7 1.7 0 00-1.6 1.1 1.7 1.7 0 00-.3.7 2 2 0 01-4 0 1.7 1.7 0 00-1.1-1.1 1.7 1.7 0 00-.7-.1 2 2 0 01-1.8-2.9l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-.6-.9 2 2 0 010-3.4 1.7 1.7 0 00.6-.9 1.7 1.7 0 00-.3-1.8l-.1-.1A2 2 0 018.6 4h.2a1.7 1.7 0 001.6-1.1 1.7 1.7 0 00.3-.7 2 2 0 014 0 1.7 1.7 0 001.1 1.1 1.7 1.7 0 00.7.1 2 2 0 011.8 2.9l-.1.1a1.7 1.7 0 00-.3 1.8 1.7 1.7 0 00.6.9 2 2 0 010 3.4 1.7 1.7 0 00-.6.9z" />
    </svg>
  ),
  promo: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12l8-8 8 8-8 8-8-8z" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  staff: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a4 4 0 018 0v2" />
    </svg>
  ),
};
