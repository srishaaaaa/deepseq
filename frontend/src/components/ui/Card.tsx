"use client";

import { createElement } from 'react';
import type { HTMLAttributes, ElementType } from 'react';

type Padding = 'sm' | 'md' | 'lg';

const PADDING_CLASSES: Record<Padding, string> = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export type CardProps = {
  as?: ElementType;
  interactive?: boolean;
  padding?: Padding;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

/** Shared elevated-surface wrapper for the stat-card / panel pattern used
 * throughout the app (dashboard stat cards, explore sidebar panels, report
 * sections, etc.). Presentation only -- never owns data or handlers. */
export default function Card({
  as: Tag = 'div',
  interactive = false,
  padding = 'md',
  className = '',
  children,
  ...rest
}: CardProps) {
  const classes = [
    'rounded-(--radius-card) bg-gray-800/80 border border-gray-700/60 shadow-(--shadow-card)',
    PADDING_CLASSES[padding],
    interactive
      ? 'transition-[background-color,border-color,transform,box-shadow] duration-200 ease-out ' +
        'hover:bg-gray-700/60 hover:border-gray-600/70 hover:-translate-y-0.5 hover:shadow-(--shadow-elevated) ' +
        'active:translate-y-0 active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0 cursor-pointer'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Plain createElement instead of JSX here: with a generic ElementType
  // tag, TS's JSX overload resolution gets ambiguous about which
  // intrinsic-element props apply (surfaced once @react-three/fiber's
  // global JSX augmentation joined the program) and rejects the spread.
  // createElement's typing is more permissive and behaves identically.
  return createElement(Tag, { className: classes, ...rest }, children);
}
