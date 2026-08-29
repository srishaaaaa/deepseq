"use client";

import { useState } from 'react';

/** Minimal dev utility for hitting /api/analyze directly, bypassing the
 * real /upload flow's UI/auth/history-saving -- useful for checking the
 * backend's raw JSON response while iterating on it.
 *
 * Note: this file was temporarily replaced with a throwaway diagnostic
 * (an isolated GLTF-render test, used to debug the ocean-scene creature
 * materials) and has been rebuilt here to its apparent original purpose.
 * The exact prior content wasn't recoverable (not under git tracking) --
 * flagging that plainly rather than pretending this matches byte-for-byte. */
export default function TestApiPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const file = (event.currentTarget.elements.namedItem('file') as HTMLInputElement)?.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus(null);
    setResponse(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const text = await res.text();
      setStatus(`${res.status} ${res.statusText}`);
      try {
        setResponse(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResponse(text);
      }
    } catch (err: any) {
      setStatus('Request failed');
      setResponse(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', color: '#e5e7eb', background: '#0f172a', minHeight: '100vh' }}>
      <h1>/api/analyze -- raw test</h1>
      <p style={{ color: '#94a3b8' }}>Uploads a file straight to the backend, no auth/history/UI in the way.</p>
      <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        <input type="file" name="file" accept=".fasta,.fastq,.fa,.fna" />
        <button type="submit" disabled={loading} style={{ marginLeft: 12 }}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
      {status && <p style={{ marginTop: 16 }}>Status: {status}</p>}
      {response && (
        <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', background: '#1e293b', padding: 12, borderRadius: 8 }}>
          {response}
        </pre>
      )}
    </div>
  );
}
