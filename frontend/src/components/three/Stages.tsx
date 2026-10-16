'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { hasWebGL } from '@/lib/webgl';
import type { GlobeMarker, MarkerHover } from './OceanGlobeScene';
import type { HelixHover } from './DnaHelixScene';
import { NUCLEOTIDE_COLORS } from '@/components/viz/nucleotides';

// Three.js scenes are browser-only and heavy: load them lazily, client-side.
const OceanGlobeScene = dynamic(() => import('./OceanGlobeScene'), {
  ssr: false,
  loading: () => <StageSkeleton />,
});
const DnaHelixScene = dynamic(() => import('./DnaHelixScene'), {
  ssr: false,
  loading: () => <StageSkeleton />,
});

function StageSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-[60%] aspect-square rounded-full border border-line-strong/40 bg-[radial-gradient(circle_at_35%_35%,rgba(65,232,255,0.12),transparent_60%)]" style={{ animation: 'fade 1.5s ease both' }} />
    </div>
  );
}

/** Mount-time WebGL detection (avoids hydration mismatches). */
function useWebGLSupport() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => setOk(hasWebGL()), []);
  return ok;
}

/** True once the element comes within `margin` of the viewport — defers creating WebGL contexts for off-screen scenes. */
function useNearViewport(margin = '300px') {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin, near]);
  return { ref, near };
}

function GlobeFallback({ markers }: { markers: GlobeMarker[] }) {
  return (
    <div className="flex h-full w-full items-center justify-center" role="img" aria-label="Static globe illustration (WebGL unavailable)">
      <svg viewBox="-110 -110 220 220" className="h-[78%] max-h-full">
        <defs>
          <radialGradient id="gf" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#0a3a55" />
            <stop offset="100%" stopColor="#030810" />
          </radialGradient>
        </defs>
        <circle r="100" fill="url(#gf)" stroke="#41E8FF" strokeOpacity="0.4" />
        {[-60, -30, 0, 30, 60].map((l) => (
          <ellipse key={l} rx={100 * Math.cos((l * Math.PI) / 180)} ry={8} cy={-100 * Math.sin((l * Math.PI) / 180)} fill="none" stroke="#41E8FF" strokeOpacity="0.12" />
        ))}
        {[0, 30, 60].map((r) => (
          <ellipse key={r} rx={100 * Math.cos((r * Math.PI) / 180)} ry={100} fill="none" stroke="#41E8FF" strokeOpacity="0.12" />
        ))}
        {markers.slice(0, 12).map((m) => {
          // simple orthographic projection centred on lng 0
          const lat = (m.lat * Math.PI) / 180, lng = (m.lng * Math.PI) / 180;
          if (Math.cos(lng) < 0) return null;
          return <circle key={m.id} cx={100 * Math.cos(lat) * Math.sin(lng)} cy={-100 * Math.sin(lat)} r="3" fill="#B6FF73" />;
        })}
      </svg>
    </div>
  );
}

export function GlobeStage(props: {
  markers: GlobeMarker[];
  focusId?: string | null;
  onHover?: (h: MarkerHover) => void;
  onSelect?: (m: GlobeMarker) => void;
  organisms?: boolean;
}) {
  const ok = useWebGLSupport();
  const { ref, near } = useNearViewport();
  return (
    <div ref={ref} className="h-full w-full">
      {ok === null || !near ? <StageSkeleton /> : ok ? <OceanGlobeScene {...props} /> : <GlobeFallback markers={props.markers} />}
    </div>
  );
}

function HelixFallback({ sequence }: { sequence: string }) {
  const s = sequence.slice(0, 40).toUpperCase();
  return (
    <div className="flex h-full w-full items-center justify-center" role="img" aria-label="Static DNA helix illustration (WebGL unavailable)">
      <svg viewBox="0 0 400 120" className="w-[90%]">
        {[...s].map((b, i) => {
          const x = 10 + i * 9.5;
          const y1 = 60 + Math.sin(i * 0.6) * 40, y2 = 60 - Math.sin(i * 0.6) * 40;
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={y1} y2={y2} stroke={NUCLEOTIDE_COLORS[b] ?? '#5b7184'} strokeOpacity="0.6" />
              <circle cx={x} cy={y1} r="3" fill="#41E8FF" />
              <circle cx={x} cy={y2} r="3" fill="#00D5C0" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function HelixStage(props: {
  sequence: string;
  highlight?: [number, number] | null;
  maxBases?: number;
  offset?: number;
  onHover?: (h: HelixHover) => void;
  controls?: boolean;
}) {
  const ok = useWebGLSupport();
  const { ref, near } = useNearViewport();
  return (
    <div ref={ref} className="h-full w-full">
      {ok === null || !near ? <StageSkeleton /> : ok ? <DnaHelixScene {...props} /> : <HelixFallback sequence={props.sequence} />}
    </div>
  );
}

export type { GlobeMarker, MarkerHover, HelixHover };
