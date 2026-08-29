"use client";

import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import DnaHelix from './DnaHelix';

// Same lazy/SSR-disabled pattern as the homepage hero -- kept out of the
// auth pages' initial bundle, and trimmed to ambiance-only ("light"
// variant: a couple of jellyfish + particles, no fish school/cursor rig)
// since the DNA helix, not the ocean, is this panel's focal point.
const OceanScene = dynamic(() => import('@/components/ocean/OceanScene'), { ssr: false });

const LOGO = (
  <svg className="h-7 w-7 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.592 1M12 8c-.112 0-.224.016-.335.035M2.004 15.197a4.5 4.5 0 011.026-.06C6.11 14.885 8.761 14 12 14c3.239 0 5.89.884 8.97.944a4.5 4.5 0 011.026.06l-.412 1.633a9.75 9.75 0 01-18.128 0l-.412-1.633zM12 21c-3.132 0-6.104-.633-8.875-1.761M12 21c3.132 0 6.104-.633 8.875-1.761M12 21v-3"
    />
  </svg>
);

/** Shared shell for every auth screen (login/signup/forgot/reset): an
 * immersive dark-ocean panel with the DNA motif on the left, and the
 * actual form -- unchanged auth logic, just restyled -- on the right.
 * Each page keeps owning its own state/handlers/Supabase calls; this only
 * supplies the layout around them. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full bg-brand-950 text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950" />
        <div className="absolute top-0 left-1/3 h-[30rem] w-[30rem] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[26rem] w-[26rem] rounded-full bg-violet-500/10 blur-[110px]" />
      </div>

      {/* Left: immersive panel, desktop only */}
      <div className="relative z-10 hidden w-1/2 flex-col justify-between overflow-hidden border-r border-white/5 p-10 lg:flex">
        <div className="absolute inset-0 z-0">
          <OceanScene variant="light" />
        </div>

        <Link href="/" className="relative z-10 inline-flex w-fit items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white">
          <FiArrowLeft /> Back to home
        </Link>

        <div className="relative z-10 flex flex-1 items-center justify-center">
          <DnaHelix />
        </div>

        <div className="relative z-10">
          <div className="mb-3 flex items-center gap-2">
            {LOGO}
            <span className="text-xl font-bold tracking-wide">DEEPSEQ</span>
          </div>
          <p className="max-w-sm text-sm text-slate-400">
            AI-powered eDNA biodiversity intelligence — linking environmental
            DNA to known marine species, and flagging what&apos;s still unknown.
          </p>
        </div>
      </div>

      {/* Right: form */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center p-6 lg:w-1/2">
        {/* Mobile-only compact header, since the left panel is hidden below lg */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          {LOGO}
          <span className="text-xl font-bold tracking-wide">DEEPSEQ</span>
        </div>
        <div className="w-full max-w-sm animate-fade-in">{children}</div>
      </div>
    </div>
  );
}
