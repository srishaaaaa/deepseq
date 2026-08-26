"use client";

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, ScaleControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CLASSIFICATION_COLOR, isPlottable, type Occurrence } from './types';

// CARTO's free basemaps.cartocdn.com raster tiles (the previous URL here)
// were deprecated -- they now return a 200 OK PNG that just says "API KEY
// REQUIRED" instead of an actual map, which silently broke this map for
// every user. Esri's dark gray canvas is free, keyless, and note the tile
// order is {z}/{y}/{x} (y before x), unlike CARTO/OSM's {z}/{x}/{y}.
const DARK_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const DARK_TILE_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';


/** Flies the map to fit whichever points are currently shown, whenever that set changes. */
function FitToPoints({ points }: { points: Occurrence[] }) {
  const map = useMap();
  const boundsKey = useMemo(
    () => points.map((p) => `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`).join('|'),
    [points]
  );

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.flyTo([points[0].lat, points[0].lng], 5, { duration: 0.8 });
      return;
    }

    // Build the bounds through Leaflet rather than passing a raw array: a set
    // of points that all share one coordinate produces a zero-area bounds,
    // which flyToBounds turns into an Infinity zoom and a blank map. pad()
    // guarantees a real extent in that case.
    const bounds = L.latLngBounds(points.map((p) => L.latLng(p.lat, p.lng)));
    if (!bounds.isValid()) return;

    const target =
      bounds.getNorth() === bounds.getSouth() && bounds.getEast() === bounds.getWest()
        ? bounds.pad(0.5)
        : bounds;

    map.flyToBounds(target, { padding: [48, 48], duration: 0.8, maxZoom: 6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsKey]);

  return null;
}

/** Leaflet measures the container on mount. Inside a `dynamic(ssr: false)`
 * import the container is often still 0px tall at that moment (or the parent
 * is resized afterwards), which leaves the map showing a single grey tile
 * until the user drags it. Re-measuring on mount and on resize fixes it. */
function ResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    // After the browser has painted the real container size.
    const raf = requestAnimationFrame(invalidate);

    const container = map.getContainer();
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(invalidate) : null;
    observer?.observe(container);
    window.addEventListener('resize', invalidate);

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener('resize', invalidate);
    };
  }, [map]);

  return null;
}

export default function BiodiversityMap({
  points,
  onHover,
}: {
  points: Occurrence[];
  onHover?: (occ: Occurrence | null) => void;
}) {
  // A single NaN or out-of-range coordinate makes Leaflet throw and blanks the
  // whole map, so unplottable occurrences are dropped before they reach it.
  const plottable = useMemo(() => points.filter(isPlottable), [points]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl">
      <MapContainer
        center={[15, 10]}
        zoom={2}
        minZoom={2}
        maxBounds={[[-90, -220], [90, 220]]}
        maxBoundsViscosity={0.6}
        worldCopyJump
        scrollWheelZoom
        className="h-full w-full"
        style={{ background: '#0a1120' }}
      >
        <TileLayer url={DARK_TILE_URL} attribution={DARK_TILE_ATTRIBUTION} />
        <ScaleControl position="bottomleft" />
        <ResizeHandler />
        <FitToPoints points={plottable} />

        {plottable.map((o, i) => {
          const color = CLASSIFICATION_COLOR[o.classification] || CLASSIFICATION_COLOR.Unknown;
          const simulated = o.coordinateSource === 'simulated';
          return (
            <CircleMarker
              key={`${o.species}-${o.lat}-${o.lng}-${i}`}
              center={[o.lat, o.lng]}
              radius={5 + o.confidence * 6}
              pathOptions={{
                color: '#0a1120',
                weight: 1.5,
                fillColor: color,
                fillOpacity: simulated ? 0.35 : 0.85,
                dashArray: simulated ? '2,2' : undefined,
              }}
              eventHandlers={{
                mouseover: () => onHover?.(o),
                mouseout: () => onHover?.(null),
              }}

            >
              <Popup className="deepseq-popup">
                <div className="min-w-[180px]">
                  <p className="italic font-semibold text-sm text-white">{o.species}</p>
                  <p className="text-xs text-slate-300 mt-1">
                    {o.classification} &middot; {Math.round(o.confidence * 100)}% confidence
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {o.lat.toFixed(2)}, {o.lng.toFixed(2)}
                  </p>
                  <p className="text-[11px] mt-1 uppercase tracking-wide text-slate-500">
                    source: {o.coordinateSource}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Dark-theme overrides for Leaflet's default (light) chrome */}
      <style jsx global>{`
        .leaflet-container {
          background: #0a1120;
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          background: #111827;
          color: #fff;
          border: 1px solid #334155;
          border-radius: 0.5rem;
        }

        .leaflet-popup-tip {
          background: #111827;
          border: 1px solid #334155;
        }
        .leaflet-popup-close-button {
          color: #94a3b8 !important;
        }
        .leaflet-control-zoom a {
          background: #111827 !important;
          color: #e2e8f0 !important;
          border-color: #334155 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #1e293b !important;
        }
        .leaflet-control-scale-line {
          background: rgba(17, 24, 39, 0.75) !important;
          color: #cbd5e1 !important;
          border-color: #64748b !important;
        }
        .leaflet-control-attribution {
          background: rgba(17, 24, 39, 0.75) !important;
          color: #94a3b8 !important;
        }
        .leaflet-control-attribution a {
          color: #93c5fd !important;
        }
      `}</style>
    </div>
  );
}