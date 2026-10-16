"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiDownload, FiArrowLeft, FiAlertTriangle, FiSearch, FiChevronUp, FiChevronDown, FiGlobe, FiCode } from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { Button, LinkButton } from '@/components/ui/Button';
import CountUp from '@/components/ui/CountUp';
import { AbundanceBars, CompositionBar } from '@/components/viz/Charts';
import SourceBadge from '@/components/viz/SourceBadge';
import { classComposition, loadAnalysisResult, pct, unclassifiedFraction, type AnalysisResult } from '@/lib/analysis';
import { RESULT_KEY } from '@/lib/analysis';

type SortKey = 'species' | 'count' | 'relative_abundance' | 'avg_confidence';

export default function ReportPage() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'count', dir: -1 });
  const router = useRouter();

  useEffect(() => {
    try {
      const resultString = localStorage.getItem(RESULT_KEY);
      if (!resultString) {
        throw new Error("Analysis data not found. Please return to the upload page.");
      }
      const result = loadAnalysisResult();
      if (!result) {
        throw new Error("The analysis data is incomplete or has an invalid format.");
      }
      setAnalysisResult(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generatePdfReport = () => {
    if (!analysisResult) return;
    const doc = new jsPDF();
    const summary = analysisResult.biodiversity_summary;
    const geoProfiles = analysisResult.geo_profiles;

    doc.setFontSize(18);
    doc.text("eDNA Biodiversity Analysis Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`File: ${analysisResult.file_info.filename}`, 14, 30);
    doc.text(`Analysis Date: ${new Date().toLocaleString()}`, 14, 38);
    autoTable(doc, { startY: 50, head: [['Metric', 'Value']], body: [['Total Reads Processed', summary.total_reads_processed], ['Unique Species Identified', summary.unique_species_identified]], theme: 'striped' });
    const abundanceBody = summary.abundance_distribution.map((item: any) => [item.species, item.count, `${(item.relative_abundance * 100).toFixed(2)}%`]);
    autoTable(doc, { head: [['Species', 'Read Count', 'Abundance']], body: abundanceBody, theme: 'grid', headStyles: { fillColor: [22, 160, 133] } });
    const geoBody = geoProfiles.map((item: any) => {
      const coords = Array.isArray(item.coordinates) ? item.coordinates.join(', ') : String(item.coordinates);
      return [item.scientific_name, item.classification, item.location, coords];
    });
    autoTable(doc, { head: [['Scientific Name', 'Classification', 'Primary Location', 'Coordinates']], body: geoBody, theme: 'grid', headStyles: { fillColor: [41, 128, 185] } });
    doc.save('eDNA_Analysis_Report.pdf');
  };

  const download = (name: string, mime: string, content: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportCsv = () => {
    if (!analysisResult) return;
    const classOf = new Map(analysisResult.geo_profiles.map((g) => [g.scientific_name, g]));
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['species', 'read_count', 'relative_abundance', 'avg_confidence', 'classification', 'location', 'coordinate_source'],
      ...analysisResult.biodiversity_summary.abundance_distribution.map((a) => [
        a.species, a.count, a.relative_abundance, a.avg_confidence ?? '', classOf.get(a.species)?.classification ?? '', classOf.get(a.species)?.location ?? '', classOf.get(a.species)?.coordinate_source ?? '',
      ]),
    ];
    download('eDNA_abundance.csv', 'text/csv', rows.map((r) => r.map(esc).join(',')).join('\n'));
  };

  const exportJson = () => {
    if (analysisResult) download('eDNA_analysis.json', 'application/json', JSON.stringify(analysisResult, null, 2));
  };

  const composition = useMemo(() => (analysisResult ? classComposition(analysisResult) : []), [analysisResult]);

  const tableRows = useMemo(() => {
    if (!analysisResult) return [];
    const classOf = new Map(analysisResult.geo_profiles.map((g) => [g.scientific_name, g.classification]));
    const q = query.trim().toLowerCase();
    const inClass = (s: string) => {
      if (!classFilter) return true;
      const top5 = composition.slice(0, 5).map((c) => c.name);
      const c = classOf.get(s) ?? 'Unknown';
      return classFilter === 'Other' ? !top5.includes(c) : c === classFilter;
    };
    return analysisResult.biodiversity_summary.abundance_distribution
      .filter((a) => (!q || a.species.toLowerCase().includes(q)) && inClass(a.species))
      .map((a) => ({ ...a, classification: classOf.get(a.species) ?? 'Unknown' }))
      .sort((a, b) => {
        const va = a[sort.key] ?? -1, vb = b[sort.key] ?? -1;
        return (typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)) * sort.dir;
      });
  }, [analysisResult, query, classFilter, sort, composition]);

  if (isLoading) {
    return (
      <WorkspaceShell title="Classification & Abundance">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28" />)}</div>
        <div className="skeleton mt-6 h-72" />
      </WorkspaceShell>
    );
  }

  if (error || !analysisResult) {
    return (
      <WorkspaceShell title="Classification & Abundance">
        <div className="mx-auto mt-16 max-w-md text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-danger/40 bg-danger/10">
            <FiAlertTriangle size={24} className="text-danger" aria-hidden />
          </span>
          <h2 className="mt-5 text-2xl font-medium">No results to show yet</h2>
          <p className="mt-2 text-mute">{error}</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button onClick={() => router.push('/upload')}><FiArrowLeft aria-hidden /> Go to Upload</Button>
            <LinkButton href="/history" variant="secondary">Open history</LinkButton>
          </div>
        </div>
      </WorkspaceShell>
    );
  }

  const summary = analysisResult.biodiversity_summary;
  const hasConfidence = summary.abundance_distribution.some((a) => a.avg_confidence != null);
  const unclassified = unclassifiedFraction(analysisResult);

  const sortBtn = (key: SortKey, label: string, align = 'left') => (
    <th scope="col" className={`px-4 py-3 text-${align}`} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button
        className="inline-flex items-center gap-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-mute hover:text-ink"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'species' ? 1 : -1 }))}
      >
        {label}
        {sort.key === key && (sort.dir === 1 ? <FiChevronUp aria-hidden /> : <FiChevronDown aria-hidden />)}
      </button>
    </th>
  );

  return (
    <WorkspaceShell
      title="Classification & Abundance"
      subtitle={analysisResult.file_info.filename}
      actions={
        <>
          <Button variant="ghost" className="text-sm" onClick={() => router.push('/globe')}><FiArrowLeft aria-hidden /> Back to Globe</Button>
          <div className="flex-1" />
          <Button variant="secondary" className="!px-4 !py-2 text-sm" onClick={exportCsv}><FiDownload aria-hidden /> CSV</Button>
          <Button variant="secondary" className="!px-4 !py-2 text-sm" onClick={exportJson}><FiDownload aria-hidden /> JSON</Button>
          <Button className="!px-4 !py-2 text-sm" onClick={generatePdfReport}><FiDownload aria-hidden /> Download PDF</Button>
        </>
      }
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Metrics */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Summary metrics">
          <Metric label="Total DNA reads" hint="FASTA records processed">
            <CountUp value={summary.total_reads_processed} />
          </Metric>
          <Metric label="Species richness" hint="Distinct taxa returned">
            <CountUp value={summary.unique_species_identified} />
          </Metric>
          <Metric label="Unclassified share" hint={`of ${summary.total_reads_processed.toLocaleString()} reads`} accent={unclassified > 0}>
            <CountUp value={unclassified * 100} format={(n) => `${n.toFixed(1)}%`} />
          </Metric>
          <Metric label="Geographic profiles" hint="Taxa with coordinates">
            <CountUp value={analysisResult.geo_profiles.length} />
          </Metric>
        </section>

        {/* Composition */}
        <section className="panel p-5 sm:p-6" aria-labelledby="comp-title">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="comp-title" className="text-lg font-medium">Reads by classification</h2>
            <span className="mono-meta">Share of total reads · click a segment to filter</span>
          </div>
          <CompositionBar slices={composition} active={classFilter} onToggle={setClassFilter} />
        </section>

        {/* Abundance */}
        <section className="panel p-5 sm:p-6" aria-labelledby="ab-title">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 id="ab-title" className="text-lg font-medium">Relative abundance</h2>
            <label className="relative w-full sm:w-64">
              <span className="sr-only">Filter taxa</span>
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter taxa…" className="field !rounded-full !py-2 !pl-9 text-sm" />
            </label>
          </div>
          <AbundanceBars items={tableRows} total={summary.total_reads_processed} />

          <div className="mt-8 overflow-x-auto rounded-xl border border-line">
            <table className="min-w-full text-sm">
              <caption className="sr-only">Abundance table — sortable</caption>
              <thead className="border-b border-line bg-abyss/40">
                <tr>
                  {sortBtn('species', 'Species')}
                  <th scope="col" className="px-4 py-3 text-left font-mono text-[0.68rem] uppercase tracking-[0.14em] text-mute">Class</th>
                  {sortBtn('count', 'Read count', 'right')}
                  {sortBtn('relative_abundance', 'Abundance', 'right')}
                  {hasConfidence && sortBtn('avg_confidence', 'Confidence', 'right')}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((item) => (
                  <tr key={item.species} className="border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-3 font-medium italic">{item.species}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-mute">{item.classification}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">{item.count.toLocaleString()}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">{`${(item.relative_abundance * 100).toFixed(2)}%`}</td>
                    {hasConfidence && (
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                        {item.avg_confidence == null ? '—' : <ConfidenceCell v={item.avg_confidence} />}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Profiles */}
        <section className="panel p-5 sm:p-6" aria-labelledby="geo-title">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="geo-title" className="text-lg font-medium">Geographic &amp; taxonomic profiles</h2>
            <div className="flex gap-2">
              <LinkButton href="/globe" variant="ghost" className="text-sm"><FiGlobe aria-hidden /> Explore on globe</LinkButton>
              <LinkButton href="/sequences" variant="ghost" className="text-sm"><FiCode aria-hidden /> Inspect sequences</LinkButton>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="min-w-full text-sm">
              <thead className="border-b border-line bg-abyss/40">
                <tr className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-mute">
                  <th scope="col" className="px-4 py-3 text-left font-normal">Scientific name</th>
                  <th scope="col" className="px-4 py-3 text-left font-normal">Classification</th>
                  <th scope="col" className="px-4 py-3 text-left font-normal">Primary location</th>
                  <th scope="col" className="px-4 py-3 text-left font-normal">Coordinate source</th>
                  <th scope="col" className="px-4 py-3 text-right font-normal">Sites</th>
                </tr>
              </thead>
              <tbody>
                {analysisResult.geo_profiles.map((item, index) => (
                  <tr key={index} className="border-b border-line/60 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-medium italic">{item.scientific_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-mute">{item.classification}</td>
                    <td className="whitespace-nowrap px-4 py-3">{item.location}</td>
                    <td className="whitespace-nowrap px-4 py-3"><SourceBadge src={item.coordinate_source} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono">{Array.isArray(item.coordinates) ? item.coordinates.length : 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-mute">
            Taxa, classes, confidence scores and coordinates are reported exactly as returned by the analysis service. GBIF
            coordinates are published occurrence records for the species, not your sampling sites. See the{' '}
            <a href="/#engine" className="text-biolum link-underline">methodology note</a>.
          </p>
        </section>
      </div>
    </WorkspaceShell>
  );
}

function ConfidenceCell({ v }: { v: number }) {
  // classifier similarity score; bar + number so it never relies on colour alone
  return (
    <span className="inline-flex items-center gap-2" title="Mean k-mer similarity to the best reference match">
      <span className="h-1.5 w-12 rounded-full bg-line" aria-hidden>
        <span className="block h-1.5 rounded-full bg-teal" style={{ width: `${Math.round(Math.min(1, Math.max(0, v)) * 100)}%` }} />
      </span>
      {v.toFixed(2)}
    </span>
  );
}

function Metric({ label, hint, children, accent }: { label: string; hint: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className="panel panel-hover p-4 sm:p-5">
      <p className="mono-meta">{label}</p>
      <p className={`mt-3 font-display text-3xl sm:text-4xl font-medium ${accent ? 'text-discovery' : 'text-ink'}`}>{children}</p>
      <p className="mt-1 text-xs text-mute">{hint}</p>
    </div>
  );
}
