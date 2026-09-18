'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, uploadMedia } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  AdminError,
  AdminPageHeader,
  AdminSurface,
} from '@/components/AdminPage';
import {
  AdminStatCard,
  AdminSplit,
  AdminDonutCard,
  AdminInsightCard,
  AdminSuccess,
  num,
  ICONS,
} from '@/components/AdminInteractive';
import { LogoPicker } from '@/components/LogoPicker';
import type { PlatformBranding } from '@/lib/branding';
import { brandingTitle, defaultBranding } from '@/lib/branding';

type Settings = {
  systemHealth: string;
  environment: string;
  database: string;
  counts: { users: number; merchants: number; stamps: number; openTickets: number };
  features: Record<string, boolean>;
  branding?: PlatformBranding;
};

const HEALTH_COLORS: Record<string, string> = {
  healthy: '#10B981',
  ok: '#10B981',
  degraded: '#F59E0B',
  down: '#EF4444',
};

const emptyForm = (): PlatformBranding => defaultBranding();

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[#8E8E93]">{hint}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-black/10 bg-[#F7F7F8] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FF5A5F]/25';

export default function AdminSettingsPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<Settings | null>(null);
  const [form, setForm] = useState<PlatformBranding>(emptyForm());
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'branding' | 'system'>('branding');

  function load() {
    if (!token) return;
    setLoading(true);
    api<Settings>('/admin/settings', { token })
      .then((res) => {
        setData(res);
        setForm({ ...defaultBranding(), ...(res.branding || {}) });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load settings'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  async function saveBranding(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    setMsg('');
    try {
      const updated = await api<PlatformBranding>('/admin/settings/branding', {
        method: 'PATCH',
        token,
        body: JSON.stringify(form),
      });
      setForm({ ...defaultBranding(), ...updated });
      setData((d) => (d ? { ...d, branding: updated } : d));
      setMsg('Branding & SEO saved. Public site updates within about a minute.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function uploadAsset(
    file: File | undefined,
    key: keyof PlatformBranding,
  ) {
    if (!file || !token) return;
    try {
      const up = await uploadMedia(file, { token, merchantId: null, scope: 'platform' });
      setForm((f) => ({ ...f, [key]: up.url }));
      setMsg(`${String(key)} uploaded — click Save to apply`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  const featureFlags = useMemo(
    () => (data ? Object.entries(data.features) : []),
    [data],
  );

  const featureDonut = useMemo(() => {
    const on = featureFlags.filter(([, v]) => v).length;
    const off = featureFlags.length - on;
    return [
      { name: 'Enabled', value: on, color: '#10B981' },
      { name: 'Disabled', value: off, color: '#94A3B8' },
    ].filter((d) => d.value > 0);
  }, [featureFlags]);

  const healthColor = useMemo(() => {
    const key = (data?.systemHealth || '').toLowerCase();
    return HEALTH_COLORS[key] || '#FF5A5F';
  }, [data]);

  const insight = useMemo(() => {
    if (!data) return 'Loading system configuration…';
    const enabled = featureFlags.filter(([, v]) => v).length;
    return `System is ${data.systemHealth.toLowerCase()}. ${enabled} of ${featureFlags.length} feature flags enabled. ${num(data.counts.openTickets)} open support tickets.`;
  }, [data, featureFlags]);

  const previewTitle = brandingTitle(form);
  const c = data?.counts;

  return (
    <div className="mx-auto max-w-[1500px]">
      <AdminPageHeader
        title="Settings"
        subtitle="Branding, SEO, icons, and platform health — editable by Super Admin."
      />

      <AdminError message={error} />
      <AdminSuccess message={msg} />

      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            { id: 'branding' as const, label: 'Branding & SEO' },
            { id: 'system' as const, label: 'System' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              tab === t.id
                ? 'bg-[#FF5A5F] text-white'
                : 'border border-black/8 bg-white text-[#1C1C1E]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'branding' && (
        <form onSubmit={saveBranding} className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-4">
            <AdminSurface>
              <h2 className="font-extrabold">Company identity</h2>
              <p className="mt-1 text-sm text-[#8E8E93]">
                Name and tagline appear in nav, browser title, and marketing.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Company name *">
                  <input
                    className={inputClass}
                    required
                    value={form.companyName || ''}
                    onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  />
                </Field>
                <Field label="Tagline">
                  <input
                    className={inputClass}
                    value={form.tagline || ''}
                    onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                  />
                </Field>
                <Field label="Contact email">
                  <input
                    className={inputClass}
                    type="email"
                    value={form.contactEmail || ''}
                    onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  />
                </Field>
                <Field label="Support email">
                  <input
                    className={inputClass}
                    type="email"
                    value={form.supportEmail || ''}
                    onChange={(e) => setForm((f) => ({ ...f, supportEmail: e.target.value }))}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Website">
                    <input
                      className={inputClass}
                      value={form.website || ''}
                      onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                      placeholder="https://"
                    />
                  </Field>
                </div>
              </div>
            </AdminSurface>

            <AdminSurface>
              <h2 className="font-extrabold">SEO</h2>
              <div className="mt-4 space-y-3">
                <Field
                  label="SEO title template"
                  hint="Use {companyName} and {tagline}. Preview below."
                >
                  <input
                    className={inputClass}
                    value={form.seoTitleTemplate || ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, seoTitleTemplate: e.target.value }))
                    }
                    placeholder="{companyName} | {tagline}"
                  />
                </Field>
                <div className="rounded-xl bg-[#FFF0F1] px-3 py-2 text-sm font-semibold text-[#FF5A5F]">
                  Preview title: {previewTitle}
                </div>
                <Field label="Meta description">
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={form.metaDescription || ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, metaDescription: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Meta keywords" hint="Comma-separated">
                  <input
                    className={inputClass}
                    value={form.metaKeywords || ''}
                    onChange={(e) => setForm((f) => ({ ...f, metaKeywords: e.target.value }))}
                  />
                </Field>
              </div>
            </AdminSurface>

            <AdminSurface>
              <h2 className="font-extrabold">Logo & icons</h2>
              <p className="mt-1 text-sm text-[#8E8E93]">
                Upload PNG/JPG/WebP (max 2MB). Favicon & mobile icons should be square.
              </p>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-bold uppercase text-[#8E8E93]">Logo</div>
                  <LogoPicker
                    token={token}
                    value={form.logoUrl || undefined}
                    uploadScope="platform"
                    label="Logo"
                    buttonLabel="Upload logo"
                    onChange={(url) => setForm((f) => ({ ...f, logoUrl: url }))}
                  />
                </div>
                <div>
                  <div className="mb-2 text-xs font-bold uppercase text-[#8E8E93]">Favicon</div>
                  <LogoPicker
                    token={token}
                    value={form.faviconUrl || undefined}
                    uploadScope="platform"
                    label="Icon"
                    buttonLabel="Upload favicon"
                    onChange={(url) => setForm((f) => ({ ...f, faviconUrl: url }))}
                  />
                </div>
                <div>
                  <div className="mb-2 text-xs font-bold uppercase text-[#8E8E93]">
                    Apple touch / mobile icon
                  </div>
                  <LogoPicker
                    token={token}
                    value={form.appleTouchIconUrl || undefined}
                    uploadScope="platform"
                    label="180²"
                    buttonLabel="Upload apple icon"
                    onChange={(url) => setForm((f) => ({ ...f, appleTouchIconUrl: url }))}
                  />
                </div>
                <div>
                  <div className="mb-2 text-xs font-bold uppercase text-[#8E8E93]">OG image</div>
                  <LogoPicker
                    token={token}
                    value={form.ogImageUrl || undefined}
                    uploadScope="platform"
                    label="OG"
                    buttonLabel="Upload OG image"
                    onChange={(url) => setForm((f) => ({ ...f, ogImageUrl: url }))}
                  />
                </div>
                <div>
                  <div className="mb-2 text-xs font-bold uppercase text-[#8E8E93]">PWA 192×192</div>
                  <input
                    type="file"
                    accept="image/*"
                    className="text-sm"
                    onChange={(e) => uploadAsset(e.target.files?.[0], 'pwaIcon192Url')}
                  />
                  {form.pwaIcon192Url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.pwaIcon192Url} alt="" className="mt-2 h-12 w-12 rounded-lg object-cover" />
                  )}
                </div>
                <div>
                  <div className="mb-2 text-xs font-bold uppercase text-[#8E8E93]">PWA 512×512</div>
                  <input
                    type="file"
                    accept="image/*"
                    className="text-sm"
                    onChange={(e) => uploadAsset(e.target.files?.[0], 'pwaIcon512Url')}
                  />
                  {form.pwaIcon512Url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.pwaIcon512Url} alt="" className="mt-2 h-12 w-12 rounded-lg object-cover" />
                  )}
                </div>
              </div>
            </AdminSurface>

            <AdminSurface>
              <h2 className="font-extrabold">Social links</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['facebook', 'Facebook'],
                    ['instagram', 'Instagram'],
                    ['twitter', 'Twitter / X'],
                    ['linkedin', 'LinkedIn'],
                    ['youtube', 'YouTube'],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input
                      className={inputClass}
                      value={(form[key] as string) || ''}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder="https://"
                    />
                  </Field>
                ))}
              </div>
            </AdminSurface>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving || loading}
                className="rounded-xl bg-[#FF5A5F] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(255,90,95,0.28)] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save branding & SEO'}
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...defaultBranding(), ...(data?.branding || {}) })}
                className="rounded-xl border border-black/8 bg-white px-5 py-2.5 text-sm font-bold"
              >
                Reset form
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <AdminSurface className="bg-gradient-to-br from-[#FFF0F1] to-white">
              <div className="text-xs font-bold uppercase tracking-wide text-[#FF5A5F]">Live preview</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
                  {form.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg font-black text-[#FF5A5F]">
                      {(form.companyName || 'S').slice(0, 1)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-lg font-extrabold">{form.companyName || 'Stamp Perk'}</div>
                  <div className="text-xs text-[#8E8E93]">{form.tagline || '—'}</div>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-black/5 bg-white p-3 text-xs">
                <div className="font-bold text-[#8E8E93]">Browser tab</div>
                <div className="mt-1 truncate font-semibold">{previewTitle}</div>
              </div>
            </AdminSurface>
            <AdminInsightCard
              title="What you can change"
              message="Company name, SEO title/description, logo, favicon, Apple/mobile icons, PWA icons, Open Graph image, contact emails, and social links — all without redeploying (native store icons still need an app rebuild)."
            />
          </div>
        </form>
      )}

      {tab === 'system' && (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <AdminStatCard
              label="Health"
              value={loading && !data ? '…' : data?.systemHealth ?? '—'}
              iconBg="bg-emerald-50 text-emerald-600"
              icon={ICONS.check}
            />
            <AdminStatCard
              label="Users"
              value={num(c?.users ?? 0)}
              iconBg="bg-sky-50 text-sky-600"
              icon={ICONS.users}
            />
            <AdminStatCard
              label="Merchants"
              value={num(c?.merchants ?? 0)}
              iconBg="bg-violet-50 text-violet-600"
              icon={ICONS.store}
            />
            <AdminStatCard
              label="Stamps"
              value={num(c?.stamps ?? 0)}
              iconBg="bg-[#FFF0F1] text-[#FF5A5F]"
              icon={ICONS.stamp}
            />
            <AdminStatCard
              label="Open tickets"
              value={num(c?.openTickets ?? 0)}
              iconBg="bg-orange-50 text-orange-600"
              icon={ICONS.ticket}
            />
          </div>

          <AdminSplit
            main={
              <div className="space-y-4">
                <AdminSurface>
                  <h2 className="font-extrabold">Environment</h2>
                  <div className="mt-3 overflow-x-auto rounded-xl border border-black/5">
                    <table className="min-w-full text-left text-sm">
                      <tbody>
                        {[
                          { label: 'Signed in as', value: user?.email || '—' },
                          { label: 'Role', value: user?.role || '—' },
                          { label: 'NODE_ENV', value: data?.environment ?? '—' },
                          { label: 'Database', value: data?.database ?? '—' },
                          { label: 'System health', value: data?.systemHealth ?? '—' },
                        ].map((row) => (
                          <tr key={row.label} className="border-t border-black/5 first:border-0">
                            <td className="px-4 py-2.5 font-semibold text-[#8E8E93]">{row.label}</td>
                            <td className="px-4 py-2.5 text-right font-bold">{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AdminSurface>
                <AdminSurface>
                  <h2 className="font-extrabold">Feature flags</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {featureFlags.map(([k, v]) => (
                      <span
                        key={k}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${
                          v
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                            : 'bg-slate-50 text-slate-500 ring-slate-100'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${v ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        />
                        {k}
                      </span>
                    ))}
                  </div>
                </AdminSurface>
              </div>
            }
            side={
              <>
                <AdminDonutCard
                  title="Feature flags"
                  centerValue={featureFlags.filter(([, v]) => v).length}
                  centerLabel="Enabled"
                  data={featureDonut}
                />
                <AdminSurface>
                  <h3 className="font-extrabold">Health status</h3>
                  <div className="mt-4 flex flex-col items-center">
                    <div
                      className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-extrabold text-white shadow-lg"
                      style={{ background: healthColor }}
                    >
                      {data?.systemHealth?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="mt-3 text-lg font-extrabold">{data?.systemHealth ?? '—'}</div>
                  </div>
                </AdminSurface>
                <AdminInsightCard
                  title="Admin tips"
                  message={insight}
                  href="/admin/support"
                  hrefLabel="View support tickets"
                />
              </>
            }
          />
        </>
      )}
    </div>
  );
}
