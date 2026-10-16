'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi';
import { LogoMark } from '@/components/ui/Logo';

export default function AuthLayout({
  image,
  eyebrow,
  title,
  children,
  footer,
}: {
  image: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main id="main" className="grid min-h-[100svh] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <Image src={image} alt="" fill priority sizes="50vw" className="object-cover opacity-80" style={{ animation: 'fade 1.4s both' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-abyss/20 via-abyss/30 to-abyss" />
        <div className="absolute bottom-10 left-10 max-w-sm" style={{ animation: 'rise 1s 0.4s var(--ease-abyss) both' }}>
          <p className="eyebrow">DeepSeq</p>
          <p className="mt-3 font-display text-3xl leading-tight">Explore the invisible. Decode the ocean.</p>
        </div>
      </div>

      <div className="relative flex flex-col items-center justify-center px-6 py-16">
        <Link href="/" className="absolute left-6 top-6 inline-flex items-center gap-2 text-sm text-mute hover:text-ink">
          <FiArrowLeft aria-hidden /> Home
        </Link>
        <div className="w-full max-w-sm" style={{ animation: 'rise 0.8s var(--ease-abyss) both' }}>
          <div className="mb-10 flex items-center gap-3">
            <LogoMark className="h-10 w-10 text-ink" />
            <span className="font-display text-xl tracking-[0.2em]">DEEPSEQ</span>
          </div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-mute">{footer}</div>}
        </div>
      </div>
    </main>
  );
}

export function Field({ label, id, aside, ...rest }: { label: string; id: string; aside?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-sm text-ink/85">{label}</label>
        {aside}
      </div>
      <input id={id} name={id} className="field" {...rest} />
    </div>
  );
}

export function PasswordField({ label, id, autoComplete, placeholder, aside }: { label: string; id: string; autoComplete?: string; placeholder?: string; aside?: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-sm text-ink/85">{label}</label>
        {aside}
      </div>
      <div className="relative">
        <input id={id} name={id} type={visible ? 'text' : 'password'} autoComplete={autoComplete} required placeholder={placeholder} className="field !pr-11" />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-mute hover:text-ink"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <FiEyeOff aria-hidden /> : <FiEye aria-hidden />}
        </button>
      </div>
    </div>
  );
}
