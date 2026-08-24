"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft,
  FiFileText,
  FiLoader,
  FiLogOut,
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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/upload" className="inline-flex items-center text-blue-300 hover:text-blue-200">
            <FiArrowLeft className="mr-2" /> Back to Upload
          </Link>
          <button onClick={handleLogout} className="inline-flex items-center text-gray-400 hover:text-red-300 text-sm">
            <FiLogOut className="mr-1" /> Log out
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        {username && <p className="text-gray-400 mb-8">Welcome back, {username}</p>}

        {loading && (
          <div className="flex items-center text-gray-400">
            <FiLoader className="animate-spin mr-2" /> Loading...
          </div>
        )}

        {error && <p className="text-red-400 mb-4">{error}</p>}

        {!loading && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-lg bg-gray-800 p-5">
                  <Icon className="h-6 w-6 text-blue-300 mb-3" />
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-sm text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            {/* Quick links to other modules */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Link href="/upload" className="flex items-center rounded-lg bg-blue-900/40 border border-blue-800 p-5 hover:bg-blue-900/60 transition">
                <FiUploadCloud className="h-6 w-6 text-blue-300 mr-3 shrink-0" />
                <div>
                  <p className="font-semibold">New Analysis</p>
                  <p className="text-sm text-gray-400">Upload a FASTA/FASTQ file</p>
                </div>
              </Link>
              <Link href="/analytics" className="flex items-center rounded-lg bg-blue-900/40 border border-blue-800 p-5 hover:bg-blue-900/60 transition">
                <FiBarChart2 className="h-6 w-6 text-blue-300 mr-3 shrink-0" />
                <div>
                  <p className="font-semibold">Analytics</p>
                  <p className="text-sm text-gray-400">Trends across all your runs</p>
                </div>
              </Link>
              <Link href="/species" className="flex items-center rounded-lg bg-blue-900/40 border border-blue-800 p-5 hover:bg-blue-900/60 transition">
                <FiDatabase className="h-6 w-6 text-blue-300 mr-3 shrink-0" />
                <div>
                  <p className="font-semibold">Species Library</p>
                  <p className="text-sm text-gray-400">Browse the reference database</p>
                </div>
              </Link>
              <Link href="/explore" className="flex items-center rounded-lg bg-blue-900/40 border border-blue-800 p-5 hover:bg-blue-900/60 transition">
                <FiMap className="h-6 w-6 text-blue-300 mr-3 shrink-0" />
                <div>
                  <p className="font-semibold">Map Explorer</p>
                  <p className="text-sm text-gray-400">Occurrences across all analyses</p>
                </div>
              </Link>
            </div>

            {/* Second row: settings */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Link href="/settings" className="flex items-center rounded-lg bg-gray-800 border border-gray-700 p-5 hover:bg-gray-750 transition">
                <FiSettings className="h-6 w-6 text-blue-300 mr-3 shrink-0" />
                <div>
                  <p className="font-semibold">Settings</p>
                  <p className="text-sm text-gray-400">Confidence threshold, export, theme</p>
                </div>
              </Link>
            </div>

            {/* Recent activity */}
            <section className="rounded-lg bg-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <FiClock className="mr-2 text-blue-300" /> Recent Activity
                </h2>
                <Link href="/history" className="text-sm text-blue-300 hover:text-blue-200">
                  View all &rarr;
                </Link>
              </div>

              {items.length === 0 ? (
                <p className="text-gray-400">
                  No analyses yet. <Link href="/upload" className="text-blue-400 hover:underline">Upload a file</Link> to get started.
                </p>
              ) : (
                <div className="space-y-2">
                  {items.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-md bg-gray-700/50 px-4 py-3">
                      <div className="flex items-center min-w-0">
                        <FiFileText className="mr-3 h-5 w-5 text-blue-300 shrink-0" />
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
            </section>
          </>
        )}
      </div>
    </div>
  );
}
