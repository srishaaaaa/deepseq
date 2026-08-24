"use client";

import { useEffect, useRef } from "react";

interface Bubble {
  x: number;
  y: number;
  size: number;
  alpha: number;
  hue: number;
  velocity: { x: number; y: number };
  update: () => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

const BubbleCursor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const bubbles: Bubble[] = [];
    const mouse = { x: 0, y: 0 };

    class BubbleClass implements Bubble {
      x: number;
      y: number;
      size: number;
      alpha: number;
      hue: number;
      velocity: { x: number; y: number };

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 12 + 3;
        this.alpha = 0.7;
        this.hue = Math.random() * 60 + 180; // bluish tones
        this.velocity = {
          x: (Math.random() - 0.5) * 1.5,
          y: Math.random() * -2 - 0.5,
        };
      }

      update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.velocity.y *= 0.99; // gentle slowdown
        this.alpha *= 0.98;
        this.size *= 0.99;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";

        // Radial gradient fill
        const gradient = ctx.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          this.size
        );
        gradient.addColorStop(0, `hsla(${this.hue}, 100%, 70%, 0)`);
        gradient.addColorStop(0.5, `hsla(${this.hue}, 100%, 70%, ${this.alpha * 0.1})`);
        gradient.addColorStop(1, `hsla(${this.hue}, 100%, 70%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Bubble outline
        ctx.strokeStyle = `hsla(${this.hue}, 100%, 70%, ${this.alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.stroke();

        // Highlight inside bubble
        ctx.beginPath();
        ctx.arc(
          this.x - this.size * 0.3,
          this.y - this.size * 0.3,
          this.size * 0.2,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `hsla(${this.hue}, 100%, 90%, ${this.alpha * 0.5})`;
        ctx.fill();

        ctx.restore();
      }
    }

    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      bubbles.push(new BubbleClass(mouse.x + 5, mouse.y + 5));
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      bubbles.forEach((bubble, index) => {
        bubble.update();
        bubble.draw(ctx);
        if (bubble.alpha <= 0.05) bubbles.splice(index, 1);
      });
      requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
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
