"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import {
  FiFileText,
  FiUploadCloud,
  FiBarChart2,
  FiDatabase,
  FiClock,
  FiActivity,
  FiMap,
  FiSettings,
} from 'react-icons/fi';
import {
  fetchHistory,
  isLoggedIn,
  logout,
  getCurrentUser,
  getUsername,
  subscribeToHistory,
  HistoryItem,
} from '@/lib/api';
import AppNavbar from '@/components/nav/AppNavbar';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import LoadingState from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import Reveal from '@/components/motion/Reveal';
import CountUp from '@/components/motion/CountUp';

// Same lazy/SSR-disabled pattern as everywhere else the ocean scene
// appears. "light" variant only -- a couple of jellyfish + drifting
// particles, no fish school/shark/DNA trail. This is a working dashboard,
// not the marketing homepage; the 3D here is ambience in the margins,
// not something competing with the actual data for attention.
const OceanScene = dynamic(() => import('@/components/ocean/OceanScene'), { ssr: false });

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

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
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }

      if (user) {
        unsubscribe = subscribeToHistory(user.id, async () => {
          try {
            setItems(await fetchHistory());
          } catch {
            /* keep showing the last good state on a transient refresh error */
          }
        });
      }
    })();

    return () => unsubscribe?.();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const totalAnalyses = items.length;
  const totalReads = items.reduce((sum, it) => sum + (it.total_reads_processed || 0), 0);
  const totalSpeciesCalls = items.reduce((sum, it) => sum + (it.unique_species_identified || 0), 0);
  const avgSpeciesPerRun = totalAnalyses ? Math.round((totalSpeciesCalls / totalAnalyses) * 10) / 10 : 0;
  const sharedCount = items.filter((it) => it.is_shared).length;
  const lastUpload = items[0]?.uploaded_at;

  const stats = [
    { label: 'Analyses run', value: totalAnalyses, icon: FiFileText },
    { label: 'Reads processed', value: totalReads, icon: FiActivity, formatter: (n: number) => Math.round(n).toLocaleString() },
    { label: 'Avg. species / run', value: avgSpeciesPerRun, icon: FiDatabase, formatter: (n: number) => n.toFixed(1) },
    { label: 'Public share links', value: sharedCount, icon: FiBarChart2 },
  ];

  const quickLinks = [
    { href: '/upload', label: 'New Analysis', desc: 'Upload a FASTA/FASTQ file', icon: FiUploadCloud },
    { href: '/analytics', label: 'Analytics', desc: 'Trends across all your runs', icon: FiBarChart2 },
    { href: '/species', label: 'Species Library', desc: 'Browse the reference database', icon: FiDatabase },
    { href: '/explore', label: 'Map Explorer', desc: 'Occurrences across all analyses', icon: FiMap },
  ];

  return (
    <div className="relative min-h-screen bg-brand-950 text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950" />
        <div className="absolute -top-32 right-1/4 h-[28rem] w-[28rem] rounded-full bg-cyan-500/[0.06] blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[22rem] w-[22rem] rounded-full bg-violet-500/[0.06] blur-[110px]" />
      </div>
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-40">
        <OceanScene variant="light" fish />
      </div>

      <div className="relative z-10">
        <AppNavbar username={username} onLogout={handleLogout} />

        <div className="p-8">
          <div className="max-w-5xl mx-auto animate-fade-in">
            <PageHeader
              title="Dashboard"
              subtitle={username ? `Welcome back, ${username} — here's your biodiversity intelligence at a glance.` : undefined}
            />

            {loading && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} variant="card" />
                  ))}
                </div>
                <LoadingState label="Loading dashboard..." />
              </div>
            )}

            {error && <p className="text-danger-400 mb-4">{error}</p>}

            {!loading && (
              <>
                {/* Stat cards -- real numbers, animated counting up to their
                    actual value once (never invented, just eased in). */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {stats.map(({ label, value, icon: Icon, formatter }, i) => (
                    <Reveal key={label} delay={i * 60}>
                      <Card interactive className="h-full border-white/10 bg-white/[0.03]">
                        <Icon className="h-6 w-6 text-cyan-300 mb-3" />
                        <p className="text-2xl font-bold tabular-nums">
                          <CountUp value={value} formatter={formatter} />
                        </p>
                        <p className="text-sm text-gray-400">{label}</p>
                      </Card>
                    </Reveal>
                  ))}
                </div>

                {/* Quick links to other modules */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  {quickLinks.map(({ href, label, desc, icon: Icon }, i) => (
                    <Reveal key={href} delay={(i + 4) * 60}>
                      <Link href={href}>
                        <Card interactive className="flex items-center h-full border-white/10 bg-brand-900/40">
                          <Icon className="h-6 w-6 text-cyan-300 mr-3 shrink-0" />
                          <div>
                            <p className="font-semibold">{label}</p>
                            <p className="text-sm text-gray-400">{desc}</p>
                          </div>
                        </Card>
                      </Link>
                    </Reveal>
                  ))}
                </div>

                {/* Second row: settings */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <Link href="/settings">
                    <Card interactive className="flex items-center h-full border-white/10 bg-white/[0.03]">
                      <FiSettings className="h-6 w-6 text-cyan-300 mr-3 shrink-0" />
                      <div>
                        <p className="font-semibold">Settings</p>
                        <p className="text-sm text-gray-400">Confidence threshold, export, theme</p>
                      </div>
                    </Card>
                  </Link>
                </div>

                {/* Recent activity -- AnimatePresence so a live insert/remove
                    from subscribeToHistory's realtime subscription animates
                    smoothly instead of popping. */}
                <Card padding="lg" className="border-white/10 bg-white/[0.03]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center">
                      <FiClock className="mr-2 text-cyan-300" /> Recent Activity
                    </h2>
                    <Link href="/history" className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors">
                      View all &rarr;
                    </Link>
                  </div>

                  {items.length === 0 ? (
                    <EmptyState
                      icon={<FiFileText />}
                      title="No analyses yet."
                      action={
                        <Link href="/upload" className="text-cyan-300 hover:underline">
                          Upload a file to get started.
                        </Link>
                      }
                    />
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence initial={false}>
                        {items.slice(0, 5).map((item) => (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="flex items-center justify-between rounded-(--radius-control) bg-gray-700/50 px-4 py-3"
                          >
                            <div className="flex items-center min-w-0">
                              <FiFileText className="mr-3 h-5 w-5 text-cyan-300 shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium truncate">{item.filename}</p>
                                <p className="text-xs text-gray-400">
                                  {new Date(item.uploaded_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <span className="text-sm text-gray-400 shrink-0 ml-3">
                              {item.unique_species_identified} species &middot; {item.total_reads_processed} reads
                            </span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                  {lastUpload && (
                    <p className="text-xs text-gray-500 mt-4">
                      Last analysis: {new Date(lastUpload).toLocaleString()}
                    </p>
                  )}
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
