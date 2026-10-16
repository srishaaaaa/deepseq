import { coordinateSourceInfo } from '@/lib/analysis';

/** Provenance badge for geo_profile coordinates (text + icon, never colour alone). */
export default function SourceBadge({ src }: { src?: string }) {
  const info = coordinateSourceInfo(src);
  const cls = info.tone === 'real' ? 'border-teal/40 text-teal' : info.tone === 'simulated' ? 'border-warn/50 text-warn' : 'border-line text-mute';
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[0.68rem] ${cls}`} title={info.detail}>
      {info.tone === 'simulated' ? '⚠ ' : ''}{info.label}
    </span>
  );
}
