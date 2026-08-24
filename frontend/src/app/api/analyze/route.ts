import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // The API route's only job is to forward the file to the Python backend.
    const pythonApiUrl = process.env.PYTHON_API_URL;
    if (!pythonApiUrl) {
      throw new Error("PYTHON_API_URL is not configured.");
    }
    
    // We send the exact same form data we received.
    const analysisResponse = await fetch(`${pythonApiUrl}/analyze/`, {
      method: 'POST',
      body: formData,
    });

    // We return the full, unmodified JSON response from the Python backend.
    const analysisData = await analysisResponse.json();

    if (!analysisResponse.ok) {
      throw new Error(analysisData.detail || 'Analysis at Python API failed');
    }

    return NextResponse.json(analysisData);

  } catch (error: any) {
    console.error('Error in analyze API route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}