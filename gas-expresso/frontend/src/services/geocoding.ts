export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  type?: string;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org';

async function requestJson<T>(url: URL): Promise<T> {
  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Geocoding request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function searchAddress(query: string): Promise<GeocodingResult[]> {
  const text = query.trim();
  if (text.length < 3) return [];

  const url = new URL('/search', NOMINATIM);
  url.searchParams.set('q', `${text}, Angola`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', 'ao');
  url.searchParams.set('limit', '5');
  url.searchParams.set('accept-language', 'pt');

  const results = await requestJson<Array<{ lat: string; lon: string; display_name: string; type?: string }>>(url);
  return results.map((item) => ({
    lat: Number(item.lat),
    lng: Number(item.lon),
    displayName: item.display_name,
    type: item.type,
  }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  const url = new URL('/reverse', NOMINATIM);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('zoom', '18');
  url.searchParams.set('accept-language', 'pt');

  const result = await requestJson<{ lat: string; lon: string; display_name?: string; type?: string }>(url);
  return {
    lat: Number(result.lat),
    lng: Number(result.lon),
    displayName: result.display_name ?? 'Localização selecionada',
    type: result.type,
  };
}
