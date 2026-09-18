'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { REWARD_CAMPAIGN_TYPES } from '@stampperk/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Campaign = {
  id: string;
  title: string;
  description: string;
  badgeText: string;
  status: string;
  offerType?: string;
  discountValue?: number | null;
  campaignPreset?: string | null;
};

type CampaignData = {
  stats: Record<string, number>;
  campaigns: Campaign[];
};

const empty = {
  title: '',
  description: '',
  badgeText: '20% OFF',
  offerType: 'PERCENTAGE' as const,
  discountValue: 20,
  status: 'ACTIVE' as const,
  campaignPreset: '',
};

export default function CampaignsPage() {
  const { t } = useTranslation('common');
  const { token, user } = useAuth();
  const [data, setData] = useState<CampaignData | null>(null);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const canWrite = user?.role === 'MERCHANT_OWNER';

  function load() {
    if (!token) return;
    api<CampaignData>('/campaigns', { token }).then(setData).catch(() => undefined);
  }
  useEffect(load, [token]);

  function startEdit(c: Campaign) {
    setEditingId(c.id);
    setForm({
      title: c.title,
      description: c.description,
      badgeText: c.badgeText,
      offerType: (c.offerType as 'PERCENTAGE') || 'PERCENTAGE',
      discountValue: c.discountValue ?? 20,
      status: (c.status as 'ACTIVE') || 'ACTIVE',
      campaignPreset: c.campaignPreset || '',
    });
  }

  function applyPreset(id: string) {
    const preset = REWARD_CAMPAIGN_TYPES.find((p) => p.id === id);
    if (!preset) {
      setForm({ ...form, campaignPreset: '' });
      return;
    }
    setForm({
      ...form,
      campaignPreset: preset.id,
      title: preset.label.slice(0, 40),
      description: preset.description.slice(0, 100),
      badgeText: preset.badge.slice(0, 12),
      offerType: preset.offerType,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(empty);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!token || !canWrite) return;
    setMsg('');
    try {
      if (editingId) {
        await api(`/campaigns/${editingId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(form),
        });
        setMsg(t('panel.crud.updated'));
      } else {
        await api('/campaigns', { method: 'POST', token, body: JSON.stringify(form) });
        setMsg(t('panel.crud.created'));
      }
      cancelEdit();
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t('panel.crud.failed'));
    }
  }

  async function publish(id: string) {
    if (!token || !canWrite) return;
    await api(`/campaigns/${id}/publish`, { method: 'POST', token });
    load();
  }

  async function remove(id: string) {
    if (!token || !canWrite || !confirm(t('panel.crud.confirmDelete'))) return;
    await api(`/campaigns/${id}`, { method: 'DELETE', token });
    setMsg(t('panel.crud.deleted'));
    load();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{t('panel.campaigns.title')}</h1>
        <p className="mt-1 text-[var(--stampperk-muted)]">{t('panel.campaigns.subtitle')}</p>
      </div>

      {data && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            [t('panel.campaigns.total'), data.stats.total],
            [t('panel.campaigns.active'), data.stats.active],
            [t('panel.campaigns.views'), data.stats.views],
            [t('panel.campaigns.clicks'), data.stats.clicks],
          ].map(([l, v]) => (
            <div key={String(l)} className="card p-4">
              <div className="text-sm text-[var(--stampperk-muted)]">{l}</div>
              <div className="text-2xl font-extrabold">{v}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        {canWrite && (
          <form onSubmit={save} className="card h-fit space-y-3 p-5 sm:p-6">
            <h2 className="text-lg font-bold">
              {editingId ? t('panel.crud.edit') : t('panel.campaigns.create')}
            </h2>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-[var(--stampperk-muted)]">Campaign type</span>
              <select
                className="w-full rounded-xl border border-[var(--stampperk-line)] px-3 py-2.5"
                value={form.campaignPreset}
                onChange={(e) => applyPreset(e.target.value)}
              >
                <option value="">Custom / blank</option>
                {REWARD_CAMPAIGN_TYPES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <input
              className="w-full rounded-xl border border-[var(--stampperk-line)] px-3 py-2.5"
              maxLength={40}
              placeholder={t('panel.campaigns.fieldTitle')}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <textarea
              className="w-full rounded-xl border border-[var(--stampperk-line)] px-3 py-2.5"
              maxLength={100}
              placeholder={t('panel.campaigns.fieldDesc')}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              rows={3}
            />
            <input
              className="w-full rounded-xl border border-[var(--stampperk-line)] px-3 py-2.5"
              maxLength={12}
              placeholder={t('panel.campaigns.badge')}
              value={form.badgeText}
              onChange={(e) => setForm({ ...form, badgeText: e.target.value })}
              required
            />
            <select
              className="w-full rounded-xl border border-[var(--stampperk-line)] px-3 py-2.5"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as 'ACTIVE' })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SCHEDULED">SCHEDULED</option>
            </select>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary">{editingId ? t('panel.crud.save') : t('panel.crud.create')}</button>
              {editingId && (
                <button type="button" className="btn-ghost" onClick={cancelEdit}>
                  {t('panel.crud.cancel')}
                </button>
              )}
            </div>
            {msg && <p className="text-sm font-semibold text-[var(--stampperk-coral)]">{msg}</p>}
          </form>
        )}

        <div className="space-y-3">
          {data?.campaigns.map((c) => (
            <article key={c.id} className="card p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold">{c.title}</h3>
                    <span className="rounded-full bg-[var(--stampperk-pink)] px-2 py-0.5 text-xs font-bold text-[var(--stampperk-coral)]">
                      {c.badgeText}
                    </span>
                    <span className="rounded-full bg-[var(--stampperk-chip)] px-2 py-0.5 text-xs font-bold uppercase text-[var(--stampperk-muted)]">
                      {c.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--stampperk-muted)]">{c.description}</p>
                </div>
                {canWrite && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-[var(--stampperk-line)] px-3 py-1.5 text-sm font-semibold"
                      onClick={() => startEdit(c)}
                    >
                      {t('panel.crud.edit')}
                    </button>
                    {c.status !== 'ACTIVE' && (
                      <button
                        type="button"
                        className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700"
                        onClick={() => publish(c.id)}
                      >
                        {t('panel.campaigns.publish')}
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700"
                      onClick={() => remove(c.id)}
                    >
                      {t('panel.crud.delete')}
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
          {!data?.campaigns?.length && (
            <p className="rounded-2xl border border-dashed border-[var(--stampperk-line)] p-8 text-center text-[var(--stampperk-muted)]">
              {t('panel.campaigns.empty')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
