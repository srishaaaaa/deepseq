// Nucleotide colours come from the validated categorical chart palette
// (see globals.css --cat-*). Letters are always rendered alongside, so colour
// is never the only identity cue.
export const NUCLEOTIDE_COLORS: Record<string, string> = {
  A: '#0e9fb4',
  T: '#d9607a',
  U: '#d9607a',
  G: '#bf821c',
  C: '#4c86ff',
  N: '#5b7184',
};

const PAIR: Record<string, string> = { A: 'T', T: 'A', U: 'A', G: 'C', C: 'G' };
export const complement = (b: string) => PAIR[b?.toUpperCase()] ?? 'N';

/** Short, generic illustrative strand for decorative scenes (not user data). */
export const DEMO_STRAND =
  'ATGGCACTGAGCGTTGACCTGAACCCTAGCATTACGGTACTAGCCGATTGCAGGTCAACTGGAATCCGTACGATGCTAGTTCAGGCATCGATCGGATTACAGCTTGACG';
