'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { BrandMark } from '@/components/BrandMark';
import { EntityAvatar } from '@/components/EntityAvatar';
import { api } from '@/lib/api';

export type AdminNavItem = {
  href: string;
  label: string;
  icon: string;
};

export type AdminNavGroup = {
  title: string;
  items: AdminNavItem[];
};

type AdminShellProps = {
  token?: string | null;
  email?: string | null;
  name?: string | null;
  photoUrl?: string | null;
  groups: AdminNavGroup[];
  onLogout: () => void;
  children: React.ReactNode;
};

type AdminNotif = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  dataJson?: { href?: string } | null;
};

function NavIcon({ name }: { name: string }) {
  const common = 'h-[18px] w-[18px]';
  switch (name) {
    case 'dashboard':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case 'store':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l1.5-5h15L21 9" />
          <path d="M4 9v10a1 1 0 001 1h4v-5h6v5h4a1 1 0 001-1V9" />
        </svg>
      );
    case 'map':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
          <path d="M9 3v15M15 6v15" />
        </svg>
      );
    case 'users':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M3.5 19a5.5 5.5 0 0111 0" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M15 19a4.5 4.5 0 015.5-4.3" />
        </svg>
      );
    case 'card':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2.5" y="5" width="19" height="14" rx="2" />
          <path d="M2.5 10h19" />
        </svg>
      );
    case 'billing':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18M7 15h4" />
        </svg>
      );
    case 'gift':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="10" width="18" height="11" rx="1.5" />
          <path d="M12 10v11M3 14h18M12 10c-2-3-5-4-5-2.5S9 10 12 10c3 0 5-1.5 5-3S14 7 12 10z" />
        </svg>
      );
    case 'chart':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19V5M10 19V9M16 19v-6M22 19H2" />
        </svg>
      );
    case 'settings':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
    case 'support':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 015 1c0 1.5-2.5 2-2.5 3.5M12 17h.01" />
        </svg>
      );
    case 'staff':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="3.5" />
          <path d="M22 21v-2a3.5 3.5 0 00-2.5-3.3M16.5 3.7a3.5 3.5 0 010 6.6" />
        </svg>
      );
    case 'tx':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 7h12l-2-2M19 7l-2 2M17 17H5l2 2M5 17l2-2" />
        </svg>
      );
    case 'promo':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 9l8-5 8 5v8a2 2 0 01-2 2H6a2 2 0 01-2-2V9z" />
          <path d="M9 22V12h6v10" />
        </svg>
      );
    case 'activity':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12h4l2-6 4 12 2-6h4" />
        </svg>
      );
    case 'stamp':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M8 14h8l1 6H7l1-6z" />
        </svg>
      );
    default:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ token, email, name, photoUrl, groups, onLogout, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [bellOpen, setBellOpen] = useState(false);
  const [items, setItems] = useState<AdminNotif[]>([]);
  const [unread, setUnread] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const bellRef = useRef<HTMLDivElement>(null);

  const loadNotifs = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api<{ items: AdminNotif[]; unread: number; openTickets: number }>(
        '/admin/notifications',
        { token },
      );
      setItems(data.items || []);
      setUnread(data.unread || 0);
      setOpenTickets(data.openTickets || 0);
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    void loadNotifs();
    const t = setInterval(() => void loadNotifs(), 45000);
    return () => clearInterval(t);
  }, [loadNotifs]);

  useEffect(() => {
    setOpen(false);
    setBellOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!bellRef.current?.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const flatLinks = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const pageTitle =
    flatLinks.find((l) => isActive(pathname, l.href))?.label || 'Dashboard';

  async function openNotif(n: AdminNotif) {
    if (!token) return;
    if (!n.read) {
      await api(`/admin/notifications/${n.id}/read`, { method: 'PATCH', token }).catch(() => undefined);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    const href = (n.dataJson && typeof n.dataJson === 'object' && n.dataJson.href) || '/admin';
    setBellOpen(false);
    router.push(href);
  }

  async function markAll() {
    if (!token) return;
    await api('/admin/notifications/read-all', { method: 'POST', token }).catch(() => undefined);
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#1C1C1E]">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-black/5 bg-white/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/8 bg-white"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '✕' : '☰'}
        </button>
        <BrandMark href="/admin" tone="light" />
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
            <BrandMark href="/admin" tone="dark" subtitle="Admin Panel" />
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
                            : 'text-white/65 hover:bg-white/6 hover:text-white'
                        }`}
                      >
                        <span className={active ? 'opacity-100' : 'opacity-70'}>
                          <NavIcon name={item.icon} />
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="shrink-0 border-t border-white/8 p-3">
            <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-2.5 py-2">
              <EntityAvatar
                src={photoUrl}
                name={name || email || 'A'}
                size="sm"
                rounded="full"
                className={!photoUrl ? 'bg-gradient-to-br from-[#FF5A5F] to-[#FF8A8E] text-white' : undefined}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{name || 'Admin User'}</div>
                <div className="truncate text-[11px] text-white/45">Super Admin</div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg px-2 py-1 text-[11px] font-bold text-[#FF8A8E] hover:bg-white/8"
              >
                Out
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="sticky top-0 z-30 hidden items-center gap-4 border-b border-black/5 bg-white/90 px-6 py-3.5 backdrop-blur-xl lg:flex">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3-3" />
                </svg>
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anything..."
                className="w-full rounded-xl border border-black/6 bg-[#F4F5F7] py-2.5 pl-10 pr-16 text-sm outline-none ring-[#FF5A5F]/30 placeholder:text-[#8E8E93] focus:ring-2"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-black/8 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#8E8E93]">
                ⌘ K
              </kbd>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={bellRef}>
                <button
                  type="button"
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-black/6 bg-white text-[#1C1C1E]"
                  aria-label="Notifications"
                  onClick={() => {
                    setBellOpen((v) => !v);
                    void loadNotifs();
                  }}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9a6 6 0 0112 0c0 7 3 7 3 7H3s3 0 3-7" />
                    <path d="M10 19a2 2 0 004 0" />
                  </svg>
                  {unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF5A5F] px-1 text-[10px] font-bold text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
                {bellOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-[360px] overflow-hidden rounded-2xl border border-black/8 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-black/5 px-3 py-2.5">
                      <div className="text-sm font-extrabold">Alerts</div>
                      <button
                        type="button"
                        className="text-xs font-bold text-[#FF5A5F]"
                        onClick={() => void markAll()}
                      >
                        Mark all read
                      </button>
                    </div>
                    <ul className="max-h-[360px] overflow-y-auto">
                      {items.map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => void openNotif(n)}
                            className={`block w-full border-b border-black/4 px-3 py-2.5 text-left hover:bg-[#FFF8F7] ${
                              n.read ? 'opacity-70' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {!n.read && (
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#FF5A5F]" />
                              )}
                              <div className={n.read ? 'pl-4' : ''}>
                                <div className="text-sm font-bold">{n.title}</div>
                                <div className="text-xs text-[#8E8E93]">{n.body}</div>
                                <div className="mt-0.5 text-[10px] text-[#AEAEB2]">
                                  {new Date(n.createdAt).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                      {!items.length && (
                        <li className="px-3 py-8 text-center text-sm text-[#8E8E93]">No alerts yet.</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
              <Link
                href="/admin/support"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-black/6 bg-white text-[#1C1C1E]"
                aria-label="Support tickets"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16v10H7l-3 3V6z" />
                </svg>
                {openTickets > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF5A5F] px-1 text-[10px] font-bold text-white">
                    {openTickets > 99 ? '99+' : openTickets}
                  </span>
                )}
              </Link>
              <LanguageSwitcher />
            </div>
          </div>

          <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#8E8E93] lg:hidden">
              {pageTitle}
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
