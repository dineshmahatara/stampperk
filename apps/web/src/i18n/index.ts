'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { localeDirection, type TextDirection } from '@stampperk/shared';

import en from '@/locales/en/common.json';
import ne from '@/locales/ne/common.json';
import hi from '@/locales/hi/common.json';
import es from '@/locales/es/common.json';
import fr from '@/locales/fr/common.json';
import de from '@/locales/de/common.json';
import zh from '@/locales/zh/common.json';
import ar from '@/locales/ar/common.json';
import he from '@/locales/he/common.json';

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English', native: 'English', dir: 'ltr' as TextDirection },
  { code: 'ne', label: 'Nepali', native: 'नेपाली', dir: 'ltr' as TextDirection },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', dir: 'ltr' as TextDirection },
  { code: 'es', label: 'Spanish', native: 'Español', dir: 'ltr' as TextDirection },
  { code: 'fr', label: 'French', native: 'Français', dir: 'ltr' as TextDirection },
  { code: 'de', label: 'German', native: 'Deutsch', dir: 'ltr' as TextDirection },
  { code: 'zh', label: 'Chinese', native: '中文', dir: 'ltr' as TextDirection },
  { code: 'ar', label: 'Arabic', native: 'العربية', dir: 'rtl' as TextDirection },
  { code: 'he', label: 'Hebrew', native: 'עברית', dir: 'rtl' as TextDirection },
] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]['code'];

export function getLocaleMeta(code?: string | null) {
  const base = (code || 'en').split('-')[0].toLowerCase();
  return SUPPORTED_LOCALES.find((l) => l.code === base) || SUPPORTED_LOCALES[0];
}

export function getLocaleDir(code?: string | null): TextDirection {
  return getLocaleMeta(code).dir || localeDirection(code);
}

const resources = {
  en: { common: en },
  ne: { common: ne },
  hi: { common: hi },
  es: { common: es },
  fr: { common: fr },
  de: { common: de },
  zh: { common: zh },
  ar: { common: ar },
  he: { common: he },
};

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en',
      supportedLngs: SUPPORTED_LOCALES.map((l) => l.code),
      ns: ['common'],
      defaultNS: 'common',
      interpolation: { escapeValue: false },
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: 'stampperk_i18nextLng',
        caches: ['localStorage'],
      },
      react: { useSuspense: false },
    });
}

export default i18n;
