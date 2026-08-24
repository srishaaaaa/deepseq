"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FiFileText, FiBarChart2, FiGlobe, FiDownload, FiAlertTriangle, FiLoader, FiFile } from 'react-icons/fi';
import { fetchPublicAnalysis } from '@/lib/api';
import { generatePdfReport, exportCsv, exportGeoJson, coordinateSourceLabel } from '@/lib/reportExport';

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round((value ?? 0) * 100);
  const styles =
    value >= 0.7 ? 'bg-green-100 text-green-800' : value >= 0.4 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
  return <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${styles}`}>{pct}%</span>;
}

export default function SharedReportPage() {
  const params = useParams();
  const id = params.id as string;

  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [filename, setFilename] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const row = await fetchPublicAnalysis(id);
        if (!row) throw new Error("This report doesn't exist or is no longer shared publicly.");
        setAnalysisResult(row.result_json);
        setFilename(row.filename);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  if (isLoading) {
    return <div className="flex h-screen w-screen items-center justify-center bg-gray-100"><FiLoader className="animate-spin text-4xl text-gray-500" /></div>;
  }

  if (error || !analysisResult) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-100 p-8 text-center">
        <FiAlertTriangle size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-semibold text-gray-800">Report Unavailable</h1>
        <p className="text-gray-600 mt-2 max-w-md">{error}</p>
        <Link href="/" className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-500">
          Go to DeepSeq
        </Link>
      </div>
    );
  }

  const summary = analysisResult.biodiversity_summary;

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      <header className="bg-white shadow-md">
        <div className="container mx-auto flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-700">Shared Analysis: {filename}</h1>
            <p className="text-xs text-gray-500">Public read-only view &middot; via DeepSeq</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => generatePdfReport(analysisResult)} className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">
              <FiDownload /> PDF
            </button>
            <button onClick={() => exportCsv(analysisResult)} className="flex items-center gap-2 rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-500">
              <FiFile /> CSV
            </button>
            <button onClick={() => exportGeoJson(analysisResult)} className="flex items-center gap-2 rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-500">
              <FiGlobe /> GeoJSON
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <FiFileText className="mb-2 text-3xl text-blue-500" />
            <h3 className="text-lg font-semibold">Total DNA Reads</h3>
            <p className="text-3xl font-bold">{summary.total_reads_processed}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <FiBarChart2 className="mb-2 text-3xl text-green-500" />
            <h3 className="text-lg font-semibold">Species Richness</h3>
            <p className="text-3xl font-bold">{summary.unique_species_identified}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <FiGlobe className="mb-2 text-3xl text-purple-500" />
            <h3 className="text-lg font-semibold">Geographic Profiles</h3>
            <p className="text-3xl font-bold">{analysisResult.geo_profiles.length}</p>
          </div>
        </section>

        <section className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">Abundance Distribution</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Species</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Read Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Abundance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {summary.abundance_distribution.map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="whitespace-nowrap px-6 py-4 font-medium">{item.species}</td>
                    <td className="whitespace-nowrap px-6 py-4">{item.count}</td>
                    <td className="whitespace-nowrap px-6 py-4">{`${(item.relative_abundance * 100).toFixed(2)}%`}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <ConfidenceBadge value={item.avg_confidence} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">Geographic & Taxonomic Profiles</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Scientific Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Classification</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Primary Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Confidence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Coordinate Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {analysisResult.geo_profiles.map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="whitespace-nowrap px-6 py-4 font-medium">{item.scientific_name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{item.classification}</td>
                    <td className="whitespace-nowrap px-6 py-4">{item.location}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <ConfidenceBadge value={item.confidence} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {coordinateSourceLabel(item.coordinate_source)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
