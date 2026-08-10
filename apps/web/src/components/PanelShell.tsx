'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { BrandMark } from '@/components/BrandMark';
import { EntityAvatar } from '@/components/EntityAvatar';

export type PanelNavLink = { href: string; label: string; icon?: string };

type PanelShellProps = {
  brandHref?: string;
  brandLabel?: string;
  roleLabel?: string;
  email?: string | null;
  userName?: string | null;
  photoUrl?: string | null;
  links: PanelNavLink[];
  onLogout: () => void;
  children: React.ReactNode;
};

function NavIcon({ name }: { name: string }) {
  const common = 'h-[18px] w-[18px]';
  const icons: Record<string, React.ReactNode> = {
    home: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" />
      </svg>
    ),
    discover: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M14.5 9.5l-2 5-5 2 2-5 5-2z" />
      </svg>
    ),
    qr: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" />
        <path d="M7 12h10" />
      </svg>
    ),
    profile: (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 19a7 7 0 0114 0" />
      </svg>
    ),
  };
  return <>{icons[name] || icons.home}</>;
}

function iconForHref(href: string) {
  if (href.includes('discover')) return 'discover';
  if (href.includes('/qr')) return 'qr';
  if (href.includes('settings') || href.includes('profile')) return 'profile';
  return 'home';
}

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/dashboard/discover' || href === '/discover') {
    return pathname === '/dashboard/discover' || pathname === '/discover' || pathname.startsWith('/discover/');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PanelShell({
  brandHref = '/dashboard',
  roleLabel,
  email,
  userName,
  photoUrl,
  links,
  onLogout,
  children,
}: PanelShellProps) {
  const { t } = useTranslation('common');
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const pageTitle = useMemo(
    () => links.find((l) => isActive(pathname, l.href))?.label || 'Home',
    [links, pathname],
  );
  const displayName = userName || email || 'Customer';

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
        <BrandMark href={brandHref} tone="light" />
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
            <BrandMark href={brandHref} tone="dark" subtitle="Customer Dashboard" />
          </div>

          {roleLabel && (
            <div className="mx-3 mb-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-white/40">Mode</div>
              <div className="truncate text-xs font-semibold text-white/80">{roleLabel}</div>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto px-2.5 pb-3">
            <div className="mb-1 px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
              Menu
            </div>
            <div className="space-y-px">
              {links.map((item) => {
                const active = isActive(pathname, item.href);
                const icon = item.icon || iconForHref(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition ${
                      active
                        ? 'bg-gradient-to-r from-[#FF5A5F] to-[#FF7A8A] text-white shadow-[0_6px_14px_rgba(255,90,95,0.3)]'
                        : 'text-white/65 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <NavIcon name={icon} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
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
              onClick={() => {
                onLogout();
                router.push('/');
              }}
              className="w-full rounded-lg px-3 py-1.5 text-xs font-bold text-[#FF8A8E] hover:bg-white/5"
            >
              {t('panel.logout')}
              {email ? ` · ${email}` : ''}
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="sticky top-0 z-30 hidden items-center justify-between gap-4 border-b border-black/5 bg-white/90 px-6 py-3.5 backdrop-blur-xl lg:flex">
            <div className="text-sm font-semibold text-[#8E8E93]">{pageTitle}</div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/discover"
                className="inline-flex items-center gap-2 rounded-xl border border-black/8 bg-white px-3 py-2 text-sm font-bold text-[#1C1C1E] hover:bg-[#F4F5F7]"
              >
                Discover
              </Link>
              <div className="flex items-center gap-2 rounded-xl border border-black/6 bg-white px-3 py-2">
                <EntityAvatar src={photoUrl} name={displayName} size="sm" rounded="lg" />
                <span className="max-w-[140px] truncate text-sm font-bold">{displayName}</span>
              </div>
              <LanguageSwitcher />
            </div>
          </div>

          <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
