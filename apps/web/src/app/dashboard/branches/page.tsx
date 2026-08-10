'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MerchantPageHeader, MerchantSurface } from '@/components/MerchantPage';
import { MapLocationPicker } from '@/components/MapLocationPickerDynamic';
import { googleMapsLink } from '@/lib/geo';

type Branch = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};
type Merchant = { branches?: Branch[]; businessName?: string };

type BranchForm = {
  name: string;
  address: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
};

const emptyForm = (): BranchForm => ({
  name: '',
  address: '',
  phone: '',
  latitude: null,
  longitude: null,
});

export default function BranchesPage() {
  const { token } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  function load() {
    if (!token) return;
    api<Merchant>('/merchants/me', { token })
      .then((m) => setBranches(m.branches || []))
      .catch((e) => setError(e.message));
  }

  useEffect(load, [token]);

  function resetForm() {
    setForm(emptyForm());
    setEditingId(null);
  }

  function startEdit(b: Branch) {
    setEditingId(b.id);
    setForm({
      name: b.name || '',
      address: b.address || '',
      phone: b.phone || '',
      latitude: b.latitude ?? null,
      longitude: b.longitude ?? null,
    });
    setError('');
    setMsg('');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function save() {
    if (!token || !form.name.trim()) {
      setError('Branch name is required');
      return;
    }
    setBusy(true);
    setError('');
    setMsg('');
    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
      latitude: form.latitude ?? undefined,
      longitude: form.longitude ?? undefined,
    };
    try {
      if (editingId) {
        await api(`/merchants/me/branches/${editingId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({
            name: form.name.trim(),
            address: form.address.trim(),
            phone: form.phone.trim(),
            latitude: form.latitude,
            longitude: form.longitude,
          }),
        });
        setMsg('Branch updated');
      } else {
        await api('/merchants/me/branches', {
          method: 'POST',
          token,
          body: JSON.stringify(payload),
        });
        setMsg('Branch added');
      }
      resetForm();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : editingId ? 'Could not update branch' : 'Could not add branch');
    } finally {
      setBusy(false);
    }
  }

  async function remove(b: Branch) {
    if (!token) return;
    if (!confirm(`Delete branch “${b.name}”? Staff assigned to it will be unassigned.`)) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await api(`/merchants/me/branches/${b.id}`, { method: 'DELETE', token });
      if (editingId === b.id) resetForm();
      setMsg('Branch deleted');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete branch');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <MerchantPageHeader title="Branches" subtitle="Locations for your business." />
      {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}
      {msg && <p className="mb-4 text-sm font-semibold text-emerald-700">{msg}</p>}
      <MerchantSurface>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-extrabold text-[#1C1C1E]">
            {editingId ? 'Edit branch' : 'Add branch'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-bold text-[#8E8E93] hover:text-[#1C1C1E]"
            >
              Cancel edit
            </button>
          )}
        </div>
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          <input
            className="rounded-xl border border-black/8 px-3 py-2 text-sm"
            placeholder="Branch name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="rounded-xl border border-black/8 px-3 py-2 text-sm"
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
          <input
            className="rounded-xl border border-black/8 px-3 py-2 text-sm sm:col-span-2"
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div className="mb-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
            Branch map pin
          </div>
          <MapLocationPicker
            latitude={form.latitude}
            longitude={form.longitude}
            fillAddress={!form.address.trim()}
            heightClassName="h-52"
            onChange={(v) => {
              setForm((f) => ({
                ...f,
                latitude: v.latitude,
                longitude: v.longitude,
                address: v.address && !f.address.trim() ? v.address : f.address,
              }));
            }}
          />
        </div>
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-full bg-[#FF5A5F] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add branch'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              disabled={busy}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-[#1C1C1E]"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
          Your branches ({branches.length})
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {branches.map((b) => (
            <div
              key={b.id}
              className={`rounded-xl border p-4 ${
                editingId === b.id ? 'border-[#FF5A5F]/40 bg-[#FFF1F3]' : 'border-black/5 bg-[#F4F5F7]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-extrabold">{b.name}</div>
                  <div className="text-sm text-[#8E8E93]">{b.address || 'No address'}</div>
                  {b.phone && <div className="text-xs text-[#8E8E93]">{b.phone}</div>}
                  {b.latitude != null && b.longitude != null && (
                    <a
                      href={googleMapsLink(b.latitude, b.longitude)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs font-bold text-[#FF5A5F]"
                    >
                      {b.latitude.toFixed(5)}, {b.longitude.toFixed(5)} · Open map →
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => startEdit(b)}
                    disabled={busy}
                    className="rounded-lg border border-black/8 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1C1C1E] hover:bg-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(b)}
                    disabled={busy}
                    className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!branches.length && <p className="text-sm text-[#8E8E93]">No branches yet.</p>}
        </div>
      </MerchantSurface>
    </div>
  );
}
