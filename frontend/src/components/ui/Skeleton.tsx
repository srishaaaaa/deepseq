"use client";

import type { HTMLAttributes } from 'react';

type Variant = 'text' | 'card' | 'avatar' | 'row';

const VARIANT_CLASSES: Record<Variant, string> = {
  text: 'h-4 rounded',
  card: 'h-24 rounded-(--radius-card)',
  avatar: 'h-10 w-10 rounded-full',
  row: 'h-14 rounded-(--radius-control)',
};

export type SkeletonProps = {
  variant?: Variant;
  count?: number;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

const SHIMMER_STYLE = {
  backgroundImage:
    'linear-gradient(90deg, rgba(148,163,184,0.08) 25%, rgba(148,163,184,0.18) 37%, rgba(148,163,184,0.08) 63%)',
  backgroundSize: '400% 100%',
};

/** Placeholder used only where a page already gates on its own `loading`
 * boolean -- swaps the old bare `<FiLoader /> Loading...` line for a shape
 * that matches the real content, without introducing any new loading state. */
export default function Skeleton({ variant = 'text', count = 1, className = '', ...rest }: SkeletonProps) {
  return (
    <div className="space-y-2" {...rest}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-shimmer bg-gray-700/50 ${VARIANT_CLASSES[variant]} ${className}`}
          style={SHIMMER_STYLE}
        />
      ))}
    </div>
  );
}
