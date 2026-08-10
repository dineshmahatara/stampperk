'use client';

import { useEffect, useRef, useState } from 'react';
import { googleMapsLink } from '@/lib/geo';
import type { MapMerchantPin } from './AdminBusinessLeafletMap';

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (
          el: HTMLElement,
          opts: {
            center: { lat: number; lng: number };
            zoom: number;
            mapTypeControl?: boolean;
            streetViewControl?: boolean;
            fullscreenControl?: boolean;
          },
        ) => {
          fitBounds: (b: unknown) => void;
          setCenter: (c: { lat: number; lng: number }) => void;
          setZoom: (z: number) => void;
        };
        LatLngBounds: new () => {
          extend: (c: { lat: number; lng: number }) => void;
          isEmpty: () => boolean;
        };
        Marker: new (opts: {
          position: { lat: number; lng: number };
          map: unknown;
          title?: string;
          icon?: {
            path: unknown;
            fillColor: string;
            fillOpacity: number;
            strokeWeight: number;
            strokeColor: string;
            scale: number;
          };
        }) => {
          setMap: (m: unknown) => void;
          addListener: (event: string, fn: () => void) => void;
        };
        InfoWindow: new (opts: { content: string }) => {
          open: (opts: { map: unknown; anchor: unknown }) => void;
          close: () => void;
        };
        SymbolPath: { CIRCLE: unknown };
        event: { clearInstanceListeners: (t: unknown) => void };
      };
    };
    __stampzGoogleMapsPromise?: Promise<void>;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.google?.maps) return Promise.resolve();
  if (window.__stampzGoogleMapsPromise) return window.__stampzGoogleMapsPromise;
  window.__stampzGoogleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-stampz-gmaps]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.dataset.stampzGmaps = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(script);
  });
  return window.__stampzGoogleMapsPromise;
}

export function AdminBusinessGoogleMap({
  apiKey,
  pins,
  selectedId,
  onSelect,
  heightClassName = 'h-[520px]',
  onError,
}: {
  apiKey: string;
  pins: MapMerchantPin[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  heightClassName?: string;
  onError?: (message: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<{
    fitBounds: (b: unknown) => void;
    setCenter: (c: { lat: number; lng: number }) => void;
    setZoom: (z: number) => void;
  } | null>(null);
  const markersRef = useRef<
    Array<{
      setMap: (m: unknown) => void;
      addListener: (event: string, fn: () => void) => void;
    }>
  >([]);
  const infoRef = useRef<{
    open: (opts: { map: unknown; anchor: unknown }) => void;
    close: () => void;
  } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !hostRef.current || !window.google?.maps) return;
        const g = window.google.maps;
        const center = pins[0]
          ? { lat: pins[0].latitude, lng: pins[0].longitude }
          : { lat: 27.7172, lng: 85.324 };
        if (!mapRef.current) {
          mapRef.current = new g.Map(hostRef.current, {
            center,
            zoom: 6,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
          infoRef.current = new g.InfoWindow({ content: '' });
        }
        setReady(true);
      })
      .catch((e) => onError?.(e instanceof Error ? e.message : 'Google Maps unavailable'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per key
  }, [apiKey, onError]);

  useEffect(() => {
    if (!ready) return;
    const g = window.google?.maps;
    const map = mapRef.current;
    if (!g || !map) return;

    markersRef.current.forEach((m) => {
      g.event.clearInstanceListeners(m);
      m.setMap(null);
    });
    markersRef.current = [];

    const bounds = new g.LatLngBounds();
    for (const p of pins) {
      const position = { lat: p.latitude, lng: p.longitude };
      bounds.extend(position);
      const marker = new g.Marker({
        position,
        map,
        title: p.businessName,
        icon: {
          path: g.SymbolPath.CIRCLE,
          fillColor: selectedId === p.id ? '#FF5A5F' : p.color,
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#ffffff',
          scale: selectedId === p.id ? 11 : 9,
        },
      });
      marker.addListener('click', () => {
        onSelect?.(p.id);
        const mapsUrl = p.googleMapsUrl || googleMapsLink(p.latitude, p.longitude);
        const loc = [p.city, p.district, p.province, p.country].filter(Boolean).join(', ');
        infoRef.current?.close();
        infoRef.current = new g.InfoWindow({
          content: `<div style="font:600 13px/1.35 system-ui,sans-serif;min-width:180px">
            <div style="font-weight:800">${escapeHtml(p.businessName)}</div>
            <div style="color:#8E8E93;font-size:12px;margin-top:2px">${escapeHtml(p.category)}</div>
            <div style="font-size:12px;margin-top:6px">${escapeHtml(loc)}</div>
            <a href="${mapsUrl}" target="_blank" rel="noreferrer"
              style="display:inline-block;margin-top:8px;color:#FF5A5F;font-weight:800;font-size:12px;text-decoration:none">
              Open in Google Maps →
            </a>
          </div>`,
        });
        infoRef.current.open({ map, anchor: marker });
      });
      markersRef.current.push(marker);
    }

    if (pins.length === 1) {
      map.setCenter({ lat: pins[0].latitude, lng: pins[0].longitude });
      map.setZoom(13);
    } else if (pins.length > 1 && !bounds.isEmpty()) {
      map.fitBounds(bounds);
    }
  }, [pins, selectedId, onSelect, ready]);

  return (
    <div className={`overflow-hidden rounded-2xl border border-black/5 ${heightClassName}`}>
      <div ref={hostRef} className="h-full w-full" />
    </div>
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
