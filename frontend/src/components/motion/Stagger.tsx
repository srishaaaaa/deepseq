"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const itemVariantsStill = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};

function useReducedMotionFlag() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Parent for a one-time staggered entrance (hero copy, form fields) --
 * each direct `StaggerItem` child fades/slides in slightly after the
 * previous one instead of every element appearing at once. Runs once on
 * mount, not scroll-triggered (use `Reveal` for scroll-triggered
 * sections). Collapses to an instant, un-animated reveal under
 * prefers-reduced-motion. */
export function StaggerGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={containerVariants} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotionFlag();
  return (
    <motion.div className={className} variants={reduced ? itemVariantsStill : itemVariants}>
      {children}
    </motion.div>
  );
}
