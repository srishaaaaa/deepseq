"use client";

import { useState } from 'react';
import { FiAlertTriangle, FiCheck, FiPlay } from 'react-icons/fi';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { Button } from '@/components/ui/Button';
import { recordAnalyzeRequest } from '@/components/ui/ServiceStatus';

// Define a type for the expected result structure for better code quality
type AnalysisData = {
  analysis: any;
  geo: any;
};

export default function TestApiPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestClick = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      // Create sample FASTA data in memory instead of reading a file
      const fastaContent = `>seq1_Orca_DNA
GATTACATTAGGATTACATTAC
>seq2_Tuna_DNA
AGCTAGCTAGCTAGCTAGCT
>seq3_Unknown_Creature
CCCCCCCCCCCCCCCCCCCC`;

      const blob = new Blob([fastaContent], { type: 'text/plain' });
      const file = new File([blob], "sample_sequences.fasta", { type: "text/plain" });

      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', file);

      // Call your own Next.js API route
      const started = performance.now();
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();
      recordAnalyzeRequest({ ok: response.ok, at: Date.now(), ms: Math.round(performance.now() - started), message: response.ok ? undefined : responseData.error });

      if (!response.ok) {
        throw new Error(responseData.error || 'An API error occurred.');
      }

      setResult(responseData);

    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <WorkspaceShell title="API Test" subtitle="Send a built-in 3-record FASTA file to /api/analyze">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="panel p-6">
          <p className="text-mute">Click the button below to send a sample FASTA file to your API endpoint.</p>
          <Button onClick={handleTestClick} loading={isLoading} className="mt-5">
            {isLoading ? 'Testing API...' : <><FiPlay aria-hidden /> Run API Test</>}
          </Button>
        </div>

        {error && (
          <div role="alert" className="panel border-danger/40 p-6">
            <h2 className="flex items-center gap-2 text-lg text-danger"><FiAlertTriangle aria-hidden /> Error</h2>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-sm text-ink/85">{error}</pre>
          </div>
        )}

        {result && (
          <div className="panel p-6" style={{ animation: 'rise 0.5s var(--ease-abyss) both' }}>
            <h2 className="flex items-center gap-2 text-lg text-teal"><FiCheck aria-hidden /> Success! API Response:</h2>
            <pre className="mt-3 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-abyss/70 p-4 font-mono text-xs text-ink/85 scrollbar-thin">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
