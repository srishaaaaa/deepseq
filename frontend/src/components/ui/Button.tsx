'use client';

import Link from 'next/link';
import { forwardRef, useRef } from 'react';
import { useMotion } from '@/lib/motion';
import DnaSpinner from './DnaSpinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background,color,box-shadow,border-color,transform] duration-300 ease-[var(--ease-abyss)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 select-none';

const variants: Record<Variant, string> = {
  primary:
    'bg-biolum text-abyss px-6 py-3 shadow-[0_0_0_1px_rgba(65,232,255,0.4),0_10px_40px_-10px_rgba(65,232,255,0.6)] hover:bg-[#7ff0ff] hover:shadow-[0_0_0_1px_rgba(65,232,255,0.6),0_14px_50px_-8px_rgba(65,232,255,0.75)]',
  secondary:
    'border border-line-strong bg-navy/40 text-ink px-6 py-3 hover:border-biolum hover:bg-navy/70 hover:text-white',
  ghost: 'text-mute px-3 py-2 hover:text-ink hover:bg-white/5',
  danger: 'border border-danger/40 text-danger px-5 py-2.5 hover:bg-danger/10',
};

type CommonProps = {
  variant?: Variant;
  magnetic?: boolean;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Restrained "magnetic" pull toward the cursor; disabled under reduced motion. */
function useMagnet(enabled: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  const onMove = (e: React.PointerEvent) => {
    if (!enabled || e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * 0.18;
    const y = (e.clientY - (r.top + r.height / 2)) * 0.28;
    ref.current.style.transform = `translate(${x}px, ${y}px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = '';
  };
  return { ref, onMove, onLeave };
}

type ButtonProps = CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', magnetic = false, loading = false, className = '', children, disabled, ...rest },
  _ref
) {
  const { reduced } = useMotion();
  const m = useMagnet(magnetic && !reduced);
  return (
    <button
      ref={(el) => { m.ref.current = el; }}
      onPointerMove={m.onMove}
      onPointerLeave={m.onLeave}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading && <DnaSpinner size={16} />}
      {children}
    </button>
  );
});

type LinkButtonProps = CommonProps & { href: string; 'aria-label'?: string; download?: boolean };

export function LinkButton({ href, variant = 'primary', magnetic = false, className = '', children, ...rest }: LinkButtonProps) {
  const { reduced } = useMotion();
  const m = useMagnet(magnetic && !reduced);
  const cls = `${base} ${variants[variant]} ${className}`;
  if (rest.download || href.startsWith('http') || href.endsWith('.fasta')) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href}
      ref={(el) => { m.ref.current = el; }}
      onPointerMove={m.onMove}
      onPointerLeave={m.onLeave}
      className={cls}
      aria-label={rest['aria-label']}
    >
      {children}
    </Link>
  );
}
