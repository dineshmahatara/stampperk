'use client';

import { usePreferences } from '@/lib/preferences';
import type { AppLocale } from '@/i18n';
import { useTranslation } from 'react-i18next';

const LANGUAGE_OPTIONS: { code: AppLocale; label: string; native: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'English', native: 'English', dir: 'ltr' },
  { code: 'ne', label: 'Nepali', native: 'नेपाली', dir: 'ltr' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', dir: 'ltr' },
  { code: 'es', label: 'Spanish', native: 'Español', dir: 'ltr' },
  { code: 'fr', label: 'French', native: 'Français', dir: 'ltr' },
  { code: 'de', label: 'German', native: 'Deutsch', dir: 'ltr' },
  { code: 'zh', label: 'Chinese', native: '中文', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', native: 'العربية', dir: 'rtl' },
  { code: 'he', label: 'Hebrew', native: 'עברית', dir: 'rtl' },
];

/** Compact language switcher for dashboard/admin headers */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t } = useTranslation('common');
  const { locale, setLocale } = usePreferences();

  return (
    <label className={`inline-flex items-center gap-2 ${className}`}>
      <span className="sr-only">{t('language')}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as AppLocale)}
        className="rounded-full border border-[var(--stampperk-line)] bg-[var(--stampperk-surface)] px-3 py-2 text-sm font-semibold text-[var(--stampperk-ink)] shadow-sm outline-none focus:ring-2 focus:ring-[var(--stampperk-coral)]/30"
        aria-label={t('language')}
      >
        {LANGUAGE_OPTIONS.map((lang) => (
          <option key={lang.code} value={lang.code} dir={lang.dir}>
            {lang.native || lang.label}
            {lang.dir === 'rtl' ? ' (RTL)' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
