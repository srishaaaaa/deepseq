import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function coordinateSourceLabel(source: string) {
  switch (source) {
    case 'gbif_occurrence_data':
      return 'GBIF (real)';
    case 'header_metadata':
      return 'File metadata';
    default:
      return 'Simulated';
  }
}

export function generatePdfReport(analysisResult: any) {
  const doc = new jsPDF();
  const summary = analysisResult.biodiversity_summary;
  const geoProfiles = analysisResult.geo_profiles;

  doc.setFontSize(18);
  doc.text('eDNA Biodiversity Analysis Report', 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`File: ${analysisResult.file_info.filename}`, 14, 30);
  doc.text(`Analysis Date: ${new Date().toLocaleString()}`, 14, 38);
  autoTable(doc, {
    startY: 50,
    head: [['Metric', 'Value']],
    body: [
      ['Total Reads Processed', summary.total_reads_processed],
      ['Unique Species Identified', summary.unique_species_identified],
    ],
    theme: 'striped',
  });
  const abundanceBody = summary.abundance_distribution.map((item: any) => [
    item.species,
    item.count,
    `${(item.relative_abundance * 100).toFixed(2)}%`,
    `${Math.round((item.avg_confidence ?? 0) * 100)}%`,
  ]);
  autoTable(doc, {
    head: [['Species', 'Read Count', 'Abundance', 'Confidence']],
    body: abundanceBody,
    theme: 'grid',
    headStyles: { fillColor: [22, 160, 133] },
  });
  const geoBody = geoProfiles.map((item: any) => {
    const coords = Array.isArray(item.coordinates) ? item.coordinates.join(', ') : String(item.coordinates);
    return [
      item.scientific_name,
      item.classification,
      item.location,
      `${Math.round((item.confidence ?? 0) * 100)}%`,
      coordinateSourceLabel(item.coordinate_source),
      coords,
    ];
  });
  autoTable(doc, {
    head: [['Scientific Name', 'Classification', 'Primary Location', 'Confidence', 'Coord. Source', 'Coordinates']],
    body: geoBody,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });
  doc.save('eDNA_Analysis_Report.pdf');
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvEscape(value: any): string {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** One row per species, joining abundance + geo/confidence data for downstream stats/GIS tools. */
export function exportCsv(analysisResult: any) {
  const geoByName: Record<string, any> = {};
  for (const g of analysisResult.geo_profiles) geoByName[g.scientific_name] = g;

  const headers = [
    'species',
    'classification',
    'read_count',
    'relative_abundance',
    'confidence',
    'primary_location',
    'coordinate_source',
    'coordinates',
  ];
  const rows = analysisResult.biodiversity_summary.abundance_distribution.map((item: any) => {
    const geo = geoByName[item.species];
    const coords = geo?.coordinates
      ? geo.coordinates.map((c: number[]) => `(${c[0]},${c[1]})`).join('; ')
      : '';
    return [
      item.species,
      geo?.classification ?? '',
      item.count,
      item.relative_abundance,
      item.avg_confidence ?? geo?.confidence ?? '',
      geo?.location ?? '',
      geo?.coordinate_source ?? '',
      coords,
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const filenameBase = (analysisResult.file_info?.filename || 'analysis').replace(/\.[^/.]+$/, '');
  downloadBlob(csv, `${filenameBase}_deepseq.csv`, 'text/csv');
}

/** One Point feature per coordinate, so every occurrence plots individually in GIS tools. */
export function exportGeoJson(analysisResult: any) {
  const features = analysisResult.geo_profiles.flatMap((profile: any) =>
    (profile.coordinates || []).map((coord: number[]) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [coord[1], coord[0]] }, // GeoJSON is [lng, lat]
      properties: {
        scientific_name: profile.scientific_name,
        classification: profile.classification,
        location: profile.location,
        confidence: profile.confidence,
        coordinate_source: profile.coordinate_source,
      },
    }))
  );

  const geojson = {
    type: 'FeatureCollection',
    features,
  };
  const filenameBase = (analysisResult.file_info?.filename || 'analysis').replace(/\.[^/.]+$/, '');
  downloadBlob(JSON.stringify(geojson, null, 2), `${filenameBase}_deepseq.geojson`, 'application/geo+json');
}
