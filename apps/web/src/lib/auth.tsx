'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { api, AuthUser } from './api';
import {
  AppMode,
  canSwitchToCustomerMode,
  canUseBusinessMode,
  effectiveExperience,
  getStoredAppMode,
  setStoredAppMode,
} from './appMode';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  /** UI experience mode — merchants may choose customer; customers cannot choose business. */
  appMode: AppMode;
  experience: 'customer' | 'merchant' | 'admin';
  setAppMode: (mode: AppMode) => void;
  login: (
    email: string,
    password: string,
    extras?: {
      captchaId?: string;
      captchaAnswer?: string;
      deviceName?: string;
      deviceType?: 'web' | 'ios' | 'android' | 'desktop' | 'unknown';
    },
  ) => Promise<{ emailVerified?: boolean; suspicious?: boolean; verifyUrl?: string }>;
  register: (payload: {
    email: string;
    password: string;
    name: string;
    role?: 'CUSTOMER' | 'MERCHANT_OWNER';
    referralCode?: string;
    referralMerchantId?: string;
    referralProgramId?: string;
    deviceName?: string;
    deviceType?: 'web' | 'ios' | 'android' | 'desktop' | 'unknown';
  }) => Promise<{ emailVerified?: boolean; verifyUrl?: string; verifyToken?: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [appMode, setAppModeState] = useState<AppMode>('customer');

  useEffect(() => {
    const t = localStorage.getItem('stampperk_token');
    const u = localStorage.getItem('stampperk_user');
    if (t) setToken(t);
    if (u) {
      const parsed = JSON.parse(u) as AuthUser;
      setUser(parsed);
      setAppModeState(getStoredAppMode(parsed.role));
    }
    setLoading(false);
    if (t) {
      api<AuthUser & { photoUrl?: string | null }>('/auth/me', { token: t })
        .then((me) => {
          const next = {
            id: me.id,
            email: me.email,
            name: me.name,
            role: me.role,
            qrToken: me.qrToken,
            emailVerified: me.emailVerified,
            photoUrl: me.photoUrl,
          };
          localStorage.setItem('stampperk_user', JSON.stringify(next));
          setUser(next);
        })
        .catch(() => undefined);
    }
  }, []);

  const setAppMode = useCallback(
    (mode: AppMode) => {
      const role = user?.role;
      if (mode === 'business' && !canUseBusinessMode(role)) {
        return;
      }
      if (mode === 'customer' && role && !canSwitchToCustomerMode(role) && role !== 'CUSTOMER') {
        return;
      }
      const next = setStoredAppMode(role, mode);
      setAppModeState(next);
    },
    [user?.role],
  );

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      loading,
      appMode,
      experience: effectiveExperience(user?.role, appMode),
      setAppMode,
      async login(email, password, extras) {
        const res = await api<{
          accessToken: string;
          user: AuthUser;
          emailVerified?: boolean;
          suspicious?: boolean;
        }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            deviceName: extras?.deviceName || (typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'Web'),
            deviceType: extras?.deviceType || 'web',
            captchaId: extras?.captchaId,
            captchaAnswer: extras?.captchaAnswer,
          }),
        });
        localStorage.setItem('stampperk_token', res.accessToken);
        localStorage.setItem('stampperk_user', JSON.stringify(res.user));
        setToken(res.accessToken);
        setUser(res.user);
        setAppModeState(getStoredAppMode(res.user.role));
        return { emailVerified: res.emailVerified, suspicious: res.suspicious };
      },
      async register(payload) {
        const res = await api<{
          accessToken: string;
          user: AuthUser;
          emailVerified?: boolean;
          verifyUrl?: string;
          verifyToken?: string;
        }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            ...payload,
            deviceName: payload.deviceName || (typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'Web'),
            deviceType: payload.deviceType || 'web',
          }),
        });
        localStorage.setItem('stampperk_token', res.accessToken);
        localStorage.setItem('stampperk_user', JSON.stringify(res.user));
        setToken(res.accessToken);
        setUser(res.user);
        setAppModeState(getStoredAppMode(res.user.role));
        try {
          const { clearReferral } = await import('./referral');
          clearReferral();
        } catch {
          /* ignore */
        }
        return {
          emailVerified: res.emailVerified,
          verifyUrl: res.verifyUrl,
          verifyToken: res.verifyToken,
        };
      },
      logout() {
        localStorage.removeItem('stampperk_token');
        localStorage.removeItem('stampperk_user');
        setToken(null);
        setUser(null);
        setAppModeState('customer');
      },
    }),
    [token, user, loading, appMode, setAppMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth requires AuthProvider');
  return ctx;
}
