'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EntityAvatar } from '@/components/EntityAvatar';

type StaffRow = {
  id: string;
  active: boolean;
  permissions: string | string[];
  user: { id: string; name: string; email: string; photoUrl?: string | null };
  branch?: { name?: string } | null;
};

type MerchantMine = { staff: StaffRow[] };

function parsePerms(raw: string | string[]): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export default function StaffPage() {
  const { t } = useTranslation('common');
  const { token } = useAuth();
  const [form, setForm] = useState({ email: '', name: '', permissions: ['SCAN', 'REDEEM'] });
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  function load() {
    if (!token) return;
    api<MerchantMine>('/merchants/me', { token })
      .then((m) => setStaff(m.staff || []))
      .catch((e) => setError(e.message));
  }

  useEffect(load, [token]);

  async function invite(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setMsg('');
    try {
      await api('/merchants/me/staff', { method: 'POST', token, body: JSON.stringify(form) });
      setMsg(t('panel.staff.invited'));
      setForm({ email: '', name: '', permissions: ['SCAN', 'REDEEM'] });
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t('panel.crud.failed'));
    }
  }

  function togglePerm(perm: string) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }));
  }

  async function setActive(id: string, active: boolean) {
    if (!token) return;
    await api(`/merchants/me/staff/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ active }),
    });
    load();
  }

  async function updatePerms(id: string, permissions: string[]) {
    if (!token) return;
    await api(`/merchants/me/staff/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ permissions }),
    });
    load();
  }

  async function remove(id: string) {
    if (!token || !confirm(t('panel.crud.confirmDelete'))) return;
    await api(`/merchants/me/staff/${id}`, { method: 'DELETE', token });
    setMsg(t('panel.crud.deleted'));
    load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{t('panel.staff.title')}</h1>
        <p className="mt-1 text-[var(--stampperk-muted)]">{t('panel.staff.subtitle')}</p>
      </div>
      {error && <p className="mb-4 text-red-600">{error}</p>}

      <div className="mb-8 space-y-3">
        <h2 className="text-lg font-bold">{t('panel.staff.current')}</h2>
        {staff.map((s) => {
          const perms = parsePerms(s.permissions);
          return (
            <div key={s.id} className="card space-y-3 p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <EntityAvatar
                    src={s.user.photoUrl}
                    name={s.user.name}
                    size="md"
                    rounded="full"
                  />
                  <div>
                    <div className="font-bold">{s.user.name}</div>
                    <div className="text-sm text-[var(--stampperk-muted)]">{s.user.email}</div>
                  </div>
                </div>
                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${
                    s.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {s.active ? t('panel.crud.active') : t('panel.crud.inactive')}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['SCAN', 'REDEEM', 'MANAGE'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      updatePerms(
                        s.id,
                        perms.includes(p) ? perms.filter((x) => x !== p) : [...perms, p],
                      )
                    }
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      perms.includes(p)
                        ? 'bg-[var(--stampperk-coral)] text-white'
                        : 'bg-[var(--stampperk-chip)] text-[var(--stampperk-muted)]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {s.active ? (
                  <button
                    type="button"
                    className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800"
                    onClick={() => setActive(s.id, false)}
                  >
                    {t('panel.staff.deactivate')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700"
                    onClick={() => setActive(s.id, true)}
                  >
                    {t('panel.crud.reactivate')}
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700"
                  onClick={() => remove(s.id)}
                >
                  {t('panel.crud.delete')}
                </button>
              </div>
            </div>
          );
        })}
        {!staff.length && <p className="text-sm text-[var(--stampperk-muted)]">{t('panel.staff.empty')}</p>}
      </div>

      <form onSubmit={invite} className="card space-y-3 p-5 sm:p-6">
        <h2 className="font-bold">{t('panel.staff.invite')}</h2>
        <input
          className="w-full rounded-xl border border-[var(--stampperk-line)] px-3 py-2.5"
          placeholder={t('panel.staff.name')}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="w-full rounded-xl border border-[var(--stampperk-line)] px-3 py-2.5"
          type="email"
          placeholder={t('panel.staff.email')}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <div className="flex flex-wrap gap-2">
          {(['SCAN', 'REDEEM', 'MANAGE'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePerm(p)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                form.permissions.includes(p)
                  ? 'bg-[var(--stampperk-coral)] text-white'
                  : 'bg-[var(--stampperk-chip)] text-[var(--stampperk-muted)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <button className="btn-primary w-full sm:w-auto">{t('panel.staff.inviteBtn')}</button>
        {msg && <p className="text-sm font-semibold text-[var(--stampperk-coral)]">{msg}</p>}
      </form>
    </div>
  );
}
