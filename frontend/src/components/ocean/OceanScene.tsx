"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Shark from './creatures/Shark';
import FishSchoolModel from './creatures/FishSchoolModel';
import SeaFloor from './creatures/SeaFloor';
import SnapperFish from './creatures/SnapperFish';
import RealisticJellyfish from './creatures/RealisticJellyfish';

/** Shared cursor state, updated from a single window-level listener rather
 * than R3F's built-in pointer (which only fires when the canvas itself is
 * hit -- this canvas sits behind real page content with pointer-events
 * disabled, so it never blocks clicks/scroll on the actual UI). Every
 * creature reads the same ref; nothing here triggers a React re-render. */
type PointerState = { x: number; y: number; active: boolean };

function usePointerTarget(enabled: boolean) {
  const pointer = useRef<PointerState>({ x: 0, y: 0, active: false });
  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      pointer.current.active = true;
    };
    const onLeave = () => { pointer.current.active = false; };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, [enabled]);
  return pointer;
}

/** Camera drifts gently toward the cursor -- never snaps, never enough to
 * disorient or interfere with reading the page (max travel is small). */
function CameraRig({ pointerRef }: { pointerRef: React.RefObject<PointerState> }) {
  useFrame((state) => {
    const p = pointerRef.current;
    const targetX = p.active ? p.x * 0.7 : 0;
    const targetY = p.active ? p.y * 0.35 : 0;
    state.camera.position.x += (targetX - state.camera.position.x) * 0.02;
    state.camera.position.y += (targetY - state.camera.position.y) * 0.02;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}


/** Slow marine-snow drift -- one Points cloud, positions nudged in a typed
 * array each frame. No per-particle React objects, so hundreds of these
 * cost far less than they would as DOM/mesh elements. */
function MarineSnow({ count, rising, size, opacity }: { count: number; rising?: boolean; size: number; opacity: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
    }
    return arr;
  }, [count]);
  const phases = useMemo(() => Float32Array.from({ length: count }, () => Math.random() * Math.PI * 2), [count]);

  useFrame((state, delta) => {
    const attr = pointsRef.current?.geometry.attributes.position as THREE.BufferAttribute | undefined;
    if (!attr) return;
    const dir = rising ? 1 : -1;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      let y = attr.getY(i) + dir * delta * (rising ? 0.35 : 0.05);
      if (rising && y > 5.5) y = -5.5;
      if (!rising && y < -5.5) y = 5.5;
      const x = attr.getX(i) + Math.sin(t * 0.6 + phases[i]) * 0.0009;
      attr.setXY(i, x, y);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={size} color={rising ? '#e0f7fa' : '#a5f3fc'} transparent opacity={opacity} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** A thin double-helix of points drifting diagonally through the scene --
 * the visual thread tying "ocean" to "eDNA," per the actual product story
 * (sample -> DNA -> species -> biodiversity), not a random decoration. */
function DnaTrail({ count }: { count: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const cA = new THREE.Color('#22d3ee');
    const cB = new THREE.Color('#a78bfa');
    for (let i = 0; i < count; i++) {
      const tt = i / count;
      const strand = i % 2 === 0 ? 1 : -1;
      const angle = tt * Math.PI * 6;
      positions[i * 3] = Math.cos(angle) * 0.4 * strand;
      positions[i * 3 + 1] = tt * 8 - 4;
      positions[i * 3 + 2] = Math.sin(angle) * 0.4 * strand;
      const c = i % 2 === 0 ? cA : cB;
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [count]);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.rotation.y = t * 0.08;
    g.position.set(4 + Math.sin(t * 0.05) * 1.5, Math.sin(t * 0.07) * 1.2, -3);
  });

  return (
    <group ref={groupRef} rotation={[0, 0, 0.3]}>
      <points geometry={geometry}>
        <pointsMaterial size={0.045} vertexColors transparent opacity={0.55} sizeAttenuation depthWrite={false} />
      </points>
    </group>
  );
}

type Variant = 'full' | 'light';

function SceneContents({
  pointerRef,
  compact,
  variant,
  fish,
}: {
  pointerRef: React.RefObject<PointerState>;
  compact: boolean;
  variant: Variant;
  fish: boolean;
}) {
  // "light" is for small/secondary placements -- ambiance only, no shark,
  // no silhouette, no DNA trail. The auth panel keeps this at its
  // original scope (just jellyfish/particles -- it already has the DNA
  // helix as its own focal point, fish would compete with that). Content
  // pages (dashboard, history, settings, ...) opt into `fish` for a
  // couple of real, colorful reef fish drifting through -- still much
  // lighter than the homepage's full multi-instance school + shark.
  if (variant === 'light') {
    return (
      <>
        <ambientLight intensity={0.5} />
        <pointLight position={[3, 4, 5]} intensity={0.4} color="#22d3ee" />
        <fog attach="fog" args={['#050914', 4, 12]} />
        {fish && (
          <Suspense fallback={null}>
            <FishSchoolModel position={[-2, -0.4, -0.5]} rotationY={0.5} scale={compact ? 0.16 : 0.24} phaseOffset={4} pointerRef={pointerRef} />
            {!compact && (
              <FishSchoolModel position={[2.4, 0.8, -1.5]} rotationY={-1.8} scale={0.2} phaseOffset={19} pointerRef={pointerRef} />
            )}
          </Suspense>
        )}
        <RealisticJellyfish seed={0} pointerRef={pointerRef} />
        <RealisticJellyfish seed={1} pointerRef={pointerRef} />
        <MarineSnow count={compact ? 40 : 90} size={0.02} opacity={0.4} />
        <MarineSnow count={compact ? 16 : 30} rising size={0.03} opacity={0.3} />
      </>
    );
  }

  const jellyfishCount = compact ? 2 : 5;
  return (
    <>
      {/* Underwater lighting: cool blue ambient fill + a soft "sunlight
          from above" directional light (water scatters direct light into
          a broad, top-down glow rather than a sharp beam) plus the
          existing cyan/violet accent points for the bioluminescent read. */}
      <ambientLight intensity={0.7} color="#7dd3fc" />
      <directionalLight position={[1, 9, 3]} intensity={1.1} color="#bfe9ff" />
      <pointLight position={[4, 5, 6]} intensity={0.8} color="#22d3ee" />
      <pointLight position={[-5, -3, 2]} intensity={0.5} color="#a78bfa" />
      {/* Camera sits at z=8. Fog starts at distance 8 (i.e. right around
          the closest creatures) and only reaches fully opaque at 24, so
          even the background shark (z ~ -3..-6, distance ~11-14) stays
          clearly visible and colored -- just hazier than what's up front.
          The previous near/far (5/15) made anything past z ~ -7 render as
          almost pure fog color regardless of its actual texture, which
          was the real cause of everything reading as flat black/grey. */}
      <fog attach="fog" args={['#0a1f33', 8, 24]} />

      <CameraRig pointerRef={pointerRef} />

      {/* Real rigged/animated GLB creatures (see public/models/CREDITS.md),
          not procedural stand-ins. Suspense covers the async glTF fetch --
          they simply aren't in the scene until loaded, no placeholder mesh
          flashes in first. Depth layering: the shark patrols the background
          (z ~ -3..-6); the fish-school instances span near-foreground
          (z ~ 1.5, crisp/full color, before fog even starts) through
          midground (z ~ -1..-2, lightly hazed). */}
      <Suspense fallback={null}>
        <Shark compact={compact} pointerRef={pointerRef} closePass />
        {!compact && <Shark compact={compact} pointerRef={pointerRef} pathSeed={0.5} />}
        <FishSchoolModel
          position={[-1.8, -0.6, 0.5]}
          rotationY={0.4}
          scale={compact ? 0.28 : 0.4}
          phaseOffset={0}
          pointerRef={pointerRef}
        />
        {!compact && (
          <>
            <FishSchoolModel
              position={[3.4, 1.4, -1.5]}
              rotationY={-2.2}
              scale={0.3}
              phaseOffset={14}
              pointerRef={pointerRef}
            />
            <FishSchoolModel
              position={[-3.8, -2.2, -1.2]}
              rotationY={1.6}
              scale={0.32}
              phaseOffset={27}
              pointerRef={pointerRef}
            />
          </>
        )}
        {/* A continuous floor, not scattered mounds: a wide flat plane
            ties everything together end to end, with 3 real seafloor
            (kelp/rocks/driftwood) instances spaced across it for detail
            so it doesn't read as one bare strip. */}
        <mesh position={[0, -3.7, -3]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[40, 14]} />
          <meshStandardMaterial color="#0c2233" roughness={1} />
        </mesh>
        <SeaFloor compact={compact} position={[-1, -3.4, -2]} rotationY={0.3} />
        {!compact && (
          <>
            <SeaFloor compact={compact} position={[-8, -3.5, -3.5]} rotationY={-0.6} scaleMul={0.8} />
            <SeaFloor compact={compact} position={[6.5, -3.4, -3]} rotationY={1.8} scaleMul={0.9} />
          </>
        )}
        <SnapperFish seed={0} pointerRef={pointerRef} />
        {!compact && <SnapperFish seed={1} pointerRef={pointerRef} />}
      </Suspense>

      {Array.from({ length: jellyfishCount }, (_, i) => (
        <RealisticJellyfish key={i} seed={i} pointerRef={pointerRef} />
      ))}
      <MarineSnow count={compact ? 80 : 200} size={0.02} opacity={0.45} />
      <MarineSnow count={compact ? 30 : 70} rising size={0.03} opacity={0.35} />
      <DnaTrail count={compact ? 24 : 48} />
    </>
  );
}

/** Full-bleed, pointer-events-none living ocean backdrop. Lazy-loaded and
 * SSR-disabled like the globe; skipped entirely under prefers-reduced-motion
 * (a frozen mid-swim scene would look broken, not calm) and paused via
 * frameloop when the tab isn't visible.
 *
 * `variant="light"` trims it to ambiance-only (a couple of jellyfish +
 * particles, no fish school/silhouette/DNA trail, no cursor-driven camera)
 * for secondary placements like the auth panel, where the scene is small
 * and shouldn't compete with the DNA helix that's already the focal point. */
export default function OceanScene({
  className = '',
  variant = 'full',
  fish = false,
}: {
  className?: string;
  variant?: Variant;
  /** Only meaningful for variant="light" -- adds 2 real reef-fish
   * instances (each internally a small school of up to 4 species) on top
   * of the jellyfish/particle ambiance. Off by default so existing
   * "light" placements (the auth panel) don't change unless asked for. */
  fish?: boolean;
}) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compact, setCompact] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motionMq.matches);
    const onMotion = () => setReducedMotion(motionMq.matches);
    motionMq.addEventListener('change', onMotion);

    const onResize = () => setCompact(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);

    const onVisibility = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      motionMq.removeEventListener('change', onMotion);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const pointerRef = usePointerTarget(!reducedMotion && variant === 'full');

  if (reducedMotion) return null;

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <Canvas
        dpr={[1, compact ? 1.3 : 1.75]}
        // toneMappingExposure pulled below R3F's default of 1 -- the
        // brighter creature textures (yellow tang, clownfish orange) were
        // clipping past white under ACES filmic tonemapping once real
        // scene lighting reached them (ACES desaturates bright input
        // toward white as it approaches the highlight rolloff). This pulls
        // everything back under that threshold instead of trying to
        // rebalance every individual light by hand.
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power', toneMappingExposure: 0.75 }}
        camera={{ position: [0, 0, 8], fov: 50 }}
        frameloop={visible ? 'always' : 'never'}
      >
        <SceneContents pointerRef={pointerRef} compact={compact} variant={variant} fish={fish} />
      </Canvas>
    </div>
  );
}
