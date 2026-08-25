"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiLoader, FiMap, FiFilter } from 'react-icons/fi';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from 'react-simple-maps';
import { fetchHistory, fetchHistoryItem, isLoggedIn } from '@/lib/api';

const MAX_DETAILED_RUNS = 25;

type Occurrence = {
  species: string;
  classification: string;
  confidence: number;
  coordinateSource: string;
  lat: number;
  lng: number;
};

// Real-world land boundaries (110m resolution) for the basemap. Loaded
// client-side by react-simple-maps and cached by the browser.
const WORLD_TOPOJSON = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const classificationColor: Record<string, string> = {
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

export default function ExplorePage() {
  const router = useRouter();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classificationFilter, setClassificationFilter] = useState<string>('All');
  const [minConfidence, setMinConfidence] = useState(0);
  const [activeSpecies, setActiveSpecies] = useState<string | null>(null);
  const [hovered, setHovered] = useState<Occurrence | null>(null);

  useEffect(() => {
    (async () => {
      const loggedIn = await isLoggedIn();
      if (!loggedIn) {
        router.replace('/login');
        return;
      }

      try {
        const history = await fetchHistory();
        const subset = history.slice(0, MAX_DETAILED_RUNS);
        const details = await Promise.all(subset.map((it) => fetchHistoryItem(it.id).catch(() => null)));

        const all: Occurrence[] = [];
        for (const detail of details) {
          const profiles = detail?.geo_profiles ?? [];
          for (const profile of profiles) {
            const coords = Array.isArray(profile.coordinates) ? profile.coordinates : [];
            for (const [lat, lng] of coords) {
              if (typeof lat === 'number' && typeof lng === 'number') {
                all.push({
                  species: profile.scientific_name,
                  classification: profile.classification || 'Unknown',
                  confidence: typeof profile.confidence === 'number' ? profile.confidence : 0,
                  coordinateSource: profile.coordinate_source || 'simulated',
                  lat,
                  lng,
                });
              }
            }
          }
        }
        setOccurrences(all);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const classifications = useMemo(
    () => ['All', ...Array.from(new Set(occurrences.map((o) => o.classification)))],
    [occurrences]
  );

  const speciesList = useMemo(
    () => Array.from(new Set(occurrences.map((o) => o.species))).sort(),
    [occurrences]
  );

  const filtered = useMemo(
    () =>
      occurrences.filter(
        (o) =>
          (classificationFilter === 'All' || o.classification === classificationFilter) &&
          o.confidence >= minConfidence &&
          (!activeSpecies || o.species === activeSpecies)
      ),
    [occurrences, classificationFilter, minConfidence, activeSpecies]
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-blue-300 hover:text-blue-200 mb-6">
          <FiArrowLeft className="mr-2" /> Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <FiMap className="mr-3 text-blue-300" /> Map Explorer
        </h1>
        <p className="text-gray-400 mb-8">
          Every occurrence point from your saved analyses, plotted together. Filter by classification
          or confidence, or select a species to isolate it.
        </p>

        {loading && (
          <div className="flex items-center text-gray-400">
            <FiLoader className="animate-spin mr-2" /> Loading occurrences...
          </div>
        )}
        {error && <p className="text-red-400 mb-4">{error}</p>}

        {!loading && !error && occurrences.length === 0 && (
          <p className="text-gray-400">
            No geolocated species yet. <Link href="/upload" className="text-blue-400 hover:underline">Upload a file</Link> to
            populate the map.
          </p>
        )}

        {!loading && !error && occurrences.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters + species list */}
            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-lg bg-gray-800 p-4">
                <div className="flex items-center text-sm font-semibold mb-3">
                  <FiFilter className="mr-2 text-blue-300" /> Filters
                </div>

                <label className="block text-xs text-gray-400 mb-1">Classification</label>
                <select
                  value={classificationFilter}
                  onChange={(e) => setClassificationFilter(e.target.value)}
                  className="w-full rounded bg-gray-700 text-sm px-2 py-1.5 mb-4"
                >
                  {classifications.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <label className="block text-xs text-gray-400 mb-1">
                  Min. confidence: {Math.round(minConfidence * 100)}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="rounded-lg bg-gray-800 p-4 max-h-80 overflow-y-auto">
                <p className="text-sm font-semibold mb-3">Species ({speciesList.length})</p>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveSpecies(null)}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded ${!activeSpecies ? 'bg-blue-600' : 'hover:bg-gray-700 text-gray-300'}`}
                  >
                    All species
                  </button>
                  {speciesList.map((sp) => (
                    <button
                      key={sp}
                      onClick={() => setActiveSpecies(sp)}
                      className={`w-full text-left text-sm px-2 py-1.5 rounded italic truncate ${activeSpecies === sp ? 'bg-blue-600' : 'hover:bg-gray-700 text-gray-300'}`}
                      title={sp}
                    >
                      {sp}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="lg:col-span-3 rounded-lg bg-gray-800 p-4">
              <div className="w-full rounded bg-gradient-to-b from-blue-950 to-gray-900 overflow-hidden">
                <ComposableMap
                  projection="geoEquirectangular"
                  projectionConfig={{ scale: 130 }}
                  width={720}
                  height={380}
                  style={{ width: '100%', height: 'auto' }}
                >
                  <Geographies geography={WORLD_TOPOJSON}>
                    {({ geographies }) =>
                      geographies.map((geo) => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill="#1e293b"
                          stroke="#334155"
                          strokeWidth={0.5}
                          style={{
                            default: { outline: 'none' },
                            hover: { outline: 'none', fill: '#28374d' },
                            pressed: { outline: 'none' },
                          }}
                        />
                      ))
                    }
                  </Geographies>

                  {filtered.map((o, i) => {
                    const color = classificationColor[o.classification] || classificationColor.Unknown;
                    return (
                      <Marker key={`${o.species}-${i}`} coordinates={[o.lng, o.lat]}>
                        <circle
                          r={2.5 + o.confidence * 3}
                          fill={color}
                          fillOpacity={o.coordinateSource === 'simulated' ? 0.35 : 0.8}
                          stroke={hovered === o ? '#fff' : 'none'}
                          strokeWidth={1}
                          onMouseEnter={() => setHovered(o)}
                          onMouseLeave={() => setHovered(null)}
                        />
                      </Marker>
                    );
                  })}
                </ComposableMap>
              </div>

              <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                <div className="flex items-center gap-4">
                  {Object.entries(classificationColor).map(([label, color]) => (
                    <span key={label} className="flex items-center">
                      <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: color }} />
                      {label}
                    </span>
                  ))}
                  <span className="text-gray-500">Faded = simulated coordinates (no real occurrence data available)</span>
                </div>
                <span>{filtered.length} points</span>
              </div>

              {hovered && (
                <div className="mt-3 rounded bg-gray-700/60 p-3 text-sm">
                  <p className="italic font-semibold">{hovered.species}</p>
                  <p className="text-gray-400">
                    {hovered.classification} &middot; {Math.round(hovered.confidence * 100)}% confidence &middot;{' '}
                    {hovered.lat.toFixed(2)}, {hovered.lng.toFixed(2)} &middot; source: {hovered.coordinateSource}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}