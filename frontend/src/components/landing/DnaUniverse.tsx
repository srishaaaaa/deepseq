'use client';

import { useState } from 'react';
import { HelixStage, type HelixHover } from '@/components/three/Stages';
import { DEMO_STRAND, NUCLEOTIDE_COLORS } from '@/components/viz/nucleotides';

const LEGEND: [string, string][] = [
  ['A', 'Adenine'],
  ['T', 'Thymine'],
  ['G', 'Guanine'],
  ['C', 'Cytosine'],
];

export default function DnaUniverse() {
  const [hover, setHover] = useState<HelixHover>(null);
  return (
    <section id="science" className="relative mx-auto max-w-7xl scroll-mt-24 px-6 py-28" aria-labelledby="dna-title">
      <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div data-reveal>
          <p className="eyebrow">03 · The DNA universe</p>
          <h2 id="dna-title" className="mt-5 text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-[1.02]">
            Four letters. <span className="text-mute">Every lineage in the sea.</span>
          </h2>
          <p className="mt-6 max-w-md leading-relaxed text-mute">
            DNA is a double helix of paired nucleotides — adenine with thymine, guanine with cytosine. Short
            fragments shed into seawater are enough to tell which organisms were nearby. DeepSeq reads those
            fragments in FASTA format and compares them against reference taxa.
          </p>
          <ul className="mt-8 grid max-w-sm grid-cols-2 gap-3" aria-label="Nucleotide colour legend">
            {LEGEND.map(([b, name]) => (
              <li key={b} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-md font-mono text-sm font-semibold text-ink"
                  style={{ background: `${NUCLEOTIDE_COLORS[b]}55`, boxShadow: `inset 0 0 0 1px ${NUCLEOTIDE_COLORS[b]}` }}
                >
                  {b}
                </span>
                <span className="text-sm text-ink/85">{name}</span>
              </li>
            ))}
          </ul>
        </div>

        <div data-reveal className="panel relative h-[460px] overflow-hidden sm:h-[540px]" style={{ ['--reveal-delay' as string]: '120ms' }}>
          <HelixStage sequence={DEMO_STRAND} maxBases={90} onHover={setHover} />
          <div className="pointer-events-none absolute left-4 top-4">
            <p className="mono-meta !text-biolum/80">ILLUSTRATIVE STRAND · {DEMO_STRAND.length} bp (90 shown)</p>
            <p className="mono-meta mt-1">Drag to rotate · hover a base to inspect</p>
          </div>
          {hover && (
            <div
              className="pointer-events-none absolute z-10 rounded-xl border border-line-strong bg-midnight/90 px-3 py-2"
              style={{ left: hover.x + 14, top: hover.y + 14 }}
            >
              <p className="font-mono text-sm">
                <span style={{ color: NUCLEOTIDE_COLORS[hover.base] }}>{hover.base}</span>
                <span className="text-mute"> ⟷ </span>
                <span style={{ color: NUCLEOTIDE_COLORS[hover.pair] }}>{hover.pair}</span>
              </p>
              <p className="mono-meta">position {hover.index + 1}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
