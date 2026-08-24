import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly at build/runtime instead of silently hitting undefined URLs.
  console.warn(
    'Supabase env vars are missing. Copy .env.local.example to .env.local and fill in your project URL + anon key.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
