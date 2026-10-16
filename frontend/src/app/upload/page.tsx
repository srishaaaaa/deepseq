"use client";

import React, { useEffect, useRef, useState, ChangeEvent, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiUploadCloud, FiFileText, FiX, FiCheck, FiAlertTriangle, FiDownload, FiRefreshCw, FiDatabase, FiPlay, FiArrowRight,
} from 'react-icons/fi';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { HelixStage } from '@/components/three/Stages';
import { Button, LinkButton } from '@/components/ui/Button';
import DnaSpinner from '@/components/ui/DnaSpinner';
import { recordAnalyzeRequest } from '@/components/ui/ServiceStatus';
import { saveAnalysis, isLoggedIn } from '@/lib/api';
import {
  checkFastaText, composition, gcContent, formatBytes, pct, storeSequences, RESULT_KEY, SEQUENCES_KEY, type FastaRecord,
  MAX_UPLOAD_BYTES, ALLOWED_EXTENSIONS,
} from '@/lib/analysis';

type StageId = 'validate' | 'upload' | 'analyze' | 'save' | 'visualize';
type StageState = 'pending' | 'active' | 'done' | 'error' | 'skipped';

const STAGES: { id: StageId; name: string; where: string }[] = [
  { id: 'validate', name: 'File check', where: 'Browser' },
  { id: 'upload', name: 'Upload', where: '/api/analyze' },
  { id: 'analyze', name: 'Parse · classify · profile', where: 'Analysis service' },
  { id: 'save', name: 'Save to history', where: 'Supabase' },
  { id: 'visualize', name: 'Open visualisation', where: 'Globe' },
];

type Validation = { records: FastaRecord[]; totalBases: number; gc: number | null };

export default function UploadPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [checking, setChecking] = useState(false);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [stages, setStages] = useState<Record<StageId, StageState>>(initialStages());
  const [durations, setDurations] = useState<Partial<Record<StageId, number>>>({});
  const [uploadPct, setUploadPct] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [failedAt, setFailedAt] = useState<StageId | null>(null);
  const [savedResult, setSavedResult] = useState<unknown>(null);
  const [signedIn, setSignedIn] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const stageStart = useRef(0);

  useEffect(() => { isLoggedIn().then(setSignedIn).catch(() => {}); }, []);

  // live timer while waiting on the analysis service
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed(performance.now() - stageStart.current), 100);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => () => xhrRef.current?.abort(), []);

  const setStage = (id: StageId, s: StageState) => {
    setStages((prev) => ({ ...prev, [id]: s }));
    if (s === 'active') stageStart.current = performance.now();
    if (s === 'done' || s === 'error') setDurations((d) => ({ ...d, [id]: performance.now() - stageStart.current }));
  };

  const acceptFile = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setValidation(null);
    setFailedAt(null);
    setStages(initialStages());
    setDurations({});
    setChecking(true);
    stageStart.current = performance.now();
    try {
      const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '';
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw new RangeError(`Unsupported file type '${ext || file.name}'. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}.`);
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new RangeError(`File too large (${formatBytes(file.size)}). The analysis service accepts files up to ${formatBytes(MAX_UPLOAD_BYTES)}.`);
      }
      const text = await file.text();
      const res = checkFastaText(text);
      if (!res.ok) {
        setError(res.reason);
        setStages((s) => ({ ...s, validate: 'error' }));
        setFailedAt('validate');
      } else {
        const comp = composition(res.records.map((r) => r.sequence).join(''));
        setValidation({ records: res.records, totalBases: res.totalBases, gc: gcContent(comp) });
        setStages((s) => ({ ...s, validate: 'done' }));
        setDurations({ validate: performance.now() - stageStart.current });
      }
    } catch (e) {
      setError(e instanceof RangeError ? e.message : 'The file could not be read by your browser.');
      setStages((s) => ({ ...s, validate: 'error' }));
    } finally {
      setChecking(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0];
    if (f) acceptFile(f);
    event.target.value = '';
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation(); setIsDragging(false);
    const f = event.dataTransfer.files?.[0];
    if (f && !running) acceptFile(f);
  };
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); event.stopPropagation(); if (!running) setIsDragging(true); };
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); event.stopPropagation(); setIsDragging(false); };

  const removeFile = () => {
    setSelectedFile(null);
    setValidation(null);
    setError(null);
    setFailedAt(null);
    setStages(initialStages());
    setDurations({});
  };

  const loadSample = async () => {
    try {
      const res = await fetch('/sample.fasta');
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      acceptFile(new File([blob], 'sample.fasta', { type: 'text/plain' }));
    } catch {
      setError('Could not load the bundled sample dataset.');
    }
  };

  const cancel = () => {
    xhrRef.current?.abort();
  };

  /** Same flow as before: POST /api/analyze → localStorage → Supabase history → /globe. */
  const handleContinue = async () => {
    if (!selectedFile || !validation) return;
    setRunning(true);
    setError(null);
    setFailedAt(null);
    setUploadPct(0);
    setStages((s) => ({ ...initialStages(), validate: s.validate }));
    localStorage.removeItem(RESULT_KEY); // Clear old data
    localStorage.removeItem(SEQUENCES_KEY);

    let current: StageId = 'upload';
    const requestStart = performance.now();
    try {
      setStage('upload', 'active');
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        const formData = new FormData();
        formData.append('file', selectedFile);
        xhr.open('POST', '/api/analyze');
        xhr.responseType = 'json';
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadPct(e.loaded / e.total); };
        xhr.upload.onload = () => {
          setUploadPct(1);
          setStage('upload', 'done');
          current = 'analyze';
          setStage('analyze', 'active');
        };
        xhr.onload = () => {
          const body = xhr.response;
          const ok = xhr.status >= 200 && xhr.status < 300 && !!body;
          const message = ok ? undefined : body?.error || `The analysis request failed (HTTP ${xhr.status}).`;
          recordAnalyzeRequest({ ok, at: Date.now(), ms: Math.round(performance.now() - requestStart), message });
          if (ok) resolve(body);
          else reject(new Error(message));
        };
        xhr.onerror = () => {
          recordAnalyzeRequest({ ok: false, at: Date.now(), ms: Math.round(performance.now() - requestStart), message: 'Network error' });
          reject(new Error('Network error — the analysis request could not be completed.'));
        };
        xhr.onabort = () => reject(new DOMException('Cancelled', 'AbortError'));
        xhr.send(formData);
      });
      if (current === 'upload') { setStage('upload', 'done'); setStage('analyze', 'active'); }
      setStage('analyze', 'done');

      localStorage.setItem(RESULT_KEY, JSON.stringify(result));
      storeSequences(selectedFile.name, validation.records);
      setSavedResult(result);

      current = 'save';
      setStage('save', 'active');
      if (signedIn) {
        await saveAnalysis(selectedFile.name, result); // saved to Supabase for History page
        setStage('save', 'done');
      } else {
        setStages((s) => ({ ...s, save: 'skipped' }));
      }

      current = 'visualize';
      setStage('visualize', 'active');
      router.push('/globe');
    } catch (err: any) {
      const aborted = err?.name === 'AbortError';
      setStages((s) => ({ ...s, [current]: 'error' }));
      setFailedAt(current);
      setError(aborted ? 'Analysis cancelled. Nothing was saved.' : err.message);
      setRunning(false);
    } finally {
      xhrRef.current = null;
    }
  };

  const firstSeq = validation?.records.find((r) => r.sequence.length >= 4)?.sequence ?? '';
  const anyStarted = Object.entries(stages).some(([k, v]) => k !== 'validate' && v !== 'pending');

  return (
    <WorkspaceShell title="New Analysis" subtitle="Upload a FASTA file to classify sequences and profile abundance" requireAuth>
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Sequencing chamber */}
        <section className="panel overflow-hidden" aria-labelledby="chamber-title">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 id="chamber-title" className="font-display text-base">Sequencing chamber</h2>
            <span className="mono-meta">FASTA · .fasta .fa .fna</span>
          </div>

          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="sr-only" accept=".fasta,.fastq,.fa,.fna" aria-label="Choose a FASTA file" tabIndex={-1} />

          <div
            role="button"
            tabIndex={running ? -1 : 0}
            aria-disabled={running}
            aria-describedby="format-help"
            onClick={() => !running && fileInputRef.current?.click()}
            onKeyDown={(e) => { if (!running && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fileInputRef.current?.click(); } }}
            onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
            className={`relative m-5 flex min-h-[300px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed text-center transition-[border-color,background] duration-300 ${
              isDragging ? 'border-biolum bg-biolum/[0.06]' : 'border-line-strong/50 bg-abyss/40 hover:border-biolum/70'
            } ${running ? 'cursor-default' : ''}`}
          >
            {validation && firstSeq ? (
              <div className="absolute inset-0 opacity-90">
                <HelixStage sequence={firstSeq} maxBases={60} controls={false} />
              </div>
            ) : (
              <div aria-hidden className={`absolute inset-0 transition-opacity duration-700 ${isDragging ? 'opacity-100' : 'opacity-40'}`}>
                <div className="absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(65,232,255,0.18),transparent_70%)]" />
              </div>
            )}

            <div className="relative z-10 flex flex-col items-center px-6 py-8">
              {checking ? (
                <DnaSpinner size={36} label="Reading file…" />
              ) : selectedFile ? (
                <div className="rounded-2xl border border-line bg-midnight/80 px-5 py-4 backdrop-blur">
                  <div className="flex items-center gap-3 text-left">
                    <FiFileText className="h-8 w-8 shrink-0 text-biolum" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{selectedFile.name}</p>
                      <p className="mono-meta">{formatBytes(selectedFile.size)}</p>
                    </div>
                  </div>
                  {!running && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(); }}
                      className="mt-3 inline-flex items-center gap-1 rounded-full border border-danger/40 px-3 py-1 text-xs text-danger hover:bg-danger/10"
                    >
                      <FiX aria-hidden /> Remove
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line-strong bg-midnight/70">
                    <FiUploadCloud className="h-6 w-6 text-biolum" aria-hidden />
                  </span>
                  <p className="mt-4 font-medium">Drop a FASTA file here</p>
                  <p className="mt-1 text-sm text-mute">or press Enter / click to browse</p>
                </>
              )}
            </div>
          </div>

          <div id="format-help" className="space-y-1.5 px-5 pb-5 text-sm text-mute">
            <p>Plain-text FASTA with header lines starting with <code className="font-mono text-ink">&gt;</code>. The analysis service currently parses FASTA records only — FASTQ files are rejected.</p>
            <p>Maximum file size: 5 MB (enforced by the analysis service, which also allows up to 10 analyses per minute).</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">
            <Button variant="secondary" className="!py-2 text-sm" onClick={loadSample} disabled={running}>
              <FiDatabase aria-hidden /> Use sample dataset
            </Button>
            <LinkButton href="/sample.fasta" download variant="ghost" className="text-sm">
              <FiDownload aria-hidden /> Download sample
            </LinkButton>
          </div>
        </section>

        {/* Validation + configuration + pipeline */}
        <div className="space-y-6">
          {error && (
            <div role="alert" className="flex gap-3 rounded-2xl border border-danger/40 bg-danger/[0.07] p-4 text-sm" style={{ animation: 'rise 0.5s var(--ease-abyss) both' }}>
              <FiAlertTriangle className="mt-0.5 shrink-0 text-danger" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-ink">{error}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {failedAt && failedAt !== 'validate' && failedAt !== 'save' && (
                    <Button variant="secondary" className="!px-4 !py-1.5 text-xs" onClick={handleContinue}>
                      <FiRefreshCw aria-hidden /> Retry analysis
                    </Button>
                  )}
                  {failedAt === 'save' && savedResult != null && (
                    <Button variant="secondary" className="!px-4 !py-1.5 text-xs" onClick={() => router.push('/globe')}>
                      View results without saving <FiArrowRight aria-hidden />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <section className="panel p-5" aria-labelledby="val-title" aria-live="polite">
            <h2 id="val-title" className="font-display text-base">Validation</h2>
            {validation ? (
              <dl className="mt-4 grid grid-cols-2 gap-3">
                {[
                  ['Records', validation.records.length.toLocaleString()],
                  ['Total bases', validation.totalBases.toLocaleString()],
                  ['Mean length', `${Math.round(validation.totalBases / validation.records.length).toLocaleString()} bp`],
                  ['GC content', validation.gc == null ? 'n/a' : pct(validation.gc)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-line px-3 py-2.5">
                    <dt className="mono-meta">{k}</dt>
                    <dd className="mt-1 font-display text-xl tabular-nums">{v}</dd>
                  </div>
                ))}
                <p className="col-span-2 flex items-center gap-2 text-xs text-teal"><FiCheck aria-hidden /> Format accepted locally — the server performs its own validation.</p>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-mute">{checking ? 'Checking…' : 'Select a file to see record counts and base composition.'}</p>
            )}
          </section>

          {validation && (
            <section className="panel p-5" aria-labelledby="cfg-title" style={{ animation: 'rise 0.6s var(--ease-abyss) both' }}>
              <h2 id="cfg-title" className="font-display text-base">Analysis configuration</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <Row k="Parser" v="FASTA records (header + sequence)" />
                <Row k="Classifier" v="k-mer similarity vs. reference set" />
                <Row k="Outputs" v="Abundance · confidence · geo profiles" />
                <Row k="History" v={signedIn ? 'Saved to your account' : 'Not saved (signed out)'} />
              </dl>
              <p className="mt-3 text-xs text-mute">These settings are fixed by the current analysis service and are not user-configurable yet.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={handleContinue} loading={running} magnetic className="flex-1">
                  {running ? 'Analysing…' : <><FiPlay aria-hidden /> Start analysis</>}
                </Button>
                {running && (stages.upload === 'active' || stages.analyze === 'active') && (
                  <Button variant="danger" onClick={cancel}>Cancel</Button>
                )}
              </div>
            </section>
          )}

          {(anyStarted || validation) && (
            <section className="panel p-5" aria-labelledby="pipe-title">
              <h2 id="pipe-title" className="font-display text-base">Pipeline</h2>
              <ol className="relative mt-4 space-y-0">
                {STAGES.map((s, i) => {
                  const st = stages[s.id];
                  const d = durations[s.id];
                  return (
                    <li key={s.id} className="relative flex gap-4 pb-5 last:pb-0">
                      {i < STAGES.length - 1 && (
                        <span aria-hidden className={`absolute left-[11px] top-6 h-[calc(100%-12px)] w-px ${st === 'done' ? 'bg-biolum/70 shadow-[0_0_8px_#41E8FF]' : 'bg-line'}`} />
                      )}
                      <StageDot state={st} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <p className={`text-sm ${st === 'pending' ? 'text-mute' : 'text-ink'}`}>{s.name}</p>
                          <span className="mono-meta">
                            {st === 'active' && s.id === 'upload' && `${Math.round(uploadPct * 100)}%`}
                            {st === 'active' && s.id === 'analyze' && `${(elapsed / 1000).toFixed(1)} s`}
                            {st === 'done' && d != null && `${d < 1000 ? `${Math.round(d)} ms` : `${(d / 1000).toFixed(2)} s`}`}
                            {st === 'skipped' && 'skipped'}
                            {st === 'error' && 'failed'}
                          </span>
                        </div>
                        <p className="mono-meta !text-[0.62rem]">{s.where}</p>
                        {s.id === 'upload' && st === 'active' && (
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(uploadPct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
                            <div className="h-full rounded-full bg-biolum transition-[width] duration-200" style={{ width: `${uploadPct * 100}%` }} />
                          </div>
                        )}
                        {s.id === 'analyze' && st === 'active' && (
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" aria-label="Waiting for the analysis service">
                            <div className="skeleton h-full w-full !rounded-full !bg-[linear-gradient(90deg,transparent,rgba(65,232,255,0.7),transparent)]" />
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-4 text-xs text-mute">The analysis service returns results in a single response, so this stage shows elapsed time rather than a percentage.</p>
            </section>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}

function initialStages(): Record<StageId, StageState> {
  return { validate: 'pending', upload: 'pending', analyze: 'pending', save: 'pending', visualize: 'pending' };
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/60 pb-2 last:border-0">
      <dt className="text-mute">{k}</dt>
      <dd className="text-right text-ink/90">{v}</dd>
    </div>
  );
}

function StageDot({ state }: { state: StageState }) {
  const base = 'relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs';
  if (state === 'done') return <span className={`${base} border-biolum bg-biolum/15 text-biolum`}><FiCheck aria-label="done" /></span>;
  if (state === 'error') return <span className={`${base} border-danger bg-danger/15 text-danger`}><FiX aria-label="failed" /></span>;
  if (state === 'active') return <span className={`${base} border-biolum`}><DnaSpinner size={14} /></span>;
  if (state === 'skipped') return <span className={`${base} border-line text-mute`} aria-label="skipped">–</span>;
  return <span className={`${base} border-line`} aria-label="pending" />;
}
