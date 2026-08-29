"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { FiLoader, FiMap, FiFilter, FiLayers, FiTarget, FiCircle } from 'react-icons/fi';
import { fetchHistory, fetchHistoryItem, isLoggedIn, logout, getCurrentUser, getUsername } from '@/lib/api';
import { CLASSIFICATION_COLOR, type Occurrence } from './types';
import AppNavbar from '@/components/nav/AppNavbar';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import LoadingState from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { Select, Range } from '@/components/ui/Input';

const MAX_DETAILED_RUNS = 25;

// Leaflet touches `document` at import time, so it must never run during
// Next.js's server-side render of this client component — dynamic + ssr:false
// keeps it out of the server bundle entirely and loads it only in-browser.
// (Which is why the type/colors above come from ./types, not from
// BiodiversityMap itself — a static import of that module would pull leaflet
// back into the server bundle and undo this.)
const OceanScene = dynamic(() => import('@/components/ocean/OceanScene'), { ssr: false });

const BiodiversityMap = dynamic(() => import('./BiodiversityMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-(--radius-card) bg-slate-900">
      <FiLoader className="animate-spin text-3xl text-brand-400" />
    </div>
  ),
});

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-(--radius-control) bg-slate-900/70 backdrop-blur-md border border-slate-700/60 px-4 py-2 shadow-(--shadow-card)">
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-white leading-tight">{value}</p>
    </div>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classificationFilter, setClassificationFilter] = useState<string>('All');
  const [minConfidence, setMinConfidence] = useState(0);
  const [activeSpecies, setActiveSpecies] = useState<string | null>(null);
  const [hovered, setHovered] = useState<Occurrence | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const loggedIn = await isLoggedIn();
      if (!loggedIn) {
        router.replace('/login');
        return;
      }

      const user = await getCurrentUser();
      setUsername(getUsername(user));

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

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

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

  const avgConfidence = useMemo(
    () => (filtered.length ? Math.round((filtered.reduce((s, o) => s + o.confidence, 0) / filtered.length) * 100) : 0),
    [filtered]
  );
  const realDataCount = useMemo(() => filtered.filter((o) => o.coordinateSource !== 'simulated').length, [filtered]);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Extra subdued here (opacity-25, no fish) -- this page's real
          content is an interactive data map, and it shouldn't compete
          with swimming creatures for attention the way a marketing or
          settings page can afford to. */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-25">
        <OceanScene variant="light" />
      </div>

      <div className="relative z-10">
      <AppNavbar username={username} onLogout={handleLogout} />

      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto animate-fade-in">
          <PageHeader
            title="Map Explorer"
            icon={<FiMap />}
            subtitle="Every occurrence point from your saved analyses, on a real interactive map. Filter by classification or confidence, or select a species to fly to it."
          />

          {loading && <LoadingState label="Loading occurrences..." />}
          {error && <p className="text-danger-400 mb-4">{error}</p>}

          {!loading && !error && occurrences.length === 0 && (
            <Card padding="lg">
              <EmptyState
                icon={<FiMap />}
                title="No geolocated species yet."
                action={
                  <Link href="/upload" className="text-brand-400 hover:underline">
                    Upload a file to populate the map.
                  </Link>
                }
              />
            </Card>
          )}

          {!loading && !error && occurrences.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Filters + species list */}
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <div className="flex items-center text-sm font-semibold mb-4 text-slate-200">
                    <FiFilter className="mr-2 text-brand-300" /> Filters
                  </div>

                  <Select
                    label="Classification"
                    value={classificationFilter}
                    onChange={(e) => setClassificationFilter(e.target.value)}
                    containerClassName="mb-4"
                  >
                    {classifications.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>

                  <Range
                    label="Min. confidence"
                    valueLabel={`${Math.round(minConfidence * 100)}%`}
                    min={0}
                    max={1}
                    step={0.05}
                    value={minConfidence}
                    onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                  />
                </Card>

                <Card className="max-h-96 overflow-y-auto">
                  <p className="text-sm font-semibold mb-3 flex items-center text-slate-200">
                    <FiLayers className="mr-2 text-brand-300" /> Species ({speciesList.length})
                  </p>
                  <div className="space-y-1">
                    <button
                      onClick={() => setActiveSpecies(null)}
                      className={`w-full flex items-center text-left text-sm px-3 py-2 rounded-(--radius-control) transition-colors ${
                        !activeSpecies ? 'bg-brand-500 text-white' : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <FiTarget className="mr-2 shrink-0 opacity-70" size={13} /> All species
                    </button>
                    {speciesList.map((sp) => {
                      const cls = occurrences.find((o) => o.species === sp)?.classification || 'Unknown';
                      const color = CLASSIFICATION_COLOR[cls] || CLASSIFICATION_COLOR.Unknown;
                      return (
                        <button
                          key={sp}
                          onClick={() => setActiveSpecies(sp)}
                          className={`w-full flex items-center text-left text-sm px-3 py-2 rounded-(--radius-control) italic truncate transition-colors ${
                            activeSpecies === sp ? 'bg-brand-500 text-white' : 'hover:bg-slate-800 text-slate-300'
                          }`}
                          title={sp}
                        >
                          <FiCircle className="mr-2 shrink-0" size={9} style={{ color, fill: color }} />
                          <span className="truncate">{sp}</span>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                <Card>
                  <p className="text-xs font-semibold mb-3 text-slate-300">Legend</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {Object.entries(CLASSIFICATION_COLOR).map(([label, color]) => (
                      <span key={label} className="flex items-center text-xs text-slate-400">
                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: color }} />
                        {label}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                    Dashed / faded markers use simulated coordinates — no real occurrence data was
                    available for that species.
                  </p>
                </Card>
              </div>

              {/* Real interactive map -- unchanged: same props, same component */}
              <div className="lg:col-span-3 relative rounded-(--radius-card) overflow-hidden border border-slate-800 shadow-(--shadow-elevated)" style={{ height: '640px' }}>
                <BiodiversityMap points={filtered} onHover={setHovered} />

                {/* Floating stats overlay */}
                <div className="pointer-events-none absolute top-4 left-4 z-[1000] flex flex-wrap gap-2">
                  <div className="pointer-events-auto"><StatPill label="Points shown" value={filtered.length} /></div>
                  <div className="pointer-events-auto"><StatPill label="Species" value={activeSpecies ? 1 : speciesList.length} /></div>
                  <div className="pointer-events-auto"><StatPill label="Avg. confidence" value={`${avgConfidence}%`} /></div>
                  <div className="pointer-events-auto"><StatPill label="Real occurrence data" value={`${realDataCount}/${filtered.length}`} /></div>
                </div>

                {/* Hover detail card */}
                {hovered && (
                  <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-[1000]">
                    <div className="pointer-events-auto animate-fade-in inline-block max-w-sm rounded-(--radius-control) bg-slate-900/85 backdrop-blur-md border border-slate-700 px-4 py-3 shadow-(--shadow-elevated)">
                      <p className="italic font-semibold text-sm">{hovered.species}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {hovered.classification} &middot; {Math.round(hovered.confidence * 100)}% confidence &middot;{' '}
                        {hovered.lat.toFixed(2)}, {hovered.lng.toFixed(2)} &middot; source: {hovered.coordinateSource}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
