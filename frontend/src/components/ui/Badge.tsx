"use client";

import type { HTMLAttributes } from 'react';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type Size = 'sm' | 'md';

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-success-500/15 text-success-400',
  warning: 'bg-warning-500/15 text-warning-400',
  danger: 'bg-danger-500/15 text-danger-400',
  info: 'bg-info-500/15 text-info-400',
  neutral: 'bg-gray-500/15 text-gray-300',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-[11px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export type BadgeProps = {
  tone?: Tone;
  size?: Size;
  className?: string;
} & HTMLAttributes<HTMLSpanElement>;

/** Small pill for status/classification/confidence labels (report,
 * explore legend, globe side panel, history "shared" indicator). */
export default function Badge({
  tone = 'neutral',
  size = 'md',
  className = '',
  children,
  ...rest
}: BadgeProps) {
  const classes = [
    'inline-flex items-center rounded-(--radius-pill) font-semibold',
    TONE_CLASSES[tone],
    SIZE_CLASSES[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}

/** Maps a 0-1 confidence score to the same green/yellow/red tone convention
 * already used ad hoc across report/page.tsx, share/[id]/page.tsx, and
 * globe/page.tsx -- centralizing the thresholds so all three stay in sync. */
export function confidenceTone(value: number): Tone {
  if (value >= 0.7) return 'success';
  if (value >= 0.4) return 'warning';
  return 'danger';
}
