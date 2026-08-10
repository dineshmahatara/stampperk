import data from './data/nepal-admin.json';
import type { AddressOption } from './address';

export type NepalProvince = { id: string; name: string; nameNe: string };
export type NepalDistrict = { id: string; provinceId: string; name: string; nameNe: string };
export type NepalLocalLevel = { id: string; districtId: string; name: string; nameNe: string };

const provinces = data.provinces as NepalProvince[];
const districts = data.districts as NepalDistrict[];
const localLevels = data.localLevels as NepalLocalLevel[];

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function option(id: string, name: string, nameNe: string): AddressOption {
  return { value: id, label: name, meta: nameNe };
}

export function nepalAdminAttribution(): string {
  return data.attribution;
}

export function listNepalProvinces(): AddressOption[] {
  return [...provinces]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => option(p.id, p.name, p.nameNe));
}

export function resolveNepalProvinceId(idOrName?: string | null): string {
  if (!idOrName) return '';
  const raw = idOrName.trim();
  const byId = provinces.find((p) => p.id.toLowerCase() === raw.toLowerCase());
  if (byId) return byId.id;
  const n = norm(raw);
  const byName = provinces.find(
    (p) =>
      norm(p.name) === n ||
      norm(p.nameNe) === n ||
      norm(p.name).includes(n) ||
      n.includes(norm(p.name)),
  );
  return byName?.id || '';
}

export function nepalProvinceName(idOrName?: string | null): string {
  const id = resolveNepalProvinceId(idOrName);
  return provinces.find((p) => p.id === id)?.name || idOrName || '';
}

export function listNepalDistricts(provinceIdOrName?: string | null): AddressOption[] {
  const provinceId = resolveNepalProvinceId(provinceIdOrName);
  const rows = provinceId
    ? districts.filter((d) => d.provinceId === provinceId)
    : districts;
  return [...rows]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => option(d.id, d.name, d.nameNe));
}

export function resolveNepalDistrictId(
  districtIdOrName?: string | null,
  provinceIdOrName?: string | null,
): string {
  if (!districtIdOrName) return '';
  const raw = districtIdOrName.trim();
  const provinceId = resolveNepalProvinceId(provinceIdOrName);
  const pool = provinceId ? districts.filter((d) => d.provinceId === provinceId) : districts;
  const byId = pool.find((d) => d.id.toLowerCase() === raw.toLowerCase());
  if (byId) return byId.id;
  const n = norm(raw);
  const byName = pool.find((d) => norm(d.name) === n || norm(d.nameNe) === n);
  return byName?.id || '';
}

export function nepalDistrictName(idOrName?: string | null, provinceIdOrName?: string | null): string {
  const id = resolveNepalDistrictId(idOrName, provinceIdOrName);
  return districts.find((d) => d.id === id)?.name || idOrName || '';
}

export function listNepalLocalLevels(districtIdOrName?: string | null): AddressOption[] {
  const districtId = resolveNepalDistrictId(districtIdOrName);
  if (!districtId) return [];
  return localLevels
    .filter((u) => u.districtId === districtId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((u) => option(u.id, u.name, u.nameNe));
}

export function resolveNepalLocalLevelId(
  localIdOrName?: string | null,
  districtIdOrName?: string | null,
): string {
  if (!localIdOrName) return '';
  const raw = localIdOrName.trim();
  const districtId = resolveNepalDistrictId(districtIdOrName);
  const pool = districtId ? localLevels.filter((u) => u.districtId === districtId) : localLevels;
  const byId = pool.find((u) => u.id.toLowerCase() === raw.toLowerCase());
  if (byId) return byId.id;
  const n = norm(raw);
  const byName = pool.find((u) => norm(u.name) === n || norm(u.nameNe) === n);
  return byName?.id || '';
}

export function nepalLocalLevelName(
  idOrName?: string | null,
  districtIdOrName?: string | null,
): string {
  const id = resolveNepalLocalLevelId(idOrName, districtIdOrName);
  return localLevels.find((u) => u.id === id)?.name || idOrName || '';
}

/** Typical ward numbers when official ward count is unknown (1–35 covers almost all). */
export function listNepalWards(max = 35): AddressOption[] {
  return Array.from({ length: max }, (_, i) => {
    const n = String(i + 1);
    return { value: n, label: `Ward ${n}`, meta: `वडा ${n}` };
  });
}

/** Match free-text / Nominatim names onto Nepal hierarchy ids. */
export function matchNepalAddress(partial: {
  province?: string;
  district?: string;
  municipality?: string;
  city?: string;
}): {
  provinceId: string;
  province: string;
  districtId: string;
  district: string;
  localLevelId: string;
  municipality: string;
} {
  const provinceId = resolveNepalProvinceId(partial.province);
  const districtId = resolveNepalDistrictId(partial.district, provinceId || partial.province);
  const localRaw = partial.municipality || partial.city || '';
  const localLevelId = resolveNepalLocalLevelId(localRaw, districtId || partial.district);
  return {
    provinceId,
    province: nepalProvinceName(provinceId || partial.province),
    districtId,
    district: nepalDistrictName(districtId || partial.district, provinceId),
    localLevelId,
    municipality: nepalLocalLevelName(localLevelId || localRaw, districtId),
  };
}
