"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  FiHome,
  FiInfo,
  FiHelpCircle,
  FiArrowRight,
  FiUploadCloud,
  FiCpu,
  FiGlobe,
  FiFileText,
  FiDatabase,
  FiShare2,
  FiActivity,
} from 'react-icons/fi';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import AppNavbar from '@/components/nav/AppNavbar';
import Reveal from '@/components/motion/Reveal';
import Magnetic from '@/components/motion/Magnetic';
import TiltCard from '@/components/motion/TiltCard';
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger';
import { useClickRipples, RippleLayer } from '@/components/motion/useClickRipples';
import HeroGlobe from '@/components/globe/HeroGlobe';
import { isLoggedIn, getCurrentUser, getUsername, logout } from '@/lib/api';

// R3F/three pull in a sizeable chunk -- keep it out of the initial page
// bundle and off the server render entirely, same as HeroGlobe's own
// dynamic import of react-globe.gl.
const OceanScene = dynamic(() => import('@/components/ocean/OceanScene'), { ssr: false });

const PILLARS = [
  {
    icon: <FiDatabase className="h-6 w-6" />,
    title: 'eDNA sequencing',
    body: 'Upload raw environmental DNA reads (.fasta / .fastq) collected from water, sediment, or tissue samples — no lab pipeline of your own required.',
  },
  {
    icon: <FiCpu className="h-6 w-6" />,
    title: 'AI species identification',
    body: 'Each sequence is matched against a curated reference set with a k-mer nearest-neighbor classifier — the same core technique behind BLAST/vsearch — and scored with a confidence value.',
  },
  {
    icon: <FiGlobe className="h-6 w-6" />,
    title: 'Geographic intelligence',
    body: 'Identified species are plotted using real GBIF occurrence records where available, so biodiversity hotspots reflect actual observation data, not guesses.',
  },
];

const PIPELINE = [
  { icon: <FiUploadCloud />, title: 'Upload sample', body: 'Drop in one or more .fasta/.fastq files, or batch several to compare sites.' },
  { icon: <FiCpu />, title: 'Sequence classification', body: 'A k-mer nearest-neighbor classifier scores each read against the reference library.' },
  { icon: <FiActivity />, title: 'Biodiversity summary', body: 'Species counts, classification breakdown, and confidence are compiled per sample.' },
  { icon: <FiGlobe />, title: 'Geographic mapping', body: 'Confident hits are located on the globe using real GBIF occurrence data.' },
  { icon: <FiFileText />, title: 'Report & history', body: 'Results are saved to your account and exportable as PDF, CSV, or GeoJSON.' },
  { icon: <FiShare2 />, title: 'Share (optional)', body: 'Publish a read-only link to a specific analysis for collaborators.' },
];

const TECH = [
  { title: 'k-mer nearest-neighbor classifier', body: 'Real sequence classification, not a lookup table — every result is computed from the uploaded reads.' },
  { title: 'GBIF occurrence data', body: 'Species distribution points are sourced from the Global Biodiversity Information Facility when a match is available.' },
  { title: 'Supabase-backed accounts', body: 'Auth, row-level-security-protected history, and live updates — your analyses sync the moment they finish.' },
  { title: 'PDF / CSV / GeoJSON export', body: 'Take a finished report out of DeepSeq in the format your workflow already uses.' },
];

export default function HomePage() {
  const router = useRouter();
  // null = still checking; avoids flashing the logged-out nav for a
  // signed-in visitor while the session check resolves.
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const loggedIn = await isLoggedIn();
      setAuthed(loggedIn);
      if (loggedIn) {
        setUsername(getUsername(await getCurrentUser()));
      }
    })();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const primaryHref = authed ? '/upload' : '/signup';
  const primaryLabel = authed ? 'Start an analysis' : 'Explore DeepSeq';
  const { ripples, onPointerDown: onHeroPointerDown } = useClickRipples();

  const pipelineSectionRef = useRef<HTMLDivElement>(null);
  const pipelineLineRef = useRef<HTMLDivElement>(null);

  // The connector line between pipeline steps draws in as the section
  // scrolls through view (scrub: true ties progress directly to scroll
  // position, not time) -- a literal visualization of "step by step."
  // gsap/ScrollTrigger are imported dynamically here rather than at module
  // scope: this effect only fires once the pipeline section exists in the
  // DOM (well below the fold), so there's no reason to pay for the library
  // in the page's initial bundle.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!pipelineSectionRef.current || !pipelineLineRef.current) return;

    let ctx: { revert: () => void } | undefined;
    let cancelled = false;

    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ default: gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        gsap.fromTo(
          pipelineLineRef.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            transformOrigin: 'top center',
            scrollTrigger: {
              trigger: pipelineSectionRef.current,
              start: 'top 70%',
              end: 'bottom 60%',
              scrub: 0.4,
            },
          }
        );
      });
    });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-brand-950 text-white">
      {/* Ambient deep-ocean backdrop: layered radial glows, pure CSS so it
          costs nothing beyond the WebGL layer on top of it. A lighter
          cyan wash near the top fading to near-black at the bottom stands
          in for light attenuating with depth -- shallow water reads
          brighter/bluer, the deep reads darker, the way real water does. */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a2540] via-brand-900 to-[#020617]" />
        <div className="absolute inset-x-0 top-0 h-[60vh] bg-gradient-to-b from-cyan-500/10 to-transparent" />
        {/* Caustics: two slowly-drifting soft light patches, out of phase,
            standing in for sunlight refracting through a moving surface. */}
        <div
          className="animate-caustic-a absolute inset-0 opacity-[0.15] mix-blend-screen"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(103,232,249,0.5) 0%, transparent 45%), radial-gradient(circle, rgba(94,234,212,0.4) 0%, transparent 40%)',
            backgroundSize: '55% 55%, 40% 40%',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div
          className="animate-caustic-b absolute inset-0 opacity-[0.12] mix-blend-screen"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(56,189,248,0.4) 0%, transparent 42%), radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 38%)',
            backgroundSize: '48% 48%, 35% 35%',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="absolute -top-40 left-1/4 h-[36rem] w-[36rem] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute top-[40vh] right-0 h-[28rem] w-[28rem] rounded-full bg-violet-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[24rem] w-[24rem] rounded-full bg-teal-500/10 blur-[100px]" />
      </div>

      {/* Living ocean, spanning the whole page (fixed, not scoped to the
          hero) -- fish, sharks, jellyfish, marine snow, and a drifting DNA
          trail stay visible as you scroll through every section. Sits
          behind all content (z-[1], above the CSS gradient at z-0) and
          never intercepts clicks/scroll. */}
      <div className="pointer-events-none fixed inset-0 z-[1]">
        <OceanScene />
      </div>

      {/* Nav -- signed-in visitors get the real app nav (with logout)
          instead of the public marketing nav, so landing back on Home no
          longer looks like they were signed out. */}
      {authed ? (
        <div className="relative z-20">
          <AppNavbar username={username} onLogout={handleLogout} />
        </div>
      ) : (
        <header className="relative z-20 border-b border-white/5 bg-brand-950/70 backdrop-blur-md">
          <nav className="container mx-auto flex items-center justify-between p-4">
            <Link href="/" className="flex items-center space-x-2">
              <svg className="h-8 w-8 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.592 1M12 8c-.112 0-.224.016-.335.035M2.004 15.197a4.5 4.5 0 011.026-.06C6.11 14.885 8.761 14 12 14c3.239 0 5.89.884 8.97.944a4.5 4.5 0 011.026.06l-.412 1.633a9.75 9.75 0 01-18.128 0l-.412-1.633zM12 21c-3.132 0-6.104-.633-8.875-1.761M12 21c3.132 0 6.104-.633 8.875-1.761M12 21v-3"></path></svg>
              <span className="text-xl font-bold tracking-wide">DEEPSEQ</span>
            </Link>

            <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
              <Link href="/" className="flex items-center border-b-2 border-cyan-300 pb-1 font-semibold text-cyan-200"><FiHome className="mr-1.5" />Home</Link>
              <Link href="/about" className="flex items-center pb-1 transition-colors hover:text-cyan-200"><FiInfo className="mr-1.5" />About us</Link>
              <Link href="/help" className="flex items-center pb-1 transition-colors hover:text-cyan-200"><FiHelpCircle className="mr-1.5" />Help</Link>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm text-slate-300 transition-colors hover:text-white">Log in</Link>
              <Button href="/signup" size="sm" className="rounded-(--radius-pill)">Sign up</Button>
            </div>
          </nav>
        </header>
      )}

      {/* Hero */}
      <main className="relative z-10">
        <section
          onPointerDown={onHeroPointerDown}
          className="relative container mx-auto grid min-h-[calc(100vh-72px)] grid-cols-1 items-center gap-8 overflow-hidden px-4 py-12 md:grid-cols-2 md:gap-4"
        >
          <RippleLayer ripples={ripples} />

          <StaggerGroup className="relative z-10 order-2 md:order-1">
            <StaggerItem>
              <p className="mb-4 inline-flex items-center rounded-(--radius-pill) border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium tracking-wide text-cyan-200">
                eDNA-powered biodiversity intelligence
              </p>
            </StaggerItem>
            <StaggerItem>
              <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                DEEP<span className="text-cyan-300">SEQ</span>
              </h1>
            </StaggerItem>
            <StaggerItem>
              <p className="mt-6 max-w-lg text-lg text-slate-300">
                An AI platform that links environmental DNA to known fish and
                marine species — and flags unknown signatures, surfacing
                undiscovered biodiversity in the deep sea.
              </p>
            </StaggerItem>
            <StaggerItem className="mt-8 flex flex-wrap items-center gap-3">
              <Magnetic>
                <Button href={primaryHref} size="lg" className="rounded-(--radius-pill)">
                  {primaryLabel} <FiArrowRight className="ml-1 h-5 w-5" />
                </Button>
              </Magnetic>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-(--radius-pill) border border-white/15 px-6 py-2.5 text-base text-slate-200 transition-colors hover:border-cyan-300/50 hover:text-white"
              >
                See how it works
              </a>
            </StaggerItem>
          </StaggerGroup>

          <Reveal delay={120} className="relative z-10 order-1 md:order-2">
            <HeroGlobe />
          </Reveal>
        </section>

        {/* What is DeepSeq */}
        <section className="container mx-auto px-4 py-20">
          <Reveal>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">What is DeepSeq?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">
              Three real, working pieces — sequencing input, an AI classifier,
              and geographic grounding — combined into one biodiversity
              intelligence workflow.
            </p>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 100}>
                <TiltCard>
                  <Card interactive padding="lg" className="h-full border-white/10 bg-white/[0.03]">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-(--radius-control) bg-cyan-400/10 text-cyan-300">
                      {p.icon}
                    </div>
                    <h3 className="text-lg font-semibold">{p.title}</h3>
                    <p className="mt-2 text-sm text-slate-400">{p.body}</p>
                  </Card>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="container mx-auto px-4 py-20">
          <Reveal>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">How DeepSeq works</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">
              The real pipeline behind every analysis, start to finish.
            </p>
          </Reveal>

          <div ref={pipelineSectionRef} className="relative mt-14">
            <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-white/[0.06] md:block" />
            <div
              ref={pipelineLineRef}
              className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-cyan-400 via-cyan-400/70 to-transparent md:block"
            />
            <div className="space-y-6 md:space-y-10">
              {PIPELINE.map((step, i) => (
                <Reveal key={step.title} delay={i * 80}>
                  <div className={`flex items-center gap-5 md:w-1/2 ${i % 2 === 1 ? 'md:ml-auto md:flex-row-reverse md:text-right' : ''}`}>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-brand-900 text-cyan-300">
                      {step.icon}
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400/80">Step {i + 1}</div>
                      <h3 className="text-base font-semibold">{step.title}</h3>
                      <p className="mt-1 text-sm text-slate-400">{step.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Globe callout */}
        <section className="container mx-auto px-4 py-20">
          <Reveal>
            <Card padding="lg" className="grid grid-cols-1 items-center gap-8 border-white/10 bg-white/[0.03] md:grid-cols-2">
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">Your results, on the globe</h2>
                <p className="mt-3 text-slate-400">
                  Every analysis renders as an interactive 3D globe — rotate,
                  zoom, and select a species to see its real occurrence
                  hotspots, sourced from GBIF where data exists. It's built
                  on the same globe shown here, just populated with your own
                  results.
                </p>
                <Button href={primaryHref} className="mt-6 rounded-(--radius-pill)">
                  {authed ? 'Run a new analysis' : 'Create an account'} <FiArrowRight className="ml-1 h-5 w-5" />
                </Button>
              </div>
              <div className="w-full rounded-(--radius-card) border border-white/10 bg-gradient-to-br from-brand-900 to-brand-950 p-6">
                <div className="relative mx-auto aspect-square w-full max-w-[280px]">
                  <HeroGlobe />
                </div>
                <p className="mt-2 flex items-start gap-2 text-sm text-slate-400">
                  <FiGlobe className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                  Species distribution, confidence scores, and coordinate
                  source (GBIF, file metadata, or simulated) all appear
                  alongside the map once you upload a sample.
                </p>
              </div>
            </Card>
          </Reveal>
        </section>

        {/* Technology */}
        <section className="container mx-auto px-4 py-20">
          <Reveal>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">Under the hood</h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {TECH.map((t, i) => (
              <Reveal key={t.title} delay={i * 80}>
                <TiltCard>
                  <Card padding="lg" className="h-full border-white/10 bg-white/[0.03]">
                    <h3 className="text-base font-semibold text-cyan-200">{t.title}</h3>
                    <p className="mt-2 text-sm text-slate-400">{t.body}</p>
                  </Card>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-24 text-center">
          <Reveal>
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to explore the unseen?</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              Upload a sample and see what's actually in the water.
            </p>
            <Button href={primaryHref} size="lg" className="mt-8 rounded-(--radius-pill)">
              {primaryLabel} <FiArrowRight className="ml-1 h-5 w-5" />
            </Button>
          </Reveal>
        </section>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/5 py-8">
          <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 md:flex-row">
            <span>© {new Date().getFullYear()} DeepSeq</span>
            <div className="flex gap-6">
              <Link href="/about" className="hover:text-slate-300">About us</Link>
              <Link href="/help" className="hover:text-slate-300">Help</Link>
              {authed ? (
                <Link href="/dashboard" className="hover:text-slate-300">Dashboard</Link>
              ) : (
                <Link href="/login" className="hover:text-slate-300">Log in</Link>
              )}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
