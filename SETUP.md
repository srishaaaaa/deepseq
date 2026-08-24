# DeepSeq — Setup Guide

## Architecture

- **Frontend**: Next.js (`/src`) — UI, upload flow, globe/report views.
- **Backend**: FastAPI (`/backend`) — stateless. Its only job is
  `POST /analyze/`: take a FASTA file, return a classification result.
  It has no database and knows nothing about users.
- **Supabase**: owns everything else —
  - **Auth**: signup/login/sessions (`supabase.auth.*`)
  - **Database**: a Postgres `analyses` table stores each user's
    analysis history, protected by Row Level Security so users can only
    ever see their own rows.

## 1. Set up Supabase

1. Create a project at https://supabase.com (free tier is enough).
2. In the Dashboard, go to **SQL Editor → New query**, paste the
   contents of `supabase/schema.sql`, and run it. This creates the
   `analyses` table and its RLS policies.
3. Go to **Project Settings → API** and copy your **Project URL** and
   **anon public key**.
4. By default Supabase requires email confirmation before login works.
   For local dev/demo, turn that off: **Authentication → Providers →
   Email → toggle off "Confirm email"**. (Leave it on for a real
   production launch — signup now correctly detects this and shows a
   "check your email" message instead of assuming the user is logged in.)
5. For password reset emails to work, set your **Site URL** under
   **Authentication → URL Configuration** to `http://localhost:3000`
   for local dev (or your real domain in production) — Supabase uses
   this to build the reset link.

## 2. Configure the frontend

```bash
cp .env.local.example .env.local
```
Edit `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```
`PYTHON_API_URL` can stay as `http://localhost:8000` for local dev.

## 3. Run it

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend (separate terminal):**
```bash
npm install
npm run dev
```

Open http://localhost:3000 → Sign Up for a real account (creates a row
in Supabase's `auth.users`) → Upload (single file, or select/drag
several at once to compare across sites) → you'll land on the Globe
page (or the Compare page for multi-file uploads), then "View Analysis
Insights" for the report/PDF/CSV/GeoJSON exports. Every analysis while
logged in is saved to Supabase automatically — check **History** in
the nav to rename, delete, share, or reopen any of them.

## What's a placeholder vs. what's real

**Real and working:**
- Accounts, sessions, login/logout, password reset via email, saved
  history (all via Supabase), RLS-enforced data isolation between users
- Rename/delete history entries; realtime updates on the History page
- Batch upload: select or drag multiple files at once; each is
  analyzed and saved individually, with a Compare page showing species
  richness, read depth, and a presence/absence matrix across files
- Export: PDF (existing), plus CSV and GeoJSON for downstream GIS/stats
  tools — one row/feature per species or coordinate respectively
- Shareable public links: toggle "Share" on any history entry to get a
  `/share/[id]` link that works for anyone, no account needed — gated
  by a Row Level Security policy, not just UI hiding
- Rate limiting (10 requests/minute per IP on `/analyze/`) and file
  validation (extension, 5 MB size cap, and a content sniff test that
  rejects non-FASTA uploads before wasting classification time)
- Classification: a genuine k-mer similarity search (`backend/main.py`,
  `classify_sequence()`) against a small curated reference database —
  the same core nearest-neighbor idea BLAST/vsearch use, just simplified.
  It's not a trained model, but it's a real algorithm comparing actual
  sequence content, not a hash/random placeholder.
- Confidence scores: the k-mer similarity score itself (0–100%), shown
  as color-coded badges on the Report page and used as the heatmap
  intensity on the Globe.
- Geolocation, in priority order: (1) explicit `lat:`/`lng:` coordinates
  embedded in a FASTA header, (2) real occurrence records pulled live
  from the GBIF API for the classified species, (3) a simulated cluster
  only if neither of those is available. Each result reports which
  source was used (`coordinate_source` in the API, shown on both the
  Globe and Report pages).

**Still a placeholder / next steps for production:**
- `REFERENCE_DB` in `backend/main.py` has 4 entries. Swap in a real
  curated reference set (BOLD, SILVA, NCBI) for genuine biodiversity
  coverage, or replace `classify_sequence()` entirely with a call to a
  fine-tuned Hugging Face model or a real BLAST/vsearch subprocess —
  the rest of the pipeline doesn't care how the
  `(scientific_name, classification, location, confidence)` tuple was
  produced.
- GBIF lookups need outbound internet access from wherever the backend
  runs; if that's blocked, results fall back to simulated coordinates
  automatically (no crash, just a `coordinate_source: "simulated"` tag).
- The rate limiter (`slowapi`) is in-memory and per-process — fine for
  a single backend instance, but won't share limits across multiple
  instances behind a load balancer. Swap in a Redis-backed limiter
  (slowapi supports this) if you scale horizontally.

## Deploying

- Frontend → Vercel. Set `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `PYTHON_API_URL` (pointing at
  your deployed backend) as environment variables there — `.env.local`
  is dev-only and never gets deployed.
- Backend → Render, Railway, or Fly.io all work fine for a small
  FastAPI service. Once deployed, update `PYTHON_API_URL` in Vercel to
  its public URL, and add that same URL to the CORS `allow_origins`
  list in `backend/main.py` alongside `http://localhost:3000`.
- Supabase itself is already hosted — nothing to deploy there beyond
  the schema you already ran.
