import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapPoint {
  lat: number;
  lng: number;
}

interface RealMapProps {
  value?: MapPoint | null;
  compact?: boolean;
  onChange?: (point: MapPoint) => void;
}

const LUANDA: MapPoint = { lat: -8.8383, lng: 13.2344 };

export function RealMap({ value, compact = false, onChange }: RealMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;

    const initial = value ?? LUANDA;
    const map = L.map(hostRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
    }).setView([initial.lat, initial.lng], value ? 15 : 11);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.circleMarker([initial.lat, initial.lng], {
      radius: 9,
      weight: 4,
      fillOpacity: 1,
      color: '#ffffff',
      fillColor: '#e6532e',
    }).addTo(map);

    marker.bindTooltip(value ? 'Local de entrega' : 'Escolha o local de entrega', {
      direction: 'top',
      offset: [0, -8],
    });

    map.on('click', (event) => {
      const point = { lat: event.latlng.lat, lng: event.latlng.lng };
      marker.setLatLng(event.latlng);
      map.setView(event.latlng, Math.max(map.getZoom(), 15), { animate: true });
      onChangeRef.current?.(point);
    });

    mapRef.current = map;
    markerRef.current = marker;

    const timer = window.setTimeout(() => map.invalidateSize(), 80);
    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!value || !mapRef.current || !markerRef.current) return;
    const latLng = L.latLng(value.lat, value.lng);
    markerRef.current.setLatLng(latLng);
    markerRef.current.setTooltipContent('Local de entrega');
    mapRef.current.setView(latLng, Math.max(mapRef.current.getZoom(), 15), { animate: true });
  }, [value?.lat, value?.lng]);

  return <div ref={hostRef} className={`real-map ${compact ? 'compact' : ''}`} aria-label="Mapa para selecionar o local de entrega" />;
}
