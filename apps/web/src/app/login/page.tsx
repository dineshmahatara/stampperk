'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, AuthUser } from '@/lib/api';
import { BrandMark } from '@/components/BrandMark';
import { useBranding } from '@/components/BrandingProvider';
import { usePreferences } from '@/lib/preferences';

const CORAL = '#FF5A5F';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.9.7-2.5 1.9C4.8 19.7 8.1 22 12 22c2.7 0 4.9-.9 6.5-2.4l-3.1-2.4c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1z"
      />
      <path
        fill="#4A90E2"
        d="M3.2 7.1C2.4 8.7 2 10.3 2 12s.4 3.3 1.2 4.9l3.4-2.6C6.2 13.5 6 12.8 6 12c0-.8.2-1.5.4-2.2L3.2 7.1z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.9 14.7 2 12 2 8.1 2 4.8 4.3 3.2 7.1l3.4 2.6C7.2 7.6 9.4 5.9 12 5.9z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.4 12.7c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7 1.9-1.1 2.6-2.1c.8-1.2 1.1-2.3 1.2-2.4-.1 0-2-.8-2.1-3.1zM14.5 6.3c.6-.7 1-1.7.9-2.7-0.9.1-1.9.6-2.5 1.3-.6.6-1.1 1.6-1 2.6 1 .1 1.9-.5 2.6-1.2z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
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
  const company = branding.companyName || 'Stampz';
  const { theme, setTheme, locale, setLocale, languages } = usePreferences();
  const router = useRouter();
  const [email, setEmail] = useState('merchant@stampz.app');
  const [password, setPassword] = useState('Stampz123!');
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
      const raw = localStorage.getItem('stampz_user');
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

  async function oauth(provider: 'google' | 'apple' | 'microsoft') {
    setBusy(true);
    setError('');
    try {
      const res = await api<{ accessToken: string; user: AuthUser }>('/auth/oauth', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          idToken: `demo-${provider}-${Date.now()}`,
          email: `${provider}.web@stampz.app`,
          name:
            provider === 'google'
              ? 'Google Web'
              : provider === 'apple'
                ? 'Apple Web'
                : 'Microsoft Web',
          sub: `${provider}-web-demo`,
          role: 'CUSTOMER',
          deviceName:
            typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'Web',
          deviceType: 'web',
        }),
      });
      localStorage.setItem('stampz_token', res.accessToken);
      localStorage.setItem('stampz_user', JSON.stringify(res.user));
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth failed');
    } finally {
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

              <div className="grid grid-cols-3 gap-2.5">
                {(
                  [
                    ['google', 'Google', <GoogleIcon key="g" />],
                    ['microsoft', 'Microsoft', <MicrosoftIcon key="m" />],
                    ['apple', 'Apple', <AppleIcon key="a" />],
                  ] as const
                ).map(([id, label, icon]) => (
                  <button
                    key={id}
                    type="button"
                    disabled={busy}
                    onClick={() => oauth(id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-2 py-2.5 text-[12px] font-bold text-[#1C1C1E] transition hover:border-black/20 hover:bg-[#FAFAFA] disabled:opacity-60"
                  >
                    {icon}
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              <p className="mt-7 text-center text-sm text-[#8E8E93]">
                Need help?{' '}
                <a href="mailto:support@stampz.app" className="font-bold text-[#FF5A5F]">
                  Contact Support
                </a>
              </p>
              <p className="mt-3 text-center text-[11px] text-[#A1A1AA]">
                No account?{' '}
                <Link href="/register" className="font-bold text-[#FF5A5F]">
                  Sign up
                </Link>
                {' · '}
                Demo: merchant@ / customer@ · Stampz123!
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
