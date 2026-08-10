import { Linking, Platform } from 'react-native';

export type MapsTarget = {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  label?: string | null;
  googleMapsUrl?: string | null;
};

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

export function googleMapsNavigateUrl(target: MapsTarget): string | null {
  if (target.googleMapsUrl) return target.googleMapsUrl;
  const dest = destinationQuery(target);
  if (!dest) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}

export function appleMapsNavigateUrl(target: MapsTarget): string | null {
  const dest = destinationQuery(target);
  if (!dest) return target.googleMapsUrl || null;
  const params = new URLSearchParams({ daddr: dest });
  if (target.label) params.set('q', target.label);
  return `https://maps.apple.com/?${params.toString()}`;
}

/** iOS → Apple Maps, Android/other → Google Maps. Custom merchant URL wins. */
export function mapsNavigateUrl(target: MapsTarget): string | null {
  if (target.googleMapsUrl) return target.googleMapsUrl;
  return Platform.OS === 'ios' ? appleMapsNavigateUrl(target) : googleMapsNavigateUrl(target);
}

export async function openExternalMaps(target: MapsTarget): Promise<boolean> {
  const url = mapsNavigateUrl(target);
  if (!url) return false;
  const can = await Linking.canOpenURL(url).catch(() => true);
  if (!can) return false;
  await Linking.openURL(url);
  return true;
}
