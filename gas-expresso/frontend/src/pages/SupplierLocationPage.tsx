import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RealMap } from '../components/RealMap';
import { extractMessage } from '../services/auth';
import { fetchSupplierLocation, updateSupplierLocation, type SupplierLocation } from '../services/supplier';

const LUANDA_CENTER = { lat: -8.8389, lng: 13.2894 };

export default function SupplierLocationPage() {
  const [saved, setSaved] = useState<SupplierLocation | null>(null);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await fetchSupplierLocation();
      setSaved(data);
      setSelected(data.latitude != null && data.longitude != null ? { lat: data.latitude, lng: data.longitude } : null);
      setError('');
    } catch (cause) { setError(extractMessage(cause, 'Não foi possível carregar a localização da empresa.')); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function useGps() {
    if (!navigator.geolocation) { setError('Este navegador não disponibiliza geolocalização. Seleccione a posição manualmente no mapa.'); return; }
    setLocating(true); setError(''); setNotice('');
    navigator.geolocation.getCurrentPosition((position) => {
      setSelected({ lat: position.coords.latitude, lng: position.coords.longitude });
      setNotice('Posição do dispositivo capturada. Confirme no mapa e guarde para publicar a localização da empresa.');
      setLocating(false);
    }, (geoError) => {
      setError(geoError.code === geoError.PERMISSION_DENIED ? 'A permissão de localização foi recusada. Pode seleccionar o ponto directamente no mapa.' : 'Não foi possível obter GPS. Verifique o sinal e tente novamente ou escolha o ponto no mapa.');
      setLocating(false);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 });
  }

  async function save() {
    if (!selected) { setError('Seleccione a localização no mapa ou use o GPS antes de guardar.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await updateSupplierLocation(selected.lat, selected.lng);
      setSaved(result); setSelected({ lat: result.latitude ?? selected.lat, lng: result.longitude ?? selected.lng });
      setNotice('Localização guardada no servidor. Esta posição será usada na selecção de empresas e na operação de pedidos.');
    } catch (cause) { setError(extractMessage(cause, 'Não foi possível guardar a localização.')); }
    finally { setSaving(false); }
  }

  const hasSaved = saved?.latitude != null && saved.longitude != null;
  const changed = selected && (!hasSaved || selected.lat !== saved?.latitude || selected.lng !== saved?.longitude);
  return <div className="supplier-module-page page">
    <header className="workspace-heading"><div><span className="section-kicker">EMPRESA · MAPA REAL</span><h1>Localização operacional</h1><p>Defina o ponto exacto do estabelecimento. Esta coordenada é usada pelo backend para escolher a empresa disponível para cada pedido.</p></div><Link to="/fornecedor" className="secondary-btn">← Visão geral</Link></header>
    {error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="success-alert" role="status">{notice}</div>}
    {loading ? <div className="loading-panel" role="status">A carregar coordenadas guardadas…</div> : <div className="supplier-location-layout">
      <section className="workspace-panel supplier-map-panel"><div className="panel-title"><div><span className="section-kicker">OPENSTREETMAP</span><h2>Seleccione o ponto da empresa</h2><p>Clique no mapa para marcar o estabelecimento; pode ajustar antes de guardar.</p></div><button className="secondary-btn" type="button" onClick={useGps} disabled={locating}>{locating ? 'A obter GPS…' : '⌖ Usar GPS deste dispositivo'}</button></div>
        <RealMap value={selected} initialCenter={LUANDA_CENTER} markerLabel="Empresa / armazém" onChange={(point) => { setSelected(point); setNotice(''); setError(''); }}/>
        <div className="supplier-map-legend"><span><i className="map-legend-dot"/> Posição seleccionada</span><small>Mapa de ruas do OpenStreetMap. A disponibilidade do mapa depende do serviço de mapas e da ligação à Internet.</small></div>
      </section>
      <aside className="supplier-map-side"><section className="workspace-panel"><span className="section-kicker">ESTADO DA LOCALIZAÇÃO</span><h2>{hasSaved ? 'Localização guardada' : 'Ainda não configurada'}</h2><p>{hasSaved ? 'O servidor tem coordenadas registadas para esta empresa.' : 'Sem coordenadas, a empresa pode não ser escolhida na cotação dos clientes.'}</p>{hasSaved && <dl className="supplier-coordinate-list"><div><dt>Latitude</dt><dd>{saved!.latitude!.toFixed(6)}</dd></div><div><dt>Longitude</dt><dd>{saved!.longitude!.toFixed(6)}</dd></div></dl>}{selected && <dl className="supplier-coordinate-list pending"><div><dt>Latitude seleccionada</dt><dd>{selected.lat.toFixed(6)}</dd></div><div><dt>Longitude seleccionada</dt><dd>{selected.lng.toFixed(6)}</dd></div></dl>}<button className="primary-btn full" onClick={() => void save()} disabled={!selected || !changed || saving}>{saving ? 'A guardar no servidor…' : changed ? 'Guardar nova localização' : hasSaved ? 'Localização actualizada' : 'Seleccione um ponto'}</button><button className="secondary-btn full" onClick={() => { setSelected(hasSaved ? { lat: saved!.latitude!, lng: saved!.longitude! } : null); setError(''); setNotice(''); }} disabled={!changed || saving}>Repor localização guardada</button></section><section className="supplier-api-note"><strong>Como é usada?</strong><p>O backend associa a empresa a uma latitude e longitude. A API actual ainda não tem polígonos de cobertura, tempos de estrada ou edição de múltiplos estabelecimentos; não é possível configurar essas regras nesta página.</p></section></aside>
    </div>}
  </div>;
}
