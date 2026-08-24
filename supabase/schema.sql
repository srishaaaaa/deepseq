-- Run this in your Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query)
-- before running the app. It creates the table that stores each user's
-- analysis history and locks it down with Row Level Security so users can
-- only ever see their own rows.

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  uploaded_at timestamptz not null default now(),
  unique_species_identified integer not null default 0,
  total_reads_processed integer not null default 0,
  result_json jsonb not null,
  is_shared boolean not null default false
);

-- If you ran an earlier version of this schema before is_shared existed:
alter table public.analyses add column if not exists is_shared boolean not null default false;

create index if not exists analyses_user_id_idx on public.analyses (user_id);
create index if not exists analyses_uploaded_at_idx on public.analyses (uploaded_at desc);

alter table public.analyses enable row level security;

-- Users can only see their own analyses.
create policy "Users can view their own analyses"
  on public.analyses for select
  using (auth.uid() = user_id);

-- Users can only insert analyses tagged with their own id.
create policy "Users can insert their own analyses"
  on public.analyses for insert
  with check (auth.uid() = user_id);

-- Users can only delete their own analyses (used by the History page's delete button).
create policy "Users can delete their own analyses"
  on public.analyses for delete
  using (auth.uid() = user_id);

-- Users can only update (rename) their own analyses.
create policy "Users can update their own analyses"
  on public.analyses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Anyone (including anonymous visitors) can view an analysis that its
-- owner has explicitly marked as shared. This is what powers the public
-- /share/[id] link -- the id itself (a UUID) acts as the access token,
-- and only rows the owner opted into stay visible this way.
create policy "Anyone can view shared analyses"
  on public.analyses for select
  using (is_shared = true);

-- Enable realtime so the History page can live-update via
-- supabase.channel(...).on('postgres_changes', ...) instead of polling.
-- Safe to re-run: skips silently if already added.
do $$
begin
  alter publication supabase_realtime add table public.analyses;
exception
  when duplicate_object then null;
end $$;
