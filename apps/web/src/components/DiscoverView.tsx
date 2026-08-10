'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { formatLocationParts, mapsNavigateUrl, type MapsTarget } from '@/lib/geo';
import { MapsNavigateLink } from '@/components/MapsNavigateLink';
import { BrandMark } from '@/components/BrandMark';
import { DiscoverMap } from '@/components/DiscoverMapDynamic';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import {
  DISCOVER_MAP_STYLES,
  type DiscoverMapStyleId,
} from '@/lib/discoverMapStyles';
import {
  CategoryTypeIcon,
  resolveCategoryVisual,
} from '@/lib/discoverCategoryVisual';

const FALLBACK = { lat: 27.7172, lng: 85.324 };

type DiscoverResult = {
  id: string;
  businessName: string;
  slug: string;
  category?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  logoUrl?: string | null;
  tagline?: string | null;
  distanceKm?: number | null;
  verified?: boolean;
};

type CatGroup = { id: string; label: string; merchantCount: number };

export function DiscoverView({ embedded = false }: { embedded?: boolean }) {
  const [q, setQ] = useState('');
  const [locale, setLocale] = useState<'en' | 'ne'>('en');
  const [coords, setCoords] = useState(FALLBACK);
  const [hasUserLocation, setHasUserLocation] = useState(false);
  const [locLabel, setLocLabel] = useState('Finding your location…');
  const [results, setResults] = useState<DiscoverResult[]>([]);
  const [groups, setGroups] = useState<CatGroup[]>([]);
  const [groupId, setGroupId] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [mapStyleId, setMapStyleId] = useState<DiscoverMapStyleId>('standard');
  const [styleSheetOpen, setStyleSheetOpen] = useState(false);

  const labels = {
    en: {
      title: 'Discover nearby',
      search: 'Search businesses',
      empty: 'No results',
      navigate: 'Navigate',
      all: 'All',
      view: 'View profile',
      locate: 'My location',
      mapStyle: 'Map style',
    },
    ne: {
      title: 'नजिकका व्यवसाय खोज्नुहोस्',
      search: 'व्यवसाय खोज्नुहोस्',
      empty: 'नतिजा छैन',
      navigate: 'नेभिगेट',
      all: 'सबै',
      view: 'प्रोफाइल हेर्नुहोस्',
      locate: 'मेरो स्थान',
      mapStyle: 'नक्सा शैली',
    },
  }[locale];

  function goMyLocation() {
    if (!navigator.geolocation) {
      setLocLabel('Geolocation not supported — using Kathmandu');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setHasUserLocation(true);
        setLocLabel('Using your current location');
        setLocating(false);
      },
      () => {
        setLocLabel('Location denied — using Kathmandu');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  useEffect(() => {
    goMyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api<{
      groups: Array<{
        id: string;
        displayLabel?: string;
        label?: { en?: string; ne?: string };
        merchantCount?: number;
      }>;
    }>(`/discovery/categories?lat=${coords.lat}&lng=${coords.lng}&radiusKm=50&locale=${locale}`)
      .then((r) =>
        setGroups(
          (r.groups || []).map((g) => ({
            id: g.id,
            label: (locale === 'ne' ? g.label?.ne : g.label?.en) || g.displayLabel || g.id,
            merchantCount: g.merchantCount ?? 0,
          })),
        ),
      )
      .catch(() => setGroups([]));
  }, [coords.lat, coords.lng, locale]);

  useEffect(() => {
    const params = new URLSearchParams({
      q,
      lat: String(coords.lat),
      lng: String(coords.lng),
      radiusKm: '50',
      locale,
    });
    if (groupId !== 'all') params.set('groupId', groupId);
    if (verifiedOnly) params.set('verified', '1');
    api<{ results: DiscoverResult[] }>(`/discovery/search?${params.toString()}`)
      .then((r) => {
        setResults(r.results || []);
        setSelectedId(null);
      })
      .catch(() => setResults([]));
  }, [q, locale, coords.lat, coords.lng, groupId, verifiedOnly]);

  const pins = useMemo(
    () =>
      results
        .filter(
          (m) =>
            typeof m.latitude === 'number' &&
            typeof m.longitude === 'number' &&
            !Number.isNaN(m.latitude) &&
            !Number.isNaN(m.longitude),
        )
        .map((m) => ({
          id: m.id,
          businessName: m.businessName,
          latitude: m.latitude!,
          longitude: m.longitude!,
          category: m.category,
        })),
    [results],
  );

  const selected = results.find((m) => m.id === selectedId) || null;
  const user = hasUserLocation ? coords : null;

  return (
    <div
      className={`relative overflow-hidden bg-[#E8ECF0] text-[#1C1C1E] ${
        embedded
          ? '-mx-4 -my-5 h-[calc(100dvh-3.5rem)] min-h-[560px] sm:-mx-6 lg:-mx-8 lg:-my-6 lg:h-[calc(100dvh-4.25rem)]'
          : 'h-[100dvh]'
      }`}
    >
      <div className="absolute inset-0 z-0">
        <DiscoverMap
          pins={pins}
          selectedId={selectedId}
          user={user}
          mapStyleId={mapStyleId}
          onSelect={(id) => setSelectedId(id)}
          onDeselect={() => setSelectedId(null)}
        />
      </div>

      {/* Top overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pb-2 pt-4 sm:px-6">
        {!embedded && (
          <div className="pointer-events-auto mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="rounded-2xl bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
              <BrandMark href="/" />
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="rounded-xl border border-black/8 bg-white/95 px-3 py-2 text-sm font-bold shadow-lg backdrop-blur hover:bg-white"
              >
                Dashboard
              </Link>
              <select
                className="rounded-xl border border-black/8 bg-white/95 px-3 py-2 text-sm font-semibold shadow-lg backdrop-blur"
                value={locale}
                onChange={(e) => setLocale(e.target.value as 'en' | 'ne')}
              >
                <option value="en">English</option>
                <option value="ne">नेपाली</option>
              </select>
            </div>
          </div>
        )}

        <div
          className={`pointer-events-auto mx-auto max-w-3xl rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur ${
            embedded ? '' : 'mt-3'
          }`}
        >
          <div className="flex items-end justify-between gap-2">
            <div>
              <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">{labels.title}</h1>
              <p className="text-xs text-[#8E8E93] sm:text-sm">{locLabel}</p>
            </div>
            {embedded && (
              <select
                className="rounded-lg border border-black/8 bg-[#F8F8FA] px-2 py-1 text-xs font-semibold"
                value={locale}
                onChange={(e) => setLocale(e.target.value as 'en' | 'ne')}
              >
                <option value="en">EN</option>
                <option value="ne">नेपाली</option>
              </select>
            )}
          </div>
          <input
            className="mt-2.5 w-full rounded-xl border border-black/8 bg-[#F8F8FA] px-3 py-2.5 text-sm outline-none focus:border-[#FF5A5F]/40"
            placeholder={labels.search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setGroupId('all')}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                groupId === 'all' ? 'bg-[#FF5A5F] text-white' : 'border border-black/8 bg-white text-[#5C5651]'
              }`}
            >
              {labels.all}
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroupId(g.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                  groupId === g.id
                    ? 'bg-[#FF5A5F] text-white'
                    : 'border border-black/8 bg-white text-[#5C5651]'
                }`}
              >
                {g.label}
                {g.merchantCount > 0 ? ` (${g.merchantCount})` : ''}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setVerifiedOnly((v) => !v)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                verifiedOnly
                  ? 'bg-[#FF5A5F] text-white'
                  : 'border border-black/8 bg-white text-[#5C5651]'
              }`}
            >
              Verified
            </button>
          </div>
        </div>
      </div>

      {/* Map style + locate FABs */}
      <button
        type="button"
        onClick={() => setStyleSheetOpen(true)}
        aria-label={labels.mapStyle}
        className="absolute bottom-[calc(min(42vh,360px)+3.25rem)] right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-white text-[#1C1C1E] shadow-lg sm:right-6"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2 2 7l10 5 10-5-10-5Z" />
          <path d="m2 12 10 5 10-5" />
          <path d="m2 17 10 5 10-5" />
        </svg>
      </button>
      <button
        type="button"
        onClick={goMyLocation}
        disabled={locating}
        aria-label={labels.locate}
        className="absolute bottom-[min(42vh,360px)] right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-white text-[#FF5A5F] shadow-lg sm:right-6 disabled:opacity-60"
      >
        {locating ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FF5A5F] border-t-transparent" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        )}
      </button>

      {styleSheetOpen && (
        <div
          className="absolute inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={labels.mapStyle}
          onClick={() => setStyleSheetOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-extrabold">{labels.mapStyle}</h2>
              <button
                type="button"
                onClick={() => setStyleSheetOpen(false)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-[#8E8E93] hover:bg-black/5"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5">
              {DISCOVER_MAP_STYLES.map((opt) => {
                const on = opt.id === mapStyleId;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setMapStyleId(opt.id);
                      setStyleSheetOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      on ? 'bg-[#FF5A5F]/10 ring-1 ring-[#FF5A5F]/35' : 'hover:bg-[#F8F8FA]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold">{opt.label}</div>
                      <div className="text-xs text-[#8E8E93]">{opt.description}</div>
                    </div>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        on ? 'border-[#FF5A5F] bg-[#FF5A5F] text-white' : 'border-black/20'
                      }`}
                    >
                      {on ? (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M2.5 6.5 5 9l4.5-5.5" />
                        </svg>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet */}
      <div className="absolute inset-x-0 bottom-0 z-20 max-h-[42vh] overflow-hidden rounded-t-3xl border border-black/5 bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.12)] sm:max-h-[38vh]">
        <div className="mx-auto mb-1 mt-2.5 h-1 w-10 rounded-full bg-black/10" />
        <div className="max-h-[calc(42vh-16px)] overflow-y-auto px-4 pb-5 sm:max-h-[calc(38vh-16px)] sm:px-6">
          {selected ? (
            <SelectedPeek
              merchant={selected}
              navigateLabel={labels.navigate}
              viewLabel={labels.view}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <div className="space-y-2.5 pt-1">
              {results.length === 0 && (
                <p className="py-6 text-center text-sm text-[#8E8E93]">{labels.empty}</p>
              )}
              {results.map((m) => (
                <DiscoverResultCard
                  key={m.id}
                  merchant={m}
                  navigateLabel={labels.navigate}
                  compact
                  onFocus={() => setSelectedId(m.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BusinessTypeAvatar({
  merchant: m,
  size = 'md',
}: {
  merchant: Pick<DiscoverResult, 'businessName' | 'category' | 'logoUrl'>;
  size?: 'md' | 'lg';
}) {
  const visual = resolveCategoryVisual(m.category, m.businessName);
  const box = size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-11 w-11 rounded-xl';
  const icon = size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';

  if (m.logoUrl) {
    return (
      <div className={`relative shrink-0 overflow-hidden ${box} bg-[#FFE0E3]`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.logoUrl} alt="" className="h-full w-full object-cover" />
        <span
          className="absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-md border border-white/80 shadow-sm"
          style={{ backgroundColor: visual.bg, color: visual.color }}
          title={m.category || 'Business'}
        >
          <CategoryTypeIcon id={visual.id} className="h-3 w-3" color={visual.color} />
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center ${box}`}
      style={{ backgroundColor: visual.bg, color: visual.color }}
      title={m.category || 'Business'}
    >
      <CategoryTypeIcon id={visual.id} className={icon} color={visual.color} />
    </div>
  );
}

function SelectedPeek({
  merchant: m,
  navigateLabel,
  viewLabel,
  onBack,
}: {
  merchant: DiscoverResult;
  navigateLabel: string;
  viewLabel: string;
  onBack: () => void;
}) {
  const location = useMemo(
    () => formatLocationParts(m.address, m.city, m.district),
    [m.address, m.city, m.district],
  );
  const mapsTarget: MapsTarget = useMemo(
    () => ({
      latitude: m.latitude,
      longitude: m.longitude,
      address: location || undefined,
      label: m.businessName,
      googleMapsUrl: m.googleMapsUrl,
    }),
    [m.latitude, m.longitude, m.googleMapsUrl, m.businessName, location],
  );
  const canNavigate = Boolean(mapsNavigateUrl(mapsTarget));

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={onBack}
        className="mb-2 text-xs font-bold text-[#8E8E93] hover:text-[#1C1C1E]"
      >
        ← Back to list
      </button>
      <div className="flex items-start gap-3">
        <BusinessTypeAvatar merchant={m} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-lg font-extrabold inline-flex items-center gap-1.5">
            {m.businessName}
            {m.verified ? <VerifiedBadge size="sm" /> : null}
          </div>
          {m.tagline && <div className="mt-0.5 truncate text-sm text-[#6b7280]">{m.tagline}</div>}
          <div className="mt-1 text-sm text-[#6b7280]">
            {m.category || 'Business'}
            {m.distanceKm != null ? ` · ${Number(m.distanceKm).toFixed(1)} km` : ''}
          </div>
          {location && <div className="mt-1 text-xs text-[#8E8E93]">{location}</div>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/b/${m.slug}`}
          className="rounded-full bg-[#FF5A5F] px-4 py-2 text-sm font-bold text-white"
        >
          {viewLabel} →
        </Link>
        {canNavigate && (
          <MapsNavigateLink
            target={mapsTarget}
            className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-bold text-[#1C1C1E]"
          >
            {navigateLabel} →
          </MapsNavigateLink>
        )}
      </div>
    </div>
  );
}

function DiscoverResultCard({
  merchant: m,
  navigateLabel,
  compact,
  onFocus,
}: {
  merchant: DiscoverResult;
  navigateLabel: string;
  compact?: boolean;
  onFocus?: () => void;
}) {
  const location = useMemo(
    () => formatLocationParts(m.address, m.city, m.district),
    [m.address, m.city, m.district],
  );
  const mapsTarget: MapsTarget = useMemo(
    () => ({
      latitude: m.latitude,
      longitude: m.longitude,
      address: location || undefined,
      label: m.businessName,
      googleMapsUrl: m.googleMapsUrl,
    }),
    [m.latitude, m.longitude, m.googleMapsUrl, m.businessName, location],
  );
  const canNavigate = Boolean(mapsNavigateUrl(mapsTarget));

  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-[#F8F8FA]">
      <button
        type="button"
        onClick={onFocus}
        className="flex w-full items-start gap-3 p-3 text-left hover:bg-[#FFF7F7]"
      >
        <BusinessTypeAvatar merchant={m} size="md" />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[#1C1C1E] inline-flex items-center gap-1.5">
            {m.businessName}
            {m.verified ? <VerifiedBadge size="sm" /> : null}
          </div>
          {!compact && m.tagline && (
            <div className="mt-0.5 truncate text-sm text-[#6b7280]">{m.tagline}</div>
          )}
          <div className="mt-0.5 text-sm text-[#6b7280]">
            {m.category || 'Business'}
            {m.distanceKm != null ? ` · ${Number(m.distanceKm).toFixed(1)} km` : ''}
          </div>
        </div>
        {m.distanceKm != null && (
          <span className="shrink-0 text-xs font-bold text-[#FF5A5F]">{Number(m.distanceKm).toFixed(1)} km</span>
        )}
      </button>
      {(location || canNavigate) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 bg-white px-3 py-2">
          {location ? (
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#5C5651]">⌖ {location}</span>
          ) : (
            <span className="text-xs text-[#6b7280]">On map</span>
          )}
          <div className="flex shrink-0 gap-2">
            <Link href={`/b/${m.slug}`} className="text-xs font-bold text-[#FF5A5F]">
              View →
            </Link>
            {canNavigate && (
              <MapsNavigateLink
                target={mapsTarget}
                className="rounded-full bg-[#FF5A5F] px-2.5 py-1 text-[11px] font-bold text-white"
              >
                {navigateLabel} →
              </MapsNavigateLink>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
