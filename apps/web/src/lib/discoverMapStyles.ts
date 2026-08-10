export type DiscoverMapStyleId = 'standard' | 'satellite' | 'hybrid' | 'terrain' | 'dark';

export type DiscoverMapStyleOption = {
  id: DiscoverMapStyleId;
  label: string;
  description: string;
  /** Primary basemap tiles */
  url: string;
  attribution: string;
  /** Optional label/road overlay (e.g. hybrid) */
  overlayUrl?: string;
  overlayAttribution?: string;
  maxZoom?: number;
};

export const DISCOVER_MAP_STYLES: DiscoverMapStyleOption[] = [
  {
    id: 'standard',
    label: 'Standard',
    description: 'Light, easy-to-read map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 19,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    description: 'Satellite imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
  },
  {
    id: 'hybrid',
    label: 'Hybrid',
    description: 'Satellite imagery with road labels',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    overlayUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    overlayAttribution: 'Labels &copy; Esri',
    maxZoom: 19,
  },
  {
    id: 'terrain',
    label: 'Terrain',
    description: 'Land and elevation details',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Low-light road map',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
];

export function getDiscoverMapStyle(id: DiscoverMapStyleId): DiscoverMapStyleOption {
  return DISCOVER_MAP_STYLES.find((s) => s.id === id) || DISCOVER_MAP_STYLES[0];
}
