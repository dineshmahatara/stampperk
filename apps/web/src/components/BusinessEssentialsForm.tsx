'use client';

import { useState } from 'react';
import { BUSINESS_INDUSTRIES, merchantEssentialsReady, contactFormatError, phoneNationalLength, sanitizeLocalPhoneInput } from '@stampz/shared';
import { LogoPicker } from '@/components/LogoPicker';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const inputClass =
  'w-full rounded-xl border border-black/8 bg-[#F4F5F7] px-3 py-2.5 text-sm font-medium outline-none focus:border-[#FF5A5F]/50 focus:ring-2 focus:ring-[#FF5A5F]/15';
const labelClass = 'mb-1 block text-xs font-bold uppercase tracking-wide text-[#8E8E93]';

export type EssentialsMerchant = {
  id?: string;
  businessName?: string;
  category?: string;
  logoUrl?: string | null;
  phone?: string | null;
  mobile?: string | null;
  city?: string | null;
  address?: string | null;
  tagline?: string | null;
  description?: string | null;
  country?: string | null;
};

export function BusinessEssentialsForm({
  initial,
  onSaved,
}: {
  initial?: EssentialsMerchant | null;
  onSaved: (merchant: EssentialsMerchant) => void;
}) {
  const { token } = useAuth();
  const [businessName, setBusinessName] = useState(initial?.businessName || '');
  const [category, setCategory] = useState(initial?.category || BUSINESS_INDUSTRIES[0]);
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl || '');
  const [phone, setPhone] = useState(initial?.phone || initial?.mobile || '');
  const [city, setCity] = useState(initial?.city || 'Kathmandu');
  const [address, setAddress] = useState(initial?.address || '');
  const [tagline, setTagline] = useState(initial?.tagline || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError('Not signed in');
      return;
    }
    const draft = { businessName, category, logoUrl, phone, city };
    if (!merchantEssentialsReady(draft)) {
      setError('Name, category, logo, phone, and city are required');
      return;
    }
    const contactErr = contactFormatError({
      phone,
      countryCode: initial?.country || 'NP',
      requirePhone: true,
    });
    if (contactErr) {
      setError(contactErr);
      return;
    }
    setBusy(true);
    setError('');
    try {
      let merchant: EssentialsMerchant;
      if (initial?.id) {
        merchant = await api<EssentialsMerchant>('/merchants/me', {
          method: 'PATCH',
          token,
          body: JSON.stringify({
            businessName: businessName.trim(),
            category,
            logoUrl,
            phone: phone.trim(),
            city: city.trim(),
            address: address.trim() || '',
            tagline: tagline.trim() || '',
            description: description.trim() || '',
            country: initial.country || 'NP',
          }),
        });
      } else {
        merchant = await api<EssentialsMerchant>('/merchants', {
          method: 'POST',
          token,
          body: JSON.stringify({
            businessName: businessName.trim(),
            category,
            logoUrl,
            phone: phone.trim(),
            city: city.trim(),
            address: address.trim() || undefined,
            description: description.trim() || undefined,
            country: 'NP',
          }),
        });
        if (tagline.trim() || address.trim() || description.trim()) {
          merchant = await api<EssentialsMerchant>('/merchants/me', {
            method: 'PATCH',
            token,
            body: JSON.stringify({
              tagline: tagline.trim() || '',
              address: address.trim() || '',
              description: description.trim() || '',
            }),
          });
        }
      }
      onSaved(merchant);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#FF5A5F]">Step 1 of 2</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#1C1C1E]">
          Complete your business profile
        </h1>
        <p className="mt-2 text-sm text-[#8E8E93]">
          Customers see this on Discover, your public page, and QR. Stamp card comes next.
        </p>
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <div>
        <span className={labelClass}>Business name *</span>
        <input
          className={inputClass}
          required
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Bean & Bloom Cafe"
        />
      </div>

      <div>
        <span className={labelClass}>Category *</span>
        <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
          {BUSINESS_INDUSTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          {category && !(BUSINESS_INDUSTRIES as readonly string[]).includes(category) && (
            <option value={category}>{category}</option>
          )}
        </select>
      </div>

      <div>
        <span className={labelClass}>Logo *</span>
        <LogoPicker token={token} value={logoUrl} onChange={setLogoUrl} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className={labelClass}>Phone *</span>
          <input
            className={inputClass}
            required
            value={phone}
            onChange={(e) => setPhone(sanitizeLocalPhoneInput(e.target.value, 'NP'))}
            inputMode="numeric"
            maxLength={phoneNationalLength('NP').max}
            placeholder="98xxxxxxxx"
          />
          <p className="mt-1 text-xs text-[#8E8E93]">Nepal: {phoneNationalLength('NP').max} digits max</p>
        </div>
        <div>
          <span className={labelClass}>City *</span>
          <input
            className={inputClass}
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Kathmandu"
          />
        </div>
      </div>

      <div>
        <span className={labelClass}>Street address</span>
        <input
          className={inputClass}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Optional — helps customers find you"
        />
      </div>

      <div>
        <span className={labelClass}>Tagline</span>
        <input
          className={inputClass}
          maxLength={120}
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Optional short slogan"
        />
      </div>

      <div>
        <span className={labelClass}>Short description</span>
        <textarea
          className={`${inputClass} min-h-[88px]`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional — tell customers what you offer"
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-[#FF5A5F] px-5 py-3 text-sm font-bold text-white disabled:opacity-60 sm:w-auto"
      >
        {busy ? 'Saving…' : 'Continue to stamp card →'}
      </button>
    </form>
  );
}
