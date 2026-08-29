"use client";

/** Decorative animated double-helix for the auth panels. Pure SVG + CSS
 * (no WebGL) so login/signup/reset stay light -- the immersive 3D globe is
 * reserved for the homepage hero. Positions are computed once from a sine
 * function; the "rotation" is a CSS rotateY on the whole flat plane inside
 * a perspective wrapper, which reads as genuine depth as the strands
 * compress/expand through the turn. */
const RUNG_COUNT = 18;

// Math.sin/cos aren't guaranteed bit-identical across JS engine builds --
// Node's SSR and the browser's V8 can disagree in the last binary digit
// of a transcendental function's result, which is enough for React's
// hydration check to flag a mismatch on the rendered attribute string
// (e.g. 32.36860279185589 vs 32.368602791855885) even though the two
// numbers are visually identical. Rounding to a fixed precision makes
// the server and client always serialize to the exact same string.
const round = (n: number) => Math.round(n * 10000) / 10000;

const RUNGS = Array.from({ length: RUNG_COUNT }, (_, i) => {
  const y = round((i / (RUNG_COUNT - 1)) * 440 + 20);
  const phase = (i / RUNG_COUNT) * Math.PI * 4;
  return {
    y,
    xa: round(80 + Math.sin(phase) * 55),
    xb: round(80 - Math.sin(phase) * 55),
  };
});

export default function DnaHelix() {
  return (
    <div className="[perspective:900px]" aria-hidden="true">
      <svg
        viewBox="0 0 160 480"
        className="h-[420px] w-auto origin-center animate-[dna-spin_16s_linear_infinite] motion-reduce:animate-none"
      >
        <defs>
          <linearGradient id="dna-strand-a" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="dna-strand-b" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        {RUNGS.map((r, i) => (
          <g key={i}>
            <line x1={r.xa} y1={r.y} x2={r.xb} y2={r.y} stroke="rgba(148,163,184,0.22)" strokeWidth="1.5" />
            <circle cx={r.xa} cy={r.y} r="4.5" fill="url(#dna-strand-a)" />
            <circle cx={r.xb} cy={r.y} r="4.5" fill="url(#dna-strand-b)" />
          </g>
        ))}
      </svg>
    </div>
  );
}
