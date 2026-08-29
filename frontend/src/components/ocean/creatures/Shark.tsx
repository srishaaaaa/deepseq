"use client";

import { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

useGLTF.preload('/models/shark.glb');

type PointerState = { x: number; y: number; active: boolean };

/** Real rigged/animated shark (adapted from the Babylon.js Meshes Library,
 * CC BY 4.0 -- see public/models/CREDITS.md), not a procedural stand-in.
 * Plays its own baked "circling" clip for the swim cycle/tail motion,
 * while this component drives the slow drift across the background depth
 * layer plus a smoothed vertical/depth nudge away from the cursor -- the
 * body animation, the drift, and the cursor reaction all compose on the
 * same group rather than fighting each other. */
export default function Shark({
  compact,
  pointerRef,
  pathSeed = 0,
  closePass = false,
}: {
  compact: boolean;
  pointerRef: React.RefObject<PointerState>;
  /** Offsets phase/depth/height so multiple sharks don't move in lockstep. */
  pathSeed?: number;
  /** Every ~22s, swims from the background almost up to the camera before
   * retreating -- a deliberate "passes right by/through the screen"
   * moment, instead of staying at one background depth forever. */
  closePass?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/models/shark.glb');
  // SkeletonUtils.clone -- useGLTF caches by URL, so a second <Shark>
  // instance would otherwise reuse the exact same Object3D (and skeleton)
  // as the first, which three.js can only place in the scene graph once.
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions } = useAnimations(animations, group);
  const avoidOffset = useRef({ y: 0, z: 0 });

  useEffect(() => {
    // "swimming" is a short (~2s), energetic tail-beat loop -- constant
    // visible motion on repeat, same idea as the fish school's own
    // "swimming" clip. "circling" (32s) is a slow, wide root-path
    // animation with much lower-amplitude body motion moment-to-moment;
    // looping it made the shark read as barely moving, which is the bug
    // this fixes. THREE.AnimationAction defaults to LoopRepeat, so this
    // just keeps replaying the tail-beat continuously.
    const name = actions['swimming'] ? 'swimming' : Object.keys(actions)[0];
    const action = name ? actions[name] : undefined;
    action?.reset().fadeIn(0.4).play();
    return () => {
      action?.fadeOut(0.2);
    };
  }, [actions]);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime + pathSeed * 41;

    // Wandering Lissajous-style path: my first attempt at this fix used
    // periods of 70-140s, which -- over a normal few-seconds-of-attention
    // viewing window -- is close enough to linear that it still read as
    // "moving in a straight line slowly." A sine wave only looks curved
    // once you can see a real fraction of its period. These periods are
    // ~25-30s, short enough that the turning is actually visible within
    // the time someone's looking at the hero, not just true on paper.
    // Camera sits at z=8, fog runs 8..24 (see OceanScene) -- the z terms
    // keep this in the -3..-6 band, clearly the background layer and
    // hazier than the fish school, but not so far past the fog's fully-
    // opaque distance that it renders as flat fog color regardless of
    // its actual texture (that was the original "black and white" bug).
    const baseX = Math.sin(t * 0.22) * 6.5;
    let baseY = -1.6 + Math.sin(t * 0.09) * 0.9;
    let baseZ = -4 + Math.sin(t * 0.15 + Math.PI / 3) * 2;
    let closeVz = 0;

    if (closePass) {
      // A brief, sharp spike toward the camera every ~22s (most of the
      // cycle stays near 0 -- Math.sin raised to a high power narrows the
      // peak -- so it's background most of the time, then rushes close
      // and retreats, not a slow bob). Distance from camera (z=8) drops
      // under fog's near distance (8) during the pass, so it also renders
      // crisp/close instead of hazy for that moment, on top of the actual
      // perspective size increase from genuinely being nearer the camera.
      const CLOSE_PASS_PERIOD = 22;
      const cycle = ((t % CLOSE_PASS_PERIOD) + CLOSE_PASS_PERIOD) % CLOSE_PASS_PERIOD / CLOSE_PASS_PERIOD;
      const closeShape = Math.sin(cycle * Math.PI);
      // Amplitude of 8 (not more): base Z sits around -6..-2, so the peak
      // tops out near z=6 -- close enough to camera (z=8) to loom large
      // and cross the whole frame, with enough clearance left that it
      // never clips through the lens.
      const CLOSE_AMPLITUDE = 8;
      const closeT = Math.pow(closeShape, 6);
      baseZ = baseZ + closeT * CLOSE_AMPLITUDE;
      // Recenter vertically as it approaches -- at background depth the
      // usual -1.6-ish offset reads fine, but blown up close to camera it
      // would crop off the bottom of frame instead of swimming across it.
      baseY = baseY * (1 - closeT * 0.6);
      // Derivative of closeT w.r.t. t, for correct facing during the pass.
      const dShape = Math.cos(cycle * Math.PI) * (Math.PI / CLOSE_PASS_PERIOD);
      closeVz = 6 * Math.pow(closeShape, 5) * dShape * CLOSE_AMPLITUDE;
    }

    // Cursor reaction: if the pointer is near the shark's projected
    // position, ease a perpendicular offset in (never snap) so it reads as
    // "altering its trajectory," not teleporting. Eases back out the same
    // way once the cursor moves off.
    const p = pointerRef.current;
    const target = { y: 0, z: 0 };
    if (p.active) {
      const cursorX = p.x * 7;
      const cursorY = p.y * 3.5;
      const dx = baseX - cursorX;
      const dy = baseY - avoidOffset.current.y - cursorY;
      const dist = Math.hypot(dx, dy);
      const RADIUS = 3.5;
      if (dist < RADIUS) {
        const strength = (RADIUS - dist) / RADIUS;
        target.y = Math.sign(dy || 1) * strength * 1.4;
        target.z = strength * 1.2; // also eases further back, not just up/down
      }
    }
    avoidOffset.current.y += (target.y - avoidOffset.current.y) * 0.03;
    avoidOffset.current.z += (target.z - avoidOffset.current.z) * 0.03;

    g.position.set(baseX, baseY + avoidOffset.current.y, baseZ - avoidOffset.current.z);

    // Face the actual direction of travel (derivative of the path) instead
    // of a hardcoded angle -- this is what makes it visibly turn as the
    // path curves, rather than crawl sideways facing one fixed way.
    const vx = Math.cos(t * 0.22) * 0.22 * 6.5;
    const vz = Math.cos(t * 0.15 + Math.PI / 3) * 0.15 * 2 + closeVz;
    g.rotation.y = Math.atan2(vx, vz);
    g.rotation.z = avoidOffset.current.y * 0.08; // subtle bank into the dodge

    const action = actions['swimming'];
    if (action) {
      // A faint speed-up while dodging reads as "startled," without being
      // an obvious tell -- most of the reaction is the trajectory change.
      const targetScale = 1 + Math.min(0.4, Math.abs(avoidOffset.current.y) * 0.25);
      action.timeScale += (targetScale - action.timeScale) * 0.05;
    }
  });

  const scale = compact ? 0.3 : 0.46;
  return (
    <group ref={group} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}
