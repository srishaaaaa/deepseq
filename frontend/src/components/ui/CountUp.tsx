'use client';

import { useEffect, useRef, useState } from 'react';
import { useMotion } from '@/lib/motion';

/** Animates a real number from 0 to `value` once it scrolls into view. */
export default function CountUp({
  value,
  duration = 1400,
  format = (n: number) => Math.round(n).toLocaleString(),
  className = '',
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const { reduced } = useMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) { setN(value); return; }
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / duration);
        setN(value * (1 - Math.pow(1 - k, 4)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration, reduced]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`} aria-label={format(value)}>
      <span aria-hidden>{format(n)}</span>
    </span>
  );
}
