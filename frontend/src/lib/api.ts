import { supabase } from './supabase';

// --- Auth ---------------------------------------------------------------
// Supabase Auth handles accounts, sessions, and password storage. The
// session token lives in the supabase-js client's own storage (localStorage
// under a supabase.auth.* key) — we don't need to manage tokens ourselves.

export async function signup(username: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } }, // stored in user_metadata, shown as display name
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function isLoggedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export function getUsername(user: { user_metadata?: { username?: string } } | null): string | null {
  return user?.user_metadata?.username ?? null;
}

export async function requestPasswordReset(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

// --- Settings (Supabase Postgres table `user_settings`, one row per user) --

export type UserSettings = {
  confidence_threshold: number;
  default_export_format: 'pdf' | 'csv' | 'geojson';
  theme: 'dark' | 'light';
};

const DEFAULT_SETTINGS: UserSettings = {
  confidence_threshold: 0.2,
  default_export_format: 'pdf',
  theme: 'dark',
};

/** Returns the current user's settings, or sensible defaults if they
 * haven't saved any yet (no row created until the first save). */
export async function fetchSettings(): Promise<UserSettings> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return DEFAULT_SETTINGS;

  const { data, error } = await supabase
    .from('user_settings')
    .select('confidence_threshold, default_export_format, theme')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? DEFAULT_SETTINGS;
}

/** Upserts the current user's settings row. */
export async function saveSettings(settings: UserSettings): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error('You must be signed in to save settings.');

  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, ...settings }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}


// --- History (Supabase Postgres table `analyses`, protected by RLS) -----

export type HistoryItem = {
  id: string;
  filename: string;
  uploaded_at: string;
  unique_species_identified: number;
  total_reads_processed: number;
  is_shared: boolean;
};

export async function saveAnalysis(filename: string, result: any) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return; // not logged in — skip saving, still let the user see the result

  const { error } = await supabase.from('analyses').insert({
    user_id: user.id,
    filename,
    unique_species_identified: result?.biodiversity_summary?.unique_species_identified ?? 0,
    total_reads_processed: result?.biodiversity_summary?.total_reads_processed ?? 0,
    result_json: result,
  });
  if (error) throw new Error(error.message);
}

export async function fetchHistory(): Promise<HistoryItem[]> {
  const { data, error } = await supabase
    .from('analyses')
    .select('id, filename, uploaded_at, unique_species_identified, total_reads_processed, is_shared')
    .order('uploaded_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as HistoryItem[];
}

export async function fetchHistoryItem(id: string) {
  const { data, error } = await supabase.from('analyses').select('result_json').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data.result_json;
}

export async function renameAnalysis(id: string, newFilename: string) {
  const { error } = await supabase.from('analyses').update({ filename: newFilename }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteAnalysis(id: string) {
  const { error } = await supabase.from('analyses').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// --- Sharing --------------------------------------------------------------
// Toggling is_shared makes the row publicly readable (see the "Anyone can
// view shared analyses" RLS policy in supabase/schema.sql). The row's own
// id doubles as the access token in the public /share/[id] URL.

export async function setShared(id: string, shared: boolean) {
  const { error } = await supabase.from('analyses').update({ is_shared: shared }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** No auth required -- works for anonymous visitors, gated entirely by RLS
 * on is_shared = true. Returns null if the id doesn't exist or isn't shared. */
export async function fetchPublicAnalysis(id: string) {
  const { data, error } = await supabase
    .from('analyses')
    .select('filename, uploaded_at, result_json')
    .eq('id', id)
    .eq('is_shared', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Live-updates the History page whenever a row is inserted, updated, or
// deleted for this user — no manual refetch/polling needed. Call the
// returned function to unsubscribe (e.g. in a useEffect cleanup).
export function subscribeToHistory(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`analyses-changes-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'analyses', filter: `user_id=eq.${userId}` },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
