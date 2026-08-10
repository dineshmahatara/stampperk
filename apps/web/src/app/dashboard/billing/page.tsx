'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { api, uploadMedia } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { PLAN_DISPLAY_NAMES, VERIFIED_ADDON_PRICES } from '@stampz/shared';

type VerificationState = {
  verificationStatus: string;
  verified: boolean;
  canPay: boolean;
  canApply: boolean;
  verifiedUntil?: string | null;
  verificationNote?: string | null;
  registrationNumber?: string | null;
  panVatNumber?: string | null;
};

type SubscriptionState = {
  plan?: string;
  status?: string;
  displayName?: string;
  trialEndsAt?: string | null;
  graceEndsAt?: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
  extraBranches?: number;
  extraStaff?: number;
};

type InvoiceRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description?: string | null;
  paidAt?: string | null;
  createdAt: string;
  pdfUrl?: string | null;
};

function daysUntil(iso?: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

export default function BillingPage() {
  const { token } = useAuth();
  const [plans, setPlans] = useState<Record<string, unknown> | null>(null);
  const [sub, setSub] = useState<SubscriptionState | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [verification, setVerification] = useState<VerificationState | null>(null);
  const [msg, setMsg] = useState('');
  const [reg, setReg] = useState('');
  const [pan, setPan] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docUrls, setDocUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    api<Record<string, unknown>>('/billing/plans').then(setPlans).catch(() => undefined);
    if (!token) return;
    api<SubscriptionState>('/billing/subscription', { token }).then(setSub).catch(() => undefined);
    api<InvoiceRow[]>('/billing/invoices', { token }).then(setInvoices).catch(() => setInvoices([]));
    try {
      const v = await api<VerificationState>('/merchants/me/verification', { token });
      setVerification(v);
      setReg(v.registrationNumber || '');
      setPan(v.panVatNumber || '');
    } catch {
      setVerification(null);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const planKey = (sub?.plan || 'FREE') as keyof typeof PLAN_DISPLAY_NAMES;
  const displayName =
    sub?.displayName || PLAN_DISPLAY_NAMES[planKey] || String(sub?.plan || 'Free');
  const trialDays = useMemo(() => daysUntil(sub?.trialEndsAt), [sub?.trialEndsAt]);
  const graceDays = useMemo(() => daysUntil(sub?.graceEndsAt), [sub?.graceEndsAt]);
  const showTrial =
    (sub?.status === 'TRIALING' || !!sub?.trialEndsAt) && trialDays !== null && trialDays >= 0;

  async function checkout(plan: 'MONTHLY' | 'YEARLY') {
    if (!token) return;
    const res = await api<{ mode: string; url: string | null; subscription?: SubscriptionState }>(
      '/billing/checkout',
      {
        method: 'POST',
        token,
        body: JSON.stringify({ plan }),
      },
    );
    if (res.url) window.location.href = res.url;
    else {
      setMsg(`Upgraded via ${res.mode} checkout`);
      await load();
    }
  }

  async function cancelPlan() {
    if (!token) return;
    if (!window.confirm('Cancel at the end of the current billing period?')) return;
    setBusy(true);
    try {
      await api('/billing/cancel', { method: 'POST', token });
      setMsg('Cancellation scheduled for the end of the billing period');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Cancel failed');
    } finally {
      setBusy(false);
    }
  }

  async function verifiedCheckout(interval: 'monthly' | 'yearly') {
    if (!token) return;
    setBusy(true);
    try {
      const res = await api<{ mode: string; url: string | null; verified?: boolean }>(
        '/billing/verified/checkout',
        {
          method: 'POST',
          token,
          body: JSON.stringify({ interval }),
        },
      );
      if (res.url) window.location.href = res.url;
      else {
        setMsg('Verified add-on activated (mock checkout)');
        await load();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setBusy(false);
    }
  }

  async function uploadDoc(file: File) {
    if (!token) return;
    setBusy(true);
    try {
      const up = await uploadMedia(file, { token });
      setDocUrls((prev) => [...prev, up.url]);
      setMsg('Document uploaded');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function apply(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    const urls = [...docUrls];
    if (docUrl.trim()) urls.push(docUrl.trim());
    if (!urls.length) {
      setMsg('Add at least one document URL or upload');
      return;
    }
    setBusy(true);
    try {
      await api('/merchants/me/verification', {
        method: 'POST',
        token,
        body: JSON.stringify({
          registrationNumber: reg || undefined,
          panVatNumber: pan || undefined,
          docUrls: urls,
        }),
      });
      setMsg('Application submitted — waiting for admin review');
      setDocUrl('');
      setDocUrls([]);
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Apply failed');
    } finally {
      setBusy(false);
    }
  }

  async function restoreApple() {
    if (!token) return;
    await api('/billing/iap/apple', {
      method: 'POST',
      token,
      body: JSON.stringify({
        originalTransactionId: `demo-apple-${Date.now()}`,
        productId: 'stampz_yearly',
      }),
    });
    setMsg('Apple IAP verified (demo)');
    await load();
  }

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">Billing</h1>
      <p className="mb-6 text-[#6b7280]">
        Current plan: {displayName}
        {sub?.status ? ` · ${sub.status}` : ''}
      </p>
      {msg && <p className="mb-4 font-semibold text-[#e8455a]">{msg}</p>}

      {showTrial && (
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900">
          Trial ends in {trialDays} day{trialDays === 1 ? '' : 's'}
          {sub?.trialEndsAt ? ` (${new Date(sub.trialEndsAt).toLocaleDateString()})` : ''}.
        </div>
      )}

      {sub?.status === 'PAST_DUE' && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Payment past due
          {graceDays !== null && graceDays >= 0
            ? ` — grace period ends in ${graceDays} day${graceDays === 1 ? '' : 's'}`
            : sub?.graceEndsAt
              ? ` — grace ended ${new Date(sub.graceEndsAt).toLocaleDateString()}`
              : ''}
          . Update payment to keep your plan active.
        </div>
      )}

      {sub?.cancelAtPeriodEnd && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
          Cancellation scheduled
          {sub.currentPeriodEnd
            ? ` — access continues until ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
            : ' at the end of the current period'}
          .
        </div>
      )}

      <div className="mb-8 rounded-2xl border-2 border-[#FF5A5F]/25 bg-[#FFF5F5] p-5">
        <div className="mb-2 flex items-center gap-2">
          <VerifiedBadge size="lg" />
          <h2 className="text-xl font-extrabold">Stampz Verified</h2>
        </div>
        <p className="mb-4 text-sm text-[#6B7280]">
          Stand out on Discover, earn customer trust with a Verified checkmark, and get ranking boost —
          ${VERIFIED_ADDON_PRICES.monthly.price}/mo or ${VERIFIED_ADDON_PRICES.yearly.price}/yr.
        </p>

        {verification && (
          <p className="mb-3 text-sm font-bold">
            Status: {verification.verificationStatus}
            {verification.verified ? ' · LIVE' : ''}
            {verification.verifiedUntil
              ? ` · until ${new Date(verification.verifiedUntil).toLocaleDateString()}`
              : ''}
          </p>
        )}
        {verification?.verificationNote && (
          <p className="mb-3 text-sm text-[#6B7280]">Note: {verification.verificationNote}</p>
        )}

        {verification?.canApply && (
          <form onSubmit={apply} className="mb-4 space-y-3 rounded-xl bg-white p-4">
            <p className="text-sm font-bold">Apply for verification</p>
            <label className="block text-sm">
              Registration number
              <input
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
                value={reg}
                onChange={(e) => setReg(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              PAN / VAT
              <input
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
                value={pan}
                onChange={(e) => setPan(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Document URL
              <input
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="https://… or upload below"
              />
            </label>
            <label className="block text-sm">
              Upload scan
              <input
                type="file"
                accept="image/*,.pdf"
                className="mt-1 block w-full text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadDoc(f);
                }}
              />
            </label>
            {!!docUrls.length && (
              <ul className="text-xs text-[#6B7280]">
                {docUrls.map((u) => (
                  <li key={u} className="truncate">
                    {u}
                  </li>
                ))}
              </ul>
            )}
            <button className="btn-primary" disabled={busy}>
              Submit for review
            </button>
          </form>
        )}

        {verification?.verificationStatus === 'PENDING' && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            Your application is pending admin review.
          </p>
        )}

        {verification?.canPay && !verification.verified && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="btn-primary"
              onClick={() => void verifiedCheckout('monthly')}
            >
              Activate monthly · ${VERIFIED_ADDON_PRICES.monthly.price}
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-xl border border-[#FF5A5F] px-4 py-2.5 text-sm font-bold text-[#FF5A5F]"
              onClick={() => void verifiedCheckout('yearly')}
            >
              Yearly · ${VERIFIED_ADDON_PRICES.yearly.price}
            </button>
          </div>
        )}

        {verification?.verified && (
          <p className="text-sm font-bold text-emerald-700">
            Your Verified badge is live on Discover and your public profile.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <h2 className="font-bold">{PLAN_DISPLAY_NAMES.FREE}</h2>
          <p className="mt-2 text-3xl font-extrabold">$0</p>
          <p className="mt-2 text-sm text-[#6b7280]">1 card · limited stamps</p>
        </div>
        <div className="card border-2 border-[#e8455a] p-5">
          <div className="text-xs font-bold uppercase text-[#e8455a]">Most popular</div>
          <h2 className="font-bold">{PLAN_DISPLAY_NAMES.MONTHLY}</h2>
          <p className="mt-2 text-3xl font-extrabold">$4.99</p>
          <button className="btn-primary mt-4 w-full" onClick={() => checkout('MONTHLY')}>
            Continue {PLAN_DISPLAY_NAMES.MONTHLY} →
          </button>
        </div>
        <div className="card p-5">
          <div className="text-xs font-bold uppercase text-[#e8455a]">Best value · 33% off</div>
          <h2 className="font-bold">{PLAN_DISPLAY_NAMES.YEARLY}</h2>
          <p className="mt-2 text-3xl font-extrabold">$39.99</p>
          <button className="btn-primary mt-4 w-full" onClick={() => checkout('YEARLY')}>
            Continue {PLAN_DISPLAY_NAMES.YEARLY} →
          </button>
          <button className="mt-3 w-full text-sm text-[#e8455a] underline" onClick={restoreApple}>
            Restore / verify Apple IAP (demo)
          </button>
        </div>
      </div>

      {sub && sub.plan && sub.plan !== 'FREE' && !sub.cancelAtPeriodEnd && sub.status !== 'CANCELED' && (
        <div className="mt-6">
          <button
            type="button"
            disabled={busy}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            onClick={() => void cancelPlan()}
          >
            Cancel at period end
          </button>
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="text-xl font-bold">Seat add-ons</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Extra branches and staff seats beyond your {displayName} plan limits.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="text-sm font-semibold">
            Extra branches
            <input
              type="number"
              min={0}
              className="mt-1 block w-28 rounded-lg border border-black/10 px-3 py-2"
              value={sub?.extraBranches ?? 0}
              onChange={(e) =>
                setSub((s) =>
                  s ? { ...s, extraBranches: Math.max(0, Number(e.target.value) || 0) } : s,
                )
              }
            />
          </label>
          <label className="text-sm font-semibold">
            Extra staff
            <input
              type="number"
              min={0}
              className="mt-1 block w-28 rounded-lg border border-black/10 px-3 py-2"
              value={sub?.extraStaff ?? 0}
              onChange={(e) =>
                setSub((s) =>
                  s ? { ...s, extraStaff: Math.max(0, Number(e.target.value) || 0) } : s,
                )
              }
            />
          </label>
          <button
            type="button"
            disabled={busy || !token}
            className="rounded-xl bg-[#FF5A5F] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            onClick={async () => {
              if (!token || !sub) return;
              setBusy(true);
              try {
                const updated = await api<SubscriptionState>('/billing/addons', {
                  method: 'POST',
                  token,
                  body: JSON.stringify({
                    extraBranches: sub.extraBranches || 0,
                    extraStaff: sub.extraStaff || 0,
                  }),
                });
                setSub((s) => ({ ...s, ...updated }));
                setMsg('Seat add-ons updated');
              } catch (e) {
                setMsg(e instanceof Error ? e.message : 'Failed');
              } finally {
                setBusy(false);
              }
            }}
          >
            Save add-ons
          </button>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-xl font-bold">Invoices</h2>
        {!invoices.length ? (
          <p className="text-sm text-[#6b7280]">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-black/5">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#F8F8FA] text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-black/5">
                    <td className="px-4 py-3">
                      {new Date(inv.paidAt || inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{inv.description || 'Subscription'}</td>
                    <td className="px-4 py-3 font-semibold">
                      {inv.currency} {inv.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {inv.pdfUrl ? (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-[#e8455a] underline"
                        >
                          {inv.status}
                        </a>
                      ) : (
                        inv.status
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {plans && (
        <pre className="mt-6 overflow-auto rounded-xl bg-black/5 p-3 text-xs">
          {JSON.stringify(plans, null, 2)}
        </pre>
      )}
    </div>
  );
}
