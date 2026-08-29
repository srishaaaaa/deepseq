"use client";

import { useEffect, useRef, useState } from 'react';
import { animate, useMotionValue } from 'motion/react';

export type CountUpProps = {
  value: number;
  duration?: number;
  formatter?: (n: number) => string;
};

const defaultFormatter = (n: number) => Math.round(n).toLocaleString();

/** Animates a number counting up to its real value on mount/change --
 * never invents the number, just eases the reveal of one already computed
 * from real data (dashboard/analytics stat cards). Snaps straight to the
 * final value under prefers-reduced-motion instead of animating. */
export default function CountUp({ value, duration = 1.1, formatter = defaultFormatter }: CountUpProps) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(() => formatter(0));
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (reducedRef.current) {
      setDisplay(formatter(value));
      return;
    }
    const controls = animate(motionValue, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(formatter(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span>{display}</span>;
}
