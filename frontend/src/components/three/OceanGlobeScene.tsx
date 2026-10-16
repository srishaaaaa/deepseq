'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useMotion } from '@/lib/motion';

export type GlobeMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  /** short secondary line for tooltips */
  detail?: string;
};

export type MarkerHover = { marker: GlobeMarker; x: number; y: number } | null;

type Props = {
  markers: GlobeMarker[];
  focusId?: string | null;
  onHover?: (h: MarkerHover) => void;
  onSelect?: (m: GlobeMarker) => void;
  className?: string;
  /** include jellyfish / fish school / DNA fragments */
  organisms?: boolean;
};

const R = 2;

function latLngToVec(lat: number, lng: number, r = R) {
  const theta = ((90 - lat) * Math.PI) / 180;
  const a = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(-Math.cos(a) * Math.sin(theta) * r, Math.cos(theta) * r, Math.sin(a) * Math.sin(theta) * r);
}

// ---------- shaders ----------
const oceanVert = /* glsl */ `
  varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const oceanFrag = /* glsl */ `
  uniform sampler2D uWater; uniform sampler2D uTopo; uniform float uTime; uniform float uReveal; uniform float uHasTex;
  varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
  void main() {
    float water = uHasTex > 0.5 ? texture2D(uWater, vUv).r : 1.0;
    float topo = uHasTex > 0.5 ? texture2D(uTopo, vUv).r : 0.0;
    float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
    // animated ocean shimmer
    float n = noise(vUv * vec2(80.0, 40.0) + vec2(uTime * 0.05, uTime * 0.02));
    float n2 = noise(vUv * vec2(260.0, 130.0) - vec2(uTime * 0.03, 0.0));
    vec3 deep = vec3(0.012, 0.05, 0.10);
    vec3 shelf = vec3(0.0, 0.28, 0.34);
    vec3 ocean = mix(deep, shelf, smoothstep(0.55, 1.0, n) * 0.35 + n2 * 0.08);
    vec3 land = vec3(0.03, 0.06, 0.09) + topo * vec3(0.10, 0.20, 0.26);
    vec3 col = mix(land, ocean, water);
    // coastline glow
    float coast = smoothstep(0.35, 0.5, water) * (1.0 - smoothstep(0.5, 0.65, water));
    col += coast * vec3(0.25, 0.9, 1.0) * 0.55;
    col += fres * vec3(0.25, 0.85, 1.0) * 0.45;
    gl_FragColor = vec4(col * uReveal, 1.0);
  }`;
const atmoVert = /* glsl */ `
  varying vec3 vNormal; varying vec3 vView;
  void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vNormal = normalize(normalMatrix*normal); vView = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`;
const atmoFrag = /* glsl */ `
  uniform float uReveal; varying vec3 vNormal; varying vec3 vView;
  void main(){ float i = pow(max(0.62 - dot(vNormal, vView), 0.0), 3.0); gl_FragColor = vec4(0.25, 0.9, 1.0, 1.0) * i * 0.32 * uReveal; }`;
const particleVert = /* glsl */ `
  attribute float aSize; attribute float aSeed; uniform float uTime; uniform float uPixel;
  varying float vAlpha;
  void main(){
    vec3 p = position;
    p.y += mod(uTime * (0.04 + aSeed * 0.06) + aSeed * 20.0, 20.0) - 10.0;
    p.x += sin(uTime * 0.2 + aSeed * 30.0) * 0.15;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * uPixel * (8.0 / -mv.z);
    vAlpha = 0.25 + 0.55 * fract(aSeed * 7.0);
    gl_Position = projectionMatrix * mv;
  }`;
const particleFrag = /* glsl */ `
  varying float vAlpha; uniform vec3 uColor;
  void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uColor, a * vAlpha); }`;
const flowVert = /* glsl */ `
  attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const flowFrag = /* glsl */ `
  uniform float uTime; uniform float uOffset; uniform float uReveal; varying float vT;
  void main(){ float head = fract(uTime * 0.18 + uOffset); float d = vT - head; if (d > 0.0) d -= 1.0;
    float a = smoothstep(-0.28, 0.0, d) * 0.9 + 0.08; gl_FragColor = vec4(0.25, 0.91, 1.0, a * uReveal); }`;
const bellFrag = /* glsl */ `
  uniform float uPulse; uniform vec3 uColor; varying vec3 vNormal; varying vec3 vView;
  void main(){ float f = pow(1.0 - abs(dot(vNormal, vView)), 1.6); gl_FragColor = vec4(uColor, (0.12 + f * 0.75) * (0.55 + 0.45 * uPulse)); }`;

export default function OceanGlobeScene({ markers, focusId, onHover, onSelect, className = '', organisms = true }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const { reduced, lite } = useMotion();
  // refs so the long-lived render loop always sees the latest props
  const markersRef = useRef(markers);
  const focusRef = useRef<{ id: string | null; pending: boolean }>({ id: null, pending: false });
  const cbRef = useRef({ onHover, onSelect });
  cbRef.current = { onHover, onSelect };
  const rebuildRef = useRef<() => void>(() => {});

  useEffect(() => {
    markersRef.current = markers;
    rebuildRef.current();
  }, [markers]);

  useEffect(() => {
    focusRef.current = { id: focusId ?? null, pending: !!focusId };
  }, [focusId]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: !lite, alpha: true, powerPreference: 'high-performance' });
    const pixel = Math.min(window.devicePixelRatio || 1, lite ? 1 : 1.75);
    renderer.setPixelRatio(pixel);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'pan-y';

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030810, 0.045);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.2, 8.4);

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(o: T) => (disposables.push(o), o);

    // ---------- globe ----------
    const globe = new THREE.Group();
    globe.rotation.set(0.35, -1.2, 0);
    scene.add(globe);

    const loader = new THREE.TextureLoader();
    const uniforms = {
      uWater: { value: null as THREE.Texture | null },
      uTopo: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uHasTex: { value: 0 },
    };
    let loaded = 0;
    const onTex = () => { if (++loaded === 2) uniforms.uHasTex.value = 1; };
    loader.load('/textures/earth-water.png', (t) => { uniforms.uWater.value = track(t); onTex(); });
    loader.load('/textures/earth-topology.png', (t) => { uniforms.uTopo.value = track(t); onTex(); });

    const sphereGeo = track(new THREE.SphereGeometry(R, lite ? 48 : 96, lite ? 32 : 64));
    const oceanMat = track(new THREE.ShaderMaterial({ uniforms, vertexShader: oceanVert, fragmentShader: oceanFrag }));
    globe.add(new THREE.Mesh(sphereGeo, oceanMat));

    const atmoUniforms = { uReveal: { value: 0 } };
    const atmo = new THREE.Mesh(
      track(new THREE.SphereGeometry(R * 1.12, 64, 48)),
      track(new THREE.ShaderMaterial({
        uniforms: atmoUniforms, vertexShader: atmoVert, fragmentShader: atmoFrag,
        side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
      }))
    );
    scene.add(atmo);

    // graticule
    const gratPts: number[] = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let lng = -180; lng < 180; lng += 4) {
        const a = latLngToVec(lat, lng, R * 1.004), b = latLngToVec(lat, lng + 4, R * 1.004);
        gratPts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    for (let lng = -180; lng < 180; lng += 30) {
      for (let lat = -88; lat < 88; lat += 4) {
        const a = latLngToVec(lat, lng, R * 1.004), b = latLngToVec(lat + 4, lng, R * 1.004);
        gratPts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    const gratGeo = track(new THREE.BufferGeometry());
    gratGeo.setAttribute('position', new THREE.Float32BufferAttribute(gratPts, 3));
    const gratMat = track(new THREE.LineBasicMaterial({ color: 0x41e8ff, transparent: true, opacity: 0, depthWrite: false }));
    globe.add(new THREE.LineSegments(gratGeo, gratMat));

    // ---------- markers + current arcs (rebuilt when markers change) ----------
    const markerGroup = new THREE.Group();
    globe.add(markerGroup);
    const dotGeo = track(new THREE.SphereGeometry(0.035, 16, 12));
    const ringGeo = track(new THREE.RingGeometry(0.05, 0.065, 40));
    const dotMat = track(new THREE.MeshBasicMaterial({ color: 0xb6ff73 }));
    const dotMatActive = track(new THREE.MeshBasicMaterial({ color: 0x41e8ff }));
    type MarkerObj = { marker: GlobeMarker; dot: THREE.Mesh; ring: THREE.Mesh; ringMat: THREE.MeshBasicMaterial; phase: number };
    let markerObjs: MarkerObj[] = [];
    let flowMats: THREE.ShaderMaterial[] = [];
    let dynamicDisposables: { dispose: () => void }[] = [];

    const rebuild = () => {
      dynamicDisposables.forEach((d) => d.dispose());
      dynamicDisposables = [];
      markerGroup.clear();
      markerObjs = [];
      flowMats = [];
      const list = markersRef.current;
      list.forEach((m, i) => {
        const pos = latLngToVec(m.lat, m.lng, R * 1.01);
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.copy(pos);
        dot.userData.markerIndex = i;
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x41e8ff, transparent: true, side: THREE.DoubleSide, depthWrite: false });
        dynamicDisposables.push(ringMat);
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(pos);
        ring.lookAt(pos.clone().multiplyScalar(2));
        markerGroup.add(dot, ring);
        markerObjs.push({ marker: m, dot, ring, ringMat, phase: i * 0.37 });
      });
      // flowing "current" arcs between consecutive markers
      for (let i = 0; i < list.length - 1 && i < 8; i++) {
        const a = latLngToVec(list[i].lat, list[i].lng, R * 1.01);
        const b = latLngToVec(list[i + 1].lat, list[i + 1].lng, R * 1.01);
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const lift = 1 + Math.min(0.5, a.distanceTo(b) * 0.18);
        mid.normalize().multiplyScalar(R * lift);
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        const pts = curve.getPoints(64);
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        geo.setAttribute('aT', new THREE.Float32BufferAttribute(pts.map((_, k) => k / 64), 1));
        const mat = new THREE.ShaderMaterial({
          uniforms: { uTime: uniforms.uTime, uOffset: { value: i * 0.23 }, uReveal: uniforms.uReveal },
          vertexShader: flowVert, fragmentShader: flowFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        });
        dynamicDisposables.push(geo, mat);
        flowMats.push(mat);
        markerGroup.add(new THREE.Line(geo, mat));
      }
    };
    rebuildRef.current = rebuild;
    rebuild();

    // ---------- suspended particles (3 depth bands in one draw call) ----------
    const pCount = lite ? 450 : 1400;
    const pPos = new Float32Array(pCount * 3);
    const pSize = new Float32Array(pCount);
    const pSeed = new Float32Array(pCount);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 22;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pPos[i * 3 + 2] = -14 + Math.random() * 18;
      pSize[i] = 0.6 + Math.random() * 2.2;
      pSeed[i] = Math.random();
    }
    const pGeo = track(new THREE.BufferGeometry());
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
    pGeo.setAttribute('aSeed', new THREE.BufferAttribute(pSeed, 1));
    const pMat = track(new THREE.ShaderMaterial({
      uniforms: { uTime: uniforms.uTime, uPixel: { value: pixel }, uColor: { value: new THREE.Color(0xa8eeff) } },
      vertexShader: particleVert, fragmentShader: particleFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    scene.add(new THREE.Points(pGeo, pMat));

    // ---------- organisms ----------
    type Jelly = { group: THREE.Group; bell: THREE.Mesh; tentacles: THREE.Line[]; base: THREE.Vector3; speed: number; phase: number; bellU: { uPulse: { value: number } } };
    const jellies: Jelly[] = [];
    let fish: THREE.InstancedMesh | null = null;
    const fishData: { r: number; speed: number; phase: number; y: number; tilt: number }[] = [];
    const dnaFragments: THREE.Points[] = [];

    if (organisms) {
      const bellGeo = track(new THREE.SphereGeometry(0.28, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2));
      const jellySpecs = lite
        ? [{ p: [-3.6, 1.4, -1.5], c: 0x41e8ff, s: 1 }]
        : [
            { p: [-3.8, 1.5, -1.2], c: 0x41e8ff, s: 1 },
            { p: [3.4, -1.8, -2.4], c: 0x00d5c0, s: 0.75 },
            { p: [-2.4, -2.6, -4.5], c: 0x8ab8ff, s: 0.6 },
          ];
      for (const [k, spec] of jellySpecs.entries()) {
        const bellU = { uPulse: { value: 0 }, uColor: { value: new THREE.Color(spec.c) } };
        const mat = track(new THREE.ShaderMaterial({
          uniforms: bellU, vertexShader: atmoVert, fragmentShader: bellFrag,
          transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
        }));
        const group = new THREE.Group();
        const bell = new THREE.Mesh(bellGeo, mat);
        group.add(bell);
        const tentacles: THREE.Line[] = [];
        const tMat = track(new THREE.LineBasicMaterial({ color: spec.c, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
        for (let t = 0; t < 7; t++) {
          const g = track(new THREE.BufferGeometry());
          g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18 * 3), 3));
          const line = new THREE.Line(g, tMat);
          line.userData.angle = (t / 7) * Math.PI * 2;
          tentacles.push(line);
          group.add(line);
        }
        group.scale.setScalar(spec.s);
        group.position.set(spec.p[0], spec.p[1], spec.p[2]);
        scene.add(group);
        jellies.push({ group, bell, tentacles, base: group.position.clone(), speed: 0.6 + k * 0.15, phase: k * 2.1, bellU });
      }

      // fish school: instanced low-poly bodies orbiting the globe
      const fishCount = lite ? 18 : 42;
      const fishGeo = track(new THREE.ConeGeometry(0.025, 0.11, 4));
      fishGeo.rotateZ(-Math.PI / 2);
      const fishMat = track(new THREE.MeshBasicMaterial({ color: 0x5fd8e8, transparent: true, opacity: 0.55 }));
      fish = new THREE.InstancedMesh(fishGeo, fishMat, fishCount);
      for (let i = 0; i < fishCount; i++) {
        fishData.push({ r: 2.9 + Math.random() * 0.5, speed: 0.12 + Math.random() * 0.02, phase: Math.random() * 0.9, y: (Math.random() - 0.5) * 0.5, tilt: Math.random() * 0.3 });
      }
      scene.add(fish);

      // floating DNA fragments
      const fragCount = lite ? 1 : 3;
      for (let f = 0; f < fragCount; f++) {
        const n = 36;
        const arr = new Float32Array(n * 2 * 3);
        for (let i = 0; i < n; i++) {
          const a = i * 0.55, y = (i - n / 2) * 0.035;
          arr.set([Math.cos(a) * 0.1, y, Math.sin(a) * 0.1, Math.cos(a + Math.PI) * 0.1, y, Math.sin(a + Math.PI) * 0.1], i * 6);
        }
        const g = track(new THREE.BufferGeometry());
        g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
        g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n * 2).fill(1.6), 1));
        g.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(n * 2).fill(0), 1));
        const m = track(new THREE.PointsMaterial({ color: f % 2 ? 0x00d5c0 : 0x41e8ff, size: 0.035, transparent: true, opacity: 0.7, depthWrite: false }));
        const pts = new THREE.Points(g, m);
        pts.position.set([3.3, -3.4, 2.8][f], [1.9, 0.6, -2.2][f], [-1, -3, -2][f]);
        pts.rotation.z = [0.5, -0.4, 1.1][f];
        scene.add(pts);
        dnaFragments.push(pts);
      }
    }

    // ---------- interaction ----------
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2(10, 10);
    const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
    let hoverIdx = -1;
    let dragging = false;
    let dragMoved = 0;
    let last = { x: 0, y: 0 };
    let spinVel = 0;
    const target = { y: globe.rotation.y, x: globe.rotation.x, active: false };

    const setFromEvent = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      parallax.tx = ndc.x * 0.35;
      parallax.ty = ndc.y * 0.2;
    };
    const pick = (): number => {
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(markerObjs.map((m) => m.dot), false);
      if (!hits.length) return -1;
      // ignore markers on the far side of the globe
      const p = hits[0].point;
      const camDir = camera.position.clone().sub(p).normalize();
      const normal = p.clone().normalize();
      return camDir.dot(normal) > 0.05 ? (hits[0].object.userData.markerIndex as number) : -1;
    };
    const emitHover = (idx: number, e?: PointerEvent) => {
      if (idx === hoverIdx && idx === -1) return;
      hoverIdx = idx;
      renderer.domElement.style.cursor = idx >= 0 ? 'pointer' : dragging ? 'grabbing' : 'grab';
      if (idx < 0 || !e) return cbRef.current.onHover?.(null);
      const r = mount.getBoundingClientRect();
      cbRef.current.onHover?.({ marker: markerObjs[idx].marker, x: e.clientX - r.left, y: e.clientY - r.top });
    };
    const focusOn = (m: GlobeMarker) => {
      const v = latLngToVec(m.lat, m.lng);
      let ty = Math.atan2(-v.x, v.z);
      // shortest path
      const cur = globe.rotation.y;
      ty = cur + ((((ty - cur) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      target.y = ty;
      target.x = THREE.MathUtils.clamp((m.lat * Math.PI) / 180, -1, 1);
      target.active = true;
      spinVel = 0;
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      dragMoved = 0;
      last = { x: e.clientX, y: e.clientY };
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      setFromEvent(e);
      if (dragging) {
        const dx = e.clientX - last.x, dy = e.clientY - last.y;
        dragMoved += Math.abs(dx) + Math.abs(dy);
        last = { x: e.clientX, y: e.clientY };
        if (e.pointerType === 'mouse' || Math.abs(dx) > Math.abs(dy)) {
          globe.rotation.y += dx * 0.006;
          globe.rotation.x = THREE.MathUtils.clamp(globe.rotation.x + dy * 0.004, -1, 1);
          spinVel = dx * 0.0006;
          target.active = false;
        }
      }
      if (reduced) requestRender();
      emitHover(pick(), e);
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      if (dragMoved < 6) {
        setFromEvent(e);
        const idx = pick();
        if (idx >= 0) {
          focusOn(markerObjs[idx].marker);
          cbRef.current.onSelect?.(markerObjs[idx].marker);
        }
      }
      if (reduced) requestRender();
    };
    const onLeave = () => { parallax.tx = parallax.ty = 0; emitHover(-1); };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointerleave', onLeave);
    renderer.domElement.style.cursor = 'grab';

    // ---------- sizing / visibility ----------
    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      // keep the globe framed on narrow screens
      camera.position.z = w / h < 0.9 ? 10 : 8.4;
      camera.updateProjectionMatrix();
      requestRender();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); });
    io.observe(mount);

    // ---------- loop ----------
    const clock = new THREE.Clock();
    let elapsed = 0;
    let raf = 0;
    const dummy = new THREE.Object3D();
    const revealStart = performance.now();

    const frame = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!reduced) elapsed += dt;
      const t = elapsed;
      uniforms.uTime.value = t;
      const reveal = reduced ? 1 : Math.min(1, (performance.now() - revealStart) / 1600);
      const ease = 1 - Math.pow(1 - reveal, 3);
      uniforms.uReveal.value = ease;
      atmoUniforms.uReveal.value = ease;
      gratMat.opacity = 0.09 * ease;
      globe.scale.setScalar(0.88 + 0.12 * ease);

      // external focus request (e.g. list selection)
      if (focusRef.current.pending) {
        const m = markersRef.current.find((x) => x.id === focusRef.current.id);
        if (m) focusOn(m);
        focusRef.current.pending = false;
      }

      if (target.active) {
        const k = reduced ? 1 : 1 - Math.pow(0.02, dt);
        globe.rotation.y += (target.y - globe.rotation.y) * k;
        globe.rotation.x += (target.x - globe.rotation.x) * k;
        if (Math.abs(target.y - globe.rotation.y) < 0.001) target.active = false;
      } else if (!dragging && !reduced) {
        globe.rotation.y += 0.0009 + spinVel;
        spinVel *= 0.95;
      }

      parallax.x += (parallax.tx - parallax.x) * 0.04;
      parallax.y += (parallax.ty - parallax.y) * 0.04;
      camera.position.x = parallax.x;
      camera.position.y = 0.2 + parallax.y;
      camera.lookAt(0, 0, 0);

      for (const m of markerObjs) {
        const k = ((t * 0.6 + m.phase) % 1);
        m.ring.scale.setScalar(1 + k * 2.2);
        m.ringMat.opacity = (1 - k) * 0.8 * ease;
        m.dot.material = m.marker.id === focusRef.current.id ? dotMatActive : dotMat;
      }

      for (const j of jellies) {
        const pulse = (Math.sin(t * j.speed * 2 + j.phase) + 1) / 2;
        j.bellU.uPulse.value = pulse;
        j.bell.scale.set(1 + pulse * 0.12, 1 - pulse * 0.18, 1 + pulse * 0.12);
        j.group.position.set(
          j.base.x + Math.sin(t * 0.13 + j.phase) * 0.5,
          j.base.y + Math.sin(t * 0.21 + j.phase) * 0.35 + pulse * 0.06,
          j.base.z
        );
        j.group.rotation.z = Math.sin(t * 0.3 + j.phase) * 0.12;
        for (const line of j.tentacles) {
          const a = line.userData.angle as number;
          const arr = (line.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
          for (let s = 0; s < 18; s++) {
            const k = s / 17;
            const rad = 0.2 * (1 - k * 0.4) * (1 + pulse * 0.1);
            const sway = Math.sin(t * 1.6 - k * 5 + a * 2 + j.phase) * 0.08 * k;
            arr[s * 3] = Math.cos(a) * rad + sway;
            arr[s * 3 + 1] = -k * 0.95;
            arr[s * 3 + 2] = Math.sin(a) * rad + sway * 0.6;
          }
          line.geometry.attributes.position.needsUpdate = true;
        }
      }

      if (fish) {
        fishData.forEach((f, i) => {
          const a = t * f.speed + f.phase;
          const r = f.r + Math.sin(t * 0.5 + i) * 0.05;
          dummy.position.set(Math.cos(a) * r, 0.9 + f.y + Math.sin(a * 2 + i) * 0.08, Math.sin(a) * r);
          dummy.rotation.set(f.tilt, -a - Math.PI / 2 + Math.PI, Math.sin(t * 6 + i) * 0.15);
          dummy.updateMatrix();
          fish!.setMatrixAt(i, dummy.matrix);
        });
        fish.instanceMatrix.needsUpdate = true;
        fish.rotation.x = 0.35;
      }
      for (const [i, d] of dnaFragments.entries()) {
        d.rotation.y = t * (0.3 + i * 0.1);
        d.position.y += Math.sin(t * 0.4 + i) * 0.0008;
      }

      renderer.render(scene, camera);
    };

    let needsRender = true;
    function requestRender() {
      needsRender = true;
      if (!raf) raf = requestAnimationFrame(tick);
    }
    function tick() {
      raf = 0;
      frame();
      const intro = performance.now() - revealStart < 1700;
      if ((!reduced || target.active || intro) && visible && !document.hidden) raf = requestAnimationFrame(tick);
      needsRender = false;
    }
    function loop() { if (!raf) raf = requestAnimationFrame(tick); }
    const onVis = () => { if (!document.hidden) loop(); };
    document.addEventListener('visibilitychange', onVis);
    resize();
    loop();
    void needsRender;

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      dynamicDisposables.forEach((d) => d.dispose());
      disposables.forEach((d) => d.dispose());
      fish?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      rebuildRef.current = () => {};
    };
  }, [reduced, lite, organisms]);

  return <div ref={mountRef} className={`relative h-full w-full ${className}`} />;
}
