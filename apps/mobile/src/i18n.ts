import { I18nManager, DevSettings, Platform } from 'react-native';
import { isRtlLocale, localeDirection, type TextDirection } from '@stampperk/shared';

export const strings = {
  en: {
    appName: 'Stamp Perk',
    login: 'Sign in',
    email: 'Email',
    password: 'Password',
    dashboard: 'Dashboard',
    cards: 'Cards',
    campaigns: 'Campaigns',
    marketing: 'Campaigns',
    profile: 'Profile',
    scan: 'QR Scan',
    myQr: 'My QR',
    wallet: 'Dashboard',
    discover: 'Discover',
    language: 'Language',
  },
  ne: {
    appName: 'स्टाम्पज',
    login: 'साइन इन',
    email: 'इमेल',
    password: 'पासवर्ड',
    dashboard: 'ड्यासबोर्ड',
    cards: 'कार्डहरू',
    campaigns: 'क्याम्पेन',
    marketing: 'क्याम्पेन',
    profile: 'प्रोफाइल',
    scan: 'QR स्क्यान',
    myQr: 'मेरो QR',
    wallet: 'ड्यासबोर्ड',
    discover: 'खोज्नुहोस्',
    language: 'भाषा',
  },
  ar: {
    appName: 'Stamp Perk',
    login: 'تسجيل الدخول',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    dashboard: 'لوحة التحكم',
    cards: 'البطاقات',
    campaigns: 'الحملات',
    marketing: 'الحملات',
    profile: 'الملف الشخصي',
    scan: 'مسح QR',
    myQr: 'رمز QR',
    wallet: 'لوحة التحكم',
    discover: 'اكتشف',
    language: 'اللغة',
  },
  he: {
    appName: 'Stamp Perk',
    login: 'התחברות',
    email: 'אימייל',
    password: 'סיסמה',
    dashboard: 'לוח בקרה',
    cards: 'כרטיסים',
    campaigns: 'קמפיינים',
    marketing: 'קמפיינים',
    profile: 'פרופיל',
    scan: 'סריקת QR',
    myQr: 'ה-QR שלי',
    wallet: 'לוח בקרה',
    discover: 'גלה',
    language: 'שפה',
  },
} as const;

export type Locale = keyof typeof strings;

export const LOCALE_OPTIONS: Array<{
  code: Locale;
  label: string;
  native: string;
  dir: TextDirection;
}> = [
  { code: 'en', label: 'English', native: 'English', dir: 'ltr' },
  { code: 'ne', label: 'Nepali', native: 'नेपाली', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', native: 'العربية', dir: 'rtl' },
  { code: 'he', label: 'Hebrew', native: 'עברית', dir: 'rtl' },
];

export function localeLabel(code: Locale) {
  return LOCALE_OPTIONS.find((l) => l.code === code)?.native || code;
}

/**
 * Align React Native layout direction with the active locale.
 * Returning true means a reload is recommended for full native RTL flip.
 */
export function applyLocaleDirection(locale: Locale): boolean {
  const wantRtl = isRtlLocale(locale);
  I18nManager.allowRTL(true);
  const needsReload = I18nManager.isRTL !== wantRtl;
  if (needsReload) {
    I18nManager.forceRTL(wantRtl);
  }
  return needsReload;
}

export function reloadForRtlIfNeeded(needsReload: boolean) {
  if (!needsReload) return;
  // Dev / Expo: soft reload so Yoga picks up forceRTL.
  if (Platform.OS !== 'web' && typeof DevSettings?.reload === 'function') {
    setTimeout(() => DevSettings.reload(), 80);
  }
}

export { localeDirection, isRtlLocale };
