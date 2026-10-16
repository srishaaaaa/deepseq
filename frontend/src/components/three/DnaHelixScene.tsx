'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useMotion } from '@/lib/motion';
import { NUCLEOTIDE_COLORS, complement } from '@/components/viz/nucleotides';

export type HelixHover = { index: number; base: string; pair: string; x: number; y: number } | null;

type Props = {
  /** Real sequence to render. When omitted a generic, clearly-labelled demo strand is used by the caller. */
  sequence: string;
  /** zero-based inclusive range to pulse */
  highlight?: [number, number] | null;
  /** Max bases drawn; longer sequences are shown as a window starting at `offset`. */
  maxBases?: number;
  offset?: number;
  className?: string;
  onHover?: (h: HelixHover) => void;
  /** show zoom buttons */
  controls?: boolean;
};

const RISE = 0.34; // Å-scaled rise per base (visual units)
const RADIUS = 1;
const PER_TURN = 10.5; // B-DNA bases per turn

export default function DnaHelixScene({ sequence, highlight = null, maxBases = 140, offset = 0, className = '', onHover, controls = true }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const { reduced, lite } = useMotion();
  const hoverCb = useRef(onHover);
  hoverCb.current = onHover;
  const highlightRef = useRef(highlight);
  highlightRef.current = highlight;
  const zoomRef = useRef<(dir: number) => void>(() => {});
  const [ready, setReady] = useState(false);

  const shown = sequence.slice(offset, offset + maxBases).toUpperCase();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !shown.length) return;

    const renderer = new THREE.WebGLRenderer({ antialias: !lite, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1 : 1.75));
    renderer.setClearColor(0, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'pan-y';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    const n = shown.length;
    const height = n * RISE;
    // frame the whole (diagonal) strand; aspect is corrected in resize()
    camera.position.set(0, 0, Math.max(10, Math.min(48, height * 1.3)));

    scene.add(new THREE.AmbientLight(0x9fdcff, 0.7));
    const key = new THREE.DirectionalLight(0x9feeff, 1.6);
    key.position.set(6, 6, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x2678ff, 1.1);
    rim.position.set(-8, -4, -6);
    scene.add(rim);

    const helix = new THREE.Group();
    helix.rotation.z = Math.PI / 2.4; // lay it diagonally for composition
    scene.add(helix);

    const sphereGeo = new THREE.SphereGeometry(0.2, lite ? 10 : 16, lite ? 8 : 12);
    const rungGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 8);
    const mat = new THREE.MeshLambertMaterial({ emissive: 0x0a2238, emissiveIntensity: 0.6 });
    const backboneMat = new THREE.MeshLambertMaterial({ color: 0xeaf7ff, emissive: 0x41e8ff, emissiveIntensity: 0.15 });

    const bases = new THREE.InstancedMesh(sphereGeo, mat, n * 2);
    const backbone = new THREE.InstancedMesh(sphereGeo, backboneMat, n * 2);
    const rungs = new THREE.InstancedMesh(rungGeo, mat, n * 2);
    const baseColors: THREE.Color[] = [];
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const white = new THREE.Color('#ffffff');

    for (let i = 0; i < n; i++) {
      const a = (i / PER_TURN) * Math.PI * 2;
      const y = i * RISE - height / 2;
      const b1 = shown[i];
      const b2 = complement(b1);
      for (let s = 0; s < 2; s++) {
        const ang = a + s * Math.PI * 0.82; // minor/major groove offset
        const x = Math.cos(ang) * RADIUS, z = Math.sin(ang) * RADIUS;
        // backbone bead
        dummy.position.set(x * 1.35, y, z * 1.35);
        dummy.scale.setScalar(0.7);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        backbone.setMatrixAt(i * 2 + s, dummy.matrix);
        // nucleotide bead
        dummy.position.set(x * 0.85, y, z * 0.85);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        bases.setMatrixAt(i * 2 + s, dummy.matrix);
        const c = new THREE.Color(NUCLEOTIDE_COLORS[s ? b2 : b1] ?? '#5b7184');
        baseColors.push(c);
        bases.setColorAt(i * 2 + s, c);
        // half-rung from backbone toward centre
        const mid = new THREE.Vector3(x * 0.45, y, z * 0.45);
        dummy.position.copy(mid);
        dummy.scale.set(1, 0.85, 1);
        dummy.lookAt(0, y, 0);
        dummy.rotateX(Math.PI / 2);
        dummy.updateMatrix();
        rungs.setMatrixAt(i * 2 + s, dummy.matrix);
        rungs.setColorAt(i * 2 + s, c);
      }
    }
    helix.add(backbone, rungs, bases);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableZoom = false;
    orbit.enablePan = false;
    orbit.enableDamping = true;
    orbit.autoRotate = !reduced;
    orbit.autoRotateSpeed = 0.6;
    const baseDist = camera.position.length();
    zoomRef.current = (dir: number) => {
      const len = THREE.MathUtils.clamp(camera.position.length() * (dir > 0 ? 0.8 : 1.25), baseDist * 0.3, baseDist * 1.8);
      camera.position.setLength(len);
      kick();
    };

    // hover inspection
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hovered = -1;
    const onMove = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObject(bases, false)[0];
      const id = hit?.instanceId ?? -1;
      if (id !== hovered) {
        if (hovered >= 0) bases.setColorAt(hovered, baseColors[hovered]);
        hovered = id;
        if (id >= 0) bases.setColorAt(id, col.set('#ffffff'));
        bases.instanceColor!.needsUpdate = true;
        kick();
      }
      renderer.domElement.style.cursor = id >= 0 ? 'crosshair' : 'grab';
      if (id < 0) return hoverCb.current?.(null);
      const idx = Math.floor(id / 2);
      const strand2 = id % 2 === 1;
      const b = shown[idx];
      hoverCb.current?.({
        index: offset + idx,
        base: strand2 ? complement(b) : b,
        pair: strand2 ? b : complement(b),
        x: e.clientX - r.left,
        y: e.clientY - r.top,
      });
    };
    const onLeave = () => {
      if (hovered >= 0) { bases.setColorAt(hovered, baseColors[hovered]); bases.instanceColor!.needsUpdate = true; }
      hovered = -1;
      hoverCb.current?.(null);
      kick();
    };
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerleave', onLeave);
    orbit.addEventListener('change', () => kick());

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      kick();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(mount);

    let raf = 0;
    const clock = new THREE.Clock();
    let t = 0;
    let idleFrames = 0;
    const render = () => {
      raf = 0;
      t += clock.getDelta();
      orbit.update();
      // travelling "read head" + region pulse (animated nucleotide highlights)
      if (!reduced) {
        const head = Math.floor((t * 6) % n);
        const hl = highlightRef.current;
        for (let i = 0; i < n; i++) {
          if (i * 2 === hovered || i * 2 + 1 === hovered) continue;
          const g = offset + i;
          const inHl = hl && g >= hl[0] && g <= hl[1];
          const near = Math.max(0, 1 - Math.abs(i - head) / 3);
          const boost = inHl ? 0.35 + 0.35 * Math.sin(t * 4) : near * 0.6;
          for (let s = 0; s < 2; s++) {
            col.copy(baseColors[i * 2 + s]).lerp(white, Math.max(0, boost));
            bases.setColorAt(i * 2 + s, col);
          }
        }
        bases.instanceColor!.needsUpdate = true;
      }
      renderer.render(scene, camera);
      if (!visible || document.hidden) return;
      if (!reduced) raf = requestAnimationFrame(render);
      else if (orbit.enableDamping && idleFrames++ < 30) raf = requestAnimationFrame(render);
    };
    function kick() { idleFrames = 0; if (!raf) raf = requestAnimationFrame(render); }
    const onVis = () => !document.hidden && kick();
    document.addEventListener('visibilitychange', onVis);
    resize();
    kick();
    setReady(true);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      orbit.dispose();
      [sphereGeo, rungGeo, mat, backboneMat].forEach((d) => d.dispose());
      bases.dispose(); backbone.dispose(); rungs.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [shown, offset, reduced, lite]);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <div ref={mountRef} className="absolute inset-0" />
      {controls && ready && (
        <div className="absolute bottom-3 right-3 flex gap-1.5">
          {[['+', 1, 'Zoom in'], ['−', -1, 'Zoom out']].map(([s, d, l]) => (
            <button
              key={l as string}
              aria-label={l as string}
              onClick={() => zoomRef.current(d as number)}
              className="h-8 w-8 rounded-full border border-line bg-midnight/80 font-mono text-ink transition hover:border-biolum"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
