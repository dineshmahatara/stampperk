'use client';

import { usePreferences } from '@/lib/preferences';
import type { AppLocale } from '@/i18n';
import { useTranslation } from 'react-i18next';

/** Compact language switcher for dashboard/admin headers */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t } = useTranslation('common');
  const { locale, setLocale, languages } = usePreferences();

  return (
    <label className={`inline-flex items-center gap-2 ${className}`}>
      <span className="sr-only">{t('language')}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as AppLocale)}
        className="rounded-full border border-[var(--stampperk-line)] bg-[var(--stampperk-surface)] px-3 py-2 text-sm font-semibold text-[var(--stampperk-ink)] shadow-sm outline-none focus:ring-2 focus:ring-[var(--stampperk-coral)]/30"
        aria-label={t('language')}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code} dir={lang.dir}>
            {lang.native || lang.label}
            {lang.dir === 'rtl' ? ' (RTL)' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
