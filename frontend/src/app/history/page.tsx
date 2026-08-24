"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiFileText, FiLoader, FiLogOut, FiTrash2, FiEdit2, FiCheck, FiX, FiShare2, FiCopy, FiGrid, FiBarChart2, FiDatabase, FiMap, FiSettings } from 'react-icons/fi';
import {
  fetchHistory,
  fetchHistoryItem,
  isLoggedIn,
  logout,
  getCurrentUser,
  getUsername,
  renameAnalysis,
  deleteAnalysis,
  subscribeToHistory,
  setShared,
  HistoryItem,
} from '@/lib/api';

export default function HistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const history = await fetchHistory();
      setItems(history);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

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

      await reload();
      setLoading(false);

      // Live-update the list on insert/update/delete — e.g. if an upload
      // finishes in another tab, or a teammate's analysis lands while you're
      // both looking at a shared account.
      if (user) {
        unsubscribe = subscribeToHistory(user.id, reload);
      }
    })();

    return () => unsubscribe?.();
  }, [router, reload]);

  const openItem = async (id: string) => {
    setOpeningId(id);
    try {
      const result = await fetchHistoryItem(id);
      localStorage.setItem('analysisResult', JSON.stringify(result));
      router.push('/report');
    } catch (err: any) {
      setError(err.message);
      setOpeningId(null);
    }
  };

  const startEditing = (item: HistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditValue(item.filename);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const saveRename = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const trimmed = editValue.trim();
    if (!trimmed) return;
    try {
      await renameAnalysis(id, trimmed);
      setEditingId(null);
      // Realtime subscription will refresh the list; update locally too for instant feedback.
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, filename: trimmed } : it)));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this analysis? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await deleteAnalysis(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const toggleShare = async (item: HistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSharingId(item.id);
    try {
      const newValue = !item.is_shared;
      await setShared(item.id, newValue);
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, is_shared: newValue } : it)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSharingId(null);
    }
  };

  const copyShareLink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/share/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/upload" className="inline-flex items-center text-blue-300 hover:text-blue-200">
            <FiArrowLeft className="mr-2" /> Back to Upload
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/dashboard" className="flex items-center text-gray-300 hover:text-blue-200">
              <FiGrid className="mr-1" /> Dashboard
            </Link>
            <Link href="/analytics" className="flex items-center text-gray-300 hover:text-blue-200">
              <FiBarChart2 className="mr-1" /> Analytics
            </Link>
            <Link href="/species" className="flex items-center text-gray-300 hover:text-blue-200">
              <FiDatabase className="mr-1" /> Species
            </Link>
            <Link href="/explore" className="flex items-center text-gray-300 hover:text-blue-200">
              <FiMap className="mr-1" /> Explore
            </Link>
            <Link href="/settings" className="flex items-center text-gray-300 hover:text-blue-200">
              <FiSettings className="mr-1" /> Settings
            </Link>
            <button onClick={handleLogout} className="inline-flex items-center text-gray-400 hover:text-red-300">
              <FiLogOut className="mr-1" /> Log out
            </button>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2">Analysis History</h1>
        {username && <p className="text-gray-400 mb-6">Signed in as {username}</p>}

        {loading && (
          <div className="flex items-center text-gray-400">
            <FiLoader className="animate-spin mr-2" /> Loading...
          </div>
        )}

        {error && <p className="text-red-400 mb-4">{error}</p>}

        {!loading && items.length === 0 && !error && (
          <p className="text-gray-400">
            No analyses yet. <Link href="/upload" className="text-blue-400 hover:underline">Upload a file</Link> to get started.
          </p>
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => editingId !== item.id && openItem(item.id)}
              className="w-full flex items-center justify-between rounded-lg bg-gray-800 p-4 text-left hover:bg-gray-700 transition cursor-pointer"
            >
              <div className="flex items-center flex-1 min-w-0">
                <FiFileText className="mr-3 h-6 w-6 text-blue-300 shrink-0" />
                <div className="min-w-0">
                  {editingId === item.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded bg-gray-700 px-2 py-1 text-white text-sm w-full"
                    />
                  ) : (
                    <p className="font-semibold truncate">{item.filename}</p>
                  )}
                  <p className="text-sm text-gray-400">
                    {new Date(item.uploaded_at).toLocaleString()} &middot;{' '}
                    {item.unique_species_identified} species &middot; {item.total_reads_processed} reads
                  </p>
                  {item.is_shared && (
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="text-green-400">Public link active</span>
                      <button onClick={(e) => copyShareLink(item.id, e)} className="flex items-center gap-1 text-blue-300 hover:text-blue-200">
                        <FiCopy /> {copiedId === item.id ? 'Copied!' : 'Copy link'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-3 shrink-0">
                {openingId === item.id && <FiLoader className="animate-spin h-5 w-5" />}
                {editingId === item.id ? (
                  <>
                    <button onClick={(e) => saveRename(item.id, e)} className="p-2 text-green-400 hover:text-green-300" title="Save">
                      <FiCheck />
                    </button>
                    <button onClick={cancelEditing} className="p-2 text-gray-400 hover:text-gray-300" title="Cancel">
                      <FiX />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={(e) => toggleShare(item, e)}
                      disabled={sharingId === item.id}
                      className={`p-2 disabled:opacity-50 ${item.is_shared ? 'text-green-400 hover:text-green-300' : 'text-gray-400 hover:text-blue-300'}`}
                      title={item.is_shared ? 'Make private' : 'Share publicly'}
                    >
                      {sharingId === item.id ? <FiLoader className="animate-spin" /> : <FiShare2 />}
                    </button>
                    <button onClick={(e) => startEditing(item, e)} className="p-2 text-gray-400 hover:text-blue-300" title="Rename">
                      <FiEdit2 />
                    </button>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      disabled={deletingId === item.id}
                      className="p-2 text-gray-400 hover:text-red-400 disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === item.id ? <FiLoader className="animate-spin" /> : <FiTrash2 />}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
