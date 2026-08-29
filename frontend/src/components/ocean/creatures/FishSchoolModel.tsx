"use client";

import { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

useGLTF.preload('/models/fish-school.glb');

type PointerState = { x: number; y: number; active: boolean };

/** Real rigged/animated school of four fish (adapted from the Babylon.js
 * Meshes Library, CC BY 4.0 -- see public/models/CREDITS.md). The source
 * clip is a single baked ~40s choreographed swim-past -- the fish
 * genuinely move together, at varying individual offsets, the way a real
 * school does -- rather than a loopable in-place cycle, so this plays it
 * back directly instead of layering procedural boid steering on top of it
 * (that would fight the baked motion). `phaseOffset` varies the loop start
 * per instance so multiple copies in the scene don't read as one
 * obviously-repeating clip.
 *
 * Cursor reaction: the whole school (the real animated group, not a
 * decorative stand-in) eases away when the pointer gets close, and eases
 * back to its anchor position once it's clear -- same smoothed-offset
 * pattern as the shark and jellyfish, applied to an inner group so the
 * outer `position`/`rotationY` anchor stays the stable placement point. */
export default function FishSchoolModel({
  position,
  rotationY = 0,
  scale = 1,
  phaseOffset = 0,
  pointerRef,
}: {
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
  phaseOffset?: number;
  pointerRef: React.RefObject<PointerState>;
}) {
  const outerGroup = useRef<THREE.Group>(null);
  const innerGroup = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/models/fish-school.glb');
  // SkeletonUtils.clone (not scene.clone()) -- required for a skinned/rigged
  // mesh so each placed instance gets its own skeleton and can animate
  // independently instead of all instances sharing one pose.
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions } = useAnimations(animations, outerGroup);
  const avoidOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const name = actions['swimming'] ? 'swimming' : Object.keys(actions)[0];
    const action = name ? actions[name] : undefined;
    if (action) {
      action.reset();
      action.time = phaseOffset;
      action.play();
    }
    return () => {
      action?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  useFrame(() => {
    const inner = innerGroup.current;
    const outer = outerGroup.current;
    if (!inner || !outer) return;

    const p = pointerRef.current;
    const target = { x: 0, y: 0 };
    if (p.active) {
      const worldPos = outer.getWorldPosition(new THREE.Vector3());
      const dx = worldPos.x - p.x * 7;
      const dy = worldPos.y - p.y * 3.5;
      const dist = Math.hypot(dx, dy);
      const RADIUS = 3;
      if (dist < RADIUS) {
        const strength = (RADIUS - dist) / RADIUS;
        target.x = Math.sign(dx || 1) * strength * 1.1;
        target.y = Math.sign(dy || 1) * strength * 0.7;
      }
    }
    avoidOffset.current.x += (target.x - avoidOffset.current.x) * 0.04;
    avoidOffset.current.y += (target.y - avoidOffset.current.y) * 0.04;
    inner.position.set(avoidOffset.current.x, avoidOffset.current.y, 0);
  });

  return (
    <group ref={outerGroup} position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <group ref={innerGroup}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}
