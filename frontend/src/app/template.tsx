"use client";

import { motion, useReducedMotion } from 'motion/react';
import { usePathname } from 'next/navigation';

/** Next.js remounts `template.tsx` (unlike layout.tsx, which persists) on
 * every route change, which is what makes a per-navigation enter
 * animation possible here with no changes needed on any individual page.
 * `key={pathname}` is the actual trigger -- without it, React would treat
 * a navigation between two routes using this same template as an update,
 * not a fresh mount, and the animation would only fire once ever. This is
 * an enter transition only; Next.js's App Router swaps the old page out
 * immediately on navigation (no built-in "keep the outgoing page around
 * to animate it out" hook the way client-side routers with animated exits
 * need), so there's no matching exit fade -- still a real, felt
 * improvement over an instant cut, just not a two-sided crossfade. */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  if (reduced) return <>{children}</>;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
