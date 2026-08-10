'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { clearReferral, readReferral } from '@/lib/referral';

export function EnrollButton({ programId, title }: { programId: string; title: string }) {
  const { token, user, experience } = useAuth();
  const [joined, setJoined] = useState(false);
  const [checking, setChecking] = useState(Boolean(token));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || experience !== 'customer') return;
    const stored = readReferral();
    if (!stored?.referralCode) return;
    api('/referrals/claim', {
      method: 'POST',
      token,
      body: JSON.stringify({
        referralCode: stored.referralCode,
        referralMerchantId: stored.referralMerchantId,
        referralProgramId: stored.referralProgramId || programId,
      }),
    })
      .then(() => clearReferral())
      .catch(() => undefined);
  }, [token, experience, programId]);

  useEffect(() => {
    if (!token || experience !== 'customer') {
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    api<Array<{ program?: { id?: string }; programId?: string }>>('/loyalty/cards/me', { token })
      .then((cards) => {
        if (cancelled) return;
        const yes = (cards || []).some((c) => c.program?.id === programId || c.programId === programId);
        setJoined(yes);
      })
      .catch(() => {
        if (!cancelled) setJoined(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, programId, experience]);

  if (!token) {
    return (
      <Link
        href="/login"
        className="rounded-full bg-[#FF5A5F] px-4 py-2 text-sm font-bold text-white"
      >
        Login to join
      </Link>
    );
  }

  if (experience !== 'customer') {
    return null;
  }

  async function enroll() {
    if (joined || busy) return;
    setBusy(true);
    setError('');
    try {
      await api(`/loyalty/programs/${programId}/enroll`, { method: 'POST', token: token! });
      setJoined(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not enroll';
      // Already a member / unique constraint style messages → treat as joined
      if (/already|exist|unique/i.test(message)) {
        setJoined(true);
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <span className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-bold text-[#8E8E93]">
        …
      </span>
    );
  }

  if (joined) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Link
          href="/dashboard"
          className="rounded-full border border-[#FF5A5F]/30 bg-[#FFF1F3] px-4 py-2 text-sm font-bold text-[#FF5A5F]"
        >
          Joined
        </Link>
        {user?.role !== 'CUSTOMER' && (
          <p className="text-[11px] text-[#8E8E93]">Enrolled with your account (customer mode).</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={enroll}
        className="rounded-full bg-[#FF5A5F] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        {busy ? 'Joining…' : 'Join'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {user?.role !== 'CUSTOMER' && (
        <p className="text-[11px] text-[#8E8E93]">Enrolling with your merchant login (customer mode).</p>
      )}
    </div>
  );
}
