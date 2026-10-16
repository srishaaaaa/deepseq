"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { FiBarChart2, FiAlertTriangle, FiMapPin, FiCrosshair, FiInfo } from "react-icons/fi";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import { Button, LinkButton } from "@/components/ui/Button";
import DnaSpinner from "@/components/ui/DnaSpinner";
import { useMotion } from "@/lib/motion";
import { hasWebGL } from "@/lib/webgl";
import { coordinateSourceInfo, loadAnalysisResult, pct, type AnalysisResult } from "@/lib/analysis";
import SourceBadge from "@/components/viz/SourceBadge";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center"><DnaSpinner size={32} label="Loading globe…" /></div>,
});

// --- Helper Function ---
const generateSpeciesConnections = (speciesData: { species: string; locations: { lat: number; lng: number }[] }) => {
  const hotspots = speciesData.locations.slice(0, 10);
  if (hotspots.length < 2) return [];

  const arcs = [];
  for (let i = 0; i < hotspots.length; i++) {
    for (let j = i + 1; j < hotspots.length; j++) {
      const start = hotspots[i];
      const end = hotspots[j];

      const distance = Math.sqrt(Math.pow(start.lat - end.lat, 2) + Math.pow(start.lng - end.lng, 2));
      const similarity = Math.max(0.1, 1 - distance / 180);

      arcs.push({
        startLat: start.lat,
        startLng: start.lng,
        endLat: end.lat,
        endLng: end.lng,
        color: `rgba(65, 232, 255, ${similarity * 0.7})`,
        stroke: similarity * 0.6,
      });
    }
  }
  return arcs;
};

// --- Type Definitions ---
interface SpeciesGeoData {
  species: string;
  classification: string;
  location: string;
  locations: { lat: number; lng: number }[];
  coordinateSource?: string;
  confidence?: number;
}

function useSize<T extends HTMLElement>() {
  // callback ref: the element mounts only after loading finishes, so a plain ref + [] effect would miss it
  const [el, setEl] = useState<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return { ref: setEl, ...size };
}

// --- Main Component ---
export default function GlobePage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [allGeoData, setAllGeoData] = useState<SpeciesGeoData[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string>('');
  const [selectedSite, setSelectedSite] = useState<number | null>(null);
  const [heatmapPoints, setHeatmapPoints] = useState<any[]>([]);
  const [arcs, setArcs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webgl, setWebgl] = useState(true);
  const [globeReady, setGlobeReady] = useState(false);
  const router = useRouter();
  const globeRef = useRef<any>(null);
  const { reduced } = useMotion();
  const stage = useSize<HTMLDivElement>();

  useEffect(() => {
    setWebgl(hasWebGL());
    try {
      const resultString = localStorage.getItem('analysisResult');
      if (!resultString) throw new Error("No analysis data found. Please upload a file first.");

      const parsed = loadAnalysisResult();
      if (!parsed) throw new Error("The analysis data is incomplete or has an invalid format.");
      setResult(parsed);

      if (parsed.geo_profiles && parsed.geo_profiles.length > 0) {
        const geoData: SpeciesGeoData[] = parsed.geo_profiles.map((profile) => {
          const locations = Array.isArray(profile.coordinates)
            ? profile.coordinates.map((coords: [number, number]) => ({ lat: coords[0], lng: coords[1] }))
            : [];
          return {
            species: profile.scientific_name,
            classification: profile.classification,
            location: profile.location,
            locations,
            coordinateSource: profile.coordinate_source,
            confidence: profile.confidence,
          };
        }).filter((s) => s.locations.length > 0);

        if (geoData.length === 0) {
          throw new Error("Analysis complete, but no valid coordinates were found for the identified species.");
        }

        setAllGeoData(geoData);
        setSelectedSpecies(geoData[0].species);
      } else {
        throw new Error("Analysis complete, but no geographic data could be found for the identified species.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const speciesData = useMemo(() => allGeoData.find((s) => s.species === selectedSpecies), [allGeoData, selectedSpecies]);

  useEffect(() => {
    if (!speciesData) {
      setHeatmapPoints([]);
      setArcs([]);
      return;
    }
    setHeatmapPoints(speciesData.locations.map((loc) => [loc.lat, loc.lng, 0.1]));
    setArcs(generateSpeciesConnections(speciesData));
    setSelectedSite(null);

    // camera transition to the centroid of the selected taxon's sites
    const c = speciesData.locations.reduce((a, l) => ({ lat: a.lat + l.lat / speciesData.locations.length, lng: a.lng + l.lng / speciesData.locations.length }), { lat: 0, lng: 0 });
    globeRef.current?.pointOfView({ lat: c.lat, lng: c.lng, altitude: 1.9 }, reduced ? 0 : 1600);
  }, [speciesData, reduced, globeReady]);

  // idle auto-rotation (disabled for reduced motion or while a site is focused)
  useEffect(() => {
    const controls = globeRef.current?.controls?.();
    if (!controls) return;
    controls.autoRotate = !reduced && selectedSite === null;
    controls.autoRotateSpeed = 0.35;
    controls.enableZoom = true;
  });

  const focusSite = (i: number) => {
    if (!speciesData) return;
    setSelectedSite(i);
    const l = speciesData.locations[i];
    globeRef.current?.pointOfView({ lat: l.lat, lng: l.lng, altitude: 0.9 }, reduced ? 0 : 1400);
  };

  const abundance = result?.biodiversity_summary.abundance_distribution.find((a) => a.species === selectedSpecies);
  const points = useMemo(
    () => (speciesData?.locations ?? []).map((l, i) => ({ ...l, i, active: i === selectedSite })),
    [speciesData, selectedSite]
  );

  // --- Render Logic ---
  if (isLoading) {
    return (
      <WorkspaceShell title="Geographic Exploration">
        <div className="flex h-[60vh] items-center justify-center"><DnaSpinner size={32} label="Loading Analysis Data..." /></div>
      </WorkspaceShell>
    );
  }

  if (error) {
    return (
      <WorkspaceShell title="Geographic Exploration">
        <div className="mx-auto mt-16 max-w-md text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-danger/40 bg-danger/10">
            <FiAlertTriangle size={24} className="text-danger" aria-hidden />
          </span>
          <h2 className="mt-5 text-2xl font-medium">Nothing to map yet</h2>
          <p className="mt-2 text-mute">{error}</p>
          <div className="mt-8 flex justify-center gap-3">
            <LinkButton href="/upload">Go to Upload Page</LinkButton>
            <LinkButton href="/history" variant="secondary">Open history</LinkButton>
          </div>
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell title="Geographic Exploration" subtitle={result?.file_info.filename} bleed>
      <div className="grid min-h-[calc(100svh-65px)] lg:grid-cols-[1fr_380px]">
        {/* Globe */}
        <div ref={stage.ref} className="relative h-[58svh] min-h-[360px] lg:h-auto">
          {webgl ? (
            stage.w > 0 && (
              <Globe
                ref={globeRef}
                onGlobeReady={() => setGlobeReady(true)}
                width={stage.w}
                height={stage.h}
                globeImageUrl="/textures/earth-night.jpg"
                bumpImageUrl="/textures/earth-topology.png"
                backgroundColor="rgba(0,0,0,0)"
                atmosphereColor="#41E8FF"
                atmosphereAltitude={0.2}

                heatmapsData={[{
                  data: heatmapPoints,
                  radius: 1.5,
                  colorSaturation: 1.0
                }]}
                heatmapPoints="data"
                heatmapPointLat={(p: any) => p[0]}
                heatmapPointLng={(p: any) => p[1]}
                heatmapPointWeight={(p: any) => p[2]}

                arcsData={arcs}
                arcColor="color"
                arcStroke="stroke"
                arcDashLength={0.4}
                arcDashGap={0.2}
                arcDashAnimateTime={reduced ? 0 : 3000}

                pointsData={points}
                pointLat="lat"
                pointLng="lng"
                pointAltitude={(p: any) => (p.active ? 0.08 : 0.02)}
                pointRadius={(p: any) => (p.active ? 0.6 : 0.35)}
                pointColor={(p: any) => (p.active ? '#B6FF73' : '#41E8FF')}
                pointLabel={(p: any) => `<div style="font:12px ui-monospace,monospace;background:#061525ee;border:1px solid #41e8ff55;padding:6px 8px;border-radius:10px;color:#eaf7ff"><i>${selectedSpecies}</i><br/>Site ${p.i + 1} · ${p.lat.toFixed(2)}°, ${p.lng.toFixed(2)}°</div>`}
                onPointClick={(p: any) => focusSite(p.i)}

                ringsData={selectedSite !== null && speciesData ? [speciesData.locations[selectedSite]] : []}
                ringLat="lat"
                ringLng="lng"
                ringColor={() => (t: number) => `rgba(182,255,115,${1 - t})`}
                ringMaxRadius={4}
                ringPropagationSpeed={reduced ? 0 : 2}
                ringRepeatPeriod={900}
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div>
                <FiInfo className="mx-auto text-2xl text-warn" aria-hidden />
                <p className="mt-3 text-mute">3D globe unavailable — WebGL is not supported in this browser. All site data is listed in the panel.</p>
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute left-4 top-4 max-w-xs">
            <p className="eyebrow">Species distribution</p>
            <p className="mt-1 font-display text-xl italic">{selectedSpecies}</p>
          </div>
          {webgl && <p className="pointer-events-none absolute bottom-3 left-4 mono-meta !text-[0.6rem]">DRAG TO ROTATE · SCROLL / PINCH TO ZOOM · CLICK A SITE</p>}
        </div>

        {/* Linked data panel */}
        <aside className="border-t border-line bg-midnight/60 backdrop-blur-xl lg:border-l lg:border-t-0" aria-label="Species and site details">
          <div className="space-y-6 p-5 lg:max-h-[calc(100svh-65px)] lg:overflow-y-auto scrollbar-thin">
            <div>
              <p id="species-label" className="mono-meta">Displaying hotspots for</p>
              <ul className="mt-3 space-y-1.5" role="listbox" aria-labelledby="species-label">
                {allGeoData.map((s) => {
                  const a = result?.biodiversity_summary.abundance_distribution.find((x) => x.species === s.species);
                  const active = s.species === selectedSpecies;
                  return (
                    <li key={s.species}>
                      <button
                        role="option"
                        aria-selected={active}
                        onClick={() => setSelectedSpecies(s.species)}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${active ? 'border-biolum/60 bg-biolum/10' : 'border-line hover:border-line-strong'}`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm italic">{s.species}</span>
                          {a && <span className="font-mono text-xs text-mute">{pct(a.relative_abundance)}</span>}
                        </span>
                        <span className="mono-meta !text-[0.62rem]">{s.classification} · {s.location}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {speciesData && (
              <div key={speciesData.species} style={{ animation: 'rise 0.5s var(--ease-abyss) both' }}>
                <h2 className="text-lg font-medium italic">{speciesData.species}</h2>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <Info k="Classification" v={speciesData.classification} />
                  <Info k="Primary location" v={speciesData.location} />
                  <Info k="Read count" v={abundance ? abundance.count.toLocaleString() : '—'} />
                  <Info k="Relative abundance" v={abundance ? pct(abundance.relative_abundance, 2) : '—'} />
                  {speciesData.confidence != null && <Info k="Match confidence" v={speciesData.confidence.toFixed(2)} />}
                </dl>
                <div className="mt-3 rounded-xl border border-line px-3 py-2.5">
                  <SourceBadge src={speciesData.coordinateSource} />
                  <p className="mt-1.5 text-xs leading-relaxed text-mute">{coordinateSourceInfo(speciesData.coordinateSource).detail}</p>
                </div>
                <h3 className="mono-meta mt-6">{coordinateSourceInfo(speciesData.coordinateSource).tone === 'simulated' ? 'Placeholder points' : 'Sites'} ({speciesData.locations.length})</h3>
                <ul className="mt-2 space-y-1">
                  {speciesData.locations.map((l, i) => (
                    <li key={i}>
                      <button
                        onClick={() => focusSite(i)}
                        aria-pressed={selectedSite === i}
                        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left font-mono text-xs transition-colors ${selectedSite === i ? 'bg-discovery/10 text-discovery' : 'text-ink/80 hover:bg-white/[0.04]'}`}
                      >
                        {selectedSite === i ? <FiCrosshair aria-hidden /> : <FiMapPin aria-hidden className="text-mute" />}
                        Site {i + 1}
                        <span className="ml-auto tabular-nums">{l.lat.toFixed(2)}°, {l.lng.toFixed(2)}°</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={() => router.push('/report')} className="w-full">
              <FiBarChart2 aria-hidden /> View Analysis Insights
            </Button>
            <p className="text-xs leading-relaxed text-mute">
              Coordinates are plotted exactly as returned by the analysis service, with their reported source. Arcs connect sites of the same taxon
              (opacity reflects geographic proximity, not genetic similarity).
            </p>
          </div>
        </aside>
      </div>
    </WorkspaceShell>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-line px-3 py-2">
      <dt className="mono-meta !text-[0.6rem]">{k}</dt>
      <dd className="mt-0.5 truncate">{v}</dd>
    </div>
  );
}
