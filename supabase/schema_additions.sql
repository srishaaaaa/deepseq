-- Additional tables for DeepSeq — run this AFTER supabase/schema.sql in the
-- same SQL Editor. Adds:
--   1. public.reference_species  — the classifier's reference database as a
--      real table instead of the hardcoded REFERENCE_DB array in
--      backend/main.py. Publicly readable (it's not user data), only
--      editable by authenticated users — swap the insert/update/delete
--      policies below for an admin-only check if you add role-based access.
--   2. public.user_settings      — one row per user for app preferences
--      (confidence threshold, default export format, theme). Backs a
--      future Settings page the same way `analyses` backs History.

-- ---------------------------------------------------------------------
-- 1. reference_species
-- ---------------------------------------------------------------------

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

-- Anyone can browse the reference library, including anonymous visitors —
-- this mirrors the public /species page.
create policy "Anyone can view reference species"
  on public.reference_species for select
  using (true);

-- Only signed-in users can add/edit/remove entries. Tighten this to a
-- specific admin role (e.g. via a custom claim or an `is_admin` column on
-- profiles) before opening an admin UI in production.
create policy "Authenticated users can insert reference species"
  on public.reference_species for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update reference species"
  on public.reference_species for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete reference species"
  on public.reference_species for delete
  to authenticated
  using (true);

-- Seed with the same 4 entries currently hardcoded in backend/main.py's
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

-- ---------------------------------------------------------------------
-- 2. user_settings
-- ---------------------------------------------------------------------

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  confidence_threshold numeric not null default 0.2,   -- mirrors backend CONFIDENCE_THRESHOLD
  default_export_format text not null default 'pdf',   -- 'pdf' | 'csv' | 'geojson'
  theme text not null default 'dark',                  -- 'dark' | 'light'
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at current on every change.
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
