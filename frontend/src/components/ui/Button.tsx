"use client";

import Link from 'next/link';
import { FiLoader } from 'react-icons/fi';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactElement } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
type Size = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-400 focus-visible:ring-brand-400 disabled:bg-gray-500',
  secondary:
    'bg-gray-700/70 text-white hover:bg-gray-600/80 focus-visible:ring-gray-400 disabled:bg-gray-700/40 disabled:text-gray-400',
  danger:
    'bg-danger-500 text-white hover:bg-red-500 focus-visible:ring-danger-400 disabled:bg-gray-500',
  ghost:
    'bg-transparent text-slate-300 hover:bg-white/10 hover:text-white focus-visible:ring-brand-400',
  link:
    'bg-transparent text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline focus-visible:ring-brand-400 px-0 py-0',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
  lg: 'text-base px-6 py-2.5 gap-2.5',
};

const BASE_CLASSES =
  'inline-flex items-center justify-center rounded-(--radius-control) font-medium ' +
  'transition-[background-color,color,transform,box-shadow] duration-150 ease-out ' +
  'active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ' +
  'disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100';

type CommonProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactElement;
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: undefined };

type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/** Shared action control. Renders a native <button>, or a next/link-backed
 * anchor when `href` is passed -- covers both call-site shapes already used
 * across the app (onClick handlers and Link-styled-as-button). */
export default function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    fullWidth = false,
    className = '',
    children,
    ...rest
  } = props;

  const classes = [
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    variant !== 'link' ? SIZE_CLASSES[size] : 'gap-1.5',
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {loading ? <FiLoader className="animate-spin" /> : icon}
      {children}
    </>
  );

  if ('href' in props && props.href !== undefined) {
    const { href, ...anchorRest } = rest as Omit<ButtonAsLink, keyof CommonProps>;
    return (
      <Link href={href} className={classes} {...anchorRest}>
        {content}
      </Link>
    );
  }

  const buttonRest = rest as Omit<ButtonAsButton, keyof CommonProps>;
  return (
    <button className={classes} disabled={loading || buttonRest.disabled} {...buttonRest}>
      {content}
    </button>
  );
}
