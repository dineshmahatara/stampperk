'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { googleMapsLink } from '@/lib/geo';

export type MapLocationValue = {
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl?: string | null;
  address?: string | null;
};

export { googleMapsLink };

const DEFAULT_CENTER: [number, number] = [27.7172, 85.324]; // Kathmandu

const pinIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
  }, [lat, lng, map]);
  return null;
}

function MapClick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

type Props = {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (value: MapLocationValue) => void;
  /** When true, reverse-geocode via Nominatim into address */
  fillAddress?: boolean;
  className?: string;
  heightClassName?: string;
};

export function MapLocationPicker({
  latitude,
  longitude,
  onChange,
  fillAddress = false,
  className = '',
  heightClassName = 'h-64',
}: Props) {
  const hasPin = typeof latitude === 'number' && typeof longitude === 'number' && !Number.isNaN(latitude) && !Number.isNaN(longitude);
  const center = useMemo<[number, number]>(
    () => (hasPin ? [latitude!, longitude!] : DEFAULT_CENTER),
    [hasPin, latitude, longitude],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  const apply = useCallback(
    async (lat: number, lng: number) => {
      const roundedLat = Number(lat.toFixed(6));
      const roundedLng = Number(lng.toFixed(6));
      const next: MapLocationValue = {
        latitude: roundedLat,
        longitude: roundedLng,
        googleMapsUrl: googleMapsLink(roundedLat, roundedLng),
      };
      if (fillAddress) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${roundedLat}&lon=${roundedLng}`,
            { headers: { Accept: 'application/json' } },
          );
          if (res.ok) {
            const data = (await res.json()) as { display_name?: string };
            if (data.display_name) next.address = data.display_name;
          }
        } catch {
          /* ignore reverse geocode failures */
        }
      }
      onChange(next);
      setHint('Location updated — save your profile to keep it.');
    },
    [fillAddress, onChange],
  );

  async function useCurrentLocation() {
    setError('');
    setHint('');
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await apply(pos.coords.latitude, pos.coords.longitude);
        setBusy(false);
      },
      (err) => {
        setBusy(false);
        setError(err.message || 'Could not get current location');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function clearPin() {
    onChange({ latitude: null, longitude: null, googleMapsUrl: '' });
    setHint('Pin cleared');
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={busy}
          className="rounded-full bg-[var(--stampperk-coral)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? 'Locating…' : 'Use current location'}
        </button>
        {hasPin && (
          <button
            type="button"
            onClick={clearPin}
            className="rounded-full border border-[var(--stampperk-line)] bg-white px-4 py-2 text-sm font-bold"
          >
            Clear pin
          </button>
        )}
        {hasPin && (
          <a
            href={googleMapsLink(latitude!, longitude!)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[var(--stampperk-line)] bg-white px-4 py-2 text-sm font-bold text-[var(--stampperk-coral)]"
          >
            Open in Google Maps →
          </a>
        )}
      </div>

      <div
        className={`overflow-hidden rounded-2xl border border-[var(--stampperk-line)] ${heightClassName} z-0`}
      >
        <MapContainer
          center={center}
          zoom={hasPin ? 16 : 12}
          scrollWheelZoom
          className="h-full w-full"
          style={{ minHeight: 220 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClick onPick={apply} />
          {hasPin && (
            <>
              <Recenter lat={latitude!} lng={longitude!} />
              <Marker
                position={[latitude!, longitude!]}
                draggable
                icon={pinIcon}
                eventHandlers={{
                  dragend: (e) => {
                    const m = e.target as L.Marker;
                    const p = m.getLatLng();
                    void apply(p.lat, p.lng);
                  },
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-[#F8F8FA] px-3 py-2 text-sm">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--stampperk-muted)]">
            Latitude
          </span>
          <div className="font-semibold">{hasPin ? latitude!.toFixed(6) : '—'}</div>
        </div>
        <div className="rounded-xl bg-[#F8F8FA] px-3 py-2 text-sm">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--stampperk-muted)]">
            Longitude
          </span>
          <div className="font-semibold">{hasPin ? longitude!.toFixed(6) : '—'}</div>
        </div>
      </div>

      <p className="text-xs font-medium text-[var(--stampperk-muted)]">
        Tap the map to drop a pin, or drag the pin. Customers and nearby search use these coordinates;
        Google Maps link is filled automatically.
      </p>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {hint && <p className="text-sm font-semibold text-emerald-700">{hint}</p>}
    </div>
  );
}
