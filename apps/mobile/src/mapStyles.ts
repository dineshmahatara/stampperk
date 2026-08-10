import type { MapType } from 'react-native-maps';

export type DiscoverMapStyleId = 'standard' | 'satellite' | 'hybrid' | 'terrain' | 'dark';

export type DiscoverMapStyleOption = {
  id: DiscoverMapStyleId;
  label: string;
  description: string;
  mapType: MapType;
};

/** Compact dark theme for Google Maps / Apple Maps customMapStyle. */
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d1d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8f8f8f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d1d' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#242424' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f2f2f' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1620' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
];

export const DISCOVER_MAP_STYLES: DiscoverMapStyleOption[] = [
  {
    id: 'standard',
    label: 'Standard',
    description: 'Light, easy-to-read map',
    mapType: 'standard',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    description: 'Satellite imagery',
    mapType: 'satellite',
  },
  {
    id: 'hybrid',
    label: 'Hybrid',
    description: 'Satellite imagery with road labels',
    mapType: 'hybrid',
  },
  {
    id: 'terrain',
    label: 'Terrain',
    description: 'Land and elevation details',
    mapType: 'terrain',
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Low-light road map',
    mapType: 'standard',
  },
];
