/** Operational coverage is server-owned. The client must never infer availability from hardcoded hubs. */
export interface CoverageResult { available: boolean; hub: { id: string; name: string } | null; distanceKm: number | null; etaMinutes: [number, number] | null; note: string; }
