'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useMotion } from '@/lib/motion';

/**
 * Persistent underwater atmosphere rendered behind every page:
 *  - 3 parallax layers of suspended particles (2D canvas, cheap)
 *  - occasional bioluminescent flashes
 *  - faint drifting current lines
 *  - CSS light beam, caustics and a distant whale silhouette
 * Pauses when the tab is hidden; draws a single static frame under reduced motion.
 */
export default function AmbientOcean() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const depthRef = useRef<HTMLSpanElement>(null);
  const { reduced, lite } = useMotion();
  const showDepth = usePathname() === '/';

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const count = lite ? 70 : 160;
    type P = { x: number; y: number; z: number; r: number; vx: number; vy: number; tw: number };
    const ps: P[] = Array.from({ length: count }, () => {
      const z = Math.random(); // 0 far → 1 near
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        z,
        r: 0.4 + z * 1.6,
        vx: (Math.random() - 0.5) * 0.08 * (0.3 + z),
        vy: -(0.04 + Math.random() * 0.12) * (0.3 + z),
        tw: Math.random() * Math.PI * 2,
      };
    });
    type Flash = { x: number; y: number; life: number; max: number };
    const flashes: Flash[] = [];
    const currents = Array.from({ length: lite ? 3 : 6 }, (_, i) => ({
      y: (i + 1) / 7,
      amp: 20 + Math.random() * 40,
      phase: Math.random() * 10,
      speed: 0.00006 + Math.random() * 0.00008,
    }));

    let scrollY = window.scrollY;
    const onScroll = () => {
      scrollY = window.scrollY;
      if (depthRef.current) {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        // Decorative depth readout mapped to scroll progress (0 → 4,000 m).
        depthRef.current.textContent = `${Math.round((scrollY / max) * 4000).toLocaleString()} m`;
      }
    };
    onScroll();

    let raf = 0;
    let running = true;
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);

      // current lines
      ctx.lineWidth = 1;
      for (const c of currents) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 24) {
          const y = c.y * h + Math.sin(x * 0.004 + c.phase + t * c.speed * 6) * c.amp - (scrollY * 0.05) % h;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(65,232,255,0.035)';
        ctx.stroke();
      }

      // particles
      for (const p of ps) {
        if (!reduced) {
          p.x += p.vx;
          p.y += p.vy;
          p.tw += 0.02;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
        }
        const py = (p.y - scrollY * 0.08 * p.z + h * 10) % (h + 20);
        const a = (0.12 + p.z * 0.4) * (0.7 + 0.3 * Math.sin(p.tw));
        ctx.beginPath();
        ctx.arc(p.x, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.z > 0.85 ? `rgba(0,213,192,${a})` : `rgba(180,230,255,${a})`;
        ctx.fill();
      }

      // rare bioluminescent flashes
      if (!reduced && Math.random() < 0.006 && flashes.length < 3) {
        flashes.push({ x: Math.random() * w, y: Math.random() * h, life: 0, max: 90 + Math.random() * 60 });
      }
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.life++;
        const k = Math.sin((f.life / f.max) * Math.PI);
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 26);
        g.addColorStop(0, `rgba(65,232,255,${0.5 * k})`);
        g.addColorStop(1, 'rgba(65,232,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(f.x - 26, f.y - 26, 52, 52);
        if (f.life >= f.max) flashes.splice(i, 1);
      }

      if (running && !reduced) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const onVis = () => {
      running = !document.hidden;
      cancelAnimationFrame(raf);
      if (running) raf = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reduced, lite]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* depth gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_-10%,#0a2a45_0%,#061525_38%,#030810_75%)]" />
      {/* light beam */}
      <div
        className="absolute -top-1/4 left-[8%] h-[150%] w-[38%] origin-top bg-[linear-gradient(180deg,rgba(65,232,255,0.16),rgba(65,232,255,0)_70%)] blur-3xl"
        style={{ animation: 'beam 14s ease-in-out infinite' }}
      />
      {/* caustics */}
      <div
        className="absolute -inset-[10%] opacity-[0.07] mix-blend-screen"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 18% 9% at 20% 30%, #41e8ff 0, transparent 70%), radial-gradient(ellipse 12% 7% at 70% 20%, #00d5c0 0, transparent 70%), radial-gradient(ellipse 20% 8% at 50% 60%, #41e8ff 0, transparent 70%), radial-gradient(ellipse 10% 6% at 85% 75%, #2678ff 0, transparent 70%)',
          animation: 'caustics 22s ease-in-out infinite',
        }}
      />
      {/* distant whale silhouette (humpback-like profile with fluke) */}
      <svg
        viewBox="0 0 520 160"
        className="absolute top-[58%] w-[38vw] min-w-[260px] opacity-[0.08]"
        style={{ animation: 'drift 160s linear infinite' }}
      >
        <path
          fill="#8ca6b9"
          d="M20 88c18-26 62-44 120-50 70-7 150 2 214 20 34 10 60 20 84 34l40-34c10-8 22-6 18 6l-12 28 30 10c10 4 6 14-6 14l-44-2c-26 18-70 32-130 38-40 4-74 4-104 0l-30 22c-6 5-14 2-10-6l10-22c-40-8-80-20-112-34C26 106 14 98 20 88z"
        />
        <path fill="#8ca6b9" d="M196 118c10 10 26 18 44 22-12 2-30-2-44-10z" />
      </svg>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(3,8,16,0.85)_100%)]" />
      {/* depth indicator */}
      <div className={`absolute bottom-6 right-6 hidden items-center gap-3 ${showDepth ? 'md:flex' : ''}`}>
        <span className="mono-meta">DEPTH</span>
        <span className="h-px w-10 bg-line-strong" />
        <span ref={depthRef} className="font-mono text-xs text-biolum/80 tabular-nums">0 m</span>
      </div>
    </div>
  );
}
