import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RealMap } from '../components/RealMap';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import {
  acceptDriverOffer,
  fetchCurrentDelivery,
  fetchDriverEarnings,
  fetchDriverOffers,
  fetchDriverProfile,
  rejectDriverOffer,
  setDriverOffline,
  setDriverOnline,
  updateDriverLocation,
  type DriverDelivery,
  type DriverEarning,
  type DriverOffer,
  type DriverProfile,
} from '../services/driver';
import { fetchDriverWallet, type DriverWallet } from '../services/driverFinance';

const OFFER_REFRESH_MS = 10_000;
const WALLET_REFRESH_MS = 15_000;
const EARNINGS_REFRESH_MS = 60_000;
const LOCATION_THROTTLE_MS = 8_000;

function isSameCalendarDay(value: string, date: Date) {
  const source = new Date(value);
  return source.getFullYear() === date.getFullYear() && source.getMonth() === date.getMonth() && source.getDate() === date.getDate();
}

function isWithinCurrentWeek(value: string, date: Date) {
  const source = new Date(value);
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - diff);
  return source >= start;
}

export default function DriverPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [delivery, setDelivery] = useState<DriverDelivery | null>(null);
  const [earnings, setEarnings] = useState<DriverEarning[] | null>(null);
  const [wallet, setWallet] = useState<DriverWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [earningsError, setEarningsError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [livePoint, setLivePoint] = useState<{ lat: number; lng: number } | null>(null);
  const lastLocationSentAtRef = useRef(0);

  const radiusRaw = Number(import.meta.env.VITE_DRIVER_OFFER_RADIUS_KM);
  const radiusKm = Number.isFinite(radiusRaw) && radiusRaw > 0 ? radiusRaw : null;
  const nearbyOffers = useMemo(() => {
    const sorted = [...offers].sort((a, b) => a.distanceToPickupKm - b.distanceToPickupKm);
    return radiusKm == null ? sorted : sorted.filter(item => item.distanceToPickupKm <= radiusKm);
  }, [offers, radiusKm]);

  const todayNet = useMemo(() => {
    const today = new Date();
    return earnings?.filter(item => isSameCalendarDay(item.createdAt, today)).reduce((sum, item) => sum + item.net, 0) ?? null;
  }, [earnings]);
  const weekNet = useMemo(() => {
    const now = new Date();
    return earnings?.filter(item => isWithinCurrentWeek(item.createdAt, now)).reduce((sum, item) => sum + item.net, 0) ?? null;
  }, [earnings]);

  const refresh = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [driverProfile, currentDelivery, driverWallet] = await Promise.all([
        fetchDriverProfile(),
        fetchCurrentDelivery(),
        fetchDriverWallet(),
      ]);
      setProfile(driverProfile);
      setDelivery(currentDelivery);
      setWallet(driverWallet);
      if (driverProfile.isOnline) {
        try { setOffers(await fetchDriverOffers()); } catch { setOffers([]); }
      } else {
        setOffers([]);
      }
      setError('');
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível carregar a operação do entregador.'));
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  const refreshEarnings = useCallback(async () => {
    try {
      setEarnings(await fetchDriverEarnings());
      setEarningsError('');
    } catch (cause) {
      setEarnings(null);
      setEarningsError(extractMessage(cause, 'Não foi possível carregar os ganhos acumulados.'));
    }
  }, []);

  useEffect(() => { void refresh(true); const timer = window.setInterval(() => void refresh(false), OFFER_REFRESH_MS); return () => window.clearInterval(timer); }, [refresh]);
  useEffect(() => { const timer = window.setInterval(() => { void fetchDriverWallet().then(setWallet).catch(() => undefined); }, WALLET_REFRESH_MS); return () => window.clearInterval(timer); }, []);
  useEffect(() => { void refreshEarnings(); const timer = window.setInterval(() => void refreshEarnings(), EARNINGS_REFRESH_MS); return () => window.clearInterval(timer); }, [refreshEarnings]);

  useEffect(() => {
    if (!profile?.isOnline) return;
    if (!navigator.geolocation) {
      setLocationError('Este navegador não disponibiliza geolocalização. Fique offline e use um navegador com GPS/permissão de localização.');
      return;
    }
    setLocationError('');
    const watchId = navigator.geolocation.watchPosition(({ coords }) => {
      setLivePoint({ lat: coords.latitude, lng: coords.longitude });
      const current = Date.now();
      if (current - lastLocationSentAtRef.current < LOCATION_THROTTLE_MS) return;
      lastLocationSentAtRef.current = current;
      void updateDriverLocation(coords.latitude, coords.longitude).catch(cause => setLocationError(extractMessage(cause, 'A localização não pôde ser sincronizada.')));
    }, () => setLocationError('A localização foi recusada. Permita o acesso à localização do dispositivo para receber ofertas próximas.'), {
      enableHighAccuracy: true,
      maximumAge: 15_000,
      timeout: 15_000,
    });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [profile?.isOnline]);

  const toggleOnline = async () => {
    if (!profile) return;
    setBusy(true); setError(''); setLocationError('');
    try {
      if (profile.isOnline) {
        await setDriverOffline();
      } else {
        const currentWallet = wallet ?? await fetchDriverWallet();
        if (currentWallet.availableBalance < currentWallet.minimumOperatingBalance) {
          throw new Error(`Saldo insuficiente para iniciar a operação. Mínimo operacional: ${formatAOA(currentWallet.minimumOperatingBalance)}.`);
        }
        if (!navigator.geolocation) throw new Error('Este navegador não disponibiliza geolocalização.');
        const point = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Permita o acesso à localização para ficar online.')), { enableHighAccuracy: true, timeout: 15_000 }));
        setLivePoint({ lat: point.coords.latitude, lng: point.coords.longitude });
        await setDriverOnline(point.coords.latitude, point.coords.longitude);
      }
      await refresh(false);
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível alterar o estado online.'));
    } finally { setBusy(false); }
  };

  const answerOffer = async (offer: DriverOffer, accept: boolean) => {
    setBusy(true); setError('');
    try {
      if (accept) {
        const result = await acceptDriverOffer(offer.id);
        navigate(`/driver/pedido/${encodeURIComponent(result.deliveryId)}`);
      } else {
        await rejectDriverOffer(offer.id);
        await refresh(false);
      }
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível responder à oferta.'));
    } finally { setBusy(false); }
  };

  const ownPoint = livePoint ?? (profile?.latitude != null && profile.longitude != null ? { lat: profile.latitude, lng: profile.longitude } : null);
  const deliveryPoint = delivery ? { lat: delivery.dropoff.latitude, lng: delivery.dropoff.longitude } : null;
  const mapPoint = ownPoint ?? deliveryPoint;

  if (loading && !profile) return <div className="page workspace-page driver-page"><div className="loading-panel" role="status">A preparar a operação do entregador…</div></div>;

  return <div className="page workspace-page driver-page driver-mobile-first">
    <div className="driver-topbar">
      <div><span className="section-kicker">Painel do entregador</span><h1>{profile ? `Olá, ${profile.fullName}.` : 'Operação de entregas'}</h1><p>{radiusKm != null ? `As ofertas são ordenadas por proximidade dentro do raio operacional configurado.` : 'As ofertas e entregas são sincronizadas diretamente com a API.'}</p></div>
      <button className={`online-toggle ${profile?.isOnline ? 'online' : ''}`} onClick={() => void toggleOnline()} disabled={!profile || busy}><span className="status-dot" /> {profile?.isOnline ? 'Ficar offline' : 'Ficar online'}</button>
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {locationError && <div className="location-warning" role="alert"><strong>Localização necessária</strong><span>{locationError}</span><Link to="/driver/perfil">Ver permissões e perfil →</Link></div>}

    {earningsError && <div className="form-error" role="alert">{earningsError}</div>}
    <section className="driver-earnings-strip" aria-label="Resumo financeiro"><article><span>Ganhos acumulados hoje</span><strong>{todayNet == null ? '—' : formatAOA(todayNet)}</strong><small>90% das taxas de entrega concluídas</small></article><article><span>Ganhos acumulados esta semana</span><strong>{weekNet == null ? '—' : formatAOA(weekNet)}</strong><small>Valores acumulados, não levantados</small></article><article><span>Saldo operacional</span><strong>{wallet ? formatAOA(wallet.availableBalance) : '—'}</strong><small>{wallet ? `Prioridade ${wallet.priorityScore} · ${wallet.priorityBand}` : 'A aguardar saldo'}</small></article></section>

    <div className="driver-layout">
      <section className="driver-map-panel">
        <div className="driver-card-head"><div><span className="section-kicker">Mapa operacional</span><h2>{delivery ? delivery.order.reference : profile?.isOnline ? 'A aguardar pedidos' : 'Você está offline'}</h2><p>{delivery ? `${delivery.status} · acompanhe a rota actual.` : profile?.isOnline ? 'A sua posição é enviada ao servidor somente enquanto estiver online.' : 'Fique online para ativar a operação.'}</p></div><Link className="secondary-btn" to="/driver/pedidos">Pedidos ({nearbyOffers.length})</Link></div>
        <div className="driver-map-wrap driver-map-central"><RealMap value={mapPoint} markerLabel={delivery && !ownPoint ? 'Destino da entrega' : 'Entregador'} interactive={false} /><div className="driver-map-overlay"><strong>{profile?.isOnline ? 'Online' : 'Offline'}</strong><span>{ownPoint ? 'GPS sincronizado' : 'Aguardando localização'}</span></div></div>
        {delivery && <div className="driver-current-delivery"><div><span className="section-kicker">Entrega actual</span><strong>{delivery.order.reference}</strong><p>{delivery.order.items.map(item => `${item.quantity} × ${item.variantName}`).join(', ')}</p><small>{delivery.dropoff.address}</small></div><Link className="primary-btn" to={`/driver/pedido/${encodeURIComponent(delivery.id)}`}>Abrir entrega →</Link></div>}
      </section>

      <aside className="driver-offers-sheet">
        <div className="driver-sheet-handle" aria-hidden="true" />
        <div className="driver-sheet-head"><div><span className="section-kicker">Disponíveis agora</span><h2>Pedidos próximos</h2></div><span className="driver-offer-count">{nearbyOffers.length}</span></div>
        {profile?.isOnline ? nearbyOffers.length ? <div className="driver-offer-list">{nearbyOffers.map(offer => <article className="driver-offer-card" key={offer.id}><div className="driver-offer-top"><span className="offer-distance">{offer.distanceToPickupKm.toFixed(1)} km</span><span className="offer-expiry">Até {new Date(offer.expiresAt).toLocaleTimeString('pt-AO')}</span></div><div className="driver-offer-main"><div><strong>{offer.order.reference}</strong><p>{offer.order.items.map(item => `${item.quantity} × ${item.variantName}`).join(', ')}</p><small>Recolha: {offer.order.supplier?.tradeName ?? 'Empresa'} · {offer.estimatedPickupMinutes} min estimados</small><small>Entrega: {offer.order.deliveryAddress}</small></div><strong>{formatAOA(offer.order.pricing.total)}</strong></div><div className="driver-offer-actions"><button className="secondary-btn" onClick={() => void answerOffer(offer, false)} disabled={busy}>Recusar</button><button className="primary-btn" onClick={() => void answerOffer(offer, true)} disabled={busy}>{busy ? 'A processar…' : 'Aceitar'}</button></div></article>)}</div> : <div className="empty-state"><h3>Nenhum pedido próximo</h3><p>O servidor não devolveu ofertas elegíveis neste momento.</p><Link className="secondary-btn" to="/driver/pedidos">Abrir pedidos</Link></div> : <div className="empty-state"><h3>Você está offline</h3><p>Ative o estado online depois de autorizar o acesso à localização.</p><button className="primary-btn" onClick={() => void toggleOnline()} disabled={busy}>Ficar online</button></div>}
      </aside>
    </div>

    <div className="driver-tools-card"><Link className="driver-tool-link" to="/driver/saldo"><strong>Carteira</strong><span>{wallet ? `${formatAOA(wallet.availableBalance)} disponíveis · prioridade ${wallet.priorityScore}` : 'Consultar saldo operacional'} →</span></Link><Link className="driver-tool-link" to="/driver/ganhos"><strong>Histórico</strong><span>Ver valores acumulados nas entregas concluídas →</span></Link><Link className="driver-tool-link" to="/driver/documentos"><strong>Documentos</strong><span>Estado documental da conta →</span></Link><Link className="driver-tool-link" to="/driver/incidentes"><strong>Incidentes</strong><span>Registar uma ocorrência operacional ou de segurança →</span></Link></div>
  </div>;
}
