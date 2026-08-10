'use client';

import { useMemo } from 'react';
import Link from 'next/link';
export function AdminPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#8E8E93]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminSurface({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-black/5 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function AdminSearch({
  value,
  onChange,
  placeholder = 'Search…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative mb-4">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]">⌕</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-black/6 bg-[#F4F5F7] py-2.5 pl-9 pr-3 text-sm outline-none ring-[#FF5A5F]/25 focus:ring-2"
      />
    </div>
  );
}

export function AdminFilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
            value === o.id
              ? 'bg-[#FF5A5F] text-white'
              : 'border border-black/8 bg-white text-[#1C1C1E] hover:bg-[#FFF0F1]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700',
    OPEN: 'bg-sky-50 text-sky-700',
    IN_PROGRESS: 'bg-violet-50 text-violet-700',
    RESOLVED: 'bg-emerald-50 text-emerald-700',
    CLOSED: 'bg-slate-100 text-slate-600',
    PENDING: 'bg-amber-50 text-amber-700',
    SUSPENDED: 'bg-red-50 text-red-700',
    DRAFT: 'bg-slate-100 text-slate-600',
    SCHEDULED: 'bg-indigo-50 text-indigo-700',
    ENDED: 'bg-slate-100 text-slate-500',
    CANCELED: 'bg-red-50 text-red-700',
    PAST_DUE: 'bg-orange-50 text-orange-700',
    TRIALING: 'bg-teal-50 text-teal-700',
    HIGH: 'bg-orange-50 text-orange-700',
    URGENT: 'bg-red-50 text-red-700',
    NORMAL: 'bg-slate-100 text-slate-600',
    LOW: 'bg-slate-50 text-slate-500',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${map[status] || 'bg-[#FFE8EA] text-[#FF5A5F]'}`}>
      {status}
    </span>
  );
}

export function AdminEmpty({ message }: { message: string }) {
  return <p className="py-10 text-center text-sm text-[#8E8E93]">{message}</p>;
}

export function AdminError({ message }: { message: string }) {
  if (!message) return null;
  return <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{message}</p>;
}

export function AdminStatGrid({
  items,
}: {
  items: { label: string; value: string | number }[];
}) {
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((i) => (
        <AdminSurface key={i.label} className="!p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-[#8E8E93]">{i.label}</div>
          <div className="mt-1 text-2xl font-extrabold">{i.value}</div>
        </AdminSurface>
      ))}
    </div>
  );
}

export function useClientFilter<T>(rows: T[], query: string, keys: (keyof T)[]) {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)),
    );
  }, [rows, query, keys]);
}

export function AdminComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader title={title} subtitle={description} />
      <div className="rounded-2xl border border-dashed border-[#FF5A5F]/30 bg-white p-10 text-center shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFE8EA] text-2xl text-[#FF5A5F]">
          ✎
        </div>
        <h2 className="text-lg font-extrabold">Coming soon</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#8E8E93]">
          This section is wired into the Stampza Admin Panel navigation.
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#FF5A5F] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(255,90,95,0.3)]"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export function fmtDate(iso?: string | Date | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
