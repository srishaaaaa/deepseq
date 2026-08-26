"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiGlobe, FiBarChart2, FiAlertTriangle } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';

type BatchEntry = { filename: string; result: any };

export default function ComparePage() {
  const [batch, setBatch] = useState<BatchEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('batchAnalysisResults');
      if (!raw) throw new Error('No batch comparison data found. Upload multiple files first.');
      const data = JSON.parse(raw);
      if (!Array.isArray(data) || data.length === 0) throw new Error('Batch data is empty.');
      setBatch(data);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const viewSite = (entry: BatchEntry, destination: 'globe' | 'report') => {
    localStorage.setItem('analysisResult', JSON.stringify(entry.result));
    router.push(`/${destination}`);
  };

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-900 text-white p-8 text-center">
        <FiAlertTriangle size={48} className="text-danger-500 mb-4" />
        <h1 className="text-2xl font-semibold text-danger-400">No Comparison Data</h1>
        <p className="text-gray-400 mt-2 max-w-md">{error}</p>
        <Button href="/upload" className="mt-6">
          Go to Upload
        </Button>
      </div>
    );
  }

  const maxSpecies = Math.max(...batch.map((b) => b.result.biodiversity_summary.unique_species_identified), 1);
  const maxReads = Math.max(...batch.map((b) => b.result.biodiversity_summary.total_reads_processed), 1);

  // Union of all species across sites, for a presence/absence comparison.
  const allSpecies = Array.from(
    new Set(batch.flatMap((b) => b.result.biodiversity_summary.abundance_distribution.map((a: any) => a.species)))
  ) as string[];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-5xl mx-auto animate-fade-in">
        <Link href="/upload" className="inline-flex items-center text-brand-300 hover:text-brand-200 transition-colors mb-6">
          <FiArrowLeft className="mr-2" /> Back to Upload
        </Link>

        <PageHeader
          title="Site / Timepoint Comparison"
          subtitle={`Comparing biodiversity across ${batch.length} uploaded files.`}
        />

        {/* Species richness bar comparison */}
        <Card padding="lg" className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Species Richness</h2>
          <div className="space-y-3">
            {batch.map((entry) => {
              const count = entry.result.biodiversity_summary.unique_species_identified;
              return (
                <div key={entry.filename}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate">{entry.filename}</span>
                    <span className="text-gray-400">{count} species</span>
                  </div>
                  <div className="h-3 rounded-(--radius-pill) bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-(--radius-pill) bg-success-500 transition-[width] duration-500 ease-out"
                      style={{ width: `${(count / maxSpecies) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Read depth comparison */}
        <Card padding="lg" className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Total Reads Processed</h2>
          <div className="space-y-3">
            {batch.map((entry) => {
              const count = entry.result.biodiversity_summary.total_reads_processed;
              return (
                <div key={entry.filename}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate">{entry.filename}</span>
                    <span className="text-gray-400">{count} reads</span>
                  </div>
                  <div className="h-3 rounded-(--radius-pill) bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-(--radius-pill) bg-info-500 transition-[width] duration-500 ease-out"
                      style={{ width: `${(count / maxReads) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Presence/absence matrix */}
        <Card padding="lg" className="mb-8 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4">Species Presence Across Sites</h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4">Species</th>
                {batch.map((entry) => (
                  <th key={entry.filename} className="text-center py-2 px-3 font-medium text-gray-300">
                    {entry.filename}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {allSpecies.map((species) => (
                <tr key={species}>
                  <td className="py-2 pr-4 font-medium">{species}</td>
                  {batch.map((entry) => {
                    const found = entry.result.biodiversity_summary.abundance_distribution.find(
                      (a: any) => a.species === species
                    );
                    return (
                      <td key={entry.filename} className="text-center py-2 px-3">
                        {found ? (
                          <span className="text-success-400 font-semibold">{found.count}</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Per-file drilldown */}
        <Card padding="lg">
          <h2 className="text-lg font-semibold mb-4">View Individual Sites</h2>
          <div className="space-y-2">
            {batch.map((entry) => (
              <div key={entry.filename} className="flex items-center justify-between rounded-(--radius-control) bg-gray-700 px-4 py-3">
                <span className="truncate">{entry.filename}</span>
                <div className="flex gap-2 shrink-0 ml-3">
                  <Button size="sm" icon={<FiGlobe />} onClick={() => viewSite(entry, 'globe')}>
                    Globe
                  </Button>
                  <Button size="sm" variant="secondary" icon={<FiBarChart2 />} onClick={() => viewSite(entry, 'report')}>
                    Report
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
