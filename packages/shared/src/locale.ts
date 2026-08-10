/** Text direction for UI layout. */
export type TextDirection = 'ltr' | 'rtl';

/** ISO language codes that read right-to-left. */
export const RTL_LOCALE_CODES = ['ar', 'he', 'fa', 'ur'] as const;

export type RtlLocaleCode = (typeof RTL_LOCALE_CODES)[number];

export function normalizeLocaleCode(lng?: string | null): string {
  return (lng || 'en').split('-')[0].toLowerCase();
}

export function isRtlLocale(lng?: string | null): boolean {
  const code = normalizeLocaleCode(lng);
  return (RTL_LOCALE_CODES as readonly string[]).includes(code);
}

export function localeDirection(lng?: string | null): TextDirection {
  return isRtlLocale(lng) ? 'rtl' : 'ltr';
}
