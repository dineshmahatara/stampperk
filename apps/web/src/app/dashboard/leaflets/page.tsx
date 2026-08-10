'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MerchantPageHeader, MerchantSurface } from '@/components/MerchantPage';
import { LeafletPreview } from '@/components/LeafletPreview';
import { PromoPhotoPicker } from '@/components/PromoPhotoPicker';
import { LogoPicker } from '@/components/LogoPicker';

type Template = {
  id: string;
  name: string;
  description?: string | null;
  layoutId: string;
};

type Leaflet = {
  id: string;
  headline: string;
  offerText: string;
  promoImageUrl?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  accentColor?: string | null;
  published: boolean;
  publicToken: string;
  template: Template;
  updatedAt: string;
};

type MerchantMe = {
  businessName?: string;
  slug?: string;
  logoUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
};

export default function LeafletsPage() {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [leaflets, setLeaflets] = useState<Leaflet[]>([]);
  const [merchant, setMerchant] = useState<MerchantMe | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [headline, setHeadline] = useState('');
  const [offerText, setOfferText] = useState('');
  const [promoImageUrl, setPromoImageUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [accentColor, setAccentColor] = useState('#FF5A5F');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) || templates[0],
    [templates, templateId],
  );

  const qrTarget = merchant?.slug ? `${origin}/b/${merchant.slug}` : origin;

  function resetForm(m?: MerchantMe | null) {
    setEditingId(null);
    setHeadline('Special offer');
    setOfferText('Collect stamps and unlock a reward');
    setPromoImageUrl('');
    setLogoUrl(m?.logoUrl || '');
    setPhone(m?.phone || '');
    setAddress([m?.address, m?.city].filter(Boolean).join(', ') || '');
    setAccentColor('#FF5A5F');
  }

  function load() {
    if (!token) return;
    Promise.all([
      api<Template[]>('/leaflets/templates', { token }),
      api<Leaflet[]>('/leaflets', { token }),
      api<MerchantMe>('/merchants/me', { token }),
    ])
      .then(([tpls, list, me]) => {
        setTemplates(tpls);
        setLeaflets(list);
        setMerchant(me);
        if (!templateId && tpls[0]) setTemplateId(tpls[0].id);
        if (!editingId) {
          setLogoUrl((prev) => prev || me.logoUrl || '');
          setPhone((prev) => prev || me.phone || '');
          setAddress((prev) => prev || [me.address, me.city].filter(Boolean).join(', ') || '');
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }

  useEffect(load, [token]);

  function startEdit(l: Leaflet) {
    setEditingId(l.id);
    setTemplateId(l.template.id);
    setHeadline(l.headline);
    setOfferText(l.offerText);
    setPromoImageUrl(l.promoImageUrl || '');
    setLogoUrl(l.logoUrl || merchant?.logoUrl || '');
    setPhone(l.phone || '');
    setAddress(l.address || '');
    setAccentColor(l.accentColor || '#FF5A5F');
    setMsg('');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedTemplate) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const body = {
        templateId: selectedTemplate.id,
        headline,
        offerText,
        promoImageUrl: promoImageUrl || undefined,
        logoUrl: logoUrl || undefined,
        phone: phone || undefined,
        address: address || undefined,
        accentColor,
      };
      if (editingId) {
        await api(`/leaflets/${editingId}`, { method: 'PATCH', token, body });
        setMsg('Leaflet saved');
      } else {
        await api('/leaflets', { method: 'POST', token, body });
        setMsg('Leaflet created');
      }
      resetForm(merchant);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(l: Leaflet) {
    if (!token) return;
    try {
      if (l.published) {
        await api(`/leaflets/${l.id}/unpublish`, { method: 'POST', token });
      } else {
        await api(`/leaflets/${l.id}/publish`, { method: 'POST', token, body: { published: true } });
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    }
  }

  async function remove(l: Leaflet) {
    if (!token || !confirm('Delete this leaflet?')) return;
    try {
      await api(`/leaflets/${l.id}`, { method: 'DELETE', token });
      if (editingId === l.id) resetForm(merchant);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function copyLink(l: Leaflet) {
    const url = `${origin}/leaflet/${l.publicToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setMsg('Share link copied');
    } catch {
      setMsg(url);
    }
  }

  return (
    <div className="space-y-5">
      <MerchantPageHeader
        title="Leaflets"
        subtitle="Pick an admin template, fill your offer, then publish and share."
      />
      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm font-semibold text-emerald-600">{msg}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <MerchantSurface>
            <h2 className="mb-3 text-sm font-extrabold">
              {editingId ? 'Edit leaflet' : 'Create leaflet'}
            </h2>
            {!templates.length ? (
              <p className="text-sm text-[#8E8E93]">
                No active templates yet. Ask Super Admin to enable leaflet templates.
              </p>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                <div>
                  <div className="mb-2 text-xs font-bold uppercase text-[#8E8E93]">Template</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTemplateId(t.id)}
                        className={`rounded-xl border px-3 py-2 text-left text-sm ${
                          selectedTemplate?.id === t.id
                            ? 'border-[#FF5A5F] bg-[#FFF1F2] font-bold'
                            : 'border-black/8 bg-white'
                        }`}
                      >
                        <div className="font-bold">{t.name}</div>
                        <div className="text-[11px] text-[#8E8E93]">{t.description || t.layoutId}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block text-xs font-bold uppercase text-[#8E8E93]">
                  Headline
                  <input
                    className="mt-1 w-full rounded-xl border border-black/8 bg-[#F8F8FA] px-3 py-2.5 text-sm font-semibold"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    required
                  />
                </label>
                <label className="block text-xs font-bold uppercase text-[#8E8E93]">
                  Offer text
                  <input
                    className="mt-1 w-full rounded-xl border border-black/8 bg-[#F8F8FA] px-3 py-2.5 text-sm font-semibold"
                    value={offerText}
                    onChange={(e) => setOfferText(e.target.value)}
                    required
                  />
                </label>

                <div>
                  <div className="mb-2 text-xs font-bold uppercase text-[#8E8E93]">Logo</div>
                  <LogoPicker token={token} value={logoUrl} onChange={setLogoUrl} />
                </div>
                <div>
                  <div className="mb-2 text-xs font-bold uppercase text-[#8E8E93]">Promo photo</div>
                  <PromoPhotoPicker token={token} value={promoImageUrl} onChange={setPromoImageUrl} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-bold uppercase text-[#8E8E93]">
                    Phone
                    <input
                      className="mt-1 w-full rounded-xl border border-black/8 bg-[#F8F8FA] px-3 py-2 text-sm"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-bold uppercase text-[#8E8E93]">
                    Accent color
                    <input
                      type="color"
                      className="mt-1 h-10 w-full rounded-xl border border-black/8 bg-[#F8F8FA] px-1"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                    />
                  </label>
                </div>
                <label className="block text-xs font-bold uppercase text-[#8E8E93]">
                  Address
                  <input
                    className="mt-1 w-full rounded-xl border border-black/8 bg-[#F8F8FA] px-3 py-2 text-sm"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-full bg-[#FF5A5F] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create leaflet'}
                  </button>
                  {editingId ? (
                    <button
                      type="button"
                      onClick={() => resetForm(merchant)}
                      className="rounded-full border border-black/10 px-4 py-2.5 text-sm font-bold"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            )}
          </MerchantSurface>

          <MerchantSurface>
            <h2 className="mb-3 text-sm font-extrabold">Your leaflets</h2>
            {!leaflets.length ? (
              <p className="text-sm text-[#8E8E93]">No leaflets yet.</p>
            ) : (
              <ul className="space-y-2">
                {leaflets.map((l) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/8 bg-white px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="font-bold">{l.headline}</div>
                      <div className="text-xs text-[#8E8E93]">
                        {l.template.name} · {l.published ? 'Published' : 'Draft'}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        className="rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-bold"
                        onClick={() => startEdit(l)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-bold"
                        onClick={() => void togglePublish(l)}
                      >
                        {l.published ? 'Unpublish' : 'Publish'}
                      </button>
                      {l.published ? (
                        <>
                          <button
                            type="button"
                            className="rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-bold"
                            onClick={() => void copyLink(l)}
                          >
                            Copy link
                          </button>
                          <a
                            href={`/leaflet/${l.publicToken}?print=1`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-bold"
                          >
                            Print
                          </a>
                        </>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-full px-2.5 py-1 text-[11px] font-bold text-red-600"
                        onClick={() => void remove(l)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </MerchantSurface>
        </div>

        <MerchantSurface>
          <h2 className="mb-3 text-sm font-extrabold">Live preview</h2>
          {selectedTemplate ? (
            <LeafletPreview
              layoutId={selectedTemplate.layoutId}
              businessName={merchant?.businessName || 'Your Business'}
              headline={headline || 'Headline'}
              offerText={offerText || 'Offer'}
              logoUrl={logoUrl || merchant?.logoUrl}
              promoImageUrl={promoImageUrl || undefined}
              phone={phone}
              address={address}
              accentColor={accentColor}
              qrTarget={qrTarget}
            />
          ) : (
            <p className="text-sm text-[#8E8E93]">Select a template to preview.</p>
          )}
        </MerchantSurface>
      </div>
    </div>
  );
}
