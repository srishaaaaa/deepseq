'use client';

import { useEffect, useState } from 'react';

/**
 * Frontend-only service status. The browser cannot reach the Python service
 * directly (PYTHON_API_URL is server-side), so instead of probing it we report
 * the genuine outcome of the most recent real POST /api/analyze made from this
 * browser, plus network connectivity. Nothing here is simulated.
 */
export type LastRequest = { ok: boolean; at: number; ms: number; message?: string };

const KEY = 'deepseq.lastAnalyzeRequest';
const EVENT = 'deepseq:last-request';

export function recordAnalyzeRequest(r: LastRequest) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

function readLast(): LastRequest | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LastRequest) : null;
  } catch {
    return null;
  }
}

export function useServiceSignals() {
  const [last, setLast] = useState<LastRequest | null>(null);
  const [offline, setOffline] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setLast(readLast());
    setOffline(!navigator.onLine);
    setReady(true);
    const sync = () => setLast(readLast());
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return { last, offline, ready };
}

export function ago(ts: number) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(ts).toLocaleDateString();
}

/** Compact status line: network + last real analysis request from this browser. */
export default function ServiceStatus({ compact = false }: { compact?: boolean }) {
  const { last, offline, ready } = useServiceSignals();
  let tone = 'bg-mute';
  let text = 'Connecting…';
  if (ready) {
    if (offline) { tone = 'bg-warn'; text = 'You are offline'; }
    else if (!last) { tone = 'bg-mute'; text = 'Online · no analysis run from this browser yet'; }
    else if (last.ok) { tone = 'bg-teal'; text = `Last analysis succeeded · ${ago(last.at)}`; }
    else { tone = 'bg-danger'; text = `Last analysis failed · ${ago(last.at)}`; }
  }
  const ok = tone === 'bg-teal';
  return (
    <span className="inline-flex items-center gap-2.5" role="status" aria-live="polite">
      <span className="relative flex h-2 w-2 shrink-0">
        {ok && <span className={`absolute inset-0 rounded-full ${tone}`} style={{ animation: 'pulseRing 2s ease-out infinite' }} />}
        <span className={`relative h-2 w-2 rounded-full ${tone}`} />
      </span>
      <span className={compact ? 'mono-meta' : 'font-mono text-xs tracking-wide text-mute'}>{text}</span>
    </span>
  );
}
