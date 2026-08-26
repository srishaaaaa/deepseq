"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiBarChart2, FiTrendingUp, FiAlertTriangle } from 'react-icons/fi';
import { fetchHistory, fetchHistoryItem, isLoggedIn, logout, getCurrentUser, getUsername, HistoryItem } from '@/lib/api';
import AppNavbar from '@/components/nav/AppNavbar';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import LoadingState from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';

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
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const loggedIn = await isLoggedIn();
      if (!loggedIn) {
        router.replace('/login');
        return;
      }
      const user = await getCurrentUser();
      setUsername(getUsername(user));

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

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const maxReads = Math.max(...items.map((it) => it.total_reads_processed || 0), 1);
  const maxSpeciesCount = Math.max(...speciesAgg.map((s) => s.totalCount), 1);
  const runsCovered = Math.min(items.length, MAX_DETAILED_RUNS);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <AppNavbar username={username} onLogout={handleLogout} />

      <div className="p-8">
        <div className="max-w-5xl mx-auto animate-fade-in">
          <PageHeader
            title="Analytics"
            icon={<FiBarChart2 />}
            subtitle={`Aggregated across your ${runsCovered} most recent ${runsCovered === 1 ? 'analysis' : 'analyses'}.`}
          />

          {loading && <LoadingState label="Crunching numbers..." />}

          {error && <p className="text-danger-400 mb-4">{error}</p>}

          {!loading && !error && items.length === 0 && (
            <Card padding="lg">
              <EmptyState
                icon={<FiBarChart2 />}
                title="No analyses yet."
                action={
                  <Link href="/upload" className="text-brand-400 hover:underline">
                    Upload a file to start generating data.
                  </Link>
                }
              />
            </Card>
          )}

          {!loading && !error && items.length > 0 && (
            <>
              {/* Top species across all runs */}
              <Card padding="lg" className="mb-8">
                <h2 className="text-lg font-semibold mb-1 flex items-center">
                  <FiTrendingUp className="mr-2 text-success-400" /> Most Frequently Detected Species
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
                          <div className="h-3 rounded-(--radius-pill) bg-gray-700 overflow-hidden">
                            <div
                              className="h-full rounded-(--radius-pill) bg-success-500 transition-[width] duration-500 ease-out"
                              style={{ width: `${(s.totalCount / maxSpeciesCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {speciesAgg.some((s) => s.species === 'Unclassified taxon') && (
                  <div className="mt-4 flex items-start text-xs text-warning-400/80">
                    <FiAlertTriangle className="mr-2 mt-0.5 shrink-0" />
                    <span>
                      "Unclassified taxon" means the read didn&apos;t clear the confidence threshold against
                      the current reference database — expected with a small starter reference set.
                    </span>
                  </div>
                )}
              </Card>

              {/* Reads per run over time */}
              <Card padding="lg">
                <h2 className="text-lg font-semibold mb-1">Reads Processed Per Analysis</h2>
                <p className="text-sm text-gray-500 mb-4">Most recent uploads first.</p>
                <div className="space-y-3">
                  {items.slice(0, 10).map((item) => (
                    <div key={item.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="truncate">{item.filename}</span>
                        <span className="text-gray-400">{item.total_reads_processed} reads</span>
                      </div>
                      <div className="h-3 rounded-(--radius-pill) bg-gray-700 overflow-hidden">
                        <div
                          className="h-full rounded-(--radius-pill) bg-info-500 transition-[width] duration-500 ease-out"
                          style={{ width: `${(item.total_reads_processed / maxReads) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
