"""
DeepSeq analysis backend.

Auth and history are handled entirely by Supabase (see /supabase and
src/lib/supabase.ts, src/lib/api.ts) -- this service does one job: take a
FASTA file and return a classification result. It has no database of its
own.

Classification: a k-mer similarity search against a small curated
reference database (REFERENCE_DB below) -- this is a real, working
nearest-neighbor classifier (the same core idea BLAST/vsearch use, just
simplified), not a hash-based placeholder. It genuinely compares sequence
content and produces a real confidence score. Swap REFERENCE_DB for a
larger curated set (BOLD, SILVA, etc.) or replace classify_sequence()
entirely with a call to a fine-tuned Hugging Face model or a real
BLAST/vsearch subprocess call -- the surrounding code doesn't care how
the (scientific_name, classification, location, confidence) tuple was
produced.

Geolocation: per-read coordinates come from, in priority order:
  1. Explicit lat/lng embedded in the FASTA header (see parse_header_geo)
  2. Real occurrence records from the GBIF API for the classified species
  3. A simulated fallback cluster, only used if neither of the above
     is available (e.g. no internet access, or GBIF has no records)
Each geo_profile reports which source was used (coordinate_source) so the
frontend/report can be honest about what's real data vs. a placeholder.

Run with:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""

import re
import random
from collections import Counter
from typing import Dict, List, Optional, Tuple

import requests
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="DeepSeq Analysis API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Upload validation limits
# ---------------------------------------------------------------------------

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {".fasta", ".fastq", ".fa", ".fna"}
# IUPAC nucleotide codes, plus whitespace -- anything else means this
# probably isn't actually a FASTA/FASTQ sequence.
VALID_SEQUENCE_CHARS = set("ACGTURYSWKMBDHVNacgturyswkmbdhvn \t\r\n")

# ---------------------------------------------------------------------------
# Reference database -- replace/extend with real barcode sequences from
# BOLD/SILVA/NCBI for production use.
# ---------------------------------------------------------------------------

REFERENCE_DB = [
    {
        "scientific_name": "Orcinus orca",
        "classification": "Mammal",
        "location": "North Atlantic",
        "sequence": "TTTGGCTACTAATCAGTCGATTACACCCAGTCGATTT",
    },
    {
        "scientific_name": "Thunnus albacares",
        "classification": "Fish",
        "location": "Pacific Ocean",
        "sequence": "CCGGAGCTAGCTAGCTAGCTAGCTGATTACACACAA",
    },
    {
        "scientific_name": "Thunnus obesus",
        "classification": "Fish",
        "location": "Indian Ocean",
        "sequence": "AAAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTGG",
    },
    {
        "scientific_name": "Chauliodus sloani",
        "classification": "Fish",
        "location": "Deep Sea / Mesopelagic",
        "sequence": "CATGACTGACGTAGCATCGGATCAGTCAGTACGGAT",
    },
    {
        "scientific_name": "Carcharodon carcharias",
        "classification": "Fish",
        "location": "Global Temperate Coastal Waters",
        "sequence": "GGCTTAGCCTAGGATCCGTTAGCCTAGGACCTTAGCA",
    },
    {
        "scientific_name": "Gadus morhua",
        "classification": "Fish",
        "location": "North Atlantic",
        "sequence": "CATGCATGACTGACTGCATGACTGCATGACTGCATGA",
    },
    {
        "scientific_name": "Salmo salar",
        "classification": "Fish",
        "location": "North Atlantic",
        "sequence": "TACGTACGATCGATCGTACGATCGTACGATCGTACGA",
    },
    {
        "scientific_name": "Physeter macrocephalus",
        "classification": "Mammal",
        "location": "Deep Ocean / Global",
        "sequence": "TGCATGCATGCATGGGCATGCATCGATCGATCGATGG",
    },
    {
        "scientific_name": "Tursiops truncatus",
        "classification": "Mammal",
        "location": "Coastal Waters Worldwide",
        "sequence": "CCTAGGCCTAGGACTTAGGCCTTAGGACCTAGGCTTA",
    },
    {
        "scientific_name": "Chelonia mydas",
        "classification": "Reptile",
        "location": "Tropical / Subtropical Coastal Waters",
        "sequence": "AACCGGTTAACCGGTTCCAAGGTTCCAAGGTTAACCG",
    },
    {
        "scientific_name": "Octopus vulgaris",
        "classification": "Cephalopod",
        "location": "Mediterranean & Eastern Atlantic",
        "sequence": "GATCGATCGATCCGATCGATGGATCGATCCGATCGAT",
    },
    {
        "scientific_name": "Architeuthis dux",
        "classification": "Cephalopod",
        "location": "Deep Sea / Mesopelagic",
        "sequence": "TTGGCCAATTGGCCAATTCCGGAATTGGCCAATTGGC",
    },
    {
        "scientific_name": "Panulirus argus",
        "classification": "Crustacean",
        "location": "Caribbean Sea",
        "sequence": "AAGGTTCCAAGGTTCCGGAATTCCAAGGTTCCAAGGT",
    },
    {
        "scientific_name": "Acropora cervicornis",
        "classification": "Coral",
        "location": "Caribbean Reefs",
        "sequence": "CGTACGTACGTAGCTAGCTAGCTACGTACGTAGCTAG",
    },
    {
        "scientific_name": "Calanus finmarchicus",
        "classification": "Plankton",
        "location": "North Atlantic",
        "sequence": "ATATATATCGCGCGCGATATATATCGCGCGCGATATC",
    },
    {
        "scientific_name": "Aptenodytes forsteri",
        "classification": "Bird",
        "location": "Antarctic Coastal Waters",
        "sequence": "GGGAATTCCCGGGAATTCCCGGGAATTCCCGGGAATT",
    },
]

# Below this similarity, we don't trust the match at all.
CONFIDENCE_THRESHOLD = 0.2
K = 4  # k-mer size


def kmer_set(sequence: str, k: int = K) -> set:
    sequence = sequence.upper()
    if len(sequence) < k:
        return {sequence}
    return {sequence[i : i + k] for i in range(len(sequence) - k + 1)}


def jaccard_similarity(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    intersection = len(a & b)
    union = len(a | b)
    return intersection / union if union else 0.0


# Pre-compute reference k-mer sets once at startup.
for ref in REFERENCE_DB:
    ref["_kmers"] = kmer_set(ref["sequence"])


def classify_sequence(header: str, sequence: str) -> Tuple[str, str, str, float]:
    """Real k-mer nearest-neighbor classifier. Returns
    (scientific_name, classification, location, confidence [0-1])."""
    query_kmers = kmer_set(sequence)

    best_ref = None
    best_score = 0.0
    for ref in REFERENCE_DB:
        score = jaccard_similarity(query_kmers, ref["_kmers"])
        if score > best_score:
            best_score = score
            best_ref = ref

    if best_ref is None or best_score < CONFIDENCE_THRESHOLD:
        return ("Unclassified taxon", "Unknown", "Unassigned", round(best_score, 3))

    return (
        best_ref["scientific_name"],
        best_ref["classification"],
        best_ref["location"],
        round(best_score, 3),
    )


# ---------------------------------------------------------------------------
# FASTA parsing
# ---------------------------------------------------------------------------


def parse_fasta(raw_text: str) -> List[Tuple[str, str]]:
    records = []
    header, seq_lines = None, []
    for line in raw_text.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith(">"):
            if header is not None:
                records.append((header, "".join(seq_lines)))
            header, seq_lines = line[1:], []
        else:
            seq_lines.append(line)
    if header is not None:
        records.append((header, "".join(seq_lines)))
    return records


# Matches things like "lat:12.34,lng:56.78", "lat=12.34_lng=-56.78", etc.
GEO_HEADER_PATTERN = re.compile(
    r"lat[:=]\s*(-?\d+\.?\d*)[,;_\s]+lng[:=]\s*(-?\d+\.?\d*)", re.IGNORECASE
)


def parse_header_geo(header: str) -> Optional[Tuple[float, float]]:
    """If the FASTA header carries explicit sampling-site coordinates
    (e.g. '>Read1_Orca|lat:70.5,lng:-20.3'), use them directly."""
    match = GEO_HEADER_PATTERN.search(header)
    if not match:
        return None
    try:
        lat, lng = float(match.group(1)), float(match.group(2))
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return (lat, lng)
    except ValueError:
        pass
    return None


# ---------------------------------------------------------------------------
# Geolocation -- GBIF occurrence lookup, with an in-memory cache and a
# simulated fallback.
# ---------------------------------------------------------------------------

_gbif_cache: Dict[str, List[List[float]]] = {}


def fetch_gbif_coordinates(scientific_name: str, limit: int = 10) -> List[List[float]]:
    """Real occurrence coordinates for a species from GBIF's public API.
    Returns [] on any failure (no internet, no records, timeout, etc.) so
    callers can fall back gracefully -- this must never raise."""
    if scientific_name in _gbif_cache:
        return _gbif_cache[scientific_name]

    coords: List[List[float]] = []
    try:
        response = requests.get(
            "https://api.gbif.org/v1/occurrence/search",
            params={
                "scientificName": scientific_name,
                "hasCoordinate": "true",
                "limit": limit,
            },
            timeout=5,
        )
        if response.ok:
            for record in response.json().get("results", []):
                lat, lng = record.get("decimalLatitude"), record.get("decimalLongitude")
                if lat is not None and lng is not None:
                    coords.append([lat, lng])
    except requests.exceptions.RequestException:
        coords = []  # offline, DNS failure, timeout, etc. -- fall back silently

    _gbif_cache[scientific_name] = coords
    return coords


def fake_coordinates(seed_text: str, count: int = 6) -> List[List[float]]:
    """Simulated cluster -- last-resort fallback only, used when neither
    header metadata nor GBIF has anything for this species."""
    rng = random.Random(seed_text)
    base_lat = rng.uniform(-60, 60)
    base_lng = rng.uniform(-180, 180)
    return [
        [
            max(-90, min(90, base_lat + rng.uniform(-8, 8))),
            max(-180, min(180, base_lng + rng.uniform(-8, 8))),
        ]
        for _ in range(count)
    ]


def resolve_coordinates(
    scientific_name: str, header_coords: List[Tuple[float, float]]
) -> Tuple[List[List[float]], str]:
    """Priority: header metadata > GBIF real occurrences > simulated fallback."""
    if header_coords:
        return [[lat, lng] for lat, lng in header_coords], "header_metadata"

    gbif_coords = fetch_gbif_coordinates(scientific_name)
    if gbif_coords:
        return gbif_coords, "gbif_occurrence_data"

    return fake_coordinates(scientific_name), "simulated"


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def validate_upload(filename: str, raw_bytes: bytes, raw_text: str) -> None:
    """Raises HTTPException with a clear message if the upload fails any
    check. Keeps /analyze/ from wasting cycles on junk or oversized input."""
    if len(raw_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(raw_bytes) / 1024 / 1024:.1f} MB). "
            f"Max allowed is {MAX_FILE_SIZE_BYTES / 1024 / 1024:.0f} MB.",
        )

    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext or filename}'. "
            f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}.",
        )

    stripped = raw_text.strip()
    if not stripped.startswith(">"):
        raise HTTPException(
            status_code=400,
            detail="File doesn't look like FASTA/FASTQ -- expected it to start with '>'.",
        )

    # Reject files where too much of the actual sequence content (not the
    # free-text headers) falls outside valid nucleotide characters -- a
    # cheap sniff test against binary or unrelated text files that happen
    # to have a matching extension.
    sample_lines = raw_text[:20000].splitlines()  # cap the scan for very large files
    sequence_chars = "".join(line for line in sample_lines if not line.startswith(">"))
    if sequence_chars:
        invalid_chars = sum(1 for ch in sequence_chars if ch not in VALID_SEQUENCE_CHARS)
        if invalid_chars / len(sequence_chars) > 0.15:
            raise HTTPException(
                status_code=400,
                detail="File content doesn't look like valid nucleotide sequences.",
            )


# ---------------------------------------------------------------------------
# Analysis endpoint
# ---------------------------------------------------------------------------


@app.post("/analyze/")
@limiter.limit("10/minute")
async def analyze(request: Request, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    raw_bytes = await file.read()
    try:
        raw_text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be plain-text FASTA/FASTQ.")

    validate_upload(file.filename, raw_bytes, raw_text)

    records = parse_fasta(raw_text)
    if not records:
        raise HTTPException(
            status_code=400,
            detail="No FASTA records found. Expected lines starting with '>'.",
        )

    # classifications: list of (scientific_name, classification, location, confidence)
    classifications = [classify_sequence(h, s) for h, s in records]
    species_counts = Counter(c[0] for c in classifications)
    total_reads = len(records)

    # Average confidence per species, for the abundance table.
    confidence_by_species: Dict[str, List[float]] = {}
    for c in classifications:
        confidence_by_species.setdefault(c[0], []).append(c[3])

    abundance_distribution = [
        {
            "species": species,
            "count": count,
            "relative_abundance": round(count / total_reads, 4),
            "avg_confidence": round(
                sum(confidence_by_species[species]) / len(confidence_by_species[species]), 3
            ),
        }
        for species, count in species_counts.items()
    ]

    # Group header-level geo hints per species, for header-priority coordinates.
    header_geo_by_species: Dict[str, List[Tuple[float, float]]] = {}
    for (header, _seq), (scientific_name, _cls, _loc, _conf) in zip(records, classifications):
        geo = parse_header_geo(header)
        if geo:
            header_geo_by_species.setdefault(scientific_name, []).append(geo)

    geo_profiles = []
    seen = set()
    for scientific_name, classification, location, confidence in classifications:
        if scientific_name in seen:
            continue
        seen.add(scientific_name)

        coords, coordinate_source = resolve_coordinates(
            scientific_name, header_geo_by_species.get(scientific_name, [])
        )
        avg_conf = round(
            sum(confidence_by_species[scientific_name]) / len(confidence_by_species[scientific_name]), 3
        )

        geo_profiles.append(
            {
                "scientific_name": scientific_name,
                "classification": classification,
                "location": location,
                "coordinates": coords,
                "coordinate_source": coordinate_source,
                "confidence": avg_conf,
            }
        )

    return {
        "file_info": {"filename": file.filename},
        "biodiversity_summary": {
            "total_reads_processed": total_reads,
            "unique_species_identified": len(species_counts),
            "abundance_distribution": abundance_distribution,
        },
        "geo_profiles": geo_profiles,
    }
