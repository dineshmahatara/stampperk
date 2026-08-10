/** Shared geo helpers (no map library imports). */

export type MapsTarget = {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  label?: string | null;
  googleMapsUrl?: string | null;
};

export function googleMapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function parseCoord(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

export function formatLocationParts(...parts: Array<string | null | undefined>) {
  return parts.map((p) => (p || '').trim()).filter(Boolean).join(', ');
}

function destinationQuery(target: MapsTarget): string | null {
  if (target.latitude != null && target.longitude != null) {
    return `${target.latitude},${target.longitude}`;
  }
  const address = (target.address || '').trim();
  return address || null;
}

/** Google Maps directions / place URL. */
export function googleMapsNavigateUrl(target: MapsTarget): string | null {
  if (target.googleMapsUrl) return target.googleMapsUrl;
  const dest = destinationQuery(target);
  if (!dest) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}

/** Apple Maps directions URL (iPhone / macOS). */
export function appleMapsNavigateUrl(target: MapsTarget): string | null {
  if (target.googleMapsUrl && !destinationQuery(target)) return target.googleMapsUrl;
  const dest = destinationQuery(target);
  if (!dest) return null;
  const params = new URLSearchParams({ daddr: dest });
  if (target.label) params.set('q', target.label);
  return `https://maps.apple.com/?${params.toString()}`;
}

export function isAppleMapsPreferred(userAgent?: string): boolean {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  return /iPhone|iPad|iPod|Macintosh/i.test(ua);
}

/**
 * Prefer merchant custom URL, else Apple Maps on Apple devices, else Google Maps.
 */
export function mapsNavigateUrl(
  target: MapsTarget,
  prefer: 'auto' | 'google' | 'apple' = 'auto',
): string | null {
  if (target.googleMapsUrl) return target.googleMapsUrl;
  const useApple =
    prefer === 'apple' || (prefer === 'auto' && isAppleMapsPreferred());
  return useApple ? appleMapsNavigateUrl(target) : googleMapsNavigateUrl(target);
}
