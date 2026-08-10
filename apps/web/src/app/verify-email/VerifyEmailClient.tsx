'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { BrandMark } from '@/components/BrandMark';

export default function VerifyEmailClient() {
  const search = useSearchParams();
  const token = search.get('token') || '';
  const [status, setStatus] = useState<'idle' | 'ok' | 'error' | 'busy'>('idle');
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) return;
    setStatus('busy');
    api('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) })
      .then(() => {
        setStatus('ok');
        setMsg('Email verified. You can sign in.');
      })
      .catch((e) => {
        setStatus('error');
        setMsg(e instanceof Error ? e.message : 'Verification failed');
      });
  }, [token]);

  async function resend(e: FormEvent) {
    e.preventDefault();
    setStatus('busy');
    try {
      const res = await api<{ verifyUrl?: string }>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setStatus('ok');
      setMsg(
        res.verifyUrl
          ? `Dev link: ${res.verifyUrl}`
          : 'If that email exists, a verification link was sent.',
      );
    } catch (err) {
      setStatus('error');
      setMsg(err instanceof Error ? err.message : 'Could not resend');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <BrandMark href="/" />
      <div className="mt-6 rounded-2xl border border-black/8 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-extrabold">Verify email</h1>
        {status === 'busy' && <p className="mt-3 text-sm text-[#8E8E93]">Working…</p>}
        {!!msg && (
          <p className={`mt-3 text-sm font-semibold ${status === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
            {msg}
          </p>
        )}
        {!token && (
          <form onSubmit={resend} className="mt-4 space-y-3">
            <input
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              type="email"
              required
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="w-full rounded-xl bg-[#FF5A5F] py-2.5 text-sm font-bold text-white">
              Resend verification
            </button>
          </form>
        )}
        <Link href="/login" className="mt-4 inline-block text-sm font-bold text-[#FF5A5F]">
          Back to login
        </Link>
      </div>
    </main>
  );
}
