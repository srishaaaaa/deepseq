import { FiCheck } from 'react-icons/fi';
import DocPage, { DocSection } from '@/components/site/DocPage';
import { LinkButton } from '@/components/ui/Button';

export const metadata = { title: 'Research' };

export default function AboutPage() {
  return (
    <DocPage
      eyebrow="Research · About us"
      title="Reading the ocean through its DNA."
      intro="Deepseq is a research-driven platform that connects environmental DNA (eDNA) data with marine life."
    >
      <DocSection title="What is DeepSeq?">
        <p>
          Deepseq is a research-driven platform that connects environmental DNA (eDNA) data with marine life. Our goal is to
          unlock the mysteries of the ocean by linking genetic information to known fish species and identifying signals of
          undiscovered organisms.
        </p>
      </DocSection>

      <DocSection title="What We Do">
        <ul className="space-y-3">
          {[
            'Use advanced AI pipelines to analyze DNA from water samples.',
            'Map species distribution on interactive, 3D-enabled global maps.',
            'Flag unknown DNA sequences to highlight potential new species.',
          ].map((t) => (
            <li key={t} className="flex gap-3"><FiCheck className="mt-1 shrink-0 text-teal" aria-hidden /> {t}</li>
          ))}
        </ul>
        <p>
          Our oceans hold countless mysteries, with many species still hidden from science. By combining AI, genomics, and
          visualization, DeepSeq provides researchers and conservationists with powerful tools to track marine life, monitor
          ecosystems, and accelerate the discovery of new biodiversity.
        </p>
      </DocSection>

      <DocSection title="Current status of the science">
        <p>
          The end-to-end workflow — upload, validation, classification, abundance profiling, mapping, history and
          reporting — is fully functional. Classification is a <strong>k-mer similarity search against a small curated
          reference set</strong>, returning a confidence score per match; sequences below the confidence threshold are
          flagged as “Unclassified taxon”. Coordinates come from FASTA headers or <strong>GBIF occurrence records</strong>,
          with a clearly labelled simulated fallback. Expanding the reference set (e.g. BOLD, SILVA) is the main step toward
          publication-grade results.
        </p>
        <div className="pt-2"><LinkButton href="/#engine" variant="secondary">See the pipeline</LinkButton></div>
      </DocSection>
    </DocPage>
  );
}
