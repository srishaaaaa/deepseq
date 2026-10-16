'use client';

import { useEffect, useState } from 'react';
import type { AbundanceItem, ClassSlice } from '@/lib/analysis';
import { pct } from '@/lib/analysis';

export const CATEGORICAL = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)'];
export const OTHER = 'var(--cat-other)';

/** Colour follows the entity (fixed by its original order), never its rank after filtering. */
export function colorFor(index: number) {
  return index < CATEGORICAL.length ? CATEGORICAL[index] : OTHER;
}

function useMounted(delay = 60) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setM(true), delay);
    return () => clearTimeout(id);
  }, [delay]);
  return m;
}

/* ---------------- Horizontal abundance bars (single series → single hue, no legend) ---------------- */
export function AbundanceBars({
  items,
  total,
  highlight,
}: {
  items: AbundanceItem[];
  total: number;
  highlight?: (species: string) => boolean;
}) {
  const mounted = useMounted();
  const [tip, setTip] = useState<{ item: AbundanceItem; x: number; y: number } | null>(null);
  const max = Math.max(...items.map((i) => i.relative_abundance), 0.0001);

  if (!items.length) {
    return <p className="py-10 text-center text-sm text-mute">No taxa match the current filter.</p>;
  }

  return (
    <div className="relative" onPointerLeave={() => setTip(null)}>
      <ul className="space-y-2.5" aria-label="Relative abundance by taxon">
        {items.map((item, i) => {
          const dim = highlight && !highlight(item.species);
          const w = (item.relative_abundance / max) * 100;
          return (
            <li
              key={item.species}
              tabIndex={0}
              className={`group grid grid-cols-[minmax(0,11rem)_1fr_4.5rem] items-center gap-3 rounded-lg px-1 py-1 outline-none transition-opacity sm:grid-cols-[minmax(0,15rem)_1fr_5rem] ${dim ? 'opacity-35' : ''}`}
              onPointerMove={(e) => {
                const r = (e.currentTarget.closest('.relative') as HTMLElement).getBoundingClientRect();
                setTip({ item, x: e.clientX - r.left, y: e.clientY - r.top });
              }}
              onFocus={(e) => {
                const r = (e.currentTarget.closest('.relative') as HTMLElement).getBoundingClientRect();
                const b = e.currentTarget.getBoundingClientRect();
                setTip({ item, x: b.left - r.left + b.width / 2, y: b.top - r.top });
              }}
              onBlur={() => setTip(null)}
            >
              <span className="truncate text-sm italic text-ink/90 group-focus-visible:text-biolum" title={item.species}>{item.species}</span>
              <span className="relative h-3 rounded-r-[4px] bg-line/40">
                <span
                  className="absolute inset-y-0 left-0 rounded-r-[4px] bg-biolum transition-[width] duration-1000 ease-[var(--ease-abyss)] group-hover:bg-[#7ff0ff]"
                  style={{ width: mounted ? `${Math.max(w, 0.6)}%` : '0%', transitionDelay: `${i * 40}ms` }}
                />
              </span>
              <span className="text-right font-mono text-xs tabular-nums text-ink/80">{pct(item.relative_abundance)}</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 grid grid-cols-[minmax(0,11rem)_1fr_4.5rem] gap-3 sm:grid-cols-[minmax(0,15rem)_1fr_5rem]" aria-hidden>
        <span />
        <span className="flex justify-between font-mono text-[0.65rem] text-mute"><span>0%</span><span>{pct(max, 0)}</span></span>
        <span />
      </div>
      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[115%] whitespace-nowrap rounded-xl border border-line-strong bg-midnight/95 px-3 py-2 shadow-xl"
          style={{ left: tip.x, top: tip.y }}
        >
          <p className="text-sm italic">{tip.item.species}</p>
          <p className="mono-meta mt-1">
            {tip.item.count.toLocaleString()} of {total.toLocaleString()} reads · {pct(tip.item.relative_abundance, 2)}
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------------- Part-to-whole composition (stacked 100% bar + legend + direct labels) ---------------- */
export function CompositionBar({
  slices,
  active,
  onToggle,
}: {
  slices: ClassSlice[];
  active: string | null;
  onToggle: (name: string | null) => void;
}) {
  const mounted = useMounted(120);
  const [tip, setTip] = useState<{ s: ClassSlice; x: number } | null>(null);
  if (!slices.length) return <p className="py-6 text-sm text-mute">No classification data.</p>;

  // >5 classes fold into "Other" (never generate a 6th hue)
  const shown = slices.slice(0, 5);
  const rest = slices.slice(5);
  const all: (ClassSlice & { color: string })[] = shown.map((s, i) => ({ ...s, color: colorFor(i) }));
  if (rest.length) {
    all.push({
      name: 'Other',
      count: rest.reduce((a, b) => a + b.count, 0),
      fraction: rest.reduce((a, b) => a + b.fraction, 0),
      species: rest.flatMap((r) => r.species),
      color: OTHER,
    });
  }

  return (
    <div className="relative">
      <div className="flex h-10 w-full gap-[2px] overflow-hidden rounded-[6px]" onPointerLeave={() => setTip(null)}>
        {all.map((s) => (
          <button
            key={s.name}
            type="button"
            aria-pressed={active === s.name}
            aria-label={`${s.name}: ${pct(s.fraction)} of reads. Click to filter.`}
            onClick={() => onToggle(active === s.name ? null : s.name)}
            onPointerMove={(e) => {
              const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
              setTip({ s, x: e.clientX - r.left });
            }}
            className={`relative h-full transition-[flex-grow,opacity,filter] duration-1000 ease-[var(--ease-abyss)] hover:brightness-125 ${active && active !== s.name ? 'opacity-30' : ''}`}
            style={{ flexGrow: mounted ? Math.max(s.fraction, 0.004) : 0.001, flexBasis: 0, background: s.color }}
          >
            {s.fraction >= 0.12 && (
              <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-medium text-abyss">{pct(s.fraction, 0)}</span>
            )}
          </button>
        ))}
      </div>
      {tip && (
        <div role="tooltip" className="pointer-events-none absolute -top-2 z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl border border-line-strong bg-midnight/95 px-3 py-2" style={{ left: tip.x }}>
          <p className="text-sm">{tip.s.name}</p>
          <p className="mono-meta mt-1">{tip.s.count.toLocaleString()} reads · {pct(tip.s.fraction, 2)} · {tip.s.species.length} taxa</p>
        </div>
      )}
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2" aria-label="Legend">
        {all.map((s) => (
          <li key={s.name}>
            <button
              type="button"
              onClick={() => onToggle(active === s.name ? null : s.name)}
              aria-pressed={active === s.name}
              className={`flex items-center gap-2 rounded-md text-sm transition-opacity ${active && active !== s.name ? 'opacity-45' : ''}`}
            >
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden />
              <span className="text-ink/90">{s.name}</span>
              <span className="font-mono text-xs text-mute">{pct(s.fraction)}</span>
            </button>
          </li>
        ))}
        {active && (
          <li>
            <button type="button" onClick={() => onToggle(null)} className="text-sm text-biolum link-underline">Clear filter</button>
          </li>
        )}
      </ul>
    </div>
  );
}
