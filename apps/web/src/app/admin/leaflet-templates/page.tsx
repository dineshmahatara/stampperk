'use client';

import { FormEvent, useEffect, useState } from 'react';
import { LEAFLET_LAYOUTS } from '@stampperk/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AdminEmpty, AdminError, AdminPageHeader, AdminSurface } from '@/components/AdminPage';
import { LeafletPreview } from '@/components/LeafletPreview';

type Template = {
  id: string;
  name: string;
  description?: string | null;
  previewUrl?: string | null;
  layoutId: string;
  categoryTags?: string | null;
  active: boolean;
  sortOrder: number;
  _count?: { leaflets: number };
};

const empty = {
  name: '',
  description: '',
  layoutId: 'hero-a5' as string,
  categoryTags: '',
  previewUrl: '',
  active: true,
  sortOrder: 0,
};

export default function AdminLeafletTemplatesPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Template[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    if (!token) return;
    api<Template[]>('/admin/leaflet-templates', { token })
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }

  useEffect(load, [token]);

  function startEdit(t: Template) {
    setEditingId(t.id);
    setForm({
      name: t.name,
      description: t.description || '',
      layoutId: t.layoutId,
      categoryTags: t.categoryTags || '',
      previewUrl: t.previewUrl || '',
      active: t.active,
      sortOrder: t.sortOrder,
    });
    setMsg('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(empty);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const body = {
        name: form.name,
        description: form.description || undefined,
        layoutId: form.layoutId,
        categoryTags: form.categoryTags || undefined,
        previewUrl: form.previewUrl || undefined,
        active: form.active,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editingId) {
        await api(`/admin/leaflet-templates/${editingId}`, {
          method: 'PATCH',
          token,
          body,
        });
        setMsg('Template updated');
      } else {
        await api('/admin/leaflet-templates', { method: 'POST', token, body });
        setMsg('Template created');
      }
      cancelEdit();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(t: Template) {
    if (!token) return;
    try {
      await api(`/admin/leaflet-templates/${t.id}`, {
        method: 'PATCH',
        token,
        body: { active: !t.active },
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Leaflet templates"
        subtitle="Fixed layouts merchants use to build promo flyers."
      />
      {error ? <AdminError message={error} /> : null}
      {msg ? <p className="text-sm font-semibold text-emerald-600">{msg}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <AdminSurface>
          <h2 className="mb-3 text-sm font-extrabold">Templates</h2>
          {!items.length ? (
            <AdminEmpty message="No templates yet — create one or run seed." />
          ) : (
            <ul className="space-y-2">
              {items.map((t) => {
                const layout = LEAFLET_LAYOUTS.find((l) => l.id === t.layoutId);
                return (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/8 bg-white px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-[#1C1C1E]">{t.name}</div>
                      <div className="text-xs text-[#8E8E93]">
                        {layout?.label || t.layoutId}
                        {t.categoryTags ? ` · ${t.categoryTags}` : ''}
                        {t._count ? ` · ${t._count.leaflets} used` : ''}
                        {!t.active ? ' · inactive' : ''}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(t)}
                        className="rounded-full border border-black/10 px-3 py-1 text-xs font-bold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleActive(t)}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          t.active ? 'bg-[#F4F5F7] text-[#5C5651]' : 'bg-[#FF5A5F] text-white'
                        }`}
                      >
                        {t.active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminSurface>

        <AdminSurface>
          <h2 className="mb-3 text-sm font-extrabold">
            {editingId ? 'Edit template' : 'New template'}
          </h2>
          <form className="space-y-3" onSubmit={onSubmit}>
            <label className="block text-xs font-bold uppercase text-[#8E8E93]">
              Name
              <input
                className="mt-1 w-full rounded-xl border border-black/8 bg-[#F8F8FA] px-3 py-2 text-sm font-semibold"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className="block text-xs font-bold uppercase text-[#8E8E93]">
              Description
              <textarea
                className="mt-1 w-full rounded-xl border border-black/8 bg-[#F8F8FA] px-3 py-2 text-sm"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="block text-xs font-bold uppercase text-[#8E8E93]">
              Layout
              <select
                className="mt-1 w-full rounded-xl border border-black/8 bg-[#F8F8FA] px-3 py-2 text-sm font-semibold"
                value={form.layoutId}
                onChange={(e) => setForm({ ...form, layoutId: e.target.value })}
              >
                {LEAFLET_LAYOUTS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label} — {l.description}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase text-[#8E8E93]">
              Category tags
              <input
                className="mt-1 w-full rounded-xl border border-black/8 bg-[#F8F8FA] px-3 py-2 text-sm"
                placeholder="food,promo"
                value={form.categoryTags}
                onChange={(e) => setForm({ ...form, categoryTags: e.target.value })}
              />
            </label>
            <label className="block text-xs font-bold uppercase text-[#8E8E93]">
              Sort order
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-black/8 bg-[#F8F8FA] px-3 py-2 text-sm"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Active for merchants
            </label>
            <div className="rounded-xl bg-[#F8F8FA] p-3">
              <div className="mb-2 text-[10px] font-bold uppercase text-[#8E8E93]">Layout preview</div>
              <LeafletPreview
                layoutId={form.layoutId}
                businessName="Sample Cafe"
                headline="Welcome offer"
                offerText="Buy 5 get 1 free"
                qrTarget="https://stampperk.app"
                compact
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-[#FF5A5F] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create template'}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-full border border-black/10 px-4 py-2 text-sm font-bold"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </AdminSurface>
      </div>
    </div>
  );
}
