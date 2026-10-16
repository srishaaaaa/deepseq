import Link from 'next/link';

/** DeepSeq mark: two counter-phased strands forming a helix inside a sonar ring. */
export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeOpacity="0.35" />
      <path d="M11 5c10 5 0 17 10 22" fill="none" stroke="#41E8FF" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 5c-10 5 0 17-10 22" fill="none" stroke="#00D5C0" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.8" />
      {[9, 13.5, 18.5, 23].map((y, i) => (
        <line key={y} x1="12.5" x2="19.5" y1={y} y2={y} stroke="#EAF7FF" strokeOpacity={i % 2 ? 0.35 : 0.6} strokeWidth="1.2" />
      ))}
    </svg>
  );
}

export default function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5" aria-label="DeepSeq home">
      <span className="transition-transform duration-700 ease-[var(--ease-abyss)] group-hover:rotate-[180deg]">
        <LogoMark />
      </span>
      <span className="font-display text-lg font-semibold tracking-[0.18em] text-ink">DEEPSEQ</span>
    </Link>
  );
}
