"use client";

import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

useGLTF.preload('/models/seafloor.glb');

// This geometry (real, from the Babylon.js Meshes Library underwater
// demo, CC BY 4.0 -- see public/models/CREDITS.md) ships with no
// materials or textures at all -- it's bare geometry meant to be styled
// by whoever uses it. Colors below are ours, matched to each mesh's real
// name (grass/rocks/boards/reef), not guessed.
const MATERIAL_BY_NAME: Record<string, THREE.MeshStandardMaterialParameters> = {
  grass: { color: '#2f8f6e', roughness: 0.8, side: THREE.DoubleSide }, // kelp/seagrass
  moreRocks: { color: '#4b5a63', roughness: 0.95 },
  'Cube.008': { color: '#3d4a52', roughness: 0.9 }, // reef structure
  boards: { color: '#5b4632', roughness: 0.85 }, // driftwood/wreck planks
};

/** Real ocean-floor geometry (kelp-like grass, rocks, reef structure,
 * driftwood) -- swaying gently where it's grass, static where it's rock.
 * Not a creature, but real "sea plants and organisms" scenery rather than
 * a flat gradient with nothing at the bottom of the scene. */
export default function SeaFloor({
  compact,
  position = [-1, -3.4, -2],
  rotationY = 0.3,
  scaleMul = 1,
}: {
  compact: boolean;
  position?: [number, number, number];
  rotationY?: number;
  scaleMul?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/seafloor.glb');
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const grassRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    grassRef.current = null;
    cloned.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const params = MATERIAL_BY_NAME[child.name];
      if (params) child.material = new THREE.MeshStandardMaterial(params);
      if (child.name === 'grass') grassRef.current = child;
    });
  }, [cloned]);

  useFrame((state) => {
    // Bare-geometry "grass" has no skeleton/shader to sway it -- a subtle
    // whole-mesh shear over time is a cheap stand-in for a current moving
    // through it, applied to the mesh itself so the rocks/reef around it
    // stay still (real plants sway, rocks don't).
    if (grassRef.current) {
      const t = state.clock.elapsedTime;
      grassRef.current.rotation.z = Math.sin(t * 0.5) * 0.03;
    }
  });

  const scale = (compact ? 0.24 : 0.34) * scaleMul;
  return (
    <group ref={group} position={position} scale={scale} rotation={[0, rotationY, 0]}>
      <primitive object={cloned} />
    </group>
  );
}
