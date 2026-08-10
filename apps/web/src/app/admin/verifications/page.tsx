'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { EntityAvatar } from '@/components/EntityAvatar';

type VerificationRow = {
  id: string;
  businessName: string;
  slug: string;
  logoUrl?: string | null;
  verificationStatus: string;
  verificationNote?: string | null;
  verificationDocUrls?: string[] | null;
  registrationNumber?: string | null;
  panVatNumber?: string | null;
  verified?: boolean;
  owner?: { name: string; email: string };
  subscription?: { verifiedAddon?: boolean; verifiedUntil?: string | null; plan?: string };
};

export default function AdminVerificationsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [filter, setFilter] = useState('PENDING');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const qs = filter ? `?status=${filter}` : '';
      const data = await api<VerificationRow[]>(`/admin/verifications${qs}`, { token });
      setRows(data);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [token, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, action: 'APPROVE' | 'REJECT' | 'REVOKE') {
    if (!token) return;
    setBusy(true);
    try {
      await api(`/admin/verifications/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ action }),
      });
      setMsg(`${action} ok`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  const docs = (row: VerificationRow) => {
    const raw = row.verificationDocUrls;
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === 'string') {
      try {
        const p = JSON.parse(raw);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">Verified Badge queue</h1>
      <p className="mb-6 text-sm text-[#8E8E93]">
        Review KYC docs, then merchants pay the Verified add-on to go live.
      </p>
      {msg && <p className="mb-4 text-sm font-semibold text-[#FF5A5F]">{msg}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        {['PENDING', 'APPROVED', 'REJECTED', 'REVOKED', ''].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              filter === s ? 'bg-[#FF5A5F] text-white' : 'border border-black/8 bg-white'
            }`}
          >
            {s || 'All submitted'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {!rows.length && (
          <p className="rounded-xl border border-black/8 bg-white p-6 text-sm text-[#8E8E93]">
            No applications in this filter.
          </p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-black/8 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <EntityAvatar src={r.logoUrl} name={r.businessName} size="lg" rounded="xl" />
                <div>
                <div className="flex items-center gap-2 text-lg font-extrabold">
                  {r.businessName}
                  {r.verified ? <VerifiedBadge size="sm" /> : null}
                </div>
                <p className="text-sm text-[#8E8E93]">
                  {r.owner?.name} · {r.owner?.email} · {r.verificationStatus}
                  {r.subscription?.plan ? ` · plan ${r.subscription.plan}` : ''}
                </p>
                <p className="mt-1 text-xs text-[#8E8E93]">
                  Reg: {r.registrationNumber || '—'} · PAN/VAT: {r.panVatNumber || '—'}
                </p>
                {r.verificationNote ? (
                  <p className="mt-1 text-sm text-[#6B7280]">Note: {r.verificationNote}</p>
                ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.verificationStatus === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                      onClick={() => void act(r.id, 'APPROVE')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white"
                      onClick={() => void act(r.id, 'REJECT')}
                    >
                      Reject
                    </button>
                  </>
                )}
                {(r.verificationStatus === 'APPROVED' || r.verified) && (
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-bold"
                    onClick={() => void act(r.id, 'REVOKE')}
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
            {docs(r).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {docs(r).map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-black/8 px-2 py-1 text-xs font-bold text-[#FF5A5F]"
                  >
                    Doc
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
