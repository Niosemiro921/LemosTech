import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';
import { RealMap } from '../components/RealMap';
import { formatAOA } from '../services/catalog';
import { advanceDriverDelivery, fetchDriverDelivery, type DriverDelivery } from '../services/driver';
import { extractMessage } from '../services/auth';

const nextAction: Record<string, string> = {
  ASSIGNED: 'Iniciar deslocação à empresa',
  TO_PICKUP: 'Confirmar chegada à empresa',
  AT_PICKUP: 'Confirmar recolha da botija',
  PICKED_UP: 'Iniciar deslocação ao cliente',
  IN_TRANSIT: 'Marcar chegada ao cliente',
  ARRIVED: 'Confirmar entrega concluída',
};

export default function DriverOrderPage() {
  const navigate = useNavigate();
  const role = getCurrentUser()?.role;
  const base = role === 'PRESTADOR' ? '/prestador' : '/driver';
  const { orderId } = useParams();
  const [delivery, setDelivery] = useState<DriverDelivery | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!orderId) return;
    try {
      setDelivery(await fetchDriverDelivery(orderId));
      setError('');
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível carregar a entrega.'));
    }
  }, [orderId]);
  useEffect(() => { void refresh(); }, [refresh]);

  const advance = async () => {
    if (!delivery) return;
    setBusy(true);
    setError('');
    try {
      let location: { latitude: number; longitude: number } | undefined;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: 15000 }));
          location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        } catch {
          location = undefined;
        }
      }
      await advanceDriverDelivery(delivery.id, delivery.status, location);
      await refresh();
      if (delivery.status === 'ARRIVED') navigate(base, { replace: true });
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível atualizar o estado da entrega.'));
    } finally {
      setBusy(false);
    }
  };

  const itemLabel = delivery?.order.items.map((item) => `${item.quantity} × ${item.variantName}`).join(', ');
  return (
    <div className="page operation-detail-page driver-order-page">
      <div className="operation-detail-topbar"><button className="back-link" onClick={() => navigate(base)}>← Voltar ao painel</button><span className="section-kicker">Entrega · {delivery?.order.reference ?? orderId ?? ''}</span></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {!delivery ? <p role="status">A carregar os detalhes da entrega…</p> : <>
        <div className="driver-request-banner"><div><span className="section-kicker">Estado da entrega</span><h1>{delivery.status}</h1><p>{delivery.order.reference} · {itemLabel}</p></div></div>
        <div className="operation-detail-grid">
          <main className="operation-main-card">
            <div className="driver-offer-grid"><div><small>Valor do pedido</small><strong>{formatAOA(delivery.order.pricing.total)}</strong><span>Pagamento na entrega</span></div><div><small>Estado</small><strong>{delivery.status}</strong><span>Atualizado pelo servidor</span></div><div><small>Produto</small><strong>{delivery.order.items.reduce((sum, item) => sum + item.weightKg * item.quantity, 0)} KG</strong><span>{itemLabel}</span></div></div>
            <div className="driver-route-card"><div className="route-point"><span className="route-dot pickup-dot" /><div><small>RECOLHA</small><strong>{delivery.pickup.address}</strong><span>{delivery.order.supplier?.tradeName ?? 'Empresa'}</span></div></div><div className="route-line" /><div className="route-point"><span className="route-dot drop-dot" /><div><small>ENTREGA</small><strong>{delivery.dropoff.address}</strong><span>Morada do cliente</span></div></div></div>
            <div className="driver-map-wrap detail-map"><RealMap value={{ lat: delivery.dropoff.latitude, lng: delivery.dropoff.longitude }} /><div className="driver-map-overlay"><strong>Destino</strong><span>{delivery.dropoff.address}</span></div></div>
            {nextAction[delivery.status] ? <button className="primary-btn full" disabled={busy} onClick={() => void advance()}>{busy ? 'A atualizar…' : nextAction[delivery.status]} <span>→</span></button> : <p>Esta entrega não tem mais ações pendentes.</p>}
          </main>
          <aside className="operation-side-card"><div className="section-kicker">Detalhes do pedido</div><div className="side-info-row"><span>Referência</span><strong>{delivery.order.reference}</strong></div><div className="side-info-row"><span>Produto</span><strong>{itemLabel}</strong></div><div className="side-info-row"><span>Cliente</span><strong>{delivery.dropoff.address}</strong></div><div className="side-info-row"><span>Pagamento</span><strong>Na entrega</strong></div><div className="side-divider" /><p>As alterações de estado são verificadas e registadas pelo servidor.</p><div className="driver-order-side-actions"><Link className="secondary-btn full" to={`/chat/pedido/${encodeURIComponent(delivery.order.id)}`}>💬 Conversar com cliente</Link><Link className="secondary-btn full" to={base}>Painel do entregador</Link></div></aside>
        </div>
      </>}
    </div>
  );
}
