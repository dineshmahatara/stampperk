import { Country, State, City, type ICountry, type IState, type ICity } from 'country-state-city';
import {
  listNepalProvinces,
  matchNepalAddress,
  nepalProvinceName,
  resolveNepalProvinceId,
} from './nepal-admin';

export type AddressFormValue = {
  /** ISO 3166-1 alpha-2 when known (e.g. NP, US). */
  country: string;
  /** State / province display name. */
  province: string;
  /** Optional ISO state code (or Nepal province id e.g. NP03) for cascading. */
  provinceCode?: string;
  district: string;
  city: string;
  municipality: string;
  ward: string;
  /** Street line — maps to streetAddress (customer) or address (merchant). */
  street: string;
  postalCode: string;
};

export function isNepalCountry(countryCode?: string | null): boolean {
  return normalizeCountryCode(countryCode) === 'NP';
}

export type AddressOption = { value: string; label: string; meta?: string };

export function listCountries(): AddressOption[] {
  return Country.getAllCountries()
    .map((c: ICountry) => ({
      value: c.isoCode,
      label: `${c.flag || ''} ${c.name}`.trim(),
      meta: c.isoCode,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function listStates(countryCode: string): AddressOption[] {
  if (!countryCode) return [];
  if (isNepalCountry(countryCode)) return listNepalProvinces();
  return State.getStatesOfCountry(countryCode.toUpperCase()).map((s: IState) => ({
    value: s.isoCode,
    label: s.name,
    meta: s.isoCode,
  }));
}

export function listCities(countryCode: string, stateCode: string): AddressOption[] {
  if (!countryCode || !stateCode) return [];
  // Nepal uses district → local level cascading instead of generic cities.
  if (isNepalCountry(countryCode)) return [];
  return City.getCitiesOfState(countryCode.toUpperCase(), stateCode.toUpperCase()).map(
    (c: ICity) => ({
      value: c.name,
      label: c.name,
    }),
  );
}

export function countryName(isoOrName?: string | null): string {
  if (!isoOrName) return '';
  const code = isoOrName.trim().toUpperCase();
  if (code.length === 2) {
    return Country.getCountryByCode(code)?.name || isoOrName;
  }
  const hit = Country.getAllCountries().find(
    (c) => c.name.toLowerCase() === isoOrName.trim().toLowerCase(),
  );
  return hit?.name || isoOrName;
}

export function normalizeCountryCode(isoOrName?: string | null): string {
  if (!isoOrName) return '';
  const raw = isoOrName.trim();
  if (raw.length === 2) return raw.toUpperCase();
  const hit = Country.getAllCountries().find(
    (c) => c.name.toLowerCase() === raw.toLowerCase() || c.isoCode.toLowerCase() === raw.toLowerCase(),
  );
  return hit?.isoCode || raw.toUpperCase();
}

export function resolveStateCode(countryCode: string, provinceNameOrCode?: string | null): string {
  if (!countryCode || !provinceNameOrCode) return '';
  if (isNepalCountry(countryCode)) return resolveNepalProvinceId(provinceNameOrCode);
  const states = State.getStatesOfCountry(countryCode.toUpperCase());
  const raw = provinceNameOrCode.trim();
  const byCode = states.find((s) => s.isoCode.toLowerCase() === raw.toLowerCase());
  if (byCode) return byCode.isoCode;
  const byName = states.find((s) => s.name.toLowerCase() === raw.toLowerCase());
  return byName?.isoCode || '';
}

export function stateName(countryCode: string, stateCodeOrName?: string | null): string {
  if (!countryCode || !stateCodeOrName) return stateCodeOrName || '';
  if (isNepalCountry(countryCode)) return nepalProvinceName(stateCodeOrName);
  const states = State.getStatesOfCountry(countryCode.toUpperCase());
  const raw = stateCodeOrName.trim();
  const hit =
    states.find((s) => s.isoCode.toLowerCase() === raw.toLowerCase()) ||
    states.find((s) => s.name.toLowerCase() === raw.toLowerCase());
  return hit?.name || stateCodeOrName;
}

/** Countries where extra local fields (district / municipality / ward) are useful. */
export function showsLocalAdminFields(countryCode?: string | null): boolean {
  const c = normalizeCountryCode(countryCode);
  return c === 'NP' || c === 'IN' || c === 'BD' || c === 'LK';
}

export function filterOptions(options: AddressOption[], query: string, limit = 80): AddressOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options.slice(0, limit);
  return options
    .filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        (o.meta || '').toLowerCase().includes(q),
    )
    .slice(0, limit);
}

export type NominatimHit = {
  display_name: string;
  address?: {
    country_code?: string;
    country?: string;
    state?: string;
    state_district?: string;
    county?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    road?: string;
    house_number?: string;
    postcode?: string;
  };
  lat?: string;
  lon?: string;
};

export function mapNominatimToAddress(hit: NominatimHit): Partial<AddressFormValue> & {
  latitude?: number;
  longitude?: number;
} {
  const a = hit.address || {};
  const country = normalizeCountryCode(a.country_code || a.country || '');
  const provinceRaw = a.state || a.state_district || '';
  const city = a.city || a.town || a.village || a.municipality || '';
  const street = [a.house_number, a.road].filter(Boolean).join(' ').trim();
  const districtRaw = a.county || a.state_district || '';
  const municipalityRaw = a.municipality || a.suburb || city || '';

  if (isNepalCountry(country)) {
    const matched = matchNepalAddress({
      province: provinceRaw,
      district: districtRaw,
      municipality: municipalityRaw,
      city,
    });
    return {
      country,
      province: matched.province || provinceRaw,
      provinceCode: matched.provinceId || undefined,
      district: matched.district || districtRaw,
      city: matched.municipality || city,
      municipality: matched.municipality || municipalityRaw,
      ward: '',
      street,
      postalCode: a.postcode || '',
      latitude: hit.lat ? Number(hit.lat) : undefined,
      longitude: hit.lon ? Number(hit.lon) : undefined,
    };
  }

  const provinceCode = resolveStateCode(country, provinceRaw);
  const province = stateName(country, provinceRaw || provinceCode);
  return {
    country,
    province,
    provinceCode: provinceCode || undefined,
    district: districtRaw,
    city,
    municipality: municipalityRaw,
    ward: '',
    street,
    postalCode: a.postcode || '',
    latitude: hit.lat ? Number(hit.lat) : undefined,
    longitude: hit.lon ? Number(hit.lon) : undefined,
  };
}

export async function searchPlaces(query: string, limit = 6): Promise<NominatimHit[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=${limit}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      // Nominatim usage policy requires a valid identifying UA.
      'User-Agent': 'StampPerkAddressPicker/1.0 (loyalty@stampperk.app)',
    },
  });
  if (!res.ok) return [];
  return (await res.json()) as NominatimHit[];
}
