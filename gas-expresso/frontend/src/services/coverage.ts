export interface CoverageHub {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  radiusKm: number;
  expressMinutes: [number, number];
}

export interface CoverageResult {
  available: boolean;
  hub: CoverageHub | null;
  distanceKm: number | null;
  etaMinutes: [number, number] | null;
  note: string;
}

// Frontend-only demo coverage. These values are intentionally configurable.
// The backend will become the source of truth for real operational coverage.
export const coverageHubs: CoverageHub[] = [
  { id: 'luanda', name: 'Luanda', region: 'Luanda', lat: -8.83999, lng: 13.28944, radiusKm: 45, expressMinutes: [20, 45] },
  { id: 'benguela', name: 'Benguela', region: 'Benguela', lat: -12.57626, lng: 13.40547, radiusKm: 28, expressMinutes: [25, 50] },
  { id: 'huambo', name: 'Huambo', region: 'Huambo', lat: -12.77611, lng: 15.73917, radiusKm: 25, expressMinutes: [25, 50] },
  { id: 'lubango', name: 'Lubango', region: 'Huíla', lat: -14.91717, lng: 13.49250, radiusKm: 25, expressMinutes: [25, 50] },
];

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const earthRadius = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const value = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function resolveCoverage(point: { lat: number; lng: number }): CoverageResult {
  const candidates = coverageHubs
    .map((hub) => ({ hub, distanceKm: distanceKm(point, hub) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const nearest = candidates[0];
  if (!nearest) {
    return { available: false, hub: null, distanceKm: null, etaMinutes: null, note: 'Sem cobertura configurada.' };
  }

  const available = nearest.distanceKm <= nearest.hub.radiusKm;

  return {
    available,
    hub: nearest.hub,
    distanceKm: nearest.distanceKm,
    etaMinutes: available ? nearest.hub.expressMinutes : null,
    note: available
      ? `Área atendida pela operação ${nearest.hub.name}.`
      : `O ponto está fora do raio de cobertura configurado de ${nearest.hub.name}.`,
  };
}
