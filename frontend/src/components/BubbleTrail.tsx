"use client";

import { useEffect, useRef } from "react";

interface Bubble {
  x: number;
  y: number;
  size: number;
  alpha: number;
  hue: number;
  velocity: { x: number; y: number };
}

// Same visual design as before (gradient fill, outline, highlight, hue
// range, fade/shrink physics) -- only the perf bugs are fixed:
//  1. Spawning was unthrottled (one bubble per raw mousemove event, which
//     fires 60-120+/s), so fast mouse movement could spawn dozens of
//     bubbles in a fraction of a second. Now gated by distance moved.
//  2. `bubbles.splice(index, 1)` inside a `forEach` mutates the array
//     mid-iteration -- it shifts every later index down by one, so
//     forEach silently skips the element that just moved into the
//     current slot. Dead bubbles lingered instead of being removed on
//     schedule, compounding #1. Now a plain reverse for-loop.
//  3. A radial gradient was recreated from scratch for every bubble on
//     every single frame -- the actual expensive part once the count
//     crept up from #1+#2. A hard cap on live bubbles bounds the worst case.
// 6px felt like a visible lag behind the actual cursor at normal
// movement speed -- 2px keeps the trail spawning close to continuously
// without going back to the original unthrottled-per-event bug (still a
// real gate, just not a coarse one). MAX_BUBBLES raised to match since
// bubbles now spawn more often; the cap still bounds worst-case cost by
// dropping the oldest bubble rather than growing unbounded.
const SPAWN_MIN_DISTANCE = 2; // px of mouse movement between spawns
const MAX_BUBBLES = 120;

const BubbleCursor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let bubbles: Bubble[] = [];
    let lastSpawn = { x: -Infinity, y: -Infinity };

    function makeBubble(x: number, y: number): Bubble {
      return {
        x,
        y,
        size: Math.random() * 12 + 3,
        alpha: 0.7,
        hue: Math.random() * 60 + 180, // bluish tones
        velocity: {
          x: (Math.random() - 0.5) * 1.5,
          y: Math.random() * -2 - 0.5,
        },
      };
    }

    function updateBubble(b: Bubble) {
      b.x += b.velocity.x;
      b.y += b.velocity.y;
      b.velocity.y *= 0.99; // gentle slowdown
      b.alpha *= 0.98;
      b.size *= 0.99;
    }

    function drawBubble(b: Bubble) {
      ctx!.save();
      ctx!.globalCompositeOperation = "screen";

      const gradient = ctx!.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size);
      gradient.addColorStop(0, `hsla(${b.hue}, 100%, 70%, 0)`);
      gradient.addColorStop(0.5, `hsla(${b.hue}, 100%, 70%, ${b.alpha * 0.1})`);
      gradient.addColorStop(1, `hsla(${b.hue}, 100%, 70%, 0)`);

      ctx!.fillStyle = gradient;
      ctx!.beginPath();
      ctx!.arc(b.x, b.y, b.size * 1.5, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.strokeStyle = `hsla(${b.hue}, 100%, 70%, ${b.alpha})`;
      ctx!.lineWidth = 0.5;
      ctx!.beginPath();
      ctx!.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.arc(b.x - b.size * 0.3, b.y - b.size * 0.3, b.size * 0.2, 0, Math.PI * 2);
      ctx!.fillStyle = `hsla(${b.hue}, 100%, 90%, ${b.alpha * 0.5})`;
      ctx!.fill();

      ctx!.restore();
    }

    const handleMouseMove = (event: MouseEvent) => {
      const dx = event.clientX - lastSpawn.x;
      const dy = event.clientY - lastSpawn.y;
      if (dx * dx + dy * dy < SPAWN_MIN_DISTANCE * SPAWN_MIN_DISTANCE) return;
      lastSpawn = { x: event.clientX, y: event.clientY };
      if (bubbles.length >= MAX_BUBBLES) bubbles.shift(); // drop oldest, not newest
      bubbles.push(makeBubble(event.clientX + 5, event.clientY + 5));
    };

    let rafId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Reverse loop so removing a dead bubble never skips its neighbor
      // (the splice-inside-forEach bug this replaces).
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        updateBubble(b);
        if (b.alpha <= 0.05) {
          bubbles.splice(i, 1);
          continue;
        }
        drawBubble(b);
      }
      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafId);
      bubbles = [];
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 9999 }}
    />
  );
};

export default BubbleCursor;
