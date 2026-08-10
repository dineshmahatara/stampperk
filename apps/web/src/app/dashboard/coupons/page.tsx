'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MerchantPageHeader, MerchantSurface } from '@/components/MerchantPage';

type CouponType = 'PERCENT' | 'FIXED' | 'FIRST_VISIT' | 'BIRTHDAY' | 'REFERRAL';
type Segment = 'ALL' | 'NEW' | 'RETURNING' | 'VIP' | 'AT_RISK';

type Coupon = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  type: CouponType;
  value: number;
  expiresAt?: string | null;
  usageLimit?: number | null;
  usedCount: number;
  active: boolean;
  branchId?: string | null;
  segment: Segment;
  branch?: { id: string; name: string } | null;
  _count?: { redemptions: number };
};

type Branch = { id: string; name: string };

type FormState = {
  code: string;
  title: string;
  type: CouponType;
  value: string;
  expiresAt: string;
  usageLimit: string;
  branchId: string;
  segment: Segment;
  active: boolean;
};

const emptyForm = (): FormState => ({
  code: '',
  title: '',
  type: 'PERCENT',
  value: '10',
  expiresAt: '',
  usageLimit: '',
  branchId: '',
  segment: 'ALL',
  active: true,
});

function toDateInput(v?: string | null) {
  if (!v) return '';
  return String(v).slice(0, 10);
}

export default function CouponsPage() {
  const { token } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [redeem, setRedeem] = useState({ code: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  function load() {
    if (!token) return;
    Promise.all([
      api<Coupon[]>('/merchants/me/coupons', { token }),
      api<{ branches?: Branch[] }>('/merchants/me', { token }),
    ])
      .then(([list, merchant]) => {
        setCoupons(list);
        setBranches(merchant.branches || []);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(load, [token]);

  function resetForm() {
    setForm(emptyForm());
    setEditingId(null);
  }

  function startEdit(c: Coupon) {
    setEditingId(c.id);
    setForm({
      code: c.code,
      title: c.title,
      type: c.type,
      value: String(c.value),
      expiresAt: toDateInput(c.expiresAt),
      usageLimit: c.usageLimit != null ? String(c.usageLimit) : '',
      branchId: c.branchId || '',
      segment: c.segment || 'ALL',
      active: c.active,
    });
    setError('');
    setMsg('');
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    setMsg('');
    const payload = {
      code: form.code.trim(),
      title: form.title.trim(),
      type: form.type,
      value: Number(form.value) || 0,
      expiresAt: form.expiresAt || null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      branchId: form.branchId || null,
      segment: form.segment,
      active: form.active,
    };
    try {
      if (editingId) {
        await api(`/merchants/me/coupons/${editingId}`, {
          method: 'PATCH',
          token,
          body: payload,
        });
        setMsg('Coupon updated');
      } else {
        await api('/merchants/me/coupons', { method: 'POST', token, body: payload });
        setMsg('Coupon created');
      }
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save coupon');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c: Coupon) {
    if (!token) return;
    try {
      await api(`/merchants/me/coupons/${c.id}`, {
        method: 'PATCH',
        token,
        body: { active: !c.active },
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update coupon');
    }
  }

  async function redeemCoupon(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await api('/merchants/me/coupons/redeem', {
        method: 'POST',
        token,
        body: { code: redeem.code.trim(), email: redeem.email.trim() },
      });
      setMsg('Coupon redeemed');
      setRedeem({ code: '', email: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Redeem failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <MerchantPageHeader
        title="Coupons"
        subtitle="Discount codes for walk-ins, birthdays, and segments."
      />
      {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}
      {msg && <p className="mb-4 text-sm font-semibold text-emerald-700">{msg}</p>}

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <MerchantSurface>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-extrabold">{editingId ? 'Edit coupon' : 'Create coupon'}</h2>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-bold text-[#8E8E93] hover:text-[#1C1C1E]"
                >
                  Cancel
                </button>
              )}
            </div>
            <form onSubmit={save} className="space-y-2.5">
              <input
                className="w-full rounded-xl border border-black/8 px-3 py-2 text-sm"
                placeholder="Code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                required
              />
              <input
                className="w-full rounded-xl border border-black/8 px-3 py-2 text-sm"
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="rounded-xl border border-black/8 px-3 py-2 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CouponType }))}
                >
                  {(['PERCENT', 'FIXED', 'FIRST_VISIT', 'BIRTHDAY', 'REFERRAL'] as const).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="rounded-xl border border-black/8 px-3 py-2 text-sm"
                  placeholder="Value"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  className="rounded-xl border border-black/8 px-3 py-2 text-sm"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                />
                <input
                  type="number"
                  min={1}
                  className="rounded-xl border border-black/8 px-3 py-2 text-sm"
                  placeholder="Usage limit"
                  value={form.usageLimit}
                  onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                />
              </div>
              <select
                className="w-full rounded-xl border border-black/8 px-3 py-2 text-sm"
                value={form.branchId}
                onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-xl border border-black/8 px-3 py-2 text-sm"
                value={form.segment}
                onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value as Segment }))}
              >
                {(['ALL', 'NEW', 'RETURNING', 'VIP', 'AT_RISK'] as const).map((s) => (
                  <option key={s} value={s}>
                    Segment: {s}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
                Active
              </label>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-[#FF5A5F] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {editingId ? 'Save changes' : 'Create coupon'}
              </button>
            </form>
          </MerchantSurface>

          <MerchantSurface>
            <h2 className="mb-3 text-sm font-extrabold">Redeem coupon</h2>
            <form onSubmit={redeemCoupon} className="space-y-2.5">
              <input
                className="w-full rounded-xl border border-black/8 px-3 py-2 text-sm"
                placeholder="Coupon code"
                value={redeem.code}
                onChange={(e) => setRedeem((r) => ({ ...r, code: e.target.value.toUpperCase() }))}
                required
              />
              <input
                type="email"
                className="w-full rounded-xl border border-black/8 px-3 py-2 text-sm"
                placeholder="Customer email"
                value={redeem.email}
                onChange={(e) => setRedeem((r) => ({ ...r, email: e.target.value }))}
                required
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full border border-black/10 bg-[#F4F5F7] px-4 py-2.5 text-sm font-bold disabled:opacity-60"
              >
                Redeem
              </button>
            </form>
          </MerchantSurface>
        </div>

        <MerchantSurface>
          <h2 className="mb-4 text-sm font-extrabold">Your coupons</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/5 text-xs uppercase tracking-wide text-[#8E8E93]">
                  <th className="pb-3 pr-3 font-bold">Code</th>
                  <th className="pb-3 pr-3 font-bold">Offer</th>
                  <th className="pb-3 pr-3 font-bold">Segment</th>
                  <th className="pb-3 pr-3 font-bold">Used</th>
                  <th className="pb-3 pr-3 font-bold">Expires</th>
                  <th className="pb-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-b border-black/4 last:border-0">
                    <td className="py-3.5 pr-3">
                      <div className="font-extrabold tracking-wide">{c.code}</div>
                      <div className="text-xs text-[#8E8E93]">{c.active ? 'Active' : 'Inactive'}</div>
                    </td>
                    <td className="py-3.5 pr-3">
                      <div className="font-bold">{c.title}</div>
                      <div className="text-xs text-[#8E8E93]">
                        {c.type} · {c.value}
                        {c.branch ? ` · ${c.branch.name}` : ''}
                      </div>
                    </td>
                    <td className="py-3.5 pr-3">{c.segment}</td>
                    <td className="py-3.5 pr-3 font-bold">
                      {c.usedCount}
                      {c.usageLimit != null ? ` / ${c.usageLimit}` : ''}
                    </td>
                    <td className="py-3.5 pr-3 text-[#8E8E93]">
                      {c.expiresAt ? toDateInput(c.expiresAt) : '—'}
                    </td>
                    <td className="py-3.5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="text-xs font-bold text-[#FF5A5F]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(c)}
                          className="text-xs font-bold text-[#8E8E93]"
                        >
                          {c.active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!coupons.length && (
              <p className="py-8 text-center text-sm text-[#8E8E93]">No coupons yet.</p>
            )}
          </div>
        </MerchantSurface>
      </div>
    </div>
  );
}
