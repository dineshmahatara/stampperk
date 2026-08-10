'use client';

import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  getDiscoverMapStyle,
  type DiscoverMapStyleId,
} from '@/lib/discoverMapStyles';

export type DiscoverMapPin = {
  id: string;
  businessName: string;
  latitude: number;
  longitude: number;
  category?: string | null;
};

function pinIcon(active: boolean) {
  const color = active ? '#FF5A5F' : '#1B1F2A';
  const size = active ? 36 : 30;
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.35)}" viewBox="0 0 28 40">
      <path fill="${color}" stroke="#fff" stroke-width="2" d="M14 1C7.4 1 2 6.4 2 13c0 9.2 12 25 12 25s12-15.8 12-25C26 6.4 20.6 1 14 1z"/>
      <circle cx="14" cy="13" r="5" fill="#fff"/>
    </svg>`,
  );
  return L.icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: [size, Math.round(size * 1.35)],
    iconAnchor: [size / 2, Math.round(size * 1.35)],
    popupAnchor: [0, -Math.round(size * 1.2)],
  });
}

function MapBlankClick({ onBlank }: { onBlank?: () => void }) {
  useMapEvents({
    click() {
      onBlank?.();
    },
  });
  return null;
}

function FitOrFocus({
  pins,
  selectedId,
  user,
}: {
  pins: DiscoverMapPin[];
  selectedId?: string | null;
  user?: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    const selected = selectedId ? pins.find((p) => p.id === selectedId) : null;
    if (selected) {
      map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 15), {
        duration: 0.45,
      });
      return;
    }
    if (pins.length === 1) {
      map.setView([pins[0].latitude, pins[0].longitude], 14);
      return;
    }
    if (pins.length > 1) {
      const bounds = L.latLngBounds(pins.map((p) => [p.latitude, p.longitude] as [number, number]));
      if (user) bounds.extend([user.lat, user.lng]);
      map.fitBounds(bounds.pad(0.25));
      return;
    }
    if (user) map.setView([user.lat, user.lng], 13);
  }, [map, pins, selectedId, user?.lat, user?.lng]);

  return null;
}

export function DiscoverMap({
  pins,
  selectedId,
  user,
  onSelect,
  onDeselect,
  mapStyleId = 'standard',
  className = '',
}: {
  pins: DiscoverMapPin[];
  selectedId?: string | null;
  user?: { lat: number; lng: number } | null;
  onSelect?: (id: string) => void;
  onDeselect?: () => void;
  mapStyleId?: DiscoverMapStyleId;
  className?: string;
}) {
  const center = useMemo<[number, number]>(() => {
    if (user) return [user.lat, user.lng];
    if (pins[0]) return [pins[0].latitude, pins[0].longitude];
    return [27.7172, 85.324];
  }, [user, pins]);

  const style = getDiscoverMapStyle(mapStyleId);

  return (
    <div className={`h-full w-full ${className}`}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          key={`${style.id}-base`}
          attribution={style.attribution}
          url={style.url}
          maxZoom={style.maxZoom}
        />
        {style.overlayUrl ? (
          <TileLayer
            key={`${style.id}-overlay`}
            attribution={style.overlayAttribution}
            url={style.overlayUrl}
            maxZoom={style.maxZoom}
            zIndex={450}
          />
        ) : null}
        <MapBlankClick onBlank={onDeselect} />
        <FitOrFocus pins={pins} selectedId={selectedId} user={user} />
        {user && (
          <CircleMarker
            center={[user.lat, user.lng]}
            radius={8}
            pathOptions={{
              color: '#fff',
              weight: 3,
              fillColor: '#3B82F6',
              fillOpacity: 1,
            }}
          />
        )}
        {pins.map((p) => {
          const active = p.id === selectedId;
          return (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={pinIcon(active)}
              zIndexOffset={active ? 1000 : 0}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e.originalEvent);
                  onSelect?.(p.id);
                },
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
