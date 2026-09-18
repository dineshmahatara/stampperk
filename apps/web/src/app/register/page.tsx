'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { BrandMark } from '@/components/BrandMark';
import { useBranding } from '@/components/BrandingProvider';
import { captureReferralFromSearch, readReferral } from '@/lib/referral';
import { PasswordStrength } from '@/components/PasswordStrength';
import { BUSINESS_INDUSTRIES } from '@stampperk/shared';

function RegisterForm() {
  const { register } = useAuth();
  const branding = useBranding();
  const companyName = branding.companyName || 'Stamp Perk';
  const router = useRouter();
  const search = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'MERCHANT_OWNER'>('CUSTOMER');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState<string>(BUSINESS_INDUSTRIES[0]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [refCode, setRefCode] = useState('');

  useEffect(() => {
    captureReferralFromSearch(search);
    const stored = readReferral();
    if (stored?.referralCode) setRefCode(stored.referralCode);
  }, [search]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const stored = readReferral();
      const res = await register({
        name,
        email,
        password,
        role,
        businessName: role === 'MERCHANT_OWNER' ? businessName.trim() : undefined,
        category: role === 'MERCHANT_OWNER' ? category : undefined,
        referralCode: stored?.referralCode || refCode || undefined,
        referralMerchantId: stored?.referralMerchantId,
        referralProgramId: stored?.referralProgramId,
        deviceName: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'Web',
        deviceType: 'web',
      });
      if (res.verifyToken) {
        router.push(`/verify-email?token=${encodeURIComponent(res.verifyToken)}`);
        return;
      }
      if (res.verifyUrl) {
        setInfo(`Verify your email (dev): ${res.verifyUrl}`);
      }
      // Merchant row is created at signup; onboarding can still fill logo/phone/city.
      router.push(role === 'MERCHANT_OWNER' ? '/dashboard/onboarding' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-6">
        <BrandMark href="/" />
      </div>
      <div className="card p-6">
        <h1 className="mb-6 text-2xl font-bold">Create your {companyName} account</h1>
        {!!refCode && (
          <p className="mb-4 rounded-xl bg-[#FFF5F5] px-3 py-2 text-sm font-semibold text-[#FF5A5F]">
            Invite code applied: {refCode}
          </p>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm font-medium">
            Name
            <input
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              minLength={8}
              required
            />
            <PasswordStrength password={password} />
          </label>
          <label className="block text-sm font-medium">
            I am a
            <select
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
              value={role}
              onChange={(e) => setRole(e.target.value as 'CUSTOMER' | 'MERCHANT_OWNER')}
            >
              <option value="CUSTOMER">Customer</option>
              <option value="MERCHANT_OWNER">Business owner</option>
            </select>
          </label>
          {role === 'MERCHANT_OWNER' && (
            <>
              <label className="block text-sm font-medium">
                Business name
                <input
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Himalayan Cafe"
                  minLength={2}
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Business type
                <select
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {BUSINESS_INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-emerald-700">{info}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Creating…' : 'Continue'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[#8E8E93]">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-[#FF5A5F]">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-sm text-[#8E8E93]">Loading…</main>}>
      <RegisterForm />
    </Suspense>
  );
}
