'use client';

import { useState } from 'react';

// Reference taxonomy of the orca — standard, published classification used
// purely to explain ranks. It is not analysis output.
const RANKS = [
  { rank: 'Kingdom', name: 'Animalia', note: 'Multicellular organisms that feed on other organisms.' },
  { rank: 'Phylum', name: 'Chordata', note: 'Animals with a notochord at some stage of development.' },
  { rank: 'Class', name: 'Mammalia', note: 'DeepSeq reports a broad class (e.g. Mammal, Fish) for every identified taxon.' },
  { rank: 'Order', name: 'Artiodactyla', note: 'Includes whales and dolphins (infraorder Cetacea).' },
  { rank: 'Family', name: 'Delphinidae', note: 'Oceanic dolphins — the orca is the largest member.' },
  { rank: 'Genus', name: 'Orcinus', note: 'A genus with a single living species.' },
  { rank: 'Species', name: 'Orcinus orca', note: 'DeepSeq reports the species name and its read count. Sequences with no confident match are flagged as “Unclassified taxon”.' },
];

export default function Taxonomy() {
  const [active, setActive] = useState(6);
  const r = RANKS[active];
  return (
    <section className="relative mx-auto max-w-7xl px-6 py-28" aria-labelledby="tax-title">
      <div className="grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p data-reveal className="eyebrow">04 · Taxonomic classification</p>
          <h2 id="tax-title" data-reveal className="mt-5 text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-[1.04]">
            From a fragment to a name.
          </h2>
          <p data-reveal className="mt-6 max-w-md leading-relaxed text-mute">
            Classification places each sequence in the tree of life. Select a rank to see how a single species is
            described — and which levels DeepSeq reports today.
          </p>
          <p data-reveal className="mt-6 mono-meta">Reference example (orca) · not analysis output</p>
        </div>

        <div data-reveal className="panel p-5 sm:p-7">
          <ol role="tablist" aria-label="Taxonomic ranks" className="space-y-1.5">
            {RANKS.map((t, i) => {
              const on = i === active;
              const reported = t.rank === 'Class' || t.rank === 'Species';
              return (
                <li key={t.rank} style={{ paddingLeft: `${i * 0.9}rem` }}>
                  <button
                    role="tab"
                    aria-selected={on}
                    aria-controls="tax-panel"
                    onClick={() => setActive(i)}
                    className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-[background,border-color] duration-300 ${on ? 'border-biolum/60 bg-biolum/10' : 'border-transparent hover:border-line'}`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${reported ? 'bg-teal' : 'bg-mute/40'}`} aria-hidden />
                    <span className="w-16 shrink-0 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-mute">{t.rank}</span>
                    <span className={`truncate text-sm ${t.rank === 'Genus' || t.rank === 'Species' ? 'italic' : ''} ${on ? 'text-ink' : 'text-ink/75'}`}>{t.name}</span>
                    {reported && <span className="ml-auto hidden shrink-0 font-mono text-[0.6rem] tracking-widest text-teal sm:inline">REPORTED</span>}
                  </button>
                </li>
              );
            })}
          </ol>
          <div id="tax-panel" role="tabpanel" key={r.rank} className="mt-5 rounded-xl border border-line bg-abyss/40 p-4" style={{ animation: 'rise 0.45s var(--ease-abyss) both' }}>
            <p className="mono-meta">{r.rank}</p>
            <p className={`mt-1 font-display text-xl ${r.rank === 'Genus' || r.rank === 'Species' ? 'italic' : ''}`}>{r.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-mute">{r.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
