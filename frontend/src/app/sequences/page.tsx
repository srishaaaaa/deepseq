"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { FiCopy, FiCheck, FiSearch, FiUploadCloud, FiInfo } from 'react-icons/fi';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { HelixStage, type HelixHover } from '@/components/three/Stages';
import { LinkButton } from '@/components/ui/Button';
import DnaSpinner from '@/components/ui/DnaSpinner';
import { NUCLEOTIDE_COLORS } from '@/components/viz/nucleotides';
import { composition, gcContent, loadSequences, pct, type StoredSequences } from '@/lib/analysis';

const LINE = 60; // bases per rendered line
const ROW_H = 26; // px per sequence line
const REC_H = 58; // px per record row

/** Minimal fixed-height windowing for long lists. */
function useWindow(count: number, rowH: number, overscan = 6) {
  const ref = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ start: 0, end: 30 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const start = Math.max(0, Math.floor(el.scrollTop / rowH) - overscan);
      const end = Math.min(count, Math.ceil((el.scrollTop + el.clientHeight) / rowH) + overscan);
      setRange({ start, end });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, [count, rowH, overscan]);
  return { ref, ...range };
}

export default function SequencesPage() {
  const [data, setData] = useState<StoredSequences | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(0);
  const [motif, setMotif] = useState('');
  const [copied, setCopied] = useState(false);
  const [helixHover, setHelixHover] = useState<HelixHover>(null);
  const [windowStart, setWindowStart] = useState(0);

  useEffect(() => { setData(loadSequences()); setLoaded(true); }, []);

  const records = useMemo(() => {
    if (!data) return [];
    return data.records.map((r, i) => {
      const c = composition(r.sequence);
      return { ...r, i, len: r.sequence.length, gc: gcContent(c), comp: c };
    });
  }, [data]);

  const visibleRecords = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? records.filter((r) => r.header.toLowerCase().includes(q)) : records;
  }, [records, filter]);

  const rec = records[selected];
  const seq = rec?.sequence.toUpperCase() ?? '';

  // motif matches (A/C/G/T/N only, case-insensitive, overlapping)
  const cleanMotif = motif.toUpperCase().replace(/[^ACGTUN]/g, '');
  const matches = useMemo(() => {
    if (!cleanMotif || cleanMotif.length < 2 || !seq) return [] as number[];
    const out: number[] = [];
    let i = seq.indexOf(cleanMotif);
    while (i !== -1 && out.length < 5000) { out.push(i); i = seq.indexOf(cleanMotif, i + 1); }
    return out;
  }, [seq, cleanMotif]);
  const matchSet = useMemo(() => {
    const s = new Set<number>();
    for (const m of matches) for (let k = 0; k < cleanMotif.length; k++) s.add(m + k);
    return s;
  }, [matches, cleanMotif]);

  useEffect(() => { setWindowStart(matches[0] ? Math.max(0, matches[0] - 10) : 0); }, [matches, selected]);

  const lines = Math.ceil(seq.length / LINE);
  const seqWin = useWindow(lines, ROW_H);
  const recWin = useWindow(visibleRecords.length, REC_H);

  // sliding-window GC profile
  const gcProfile = useMemo(() => {
    if (seq.length < 20) return [];
    const win = Math.max(10, Math.floor(seq.length / 60));
    const step = Math.max(1, Math.floor(win / 2));
    const pts: { pos: number; gc: number }[] = [];
    for (let s = 0; s + win <= seq.length; s += step) {
      const g = gcContent(composition(seq.slice(s, s + win)));
      if (g != null) pts.push({ pos: s + win / 2, gc: g });
    }
    return pts;
  }, [seq]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`>${rec.header}\n${rec.sequence}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  if (!loaded) {
    return <WorkspaceShell title="Sequence Explorer"><div className="flex h-[50vh] items-center justify-center"><DnaSpinner size={32} /></div></WorkspaceShell>;
  }

  if (!data || !records.length) {
    return (
      <WorkspaceShell title="Sequence Explorer">
        <div className="mx-auto mt-16 max-w-lg text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-line-strong bg-midnight"><FiUploadCloud className="text-biolum" aria-hidden /></span>
          <h2 className="mt-5 text-2xl font-medium">No sequences on this device yet</h2>
          <p className="mt-2 text-mute">
            The explorer reads the FASTA file from your most recent upload in this browser. Saved history entries contain
            analysis results only, not the raw sequences.
          </p>
          <div className="mt-8"><LinkButton href="/upload">Upload a FASTA file</LinkButton></div>
        </div>
      </WorkspaceShell>
    );
  }

  const helixSeq = seq.slice(windowStart, windowStart + 80);
  const firstMatchInWindow = matches.find((m) => m >= windowStart && m < windowStart + 80);

  return (
    <WorkspaceShell title="Sequence Explorer" subtitle={`${data.filename} · ${data.totalRecords.toLocaleString()} records`}>
      {data.truncated && (
        <p className="mx-auto mb-4 flex max-w-7xl items-center gap-2 rounded-xl border border-warn/30 bg-warn/5 px-4 py-2 text-sm text-ink/85">
          <FiInfo className="text-warn" aria-hidden /> Showing the first {records.length.toLocaleString()} of {data.totalRecords.toLocaleString()} records (browser storage limit).
        </p>
      )}
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[320px_1fr]">
        {/* Record list */}
        <section className="panel flex max-h-[44svh] min-h-[240px] flex-col overflow-hidden xl:max-h-[78svh] xl:min-h-[320px]" aria-label="Records">
          <div className="border-b border-line p-3">
            <label className="relative block">
              <span className="sr-only">Search record headers</span>
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search headers…" className="field !rounded-full !py-2 !pl-9 text-sm" />
            </label>
            <p className="mono-meta mt-2">{visibleRecords.length.toLocaleString()} shown</p>
          </div>
          <div ref={recWin.ref} className="relative flex-1 overflow-y-auto scrollbar-thin" role="listbox" aria-label="FASTA records">
            <div style={{ height: visibleRecords.length * REC_H }}>
              {visibleRecords.slice(recWin.start, recWin.end).map((r, k) => {
                const active = r.i === selected;
                return (
                  <button
                    key={r.i}
                    role="option"
                    aria-selected={active}
                    onClick={() => setSelected(r.i)}
                    className={`absolute inset-x-2 flex flex-col justify-center rounded-lg px-3 text-left transition-colors ${active ? 'bg-biolum/10' : 'hover:bg-white/[0.04]'}`}
                    style={{ top: (recWin.start + k) * REC_H + 4, height: REC_H - 6 }}
                  >
                    <span className={`truncate font-mono text-xs ${active ? 'text-biolum' : 'text-ink/90'}`}>&gt;{r.header}</span>
                    <span className="mono-meta !text-[0.62rem]">{r.len.toLocaleString()} bp · GC {r.gc == null ? 'n/a' : pct(r.gc)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="min-w-0 space-y-6">
          {/* Stats + composition */}
          <section className="panel p-5" aria-labelledby="rec-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mono-meta">Record {selected + 1}</p>
                <h2 id="rec-title" className="mt-1 break-all font-mono text-sm text-ink">&gt;{rec.header}</h2>
              </div>
              <button onClick={copy} className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-mute hover:border-biolum hover:text-ink" aria-live="polite">
                {copied ? <><FiCheck className="text-teal" aria-hidden /> Copied</> : <><FiCopy aria-hidden /> Copy FASTA</>}
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Stat k="Length" v={`${rec.len.toLocaleString()} bp`} />
              <Stat k="GC content" v={rec.gc == null ? 'n/a' : pct(rec.gc)} hint="over A/C/G/T bases" />
              <Stat k="Ambiguous (N / other)" v={(rec.comp.N + rec.comp.other).toLocaleString()} />
            </div>
            <div className="mt-5" aria-label="Base composition">
              <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-[4px]">
                {(['A', 'T', 'G', 'C'] as const).map((b) => (
                  <span key={b} style={{ flexGrow: rec.comp[b], flexBasis: 0, background: NUCLEOTIDE_COLORS[b] }} />
                ))}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {(['A', 'T', 'G', 'C'] as const).map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: NUCLEOTIDE_COLORS[b] }} aria-hidden />
                    <span className="font-mono">{b}</span>
                    <span className="font-mono text-xs text-mute">{rec.comp[b].toLocaleString()} ({rec.len ? pct(rec.comp[b] / rec.len) : '0%'})</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <div className="grid gap-6 2xl:grid-cols-2">
            {/* GC profile */}
            <section className="panel p-5" aria-labelledby="gc-title">
              <h2 id="gc-title" className="text-base font-medium">GC content along the sequence</h2>
              {gcProfile.length > 1 ? <GcChart pts={gcProfile} len={seq.length} /> : <p className="mt-4 text-sm text-mute">Sequence too short for a sliding-window profile (needs ≥ 20 bp).</p>}
            </section>

            {/* Helix */}
            <section className="panel relative h-[340px] overflow-hidden" aria-label="3D helix of the selected region">
              <HelixStage
                sequence={helixSeq}
                maxBases={80}
                highlight={firstMatchInWindow != null ? [firstMatchInWindow - windowStart, firstMatchInWindow - windowStart + cleanMotif.length - 1] : null}
                onHover={setHelixHover}
              />
              <p className="pointer-events-none absolute left-4 top-3 mono-meta">
                3D VIEW · bases {(windowStart + 1).toLocaleString()}–{Math.min(seq.length, windowStart + 80).toLocaleString()}
              </p>
              {helixHover && (
                <div className="pointer-events-none absolute z-10 rounded-lg border border-line-strong bg-midnight/95 px-2.5 py-1.5 font-mono text-xs" style={{ left: helixHover.x + 12, top: helixHover.y + 12 }}>
                  {helixHover.base}·{helixHover.pair} @ {(windowStart + helixHover.index + 1).toLocaleString()}
                </div>
              )}
            </section>
          </div>

          {/* Sequence viewer */}
          <section className="panel overflow-hidden" aria-labelledby="seq-title">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
              <h2 id="seq-title" className="text-base font-medium">Sequence</h2>
              <div className="flex flex-wrap items-center gap-3">
                <label className="relative">
                  <span className="sr-only">Find motif</span>
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden />
                  <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Find motif, e.g. GATTACA" className="field !w-56 !rounded-full !py-1.5 !pl-9 font-mono text-xs uppercase" />
                </label>
                <span className="mono-meta" aria-live="polite">{cleanMotif.length >= 2 ? `${matches.length.toLocaleString()} match${matches.length === 1 ? '' : 'es'}` : 'min 2 bases'}</span>
                {matches.length > 0 && (
                  <button
                    className="rounded-full border border-line px-3 py-1 text-xs text-mute hover:text-ink"
                    onClick={() => {
                      const next = matches.find((m) => m > windowStart + 10) ?? matches[0];
                      setWindowStart(Math.max(0, next - 10));
                      seqWin.ref.current?.scrollTo({ top: Math.floor(next / LINE) * ROW_H, behavior: 'smooth' });
                    }}
                  >
                    Next match
                  </button>
                )}
              </div>
            </div>
            <div ref={seqWin.ref} className="relative max-h-[420px] overflow-auto scrollbar-thin" aria-label="Sequence lines">
              <div style={{ height: lines * ROW_H, minWidth: 'max-content' }}>
                {Array.from({ length: Math.max(0, seqWin.end - seqWin.start) }, (_, k) => {
                  const ln = seqWin.start + k;
                  const start = ln * LINE;
                  const chunk = seq.slice(start, start + LINE);
                  return (
                    <div key={ln} className="absolute left-0 flex items-center gap-4 px-4 font-mono text-[13px]" style={{ top: ln * ROW_H, height: ROW_H }}>
                      <span className="w-14 shrink-0 text-right text-[11px] text-mute tabular-nums">{(start + 1).toLocaleString()}</span>
                      <span className="tracking-[0.12em]">
                        {[...chunk].map((b, j) => {
                          const hit = matchSet.has(start + j);
                          return (
                            <span
                              key={j}
                              className={hit ? 'rounded-[2px] bg-discovery/25 text-discovery' : ''}
                              style={hit ? undefined : { color: NUCLEOTIDE_COLORS[b] ?? '#8ca6b9' }}
                            >
                              {b}{(j + 1) % 10 === 0 ? ' ' : ''}
                            </span>
                          );
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
          <p className="text-xs text-mute">All statistics on this page are computed in your browser from the uploaded file. Quality scores are not shown because the current pipeline accepts FASTA only.</p>
        </div>
      </div>
    </WorkspaceShell>
  );
}

function Stat({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line px-4 py-3">
      <p className="mono-meta">{k}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{v}</p>
      {hint && <p className="text-[0.7rem] text-mute">{hint}</p>}
    </div>
  );
}

/** Single-series line chart with crosshair tooltip. */
function GcChart({ pts, len }: { pts: { pos: number; gc: number }[]; len: number }) {
  const W = 600, H = 180, P = { l: 36, r: 10, t: 12, b: 24 };
  const [hover, setHover] = useState<number | null>(null);
  const x = (p: number) => P.l + (p / len) * (W - P.l - P.r);
  const y = (g: number) => P.t + (1 - g) * (H - P.t - P.b);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.pos).toFixed(1)},${y(p.gc).toFixed(1)}`).join('');
  const area = `${d}L${x(pts[pts.length - 1].pos)},${y(0)}L${x(pts[0].pos)},${y(0)}Z`;
  const h = hover != null ? pts[hover] : null;
  return (
    <div className="relative mt-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`GC content profile across ${len} bases`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const pos = ((px - P.l) / (W - P.l - P.r)) * len;
          let best = 0;
          pts.forEach((p, i) => { if (Math.abs(p.pos - pos) < Math.abs(pts[best].pos - pos)) best = i; });
          setHover(best);
        }}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="gcfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#41E8FF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#41E8FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((g) => (
          <g key={g}>
            <line x1={P.l} x2={W - P.r} y1={y(g)} y2={y(g)} stroke="#8ca6b9" strokeOpacity="0.15" />
            <text x={P.l - 6} y={y(g) + 3} textAnchor="end" fontSize="10" fill="#8ca6b9" fontFamily="var(--font-mono)">{g * 100}%</text>
          </g>
        ))}
        <text x={W - P.r} y={H - 6} textAnchor="end" fontSize="10" fill="#8ca6b9" fontFamily="var(--font-mono)">{len.toLocaleString()} bp</text>
        <text x={P.l} y={H - 6} fontSize="10" fill="#8ca6b9" fontFamily="var(--font-mono)">1</text>
        <path d={area} fill="url(#gcfill)" />
        <path d={d} fill="none" stroke="#41E8FF" strokeWidth="2" strokeLinejoin="round" />
        {h && (
          <g>
            <line x1={x(h.pos)} x2={x(h.pos)} y1={P.t} y2={H - P.b} stroke="#eaf7ff" strokeOpacity="0.3" />
            <circle cx={x(h.pos)} cy={y(h.gc)} r="4" fill="#41E8FF" stroke="#061525" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && (
        <div className="pointer-events-none absolute -top-2 rounded-lg border border-line-strong bg-midnight/95 px-2.5 py-1.5 font-mono text-xs" style={{ left: `${(x(h.pos) / W) * 100}%`, transform: 'translate(-50%,-100%)' }}>
          ~{Math.round(h.pos).toLocaleString()} bp · GC {pct(h.gc)}
        </div>
      )}
    </div>
  );
}
