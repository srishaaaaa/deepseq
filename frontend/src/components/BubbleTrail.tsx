"use client";

import { useEffect, useRef } from "react";
import { useMotion } from "@/lib/motion";

/**
 * Subtle bioluminescent particle trail that follows the mouse.
 * Disabled for reduced motion and touch/pen input; idles (no rAF) when no
 * particles are alive.
 */
const BubbleTrail = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { reduced } = useMotion();

  useEffect(() => {
    if (reduced || window.matchMedia("(pointer: coarse)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    type B = { x: number; y: number; r: number; a: number; vx: number; vy: number };
    let bubbles: B[] = [];
    let raf = 0;
    let last = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      bubbles = bubbles.filter((b) => b.a > 0.03);
      for (const b of bubbles) {
        b.x += b.vx;
        b.y += b.vy;
        b.a *= 0.955;
        b.r *= 0.985;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(65,232,255,${b.a})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      raf = bubbles.length ? requestAnimationFrame(animate) : 0;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const now = performance.now();
      if (now - last < 40) return; // throttle spawn rate
      last = now;
      bubbles.push({
        x: e.clientX + (Math.random() - 0.5) * 6,
        y: e.clientY + 4,
        r: 1.5 + Math.random() * 3.5,
        a: 0.45,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.4 - Math.random() * 0.8,
      });
      if (!raf) raf = requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, [reduced]);

  if (reduced) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 h-full w-full"
      style={{ zIndex: 60 }}
    />
  );
};

export default BubbleTrail;
