'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiArrowRight, FiArrowDown } from 'react-icons/fi';
import { GlobeStage, type GlobeMarker, type MarkerHover } from '@/components/three/Stages';
import { LinkButton } from '@/components/ui/Button';
import ServiceStatus from '@/components/ui/ServiceStatus';
import { loadAnalysisResult, type AnalysisResult } from '@/lib/analysis';

// Real, well-known deep-sea research regions. Shown only as *illustrative*
// exploration points when the visitor has no analysis of their own loaded.
const ILLUSTRATIVE_SITES: GlobeMarker[] = [
  { id: 'challenger', lat: 11.35, lng: 142.2, label: 'Challenger Deep', detail: 'Mariana Trench · ~10,900 m' },
  { id: 'monterey', lat: 36.8, lng: -121.9, label: 'Monterey Canyon', detail: 'Submarine canyon · ~3,600 m' },
  { id: 'mar', lat: 37.3, lng: -32.3, label: 'Mid-Atlantic Ridge', detail: 'Hydrothermal vent fields' },
  { id: 'kerguelen', lat: -49.3, lng: 69.5, label: 'Kerguelen Plateau', detail: 'Southern Ocean' },
  { id: 'gbr', lat: -18.3, lng: 147.7, label: 'Great Barrier Reef', detail: 'Coral Sea shelf' },
  { id: 'bengal', lat: 15.0, lng: 88.0, label: 'Bay of Bengal', detail: 'Indian Ocean' },
];

const HEADLINE = ['Decode', 'Life', 'Beneath', 'the', 'Surface.'];

export default function Hero() {
  const [latest, setLatest] = useState<AnalysisResult | null>(null);
  const [hover, setHover] = useState<MarkerHover>(null);
  const [selected, setSelected] = useState<GlobeMarker | null>(null);

  useEffect(() => setLatest(loadAnalysisResult()), []);

  // Prefer genuine coordinates from the visitor's latest analysis.
  const { markers, live } = useMemo(() => {
    if (latest?.geo_profiles?.length) {
      const m: GlobeMarker[] = latest.geo_profiles.flatMap((g) =>
        (g.coordinates ?? []).slice(0, 2).map(([lat, lng], i) => ({
          id: `${g.scientific_name}-${i}`,
          lat,
          lng,
          label: g.scientific_name,
          detail: `${g.classification} · ${g.coordinate_source === 'simulated' ? 'simulated position' : g.coordinate_source === 'gbif_occurrence_data' ? 'GBIF record' : g.coordinate_source === 'header_metadata' ? 'sample header' : g.location}`,
        }))
      );
      if (m.length) return { markers: m, live: true };
    }
    return { markers: ILLUSTRATIVE_SITES, live: false };
  }, [latest]);

  const focus = selected ?? markers[0];
  const summary = latest?.biodiversity_summary;

  const telemetry = [
    { k: 'SAMPLE STATUS', v: latest ? latest.file_info.filename : 'No sample loaded', pos: 'left-[2%] top-[14%]', d: 1.5 },
    { k: 'SEQUENCE ACTIVITY', v: summary ? `${summary.total_reads_processed.toLocaleString()} reads analysed` : 'Awaiting upload', pos: 'right-[2%] top-[22%]', d: 1.65 },
    { k: 'BIODIVERSITY SIGNAL', v: summary ? `${summary.unique_species_identified} taxa identified` : '—', pos: 'right-[6%] bottom-[18%]', d: 1.8 },
    { k: live ? 'ACTIVE EXPLORATION' : 'ACTIVE EXPLORATION · ILLUSTRATIVE', v: `${focus?.label ?? '—'}${focus?.detail ? ` · ${focus.detail}` : ''}`, pos: 'left-[4%] bottom-[10%]', d: 1.95 },
  ];

  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden pt-[calc(6rem+env(safe-area-inset-top))]" aria-labelledby="hero-title">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-6 lg:grid-cols-[1fr_1.15fr]">
        {/* Copy */}
        <div className="relative z-10 max-w-xl">
          <p className="eyebrow" style={{ animation: 'rise 0.9s 0.2s var(--ease-abyss) both' }}>
            Environmental DNA Intelligence
          </p>
          <h1
            id="hero-title"
            className="word-reveal mt-6 text-[clamp(2.8rem,7vw,5.6rem)] font-semibold leading-[0.95] text-ink"
            aria-label={HEADLINE.join(' ')}
          >
            {HEADLINE.map((w, i) => (
              <span key={w} aria-hidden style={{ animationDelay: `${0.45 + i * 0.09}s` }} className={i >= 2 ? 'text-glow' : ''}>
                {i === 4 ? <span className="bg-gradient-to-r from-biolum to-teal bg-clip-text text-transparent">{w}</span> : w}
                {i < HEADLINE.length - 1 && ' '}
              </span>
            ))}
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-mute" style={{ animation: 'rise 0.9s 1s var(--ease-abyss) both' }}>
            Explore environmental DNA, investigate biodiversity, and transform molecular sequences into meaningful
            scientific insights.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4" style={{ animation: 'rise 0.9s 1.15s var(--ease-abyss) both' }}>
            <LinkButton href="/upload" magnetic>
              Start Exploring <FiArrowRight aria-hidden />
            </LinkButton>
            <LinkButton href="/#explore" variant="secondary">
              Discover DeepSeq
            </LinkButton>
            <LinkButton href="/dashboard" variant="ghost" className="text-sm">
              Open workspace
            </LinkButton>
          </div>
          <div className="mt-10" style={{ animation: 'fade 1s 1.4s both' }}>
            <ServiceStatus />
          </div>
        </div>

        {/* Globe */}
        <div className="relative -mx-6 h-[60svh] min-h-[380px] lg:mx-0 lg:h-[78svh]" style={{ animation: 'fade 1.6s 0.6s both' }}>
          <div className="absolute inset-0">
            <GlobeStage markers={markers} focusId={selected?.id ?? null} onHover={setHover} onSelect={setSelected} />
          </div>

          {/* tooltip */}
          {hover && (
            <div
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[120%] rounded-xl border border-line-strong bg-midnight/90 px-3 py-2 backdrop-blur"
              style={{ left: hover.x, top: hover.y }}
            >
              <p className="font-display text-sm text-ink">{hover.marker.label}</p>
              {hover.marker.detail && <p className="mono-meta mt-0.5">{hover.marker.detail}</p>}
              <p className="mono-meta mt-1 !text-biolum">
                {hover.marker.lat.toFixed(2)}°, {hover.marker.lng.toFixed(2)}°
              </p>
            </div>
          )}

          {/* floating telemetry (hidden on small screens to keep the globe clear) */}
          {telemetry.map((t) => (
            <div
              key={t.k}
              className={`pointer-events-none absolute hidden max-w-[220px] border-l border-line-strong pl-3 md:block lg:hidden xl:block ${t.pos}`}
              style={{ animation: `rise 0.9s ${t.d}s var(--ease-abyss) both` }}
            >
              <p className="mono-meta !text-[0.62rem] !text-biolum/80">{t.k}</p>
              <p className="mt-1 truncate font-mono text-xs text-ink/85">{t.v}</p>
            </div>
          ))}

          {/* touch devices: show the selected marker without needing hover */}
          {focus && (
            <div className="absolute left-4 top-2 rounded-xl border border-line bg-midnight/70 px-3 py-2 backdrop-blur md:hidden">
              <p className="mono-meta !text-[0.6rem] !text-biolum/80">{live ? 'SELECTED SITE' : 'SELECTED SITE · ILLUSTRATIVE'}</p>
              <p className="font-display text-sm">{focus.label}</p>
              {focus.detail && <p className="mono-meta">{focus.detail}</p>}
            </div>
          )}

          <p className="absolute bottom-2 left-1/2 w-[92%] -translate-x-1/2 text-center mono-meta !text-[0.62rem]">
            {live ? 'MARKERS: COORDINATES FROM YOUR LATEST ANALYSIS' : 'MARKERS: ILLUSTRATIVE RESEARCH REGIONS'} · DRAG TO ROTATE · TAP A MARKER
          </p>
        </div>
      </div>

      {/* Mobile site list: no hover required */}
      <div className="sr-only">
        <h2>Globe markers</h2>
        <ul>
          {markers.map((m) => (
            <li key={m.id}>{m.label}{m.detail ? ` — ${m.detail}` : ''}</li>
          ))}
        </ul>
      </div>

      <a
        href="#explore"
        className="group absolute bottom-6 left-6 hidden items-center gap-3 md:flex"
        style={{ animation: 'fade 1s 2.1s both' }}
      >
        <span className="relative block h-12 w-px overflow-hidden bg-line">
          <span className="absolute inset-0 bg-biolum" style={{ animation: 'scrollLine 2.4s ease-in-out infinite' }} />
        </span>
        <span className="mono-meta group-hover:text-ink">SCROLL TO DESCEND</span>
        <FiArrowDown aria-hidden className="text-mute group-hover:text-biolum" />
      </a>
    </section>
  );
}
