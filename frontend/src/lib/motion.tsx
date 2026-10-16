'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type MotionPref = 'system' | 'reduced' | 'full';
export type QualityPref = 'auto' | 'low' | 'high';

type MotionCtx = {
  /** true when the OS asks for reduced motion OR the user toggled it in-app */
  reduced: boolean;
  pref: MotionPref;
  setPref: (p: MotionPref) => void;
  /** lighter 3D (fewer particles/organisms, lower pixel ratio) */
  lite: boolean;
  /** what "auto" resolved to on this device */
  autoLite: boolean;
  quality: QualityPref;
  setQuality: (q: QualityPref) => void;
};

const Ctx = createContext<MotionCtx>({
  reduced: false, pref: 'system', setPref: () => {}, lite: false, autoLite: false, quality: 'auto', setQuality: () => {},
});

const MOTION_KEY = 'deepseq.motion';
const QUALITY_KEY = 'deepseq.quality';

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<MotionPref>('system');
  const [quality, setQualityState] = useState<QualityPref>('auto');
  const [osReduced, setOsReduced] = useState(false);
  const [autoLite, setAutoLite] = useState(false);

  useEffect(() => {
    try {
      const m = localStorage.getItem(MOTION_KEY);
      if (m === 'reduced' || m === 'full') setPrefState(m);
      const q = localStorage.getItem(QUALITY_KEY);
      if (q === 'low' || q === 'high') setQualityState(q);
    } catch {}
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setOsReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setOsReduced(e.matches);
    mq.addEventListener('change', onChange);

    // Adaptive quality: phones/tablets, low core counts and low device memory get the lighter scene.
    const cores = navigator.hardwareConcurrency ?? 8;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const small = window.innerWidth < 1024;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    setAutoLite(cores <= 4 || memory <= 4 || small || coarse);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const reduced = pref === 'reduced' || (pref === 'system' && osReduced);
  const lite = quality === 'low' || (quality === 'auto' && autoLite);

  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  }, [reduced]);

  const setPref = useCallback((p: MotionPref) => {
    setPrefState(p);
    try {
      if (p === 'system') localStorage.removeItem(MOTION_KEY);
      else localStorage.setItem(MOTION_KEY, p);
    } catch {}
  }, []);

  const setQuality = useCallback((q: QualityPref) => {
    setQualityState(q);
    try {
      if (q === 'auto') localStorage.removeItem(QUALITY_KEY);
      else localStorage.setItem(QUALITY_KEY, q);
    } catch {}
  }, []);

  return (
    <Ctx.Provider value={{ reduced, pref, setPref, lite, autoLite, quality, setQuality }}>{children}</Ctx.Provider>
  );
}

export const useMotion = () => useContext(Ctx);
