"use client";

import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

useGLTF.preload('/models/snapper.glb');

type PointerState = { x: number; y: number; active: boolean };

/** Real grey snapper mesh (Babylon.js Meshes Library, CC BY 4.0 -- see
 * public/models/CREDITS.md), pre-colored via real vertex colors rather
 * than an image texture -- no material/texture pipeline involved at all,
 * so this one is immune to the whole class of bug the shark/fish-school
 * textures hit. It ships with no skeleton/animation, so the swim motion
 * here is deliberately procedural (per the brief's own fallback: body
 * flex when a model has no baked animation) -- a body-flex sine wave
 * layered under a wandering path, not just a rigid translate. */
export default function SnapperFish({
  seed = 0,
  pointerRef,
}: {
  seed?: number;
  pointerRef: React.RefObject<PointerState>;
}) {
  const group = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/snapper.glb');
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const avoid = useRef(0);

  useFrame((state) => {
    const g = group.current;
    const body = bodyRef.current;
    if (!g || !body) return;
    const t = state.clock.elapsedTime + seed * 17;

    // Wandering figure-eight-ish path -- two out-of-phase sines, not a
    // single circle, so it doesn't read as an obvious repeating loop.
    const x = Math.sin(t * 0.09) * 4.5;
    const y = -0.4 + Math.sin(t * 0.14 + seed) * 1.1;
    const z = -0.5 + Math.cos(t * 0.11) * 1.5;

    const p = pointerRef.current;
    let dodge = 0;
    if (p.active) {
      const dx = x - p.x * 7;
      const dy = y - p.y * 3.5;
      const dist = Math.hypot(dx, dy);
      if (dist < 2.2) dodge = (2.2 - dist) / 2.2;
    }
    avoid.current += (dodge - avoid.current) * 0.05;

    g.position.set(x, y + avoid.current * 0.6, z);

    // Face direction of travel (derivative of the path).
    const vx = Math.cos(t * 0.09) * 0.09 * 4.5;
    const vz = -Math.sin(t * 0.11) * 0.11 * 1.5;
    g.rotation.y = Math.atan2(vx, vz) + Math.PI / 2 * avoid.current * (dodge ? 1 : 0);

    // Body-flex: since this mesh has no skeleton, the "swimming" tail
    // motion is a whole-body oscillation instead -- fast enough to read
    // as alive, small enough not to look like the fish is rigid-wobbling.
    body.rotation.y = Math.sin(t * 5) * 0.12;
  });

  return (
    <group ref={group}>
      <group ref={bodyRef} scale={0.045}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}
