"use client";

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type PointerState = { x: number; y: number; active: boolean };

/** Genuinely volumetric bell -- a revolved dome profile (LatheGeometry),
 * not a sliced sphere: narrow crown, widest a little below the middle,
 * tapering back in with a slight inward curl at the rim, the way a real
 * jellyfish bell actually reads in silhouette. */
function buildBellGeometry() {
  const profile = [
    new THREE.Vector2(0, 0.42),
    new THREE.Vector2(0.14, 0.4),
    new THREE.Vector2(0.28, 0.32),
    new THREE.Vector2(0.36, 0.16),
    new THREE.Vector2(0.35, 0.02),
    new THREE.Vector2(0.3, -0.03),
  ];
  return new THREE.LatheGeometry(profile, 28);
}

/** A tapered, multi-segment chain (tentacle or oral arm) -- each segment
 * is a child of the previous one, so rotating a segment in useFrame bends
 * everything below it too. That parent-child chaining is what makes the
 * whole thing trail and whip like a real flexible tentacle instead of a
 * single rigid rod swinging from one hinge. */
function buildChain(
  segmentCount: number,
  totalLength: number,
  radiusTop: number,
  radiusBottom: number,
  material: THREE.Material
) {
  const root = new THREE.Group();
  let parent: THREE.Object3D = root;
  const segments: THREE.Object3D[] = [];
  const segLen = totalLength / segmentCount;

  for (let i = 0; i < segmentCount; i++) {
    const r0 = THREE.MathUtils.lerp(radiusTop, radiusBottom, i / segmentCount);
    const r1 = THREE.MathUtils.lerp(radiusTop, radiusBottom, (i + 1) / segmentCount);
    const geom = new THREE.CylinderGeometry(r1, r0, segLen, 5, 1);
    geom.translate(0, -segLen / 2, 0);
    const mesh = new THREE.Mesh(geom, material);
    const segGroup = new THREE.Group();
    segGroup.position.y = i === 0 ? 0 : -segLen;
    segGroup.add(mesh);
    parent.add(segGroup);
    segments.push(segGroup);
    parent = segGroup;
  }
  return { root, segments };
}

const TENTACLE_COUNT = 9;
const TENTACLE_SEGMENTS = 4;
const ARM_COUNT = 4;
const ARM_SEGMENTS = 3;

/** A real 3D jellyfish built from primitives, not a texture -- there's no
 * licensable jellyfish GLB I could find (checked several CC0/CC-BY
 * sources; account-gated or not marine at all), and jellyfish are
 * actually one of the better-suited animals to build this way: radially
 * symmetric, gelatinous/translucent, and defined mostly by flowing
 * tentacle motion rather than rigid anatomy. Bell is a revolved-profile
 * dome (real volume, not a flat disc or sphere slice); tentacles and
 * oral arms are chained multi-segment tapers that bend/trail via
 * parent-child rotation, not a single rigid swing. */
export default function RealisticJellyfish({
  seed,
  pointerRef,
}: {
  seed: number;
  pointerRef: React.RefObject<PointerState>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const bellRef = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => seed * 53, [seed]);
  const avoid = useRef(0);
  const hue = seed % 3 === 0 ? '#c4b5fd' : seed % 3 === 1 ? '#5eead4' : '#93c5fd';

  const bellMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: hue,
        transparent: true,
        opacity: 0.4,
        roughness: 0.15,
        transmission: 0.55,
        thickness: 0.6,
        iridescence: 0.4,
        iridescenceIOR: 1.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [hue]
  );
  const tentacleMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: hue,
        transparent: true,
        opacity: 0.5,
        roughness: 0.3,
        transmission: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [hue]
  );
  const bellGeometry = useMemo(() => buildBellGeometry(), []);

  const tentacles = useMemo(
    () =>
      Array.from({ length: TENTACLE_COUNT }, (_, i) => {
        const angle = (i / TENTACLE_COUNT) * Math.PI * 2;
        const { root, segments } = buildChain(TENTACLE_SEGMENTS, 0.75, 0.018, 0.004, tentacleMaterial);
        root.position.set(Math.cos(angle) * 0.26, -0.02, Math.sin(angle) * 0.26);
        return { root, segments, angle };
      }),
    [tentacleMaterial]
  );

  const arms = useMemo(
    () =>
      Array.from({ length: ARM_COUNT }, (_, i) => {
        const angle = (i / ARM_COUNT) * Math.PI * 2 + Math.PI / ARM_COUNT;
        const { root, segments } = buildChain(ARM_SEGMENTS, 0.5, 0.03, 0.01, tentacleMaterial);
        root.position.set(Math.cos(angle) * 0.08, -0.04, Math.sin(angle) * 0.08);
        return { root, segments, angle };
      }),
    [tentacleMaterial]
  );

  // Small bioluminescent points around the bell rim -- cheap emissive
  // spheres, not a shader, but they sell the "glowing" read at a glance.
  const spots = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2 + 0.3;
        return { x: Math.cos(angle) * 0.3, z: Math.sin(angle) * 0.3 };
      }),
    []
  );

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const tentacleGroup = new THREE.Group();
    tentacles.forEach((t) => tentacleGroup.add(t.root));
    const armGroup = new THREE.Group();
    arms.forEach((a) => armGroup.add(a.root));
    group.add(tentacleGroup);
    group.add(armGroup);
    return () => {
      group.remove(tentacleGroup, armGroup);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tentacles, arms]);

  useFrame((state) => {
    const t = state.clock.elapsedTime + phase;

    if (bellRef.current) {
      const pulse = 1 + Math.sin(t * 1.4) * 0.14;
      bellRef.current.scale.set(1 + Math.sin(t * 1.4) * 0.03, pulse, 1 + Math.sin(t * 1.4) * 0.03);
    }

    // Chain sway: each segment lags the one above it (phase offset by
    // index) so the motion propagates down the tentacle like a whip
    // rather than every segment swinging in lockstep.
    for (const { segments, angle } of tentacles) {
      segments.forEach((seg, i) => {
        const lag = i * 0.6;
        seg.rotation.x = Math.sin(t * 1.1 - lag + angle) * 0.22;
        seg.rotation.z = Math.cos(t * 0.9 - lag + angle * 1.3) * 0.22;
      });
    }
    for (const { segments, angle } of arms) {
      segments.forEach((seg, i) => {
        const lag = i * 0.5;
        seg.rotation.x = Math.sin(t * 1.3 - lag + angle) * 0.35;
        seg.rotation.z = Math.cos(t * 1.0 - lag + angle) * 0.3;
      });
    }

    const g = groupRef.current;
    if (!g) return;

    // Wandering path -- same idea as the fish/shark, full scene coverage
    // with a period short enough to actually see it curve.
    const x = Math.sin(t * 0.1 + 1.5) * 6 + Math.sin(t * 0.03) * 2.5;
    const y = Math.sin(t * 0.08) * 2.3 + 0.4;
    const z = -1.2 + Math.sin(t * 0.05 + 0.7) * 2;

    const p = pointerRef.current;
    let dodge = 0;
    if (p.active) {
      const dx = x - p.x * 6;
      const dy = y - p.y * 3;
      const dist = Math.hypot(dx, dy);
      if (dist < 1.8) dodge = Math.sign(dx || 1) * (1.8 - dist) / 1.8;
    }
    avoid.current += (dodge - avoid.current) * 0.04;

    g.position.set(x + avoid.current * 1.2, y, z);
  });

  return (
    <group ref={groupRef} scale={1.6}>
      <mesh ref={bellRef} geometry={bellGeometry} material={bellMaterial} />
      {spots.map((s, i) => (
        <mesh key={i} position={[s.x, 0.1, s.z]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshStandardMaterial color={hue} emissive={hue} emissiveIntensity={2} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
