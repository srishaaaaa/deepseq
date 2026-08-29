"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

/** Subtle 3D perspective tilt following the cursor within the card's own
 * bounds -- desktop/pointer-fine only, and never more than a few degrees
 * (this decorates a content card, it shouldn't feel like a game). Springs
 * back to flat on pointer leave. No-ops entirely under
 * prefers-reduced-motion or on touch, where it just renders `children`
 * with no wrapper motion. */
export default function TiltCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [enabled, setEnabled] = useState(false);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const springX = useSpring(x, { stiffness: 200, damping: 20 });
  const springY = useSpring(y, { stiffness: 200, damping: 20 });
  const rotateX = useTransform(springY, [0, 1], [6, -6]);
  const rotateY = useTransform(springX, [0, 1], [-6, 6]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce) , (pointer: coarse)');
    setEnabled(!mq.matches);
    const onChange = () => setEnabled(!mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!enabled) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width);
        y.set((e.clientY - rect.top) / rect.height);
      }}
      onPointerLeave={() => {
        x.set(0.5);
        y.set(0.5);
      }}
    >
      {children}
    </motion.div>
  );
}
