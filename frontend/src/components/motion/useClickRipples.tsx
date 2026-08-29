"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

type Ripple = { id: number; x: number; y: number };

/** Click-triggered water-ripple feedback for a section. Attach
 * `onPointerDown` to a `position: relative` container and render
 * `<RippleLayer ripples={ripples} />` inside it. Purely additive -- never
 * calls preventDefault/stopPropagation, so real buttons/links underneath
 * keep working exactly as before; this only decorates the click. */
export function useClickRipples() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const idRef = useRef(0);
  const enabledRef = useRef(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    enabledRef.current = !mq.matches;
    const onChange = () => { enabledRef.current = !mq.matches; };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (!enabledRef.current || e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const id = idRef.current++;
    setRipples((prev) => [
      ...prev,
      { id, x: e.clientX - rect.left, y: e.clientY - rect.top },
    ]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 900);
  }, []);

  return { ripples, onPointerDown };
}

export function RippleLayer({ ripples }: { ripples: Ripple[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full border border-cyan-300/50 animate-[water-ripple_900ms_ease-out_forwards]"
          style={{ left: r.x, top: r.y, width: 12, height: 12, marginLeft: -6, marginTop: -6 }}
        />
      ))}
    </div>
  );
}
