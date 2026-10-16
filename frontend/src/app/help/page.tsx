import Link from 'next/link';
import DocPage, { DocSection } from '@/components/site/DocPage';

export const metadata = { title: 'Documentation' };

const code = 'rounded-md bg-abyss/70 px-1.5 py-0.5 font-mono text-[0.85em] text-ink';

export default function HelpPage() {
  return (
    <DocPage eyebrow="Documentation" title="Getting started with DeepSeq." intro="Everything you need to run an analysis and read the results.">
      <nav aria-label="On this page" className="flex flex-wrap gap-2" data-reveal>
        {[['#steps', 'Quick start'], ['#format', 'File format'], ['#results', 'Reading results'], ['#trouble', 'Troubleshooting'], ['#a11y', 'Accessibility']].map(([h, l]) => (
          <a key={h} href={h} className="rounded-full border border-line px-3.5 py-1.5 text-sm text-mute hover:border-line-strong hover:text-ink">{l}</a>
        ))}
      </nav>

      <DocSection id="steps" title="Quick start">
        <p>
          <strong>1. Upload a sequence file.</strong> Go to the <Link href="/upload" className="text-biolum link-underline">Upload</Link> page
          (sign-in required) and provide a FASTA file. No file handy? Use the sample dataset provided on that page.
        </p>
        <p>
          <strong>2. Review species on the globe.</strong> Once analysis finishes, you&apos;ll see identified species plotted on the
          globe with heatmaps of where they were detected. Choose a taxon in the side panel to fly to its sites.
        </p>
        <p>
          <strong>3. Download your report.</strong> From the globe view, click &quot;View Analysis Insights&quot; to see charts and
          export a PDF, CSV or JSON summary.
        </p>
        <p>
          <strong>4. Revisit past work.</strong> Every analysis run while signed in is saved to <Link href="/history" className="text-biolum link-underline">History</Link>.
        </p>
      </DocSection>

      <DocSection id="format" title="File format">
        <p>
          The analysis service accepts plain-text, UTF-8 <strong>FASTA</strong>: each record starts with a header line beginning
          with <code className={code}>&gt;</code>, followed by one or more sequence lines. Accepted extensions:
          <code className={code}>.fasta</code> <code className={code}>.fa</code> <code className={code}>.fna</code>.
        </p>
        <p>
          Files must be <strong>5 MB or smaller</strong>, and the service accepts up to 10 analyses per minute. FASTQ files
          (records starting with <code className={code}>@</code>) are detected and rejected before upload, because the current
          backend parses FASTA records only. You can embed sampling coordinates in a header (they take priority over GBIF
          records when mapping).
        </p>
        <pre className="overflow-x-auto rounded-xl border border-line bg-abyss/70 p-4 font-mono text-xs leading-relaxed text-ink/85">{`>Sample1_North_Atlantic_Orca
TTTGGCTACTAATCAGTCGATTACACCCAGTCGATTT
>Sample3_Unknown_Deep_Sea
GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG`}</pre>
      </DocSection>

      <DocSection id="results" title="Reading results">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Total DNA reads</strong> — number of FASTA records processed.</li>
          <li><strong>Species richness</strong> — number of distinct taxa returned.</li>
          <li><strong>Relative abundance</strong> — a taxon&apos;s read count divided by total reads.</li>
          <li><strong>Unclassified share</strong> — reads whose best reference match fell below the confidence threshold, as a fraction of total reads.</li>
          <li><strong>Confidence</strong> — mean k-mer similarity (0–1) between a taxon&apos;s reads and its best reference sequence.</li>
          <li><strong>Geographic profiles</strong> — classification, location and coordinates per taxon, with their source: <em>FASTA header</em>, <em>GBIF occurrences</em> (where the species has been recorded, not your sample site) or a labelled <em>simulated placeholder</em>.</li>
          <li><strong>Sequence Explorer</strong> — length, base composition and GC content, computed in your browser from your most recent upload.</li>
        </ul>
      </DocSection>

      <DocSection id="trouble" title="Troubleshooting">
        <p>
          Having trouble? Make sure the analysis backend is running and reachable — see the project README / SETUP.md for setup
          instructions. The service indicator in the workspace header shows whether the backend responds.
        </p>
        <p>
          The <Link href="/test-api" className="text-biolum link-underline">API check page</Link> sends a tiny built-in FASTA file to
          the backend and prints the raw response.
        </p>
      </DocSection>

      <DocSection id="a11y" title="Accessibility & motion">
        <p>
          DeepSeq respects your operating system&apos;s reduced-motion setting. You can also use the <strong>Reduce motion</strong> toggle
          in the navigation to pause ambient particles, cursor trails, globe rotation and other non-essential animation. All
          controls are keyboard reachable, and 3D views fall back to static illustrations when WebGL is unavailable.
        </p>
      </DocSection>
    </DocPage>
  );
}
