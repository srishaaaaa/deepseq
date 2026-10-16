// Shared types + helpers for the analysis result returned by POST /api/analyze.
// The shape mirrors backend/main.py exactly — do not add fields here that the
// backend does not return.

export type AbundanceItem = {
  species: string;
  count: number;
  relative_abundance: number;
  /** mean classifier similarity score (0–1); present on newer backends */
  avg_confidence?: number;
};

export type GeoProfile = {
  scientific_name: string;
  classification: string;
  location: string;
  coordinates: [number, number][];
  /** where the coordinates came from; present on newer backends */
  coordinate_source?: CoordinateSource | string;
  /** mean classifier similarity score (0–1); present on newer backends */
  confidence?: number;
};

export type CoordinateSource = 'header_metadata' | 'gbif_occurrence_data' | 'simulated';

/** Human label + tone for a coordinate_source value (unknown values are shown verbatim). */
export function coordinateSourceInfo(src?: string): { label: string; tone: 'real' | 'simulated' | 'unknown'; detail: string } {
  switch (src) {
    case 'header_metadata':
      return { label: 'From FASTA header', tone: 'real', detail: 'Latitude/longitude embedded in your sequence headers.' };
    case 'gbif_occurrence_data':
      return { label: 'GBIF occurrences', tone: 'real', detail: 'Published occurrence records for this species from GBIF — not your sampling sites.' };
    case 'simulated':
      return { label: 'Simulated placeholder', tone: 'simulated', detail: 'No header coordinates or GBIF records were available; these points are a placeholder, not observations.' };
    case undefined:
      return { label: 'Source not reported', tone: 'unknown', detail: 'The analysis service did not report where these coordinates came from.' };
    default:
      return { label: src, tone: 'unknown', detail: 'Coordinate source as reported by the analysis service.' };
  }
}

/** Upload limits enforced by the analysis service (backend/main.py). Mirrored here only to warn early. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ['.fasta', '.fastq', '.fa', '.fna'];

export type AnalysisResult = {
  file_info: { filename: string };
  biodiversity_summary: {
    total_reads_processed: number;
    unique_species_identified: number;
    abundance_distribution: AbundanceItem[];
  };
  geo_profiles: GeoProfile[];
};

export const RESULT_KEY = 'analysisResult';
export const SEQUENCES_KEY = 'analysisSequences';

/** Reads the most recent analysis from localStorage (the existing page-to-page contract). */
export function loadAnalysisResult(): AnalysisResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(RESULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.biodiversity_summary || !Array.isArray(parsed?.geo_profiles)) return null;
    return parsed as AnalysisResult;
  } catch {
    return null;
  }
}

export const UNCLASSIFIED = 'Unclassified taxon';

/** Fraction of reads assigned to the backend's "Unclassified taxon" bucket (denominator: total reads). */
export function unclassifiedFraction(result: AnalysisResult): number {
  const total = result.biodiversity_summary.total_reads_processed;
  if (!total) return 0;
  const un = result.biodiversity_summary.abundance_distribution.find((a) => a.species === UNCLASSIFIED);
  return un ? un.count / total : 0;
}

export type ClassSlice = { name: string; count: number; fraction: number; species: string[] };

/** Groups read counts by the backend-provided `classification` field (e.g. Fish, Mammal). */
export function classComposition(result: AnalysisResult): ClassSlice[] {
  const classOf = new Map(result.geo_profiles.map((g) => [g.scientific_name, g.classification]));
  const total = result.biodiversity_summary.total_reads_processed || 1;
  const groups = new Map<string, ClassSlice>();
  for (const a of result.biodiversity_summary.abundance_distribution) {
    const name = classOf.get(a.species) ?? 'Unknown';
    const g = groups.get(name) ?? { name, count: 0, fraction: 0, species: [] };
    g.count += a.count;
    g.species.push(a.species);
    groups.set(name, g);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, fraction: g.count / total }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Client-side FASTA parsing. Used for pre-upload validation and for the
// Sequence Explorer (stats are computed from the user's own file — nothing is
// invented). Mirrors parse_fasta() in backend/main.py.
// ---------------------------------------------------------------------------

export type FastaRecord = { header: string; sequence: string };

export function parseFasta(text: string): FastaRecord[] {
  const records: FastaRecord[] = [];
  let header: string | null = null;
  let chunks: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('>')) {
      if (header !== null) records.push({ header, sequence: chunks.join('') });
      header = line.slice(1);
      chunks = [];
    } else {
      chunks.push(line);
    }
  }
  if (header !== null) records.push({ header, sequence: chunks.join('') });
  return records;
}

export type Composition = { A: number; T: number; G: number; C: number; N: number; other: number };

export function composition(seq: string): Composition {
  const c: Composition = { A: 0, T: 0, G: 0, C: 0, N: 0, other: 0 };
  for (let i = 0; i < seq.length; i++) {
    const ch = seq.charCodeAt(i) & 0xdf; // uppercase
    if (ch === 65) c.A++;
    else if (ch === 84 || ch === 85) c.T++; // count U as T
    else if (ch === 71) c.G++;
    else if (ch === 67) c.C++;
    else if (ch === 78) c.N++;
    else c.other++;
  }
  return c;
}

/** GC content over unambiguous bases (A/T/G/C only); null when there are none. */
export function gcContent(c: Composition): number | null {
  const acgt = c.A + c.T + c.G + c.C;
  return acgt ? (c.G + c.C) / acgt : null;
}

export type FileCheck =
  | { ok: true; records: FastaRecord[]; totalBases: number }
  | { ok: false; reason: string };

/** Pre-flight check matching what the backend will accept (UTF-8 text with '>' records). */
export function checkFastaText(text: string): FileCheck {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0)?.trim() ?? '';
  if (!firstLine) return { ok: false, reason: 'The file is empty.' };
  if (firstLine.startsWith('@')) {
    return {
      ok: false,
      reason:
        'This looks like a FASTQ file. The current analysis backend parses FASTA records only (lines starting with ">"). Convert it to FASTA and try again.',
    };
  }
  if (text.includes('\u0000')) return { ok: false, reason: 'The file appears to be binary, not plain-text FASTA.' };
  const records = parseFasta(text);
  if (!records.length) {
    return { ok: false, reason: 'No FASTA records found. Expected header lines starting with ">".' };
  }
  const totalBases = records.reduce((s, r) => s + r.sequence.length, 0);
  return { ok: true, records, totalBases };
}

// Sequences are kept in localStorage alongside analysisResult so the Sequence
// Explorer can inspect what was uploaded. They never leave the browser.
const MAX_STORED_CHARS = 2_000_000;

export type StoredSequences = { filename: string; records: FastaRecord[]; truncated: boolean; totalRecords: number };

export function storeSequences(filename: string, records: FastaRecord[]) {
  try {
    let used = 0;
    const kept: FastaRecord[] = [];
    for (const r of records) {
      used += r.sequence.length + r.header.length;
      if (used > MAX_STORED_CHARS) break;
      kept.push(r);
    }
    const payload: StoredSequences = {
      filename,
      records: kept,
      truncated: kept.length < records.length,
      totalRecords: records.length,
    };
    localStorage.setItem(SEQUENCES_KEY, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable — the explorer will show its empty state.
    try { localStorage.removeItem(SEQUENCES_KEY); } catch {}
  }
}

export function loadSequences(): StoredSequences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SEQUENCES_KEY);
    return raw ? (JSON.parse(raw) as StoredSequences) : null;
  } catch {
    return null;
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function pct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}
