"use client";

import React, { useState, useRef, useEffect, ChangeEvent, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiUploadCloud,
  FiFileText,
  FiX,
  FiArrowLeft,
  FiLoader,
  FiCheckCircle,
  FiAlertCircle,
} from 'react-icons/fi';
import { isLoggedIn, saveAnalysis, logout, getCurrentUser, getUsername } from '@/lib/api';
import AppNavbar from '@/components/nav/AppNavbar';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB, matches backend limit
const ALLOWED_EXTENSIONS = ['.fasta', '.fastq', '.fa', '.fna'];

function validateFile(file: File): string | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Unsupported file type (${ext}). Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`;
  }
  return null;
}

type QueuedFile = {
  file: File;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  error?: string;
};

export default function UploadPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const loggedIn = await isLoggedIn();
      if (!loggedIn) {
        router.replace('/login');
        return;
      }
      const user = await getCurrentUser();
      setUsername(getUsername(user));
    })();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const addFiles = (files: FileList | File[]) => {
    setError(null);
    const newEntries: QueuedFile[] = Array.from(files).map((file) => {
      const validationError = validateFile(file);
      return validationError
        ? { file, status: 'error', error: validationError }
        : { file, status: 'pending' };
    });
    setQueue((prev) => [...prev, ...newEntries]);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) addFiles(event.target.files);
    event.target.value = ''; // allow re-selecting the same file
  };

  const handleDropZoneClick = () => { fileInputRef.current?.click(); };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation(); setIsDragging(false);
    if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); event.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); event.stopPropagation(); setIsDragging(false); };
  const removeFile = (index: number) => { setQueue((prev) => prev.filter((_, i) => i !== index)); };

  const validFiles = queue.filter((q) => q.status !== 'error');

  const handleContinue = async () => {
    if (validFiles.length === 0) return;
    setIsLoading(true);
    setError(null);
    localStorage.removeItem('analysisResult');
    localStorage.removeItem('batchAnalysisResults');

    const batchResults: { filename: string; result: any }[] = [];

    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status === 'error') continue;
      setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: 'analyzing' } : q)));

      try {
        const formData = new FormData();
        formData.append('file', queue[i].file);
        const response = await fetch('/api/analyze', { method: 'POST', body: formData });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Analysis failed.');

        batchResults.push({ filename: queue[i].file.name, result });
        await saveAnalysis(queue[i].file.name, result); // saved to Supabase for History page
        setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: 'done' } : q)));
      } catch (err: any) {
        setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: 'error', error: err.message } : q)));
      }
    }

    if (batchResults.length === 0) {
      setError('None of the files could be analyzed. Check the errors above and try again.');
      setIsLoading(false);
      return;
    }

    // Last successful result stays the "current" single-file view for
    // backward compatibility with /globe and /report.
    localStorage.setItem('analysisResult', JSON.stringify(batchResults[batchResults.length - 1].result));

    if (batchResults.length > 1) {
      localStorage.setItem('batchAnalysisResults', JSON.stringify(batchResults));
      router.push('/compare');
    } else {
      router.push('/globe');
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-900 text-white overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/one.jpg')" }}
      >
        <div className="absolute inset-0 bg-black opacity-60"></div>
      </div>

      <AppNavbar username={username} onLogout={handleLogout} />

      <button
        onClick={() => router.back()}
        className="absolute top-24 left-8 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
          <FiArrowLeft size={20} />
      </button>

      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
        <Card padding="lg" className="w-full max-w-xl bg-brand-900/80 backdrop-blur-md animate-fade-in">
          <h2 className="mb-2 text-xl font-bold text-center">File Upload</h2>
          <p className="mb-6 text-center text-sm text-gray-300">
            Upload one file, or several to compare biodiversity across sites/timepoints.
          </p>

          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".fasta,.fastq,.fa,.fna" multiple />

          <div
            onClick={handleDropZoneClick} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
            className={`flex flex-col items-center justify-center rounded-(--radius-control) border-2 border-dashed bg-white/10 p-10 text-center transition-colors cursor-pointer ${
              isDragging ? 'border-brand-300 bg-white/20' : 'border-gray-400'
            }`}
          >
            <div className="flex flex-col items-center text-gray-300">
              <FiUploadCloud className="mb-2 h-10 w-10" />
              <p className="font-semibold">Click or drag file(s) to this area to upload</p>
            </div>
          </div>

          {queue.length > 0 && (
            <div className="mt-4 space-y-2 max-h-56 overflow-y-auto">
              {queue.map((q, i) => (
                <div key={i} className="animate-slide-up flex items-center justify-between rounded-(--radius-control) bg-white/10 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <FiFileText className="shrink-0" />
                    <span className="truncate">{q.file.name}</span>
                    <span className="text-gray-400 shrink-0">({(q.file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {q.status === 'analyzing' && <Badge tone="info"><FiLoader className="animate-spin mr-1" />Analyzing</Badge>}
                    {q.status === 'done' && <Badge tone="success"><FiCheckCircle className="mr-1" />Done</Badge>}
                    {q.status === 'error' && <Badge tone="danger" title={q.error}><FiAlertCircle className="mr-1" />Error</Badge>}
                    {q.status === 'pending' && (
                      <button onClick={() => removeFile(i)} className="text-danger-400/80 hover:text-danger-400 transition-colors" aria-label="Remove file">
                        <FiX />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {queue.some((q) => q.status === 'error') && (
                <p className="text-xs text-danger-400">
                  Some files can't be analyzed and will be skipped: {queue.filter((q) => q.status === 'error').map((q) => q.error).join(' / ')}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 text-center text-sm text-gray-300">
            <p>Formats accepted: .fasta, .fastq, .fa, .fna — up to {MAX_FILE_SIZE_BYTES / 1024 / 1024} MB each</p>
          </div>

          <div className="mt-6 text-center text-sm text-gray-300">
            If you do not have a file you can use the sample below:
            <a href="/sample.fasta" download className="ml-2 inline-block rounded-(--radius-control) bg-gray-600/50 px-3 py-1 font-semibold text-white transition-colors hover:bg-gray-500/50">
              Download Sample Template
            </a>
          </div>

          {error && <p className="mt-4 text-center text-sm text-danger-400">{error}</p>}

          <div className="mt-8 flex justify-end space-x-4">
            <Button variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              onClick={handleContinue} disabled={validFiles.length === 0 || isLoading} loading={isLoading}
            >
              {isLoading ? 'Analyzing...' : validFiles.length > 1 ? `Analyze ${validFiles.length} Files` : 'Continue'}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
