"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiLoader, FiBarChart2, FiTrendingUp, FiAlertTriangle } from 'react-icons/fi';
import { fetchHistory, fetchHistoryItem, isLoggedIn, HistoryItem } from '@/lib/api';

// Cap how many past analyses we pull full detail for -- fine for a
// dashboard summary, avoids fetching an unbounded amount of result_json
// for accounts with a long history.
const MAX_DETAILED_RUNS = 25;

type SpeciesAgg = {
  species: string;
  totalCount: number;
  runs: number;
  confidenceSum: number;
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [speciesAgg, setSpeciesAgg] = useState<SpeciesAgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const loggedIn = await isLoggedIn();
      if (!loggedIn) {
        router.replace('/login');
        return;
      }

      try {
        const history = await fetchHistory();
        setItems(history);

        const subset = history.slice(0, MAX_DETAILED_RUNS);
        const details = await Promise.all(
          subset.map((it) => fetchHistoryItem(it.id).catch(() => null))
        );

        const agg = new Map<string, SpeciesAgg>();
        for (const detail of details) {
          const dist = detail?.biodiversity_summary?.abundance_distribution ?? [];
          for (const row of dist) {
            const existing = agg.get(row.species) ?? {
              species: row.species,
              totalCount: 0,
              runs: 0,
              confidenceSum: 0,
            };
            existing.totalCount += row.count ?? 0;
            existing.runs += 1;
            existing.confidenceSum += row.avg_confidence ?? 0;
            agg.set(row.species, existing);
          }
        }
        setSpeciesAgg(Array.from(agg.values()).sort((a, b) => b.totalCount - a.totalCount));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const maxReads = Math.max(...items.map((it) => it.total_reads_processed || 0), 1);
  const maxSpeciesCount = Math.max(...speciesAgg.map((s) => s.totalCount), 1);
  const runsCovered = Math.min(items.length, MAX_DETAILED_RUNS);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-blue-300 hover:text-blue-200 mb-6">
          <FiArrowLeft className="mr-2" /> Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <FiBarChart2 className="mr-3 text-blue-300" /> Analytics
        </h1>
        <p className="text-gray-400 mb-8">
          Aggregated across your {runsCovered} most recent {runsCovered === 1 ? 'analysis' : 'analyses'}.
        </p>

        {loading && (
          <div className="flex items-center text-gray-400">
            <FiLoader className="animate-spin mr-2" /> Crunching numbers...
          </div>
        )}

        {error && <p className="text-red-400 mb-4">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="text-gray-400">
            No analyses yet. <Link href="/upload" className="text-blue-400 hover:underline">Upload a file</Link> to start
            generating data.
          </p>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            {/* Top species across all runs */}
            <section className="mb-8 rounded-lg bg-gray-800 p-6">
              <h2 className="text-lg font-semibold mb-1 flex items-center">
                <FiTrendingUp className="mr-2 text-green-400" /> Most Frequently Detected Species
              </h2>
              <p className="text-sm text-gray-500 mb-4">Total read count summed across all analyzed files.</p>

              {speciesAgg.length === 0 ? (
                <p className="text-gray-500 text-sm">No classified reads yet.</p>
              ) : (
                <div className="space-y-3">
                  {speciesAgg.slice(0, 8).map((s) => {
                    const avgConfidence = s.confidenceSum / s.runs;
                    return (
                      <div key={s.species}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="italic truncate">{s.species}</span>
                          <span className="text-gray-400">
                            {s.totalCount} reads &middot; {Math.round(avgConfidence * 100)}% avg. confidence
                          </span>
                        </div>
                        <div className="h-3 rounded-full bg-gray-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green-500"
                            style={{ width: `${(s.totalCount / maxSpeciesCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {speciesAgg.some((s) => s.species === 'Unclassified taxon') && (
                <div className="mt-4 flex items-start text-xs text-amber-400/80">
                  <FiAlertTriangle className="mr-2 mt-0.5 shrink-0" />
                  <span>
                    "Unclassified taxon" means the read didn&apos;t clear the confidence threshold against
                    the current reference database — expected with a small starter reference set.
                  </span>
                </div>
              )}
            </section>

            {/* Reads per run over time */}
            <section className="rounded-lg bg-gray-800 p-6">
              <h2 className="text-lg font-semibold mb-1">Reads Processed Per Analysis</h2>
              <p className="text-sm text-gray-500 mb-4">Most recent uploads first.</p>
              <div className="space-y-3">
                {items.slice(0, 10).map((item) => (
                  <div key={item.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="truncate">{item.filename}</span>
                      <span className="text-gray-400">{item.total_reads_processed} reads</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${(item.total_reads_processed / maxReads) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
