'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { BrandMark } from '@/components/BrandMark';
import { EntityAvatar } from '@/components/EntityAvatar';

export type MerchantNavItem = {
  href: string;
  label: string;
  icon: string;
};

export type MerchantNavGroup = {
  title: string;
  items: MerchantNavItem[];
};

export type BusinessOption = {
  id: string;
  businessName: string;
  city?: string | null;
  plan?: string;
  logoUrl?: string | null;
};

type MerchantShellProps = {
  businessName?: string | null;
  city?: string | null;
  country?: string | null;
  slug?: string | null;
  email?: string | null;
  businesses?: BusinessOption[];
  activeBusinessId?: string | null;
  onSwitchBusiness?: (id: string) => void;
  businessesLimit?: number;
  groups: MerchantNavGroup[];
  onLogout: () => void;
  children: React.ReactNode;
};

function NavIcon({ name }: { name: string }) {
  const common = 'h-[18px] w-[18px]';
  const icons: Record<string, React.ReactNode> = {
    dashboard: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
    card: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2.5" y="5" width="19" height="14" rx="2" />
        <path d="M2.5 10h19" />
      </svg>
    ),
    stamp: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M8 14h8l1 6H7l1-6z" />
      </svg>
    ),
    users: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3.5 19a5.5 5.5 0 0111 0" />
        <circle cx="17" cy="9" r="2.5" />
      </svg>
    ),
    gift: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="10" width="18" height="11" rx="1.5" />
        <path d="M12 10v11M3 14h18" />
      </svg>
    ),
    promo: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 9l8-5 8 5v8a2 2 0 01-2 2H6a2 2 0 01-2-2V9z" />
      </svg>
    ),
    scan: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" />
        <path d="M7 12h10" />
      </svg>
    ),
    bell: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9a6 6 0 0112 0c0 7 3 7 3 7H3s3 0 3-7" />
        <path d="M10 19a2 2 0 004 0" />
      </svg>
    ),
    branch: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <circle cx="12" cy="18" r="2.5" />
        <path d="M8 7.5l3 8M16 7.5l-3 8" />
      </svg>
    ),
    staff: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="3.5" />
      </svg>
    ),
    store: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l1.5-5h15L21 9" />
        <path d="M4 9v10h16V9" />
      </svg>
    ),
    billing: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h4" />
      </svg>
    ),
    chart: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19V5M10 19V9M16 19v-6M22 19H2" />
      </svg>
    ),
    export: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v12M8 11l4 4 4-4M4 19h16" />
      </svg>
    ),
    coupon: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 00-2 2 2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2 2 2 0 00-2-2V9z" />
      </svg>
    ),
    megaphone: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11l14-6v14L3 13v-2zM17 8a4 4 0 010 8" />
      </svg>
    ),
  };
  return <>{icons[name] || icons.dashboard}</>;
}

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-[#FF5A5F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function BusinessSwitcher({
  tone,
  variant = 'full',
  businesses,
  activeBusinessId,
  businessName,
  location,
  businessesLimit,
  canAddMore,
  onSwitchBusiness,
  align = 'left',
}: {
  tone: 'dark' | 'light';
  variant?: 'full' | 'compact';
  businesses: BusinessOption[];
  activeBusinessId?: string | null;
  businessName?: string | null;
  location: string;
  businessesLimit: number;
  canAddMore: boolean;
  onSwitchBusiness?: (id: string) => void;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active =
    businesses.find((b) => b.id === activeBusinessId) ||
    businesses.find((b) => b.businessName === businessName) ||
    businesses[0];
  const displayName = active?.businessName || businessName || 'Your business';
  const logoUrl = active?.logoUrl;
  const plan = active?.plan;
  const switchable = businesses.length > 1 || canAddMore;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(id: string) {
    if (id === activeBusinessId) {
      setOpen(false);
      return;
    }
    onSwitchBusiness?.(id);
    setOpen(false);
  }

  const isDark = tone === 'dark';
  const trigger =
    variant === 'compact'
      ? isDark
        ? 'flex max-w-[160px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-left hover:bg-white/10'
        : 'flex max-w-[180px] items-center gap-2 rounded-xl border border-black/6 bg-white px-2.5 py-2 text-left hover:bg-[#F4F5F7]'
      : isDark
        ? 'flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2.5 text-left transition hover:bg-white/10'
        : 'flex items-center gap-2 rounded-xl border border-black/6 bg-white px-3 py-2 text-left transition hover:bg-[#F4F5F7]';

  const nameCls = isDark ? 'truncate text-sm font-bold text-white' : 'truncate text-sm font-bold text-[#1C1C1E]';
  const subCls = isDark ? 'truncate text-[11px] text-white/45' : 'truncate text-[11px] text-[#8E8E93]';
  const chevronCls = isDark ? 'text-white/50' : 'text-[#8E8E93]';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch business"
        onClick={() => (switchable ? setOpen((v) => !v) : undefined)}
        disabled={!switchable}
      >
        <EntityAvatar
          src={logoUrl}
          name={displayName}
          size={variant === 'compact' ? 'sm' : 'md'}
          rounded={variant === 'compact' ? 'lg' : 'xl'}
          className={
            isDark && !logoUrl
              ? 'bg-gradient-to-br from-[#FF5A5F] to-[#FF8A8E] text-white'
              : undefined
          }
        />
        <span className="min-w-0 flex-1">
          <span className={`block ${nameCls}`}>{displayName}</span>
          {variant === 'full' && (
            <span className={`block ${subCls}`}>
              {plan ? `${plan}` : location}
              {businesses.length > 0 ? ` · ${businesses.length}/${businessesLimit}` : ''}
            </span>
          )}
        </span>
        {switchable && (
          <span className={chevronCls}>
            <Chevron open={open} />
          </span>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute z-[60] mt-2 max-h-[min(70vh,360px)] w-[min(100vw-2rem,280px)] overflow-hidden rounded-2xl border shadow-2xl ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${
            isDark
              ? 'border-white/10 bg-[#12151C] text-white'
              : 'border-black/8 bg-white text-[#1C1C1E]'
          }`}
        >
          <div
            className={`flex items-center justify-between gap-2 border-b px-3 py-2.5 ${
              isDark ? 'border-white/8' : 'border-black/6'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wide ${isDark ? 'text-white/40' : 'text-[#8E8E93]'}`}>
              Business ({businesses.length}/{businessesLimit})
            </span>
            {canAddMore && (
              <Link
                href="/dashboard/profile?add=1"
                className="text-[11px] font-bold text-[#FF5A5F] hover:underline"
                onClick={() => setOpen(false)}
              >
                + Add
              </Link>
            )}
          </div>

          <div className="max-h-[260px] overflow-y-auto p-1.5">
            {businesses.length === 0 ? (
              <div className={`px-3 py-4 text-center text-sm ${isDark ? 'text-white/50' : 'text-[#8E8E93]'}`}>
                No businesses yet
              </div>
            ) : (
              businesses.map((b) => {
                const selected = b.id === (activeBusinessId || active?.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                      selected
                        ? isDark
                          ? 'bg-white/10'
                          : 'bg-[#FFF1F3]'
                        : isDark
                          ? 'hover:bg-white/5'
                          : 'hover:bg-[#F4F5F7]'
                    }`}
                    onClick={() => pick(b.id)}
                  >
                    <EntityAvatar src={b.logoUrl} name={b.businessName} size="sm" rounded="lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{b.businessName}</span>
                      <span className={`block truncate text-[11px] ${isDark ? 'text-white/45' : 'text-[#8E8E93]'}`}>
                        {[b.city, b.plan].filter(Boolean).join(' · ') || 'Business'}
                      </span>
                    </span>
                    {selected && <CheckIcon />}
                  </button>
                );
              })
            )}
          </div>

          {canAddMore && (
            <div className={`border-t p-1.5 ${isDark ? 'border-white/8' : 'border-black/6'}`}>
              <Link
                href="/dashboard/profile?add=1"
                className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-bold text-[#FF5A5F] ${
                  isDark ? 'hover:bg-white/5' : 'hover:bg-[#FFF1F3]'
                }`}
                onClick={() => setOpen(false)}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-[#FF5A5F]/40 text-base">
                  +
                </span>
                Add business
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MerchantShell({
  businessName,
  city,
  country,
  slug,
  email,
  businesses = [],
  activeBusinessId,
  onSwitchBusiness,
  businessesLimit = 1,
  groups,
  onLogout,
  children,
}: MerchantShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const canAddMore = businesses.length < businessesLimit;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const location = [city, country].filter(Boolean).join(', ') || 'Your business';
  const storeHref = slug ? `/b/${slug}` : '/';

  const flatLinks = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const pageTitle = flatLinks.find((l) => isActive(pathname, l.href))?.label || 'Overview';

  const switcherProps = {
    businesses,
    activeBusinessId,
    businessName,
    location,
    businessesLimit,
    canAddMore,
    onSwitchBusiness,
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#1C1C1E]">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-black/5 bg-white/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '✕' : '☰'}
        </button>
        <div className="min-w-0 flex-1">
          <BusinessSwitcher {...switcherProps} tone="light" variant="compact" align="left" />
        </div>
        <LanguageSwitcher />
      </header>

      <div className="lg:grid lg:grid-cols-[268px_1fr]">
        {open && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[min(88vw,268px)] flex-col bg-[#1B1F2A] text-white shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:w-auto lg:translate-x-0 lg:self-start lg:shadow-none ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex shrink-0 px-4 pb-3 pt-5">
            <BrandMark href="/dashboard" tone="dark" subtitle="Merchant Dashboard" />
          </div>

          <nav className="flex-1 overflow-y-auto px-2.5 pb-3">
            {groups.map((group) => (
              <div key={group.title} className="mb-2.5">
                <div className="mb-1 px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                  {group.title}
                </div>
                <div className="space-y-px">
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition ${
                          active
                            ? 'bg-gradient-to-r from-[#FF5A5F] to-[#FF7A8A] text-white shadow-[0_6px_14px_rgba(255,90,95,0.3)]'
                            : 'text-white/65 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <NavIcon name={item.icon} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="shrink-0 space-y-1.5 border-t border-white/8 p-3">
            <Link
              href="/dashboard/settings"
              className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/5"
            >
              Help & Support
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="w-full rounded-lg px-3 py-1.5 text-xs font-bold text-[#FF8A8E] hover:bg-white/5"
            >
              Sign out · {email}
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="sticky top-0 z-30 hidden items-center justify-between gap-4 border-b border-black/5 bg-white/90 px-6 py-3.5 backdrop-blur-xl lg:flex">
            <div className="text-sm font-semibold text-[#8E8E93]">{pageTitle}</div>
            <div className="flex items-center gap-2">
              <Link
                href={storeHref}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-xl border border-black/8 bg-white px-3 py-2 text-sm font-bold text-[#1C1C1E] hover:bg-[#F4F5F7]"
              >
                Visit Store
                <span aria-hidden>↗</span>
              </Link>
              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-black/6 bg-white"
                aria-label="Notifications"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9a6 6 0 0112 0c0 7 3 7 3 7H3s3 0 3-7" />
                  <path d="M10 19a2 2 0 004 0" />
                </svg>
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF5A5F] px-1 text-[10px] font-bold text-white">
                  6
                </span>
              </button>
              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-black/6 bg-white"
                aria-label="Messages"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16v10H7l-3 3V6z" />
                </svg>
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF5A5F] px-1 text-[10px] font-bold text-white">
                  3
                </span>
              </button>
              <BusinessSwitcher {...switcherProps} tone="light" variant="compact" align="right" />
              <LanguageSwitcher />
            </div>
          </div>

          <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
