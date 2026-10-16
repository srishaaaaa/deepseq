import Image from 'next/image';
import { FiArrowRight, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { LinkButton } from '@/components/ui/Button';

const delay = (ms: number) => ({ ['--reveal-delay' as string]: `${ms}ms` });

/* ---------------- 01 · The invisible ocean ---------------- */
export function InvisibleOcean() {
  return (
    <section id="explore" className="relative mx-auto max-w-7xl scroll-mt-24 px-6 py-28" aria-labelledby="ocean-title">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div className="relative h-[460px] sm:h-[560px]" aria-hidden>
          <div data-reveal className="absolute left-0 top-0 h-[78%] w-[66%] overflow-hidden rounded-[28px] border border-line">
            <Image src="/images/three.jpg" alt="" fill sizes="(min-width:1024px) 30vw, 66vw" className="object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-abyss via-transparent to-transparent" />
          </div>
          <div data-reveal style={delay(160)} className="absolute bottom-0 right-0 h-[56%] w-[58%] overflow-hidden rounded-[28px] border border-line-strong shadow-[0_30px_80px_-30px_rgba(65,232,255,0.35)]">
            <Image src="/images/four.jpg" alt="" fill sizes="(min-width:1024px) 28vw, 58vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-tr from-abyss/70 to-transparent" />
          </div>
          <div data-reveal style={delay(300)} className="panel absolute bottom-[14%] left-[6%] px-4 py-3">
            <p className="mono-meta !text-biolum">eDNA · TRACE SIGNAL</p>
            <p className="mt-1 font-mono text-xs text-ink/80">ATGGCACTGAGCGTTGACCTG…</p>
          </div>
        </div>

        <div>
          <p data-reveal className="eyebrow">01 · The invisible ocean</p>
          <h2 id="ocean-title" data-reveal style={delay(80)} className="mt-5 text-[clamp(2rem,4.8vw,3.6rem)] font-semibold leading-[1.02]">
            The Ocean Is Full of Stories We Haven&apos;t Read.
          </h2>
          <p data-reveal style={delay(160)} className="mt-6 max-w-lg text-lg leading-relaxed text-mute">
            Fish, mammals and drifting invertebrates constantly shed cells, mucus and scales. That genetic residue —
            environmental DNA — lingers in the water column long after the animal has gone.
          </p>
          <p data-reveal style={delay(220)} className="mt-4 max-w-lg leading-relaxed text-mute">
            Sequencing a water sample captures thousands of these fragments at once. Reading them is how researchers
            survey biodiversity without nets, cameras or disturbing the ecosystem.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 02 · From sample to insight ---------------- */
const STEPS = [
  ['Collect an environmental sample', 'Water or sediment is filtered in the field. (Performed outside DeepSeq.)'],
  ['Extract & sequence DNA', 'Lab sequencing produces reads you export as a FASTA file.'],
  ['Analyse DNA sequences', 'Upload the FASTA file — each record is parsed and classified.'],
  ['Explore classification & abundance', 'Read counts and relative abundance per identified taxon.'],
  ['Visualise biodiversity', 'Taxa plotted on an interactive 3D globe with linked details.'],
  ['Export the report', 'Download a PDF, CSV or JSON summary of the analysis.'],
];

export function Workflow() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 py-28" aria-labelledby="flow-title">
      <p data-reveal className="eyebrow">02 · From sample to insight</p>
      <h2 id="flow-title" data-reveal style={delay(80)} className="mt-5 max-w-3xl text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-[1.04]">
        One continuous descent, from a drop of seawater to a report.
      </h2>
      <ol className="relative mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* glowing connector (desktop) */}
        <svg className="pointer-events-none absolute -top-6 left-0 hidden h-4 w-full lg:block" preserveAspectRatio="none" viewBox="0 0 100 4" aria-hidden>
          <line x1="0" x2="100" y1="2" y2="2" stroke="#41E8FF" strokeOpacity="0.35" strokeWidth="0.3" strokeDasharray="1 1.5" style={{ animation: 'dash 6s linear infinite' }} />
        </svg>
        {STEPS.map(([title, body], i) => (
          <li key={title} data-reveal style={delay(i * 90)} className="panel panel-hover group p-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-biolum">{String(i + 1).padStart(2, '0')}</span>
              <span className={`h-px flex-1 mx-4 bg-gradient-to-r ${i < 2 ? 'from-line' : 'from-biolum/50'} to-transparent`} />
              <span className={`mono-meta !text-[0.6rem] ${i < 2 ? '' : '!text-teal'}`}>{i < 2 ? 'FIELD / LAB' : 'IN DEEPSEQ'}</span>
            </div>
            <h3 className="mt-5 text-xl font-medium">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-mute">{body}</p>
          </li>
        ))}
      </ol>
      <p data-reveal className="mt-6 mono-meta">Steps 01–02 happen before DeepSeq; steps 03–06 are the workflow this application supports.</p>
    </section>
  );
}

/* ---------------- 05 · Discover biodiversity ---------------- */
export function Biodiversity() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 py-28" aria-labelledby="bio-title">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <p data-reveal className="eyebrow">05 · Discover biodiversity</p>
          <h2 id="bio-title" data-reveal style={delay(80)} className="mt-5 text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-[1.04]">
            Every detection, placed on a living planet.
          </h2>
          <ul className="mt-8 space-y-4">
            {[
              'Select a taxon and the globe flies to its detection sites.',
              'Heatmaps and connection arcs show how sites relate.',
              'A linked panel lists classification, location and coordinates.',
            ].map((t, i) => (
              <li key={t} data-reveal style={delay(140 + i * 80)} className="flex gap-3 text-mute">
                <FiCheck className="mt-1 shrink-0 text-teal" aria-hidden /> {t}
              </li>
            ))}
          </ul>
          <div data-reveal style={delay(400)} className="mt-10">
            <LinkButton href="/globe" variant="secondary">
              Open the Biodiversity Explorer <FiArrowRight aria-hidden />
            </LinkButton>
          </div>
        </div>
        <div data-reveal className="relative mx-auto aspect-square w-full max-w-[520px]" aria-hidden>
          <svg viewBox="-100 -100 200 200" className="h-full w-full">
            <defs>
              <radialGradient id="sonar" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#41E8FF" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#41E8FF" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="sweep" x1="0" x2="1">
                <stop offset="0%" stopColor="#41E8FF" stopOpacity="0" />
                <stop offset="100%" stopColor="#41E8FF" stopOpacity="0.35" />
              </linearGradient>
            </defs>
            <circle r="96" fill="url(#sonar)" />
            {[24, 48, 72, 96].map((r) => <circle key={r} r={r} fill="none" stroke="#41E8FF" strokeOpacity="0.14" />)}
            <line x1="-96" x2="96" stroke="#41E8FF" strokeOpacity="0.1" />
            <line y1="-96" y2="96" stroke="#41E8FF" strokeOpacity="0.1" />
            <g style={{ transformOrigin: '50% 50%', transformBox: 'view-box' }} className="animate-spin [animation-duration:8s]">
              <path d="M0 0 L96 0 A96 96 0 0 0 68 -68 Z" fill="url(#sweep)" />
            </g>
            {[[30, -40], [-52, 22], [58, 44], [-20, -66], [12, 70]].map(([x, y], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <circle r="2.5" fill={i === 2 ? '#B6FF73' : '#41E8FF'} />
                <circle r="2.5" fill="none" stroke="#41E8FF" style={{ transformOrigin: 'center', transformBox: 'fill-box', animation: `pulseRing 2.6s ${i * 0.5}s ease-out infinite` }} />
              </g>
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 06 · Inside the analysis engine ---------------- */
const PIPELINE = [
  { name: 'File input', where: 'Browser', body: 'Your FASTA file is read locally and checked for valid “>” records before anything is sent.' },
  { name: 'Secure upload', where: 'Next.js /api/analyze', body: 'The file is forwarded unchanged to the Python analysis service.' },
  { name: 'Validation & parsing', where: 'FastAPI', body: 'File type, size (≤ 5 MB) and nucleotide content are checked; each record’s header and sequence are extracted.' },
  { name: 'Classification', where: 'FastAPI', body: 'Each sequence’s 4-mer profile is compared with a curated reference set; the best match and its similarity score become the taxon and confidence. Weak matches are reported as “Unclassified taxon”.' },
  { name: 'Abundance profiling', where: 'FastAPI', body: 'Read counts and relative abundance are aggregated per taxon.' },
  { name: 'Geo profiles', where: 'FastAPI · GBIF', body: 'Coordinates come from your FASTA headers when present, otherwise from GBIF occurrence records, with a labelled simulated fallback.' },
  { name: 'History & report', where: 'Supabase · Browser', body: 'Results are saved to your account and rendered as globe, charts and PDF.' },
];

export function Engine() {
  return (
    <section id="engine" className="relative mx-auto max-w-7xl scroll-mt-24 px-6 py-28" aria-labelledby="engine-title">
      <p data-reveal className="eyebrow">06 · Inside the analysis engine</p>
      <h2 id="engine-title" data-reveal style={delay(80)} className="mt-5 max-w-3xl text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-[1.04]">
        The actual pipeline, stage by stage.
      </h2>
      <div className="relative mt-14">
        <div className="absolute bottom-4 left-[19px] top-4 w-px bg-gradient-to-b from-biolum/60 via-marine/40 to-teal/50 md:left-1/2" aria-hidden />
        <ol className="space-y-6">
          {PIPELINE.map((s, i) => (
            <li key={s.name} data-reveal style={delay(i * 70)} className={`relative pl-14 md:w-1/2 md:pl-0 ${i % 2 ? 'md:ml-auto md:pl-12' : 'md:pr-12'}`}>
              <span
                className={`absolute left-[11px] top-6 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-biolum bg-abyss md:top-6 ${i % 2 ? 'md:-left-[9px]' : 'md:left-auto md:-right-[9px]'}`}
                aria-hidden
              >
                <span className="h-1.5 w-1.5 rounded-full bg-biolum" />
              </span>
              <div className="panel panel-hover p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-medium">{s.name}</h3>
                  <span className="mono-meta">{s.where}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-mute">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div data-reveal className="mt-10 flex max-w-3xl gap-3 rounded-2xl border border-warn/30 bg-warn/5 p-5 text-sm leading-relaxed text-ink/85">
        <FiAlertCircle className="mt-0.5 shrink-0 text-warn" aria-hidden />
        <p>
          <strong className="font-medium text-ink">Methodology note.</strong> Classification is a k-mer nearest-neighbour
          search against a small curated reference set, so only taxa in that set can be identified and confidence scores
          reflect sequence similarity, not statistical certainty. GBIF coordinates show where a species has been recorded,
          not where your sample was taken, and simulated points are labelled as such everywhere they appear. Treat results
          as exploratory rather than publication-grade.
        </p>
      </div>
    </section>
  );
}

/* ---------------- 06 · Workspace preview (illustrative) ---------------- */
const PREVIEW = [
  { name: 'Thunnus albacares', v: 0.5 },
  { name: 'Orcinus orca', v: 0.25 },
  { name: 'Unclassified taxon', v: 0.25 },
];

export function WorkspacePreview() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 py-28" aria-labelledby="preview-title">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p data-reveal className="eyebrow">07 · Research workspace</p>
          <h2 id="preview-title" data-reveal style={delay(80)} className="mt-5 max-w-2xl text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-[1.04]">
            A control room for your samples.
          </h2>
        </div>
        <LinkButton href="/dashboard" variant="secondary">Open workspace <FiArrowRight aria-hidden /></LinkButton>
      </div>

      <div data-reveal style={delay(160)} className="panel mt-12 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div className="flex items-center gap-2" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-mute/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-mute/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-mute/30" />
          </div>
          <span className="rounded-full border border-warn/40 px-2.5 py-0.5 font-mono text-[0.65rem] tracking-widest text-warn">
            ILLUSTRATIVE PREVIEW · NOT REAL RESULTS
          </span>
        </div>
        <div className="grid gap-px bg-line md:grid-cols-[200px_1fr]">
          <div className="hidden bg-midnight/80 p-4 md:block" aria-hidden>
            {['Overview', 'New Analysis', 'Sequence Explorer', 'Results', 'Geographic', 'Reports'].map((s, i) => (
              <div key={s} className={`mb-1 rounded-lg px-3 py-2 text-sm ${i === 3 ? 'bg-biolum/10 text-ink' : 'text-mute'}`}>{s}</div>
            ))}
          </div>
          <div className="bg-midnight/80 p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {[['Reads processed', '4'], ['Taxa identified', '3'], ['Unclassified share', '25%']].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line p-4">
                  <p className="mono-meta">{k}</p>
                  <p className="mt-2 font-display text-3xl">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-line p-5">
              <p className="mono-meta mb-4">Relative abundance (example data)</p>
              <ul className="space-y-3">
                {PREVIEW.map((p) => (
                  <li key={p.name} className="grid grid-cols-[minmax(0,160px)_1fr_48px] items-center gap-3 text-sm">
                    <span className="truncate italic text-ink/85">{p.name}</span>
                    <span className="h-2 rounded-full bg-line">
                      <span className="block h-2 rounded-full bg-biolum" style={{ width: `${p.v * 100}%` }} />
                    </span>
                    <span className="text-right font-mono text-xs text-mute">{Math.round(p.v * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 07 · Call to action ---------------- */
export function FinalCta() {
  return (
    <section className="relative px-6 py-36 text-center" aria-labelledby="cta-title">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-72 max-w-3xl -translate-y-1/2 rounded-full bg-biolum/10 blur-[120px]" />
      <p data-reveal className="eyebrow">08 · Descend</p>
      <h2 id="cta-title" data-reveal style={delay(80)} className="mx-auto mt-6 max-w-4xl text-[clamp(2.2rem,5.5vw,4.6rem)] font-semibold leading-[1]">
        Your Next Discovery Starts Below the Surface.
      </h2>
      <div data-reveal style={delay(200)} className="mt-12 flex flex-wrap justify-center gap-4">
        <LinkButton href="/upload" magnetic>
          Launch DeepSeq <FiArrowRight aria-hidden />
        </LinkButton>
        <LinkButton href="/#engine" variant="secondary">Explore the Methodology</LinkButton>
      </div>
    </section>
  );
}
