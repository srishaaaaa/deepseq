"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    { label: 'Reads processed', value: totalReads.toLocaleString(), icon: FiActivity },
    { label: 'Avg. species / run', value: avgSpeciesPerRun, icon: FiDatabase },
    { label: 'Public share links', value: sharedCount, icon: FiBarChart2 },
  ];

  const quickLinks = [
    { href: '/upload', label: 'New Analysis', desc: 'Upload a FASTA/FASTQ file', icon: FiUploadCloud },
    { href: '/analytics', label: 'Analytics', desc: 'Trends across all your runs', icon: FiBarChart2 },
    { href: '/species', label: 'Species Library', desc: 'Browse the reference database', icon: FiDatabase },
    { href: '/explore', label: 'Map Explorer', desc: 'Occurrences across all analyses', icon: FiMap },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <AppNavbar username={username} onLogout={handleLogout} />

      <div className="p-8">
        <div className="max-w-5xl mx-auto animate-fade-in">
          <PageHeader
            title="Dashboard"
            subtitle={username ? `Welcome back, ${username}` : undefined}
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
              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {stats.map(({ label, value, icon: Icon }, i) => (
                  <Card key={label} className="animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                    <Icon className="h-6 w-6 text-brand-300 mb-3" />
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-sm text-gray-400">{label}</p>
                  </Card>
                ))}
              </div>

              {/* Quick links to other modules */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {quickLinks.map(({ href, label, desc, icon: Icon }, i) => (
                  <Link key={href} href={href}>
                    <Card
                      interactive
                      className="animate-slide-up flex items-center h-full bg-brand-900/40! border-brand-800"
                      style={{ animationDelay: `${(i + 4) * 40}ms` }}
                    >
                      <Icon className="h-6 w-6 text-brand-300 mr-3 shrink-0" />
                      <div>
                        <p className="font-semibold">{label}</p>
                        <p className="text-sm text-gray-400">{desc}</p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Second row: settings */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Link href="/settings">
                  <Card interactive className="flex items-center h-full">
                    <FiSettings className="h-6 w-6 text-brand-300 mr-3 shrink-0" />
                    <div>
                      <p className="font-semibold">Settings</p>
                      <p className="text-sm text-gray-400">Confidence threshold, export, theme</p>
                    </div>
                  </Card>
                </Link>
              </div>

              {/* Recent activity */}
              <Card padding="lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center">
                    <FiClock className="mr-2 text-brand-300" /> Recent Activity
                  </h2>
                  <Link href="/history" className="text-sm text-brand-300 hover:text-brand-200 transition-colors">
                    View all &rarr;
                  </Link>
                </div>

                {items.length === 0 ? (
                  <EmptyState
                    icon={<FiFileText />}
                    title="No analyses yet."
                    action={
                      <Link href="/upload" className="text-brand-400 hover:underline">
                        Upload a file to get started.
                      </Link>
                    }
                  />
                ) : (
                  <div className="space-y-2">
                    {items.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-(--radius-control) bg-gray-700/50 px-4 py-3">
                        <div className="flex items-center min-w-0">
                          <FiFileText className="mr-3 h-5 w-5 text-brand-300 shrink-0" />
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
                      </div>
                    ))}
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
  );
}
