'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AddressFormValue,
  AddressOption,
  filterOptions,
  isNepalCountry,
  listCities,
  listCountries,
  listNepalDistricts,
  listNepalLocalLevels,
  listNepalWards,
  listStates,
  mapNominatimToAddress,
  nepalDistrictName,
  nepalLocalLevelName,
  normalizeCountryCode,
  resolveNepalDistrictId,
  resolveNepalLocalLevelId,
  resolveStateCode,
  searchPlaces,
  showsLocalAdminFields,
  stateName,
  type NominatimHit,
} from '@stampz/shared';

const inputClass =
  'w-full rounded-xl border border-[var(--stampz-line,#e5e5e5)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--stampz-coral,#FF5A5F)]/30';
const labelClass =
  'mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--stampz-muted,#8E8E93)]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function SearchSelect({
  label,
  value,
  displayValue,
  options,
  placeholder,
  disabled,
  onPick,
  onClear,
}: {
  label: string;
  value: string;
  displayValue: string;
  options: AddressOption[];
  placeholder: string;
  disabled?: boolean;
  onPick: (opt: AddressOption) => void;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = useMemo(() => filterOptions(options, q, 120), [options, q]);

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  return (
    <div className="relative">
      <Field label={label}>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((v) => !v)}
            className={`${inputClass} text-left disabled:opacity-50`}
          >
            {displayValue || <span className="text-[var(--stampz-muted)]">{placeholder}</span>}
          </button>
          {!!value && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-xl border border-[var(--stampz-line)] px-3 text-xs font-bold text-[var(--stampz-muted)]"
            >
              Clear
            </button>
          )}
        </div>
      </Field>
      {open && !disabled && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-hidden rounded-xl border border-[var(--stampz-line)] bg-white shadow-lg">
          <input
            autoFocus
            className="w-full border-b border-[var(--stampz-line)] px-3 py-2 text-sm outline-none"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="max-h-44 overflow-y-auto">
            {filtered.map((opt) => (
              <button
                key={`${opt.value}-${opt.label}`}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--stampz-pink,#FFF0F1)]"
                onClick={() => {
                  onPick(opt);
                  setOpen(false);
                }}
              >
                <span className="font-semibold">{opt.label}</span>
                {opt.meta && opt.meta !== opt.value && (
                  <span className="ml-2 text-xs text-[var(--stampz-muted)]">{opt.meta}</span>
                )}
              </button>
            ))}
            {!filtered.length && (
              <div className="px-3 py-3 text-sm text-[var(--stampz-muted)]">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AddressPicker({
  value,
  onChange,
  streetKeyLabel = 'Street address',
  showLocalAdmin,
  onCoords,
}: {
  value: AddressFormValue;
  onChange: (next: AddressFormValue) => void;
  streetKeyLabel?: string;
  /** Force show/hide district-municipality-ward. Default: auto by country. */
  showLocalAdmin?: boolean;
  onCoords?: (coords: { latitude: number; longitude: number }) => void;
}) {
  const countryCode = normalizeCountryCode(value.country);
  const nepal = isNepalCountry(countryCode);
  const countries = useMemo(() => listCountries(), []);
  const states = useMemo(() => listStates(countryCode), [countryCode]);
  const provinceCode =
    value.provinceCode || resolveStateCode(countryCode, value.province) || '';
  const cities = useMemo(
    () => listCities(countryCode, provinceCode),
    [countryCode, provinceCode],
  );
  const nepalDistricts = useMemo(
    () => (nepal ? listNepalDistricts(provinceCode || value.province) : []),
    [nepal, provinceCode, value.province],
  );
  const districtId = nepal
    ? resolveNepalDistrictId(value.district, provinceCode || value.province)
    : '';
  const nepalLocals = useMemo(
    () => (nepal && (districtId || value.district) ? listNepalLocalLevels(districtId || value.district) : []),
    [nepal, districtId, value.district],
  );
  const localLevelId = nepal
    ? resolveNepalLocalLevelId(value.municipality || value.city, districtId || value.district)
    : '';
  const wards = useMemo(() => (nepal ? listNepalWards(35) : []), [nepal]);
  const local = showLocalAdmin ?? showsLocalAdminFields(countryCode);

  const [placeQ, setPlaceQ] = useState('');
  const [hits, setHits] = useState<NominatimHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (placeQ.trim().length < 3) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      searchPlaces(placeQ, 6)
        .then(setHits)
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 450);
    return () => clearTimeout(t);
  }, [placeQ]);

  function patch(partial: Partial<AddressFormValue>) {
    onChange({ ...value, ...partial });
  }

  function applyHit(hit: NominatimHit) {
    const mapped = mapNominatimToAddress(hit);
    const { latitude, longitude, ...addr } = mapped;
    onChange({
      country: addr.country || value.country,
      province: addr.province || '',
      provinceCode: addr.provinceCode,
      district: addr.district || '',
      city: addr.city || '',
      municipality: addr.municipality || '',
      ward: addr.ward || '',
      street: addr.street || value.street,
      postalCode: addr.postalCode || value.postalCode,
    });
    if (latitude != null && longitude != null && onCoords) {
      onCoords({ latitude, longitude });
    }
    setPlaceQ('');
    setHits([]);
  }

  const countryLabel =
    countries.find((c) => c.value === countryCode)?.label || value.country || '';
  const provinceLabel =
    states.find((s) => s.value === provinceCode)?.label ||
    stateName(countryCode, value.province) ||
    value.province ||
    '';
  const districtLabel = nepal
    ? nepalDistrictName(districtId || value.district, provinceCode) || value.district
    : value.district;
  const localLabel = nepal
    ? nepalLocalLevelName(localLevelId || value.municipality, districtId) ||
      value.municipality ||
      value.city
    : value.municipality;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[var(--stampz-coral)]/15 bg-[var(--stampz-pink,#FFF8F7)] p-3">
        <Field label="Search address (worldwide)">
          <input
            className={inputClass}
            value={placeQ}
            onChange={(e) => setPlaceQ(e.target.value)}
            placeholder="Start typing a place, street, or city…"
          />
        </Field>
        {searching && (
          <p className="mt-1 text-xs font-semibold text-[var(--stampz-muted)]">Searching…</p>
        )}
        {!!hits.length && (
          <div className="mt-2 overflow-hidden rounded-xl border border-[var(--stampz-line)] bg-white">
            {hits.map((h) => (
              <button
                key={h.display_name}
                type="button"
                className="block w-full border-b border-[var(--stampz-line)] px-3 py-2 text-left text-sm last:border-b-0 hover:bg-[var(--stampz-pink)]"
                onClick={() => applyHit(h)}
              >
                {h.display_name}
              </button>
            ))}
          </div>
        )}
        <p className="mt-2 text-[11px] text-[var(--stampz-muted)]">
          {nepal
            ? 'Nepal: Province → District → Local level → Ward. Search can autofill when possible.'
            : 'Pick a suggestion to autofill, or use the dependent dropdowns below.'}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SearchSelect
          label="Country"
          value={countryCode}
          displayValue={countryLabel}
          options={countries}
          placeholder="Select country"
          onPick={(opt) =>
            patch({
              country: opt.value,
              province: '',
              provinceCode: '',
              district: '',
              city: '',
              municipality: '',
              ward: '',
            })
          }
          onClear={() =>
            patch({
              country: '',
              province: '',
              provinceCode: '',
              district: '',
              city: '',
              municipality: '',
              ward: '',
            })
          }
        />
        <SearchSelect
          label={nepal ? 'Province (प्रदेश)' : 'State / Province'}
          value={provinceCode || value.province}
          displayValue={provinceLabel}
          options={states}
          placeholder={countryCode ? (nepal ? 'Select province' : 'Select state / province') : 'Select country first'}
          disabled={!countryCode || !states.length}
          onPick={(opt) =>
            patch({
              province: opt.label,
              provinceCode: opt.value,
              district: '',
              city: '',
              municipality: '',
              ward: '',
            })
          }
          onClear={() =>
            patch({
              province: '',
              provinceCode: '',
              district: '',
              city: '',
              municipality: '',
              ward: '',
            })
          }
        />

        {nepal ? (
          <>
            <SearchSelect
              label="District (जिल्ला)"
              value={districtId || value.district}
              displayValue={districtLabel}
              options={nepalDistricts}
              placeholder={provinceCode ? 'Select district' : 'Select province first'}
              disabled={!provinceCode}
              onPick={(opt) =>
                patch({
                  district: opt.label,
                  city: '',
                  municipality: '',
                  ward: '',
                })
              }
              onClear={() => patch({ district: '', city: '', municipality: '', ward: '' })}
            />
            <SearchSelect
              label="Local level (स्थानीय तह)"
              value={localLevelId || value.municipality}
              displayValue={localLabel}
              options={nepalLocals}
              placeholder={
                districtId || value.district
                  ? 'Select municipality / rural municipality'
                  : 'Select district first'
              }
              disabled={!districtId && !value.district}
              onPick={(opt) =>
                patch({
                  municipality: opt.label,
                  city: opt.label,
                })
              }
              onClear={() => patch({ municipality: '', city: '' })}
            />
            <SearchSelect
              label="Ward (वडा)"
              value={value.ward}
              displayValue={value.ward ? `Ward ${value.ward}` : ''}
              options={wards}
              placeholder="Select ward"
              disabled={!localLevelId && !value.municipality}
              onPick={(opt) => patch({ ward: opt.value })}
              onClear={() => patch({ ward: '' })}
            />
            <Field label="Ward (custom)">
              <input
                className={inputClass}
                value={value.ward}
                onChange={(e) => patch({ ward: e.target.value })}
                placeholder="Or type ward number"
              />
            </Field>
          </>
        ) : (
          <>
            <SearchSelect
              label="City"
              value={value.city}
              displayValue={value.city}
              options={cities}
              placeholder={
                provinceCode
                  ? cities.length
                    ? 'Select or search city'
                    : 'No city list — type below'
                  : 'Select state first'
              }
              disabled={!provinceCode}
              onPick={(opt) => patch({ city: opt.label })}
              onClear={() => patch({ city: '' })}
            />
            <Field label="City (custom)">
              <input
                className={inputClass}
                value={value.city}
                onChange={(e) => patch({ city: e.target.value })}
                placeholder="Type city if not listed"
              />
            </Field>
            {local && (
              <>
                <Field label="District / County">
                  <input
                    className={inputClass}
                    value={value.district}
                    onChange={(e) => patch({ district: e.target.value })}
                  />
                </Field>
                <Field label="Municipality">
                  <input
                    className={inputClass}
                    value={value.municipality}
                    onChange={(e) => patch({ municipality: e.target.value })}
                  />
                </Field>
                <Field label="Ward">
                  <input
                    className={inputClass}
                    value={value.ward}
                    onChange={(e) => patch({ ward: e.target.value })}
                  />
                </Field>
              </>
            )}
          </>
        )}

        <div className="sm:col-span-2">
          <Field label={streetKeyLabel}>
            <input
              className={inputClass}
              value={value.street}
              onChange={(e) => patch({ street: e.target.value })}
              placeholder="House / street / landmark"
            />
          </Field>
        </div>
        <Field label="Postal code">
          <input
            className={inputClass}
            value={value.postalCode}
            onChange={(e) => patch({ postalCode: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}
