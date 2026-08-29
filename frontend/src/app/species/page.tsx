"use client";

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { FiArrowLeft, FiDatabase, FiMapPin, FiHash } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';

const OceanScene = dynamic(() => import('@/components/ocean/OceanScene'), { ssr: false });

// Mirrors backend/main.py's REFERENCE_DB. Kept in sync manually for now —
// if the backend gets a real endpoint to list its reference set, swap this
// static array for a fetch call.
const REFERENCE_SPECIES = [
  {
    scientific_name: 'Orcinus orca',
    common_name: 'Orca / Killer Whale',
    classification: 'Mammal',
    location: 'North Atlantic',
    blurb: 'Apex predator cetacean, used here as a large-mammal reference barcode.',
  },
  {
    scientific_name: 'Thunnus albacares',
    common_name: 'Yellowfin Tuna',
    classification: 'Fish',
    location: 'Pacific Ocean',
    blurb: 'Widely distributed pelagic fish, a common eDNA hit in warm open water.',
  },
  {
    scientific_name: 'Thunnus obesus',
    common_name: 'Bigeye Tuna',
    classification: 'Fish',
    location: 'Indian Ocean',
    blurb: 'Close relative of yellowfin tuna — a useful test of the classifier’s resolving power between similar species.',
  },
  {
    scientific_name: 'Chauliodus sloani',
    common_name: 'Sloane’s Viperfish',
    classification: 'Fish',
    location: 'Deep Sea / Mesopelagic',
    blurb: 'Deep-sea mesopelagic fish, representing the low-light/high-pressure end of the reference set.',
  },
  {
    scientific_name: 'Carcharodon carcharias',
    common_name: 'Great White Shark',
    classification: 'Fish',
    location: 'Global Temperate Coastal Waters',
    blurb: 'Large cartilaginous predator — a distinct barcode from the bony-fish tuna entries above.',
  },
  {
    scientific_name: 'Gadus morhua',
    common_name: 'Atlantic Cod',
    classification: 'Fish',
    location: 'North Atlantic',
    blurb: 'Historically the backbone of North Atlantic fisheries; a common target species for eDNA monitoring.',
  },
  {
    scientific_name: 'Salmo salar',
    common_name: 'Atlantic Salmon',
    classification: 'Fish',
    location: 'North Atlantic',
    blurb: 'Anadromous fish moving between fresh and salt water — useful for river-mouth sampling sites.',
  },
  {
    scientific_name: 'Physeter macrocephalus',
    common_name: 'Sperm Whale',
    classification: 'Mammal',
    location: 'Deep Ocean / Global',
    blurb: 'Deepest-diving cetacean, included alongside orca to test mammal-vs-mammal resolution.',
  },
  {
    scientific_name: 'Tursiops truncatus',
    common_name: 'Common Bottlenose Dolphin',
    classification: 'Mammal',
    location: 'Coastal Waters Worldwide',
    blurb: 'One of the most frequently observed coastal cetaceans in eDNA surveys.',
  },
  {
    scientific_name: 'Chelonia mydas',
    common_name: 'Green Sea Turtle',
    classification: 'Reptile',
    location: 'Tropical / Subtropical Coastal Waters',
    blurb: 'First reptile entry in the reference set — a conservation-priority species in many regions.',
  },
  {
    scientific_name: 'Octopus vulgaris',
    common_name: 'Common Octopus',
    classification: 'Cephalopod',
    location: 'Mediterranean & Eastern Atlantic',
    blurb: 'Soft-bodied mollusc, a useful barcode-diversity test since cephalopods lack the shells most references assume.',
  },
  {
    scientific_name: 'Architeuthis dux',
    common_name: 'Giant Squid',
    classification: 'Cephalopod',
    location: 'Deep Sea / Mesopelagic',
    blurb: 'Elusive deep-sea cephalopod, rarely observed directly — eDNA is one of the few practical ways to detect it.',
  },
  {
    scientific_name: 'Panulirus argus',
    common_name: 'Caribbean Spiny Lobster',
    classification: 'Crustacean',
    location: 'Caribbean Sea',
    blurb: 'First crustacean entry — commercially important species for regional fisheries monitoring.',
  },
  {
    scientific_name: 'Acropora cervicornis',
    common_name: 'Staghorn Coral',
    classification: 'Coral',
    location: 'Caribbean Reefs',
    blurb: 'Critically endangered reef-building coral — eDNA offers a non-invasive way to track reef health.',
  },
  {
    scientific_name: 'Calanus finmarchicus',
    common_name: 'Copepod',
    classification: 'Plankton',
    location: 'North Atlantic',
    blurb: 'Keystone zooplankton species underpinning North Atlantic food webs.',
  },
  {
    scientific_name: 'Aptenodytes forsteri',
    common_name: 'Emperor Penguin',
    classification: 'Bird',
    location: 'Antarctic Coastal Waters',
    blurb: 'First bird entry — included to show the reference set spans more than marine life in the water column.',
  },
];

const CLASSIFICATION_TONE: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  Mammal: 'info',
  Fish: 'info',
  Reptile: 'success',
  Cephalopod: 'danger',
  Crustacean: 'warning',
  Coral: 'danger',
  Plankton: 'success',
  Bird: 'warning',
};

export default function SpeciesLibraryPage() {
  return (
    <div className="relative min-h-screen bg-brand-950 text-white p-8">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950" />
        <div className="absolute -top-32 left-1/4 h-[26rem] w-[26rem] rounded-full bg-cyan-500/[0.06] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[22rem] w-[22rem] rounded-full bg-teal-500/[0.06] blur-[110px]" />
      </div>
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-40">
        <OceanScene variant="light" fish />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto animate-fade-in">
        <Link href="/upload" className="inline-flex items-center text-brand-300 hover:text-brand-200 transition-colors mb-6">
          <FiArrowLeft className="mr-2" /> Back to Upload
        </Link>

        <PageHeader
          title="Species Reference Library"
          icon={<FiDatabase />}
          subtitle="Every upload is classified by comparing its DNA k-mers against this curated reference database using Jaccard similarity — the same nearest-neighbor idea BLAST/vsearch use, simplified for a fast, dependency-light match."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {REFERENCE_SPECIES.map((sp, i) => (
            <Card
              key={sp.scientific_name}
              interactive
              className="animate-slide-up"
              style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-lg font-semibold italic">{sp.scientific_name}</h2>
                  <p className="text-sm text-gray-400">{sp.common_name}</p>
                </div>
                <Badge tone={CLASSIFICATION_TONE[sp.classification] || 'neutral'}>
                  {sp.classification}
                </Badge>
              </div>
              <p className="text-sm text-gray-300 mb-4">{sp.blurb}</p>
              <div className="flex items-center text-xs text-gray-500">
                <FiMapPin className="mr-1" /> {sp.location}
              </div>
            </Card>
          ))}
        </div>

        <Card padding="lg" className="mt-8 bg-gray-800/60 flex items-start">
          <FiHash className="h-5 w-5 text-brand-300 mr-3 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-400">
            This starter set has {REFERENCE_SPECIES.length} entries — enough to demonstrate the
            classification pipeline end to end. Production use would swap in a larger curated
            barcode set (BOLD, SILVA, or NCBI) without changing anything else downstream.
          </p>
        </Card>
      </div>
    </div>
  );
}
