'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SiteControls } from '@/components/SiteControls';
import { BrandMark } from '@/components/BrandMark';

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState(null, '', `#${id}`);
  return true;
}

export function MarketingHeader({ active = '' }: { active?: string }) {
  const { t } = useTranslation('common');
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Smooth-scroll when landing on home with a hash (e.g. from /pricing → /#faq)
  useEffect(() => {
    if (pathname !== '/') return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    const timer = window.setTimeout(() => scrollToId(hash), 80);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const linkClass = (id: string) =>
    `text-sm font-semibold transition md:text-base ${
      active === id
        ? 'text-[var(--stampz-coral)]'
        : 'text-[var(--stampz-muted)] hover:text-[var(--stampz-ink)]'
    }`;

  const onSectionClick = (e: React.MouseEvent, id: string) => {
    setMenuOpen(false);
    if (pathname === '/') {
      e.preventDefault();
      scrollToId(id);
      return;
    }
    // Navigate home first; effect above will smooth-scroll to the hash
    e.preventDefault();
    router.push(`/#${id}`);
  };

  const navItems = [
    { href: '/#product', id: 'product', label: t('product') },
    { href: '/#how', id: 'how', label: t('howItWorks') },
    { href: '/#pricing', id: 'pricing', label: t('pricing') },
    { href: '/#faq', id: 'faq', label: t('faq') },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'border-b border-[var(--stampz-line)] bg-[var(--stampz-surface)]/95 shadow-[0_8px_30px_rgba(28,25,23,0.08)] backdrop-blur-xl'
          : 'border-b border-transparent bg-[var(--stampz-cream)]/80 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5 md:px-6 md:py-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
          <BrandMark href="" tone="light" className="!gap-2" />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={linkClass(item.id)}
              onClick={(e) => onSectionClick(e, item.id)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <SiteControls />
          <Link
            href="/login"
            className="hidden rounded-full border border-[var(--stampz-line)] bg-[var(--stampz-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--stampz-ink)] sm:inline-flex"
          >
            {t('login')}
          </Link>
          <Link href="/login" className="btn-primary !px-4 !py-2.5 text-sm sm:text-base">
            {t('businessLogin')} →
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--stampz-line)] bg-[var(--stampz-surface)] text-lg lg:hidden"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-[var(--stampz-line)] bg-[var(--stampz-surface)] px-5 py-4 lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={linkClass(item.id)}
                onClick={(e) => onSectionClick(e, item.id)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
