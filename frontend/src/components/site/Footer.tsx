import Link from 'next/link';
import { FiGithub } from 'react-icons/fi';
import { LogoMark } from '@/components/ui/Logo';

const cols = [
  { title: 'Platform', links: [['Launch analysis', '/upload'], ['Workspace', '/dashboard'], ['Biodiversity globe', '/globe'], ['Reports', '/report']] },
  { title: 'Research', links: [['About DeepSeq', '/about'], ['Methodology', '/#engine'], ['Sample FASTA', '/sample.fasta']] },
  { title: 'Docs', links: [['Getting started', '/help'], ['Analysis history', '/history'], ['API check', '/test-api']] },
];

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-line bg-gradient-to-b from-transparent to-abyss">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-3">
            <LogoMark className="h-9 w-9 text-ink" />
            <span className="font-display text-lg tracking-[0.18em]">DEEPSEQ</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-mute">
            Explore the invisible. Decode the ocean. Environmental DNA analysis and biodiversity exploration.
          </p>
          <a
            href="https://github.com/srishaaaaa/deepseq"
            className="mt-6 inline-flex items-center gap-2 text-sm text-mute hover:text-ink"
            target="_blank"
            rel="noreferrer"
          >
            <FiGithub aria-hidden /> Source on GitHub
          </a>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h3 className="eyebrow !text-mute">{c.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  {href.endsWith('.fasta') ? (
                    <a href={href} download className="link-underline text-sm text-ink/80 hover:text-ink">{label}</a>
                  ) : (
                    <Link href={href} className="link-underline text-sm text-ink/80 hover:text-ink">{label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 border-t border-line px-6 py-6">
        <span className="mono-meta">© {new Date().getFullYear()} DEEPSEQ · eDNA INTELLIGENCE</span>
        <span className="mono-meta">LAT 11.35°N · LON 142.20°E · CHALLENGER DEEP</span>
      </div>
    </footer>
  );
}
