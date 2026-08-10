'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MerchantPageHeader, MerchantSurface } from '@/components/MerchantPage';

type Rule = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  active: boolean;
};

const TRIGGER_HELP: Record<string, string> = {
  WIN_BACK_30: 'Customer inactive 30+ days → miss-you offer + push',
  BIRTHDAY: 'Customer birthday → birthday coupon + push',
  NEAR_REWARD: 'Within 2 stamps of reward → reminder push',
};

export default function AutomationsPage() {
  const { token } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    api<Rule[]>('/merchants/me/automations', { token })
      .then(setRules)
      .catch((e) => setError(e.message));
  }, [token]);

  useEffect(load, [load]);

  async function toggle(id: string, active: boolean) {
    if (!token) return;
    setBusy(true);
    try {
      const rows = await api<Rule[]>(`/merchants/me/automations/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ active }),
      });
      setRules(rows);
      setMsg(active ? 'Rule enabled' : 'Rule paused');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function runNow() {
    if (!token) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await api<{ fired: number }>('/merchants/me/automations/run', {
        method: 'POST',
        token,
      });
      setMsg(`Ran automations — ${res.fired} actions fired`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <MerchantPageHeader
        title="Automations"
        subtitle="Win-back, birthday, and near-reward triggers (daily + manual run)."
        action={
          <button
            type="button"
            disabled={busy}
            onClick={() => void runNow()}
            className="rounded-xl bg-[#FF5A5F] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            Run now
          </button>
        }
      />
      {error && <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>}
      {msg && <p className="mb-3 text-sm font-semibold text-emerald-700">{msg}</p>}
      <div className="space-y-3">
        {rules.map((r) => (
          <MerchantSurface key={r.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-extrabold">{r.name}</div>
                <div className="mt-0.5 text-xs text-[#8E8E93]">
                  {TRIGGER_HELP[r.trigger] || r.trigger} · action {r.action}
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggle(r.id, !r.active)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  r.active
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {r.active ? 'Active' : 'Paused'}
              </button>
            </div>
          </MerchantSurface>
        ))}
        {!rules.length && <p className="text-sm text-[#8E8E93]">Loading rules…</p>}
      </div>
    </div>
  );
}
