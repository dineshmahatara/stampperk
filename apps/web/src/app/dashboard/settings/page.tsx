'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { SUPPORTED_LOCALES } from '@/i18n';
import { usePreferences } from '@/lib/preferences';
import { AddressPicker } from '@/components/AddressPicker';
import { normalizeCountryCode, type AddressFormValue } from '@stampz/shared';

type CustomerProfile = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  alternatePhone?: string | null;
  photoUrl?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  language?: string;
  timezone?: string;
  currency?: string;
  country?: string | null;
  province?: string | null;
  district?: string | null;
  city?: string | null;
  municipality?: string | null;
  ward?: string | null;
  streetAddress?: string | null;
  postalCode?: string | null;
  marketingConsent?: boolean;
  pushConsent?: boolean;
  notifyOffers?: boolean;
  notifyLoyalty?: boolean;
  notifyExpiry?: boolean;
  notifyTransfers?: boolean;
  notifyStaff?: boolean;
  role?: string;
  qrToken?: string;
};

const inputClass =
  'w-full rounded-xl border border-[var(--stampz-line)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--stampz-coral)]/30';
const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--stampz-muted)]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

function initials(name?: string) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

function profileCompletion(p: CustomerProfile) {
  const checks = [
    Boolean(p.name?.trim()),
    Boolean(p.phone?.trim()),
    Boolean(p.dateOfBirth),
    Boolean(p.city?.trim()),
    Boolean(p.photoUrl?.trim()),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export default function CustomerSettingsPage() {
  const { token, user } = useAuth();
  const { setLocale } = usePreferences();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    if (!token) return;
    api<CustomerProfile>('/auth/me', { token })
      .then(setProfile)
      .catch((e) => setError(e.message));
  }

  useEffect(load, [token]);

  function setField<K extends keyof CustomerProfile>(key: K, value: CustomerProfile[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
  }

  const completion = useMemo(() => (profile ? profileCompletion(profile) : 0), [profile]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!token || !profile) return;
    setSaving(true);
    setMsg('');
    setError('');
    try {
      const updated = await api<CustomerProfile>('/users/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone || '',
          alternatePhone: profile.alternatePhone || '',
          photoUrl: profile.photoUrl || '',
          dateOfBirth: profile.dateOfBirth ? toDateInput(profile.dateOfBirth) : '',
          gender: profile.gender || '',
          language: profile.language || 'en',
          timezone: profile.timezone || 'Asia/Kathmandu',
          currency: profile.currency || 'NPR',
          country: profile.country || 'NP',
          province: profile.province || '',
          district: profile.district || '',
          city: profile.city || '',
          municipality: profile.municipality || '',
          ward: profile.ward || '',
          streetAddress: profile.streetAddress || '',
          postalCode: profile.postalCode || '',
          marketingConsent: Boolean(profile.marketingConsent),
          pushConsent: Boolean(profile.pushConsent),
          notifyOffers: profile.notifyOffers !== false,
          notifyLoyalty: profile.notifyLoyalty !== false,
          notifyExpiry: profile.notifyExpiry !== false,
          notifyTransfers: profile.notifyTransfers !== false,
          notifyStaff: profile.notifyStaff !== false,
        }),
      });
      setProfile((p) => ({ ...p, ...updated }));
      setMsg('Profile saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--stampz-line)] bg-[var(--stampz-pink)] text-lg font-extrabold text-[var(--stampz-coral)]">
            {profile?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(profile?.name || user?.name)
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="mt-1 text-sm text-[var(--stampz-muted)]">
              Keep your details updated for stamps, birthday offers, and nearby businesses.
            </p>
          </div>
        </div>
        {profile && (
          <div className="min-w-[140px] rounded-2xl border border-[var(--stampz-line)] bg-[var(--stampz-surface)] px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--stampz-muted)]">
              Profile completion
            </div>
            <div className="mt-1 flex items-end justify-between gap-2">
              <span className="text-2xl font-extrabold text-[var(--stampz-coral)]">{completion}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F1F5F9]">
              <div
                className="h-full rounded-full bg-[var(--stampz-coral)] transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] font-medium text-[var(--stampz-muted)]">
              Name, phone, birthday, city, photo
            </p>
          </div>
        )}
      </div>

      {msg && (
        <p className="mb-4 rounded-xl bg-[#ECFDF5] px-3 py-2 text-sm font-semibold text-emerald-700">
          {msg}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-xl bg-[#fff1f3] px-3 py-2 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

      {!profile ? (
        <p className="mt-6 text-[var(--stampz-muted)]">Loading…</p>
      ) : (
        <form onSubmit={save} className="space-y-5">
          <div className="rounded-2xl border border-[var(--stampz-line)] bg-[var(--stampz-surface)] p-5 shadow-sm">
            <h2 className="mb-3 text-base font-extrabold">Basic Information</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full Name">
                <input
                  className={inputClass}
                  required
                  value={profile.name || ''}
                  onChange={(e) => setField('name', e.target.value)}
                />
              </Field>
              <Field label="Profile Photo (URL)">
                <input
                  className={inputClass}
                  placeholder="https://…"
                  value={profile.photoUrl || ''}
                  onChange={(e) => setField('photoUrl', e.target.value)}
                />
              </Field>
              <Field label="Date of Birth">
                <input
                  className={inputClass}
                  type="date"
                  value={toDateInput(profile.dateOfBirth)}
                  onChange={(e) => setField('dateOfBirth', e.target.value || null)}
                />
              </Field>
              <Field label="Gender">
                <select
                  className={inputClass}
                  value={profile.gender || ''}
                  onChange={(e) => setField('gender', e.target.value)}
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--stampz-line)] bg-[var(--stampz-surface)] p-5 shadow-sm">
            <h2 className="mb-3 text-base font-extrabold">Contact Information</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email Address">
                <input className={inputClass} disabled value={profile.email} />
              </Field>
              <Field label="Mobile Number">
                <input
                  className={inputClass}
                  value={profile.phone || ''}
                  onChange={(e) => setField('phone', e.target.value)}
                />
              </Field>
              <Field label="Alternate Phone">
                <input
                  className={inputClass}
                  value={profile.alternatePhone || ''}
                  onChange={(e) => setField('alternatePhone', e.target.value)}
                />
              </Field>
              <Field label="Account Role">
                <input
                  className={inputClass}
                  disabled
                  value={(user?.role || profile.role || '').replace(/_/g, ' ')}
                />
              </Field>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--stampz-line)] bg-[var(--stampz-surface)] p-5 shadow-sm">
            <h2 className="mb-3 text-base font-extrabold">Address</h2>
            <AddressPicker
              value={{
                country: normalizeCountryCode(profile.country) || 'NP',
                province: profile.province || '',
                district: profile.district || '',
                city: profile.city || '',
                municipality: profile.municipality || '',
                ward: profile.ward || '',
                street: profile.streetAddress || '',
                postalCode: profile.postalCode || '',
              }}
              onChange={(next: AddressFormValue) => {
                setProfile((p) =>
                  p
                    ? {
                        ...p,
                        country: next.country,
                        province: next.province,
                        district: next.district,
                        city: next.city,
                        municipality: next.municipality,
                        ward: next.ward,
                        streetAddress: next.street,
                        postalCode: next.postalCode,
                      }
                    : p,
                );
              }}
            />
          </div>

          <div className="rounded-2xl border border-[var(--stampz-line)] bg-[var(--stampz-surface)] p-5 shadow-sm">
            <h2 className="mb-3 text-base font-extrabold">Preferences</h2>
            <div className="mb-4 flex flex-col gap-2">
              <a
                href="/dashboard/refer"
                className="inline-flex items-center gap-2 rounded-xl border border-[#FF5A5F]/20 bg-[#FFF5F5] px-4 py-3 text-sm font-bold text-[#FF5A5F]"
              >
                Refer &amp; Earn — invite friends for bonus stamps →
              </a>
              <a
                href="/dashboard/security"
                className="inline-flex items-center gap-2 rounded-xl border border-black/8 bg-[#F8F8FA] px-4 py-3 text-sm font-bold text-[#1C1C1E]"
              >
                Security — sessions, login history, logout all →
              </a>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Language">
                <select
                  className={inputClass}
                  value={profile.language || 'en'}
                  onChange={(e) => {
                    const next = e.target.value;
                    setField('language', next);
                    setLocale(next as (typeof SUPPORTED_LOCALES)[number]['code']);
                  }}
                >
                  {SUPPORTED_LOCALES.map((lang) => (
                    <option key={lang.code} value={lang.code} dir={lang.dir}>
                      {lang.native}
                      {lang.dir === 'rtl' ? ' (RTL)' : ''} — {lang.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Timezone">
                <input
                  className={inputClass}
                  value={profile.timezone || 'Asia/Kathmandu'}
                  onChange={(e) => setField('timezone', e.target.value)}
                />
              </Field>
              <Field label="Currency">
                <input
                  className={inputClass}
                  value={profile.currency || 'NPR'}
                  onChange={(e) => setField('currency', e.target.value)}
                />
              </Field>
            </div>
            <div className="mt-6 space-y-4 rounded-[1.5rem] border border-[var(--stampz-line)] bg-[#FFF8F7] p-4 sm:p-5">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">Notification settings</h2>
                <p className="mt-1 text-sm text-[var(--stampz-muted)]">
                  Personalize which alerts reach your devices. Inbox always keeps a copy.
                </p>
              </div>

              <label className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--stampz-coral)]/15 bg-white px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold">Push alerts</div>
                  <div className="mt-0.5 text-xs text-[var(--stampz-muted)]">
                    Master switch for on-device alerts from Stampz.
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 accent-[var(--stampz-coral)]"
                  checked={Boolean(profile.pushConsent)}
                  onChange={(e) => setField('pushConsent', e.target.checked)}
                />
              </label>

              <div>
                <div className="mb-2 text-sm font-extrabold">Alert categories</div>
                <div className="overflow-hidden rounded-2xl border border-[var(--stampz-line)] bg-white">
                  {(
                    [
                      {
                        key: 'notifyOffers' as const,
                        title: 'Offers & promotions',
                        sub: 'Campaigns, deals, and merchant messages.',
                      },
                      {
                        key: 'notifyLoyalty' as const,
                        title: 'Loyalty activity',
                        sub: 'Stamps, completed cards, and redeemed rewards.',
                      },
                      {
                        key: 'notifyExpiry' as const,
                        title: 'Expiry reminders',
                        sub: 'Heads-up before cards or rewards expire.',
                      },
                      {
                        key: 'notifyTransfers' as const,
                        title: 'Stamp transfers',
                        sub: 'Incoming gifts and transfer status updates.',
                      },
                      {
                        key: 'notifyStaff' as const,
                        title: 'Account & access',
                        sub: 'Invites, access changes, and system notices.',
                      },
                    ] as const
                  ).map((row, i, arr) => (
                    <label
                      key={row.key}
                      className={`flex items-start justify-between gap-4 px-4 py-3 ${
                        i < arr.length - 1 ? 'border-b border-[var(--stampz-line)]' : ''
                      } ${profile.pushConsent ? '' : 'opacity-50'}`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold">{row.title}</div>
                        <div className="mt-0.5 text-xs text-[var(--stampz-muted)]">{row.sub}</div>
                      </div>
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 accent-[var(--stampz-coral)]"
                        disabled={!profile.pushConsent}
                        checked={profile[row.key] !== false}
                        onChange={(e) => setField(row.key, e.target.checked)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-[var(--stampz-ink)]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--stampz-coral)]"
                  checked={Boolean(profile.marketingConsent)}
                  onChange={(e) => setField('marketingConsent', e.target.checked)}
                />
                Also allow marketing emails (separate from push)
              </label>

              <p className="rounded-xl bg-white/80 px-3 py-2 text-xs leading-relaxed text-[var(--stampz-muted)]">
                Essential account updates always stay in your inbox. The Push alerts switch still
                controls whether they appear on your device.
              </p>
            </div>
          </div>

          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--stampz-line)] bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
            <div className="flex flex-wrap gap-4 text-sm font-semibold text-[var(--stampz-coral)]">
              <Link href="/dashboard/qr">Open My QR →</Link>
              <Link href="/dashboard/discover">Discover businesses →</Link>
              <Link href="/dashboard">My wallet →</Link>
            </div>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
