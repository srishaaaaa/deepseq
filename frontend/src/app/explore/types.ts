// Shared, leaflet-free types + constants for the Map Explorer.
//
// These deliberately live outside BiodiversityMap.tsx: that file imports
// `leaflet`, which touches `document` at import time and therefore cannot be
// evaluated during Next.js's server render. The page needs the colours and the
// Occurrence type at module scope, so importing them from BiodiversityMap
// would drag leaflet into the server bundle and undo the `dynamic(ssr: false)`
// guard on the map itself.

export type Occurrence = {
  species: string;
  classification: string;
  confidence: number;
  coordinateSource: string;
  lat: number;
  lng: number;
};

export const CLASSIFICATION_COLOR: Record<string, string> = {
  Fish: '#60a5fa',
  Mammal: '#c084fc',
  Reptile: '#4ade80',
  Cephalopod: '#f472b6',
  Crustacean: '#fb923c',
  Coral: '#fb7185',
  Plankton: '#2dd4bf',
  Bird: '#fbbf24',
  Unknown: '#9ca3af',
};

/** Leaflet throws on out-of-range or non-finite coordinates, which would take
 * the whole map down. Anything that can't be plotted is dropped here instead. */
export function isPlottable(occurrence: Occurrence): boolean {
  const { lat, lng } = occurrence;
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
