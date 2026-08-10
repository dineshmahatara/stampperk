'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferences, ThemeMode, FontScale } from '@/lib/preferences';
import type { AppLocale } from '@/i18n';

export function SiteControls() {
  const { t } = useTranslation('common');
  const { theme, setTheme, locale, setLocale, fontScale, setFontScale, languages } =
    usePreferences();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--stampz-line)] bg-[var(--stampz-surface)] px-3 py-2 text-sm font-semibold text-[var(--stampz-ink)] shadow-sm"
        aria-expanded={open}
        aria-label={t('preferences')}
      >
        <span aria-hidden>⚙</span>
        <span className="hidden sm:inline">{t('preferences')}</span>
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-[300px] rounded-2xl border border-[var(--stampz-line)] bg-[var(--stampz-surface)] p-4 shadow-xl">
          <div className="mb-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--stampz-muted)]">
              {t('theme')}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['light', t('light')],
                  ['dark', t('dark')],
                  ['soft', t('soft')],
                ] as [ThemeMode, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={`rounded-xl px-2 py-2 text-sm font-semibold ${
                    theme === value
                      ? 'bg-[#e23d4a] text-white'
                      : 'bg-[var(--stampz-chip)] text-[var(--stampz-ink)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--stampz-muted)]">
              {t('language')}
            </div>
            <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pe-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLocale(lang.code as AppLocale)}
                  className={`rounded-xl px-2 py-2 text-start text-sm font-semibold ${
                    locale === lang.code
                      ? 'bg-[#e23d4a] text-white'
                      : 'bg-[var(--stampz-chip)] text-[var(--stampz-ink)]'
                  }`}
                  title={`${lang.label}${lang.dir === 'rtl' ? ' (RTL)' : ''}`}
                  dir={lang.dir}
                >
                  <span className="block leading-tight">{lang.native}</span>
                  <span
                    className={`block text-[10px] font-medium ${
                      locale === lang.code ? 'text-white/80' : 'text-[var(--stampz-muted)]'
                    }`}
                  >
                    {lang.label}
                    {lang.dir === 'rtl' ? ' · RTL' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--stampz-muted)]">
              {t('textSize')}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['md', t('sizeDefault')],
                  ['lg', t('sizeLarge')],
                  ['xl', t('sizeXLarge')],
                ] as [FontScale, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFontScale(value)}
                  className={`rounded-xl px-2 py-2 text-sm font-semibold ${
                    fontScale === value
                      ? 'bg-[#e23d4a] text-white'
                      : 'bg-[var(--stampz-chip)] text-[var(--stampz-ink)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
