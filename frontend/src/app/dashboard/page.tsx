"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiUploadCloud, FiCode, FiBarChart2, FiGlobe, FiFileText, FiArrowRight, FiServer, FiDatabase, FiWifi } from 'react-icons/fi';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { LinkButton } from '@/components/ui/Button';
import CountUp from '@/components/ui/CountUp';
import DnaSpinner from '@/components/ui/DnaSpinner';
import { ago, useServiceSignals } from '@/components/ui/ServiceStatus';
import { fetchHistory, fetchHistoryItem, getCurrentUser, getUsername, type HistoryItem } from '@/lib/api';
import { loadAnalysisResult, loadSequences, pct, RESULT_KEY, type AnalysisResult } from '@/lib/analysis';

const ACTIONS = [
  { href: '/upload', label: 'New analysis', body: 'Upload a FASTA file', icon: FiUploadCloud },
  { href: '/sequences', label: 'Sequence explorer', body: 'Inspect uploaded reads', icon: FiCode },
  { href: '/report', label: 'Results', body: 'Classification & abundance', icon: FiBarChart2 },
  { href: '/globe', label: 'Geographic view', body: 'Detections on the globe', icon: FiGlobe },
];

export default function DashboardPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [latest, setLatest] = useState<AnalysisResult | null>(null);
  const [hasSeqs, setHasSeqs] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const { last, offline } = useServiceSignals();

  useEffect(() => {
    setLatest(loadAnalysisResult());
    setHasSeqs(!!loadSequences());
    getCurrentUser().then((u) => setUsername(getUsername(u))).catch(() => {});
    fetchHistory().then(setHistory).catch((e) => { setHistoryError(e.message); setHistory([]); });
  }, []);

  const openItem = async (id: string) => {
    setOpeningId(id);
    try {
      const result = await fetchHistoryItem(id);
      localStorage.setItem(RESULT_KEY, JSON.stringify(result));
      router.push('/report');
    } catch (err: any) {
      setHistoryError(err.message);
      setOpeningId(null);
    }
  };

  const totalReads = history?.reduce((s, h) => s + (h.total_reads_processed ?? 0), 0) ?? 0;

  return (
    <WorkspaceShell title="Overview" subtitle={username ? `Welcome back, ${username}` : 'Your analysis workspace'} requireAuth>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Quick actions */}
        <section aria-label="Quick actions" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ACTIONS.map(({ href, label, body, icon: Icon }, i) => (
            <Link key={href} href={href} className="panel panel-hover group flex items-center gap-4 p-5" style={{ animation: `rise 0.7s ${i * 70}ms var(--ease-abyss) both` }}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-biolum/5 text-biolum transition-colors group-hover:bg-biolum/15">
                <Icon aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{label}</span>
                <span className="block truncate text-sm text-mute">{body}</span>
              </span>
            </Link>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Latest analysis */}
          <section className="panel p-6" aria-labelledby="latest-title">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="latest-title" className="text-lg font-medium">Latest analysis on this device</h2>
              {latest && <span className="mono-meta truncate">{latest.file_info.filename}</span>}
            </div>
            {latest ? (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Mini k="Reads" v={<CountUp value={latest.biodiversity_summary.total_reads_processed} />} />
                  <Mini k="Taxa" v={<CountUp value={latest.biodiversity_summary.unique_species_identified} />} />
                  <Mini k="Geo profiles" v={<CountUp value={latest.geo_profiles.length} />} />
                </div>
                <ul className="mt-6 space-y-2.5" aria-label="Top taxa by abundance">
                  {[...latest.biodiversity_summary.abundance_distribution].sort((a, b) => b.count - a.count).slice(0, 4).map((a) => (
                    <li key={a.species} className="grid grid-cols-[minmax(0,10rem)_1fr_3.5rem] items-center gap-3 text-sm">
                      <span className="truncate italic text-ink/85">{a.species}</span>
                      <span className="h-2 rounded-r-[4px] bg-line/50"><span className="block h-2 rounded-r-[4px] bg-biolum" style={{ width: `${a.relative_abundance * 100}%` }} /></span>
                      <span className="text-right font-mono text-xs text-mute">{pct(a.relative_abundance)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap gap-3">
                  <LinkButton href="/report" variant="secondary" className="!py-2 text-sm">Open results <FiArrowRight aria-hidden /></LinkButton>
                  <LinkButton href="/globe" variant="ghost" className="text-sm"><FiGlobe aria-hidden /> Globe</LinkButton>
                  {hasSeqs && <LinkButton href="/sequences" variant="ghost" className="text-sm"><FiCode aria-hidden /> Sequences</LinkButton>}
                </div>
              </>
            ) : (
              <Empty
                title="No analysis loaded"
                body="Run your first analysis, or open one from your history to load it here."
                action={<LinkButton href="/upload" className="!py-2 text-sm">Start an analysis</LinkButton>}
              />
            )}
          </section>

          {/* Connectivity */}
          <section className="panel p-6" aria-labelledby="svc-title">
            <h2 id="svc-title" className="text-lg font-medium">Service connectivity</h2>
            <ul className="mt-5 space-y-3">
              <Svc icon={FiWifi} name="Your connection" state={offline ? 'warn' : 'ok'} text={offline ? 'Offline' : 'Online'} />
              <Svc
                icon={FiServer}
                name="Analysis service"
                state={!last ? 'pending' : last.ok ? 'ok' : 'bad'}
                text={!last ? 'No request yet' : last.ok ? `OK ${ago(last.at)} · ${(last.ms / 1000).toFixed(1)} s` : `Failed ${ago(last.at)}`}
              />
              <Svc
                icon={FiDatabase}
                name="History database"
                state={history === null ? 'pending' : historyError ? 'bad' : 'ok'}
                text={history === null ? 'Checking…' : historyError ? 'Error' : 'Connected'}
              />
            </ul>
            <p className="mt-5 text-xs leading-relaxed text-mute">
              The analysis status reflects the most recent real request made from this browser.{' '}
              {last && !last.ok && last.message ? <>Last error: <span className="text-ink">{last.message}</span>. </> : null}
              Use the <Link href="/test-api" className="text-biolum link-underline">API check</Link> to send a small test file now.
            </p>
          </section>
        </div>

        {/* History */}
        <section className="panel p-6" aria-labelledby="hist-title">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="hist-title" className="text-lg font-medium">Recent analyses</h2>
            {history && history.length > 0 && (
              <span className="mono-meta">
                {history.length} saved · {totalReads.toLocaleString()} reads in total
              </span>
            )}
          </div>
          {historyError && <p role="alert" className="mt-4 text-sm text-danger">{historyError}</p>}
          {history === null ? (
            <div className="mt-5 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14" />)}</div>
          ) : history.length === 0 && !historyError ? (
            <Empty title="No saved analyses yet" body="Analyses you run while signed in are saved here automatically." />
          ) : (
            <ul className="mt-5 divide-y divide-line/70">
              {history.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => openItem(item.id)}
                    disabled={openingId !== null}
                    className="flex w-full items-center gap-4 rounded-lg px-2 py-3 text-left transition-colors hover:bg-white/[0.03] disabled:opacity-50"
                  >
                    <FiFileText className="shrink-0 text-biolum" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.filename}</span>
                      <span className="mono-meta">{new Date(item.uploaded_at).toLocaleString()}</span>
                    </span>
                    <span className="hidden text-right font-mono text-xs text-mute sm:block">
                      {item.unique_species_identified} taxa · {item.total_reads_processed} reads
                    </span>
                    {openingId === item.id ? <DnaSpinner size={16} /> : <FiArrowRight className="text-mute" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {history && history.length > 6 && (
            <div className="mt-4"><LinkButton href="/history" variant="ghost" className="text-sm">View all {history.length} <FiArrowRight aria-hidden /></LinkButton></div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}

function Mini({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line px-4 py-3">
      <p className="mono-meta">{k}</p>
      <p className="mt-1 font-display text-3xl">{v}</p>
    </div>
  );
}

function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="mt-5 flex flex-col items-start gap-3 rounded-xl border border-dashed border-line p-6">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-mute">{body}</p>
      {action}
    </div>
  );
}

function Svc({ icon: Icon, name, state, text }: { icon: React.ComponentType<{ className?: string }>; name: string; state: 'ok' | 'warn' | 'bad' | 'pending'; text: string }) {
  const tone = { ok: 'bg-teal', warn: 'bg-warn', bad: 'bg-danger', pending: 'bg-mute' }[state];
  const label = { ok: 'OK', warn: 'Warning', bad: 'Error', pending: 'Checking' }[state];
  return (
    <li className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
      <Icon className="text-mute" />
      <span className="flex-1 text-sm">{name}</span>
      <span className="flex items-center gap-2 font-mono text-xs text-mute">
        <span className={`h-2 w-2 rounded-full ${tone}`} aria-hidden />
        <span className="sr-only">{label}:</span>
        {text}
      </span>
    </li>
  );
}
