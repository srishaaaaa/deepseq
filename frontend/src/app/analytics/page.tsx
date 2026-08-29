"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FiBarChart2, FiTrendingUp, FiAlertTriangle } from 'react-icons/fi';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { fetchHistory, fetchHistoryItem, isLoggedIn, logout, getCurrentUser, getUsername, HistoryItem } from '@/lib/api';
import AppNavbar from '@/components/nav/AppNavbar';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import LoadingState from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import { truncateLabel } from '@/components/charts/chartTheme';

// Recharts is a real chunk of JS -- keep it out of this page's initial
// bundle (and off the server render) the same way the globe/ocean scenes
// are lazy-loaded. Neither chart can render before data loads anyway.
const SpeciesBarChart = dynamic(() => import('@/components/charts/SpeciesBarChart'), {
  ssr: false,
  loading: () => <Skeleton variant="card" className="h-[220px]" />,
});
const ReadsBarChart = dynamic(() => import('@/components/charts/ReadsBarChart'), {
  ssr: false,
  loading: () => <Skeleton variant="card" className="h-[220px]" />,
});
const OceanScene = dynamic(() => import('@/components/ocean/OceanScene'), { ssr: false });

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

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

  const speciesCardRef = useRef<HTMLDivElement>(null);
  const readsCardRef = useRef<HTMLDivElement>(null);

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

  // Scroll-revealed chart cards. Only wires up once the real content is on
  // the page (post-loading) so ScrollTrigger measures actual layout, not
  // the loading/empty state. gsap.context() scopes cleanup so re-runs
  // (e.g. new data arriving) never leave stale triggers behind.
  useEffect(() => {
    if (loading || items.length === 0) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      [speciesCardRef.current, readsCardRef.current].forEach((el) => {
        if (!el) return;
        gsap.fromTo(
          el,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 88%' },
          }
        );
      });
    });

    return () => ctx.revert();
  }, [loading, items.length, speciesAgg.length]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const runsCovered = Math.min(items.length, MAX_DETAILED_RUNS);

  const speciesChartData = speciesAgg.slice(0, 8).map((s) => ({
    species: s.species,
    label: truncateLabel(s.species),
    totalCount: s.totalCount,
    avgConfidence: Math.round((s.confidenceSum / s.runs) * 100),
  }));

  const readsChartData = items.slice(0, 10).map((it) => ({
    filename: it.filename,
    label: truncateLabel(it.filename),
    reads: it.total_reads_processed || 0,
  }));

  return (
    <div className="relative min-h-screen bg-brand-950 text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950" />
        <div className="absolute -top-32 left-1/4 h-[26rem] w-[26rem] rounded-full bg-cyan-500/[0.06] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[22rem] w-[22rem] rounded-full bg-violet-500/[0.06] blur-[110px]" />
      </div>
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-40">
        <OceanScene variant="light" fish />
      </div>

      <div className="relative z-10">
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
              <Card padding="lg" className="border-white/10 bg-white/[0.03]">
                <EmptyState
                  icon={<FiBarChart2 />}
                  title="No analyses yet."
                  action={
                    <Link href="/upload" className="text-cyan-300 hover:underline">
                      Upload a file to start generating data.
                    </Link>
                  }
                />
              </Card>
            )}

            {!loading && !error && items.length > 0 && (
              <>
                {/* Top species across all runs */}
                <div ref={speciesCardRef}>
                <Card padding="lg" className="mb-8 border-white/10 bg-white/[0.03]">
                  <h2 className="text-lg font-semibold mb-1 flex items-center">
                    <FiTrendingUp className="mr-2 text-success-400" /> Most Frequently Detected Species
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">Total read count summed across all analyzed files.</p>

                  {speciesChartData.length === 0 ? (
                    <p className="text-gray-500 text-sm">No classified reads yet.</p>
                  ) : (
                    <SpeciesBarChart data={speciesChartData} />
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
                </div>

                {/* Reads per run over time */}
                <div ref={readsCardRef}>
                <Card padding="lg" className="border-white/10 bg-white/[0.03]">
                  <h2 className="text-lg font-semibold mb-1">Reads Processed Per Analysis</h2>
                  <p className="text-sm text-gray-500 mb-4">Most recent uploads first.</p>
                  <ReadsBarChart data={readsChartData} />
                </Card>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
