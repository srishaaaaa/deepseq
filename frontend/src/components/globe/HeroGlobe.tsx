"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Same lazy-loaded, SSR-disabled pattern as the real results globe
// (app/globe/page.tsx) -- keeps the three.js/globe.gl bundle out of the
// initial page load and off the server render entirely.
const Globe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-br from-brand-800/40 via-brand-900/20 to-transparent" />
  ),
});

/** Ambient hotspot ring used only for hero ambiance -- ocean-region
 * coordinates, not analysis output. The real, data-driven globe (species
 * hotspots from an actual analysis) lives at /globe; this is decoration,
 * never presented as a scientific result. */
const AMBIENT_REGIONS = [
  { lat: 12, lng: -68 },   // Caribbean
  { lat: -18, lng: 178 },  // Coral Sea
  { lat: 36, lng: 140 },   // NW Pacific
  { lat: -33, lng: 18 },   // Benguela current
  { lat: 8, lng: 99 },     // Andaman Sea
  { lat: -3, lng: -80 },   // Humboldt current
  { lat: 60, lng: -20 },   // North Atlantic
  { lat: -45, lng: 170 },  // Southern Ocean
];

function buildAmbientArcs(points: typeof AMBIENT_REGIONS) {
  const arcs = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 3) % points.length];
    arcs.push({
      startLat: a.lat,
      startLng: a.lng,
      endLat: b.lat,
      endLng: b.lng,
      color: ['rgba(45,212,191,0)', 'rgba(45,212,191,0.55)', 'rgba(45,212,191,0)'],
    });
  }
  return arcs;
}

// Decorative HUD ring overlay -- pure SVG/CSS, spins independently of the
// WebGL globe. Cheap way to read as "live scientific instrument" without
// adding render cost to the three.js scene.
function HudRing({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <circle
        cx="50" cy="50" r="48"
        fill="none" stroke="rgba(94,234,212,0.25)" strokeWidth="0.4"
        strokeDasharray="1 3"
        className={reducedMotion ? '' : 'origin-center animate-[hud-spin_60s_linear_infinite]'}
      />
      <circle
        cx="50" cy="50" r="44"
        fill="none" stroke="rgba(103,232,249,0.18)" strokeWidth="0.3"
        strokeDasharray="0.5 2.5"
        className={reducedMotion ? '' : 'origin-center animate-[hud-spin-reverse_90s_linear_infinite]'}
      />
      {[0, 90, 180, 270].map((deg) => (
        <line
          key={deg}
          x1="50" y1="1" x2="50" y2="4"
          stroke="rgba(103,232,249,0.4)" strokeWidth="0.5"
          transform={`rotate(${deg} 50 50)`}
        />
      ))}
    </svg>
  );
}

export default function HeroGlobe() {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(480);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pointerFine, setPointerFine] = useState(false);

  useEffect(() => {
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointerMq = window.matchMedia('(pointer: fine)');
    setReducedMotion(motionMq.matches);
    setPointerFine(pointerMq.matches);
    const onMotionChange = () => setReducedMotion(motionMq.matches);
    const onPointerChange = () => setPointerFine(pointerMq.matches);
    motionMq.addEventListener('change', onMotionChange);
    pointerMq.addEventListener('change', onPointerChange);
    return () => {
      motionMq.removeEventListener('change', onMotionChange);
      pointerMq.removeEventListener('change', onPointerChange);
    };
  }, []);

  // Track container size so the globe fills its box on any viewport
  // instead of the library's fixed default -- also how we scale detail
  // down on small screens (fewer ambient points, same visual identity).
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) setSize(Math.min(box.width, box.height));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Cursor-follow tilt: the globe "looks toward" the pointer anywhere in
  // the viewport, like it's tracking you. Pure CSS 3D transform on a
  // wrapper div (cheap, GPU-composited) -- the WebGL scene itself keeps
  // auto-rotating untouched, so nothing fights react-globe.gl's own
  // OrbitControls. Smoothed with a lerp loop instead of snapping straight
  // to the pointer, which is what makes it read as "alive" rather than
  // jittery. Skipped entirely for touch devices and reduced-motion.
  useEffect(() => {
    if (!pointerFine || reducedMotion) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const node = containerRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Normalize against the viewport so the effect stays gentle
      // regardless of how close the pointer is to the globe itself.
      const nx = (e.clientX - cx) / (window.innerWidth / 2);
      const ny = (e.clientY - cy) / (window.innerHeight / 2);
      const MAX_DEG = 10;
      target.y = Math.max(-1, Math.min(1, nx)) * MAX_DEG;
      target.x = Math.max(-1, Math.min(1, -ny)) * MAX_DEG;
    };

    const tick = () => {
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;
      const el = tiltRef.current;
      if (el) {
        el.style.transform = `rotateX(${current.x.toFixed(2)}deg) rotateY(${current.y.toFixed(2)}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(raf);
    };
  }, [pointerFine, reducedMotion]);

  const isCompact = size < 360;
  const points = useMemo(
    () => (isCompact ? AMBIENT_REGIONS.slice(0, 4) : AMBIENT_REGIONS),
    [isCompact]
  );
  const arcs = useMemo(() => buildAmbientArcs(points), [points]);

  const handleGlobeReady = () => {
    const controls = globeRef.current?.controls?.();
    if (!controls) return;
    controls.autoRotate = !reducedMotion;
    controls.autoRotateSpeed = 0.6;
    controls.enableZoom = false;
  };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto aspect-square w-full max-w-[560px] [perspective:1400px]"
      role="img"
      aria-label="Rotating 3D globe of Earth's oceans, representing DeepSeq's global eDNA biodiversity coverage"
    >
      {/* Ambient glints -- decorative twinkle around the sphere */}
      {!reducedMotion && (
        <div className="pointer-events-none absolute inset-0">
          {[
            { top: '12%', left: '8%', delay: '0s' },
            { top: '70%', left: '4%', delay: '0.6s' },
            { top: '18%', left: '88%', delay: '1.1s' },
            { top: '80%', left: '82%', delay: '1.7s' },
          ].map((g, i) => (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-cyan-200 animate-[glint_3.4s_ease-in-out_infinite]"
              style={{ top: g.top, left: g.left, animationDelay: g.delay }}
            />
          ))}
        </div>
      )}

      <div
        ref={tiltRef}
        className="relative h-full w-full [transform-style:preserve-3d] transition-transform duration-700 ease-out motion-reduce:!transform-none"
      >
        {/* Soft bioluminescent glow behind the sphere, gently breathing */}
        <div className="pointer-events-none absolute inset-[8%] rounded-full bg-cyan-500/10 blur-3xl animate-[globe-breathe_6s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute inset-[16%] rounded-full bg-violet-500/10 blur-2xl animate-[globe-breathe_7s_ease-in-out_infinite_1s]" />

        <HudRing reducedMotion={reducedMotion} />

        <Globe
          ref={globeRef}
          width={size}
          height={size}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          showAtmosphere
          atmosphereColor="#22d3ee"
          atmosphereAltitude={0.24}
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointColor={() => '#5eead4'}
          pointAltitude={0.01}
          pointRadius={isCompact ? 0.4 : 0.5}
          arcsData={arcs}
          arcColor="color"
          arcDashLength={0.4}
          arcDashGap={0.3}
          arcDashAnimateTime={isCompact ? 0 : 4000}
          arcAltitude={0.15}
          onGlobeReady={handleGlobeReady}
        />
      </div>
    </div>
  );
}
