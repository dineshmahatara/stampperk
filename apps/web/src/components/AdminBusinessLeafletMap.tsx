'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { googleMapsLink } from '@/lib/geo';

export type MapMerchantPin = {
  id: string;
  businessName: string;
  category: string;
  country: string;
  city?: string | null;
  district?: string | null;
  province?: string | null;
  address?: string | null;
  status: string;
  latitude: number;
  longitude: number;
  googleMapsUrl?: string | null;
  ownerEmail?: string | null;
  color: string;
};

function FitBounds({ pins }: { pins: MapMerchantPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (!pins.length) return;
    if (pins.length === 1) {
      map.setView([pins[0].latitude, pins[0].longitude], 13);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.latitude, p.longitude] as [number, number]));
    map.fitBounds(bounds.pad(0.2));
  }, [map, pins]);
  return null;
}

function pinIcon(color: string) {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
      <path fill="${color}" stroke="#fff" stroke-width="2" d="M14 1C7.4 1 2 6.4 2 13c0 9.2 12 25 12 25s12-15.8 12-25C26 6.4 20.6 1 14 1z"/>
      <circle cx="14" cy="13" r="5" fill="#fff"/>
    </svg>`,
  );
  return L.icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -36],
  });
}

export function AdminBusinessLeafletMap({
  pins,
  selectedId,
  onSelect,
  heightClassName = 'h-[520px]',
}: {
  pins: MapMerchantPin[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  heightClassName?: string;
}) {
  const center = useMemo<[number, number]>(() => {
    if (!pins.length) return [27.7172, 85.324];
    const lat = pins.reduce((s, p) => s + p.latitude, 0) / pins.length;
    const lng = pins.reduce((s, p) => s + p.longitude, 0) / pins.length;
    return [lat, lng];
  }, [pins]);

  return (
    <div className={`overflow-hidden rounded-2xl border border-black/5 ${heightClassName}`}>
      <MapContainer center={center} zoom={6} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds pins={pins} />
        {pins.map((p) => (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={pinIcon(selectedId === p.id ? '#FF5A5F' : p.color)}
            eventHandlers={{ click: () => onSelect?.(p.id) }}
          >
            <Popup>
              <div className="min-w-[180px] text-sm">
                <div className="font-bold">{p.businessName}</div>
                <div className="text-xs text-gray-500">{p.category}</div>
                <div className="mt-1 text-xs">
                  {[p.city, p.district, p.province, p.country].filter(Boolean).join(', ')}
                </div>
                <a
                  className="mt-2 inline-block text-xs font-bold text-[#FF5A5F]"
                  href={p.googleMapsUrl || googleMapsLink(p.latitude, p.longitude)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Google Maps →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
