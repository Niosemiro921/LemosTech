import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapPoint { lat: number; lng: number; }
interface RealMapProps {
  value?: MapPoint | null;
  compact?: boolean;
  onChange?: (point: MapPoint) => void;
  markerLabel?: string;
  interactive?: boolean;
  initialCenter?: MapPoint;
}

// Default map viewport for an Angola-first service. This is only a map starting view,
// never presented as the customer's live location. The delivery pin appears only after selection.
const ANGOLA_MAP_CENTER: MapPoint = { lat: -8.8389, lng: 13.2894 };

export function RealMap({ value, compact = false, onChange, markerLabel = 'Local selecionado', interactive = Boolean(onChange), initialCenter }: RealMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const labelRef = useRef(markerLabel);
  const interactiveRef = useRef(interactive);
  onChangeRef.current = onChange;
  labelRef.current = markerLabel;
  interactiveRef.current = interactive;

  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;

    const initial = value ?? initialCenter ?? ANGOLA_MAP_CENTER;
    const hasValue = Boolean(value);
    const initialZoom = hasValue ? 16 : initialCenter ? 11 : 12;
    const map = L.map(hostRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
      dragging: true,
    }).setView([initial.lat, initial.lng], initialZoom);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.circleMarker([initial.lat, initial.lng], {
      radius: 9,
      weight: 4,
      color: '#ffffff',
      fillColor: '#e6532e',
      fillOpacity: 1,
    });
    if (hasValue) marker.addTo(map);
    marker.bindTooltip(labelRef.current, { direction: 'top', offset: [0, -8] });

    map.on('click', (event) => {
      if (!interactiveRef.current) return;
      const point = { lat: event.latlng.lat, lng: event.latlng.lng };
      marker.addTo(map);
      marker.setLatLng(event.latlng).setStyle({ fillOpacity: 1 });
      marker.setTooltipContent(labelRef.current);
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
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    marker.setTooltipContent(markerLabel);
    if (!value) {
      marker.remove();
      return;
    }
    const latLng = L.latLng(value.lat, value.lng);
    marker.addTo(map);
    marker.setLatLng(latLng).setStyle({ fillOpacity: 1 });
    map.setView(latLng, Math.max(map.getZoom(), 15), { animate: true });
  }, [value?.lat, value?.lng, markerLabel]);

  return <div ref={hostRef} className={`real-map ${compact ? 'compact' : ''}`} aria-label={interactive ? 'Mapa interativo' : 'Mapa operacional'} />;
}
