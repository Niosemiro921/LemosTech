interface MapPreviewProps { compact?: boolean; latitude?: number; longitude?: number; }
export function MapPreview({ compact = false, latitude, longitude }: MapPreviewProps) {
  const hasLocation = typeof latitude === 'number' && typeof longitude === 'number';
  return (
    <div className={`map-preview ${compact ? 'compact' : ''}`}>
      <div className="map-grid" />
      <div className="map-road road-a" />
      <div className="map-road road-b" />
      <div className="map-road road-c" />
      <div className="map-pin user-pin">●</div>
      <div className="map-pin partner-pin">●</div>
      <div className="map-label user-label">Você</div>
      <div className="map-label partner-label">Parceiro</div>
      <div className="map-overlay"><span>⌖</span> {hasLocation ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : 'Luanda · localização aproximada'}</div>
    </div>
  );
}
