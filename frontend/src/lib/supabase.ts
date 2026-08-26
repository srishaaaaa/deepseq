import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False when the env vars are missing — every page that talks to Supabase
 * checks this so it can show a real message instead of hanging or crashing. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY (locally in .env.local, on Vercel in ' +
      'Project Settings -> Environment Variables).'
  );
}

// createClient() throws on an empty URL, which would kill the production
// build during prerendering rather than at the point of use. Fall back to a
// syntactically valid placeholder so the build completes; isSupabaseConfigured
// is what actually gates every call (see requireSupabase() in lib/api.ts).
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
