'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import i18n, { AppLocale, SUPPORTED_LOCALES, getLocaleDir } from '@/i18n';

export type ThemeMode = 'light' | 'dark' | 'soft';
export type FontScale = 'md' | 'lg' | 'xl';

type Preferences = {
  theme: ThemeMode;
  locale: AppLocale;
  fontScale: FontScale;
  dir: 'ltr' | 'rtl';
  setTheme: (t: ThemeMode) => void;
  setLocale: (l: AppLocale) => void;
  setFontScale: (s: FontScale) => void;
  ready: boolean;
  languages: typeof SUPPORTED_LOCALES;
};

const PreferencesContext = createContext<Preferences | null>(null);

const STORAGE_KEY = 'stampperk_prefs_v2';

function applyDom(theme: ThemeMode, locale: string, fontScale: FontScale) {
  const root = document.documentElement;
  const dir = getLocaleDir(locale);
  root.dataset.theme = theme;
  root.dataset.fontScale = fontScale;
  root.lang = locale;
  root.dir = dir;
  root.dataset.dir = dir;
  root.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
}

function normalizeLocale(lng?: string | null): AppLocale {
  const base = (lng || 'en').split('-')[0].toLowerCase();
  const match = SUPPORTED_LOCALES.find((l) => l.code === base);
  return (match?.code || 'en') as AppLocale;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [fontScale, setFontScaleState] = useState<FontScale>('lg');
  const [locale, setLocaleState] = useState<AppLocale>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let nextTheme: ThemeMode = 'light';
      let nextScale: FontScale = 'lg';
      let nextLocale = normalizeLocale(i18n.language);

      if (raw) {
        const parsed = JSON.parse(raw) as Partial<{
          theme: ThemeMode;
          fontScale: FontScale;
          locale: AppLocale;
        }>;
        if (parsed.theme) nextTheme = parsed.theme;
        if (parsed.fontScale) nextScale = parsed.fontScale;
        if (parsed.locale) nextLocale = normalizeLocale(parsed.locale);
      }

      setThemeState(nextTheme);
      setFontScaleState(nextScale);
      setLocaleState(nextLocale);
      void i18n.changeLanguage(nextLocale);
      applyDom(nextTheme, nextLocale, nextScale);
    } catch {
      applyDom('light', 'en', 'lg');
    }
    setReady(true);

    const onLang = (lng: string) => {
      const normalized = normalizeLocale(lng);
      setLocaleState(normalized);
      document.documentElement.lang = normalized;
      document.documentElement.dir = getLocaleDir(normalized);
      document.documentElement.dataset.dir = getLocaleDir(normalized);
    };
    i18n.on('languageChanged', onLang);
    return () => {
      i18n.off('languageChanged', onLang);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyDom(theme, locale, fontScale);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, fontScale, locale }));
  }, [theme, locale, fontScale, ready]);

  const setTheme = useCallback((t: ThemeMode) => setThemeState(t), []);
  const setFontScale = useCallback((s: FontScale) => setFontScaleState(s), []);
  const setLocale = useCallback((l: AppLocale) => {
    setLocaleState(l);
    void i18n.changeLanguage(l);
  }, []);

  const value = useMemo<Preferences>(
    () => ({
      theme,
      locale,
      fontScale,
      dir: getLocaleDir(locale),
      setTheme,
      setLocale,
      setFontScale,
      ready,
      languages: SUPPORTED_LOCALES,
    }),
    [theme, locale, fontScale, setTheme, setLocale, setFontScale, ready],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences requires PreferencesProvider');
  return ctx;
}
