"use client";

import { useState } from 'react';

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
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();

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
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>API Test Page</h1>
      <p>Click the button below to send a sample FASTA file to your API endpoint.</p>
      
      <button 
        onClick={handleTestClick} 
        disabled={isLoading}
        style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', cursor: 'pointer', marginTop: '1rem' }}
      >
        {isLoading ? 'Testing API...' : 'Run API Test'}
      </button>

      {error && (
        <div style={{ marginTop: '1rem', color: 'red' }}>
          <h2>Error:</h2>
          <pre style={{ background: '#ffeeee', padding: '1rem', borderRadius: '5px' }}>
            {error}
          </pre>
        </div>
      )}

      {result && (
        <div style={{ marginTop: '1rem' }}>
          <h2>✅ Success! API Response:</h2>
          <pre style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '5px', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}