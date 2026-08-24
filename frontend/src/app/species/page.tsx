"use client";

import Link from 'next/link';
import { FiArrowLeft, FiDatabase, FiMapPin, FiHash } from 'react-icons/fi';

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
    blurb: 'Close relative of yellowfin tuna — a useful test of the classifier\u2019s resolving power between similar species.',
  },
  {
    scientific_name: 'Chauliodus sloani',
    common_name: 'Sloane\u2019s Viperfish',
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

const classificationStyles: Record<string, string> = {
  Mammal: 'bg-purple-900/50 text-purple-300 border-purple-700',
  Fish: 'bg-blue-900/50 text-blue-300 border-blue-700',
  Reptile: 'bg-green-900/50 text-green-300 border-green-700',
  Cephalopod: 'bg-pink-900/50 text-pink-300 border-pink-700',
  Crustacean: 'bg-orange-900/50 text-orange-300 border-orange-700',
  Coral: 'bg-rose-900/50 text-rose-300 border-rose-700',
  Plankton: 'bg-teal-900/50 text-teal-300 border-teal-700',
  Bird: 'bg-amber-900/50 text-amber-300 border-amber-700',
};

export default function SpeciesLibraryPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/upload" className="inline-flex items-center text-blue-300 hover:text-blue-200 mb-6">
          <FiArrowLeft className="mr-2" /> Back to Upload
        </Link>

        <div className="flex items-center mb-2">
          <FiDatabase className="h-7 w-7 text-blue-300 mr-3" />
          <h1 className="text-3xl font-bold">Species Reference Library</h1>
        </div>
        <p className="text-gray-400 mb-8 max-w-2xl">
          Every upload is classified by comparing its DNA k-mers against this curated reference
          database using Jaccard similarity — the same nearest-neighbor idea BLAST/vsearch use,
          simplified for a fast, dependency-light match.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {REFERENCE_SPECIES.map((sp) => (
            <div key={sp.scientific_name} className="rounded-lg bg-gray-800 p-6 hover:bg-gray-750 transition">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-lg font-semibold italic">{sp.scientific_name}</h2>
                  <p className="text-sm text-gray-400">{sp.common_name}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full border ${classificationStyles[sp.classification] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                  {sp.classification}
                </span>
              </div>
              <p className="text-sm text-gray-300 mb-4">{sp.blurb}</p>
              <div className="flex items-center text-xs text-gray-500">
                <FiMapPin className="mr-1" /> {sp.location}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg bg-gray-800/60 border border-gray-700 p-5 flex items-start">
          <FiHash className="h-5 w-5 text-blue-300 mr-3 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-400">
            This starter set has {REFERENCE_SPECIES.length} entries — enough to demonstrate the
            classification pipeline end to end. Production use would swap in a larger curated
            barcode set (BOLD, SILVA, or NCBI) without changing anything else downstream.
          </p>
        </div>
      </div>
    </div>
  );
}
