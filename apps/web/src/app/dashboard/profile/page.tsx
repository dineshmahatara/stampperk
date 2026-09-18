'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BUSINESS_INDUSTRIES,
  BUSINESS_TYPES,
  PLAN_LIMITS,
  normalizeCountryCode,
  contactFormatError,
  type AddressFormValue,
} from '@stampperk/shared';
import { api, getActiveMerchantId, setActiveMerchantId } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MerchantPageHeader, MerchantSurface } from '@/components/MerchantPage';
import { LogoPicker } from '@/components/LogoPicker';
import { MapLocationPicker } from '@/components/MapLocationPickerDynamic';
import { googleMapsLink } from '@/lib/geo';
import { AddressPicker } from '@/components/AddressPicker';

type MerchantProfile = Record<string, unknown> & {
  id?: string;
  slug?: string;
  subscription?: { plan?: string } | null;
  publicLinks?: { id: string; label: string; url: string }[];
  menuItems?: { id: string; name: string; price?: number | null }[];
};

const inputClass =
  'w-full rounded-xl border border-black/8 bg-[#F4F5F7] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FF5A5F]/25';
const labelClass = 'mb-1 block text-xs font-bold uppercase tracking-wide text-[#8E8E93]';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <MerchantSurface>
      <h2 className="mb-4 text-base font-extrabold">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </MerchantSurface>
  );
}

function str(v: unknown) {
  return v == null ? '' : String(v);
}

export default function ProfilePage() {
  const { token } = useAuth();
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [businesses, setBusinesses] = useState<{ id: string; businessName: string; subscription?: { plan?: string } }[]>([]);
  const [link, setLink] = useState({ label: '', url: '' });
  const [menu, setMenu] = useState({ name: '', price: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newBiz, setNewBiz] = useState({ businessName: '', category: 'Cafe & Coffee', city: 'Kathmandu', phone: '' });
  const [adding, setAdding] = useState(false);

  function load() {
    if (!token) return;
    api<MerchantProfile>('/merchants/me', { token })
      .then(setMerchant)
      .catch((e) => setError(e.message));
    api<{ id: string; businessName: string; subscription?: { plan?: string } }[]>('/merchants/mine', {
      token,
      merchantId: null,
    })
      .then(setBusinesses)
      .catch(() => undefined);
  }

  useEffect(load, [token]);

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('add') === '1') {
      setShowAdd(true);
    }
  }, []);

  const plan = merchant?.subscription?.plan || businesses[0]?.subscription?.plan || 'FREE';
  const bizLimit = PLAN_LIMITS[(plan as keyof typeof PLAN_LIMITS) || 'FREE']?.businesses ?? 1;
  const canAdd = businesses.length < bizLimit;

  function setField(key: string, value: unknown) {
    setMerchant((m) => (m ? { ...m, [key]: value } : m));
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!token || !merchant) return;
    const contactErr = contactFormatError({
      email: str(merchant.email),
      phone: str(merchant.phone),
      mobile: str(merchant.mobile),
      whatsapp: str(merchant.whatsapp),
      supportPhone: str(merchant.supportPhone),
      countryCode: str(merchant.country) || 'NP',
    });
    if (contactErr) {
      setError(contactErr);
      setMsg('');
      return;
    }
    setSaving(true);
    setMsg('');
    setError('');
    try {
      const yearRaw = str(merchant.yearEstablished).trim();
      const lat =
        typeof merchant.latitude === 'number'
          ? merchant.latitude
          : str(merchant.latitude).trim()
            ? Number(str(merchant.latitude))
            : null;
      const lng =
        typeof merchant.longitude === 'number'
          ? merchant.longitude
          : str(merchant.longitude).trim()
            ? Number(str(merchant.longitude))
            : null;
      const latOk = lat != null && !Number.isNaN(lat);
      const lngOk = lng != null && !Number.isNaN(lng);
      await api('/merchants/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          businessName: merchant.businessName,
          logoUrl: merchant.logoUrl || '',
          registrationNumber: merchant.registrationNumber || '',
          panVatNumber: merchant.panVatNumber || '',
          businessType: merchant.businessType || '',
          category: merchant.category,
          yearEstablished: yearRaw ? Number(yearRaw) : null,
          description: merchant.description || '',
          tagline: merchant.tagline || '',
          contactPerson: merchant.contactPerson || '',
          designation: merchant.designation || '',
          email: merchant.email || '',
          phone: merchant.phone || '',
          mobile: merchant.mobile || '',
          website: merchant.website || '',
          supportPhone: merchant.supportPhone || '',
          whatsapp: merchant.whatsapp || '',
          country: merchant.country || 'NP',
          province: merchant.province || '',
          district: merchant.district || '',
          city: merchant.city || '',
          municipality: merchant.municipality || '',
          ward: merchant.ward || '',
          address: merchant.address || '',
          postalCode: merchant.postalCode || '',
          latitude: latOk ? lat : null,
          longitude: lngOk ? lng : null,
          googleMapsUrl:
            str(merchant.googleMapsUrl) ||
            (latOk && lngOk ? googleMapsLink(lat!, lng!) : ''),
          facebook: merchant.facebook || '',
          instagram: merchant.instagram || '',
          linkedin: merchant.linkedin || '',
          tiktok: merchant.tiktok || '',
          youtube: merchant.youtube || '',
          twitter: merchant.twitter || '',
          pinterest: merchant.pinterest || '',
          threads: merchant.threads || '',
          deliveryEnabled: Boolean(merchant.deliveryEnabled),
          deliveryNote: merchant.deliveryNote || '',
          supportNote: merchant.supportNote || '',
        }),
      });
      setMsg('Business profile saved. Stamp cards use these social, email, website & location details on the back.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function addBusiness(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (newBiz.phone.trim()) {
      const phoneErr = contactFormatError({
        phone: newBiz.phone,
        countryCode: 'NP',
        requirePhone: true,
      });
      if (phoneErr) {
        setError(phoneErr);
        return;
      }
    }
    setAdding(true);
    setError('');
    setMsg('');
    try {
      const created = await api<{ id: string }>('/merchants', {
        method: 'POST',
        token,
        merchantId: null,
        body: JSON.stringify({
          businessName: newBiz.businessName,
          category: newBiz.category,
          city: newBiz.city,
          phone: newBiz.phone || undefined,
          country: 'NP',
        }),
      });
      setActiveMerchantId(created.id);
      setShowAdd(false);
      setNewBiz({ businessName: '', category: 'Cafe & Coffee', city: 'Kathmandu', phone: '' });
      setMsg('New business profile created. Switch to it from the sidebar.');
      window.location.href = '/dashboard/profile';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create business');
    } finally {
      setAdding(false);
    }
  }

  function switchTo(id: string) {
    setActiveMerchantId(id);
    window.location.href = '/dashboard/profile';
  }

  if (!merchant) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <MerchantPageHeader title="Business Profile" subtitle="Loading…" />
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <MerchantPageHeader
        title="Business Profile"
        subtitle="Social, email, website & location here appear on every stamp card back. Multiple profiles depend on your plan."
        action={
          <div className="flex flex-wrap gap-2">
            {canAdd && (
              <button
                type="button"
                onClick={() => setShowAdd((v) => !v)}
                className="rounded-full bg-[#FF5A5F] px-4 py-2 text-sm font-bold text-white"
              >
                {showAdd ? 'Cancel' : '+ Add business'}
              </button>
            )}
            {merchant.slug ? (
              <Link
                href={`/b/${merchant.slug}`}
                className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-bold hover:bg-[#F4F5F7]"
              >
                View public page ↗
              </Link>
            ) : null}
          </div>
        }
      />
      {msg && <p className="mb-4 text-sm font-semibold text-emerald-700">{msg}</p>}
      {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}

      {businesses.length > 0 && (
        <MerchantSurface>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold">Your businesses</h2>
            <span className="text-xs font-semibold text-[#8E8E93]">
              {businesses.length} / {bizLimit} on {plan} plan
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {businesses.map((b) => {
              const active = b.id === (merchant.id || getActiveMerchantId());
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => !active && switchTo(b.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                    active ? 'bg-[#1C1C1E] text-white' : 'bg-[#F4F5F7] text-[#1C1C1E] hover:bg-[#FFE8EA]'
                  }`}
                >
                  {b.businessName}
                </button>
              );
            })}
          </div>
          {!canAdd && (
            <p className="mt-3 text-xs text-[#8E8E93]">
              Upgrade your plan to add more business profiles (FREE: 1, MONTHLY: 5, YEARLY: 10).
            </p>
          )}
        </MerchantSurface>
      )}

      {showAdd && canAdd && (
        <MerchantSurface>
          <h2 className="mb-3 text-base font-extrabold">Create another business profile</h2>
          <form onSubmit={addBusiness} className="grid gap-3 sm:grid-cols-2">
            <Field label="Business Name">
              <input
                className={inputClass}
                required
                value={newBiz.businessName}
                onChange={(e) => setNewBiz((n) => ({ ...n, businessName: e.target.value }))}
              />
            </Field>
            <Field label="Category">
              <select
                className={inputClass}
                value={newBiz.category}
                onChange={(e) => setNewBiz((n) => ({ ...n, category: e.target.value }))}
              >
                {BUSINESS_INDUSTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="City">
              <input
                className={inputClass}
                value={newBiz.city}
                onChange={(e) => setNewBiz((n) => ({ ...n, city: e.target.value }))}
              />
            </Field>
            <Field label="Phone">
              <input
                className={inputClass}
                value={newBiz.phone}
                onChange={(e) => setNewBiz((n) => ({ ...n, phone: e.target.value }))}
              />
            </Field>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={adding}
                className="rounded-full bg-[#FF5A5F] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {adding ? 'Creating…' : 'Create business profile'}
              </button>
            </div>
          </form>
        </MerchantSurface>
      )}

      <form onSubmit={saveProfile} className="space-y-4">
        <div className="rounded-2xl border border-[#C4A35A]/40 bg-[#FFFBF0] px-4 py-3 text-sm text-[#3D2914]">
          Stamp card back footer pulls <strong>social, email, website, phone & location</strong> from this profile — no need to re-enter them when creating a card.
        </div>
        <Section title="Basic Information">
          <Field label="Business Name">
            <input
              className={inputClass}
              required
              value={str(merchant.businessName)}
              onChange={(e) => setField('businessName', e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <span className={labelClass}>Business Logo</span>
            <LogoPicker
              token={token}
              value={str(merchant.logoUrl)}
              onChange={(url) => setField('logoUrl', url)}
            />
          </div>
          <Field label="Business Registration Number">
            <input
              className={inputClass}
              value={str(merchant.registrationNumber)}
              onChange={(e) => setField('registrationNumber', e.target.value)}
            />
          </Field>
          <Field label="PAN / VAT Number">
            <input
              className={inputClass}
              value={str(merchant.panVatNumber)}
              onChange={(e) => setField('panVatNumber', e.target.value)}
            />
          </Field>
          <Field label="Business Type">
            <select
              className={inputClass}
              value={str(merchant.businessType)}
              onChange={(e) => setField('businessType', e.target.value)}
            >
              <option value="">Select type</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Industry">
            <select
              className={inputClass}
              required
              value={str(merchant.category)}
              onChange={(e) => setField('category', e.target.value)}
            >
              <option value="">Select industry</option>
              {BUSINESS_INDUSTRIES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              {merchant.category &&
                !(BUSINESS_INDUSTRIES as readonly string[]).includes(String(merchant.category)) && (
                  <option value={String(merchant.category)}>{String(merchant.category)}</option>
                )}
            </select>
          </Field>
          <Field label="Year Established">
            <input
              className={inputClass}
              type="number"
              min={1800}
              max={2100}
              placeholder="e.g. 2019"
              value={str(merchant.yearEstablished)}
              onChange={(e) => setField('yearEstablished', e.target.value)}
            />
          </Field>
          <Field label="Company Tagline">
            <input
              className={inputClass}
              maxLength={120}
              placeholder="Short slogan"
              value={str(merchant.tagline)}
              onChange={(e) => setField('tagline', e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Business Description">
              <textarea
                className={`${inputClass} min-h-[100px]`}
                placeholder="Tell customers about your business"
                value={str(merchant.description)}
                onChange={(e) => setField('description', e.target.value)}
              />
            </Field>
          </div>
        </Section>

        <Section title="Contact Information">
          <Field label="Contact Person">
            <input
              className={inputClass}
              value={str(merchant.contactPerson)}
              onChange={(e) => setField('contactPerson', e.target.value)}
            />
          </Field>
          <Field label="Designation">
            <input
              className={inputClass}
              placeholder="Owner, Manager…"
              value={str(merchant.designation)}
              onChange={(e) => setField('designation', e.target.value)}
            />
          </Field>
          <Field label="Email Address">
            <input
              className={inputClass}
              type="email"
              value={str(merchant.email)}
              onChange={(e) => setField('email', e.target.value)}
            />
          </Field>
          <Field label="Phone Number">
            <input
              className={inputClass}
              value={str(merchant.phone)}
              onChange={(e) => setField('phone', e.target.value)}
            />
          </Field>
          <Field label="Mobile Number">
            <input
              className={inputClass}
              value={str(merchant.mobile)}
              onChange={(e) => setField('mobile', e.target.value)}
            />
          </Field>
          <Field label="Customer Support Number">
            <input
              className={inputClass}
              value={str(merchant.supportPhone)}
              onChange={(e) => setField('supportPhone', e.target.value)}
            />
          </Field>
          <Field label="Website">
            <input
              className={inputClass}
              placeholder="https://…"
              value={str(merchant.website)}
              onChange={(e) => setField('website', e.target.value)}
            />
          </Field>
          <Field label="WhatsApp">
            <input
              className={inputClass}
              value={str(merchant.whatsapp)}
              onChange={(e) => setField('whatsapp', e.target.value)}
            />
          </Field>
        </Section>

        <Section title="Address">
          <div className="sm:col-span-2">
            <AddressPicker
              streetKeyLabel="Street address"
              value={{
                country: normalizeCountryCode(str(merchant.country)) || 'NP',
                province: str(merchant.province),
                district: str(merchant.district),
                city: str(merchant.city),
                municipality: str(merchant.municipality),
                ward: str(merchant.ward),
                street: str(merchant.address),
                postalCode: str(merchant.postalCode),
              }}
              onChange={(next: AddressFormValue) => {
                setMerchant((m) =>
                  m
                    ? {
                        ...m,
                        country: next.country,
                        province: next.province,
                        district: next.district,
                        city: next.city,
                        municipality: next.municipality,
                        ward: next.ward,
                        address: next.street,
                        postalCode: next.postalCode,
                      }
                    : m,
                );
              }}
              onCoords={({ latitude, longitude }) => {
                setMerchant((m) =>
                  m
                    ? {
                        ...m,
                        latitude,
                        longitude,
                        googleMapsUrl: googleMapsLink(latitude, longitude) || str(m.googleMapsUrl),
                      }
                    : m,
                );
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <div className={labelClass}>Exact location (map)</div>
            <MapLocationPicker
              latitude={
                typeof merchant.latitude === 'number'
                  ? merchant.latitude
                  : str(merchant.latitude).trim()
                    ? Number(str(merchant.latitude))
                    : null
              }
              longitude={
                typeof merchant.longitude === 'number'
                  ? merchant.longitude
                  : str(merchant.longitude).trim()
                    ? Number(str(merchant.longitude))
                    : null
              }
              fillAddress={!str(merchant.address).trim()}
              onChange={(v) => {
                setMerchant((m) =>
                  m
                    ? {
                        ...m,
                        latitude: v.latitude,
                        longitude: v.longitude,
                        googleMapsUrl: v.googleMapsUrl || m.googleMapsUrl || '',
                        ...(v.address && !str(m.address).trim() ? { address: v.address } : {}),
                      }
                    : m,
                );
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <Field label="Google Maps URL">
              <input
                className={inputClass}
                placeholder="Auto-filled from map pin — or paste a custom link"
                value={str(merchant.googleMapsUrl)}
                onChange={(e) => setField('googleMapsUrl', e.target.value)}
              />
            </Field>
          </div>
        </Section>

        <Section title="Social Media">
          {(
            [
              ['facebook', 'Facebook'],
              ['instagram', 'Instagram'],
              ['linkedin', 'LinkedIn'],
              ['tiktok', 'TikTok'],
              ['youtube', 'YouTube'],
              ['twitter', 'X (Twitter)'],
              ['pinterest', 'Pinterest'],
              ['threads', 'Threads'],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                className={inputClass}
                placeholder="Profile URL or handle"
                value={str(merchant[key])}
                onChange={(e) => setField(key, e.target.value)}
              />
            </Field>
          ))}
        </Section>

        <MerchantSurface>
          <h2 className="mb-4 text-base font-extrabold">Service Options</h2>
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={Boolean(merchant.deliveryEnabled)}
              onChange={(e) => setField('deliveryEnabled', e.target.checked)}
            />
            Delivery & takeaway enabled
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Delivery note">
              <input
                className={inputClass}
                value={str(merchant.deliveryNote)}
                onChange={(e) => setField('deliveryNote', e.target.value)}
              />
            </Field>
            <Field label="Support note">
              <input
                className={inputClass}
                value={str(merchant.supportNote)}
                onChange={(e) => setField('supportNote', e.target.value)}
              />
            </Field>
          </div>
        </MerchantSurface>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#FF5A5F] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save business profile'}
          </button>
        </div>
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <MerchantSurface>
          <h2 className="mb-3 font-extrabold">Public profile links</h2>
          <form
            className="mb-3 grid gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!token) return;
              await api('/merchants/me/links', { method: 'POST', token, body: JSON.stringify(link) });
              setLink({ label: '', url: '' });
              load();
            }}
          >
            <input
              className={inputClass}
              placeholder="Label"
              value={link.label}
              onChange={(e) => setLink({ ...link, label: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="https://"
              value={link.url}
              onChange={(e) => setLink({ ...link, url: e.target.value })}
            />
            <button type="submit" className="rounded-full bg-[#1C1C1E] px-4 py-2 text-sm font-bold text-white">
              Add link
            </button>
          </form>
          <ul className="space-y-1 text-sm text-[#8E8E93]">
            {(merchant.publicLinks || []).map((l) => (
              <li key={l.id}>
                {l.label}: {l.url}
              </li>
            ))}
          </ul>
        </MerchantSurface>

        <MerchantSurface>
          <h2 className="mb-3 font-extrabold">Product menu</h2>
          <form
            className="mb-3 grid gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!token) return;
              await api('/merchants/me/menu', {
                method: 'POST',
                token,
                body: JSON.stringify({ name: menu.name, price: menu.price ? Number(menu.price) : undefined }),
              });
              setMenu({ name: '', price: '' });
              load();
            }}
          >
            <input
              className={inputClass}
              placeholder="Product name"
              value={menu.name}
              onChange={(e) => setMenu({ ...menu, name: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Price"
              value={menu.price}
              onChange={(e) => setMenu({ ...menu, price: e.target.value })}
            />
            <button type="submit" className="rounded-full bg-[#1C1C1E] px-4 py-2 text-sm font-bold text-white">
              Add product
            </button>
          </form>
          <ul className="space-y-1 text-sm text-[#8E8E93]">
            {(merchant.menuItems || []).map((m) => (
              <li key={m.id}>
                {m.name}
                {m.price != null ? ` · ${m.price}` : ''}
              </li>
            ))}
          </ul>
        </MerchantSurface>
      </div>
    </div>
  );
}
