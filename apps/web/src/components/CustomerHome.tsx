'use client';

import { EntityAvatar } from '@/components/EntityAvatar';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { StampCardPreview } from '@/components/StampCardPreview';
import { categoryLabelFromSlug } from '@stampperk/shared';

export type CustomerWalletCard = {
  id: string;
  stampCount: number;
  availableRewards: number;
  completedCycles?: number;
  expiresAt?: string | null;
  program: {
    title: string;
    totalStamps: number;
    rewardTitle: string;
    rewardDescription?: string | null;
    categorySlug?: string | null;
    businessName?: string | null;
    logoUrl?: string | null;
    logoScale?: number | null;
    logoOffsetX?: number | null;
    logoOffsetY?: number | null;
    logoPosX?: number | null;
    logoPosY?: number | null;
    promoImageUrl?: string | null;
    stampColor?: string | null;
    emptyStampColor?: string | null;
    accentColor?: string | null;
    fontStyle?: string | null;
    doubleSided?: boolean | null;
    merchant: {
      businessName: string;
      slug: string;
      logoUrl?: string | null;
      category?: string | null;
      tagline?: string | null;
      phone?: string | null;
      email?: string | null;
      website?: string | null;
      address?: string | null;
      city?: string | null;
      facebook?: string | null;
      instagram?: string | null;
      tiktok?: string | null;
    };
  };
  redemptions?: Array<{
    id: string;
    rewardTitle: string;
    createdAt: string;
    estimatedSavings?: number | null;
  }>;
};

type Notif = { id: string; title: string; body: string; read: boolean; createdAt: string };
type Offer = {
  id: string;
  title: string;
  description: string;
  badgeText: string;
  merchant?: { businessName: string; slug: string; logoUrl?: string | null };
};

type StampTransferRow = {
  id: string;
  amount: number;
  status: string;
  stampExpiresAt?: string | null;
  offerExpiresAt: string;
  note?: string | null;
  createdAt: string;
  program: { id: string; title: string; totalStamps: number; rewardTitle: string };
  fromUser: { id: string; name: string; email: string };
  toUser: { id: string; name: string; email: string };
  merchant: { id: string; businessName: string; slug: string; logoUrl?: string | null };
};

type TransfersPayload = {
  incoming: StampTransferRow[];
  outgoing: StampTransferRow[];
  history: StampTransferRow[];
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function ProgressRing({
  value,
  max,
  size = 96,
}: {
  value: number;
  max: number;
  size?: number;
}) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, max > 0 ? value / max : 0);
  const filled = pct * c;
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" className="shrink-0">
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
      <circle
        cx="48"
        cy="48"
        r={r}
        fill="none"
        stroke="#fff"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`}
        transform="rotate(-90 48 48)"
      />
      <text x="48" y="46" textAnchor="middle" className="fill-white text-[16px] font-black">
        {value}/{max}
      </text>
      <text x="48" y="62" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="9" fontWeight="700">
        Stamps
      </text>
    </svg>
  );
}

const QUICK = [
  {
    href: '/dashboard/qr',
    label: 'My QR',
    color: 'bg-[#FFE8EA] text-[#FF5A5F]',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" />
        <path d="M7 12h10" />
      </svg>
    ),
  },
  {
    href: '/dashboard#my-cards',
    label: 'My Cards',
    color: 'bg-[#EDE9FE] text-[#6D28D9]',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2.5" y="5" width="19" height="14" rx="2" />
        <path d="M2.5 10h19" />
      </svg>
    ),
  },
  {
    href: '/dashboard#rewards',
    label: 'Rewards',
    color: 'bg-[#FFEDD5] text-[#C2410C]',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="10" width="18" height="11" rx="1.5" />
        <path d="M12 10v11M3 14h18" />
      </svg>
    ),
  },
  {
    href: '/dashboard/discover',
    label: 'Find Stores',
    color: 'bg-[#D1FAE5] text-[#047857]',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M14.5 9.5l-2 5-5 2 2-5 5-2z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/refer',
    label: 'Refer & Earn',
    color: 'bg-[#FFE4E6] text-[#BE123C]',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
] as const;

export function CustomerHome({
  token,
  userName,
}: {
  token: string;
  userName?: string | null;
}) {
  const [cards, setCards] = useState<CustomerWalletCard[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [period, setPeriod] = useState<'month' | 'all'>('month');
  const [transfers, setTransfers] = useState<TransfersPayload>({
    incoming: [],
    outgoing: [],
    history: [],
  });
  const [transferCard, setTransferCard] = useState<CustomerWalletCard | null>(null);
  const [transferAmount, setTransferAmount] = useState('1');
  const [transferTo, setTransferTo] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);

  const load = useCallback(() => {
    api<CustomerWalletCard[]>('/loyalty/cards/me', { token })
      .then(setCards)
      .catch((e) => setError(e.message));
    api<Notif[]>('/notifications', { token })
      .then(setNotifs)
      .catch(() => setNotifs([]));
    api<Offer[]>('/campaigns/discover', { token })
      .then(setOffers)
      .catch(() => setOffers([]));
    api<TransfersPayload>('/loyalty/transfers', { token })
      .then(setTransfers)
      .catch(() => setTransfers({ incoming: [], outgoing: [], history: [] }));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!transferCard) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setTransferCard(null);
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [transferCard]);

  const unread = notifs.filter((n) => !n.read).length;

  const featured = useMemo(() => {
    if (!cards.length) return null;
    const sorted = [...cards].sort((a, b) => {
      const pa = a.program.totalStamps ? a.stampCount / a.program.totalStamps : 0;
      const pb = b.program.totalStamps ? b.stampCount / b.program.totalStamps : 0;
      if (b.availableRewards !== a.availableRewards) return b.availableRewards - a.availableRewards;
      return pb - pa;
    });
    return sorted[0];
  }, [cards]);

  const activity = useMemo(() => {
    const cutoff =
      period === 'month'
        ? (() => {
            const d = new Date();
            d.setDate(1);
            d.setHours(0, 0, 0, 0);
            return d;
          })()
        : null;
    let stamps = 0;
    let redeemed = 0;
    let saved = 0;
    for (const c of cards) {
      stamps += (c.completedCycles || 0) * (c.program.totalStamps || 0) + (c.stampCount || 0);
      for (const r of c.redemptions || []) {
        if (cutoff && new Date(r.createdAt) < cutoff) continue;
        redeemed += 1;
        saved += r.estimatedSavings ?? 150;
      }
    }
    if (period === 'month') {
      // stamp total is lifetime from card state; show card progress sum as proxy for "collected"
      stamps = cards.reduce((s, c) => s + (c.stampCount || 0), 0);
    }
    return { stamps, redeemed, saved };
  }, [cards, period]);

  const recentRedeems = useMemo(() => {
    const rows: Array<{
      id: string;
      rewardTitle: string;
      createdAt: string;
      businessName: string;
      slug: string;
    }> = [];
    for (const c of cards) {
      for (const r of c.redemptions || []) {
        rows.push({
          id: r.id,
          rewardTitle: r.rewardTitle,
          createdAt: r.createdAt,
          businessName: c.program.merchant.businessName,
          slug: c.program.merchant.slug,
        });
      }
    }
    return rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 5);
  }, [cards]);

  const readyCards = cards.filter((c) => c.availableRewards > 0);

  async function redeem(cardId: string) {
    setRedeemingId(cardId);
    setMsg('');
    try {
      await api('/loyalty/redeem', {
        method: 'POST',
        token,
        body: JSON.stringify({ cardId }),
      });
      setMsg('Reward redeemed!');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Redeem failed');
    } finally {
      setRedeemingId(null);
    }
  }

  async function markRead(id: string) {
    await api(`/notifications/${id}/read`, { method: 'PATCH', token }).catch(() => undefined);
    setNotifs((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function sendTransfer() {
    if (!transferCard) return;
    const amount = Math.max(1, parseInt(transferAmount, 10) || 1);
    const target = transferTo.trim();
    if (!target) {
      setMsg('Enter recipient email or phone');
      return;
    }
    setTransferBusy(true);
    setMsg('');
    try {
      const body: Record<string, unknown> = { cardId: transferCard.id, amount };
      if (target.includes('@')) body.toEmail = target.toLowerCase();
      else body.toPhone = target;
      await api('/loyalty/transfers', { method: 'POST', token, body: JSON.stringify(body) });
      setMsg('Transfer sent — waiting for accept (48h). Stamps are held until then.');
      setTransferCard(null);
      setTransferTo('');
      setTransferAmount('1');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Transfer failed');
    } finally {
      setTransferBusy(false);
    }
  }

  async function respondTransfer(id: string, action: 'accept' | 'decline' | 'cancel') {
    setMsg('');
    try {
      await api(`/loyalty/transfers/${id}/${action}`, { method: 'POST', token });
      setMsg(
        action === 'accept'
          ? 'Stamps added — expiry matches the original earner’s date.'
          : action === 'decline'
            ? 'Declined — stamps returned to sender.'
            : 'Cancelled — stamps back on your card.',
      );
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Action failed');
    }
  }

  const firstName = (userName || 'there').split(' ')[0];
  const away = featured
    ? Math.max(0, (featured.program.totalStamps || 0) - (featured.stampCount || 0))
    : 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {greeting()}, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-[#8E8E93]">
            Collect stamps, earn rewards, and discover nearby stores.
          </p>
        </div>
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInboxOpen((v) => !v)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-black/6 bg-white"
            aria-label="Notifications"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9a6 6 0 0112 0c0 7 3 7 3 7H3s3 0 3-7" />
              <path d="M10 19a2 2 0 004 0" />
            </svg>
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF5A5F] px-1 text-[10px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          <Link
            href="/dashboard/qr"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF5A5F] text-white shadow-[0_8px_20px_rgba(255,90,95,0.35)]"
            aria-label="My QR"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" />
              <path d="M7 12h10" />
            </svg>
          </Link>
          {inboxOpen && (
            <div className="absolute right-0 top-12 z-20 w-80 max-w-[90vw] rounded-2xl border border-black/8 bg-white p-3 shadow-xl">
              <div className="mb-2 text-sm font-extrabold">Notifications</div>
              <div className="max-h-64 space-y-2 overflow-auto">
                {notifs.slice(0, 8).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markRead(n.id)}
                    className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${
                      n.read ? 'bg-[#F8F8FA]' : 'bg-[#FFF1F3]'
                    }`}
                  >
                    <div className="font-bold">{n.title}</div>
                    <div className="text-xs text-[#8E8E93]">{n.body}</div>
                  </button>
                ))}
                {!notifs.length && <p className="text-sm text-[#8E8E93]">No notifications yet.</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {msg && (
        <p className="rounded-xl border border-emerald-100 bg-[#ECFDF5] px-3 py-2 text-sm font-semibold text-emerald-700">
          {msg}
        </p>
      )}

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Active cards', value: String(cards.length), hint: 'In your wallet' },
          { label: 'Stamps collected', value: String(activity.stamps), hint: period === 'month' ? 'This month' : 'All time' },
          { label: 'Rewards ready', value: String(readyCards.length), hint: 'Ready to redeem' },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
          >
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#8E8E93]">{k.label}</div>
            <div className="mt-1 text-2xl font-extrabold tracking-tight">{k.value}</div>
            <div className="mt-1 text-xs font-semibold text-[#8E8E93]">{k.hint}</div>
          </div>
        ))}
      </div>

      {(transfers.incoming.length > 0 || transfers.outgoing.length > 0) && (
        <div className="space-y-3 rounded-[1.5rem] border border-[var(--stampperk-line)] bg-white p-4 shadow-sm">
          <h2 className="text-lg font-extrabold">Stamp transfers</h2>
          <p className="text-xs text-[var(--stampperk-muted)]">
            Same business only. Accept within 48h or stamps stay with the sender. Expiry keeps the
            original earn date.
          </p>
          {transfers.incoming.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-2 rounded-2xl border border-[var(--stampperk-coral)]/20 bg-[var(--stampperk-pink)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm">
                <div className="font-bold">
                  {t.fromUser.name} → you · {t.amount} stamp{t.amount === 1 ? '' : 's'}
                </div>
                <div className="text-[var(--stampperk-muted)]">
                  {t.merchant.businessName} · offer ends{' '}
                  {new Date(t.offerExpiresAt).toLocaleString()}
                  {t.stampExpiresAt
                    ? ` · stamps expire ${new Date(t.stampExpiresAt).toLocaleDateString()}`
                    : ''}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => respondTransfer(t.id, 'accept')}
                  className="rounded-full bg-[var(--stampperk-coral)] px-4 py-2 text-xs font-bold text-white"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => respondTransfer(t.id, 'decline')}
                  className="rounded-full border border-[var(--stampperk-line)] bg-white px-4 py-2 text-xs font-bold"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
          {transfers.outgoing.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-2 rounded-2xl border border-[var(--stampperk-line)] bg-[#FAFAF9] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm">
                <div className="font-bold">
                  Pending → {t.toUser.name} · {t.amount} stamp{t.amount === 1 ? '' : 's'}
                </div>
                <div className="text-[var(--stampperk-muted)]">
                  {t.merchant.businessName} · held until{' '}
                  {new Date(t.offerExpiresAt).toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => respondTransfer(t.id, 'cancel')}
                className="rounded-full border border-[var(--stampperk-line)] bg-white px-4 py-2 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      {transferCard && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transfer-title"
          onClick={() => !transferBusy && setTransferCard(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-black/5 bg-white p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-start justify-between gap-3">
              <div>
                <h2 id="transfer-title" className="text-lg font-extrabold">
                  Transfer stamps
                </h2>
                <p className="mt-0.5 text-sm font-semibold text-[#FF5A5F]">
                  {transferCard.program.merchant.businessName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTransferCard(null)}
                disabled={transferBusy}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8E8E93] hover:bg-[#F4F5F7]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#8E8E93]">
              Available: <span className="font-bold text-[#1C1C1E]">{transferCard.stampCount}</span> stamps
              {transferCard.expiresAt
                ? ` · expiry ${new Date(transferCard.expiresAt).toLocaleDateString()}`
                : ''}
              . Recipient must accept within 48h.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
                  Amount
                </span>
                <input
                  type="number"
                  min={1}
                  max={transferCard.stampCount}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-black/8 px-3 py-2.5 outline-none focus:border-[#FF5A5F]/40"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
                  Recipient email or phone
                </span>
                <input
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  placeholder="friend@email.com or +977…"
                  className="w-full rounded-xl border border-black/8 px-3 py-2.5 outline-none focus:border-[#FF5A5F]/40"
                />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={transferBusy || transferCard.stampCount < 1}
                onClick={sendTransfer}
                className="flex-1 rounded-full bg-[#FF5A5F] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 sm:flex-none"
              >
                {transferBusy ? 'Sending…' : 'Send transfer'}
              </button>
              <button
                type="button"
                onClick={() => setTransferCard(null)}
                disabled={transferBusy}
                className="rounded-full border border-black/8 px-5 py-2.5 text-sm font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Featured loyalty card */}
      {featured && (
        <div
          className="overflow-hidden rounded-[1.75rem] p-5 text-white shadow-lg sm:p-6"
          style={{
            background: `linear-gradient(135deg, ${featured.program.stampColor || '#FF5A5F'} 0%, #E11D48 100%)`,
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
                Your loyalty card
              </div>
              <div className="mt-2 flex items-center gap-3">
                <EntityAvatar
                  src={featured.program.logoUrl || featured.program.merchant.logoUrl}
                  name={featured.program.merchant.businessName}
                  size="lg"
                  rounded="xl"
                  className="ring-2 ring-white/40"
                />
                <div className="min-w-0">
                  <div className="truncate text-xl font-extrabold sm:text-2xl">
                    {featured.program.merchant.businessName}
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#FBBF24] px-2.5 py-1 text-xs font-extrabold text-[#78350F]">
                    ★ {featured.completedCycles && featured.completedCycles > 0 ? 'Gold Member' : 'Member'}
                  </div>
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm font-semibold text-white/95">
                {featured.availableRewards > 0
                  ? `You have ${featured.availableRewards} reward ready to redeem!`
                  : away === 0
                    ? 'Card complete — claim your reward!'
                    : `You're ${away} stamp${away === 1 ? '' : 's'} away from earning a free reward!`}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold text-white/75">
                Card ID: {featured.id.slice(-6).toUpperCase()}
              </div>
              <div className="mt-3 flex justify-end">
                <ProgressRing
                  value={featured.stampCount}
                  max={featured.program.totalStamps || 10}
                />
              </div>
            </div>
          </div>
          <Link
            href={`#rewards`}
            className="mt-5 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-[var(--stampperk-ink)]"
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <span className="text-[var(--stampperk-coral)]">🎁</span>
              Next Reward: {featured.program.rewardTitle}
            </span>
            <span className="text-[var(--stampperk-coral)]">→</span>
          </Link>
          {featured.availableRewards > 0 && (
            <button
              type="button"
              disabled={redeemingId === featured.id}
              onClick={() => redeem(featured.id)}
              className="mt-3 w-full rounded-full bg-white py-2.5 text-sm font-extrabold text-[var(--stampperk-coral)] disabled:opacity-60"
            >
              {redeemingId === featured.id ? 'Redeeming…' : 'Redeem now'}
            </button>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold">Quick actions</h2>
          <Link href="/dashboard/discover" className="text-sm font-bold text-[#FF5A5F]">
            Discover →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {QUICK.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="flex flex-col items-center gap-2 rounded-xl border border-black/5 bg-[#F8F8FA] p-3 text-center transition hover:border-[#FF5A5F]/25 hover:bg-[#FFF7F7]"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${q.color}`}>
                {q.icon}
              </span>
              <span className="text-[11px] font-bold leading-tight">{q.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Activity + Recent rewards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-extrabold">Your Activity</h2>
            <select
              className="rounded-full border border-black/8 bg-[#F8F8FA] px-3 py-1 text-xs font-bold"
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'month' | 'all')}
            >
              <option value="month">This Month</option>
              <option value="all">All time</option>
            </select>
          </div>
          <ul className="space-y-3">
            {[
              { label: 'Stamps Collected', value: String(activity.stamps), tint: 'text-[#FF5A5F]' },
              { label: 'Rewards Redeemed', value: String(activity.redeemed), tint: 'text-[#6D28D9]' },
              {
                label: 'Total Saved',
                value: `Rs. ${activity.saved.toLocaleString()}`,
                tint: 'text-[#047857]',
              },
            ].map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between rounded-xl bg-[#F8F8FA] px-3 py-2.5 text-sm"
              >
                <span className="font-semibold text-[#8E8E93]">{row.label}</span>
                <span className={`font-extrabold ${row.tint}`}>{row.value}</span>
              </li>
            ))}
          </ul>
          <Link
            href="#my-cards"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-black/8 py-2.5 text-sm font-bold hover:bg-[#F8F8FA]"
          >
            View cards →
          </Link>
        </div>

        <div
          id="rewards"
          className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-extrabold">Recent Rewards</h2>
            <span className="rounded-full bg-[#FFF1F3] px-2.5 py-1 text-xs font-bold text-[#FF5A5F]">
              {readyCards.length} ready
            </span>
          </div>
          <div className="space-y-3">
            {readyCards.slice(0, 3).map((c) => (
              <div
                key={`ready-${c.id}`}
                className="flex items-center justify-between gap-2 rounded-xl bg-[#FFF1F3] px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{c.program.rewardTitle}</div>
                  <div className="truncate text-xs text-[#8E8E93]">{c.program.merchant.businessName}</div>
                </div>
                <button
                  type="button"
                  onClick={() => redeem(c.id)}
                  disabled={redeemingId === c.id}
                  className="shrink-0 rounded-full bg-[#FF5A5F] px-3 py-1.5 text-xs font-bold text-white"
                >
                  Redeem
                </button>
              </div>
            ))}
            {recentRedeems.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-[#F8F8FA] px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{r.rewardTitle}</div>
                  <div className="truncate text-xs text-[#8E8E93]">
                    {r.businessName} · {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="rounded-full bg-[#D1FAE5] px-2 py-0.5 text-[10px] font-bold text-[#047857]">
                  Redeemed
                </span>
              </div>
            ))}
            {!readyCards.length && !recentRedeems.length && (
              <p className="text-sm text-[#8E8E93]">No rewards yet — keep collecting stamps.</p>
            )}
          </div>
        </div>
      </div>

      {/* Favorite stores */}
      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold">Your favorite stores</h2>
          <Link href="/dashboard/discover" className="text-sm font-bold text-[#FF5A5F]">
            View All
          </Link>
        </div>
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {cards.map((c) => (
            <Link
              key={`fav-${c.id}`}
              href={`/b/${c.program.merchant.slug}`}
              className="w-40 shrink-0 rounded-xl border border-black/5 bg-[#F8F8FA] p-3 transition hover:border-[#FF5A5F]/25"
            >
              <div className="mb-2">
                <EntityAvatar
                  src={c.program.logoUrl || c.program.merchant.logoUrl}
                  name={c.program.merchant.businessName}
                  size="lg"
                  rounded="xl"
                />
              </div>
              <div className="truncate text-sm font-bold">{c.program.merchant.businessName}</div>
              <div className="mt-1 text-xs font-semibold text-[#FF5A5F]">
                {c.stampCount}/{c.program.totalStamps} stamps
              </div>
            </Link>
          ))}
          {!cards.length && (
            <p className="py-4 text-sm text-[#8E8E93]">Join a store to see favorites here.</p>
          )}
        </div>
      </div>

      {/* Offers banner */}
      <div
        id="offers"
        className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-black/5 bg-gradient-to-r from-[#FFF7ED] to-[#FFE8EA] p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="text-lg font-extrabold">Special offers for you</h2>
          <p className="mt-1 text-sm text-[#8E8E93]">
            {offers.length
              ? `${offers.length} active deal${offers.length === 1 ? '' : 's'} from nearby stores.`
              : 'Check out exciting deals from your favorite stores.'}
          </p>
          {offers[0] && (
            <p className="mt-2 text-sm font-bold text-[#FF5A5F]">
              {offers[0].badgeText}: {offers[0].title} · {offers[0].merchant?.businessName}
            </p>
          )}
        </div>
        <Link
          href="/dashboard/discover"
          className="shrink-0 rounded-full bg-[#FF5A5F] px-5 py-2.5 text-sm font-bold text-white"
        >
          Explore deals →
        </Link>
      </div>

      {/* Full card grid */}
      <div id="my-cards">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">My cards</h2>
          <span className="text-xs font-bold text-[var(--stampperk-muted)]">{cards.length} cards</span>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {cards.map((c) => {
            const m = c.program.merchant;
            const total = c.program.totalStamps || 1;
            const pct = Math.min(100, Math.round((c.stampCount / total) * 100));
            return (
              <div
                key={c.id}
                className="overflow-hidden rounded-2xl border border-black/5 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
              >
                <StampCardPreview
                  businessName={c.program.businessName || m.businessName || c.program.title}
                  categorySlug={c.program.categorySlug || undefined}
                  categoryLabel={
                    c.program.categorySlug
                      ? categoryLabelFromSlug(c.program.categorySlug)
                      : m.category || undefined
                  }
                  logoUrl={c.program.logoUrl || m.logoUrl || undefined}
                  promoImageUrl={c.program.promoImageUrl || undefined}
                  logoScale={c.program.logoScale ?? 1}
                  logoOffsetX={c.program.logoOffsetX ?? 0}
                  logoOffsetY={c.program.logoOffsetY ?? 0}
                  logoPosX={c.program.logoPosX ?? 50}
                  logoPosY={c.program.logoPosY ?? 32}
                  tagline={m.tagline || undefined}
                  totalStamps={c.program.totalStamps}
                  filledStamps={c.stampCount}
                  rewardTitle={c.program.rewardTitle}
                  stampColor={c.program.stampColor || undefined}
                  emptyStampColor={c.program.emptyStampColor || undefined}
                  accentColor={c.program.accentColor || undefined}
                  fontStyle={c.program.fontStyle || undefined}
                  doubleSided={c.program.doubleSided !== false}
                  profile={{
                    phone: m.phone,
                    email: m.email,
                    website: m.website,
                    address: m.address,
                    city: m.city,
                    facebook: m.facebook,
                    instagram: m.instagram,
                    tiktok: m.tiktok,
                    tagline: m.tagline,
                    slug: m.slug,
                  }}
                />
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="truncate">{m.businessName}</span>
                    <span className="text-[#FF5A5F]">
                      {c.stampCount}/{c.program.totalStamps}
                    </span>
                  </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#F1F5F9]">
                    <div className="h-full rounded-full bg-[#FF5A5F]" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.availableRewards > 0 && (
                      <button
                        type="button"
                        onClick={() => redeem(c.id)}
                        className="rounded-full bg-[#FF5A5F] px-4 py-2 text-xs font-bold text-white"
                      >
                        Redeem
                      </button>
                    )}
                    {c.stampCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setTransferCard(c);
                          setTransferAmount('1');
                          setTransferTo('');
                        }}
                        className="rounded-full border border-[#FF5A5F] px-4 py-2 text-xs font-bold text-[#FF5A5F]"
                      >
                        Transfer
                      </button>
                    )}
                    <Link
                      href={`/b/${m.slug}`}
                      className="rounded-full border border-black/8 px-4 py-2 text-xs font-bold"
                    >
                      View business →
                    </Link>
                  </div>
                  {c.expiresAt && (
                    <p className="text-[11px] font-semibold text-[#8E8E93]">
                      Stamps expire {new Date(c.expiresAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {!cards.length && (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-12 text-center shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <p className="font-extrabold">No cards yet</p>
            <p className="mt-2 text-sm text-[#8E8E93]">
              Discover nearby businesses and show your QR at the counter.
            </p>
            <Link
              href="/dashboard/discover"
              className="mt-4 inline-block rounded-full bg-[#FF5A5F] px-5 py-2.5 text-sm font-bold text-white"
            >
              Find stores
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
