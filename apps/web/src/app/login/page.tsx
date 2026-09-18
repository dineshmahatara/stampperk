'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, AuthUser } from '@/lib/api';
import { BrandMark } from '@/components/BrandMark';
import { useBranding } from '@/components/BrandingProvider';
import { usePreferences } from '@/lib/preferences';
import { prefetchGoogleIdentityServices, requestGoogleIdToken } from '@/lib/googleAuth';

const CORAL = '#FF5A5F';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z"
        stroke="#9CA3AF"
        strokeWidth="1.6"
      />
      <path d="m5 7 7 5 7-5" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="#9CA3AF" strokeWidth="1.6" />
      <path
        d="M8 10V8a4 4 0 1 1 8 0v2"
        stroke="#9CA3AF"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 3l18 18M10.6 10.6A2 2 0 0 0 13.4 13.4M9.9 5.1A10.5 10.5 0 0 1 12 5c5 0 9 4.5 10 7-.3.8-1 2-2.1 3.2M6.1 6.1C4.3 7.5 3.1 9.3 2 12c1 2.5 5 7 10 7 1.5 0 2.9-.3 4.1-.8"
          stroke="#9CA3AF"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"
        stroke="#9CA3AF"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="#9CA3AF" strokeWidth="1.6" />
    </svg>
  );
}

function FeatureIcon({ kind }: { kind: 'chart' | 'shield' | 'users' }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none' as const };
  if (kind === 'chart') {
    return (
      <svg {...common} aria-hidden>
        <path d="M4 19V5M4 19h16" stroke={CORAL} strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="m7 14 3.5-4 3 3L18 8"
          stroke={CORAL}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'shield') {
    return (
      <svg {...common} aria-hidden>
        <path
          d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4 0 7-4.5 7-9V6l-7-3Z"
          stroke={CORAL}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="m9.5 12 1.8 1.8 3.7-3.8" stroke={CORAL} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden>
      <circle cx="9" cy="8" r="2.5" stroke={CORAL} strokeWidth="1.8" />
      <circle cx="16" cy="9" r="2" stroke={CORAL} strokeWidth="1.8" />
      <path
        d="M3.5 18c.6-2.4 2.6-3.8 5.5-3.8s4.9 1.4 5.5 3.8M13.5 14.5c1.7-.2 3.3.5 4 2"
        stroke={CORAL}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DashboardMock() {
  return (
    <div
      className="pointer-events-none relative mx-auto mt-8 w-full max-w-[340px] origin-bottom select-none xl:mx-0 xl:mt-0 xl:mb-8"
      style={{
        transform: 'perspective(900px) translateX(8px) rotateY(-16deg) rotateX(5deg) rotateZ(1.5deg)',
      }}
      aria-hidden
    >
      <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
        <div className="flex">
          <div className="w-14 shrink-0 bg-[#1C1C1E] py-4">
            <div className="mx-auto mb-4 h-7 w-7 rounded-lg bg-[#FF5A5F]" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="mx-auto mb-3 h-2.5 w-7 rounded bg-white/15" />
            ))}
          </div>
          <div className="flex-1 space-y-3 bg-[#F7F8FA] p-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                ['18,245', 'Customers'],
                ['77,532', 'Stamps'],
                ['4,812', 'Rewards'],
              ].map(([v, l]) => (
                <div key={l} className="rounded-lg bg-white p-2 shadow-sm">
                  <div className="text-[10px] font-extrabold text-[#1C1C1E]">{v}</div>
                  <div className="text-[8px] font-semibold text-[#8E8E93]">{l}</div>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-white p-2 shadow-sm">
              <div className="mb-2 text-[9px] font-bold text-[#1C1C1E]">Stamp Transactions</div>
              <svg viewBox="0 0 200 56" className="h-14 w-full">
                <path
                  d="M0 40 C30 38, 40 20, 60 28 S100 50, 120 30 S160 10, 200 18"
                  fill="none"
                  stroke={CORAL}
                  strokeWidth="2.5"
                />
                <path
                  d="M0 40 C30 38, 40 20, 60 28 S100 50, 120 30 S160 10, 200 18 L200 56 L0 56 Z"
                  fill="rgba(255,90,95,0.12)"
                />
              </svg>
            </div>
            <div className="flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-lg bg-white p-2 shadow-sm">
                <div
                  className="h-10 w-10 rounded-full"
                  style={{
                    background: `conic-gradient(${CORAL} 0 68%, #E5E7EB 68% 100%)`,
                  }}
                />
                <div>
                  <div className="text-[9px] font-bold">Redemption</div>
                  <div className="text-[8px] text-[#8E8E93]">68% claimed</div>
                </div>
              </div>
              <div className="flex-1 rounded-lg bg-white p-2 shadow-sm">
                <div className="text-[9px] font-bold">This week</div>
                <div className="mt-1 flex items-end gap-1">
                  {[40, 65, 45, 80, 55].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-gradient-to-t from-[#FF5A5F] to-[#FF8A8E]"
                      style={{ height: `${h * 0.35}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    kind: 'chart' as const,
    title: 'Real-time Analytics',
    body: 'Track performance and make data-driven decisions.',
  },
  {
    kind: 'shield' as const,
    title: 'Secure & Reliable',
    body: 'Enterprise grade security to protect your data.',
  },
  {
    kind: 'users' as const,
    title: 'Grow Customer Loyalty',
    body: 'Build loyalty programs that keep customers coming back.',
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const branding = useBranding();
  const company = branding.companyName || 'Stamp Perk';
  const { theme, setTheme, locale, setLocale, languages } = usePreferences();
  const router = useRouter();
  const [email, setEmail] = useState('merchant@stampperk.app');
  const [password, setPassword] = useState('StampPerk123!');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [captcha, setCaptcha] = useState<{ id: string; question: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password, {
        captchaId: captcha?.id,
        captchaAnswer: captchaAnswer || undefined,
        deviceName: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'Web',
        deviceType: 'web',
      });
      const raw = localStorage.getItem('stampperk_user');
      const u = raw ? (JSON.parse(raw) as AuthUser) : null;
      router.push(u?.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      const { ApiError } = await import('@/lib/api');
      if (err instanceof ApiError && err.captcha) {
        setCaptcha(err.captcha);
        setCaptchaAnswer('');
      }
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  const finishGoogleLogin = useCallback(async (idToken: string) => {
    setBusy(true);
    setError('');
    try {
      const res = await api<{ accessToken: string; user: AuthUser }>('/auth/oauth', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'google',
          idToken,
          role: 'CUSTOMER',
          deviceName:
            typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'Web',
          deviceType: 'web',
        }),
      });
      localStorage.setItem('stampperk_token', res.accessToken);
      localStorage.setItem('stampperk_user', JSON.stringify(res.user));
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setBusy(false);
    }
  }, []);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (googleClientId) prefetchGoogleIdentityServices();
  }, [googleClientId]);

  async function continueWithGoogle() {
    if (!googleClientId) {
      setError('Google Sign-In is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const idToken = await requestGoogleIdToken(googleClientId);
      await finishGoogleLogin(idToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#F4F5F7] text-[#1C1C1E]">
      {/* Soft ambient background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.08) 1px, transparent 0)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse 70% 50% at 50% 20%, black 20%, transparent 75%)',
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 h-[420px] w-[520px] rounded-[50%] opacity-90"
        style={{
          background: `radial-gradient(ellipse at center, rgba(255,90,95,0.35) 0%, rgba(255,90,95,0.12) 45%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6 sm:px-8 lg:py-8">
        <div className="mb-6 flex items-center justify-between lg:mb-0 lg:hidden">
          <BrandMark href="/" subtitle="Admin Panel" />
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1 rounded-full border border-black/8 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#5C5C5C]">
              <select
                className="bg-transparent outline-none"
                value={locale}
                onChange={(e) => setLocale(e.target.value as typeof locale)}
                aria-label="Language"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.native}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-white text-base"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>

        <main className="grid flex-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          {/* Left marketing column */}
          <aside className="relative hidden min-h-[520px] lg:grid lg:grid-cols-1 lg:items-center xl:grid-cols-[minmax(0,1.05fr)_minmax(240px,320px)] xl:items-end xl:gap-6">
            <div className="relative z-10 max-w-lg pt-2">
              <div className="mb-10 flex items-start justify-between gap-4">
                <BrandMark href="/" subtitle="Admin Panel" />
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1 rounded-full border border-black/8 bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold text-[#5C5C5C] shadow-sm backdrop-blur">
                    <select
                      className="bg-transparent outline-none"
                      value={locale}
                      onChange={(e) => setLocale(e.target.value as typeof locale)}
                      aria-label="Language"
                    >
                      {languages.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.native}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-white/90 text-base shadow-sm backdrop-blur"
                    aria-label="Toggle theme"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  >
                    {theme === 'dark' ? '🌙' : '☀️'}
                  </button>
                </div>
              </div>

              <h1 className="text-[42px] font-extrabold leading-[1.08] tracking-tight text-[#1C1C1E]">
                Manage. Monitor.
                <br />
                <span style={{ color: CORAL }}>Grow Your Business.</span>
              </h1>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-[#6B7280]">
                Powerful tools to manage merchants, loyalty programs and analytics in one place.
              </p>

              <ul className="mt-10 max-w-md space-y-5">
                {FEATURES.map((f) => (
                  <li key={f.title} className="flex gap-3.5">
                    <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF0F1] ring-1 ring-[#FF5A5F]/15">
                      <FeatureIcon kind={f.kind} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-extrabold text-[#1C1C1E]">
                        {f.title}
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug text-[#8E8E93]">
                        {f.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <DashboardMock />
          </aside>

          {/* Right login card */}
          <section className="mx-auto w-full max-w-[440px] lg:mx-0 lg:justify-self-end">
            <div className="rounded-[28px] border border-black/[0.04] bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-9">
              <h2 className="text-[26px] font-extrabold tracking-tight sm:text-[28px]">
                Welcome Back! <span aria-hidden>👋</span>
              </h2>
              <p className="mt-1.5 text-sm text-[#8E8E93]">Sign in to access your dashboard</p>

              <form onSubmit={onSubmit} className="mt-7 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-[#6B7280]">
                    Email Address
                  </span>
                  <span className="flex items-center gap-2.5 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3.5 py-3 focus-within:border-[#FF5A5F]/45 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#FF5A5F]/15">
                    <MailIcon />
                    <input
                      className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-[#9CA3AF]"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email address"
                      required
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-[#6B7280]">Password</span>
                  <span className="flex items-center gap-2.5 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3.5 py-3 focus-within:border-[#FF5A5F]/45 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#FF5A5F]/15">
                    <LockIcon />
                    <input
                      className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-[#9CA3AF]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      className="shrink-0 p-0.5"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </span>
                </label>

                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#1C1C1E]">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-black/20 accent-[#FF5A5F]"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    className="text-sm font-bold text-[#FF5A5F]"
                    onClick={() =>
                      setError('Password reset coming soon. Contact support for help.')
                    }
                  >
                    Forgot Password?
                  </button>
                </div>

                {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

                {captcha && (
                  <label className="block rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                    <span className="mb-1.5 block text-sm font-semibold text-amber-900">
                      Security check: {captcha.question}
                    </span>
                    <input
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none"
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value)}
                      placeholder="Answer"
                      required
                    />
                  </label>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5A5F] px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_12px_28px_rgba(255,90,95,0.35)] transition hover:bg-[#E8484D] disabled:opacity-60"
                >
                  {busy ? 'Signing in…' : 'Sign In'}
                  {!busy && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M5 12h14M13 6l6 6-6 6"
                        stroke="white"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#E5E7EB]" />
                <span className="text-xs font-semibold text-[#8E8E93]">or continue with</span>
                <div className="h-px flex-1 bg-[#E5E7EB]" />
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={busy || !googleClientId}
                  onClick={() => void continueWithGoogle()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-[13px] font-bold text-[#1C1C1E] transition hover:border-black/20 hover:bg-[#FAFAFA] disabled:opacity-60"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
                {!googleClientId && (
                  <p className="text-center text-[11px] text-[#8E8E93]">
                    Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google account picker.
                  </p>
                )}
              </div>

              <p className="mt-7 text-center text-sm text-[#8E8E93]">
                Need help?{' '}
                <a href="mailto:support@stampperk.app" className="font-bold text-[#FF5A5F]">
                  Contact Support
                </a>
              </p>
              <p className="mt-3 text-center text-[11px] text-[#A1A1AA]">
                No account?{' '}
                <Link href="/register" className="font-bold text-[#FF5A5F]">
                  Sign up
                </Link>
                {' · '}
                Demo: merchant@ / customer@ · StampPerk123!
              </p>
            </div>
          </section>
        </main>
      </div>

      <footer className="relative z-10 border-t border-black/[0.04] bg-white/80 px-5 py-3.5 text-xs text-[#8E8E93] backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
          <span>
            © {new Date().getFullYear()} {company}. All rights reserved.
          </span>
          <span className="flex items-center gap-2">
            <Link href="/privacy" className="hover:text-[#1C1C1E]">
              Privacy Policy
            </Link>
            <span className="text-[#D1D5DB]">|</span>
            <Link href="/terms" className="hover:text-[#1C1C1E]">
              Terms of Service
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
