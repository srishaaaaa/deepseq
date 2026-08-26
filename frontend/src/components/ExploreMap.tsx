"use client";

import { useMemo, useState } from "react";

import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from "react-leaflet";

import type { LatLngExpression } from "leaflet";

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type Occurrence = {
  species: string;
  classification: string;
  confidence: number;
  coordinateSource: string;
  lat: number;
  lng: number;
};

type ExploreMapProps = {
  occurrences: Occurrence[];

  classificationColor: Record<
    string,
    string
  >;
};

/*
|--------------------------------------------------------------------------
| Default world position
|--------------------------------------------------------------------------
*/

const WORLD_CENTER: LatLngExpression = [
  20,
  0,
];

/*
|--------------------------------------------------------------------------
| Explore Map Component
|--------------------------------------------------------------------------
*/

export default function ExploreMap({
  occurrences,
  classificationColor,
}: ExploreMapProps) {
  const [selected, setSelected] =
    useState<Occurrence | null>(null);

  /*
  |--------------------------------------------------------------------------
  | Map points
  |--------------------------------------------------------------------------
  */

  const validOccurrences = useMemo(() => {
    return occurrences.filter(
      (occurrence) =>
        Number.isFinite(
          occurrence.lat
        ) &&
        Number.isFinite(
          occurrence.lng
        ) &&
        occurrence.lat >= -90 &&
        occurrence.lat <= 90 &&
        occurrence.lng >= -180 &&
        occurrence.lng <= 180
    );
  }, [occurrences]);

  return (
    <div className="w-full">

      {/* ================================================================
          Leaflet Map
      ================================================================= */}

      <MapContainer
        center={WORLD_CENTER}
        zoom={2}
        minZoom={2}
        maxZoom={12}
        scrollWheelZoom
        className="h-[520px] w-full rounded-lg overflow-hidden"
      >

        {/* ============================================================
            Base map tiles
        ============================================================ */}

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ============================================================
            Occurrence points
        ============================================================ */}

        {validOccurrences.map(
          (occurrence, index) => {
            const color =
              classificationColor[
                occurrence.classification
              ] ||
              classificationColor.Unknown;

            /*
            ------------------------------------------------------------
            Higher confidence = slightly larger marker
            ------------------------------------------------------------
            */

            const radius =
              4 +
              occurrence.confidence * 5;

            /*
            ------------------------------------------------------------
            Simulated coordinates are faded
            ------------------------------------------------------------
            */

            const opacity =
              occurrence.coordinateSource ===
              "simulated"
                ? 0.45
                : 0.9;

            return (
              <CircleMarker
                key={`${occurrence.species}-${occurrence.lat}-${occurrence.lng}-${index}`}
                center={[
                  occurrence.lat,
                  occurrence.lng,
                ]}
                radius={radius}
                pathOptions={{
                  color: "#ffffff",
                  weight: 1,
                  fillColor: color,
                  fillOpacity: opacity,
                  opacity: 0.8,
                }}
                eventHandlers={{
                  click: () =>
                    setSelected(
                      occurrence
                    ),
                }}
              >

                {/* Popup on marker */}

                <Popup>

                  <div className="text-sm text-gray-900 min-w-[180px]">

                    <p className="font-bold italic mb-2">
                      {occurrence.species}
                    </p>

                    <p>
                      <strong>
                        Classification:
                      </strong>{" "}
                      {
                        occurrence.classification
                      }
                    </p>

                    <p>
                      <strong>
                        Confidence:
                      </strong>{" "}
                      {Math.round(
                        occurrence.confidence *
                          100
                      )}
                      %
                    </p>

                    <p>
                      <strong>
                        Coordinates:
                      </strong>{" "}
                      {occurrence.lat.toFixed(
                        2
                      )}
                      ,{" "}
                      {occurrence.lng.toFixed(
                        2
                      )}
                    </p>

                    <p>
                      <strong>
                        Source:
                      </strong>{" "}
                      {
                        occurrence.coordinateSource
                      }
                    </p>

                  </div>

                </Popup>

              </CircleMarker>
            );
          }
        )}

      </MapContainer>

      {/* ================================================================
          Selected occurrence information
      ================================================================= */}

      {selected && (

        <div className="mt-3 rounded bg-gray-700/60 p-3 text-sm">

          <p className="italic font-semibold">
            {selected.species}
          </p>

          <p className="text-gray-400">

            {selected.classification}

            {" · "}

            {Math.round(
              selected.confidence * 100
            )}
            % confidence

            {" · "}

            {selected.lat.toFixed(2)},

            {" "}

            {selected.lng.toFixed(2)}

            {" · source: "}

            {selected.coordinateSource}

          </p>

        </div>

      )}

    </div>
  );
}