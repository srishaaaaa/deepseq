-- =====================================================================
-- DeepSeq — Full Supabase Schema
-- =====================================================================
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste all of this -> Run).
-- Safe to re-run: every statement uses "if not exists" / "on conflict"
-- / "or replace" so re-running won't error or duplicate data.
--
-- Tables created:
--   1. public.analyses          — each user's saved analysis results
--   2. public.reference_species — the classifier's reference database
--   3. public.user_settings     — per-user app preferences
-- =====================================================================


-- =====================================================================
-- 1. ANALYSES
-- Stores each user's analysis history. Powers: Upload (save), History,
-- Dashboard, Analytics, Explore, Compare, Report, and the public
-- /share/[id] page.
-- =====================================================================

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

drop policy if exists "Users can view their own analyses" on public.analyses;
create policy "Users can view their own analyses"
  on public.analyses for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own analyses" on public.analyses;
create policy "Users can insert their own analyses"
  on public.analyses for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own analyses" on public.analyses;
create policy "Users can delete their own analyses"
  on public.analyses for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own analyses" on public.analyses;
create policy "Users can update their own analyses"
  on public.analyses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Anyone (including anonymous visitors) can view an analysis its owner
-- has explicitly marked as shared. Powers the public /share/[id] link —
-- the id (a UUID) is the access token; only opted-in rows are exposed.
drop policy if exists "Anyone can view shared analyses" on public.analyses;
create policy "Anyone can view shared analyses"
  on public.analyses for select
  using (is_shared = true);

-- Realtime so History/Dashboard can live-update via
-- supabase.channel(...).on('postgres_changes', ...) instead of polling.
do $$
begin
  alter publication supabase_realtime add table public.analyses;
exception
  when duplicate_object then null;
end $$;


-- =====================================================================
-- 2. REFERENCE_SPECIES
-- The classifier's reference database as a real table, mirroring
-- REFERENCE_DB in backend/main.py. Powers the /species library page
-- (and can back an admin edit UI later without any schema changes).
-- =====================================================================

create table if not exists public.reference_species (
  id uuid primary key default gen_random_uuid(),
  scientific_name text not null unique,
  common_name text,
  classification text not null,       -- e.g. 'Fish', 'Mammal'
  location text,                      -- typical region, shown as a label
  sequence text not null,             -- reference barcode sequence
  blurb text,                         -- short description for the library UI
  created_at timestamptz not null default now()
);

create index if not exists reference_species_classification_idx
  on public.reference_species (classification);

alter table public.reference_species enable row level security;

-- Public library — anyone, including anonymous visitors, can browse it.
drop policy if exists "Anyone can view reference species" on public.reference_species;
create policy "Anyone can view reference species"
  on public.reference_species for select
  using (true);

-- Any signed-in user can manage entries for now. Tighten to a specific
-- admin role (e.g. an `is_admin` column checked via a helper function)
-- before exposing an admin UI in production.
drop policy if exists "Authenticated users can insert reference species" on public.reference_species;
create policy "Authenticated users can insert reference species"
  on public.reference_species for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update reference species" on public.reference_species;
create policy "Authenticated users can update reference species"
  on public.reference_species for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete reference species" on public.reference_species;
create policy "Authenticated users can delete reference species"
  on public.reference_species for delete
  to authenticated
  using (true);

-- Seed with the same entries currently hardcoded in backend/main.py's
-- REFERENCE_DB, so the table starts in sync with the classifier.
insert into public.reference_species (scientific_name, common_name, classification, location, sequence, blurb)
values
  ('Orcinus orca', 'Orca / Killer Whale', 'Mammal', 'North Atlantic',
   'TTTGGCTACTAATCAGTCGATTACACCCAGTCGATTT',
   'Apex predator cetacean, used here as a large-mammal reference barcode.'),
  ('Thunnus albacares', 'Yellowfin Tuna', 'Fish', 'Pacific Ocean',
   'CCGGAGCTAGCTAGCTAGCTAGCTGATTACACACAA',
   'Widely distributed pelagic fish, a common eDNA hit in warm open water.'),
  ('Thunnus obesus', 'Bigeye Tuna', 'Fish', 'Indian Ocean',
   'AAAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTGG',
   'Close relative of yellowfin tuna — tests the classifier''s resolving power between similar species.'),
  ('Chauliodus sloani', 'Sloane''s Viperfish', 'Fish', 'Deep Sea / Mesopelagic',
   'CATGACTGACGTAGCATCGGATCAGTCAGTACGGAT',
   'Deep-sea mesopelagic fish, representing the low-light/high-pressure end of the reference set.'),
  ('Carcharodon carcharias', 'Great White Shark', 'Fish', 'Global Temperate Coastal Waters',
   'GGCTTAGCCTAGGATCCGTTAGCCTAGGACCTTAGCA',
   'Large cartilaginous predator — a distinct barcode from the bony-fish tuna entries above.'),
  ('Gadus morhua', 'Atlantic Cod', 'Fish', 'North Atlantic',
   'CATGCATGACTGACTGCATGACTGCATGACTGCATGA',
   'Historically the backbone of North Atlantic fisheries; a common target species for eDNA monitoring.'),
  ('Salmo salar', 'Atlantic Salmon', 'Fish', 'North Atlantic',
   'TACGTACGATCGATCGTACGATCGTACGATCGTACGA',
   'Anadromous fish moving between fresh and salt water — useful for river-mouth sampling sites.'),
  ('Physeter macrocephalus', 'Sperm Whale', 'Mammal', 'Deep Ocean / Global',
   'TGCATGCATGCATGGGCATGCATCGATCGATCGATGG',
   'Deepest-diving cetacean, included alongside orca to test mammal-vs-mammal resolution.'),
  ('Tursiops truncatus', 'Common Bottlenose Dolphin', 'Mammal', 'Coastal Waters Worldwide',
   'CCTAGGCCTAGGACTTAGGCCTTAGGACCTAGGCTTA',
   'One of the most frequently observed coastal cetaceans in eDNA surveys.'),
  ('Chelonia mydas', 'Green Sea Turtle', 'Reptile', 'Tropical / Subtropical Coastal Waters',
   'AACCGGTTAACCGGTTCCAAGGTTCCAAGGTTAACCG',
   'First reptile entry in the reference set — a conservation-priority species in many regions.'),
  ('Octopus vulgaris', 'Common Octopus', 'Cephalopod', 'Mediterranean & Eastern Atlantic',
   'GATCGATCGATCCGATCGATGGATCGATCCGATCGAT',
   'Soft-bodied mollusc, a useful barcode-diversity test since cephalopods lack the shells most references assume.'),
  ('Architeuthis dux', 'Giant Squid', 'Cephalopod', 'Deep Sea / Mesopelagic',
   'TTGGCCAATTGGCCAATTCCGGAATTGGCCAATTGGC',
   'Elusive deep-sea cephalopod, rarely observed directly — eDNA is one of the few practical ways to detect it.'),
  ('Panulirus argus', 'Caribbean Spiny Lobster', 'Crustacean', 'Caribbean Sea',
   'AAGGTTCCAAGGTTCCGGAATTCCAAGGTTCCAAGGT',
   'First crustacean entry — commercially important species for regional fisheries monitoring.'),
  ('Acropora cervicornis', 'Staghorn Coral', 'Coral', 'Caribbean Reefs',
   'CGTACGTACGTAGCTAGCTAGCTACGTACGTAGCTAG',
   'Critically endangered reef-building coral — eDNA offers a non-invasive way to track reef health.'),
  ('Calanus finmarchicus', 'Copepod', 'Plankton', 'North Atlantic',
   'ATATATATCGCGCGCGATATATATCGCGCGCGATATC',
   'Keystone zooplankton species underpinning North Atlantic food webs.'),
  ('Aptenodytes forsteri', 'Emperor Penguin', 'Bird', 'Antarctic Coastal Waters',
   'GGGAATTCCCGGGAATTCCCGGGAATTCCCGGGAATT',
   'First bird entry — shows the reference set spans more than marine life in the water column.')
on conflict (scientific_name) do nothing;


-- =====================================================================
-- 3. USER_SETTINGS
-- One row per user for app preferences. Backs a future Settings page
-- the same way `analyses` backs History.
-- =====================================================================

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  confidence_threshold numeric not null default 0.2,   -- mirrors backend CONFIDENCE_THRESHOLD
  default_export_format text not null default 'pdf',   -- 'pdf' | 'csv' | 'geojson'
  theme text not null default 'dark',                  -- 'dark' | 'light'
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "Users can view their own settings" on public.user_settings;
create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own settings" on public.user_settings;
create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own settings" on public.user_settings;
create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at current on every change (shared by any table that adds
-- an updated_at trigger later).
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Done. Verify in Dashboard -> Table Editor: you should see analyses,
-- reference_species (4 seeded rows), and user_settings, all with RLS
-- enabled (the "shield" icon).
-- =====================================================================
