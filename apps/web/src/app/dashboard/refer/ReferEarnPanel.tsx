'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type ReferralsMe = {
  referralCode: string;
  shareUrl: string;
  pendingBonusStamps: number;
  stats: { friendsJoined: number; rewarded: number; pending: number };
  recent: {
    id: string;
    status: string;
    scope: string;
    friendName: string;
    merchantName?: string | null;
    createdAt: string;
    rewardedAt?: string | null;
  }[];
  merchantPrograms: {
    programId: string;
    title: string;
    businessName: string;
    shareUrl: string;
    bonusReferrer: number;
    bonusReferee: number;
  }[];
  platformBonus: { referrer: number; referee: number };
};

export function ReferEarnPanel() {
  const { token } = useAuth();
  const [data, setData] = useState<ReferralsMe | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    api<ReferralsMe>('/referrals/me', { token })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  if (error) {
    return <p className="text-sm font-semibold text-red-600">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-[#8E8E93]">Loading Refer &amp; Earn…</p>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-black/8 bg-gradient-to-br from-[#FFF5F5] to-white p-5">
        <h2 className="text-lg font-extrabold tracking-tight">Refer &amp; Earn</h2>
        <p className="mt-1 text-sm text-[#8E8E93]">
          Share your code. When a friend joins and gets their first stamp, you both earn bonus stamps
          (+{data.platformBonus.referrer} each on Stamp Perk). Merchant programs may add extra rewards.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="rounded-xl bg-white px-4 py-3 font-mono text-xl font-extrabold tracking-widest text-[#1C1C1E] shadow-sm">
            {data.referralCode}
          </div>
          <button
            type="button"
            className="rounded-full bg-[#FF5A5F] px-4 py-2 text-sm font-bold text-white"
            onClick={() => copy(data.shareUrl)}
          >
            {copied ? 'Copied!' : 'Copy invite link'}
          </button>
        </div>
        {data.pendingBonusStamps > 0 && (
          <p className="mt-3 text-sm font-bold text-[#C27803]">
            {data.pendingBonusStamps} platform bonus stamp
            {data.pendingBonusStamps === 1 ? '' : 's'} waiting — applied on your next visit.
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ['Friends joined', data.stats.friendsJoined],
          ['Rewarded', data.stats.rewarded],
          ['Pending', data.stats.pending],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-black/8 bg-white p-3 text-center">
            <div className="text-xl font-extrabold">{value}</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#8E8E93]">{label}</div>
          </div>
        ))}
      </div>

      {!!data.merchantPrograms.length && (
        <div className="space-y-2">
          <h3 className="text-sm font-extrabold">Share a business referral</h3>
          <p className="text-xs text-[#8E8E93]">
            These merchants reward friends who visit them via your link.
          </p>
          <ul className="space-y-2">
            {data.merchantPrograms.map((p) => (
              <li
                key={p.programId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/8 bg-white px-3 py-2"
              >
                <div>
                  <div className="text-sm font-bold">{p.businessName}</div>
                  <div className="text-xs text-[#8E8E93]">
                    {p.title} · you +{p.bonusReferrer} / friend +{p.bonusReferee}
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-bold"
                  onClick={() => copy(p.shareUrl)}
                >
                  Copy link
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-extrabold">Recent invites</h3>
        {!data.recent.length && (
          <p className="rounded-xl border border-dashed border-black/10 bg-[#F4F5F7] px-3 py-4 text-sm text-[#8E8E93]">
            No friends yet. Share your link to get started — rewards unlock after their first stamp.
          </p>
        )}
        <ul className="space-y-2">
          {data.recent.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-black/8 bg-white px-3 py-2 text-sm"
            >
              <div>
                <div className="font-bold">{r.friendName}</div>
                <div className="text-xs text-[#8E8E93]">
                  {r.scope === 'MERCHANT' ? r.merchantName || 'Business' : 'Stamp Perk'} ·{' '}
                  {r.status === 'REWARDED'
                    ? 'Rewarded'
                    : r.status === 'PENDING'
                      ? 'Waiting for first stamp'
                      : r.status}
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                  r.status === 'REWARDED'
                    ? 'bg-emerald-50 text-emerald-700'
                    : r.status === 'PENDING'
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {r.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
