'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BUSINESS_INDUSTRIES, countryName, searchPlaces } from '@stampperk/shared';
import {
  AdminBusinessGoogleMap,
  AdminBusinessLeafletMap,
  type MapMerchantPin,
} from '@/components/AdminBusinessMapDynamic';
import {
  AdminEmpty,
  AdminError,
  AdminPageHeader,
  AdminStatGrid,
  AdminSurface,
} from '@/components/AdminPage';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatLocationParts, googleMapsLink } from '@/lib/geo';

type GeoMerchant = {
  id: string;
  businessName: string;
  slug: string;
  category: string;
  businessType?: string | null;
  status: string;
  address?: string | null;
  province?: string | null;
  district?: string | null;
  city?: string | null;
  municipality?: string | null;
  ward?: string | null;
  postalCode?: string | null;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  hasCoords: boolean;
  owner?: { email?: string | null; name?: string | null } | null;
};

type GeoPayload = {
  total: number;
  withCoords: number;
  withoutCoords: number;
  byCountry: { country: string; count: number }[];
  byCategory: { category: string; count: number }[];
  merchants: GeoMerchant[];
};

type ResolvedCoord = { latitude: number; longitude: number; approx?: boolean };

const CATEGORY_PALETTE = [
  '#FF5A5F',
  '#0EA5E9',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#6366F1',
  '#84CC16',
  '#EF4444',
  '#06B6D4',
  '#A855F7',
];

function categoryColor(category: string) {
  let hash = 0;
  for (let i = 0; i < category.length; i += 1) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
}

function locationLabel(m: GeoMerchant) {
  return (
    formatLocationParts(m.address, m.municipality, m.city, m.district, m.province, countryName(m.country)) ||
    'No address'
  );
}

export default function AdminBusinessMapPage() {
  const { token } = useAuth();
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const [data, setData] = useState<GeoPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Record<string, ResolvedCoord>>({});
  const [resolving, setResolving] = useState(false);
  const [googleFailed, setGoogleFailed] = useState(false);
  const useGoogle = !!googleKey && !googleFailed;

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    api<GeoPayload>('/admin/merchants-geo', { token })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load map data'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const countries = useMemo(() => {
    const set = new Set((data?.merchants || []).map((m) => m.country || 'Unknown'));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.merchants || []).filter((m) => {
      if (country !== 'ALL' && (m.country || '') !== country) return false;
      if (category !== 'ALL' && (m.category || '') !== category) return false;
      if (status !== 'ALL' && m.status !== status) return false;
      if (!q) return true;
      const blob = [
        m.businessName,
        m.slug,
        m.category,
        m.city,
        m.district,
        m.province,
        m.country,
        m.owner?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [data, country, category, status, query]);

  const pins: MapMerchantPin[] = useMemo(() => {
    const out: MapMerchantPin[] = [];
    for (const m of filtered) {
      const saved =
        typeof m.latitude === 'number' &&
        typeof m.longitude === 'number' &&
        !Number.isNaN(m.latitude) &&
        !Number.isNaN(m.longitude)
          ? { latitude: m.latitude, longitude: m.longitude }
          : resolved[m.id];
      if (!saved) continue;
      out.push({
        id: m.id,
        businessName: m.businessName,
        category: m.category,
        country: m.country,
        city: m.city,
        district: m.district,
        province: m.province,
        address: m.address,
        status: m.status,
        latitude: saved.latitude,
        longitude: saved.longitude,
        googleMapsUrl: m.googleMapsUrl,
        ownerEmail: m.owner?.email,
        color: categoryColor(m.category),
      });
    }
    return out;
  }, [filtered, resolved]);

  const filteredStats = useMemo(() => {
    const byCountry = new Map<string, number>();
    const byCategory = new Map<string, number>();
    for (const m of filtered) {
      const c = m.country || 'Unknown';
      const cat = m.category || 'Other';
      byCountry.set(c, (byCountry.get(c) || 0) + 1);
      byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
    }
    return {
      byCountry: [...byCountry.entries()]
        .map(([k, count]) => ({ country: k, count }))
        .sort((a, b) => b.count - a.count),
      byCategory: [...byCategory.entries()]
        .map(([k, count]) => ({ category: k, count }))
        .sort((a, b) => b.count - a.count),
    };
  }, [filtered]);

  const unmapped = useMemo(
    () =>
      filtered.filter((m) => {
        const hasSaved =
          typeof m.latitude === 'number' &&
          typeof m.longitude === 'number' &&
          !Number.isNaN(m.latitude) &&
          !Number.isNaN(m.longitude);
        return !hasSaved && !resolved[m.id];
      }),
    [filtered, resolved],
  );

  async function resolveMissing() {
    if (!unmapped.length || resolving) return;
    setResolving(true);
    const next: Record<string, ResolvedCoord> = { ...resolved };
    const batch = unmapped.slice(0, 25);
    for (const m of batch) {
      const q = formatLocationParts(
        m.address,
        m.municipality || m.city,
        m.district,
        m.province,
        countryName(m.country) || m.country,
      );
      if (!q) continue;
      try {
        const hits = await searchPlaces(q, 1);
        const hit = hits[0];
        if (hit?.lat && hit?.lon) {
          next[m.id] = {
            latitude: Number(hit.lat),
            longitude: Number(hit.lon),
            approx: true,
          };
          setResolved({ ...next });
        }
      } catch {
        /* ignore single failure */
      }
      await new Promise((r) => setTimeout(r, 1100));
    }
    setResolved(next);
    setResolving(false);
  }

  const selected = filtered.find((m) => m.id === selectedId) || null;

  return (
    <div>
      <AdminPageHeader
        title="Business Map"
        subtitle="See which business types operate in which countries and locations — with map pins."
        action={
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold"
          >
            Refresh
          </button>
        }
      />

      <AdminError message={error} />

      <AdminStatGrid
        items={[
          { label: 'Filtered businesses', value: filtered.length },
          { label: 'On map', value: pins.length },
          { label: 'Countries', value: filteredStats.byCountry.length },
          { label: 'Business types', value: filteredStats.byCategory.length },
        ]}
      />

      <AdminSurface className="mb-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
              Country
            </span>
            <select
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="ALL">All countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {countryName(c) || c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
              Business type
            </span>
            <select
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="ALL">All types</option>
              {[...new Set([...(BUSINESS_INDUSTRIES as readonly string[]), ...filteredStats.byCategory.map((x) => x.category)])]
                .sort()
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
              Status
            </span>
            <select
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PENDING">PENDING</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
              Search
            </span>
            <input
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, city, owner…"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#8E8E93]">
          <span className="rounded-full bg-[#FFF0F1] px-2.5 py-1 text-[#FF5A5F]">
            Map: {useGoogle ? 'Google Maps' : 'OpenStreetMap (set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for Google)'}
          </span>
          {unmapped.length > 0 && (
            <button
              type="button"
              disabled={resolving}
              onClick={() => void resolveMissing()}
              className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[#1C1C1E] disabled:opacity-50"
            >
              {resolving
                ? 'Locating from address…'
                : `Estimate pins for ${Math.min(unmapped.length, 25)} without coords`}
            </button>
          )}
        </div>
      </AdminSurface>

      {loading && !data ? (
        <AdminEmpty message="Loading business locations…" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
          <div className="space-y-4">
            {pins.length ? (
              useGoogle ? (
                <AdminBusinessGoogleMap
                  apiKey={googleKey}
                  pins={pins}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onError={() => setGoogleFailed(true)}
                />
              ) : (
                <AdminBusinessLeafletMap
                  pins={pins}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              )
            ) : (
              <AdminSurface className="flex h-[520px] items-center justify-center">
                <AdminEmpty message="No mapped businesses for these filters. Add lat/lng on merchant profiles, or estimate pins from address." />
              </AdminSurface>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <AdminSurface>
                <h2 className="mb-3 text-sm font-extrabold">By country</h2>
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {filteredStats.byCountry.map((row) => (
                    <button
                      key={row.country}
                      type="button"
                      onClick={() => setCountry(row.country)}
                      className="flex w-full items-center justify-between rounded-xl bg-[#F8F8FA] px-3 py-2 text-left text-sm hover:bg-[#FFF0F1]"
                    >
                      <span className="font-semibold">{countryName(row.country) || row.country}</span>
                      <span className="font-extrabold text-[#FF5A5F]">{row.count}</span>
                    </button>
                  ))}
                  {!filteredStats.byCountry.length && (
                    <p className="text-sm text-[#8E8E93]">No data</p>
                  )}
                </div>
              </AdminSurface>
              <AdminSurface>
                <h2 className="mb-3 text-sm font-extrabold">By business type</h2>
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {filteredStats.byCategory.map((row) => (
                    <button
                      key={row.category}
                      type="button"
                      onClick={() => setCategory(row.category)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl bg-[#F8F8FA] px-3 py-2 text-left text-sm hover:bg-[#FFF0F1]"
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: categoryColor(row.category) }}
                        />
                        {row.category}
                      </span>
                      <span className="font-extrabold text-[#FF5A5F]">{row.count}</span>
                    </button>
                  ))}
                  {!filteredStats.byCategory.length && (
                    <p className="text-sm text-[#8E8E93]">No data</p>
                  )}
                </div>
              </AdminSurface>
            </div>
          </div>

          <AdminSurface className="!p-0 overflow-hidden">
            <div className="border-b border-black/5 px-4 py-3">
              <h2 className="text-sm font-extrabold">Businesses ({filtered.length})</h2>
              <p className="text-xs text-[#8E8E93]">
                {pins.length} pinned · {unmapped.length} without coordinates
              </p>
            </div>
            <div className="max-h-[720px] overflow-y-auto">
              {filtered.map((m) => {
                const pin = pins.find((p) => p.id === m.id);
                const active = selectedId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={`block w-full border-b border-black/5 px-4 py-3 text-left hover:bg-[#FFF8F7] ${
                      active ? 'bg-[#FFF0F1]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold">{m.businessName}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                          <span
                            className="rounded-full px-2 py-0.5 text-white"
                            style={{ background: categoryColor(m.category) }}
                          >
                            {m.category}
                          </span>
                          <span className="rounded-full bg-black/5 px-2 py-0.5 text-[#636366]">
                            {m.status}
                          </span>
                          {!pin && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                              No pin
                            </span>
                          )}
                          {resolved[m.id]?.approx && (
                            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">
                              Approx
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-[#8E8E93]">{locationLabel(m)}</div>
                      </div>
                    </div>
                    {pin && (
                      <a
                        href={m.googleMapsUrl || googleMapsLink(pin.latitude, pin.longitude)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 inline-block text-xs font-bold text-[#FF5A5F]"
                      >
                        Google Maps →
                      </a>
                    )}
                  </button>
                );
              })}
              {!filtered.length && (
                <div className="p-4">
                  <AdminEmpty message="No businesses match these filters." />
                </div>
              )}
            </div>
            {selected && (
              <div className="border-t border-black/5 bg-[#F8F8FA] px-4 py-3 text-xs">
                <div className="font-extrabold">{selected.businessName}</div>
                <div className="mt-1 text-[#8E8E93]">
                  Owner: {selected.owner?.name || '—'} · {selected.owner?.email || '—'}
                </div>
                <div className="mt-1 text-[#8E8E93]">{locationLabel(selected)}</div>
              </div>
            )}
          </AdminSurface>
        </div>
      )}
    </div>
  );
}
