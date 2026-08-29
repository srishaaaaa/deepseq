"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { FiBarChart2, FiAlertTriangle, FiMap } from "react-icons/fi";
import Card from '@/components/ui/Card';
import Badge, { confidenceTone } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

// --- Helper Function ---
const generateSpeciesConnections = (speciesData: { species: string; locations: { lat: number; lng: number }[] }) => {
  const hotspots = speciesData.locations.slice(0, 10);
  if (hotspots.length < 2) return [];

  const arcs = [];
  for (let i = 0; i < hotspots.length; i++) {
    for (let j = i + 1; j < hotspots.length; j++) {
      const start = hotspots[i];
      const end = hotspots[j];

      const distance = Math.sqrt(Math.pow(start.lat - end.lat, 2) + Math.pow(start.lng - end.lng, 2));
      const similarity = Math.max(0.1, 1 - distance / 180);

      arcs.push({
        startLat: start.lat,
        startLng: start.lng,
        endLat: end.lat,
        endLng: end.lng,
        color: `rgba(0, 255, 150, ${similarity * 0.02})`,
        stroke: similarity * 0.6,
      });
    }
  }
  return arcs;
};

// --- Type Definitions ---
interface SpeciesGeoData {
  species: string;
  locations: { lat: number; lng: number }[];
  confidence: number;
  coordinateSource: string;
  classification: string;
}

// --- Main Component ---
export default function GlobePage() {
  const [allGeoData, setAllGeoData] = useState<SpeciesGeoData[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string>('');
  const [heatmapPoints, setHeatmapPoints] = useState<any[]>([]);
  const [arcs, setArcs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const globeRef = useRef<any>(null);

  useEffect(() => {
    try {
      const resultString = localStorage.getItem('analysisResult');
      if (!resultString) throw new Error("No analysis data found. Please upload a file first.");

      const result = JSON.parse(resultString);

      if (result.geo_profiles && result.geo_profiles.length > 0) {
        // --- CORRECTED LOGIC: This now properly handles the full list of coordinates ---
        const geoData: SpeciesGeoData[] = result.geo_profiles.map((profile: any) => {
          const locations = Array.isArray(profile.coordinates)
            ? profile.coordinates.map((coords: [number, number]) => ({ lat: coords[0], lng: coords[1] }))
            : [];

          return {
            species: profile.scientific_name,
            locations: locations,
            confidence: typeof profile.confidence === 'number' ? profile.confidence : 0,
            coordinateSource: profile.coordinate_source || 'simulated',
            classification: profile.classification || 'Unknown',
          };
        }).filter((s: any) => s.locations.length > 0);

        if (geoData.length === 0) {
          throw new Error("Analysis complete, but no valid coordinates were found for the identified species.");
        }

        setAllGeoData(geoData);
        setSelectedSpecies(geoData[0].species);

      } else {
        throw new Error("Analysis complete, but no geographic data could be found for the identified species.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedSpecies || allGeoData.length === 0) {
      setHeatmapPoints([]);
      setArcs([]);
      return;
    };

    const speciesData = allGeoData.find(s => s.species === selectedSpecies);
    if (speciesData) {
      const pointsForHeatmap = speciesData.locations.map(loc => [loc.lat, loc.lng, Math.max(0.05, speciesData.confidence)]);
      setHeatmapPoints(pointsForHeatmap);

      const connectionArcs = generateSpeciesConnections(speciesData);
      setArcs(connectionArcs);
    }
  }, [selectedSpecies, allGeoData]);

  const selectedSpeciesData = allGeoData.find(s => s.species === selectedSpecies);

  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-900 text-white">
        <p>Loading Analysis Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-900 text-white p-8 text-center">
        <FiAlertTriangle size={48} className="text-danger-500 mb-4" />
        <h1 className="text-2xl font-semibold text-danger-400">An Error Occurred</h1>
        <p className="text-gray-400 mt-2 max-w-md">{error}</p>
        <Button href="/upload" className="mt-6">
          Go to Upload Page
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black">
      <Card padding="lg" className="animate-fade-in absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm max-w-sm border-white/10">
        <h1 className="text-xl font-bold">Species Distribution Analysis</h1>

        <div className="mt-4">
          <Select
            label="Displaying Hotspots For"
            value={selectedSpecies}
            onChange={(e) => setSelectedSpecies(e.target.value)}
          >
            {allGeoData.map(s => (
              <option key={s.species}>{s.species}</option>
            ))}
          </Select>
        </div>

        {selectedSpeciesData && (
          <div className="mt-3 flex items-center justify-between text-xs">
            <Badge tone={confidenceTone(selectedSpeciesData.confidence)}>
              {Math.round(selectedSpeciesData.confidence * 100)}% confidence
            </Badge>
            <span className="text-gray-400">
              {selectedSpeciesData.coordinateSource === 'gbif_occurrence_data'
                ? 'Real GBIF occurrence data'
                : selectedSpeciesData.coordinateSource === 'header_metadata'
                ? 'From file metadata'
                : 'Simulated locations'}
            </span>
          </div>
        )}

        <Button onClick={() => router.push('/report')} icon={<FiBarChart2 />} fullWidth className="mt-4">
          View Analysis Insights
        </Button>
        <Button onClick={() => router.push('/explore')} icon={<FiMap />} variant="secondary" fullWidth className="mt-2">
          View as 2D Map
        </Button>
      </Card>

      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        atmosphereColor="cyan"
        atmosphereAltitude={0.2}

        heatmapsData={[{
          data: heatmapPoints,
          radius: 1.5,
          colorSaturation: 1.0
        }]}
        heatmapPoints="data"
        heatmapPointLat={p => p[0]}
        heatmapPointLng={p => p[1]}
        heatmapPointWeight={p => p[2]}

        arcsData={arcs}
        arcColor="color"
        arcStroke="stroke"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={3000}
      />
    </div>
  );
}
