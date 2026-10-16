"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiFileText, FiSearch, FiArrowRight } from 'react-icons/fi';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { LinkButton } from '@/components/ui/Button';
import DnaSpinner from '@/components/ui/DnaSpinner';
import { fetchHistory, fetchHistoryItem, HistoryItem } from '@/lib/api';

export default function HistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // WorkspaceShell enforces login (redirects to /login) before this mounts.
  useEffect(() => {
    (async () => {
      try {
        const history = await fetchHistory();
        setItems(history);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.filename.toLowerCase().includes(q)) : items;
  }, [items, query]);

  return (
    <WorkspaceShell title="Reports & History" subtitle="Every analysis you run while signed in" requireAuth>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Search by filename</span>
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by filename…" className="field !rounded-full !py-2 !pl-9 text-sm" />
          </label>
          <LinkButton href="/upload" className="!py-2 text-sm">New analysis</LinkButton>
        </div>

        {loading && <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[74px]" />)}</div>}

        {error && <p role="alert" className="mb-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink">{error}</p>}

        {!loading && items.length === 0 && !error && (
          <div className="panel flex flex-col items-center p-12 text-center">
            <FiFileText className="text-3xl text-biolum" aria-hidden />
            <p className="mt-4 text-lg font-medium">No analyses yet</p>
            <p className="mt-1 text-mute">Upload a file to get started — results are saved here automatically.</p>
            <div className="mt-6"><LinkButton href="/upload">Upload a file</LinkButton></div>
          </div>
        )}

        {!loading && items.length > 0 && filtered.length === 0 && <p className="text-mute">No analyses match “{query}”.</p>}

        <ul className="space-y-3">
          {filtered.map((item, i) => (
            <li key={item.id} style={{ animation: `rise 0.6s ${Math.min(i, 10) * 50}ms var(--ease-abyss) both` }}>
              <button
                onClick={() => openItem(item.id)}
                disabled={openingId !== null}
                className="panel panel-hover flex w-full items-center gap-4 p-4 text-left disabled:opacity-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-biolum/5">
                  <FiFileText className="text-biolum" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.filename}</span>
                  <span className="mono-meta">
                    {new Date(item.uploaded_at).toLocaleString()} &middot; {item.unique_species_identified} species &middot; {item.total_reads_processed} reads
                  </span>
                </span>
                {openingId === item.id ? <DnaSpinner size={18} /> : <FiArrowRight className="text-mute" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </WorkspaceShell>
  );
}
