import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { acceptDriverOffer, fetchCurrentDelivery, fetchDriverOffers, rejectDriverOffer, type DriverDelivery, type DriverOffer } from '../services/driver';

export default function DriverOrdersPage() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [delivery, setDelivery] = useState<DriverDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const radiusRaw = Number(import.meta.env.VITE_DRIVER_OFFER_RADIUS_KM);
  const radiusKm = Number.isFinite(radiusRaw) && radiusRaw > 0 ? radiusRaw : null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextOffers, current] = await Promise.all([fetchDriverOffers(), fetchCurrentDelivery()]);
      setOffers(nextOffers);
      setDelivery(current);
      setError('');
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível carregar os pedidos próximos.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 10_000); return () => window.clearInterval(timer); }, [load]);

  const nearby = useMemo(() => {
    const sorted = [...offers].sort((a, b) => a.distanceToPickupKm - b.distanceToPickupKm);
    return radiusKm == null ? sorted : sorted.filter(item => item.distanceToPickupKm <= radiusKm);
  }, [offers, radiusKm]);

  const answer = async (offer: DriverOffer, accept: boolean) => {
    setBusy(offer.id);
    try {
      if (accept) {
        const result = await acceptDriverOffer(offer.id);
        navigate(`/driver/pedido/${encodeURIComponent(result.deliveryId)}`);
      } else {
        await rejectDriverOffer(offer.id);
        await load();
      }
      setError('');
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível responder à oferta.'));
    } finally {
      setBusy(null);
    }
  };

  return <div className="page workspace-page driver-orders-page">
    <div className="workspace-heading"><div><span className="section-kicker">Operação / Pedidos</span><h1>Pedidos próximos.</h1><p>{radiusKm != null ? `Ofertas dentro do raio operacional configurado (${radiusKm} km), ordenadas pela proximidade da recolha.` : 'Ofertas ordenadas pela proximidade da recolha conforme os dados da API.'}</p></div><button className="secondary-btn" onClick={() => void load()} disabled={loading}>Atualizar</button></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {delivery && <section className="workspace-panel driver-current-banner"><div><span className="section-kicker">Entrega em curso</span><h2>{delivery.order.reference}</h2><p>{delivery.order.items.map(item => `${item.quantity} × ${item.variantName}`).join(', ')} · {delivery.dropoff.address}</p></div><Link className="primary-btn" to={`/driver/pedido/${encodeURIComponent(delivery.id)}`}>Abrir entrega →</Link></section>}
    <section className="driver-offers-sheet">
      <div className="driver-sheet-handle" aria-hidden="true" />
      <div className="driver-sheet-head"><div><span className="section-kicker">Disponíveis agora</span><h2>Ofertas de entrega</h2></div><span className="driver-offer-count">{nearby.length}</span></div>
      {loading ? <div className="loading-panel">A carregar ofertas…</div> : nearby.length ? <div className="driver-offer-list">{nearby.map(offer => <article className="driver-offer-card" key={offer.id}><div className="driver-offer-top"><span className="offer-distance">{offer.distanceToPickupKm.toFixed(1)} km</span><span className="offer-expiry">Até {new Date(offer.expiresAt).toLocaleTimeString('pt-AO')}</span></div><div className="driver-offer-main"><div><strong>{offer.order.reference}</strong><p>{offer.order.items.map(item => `${item.quantity} × ${item.variantName}`).join(', ')}</p><small>Recolha: {offer.order.supplier?.tradeName ?? 'Empresa'} · chegada estimada {offer.estimatedPickupMinutes} min</small><small>Entrega: {offer.order.deliveryAddress}</small></div><strong>{formatAOA(offer.order.pricing.total)}</strong></div><div className="driver-offer-actions"><button className="secondary-btn" onClick={() => void answer(offer, false)} disabled={busy === offer.id}>Recusar</button><button className="primary-btn" onClick={() => void answer(offer, true)} disabled={busy === offer.id}>{busy === offer.id ? 'A processar…' : 'Aceitar pedido'}</button></div></article>)}</div> : <div className="empty-state"><h3>Nenhum pedido disponível</h3><p>{offers.length && radiusKm != null ? 'As ofertas recebidas neste momento estão fora do raio operacional configurado.' : 'O servidor não devolveu ofertas disponíveis neste momento.'}</p></div>}
    </section>
  </div>;
}
