/** Morphing double-helix loading indicator (pure CSS/SVG). */
export default function DnaSpinner({ size = 24, label }: { size?: number; label?: string }) {
  const rungs = 6;
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        {Array.from({ length: rungs }, (_, i) => {
          const y = 3 + i * 3.6;
          return (
            <g key={i} style={{ transformOrigin: '12px 12px', animation: `helixSpin 1.4s ${i * -0.18}s ease-in-out infinite` }}>
              <line x1="5" x2="19" y1={y} y2={y} stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2" />
              <circle cx="5" cy={y} r="1.6" fill="#41E8FF" />
              <circle cx="19" cy={y} r="1.6" fill="#00D5C0" />
            </g>
          );
        })}
      </svg>
      {label && <span className="text-sm text-mute">{label}</span>}
    </span>
  );
}
