import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RealMap } from '../components/RealMap';
import { getDispatchSnapshot, type DispatchSnapshot } from '../services/dispatch';
import { formatAOA } from '../services/catalog';
import { calculateQuote } from '../services/pricing';
import { useOrderStore } from '../stores/orderStore';

const defaultPoint = { lat: -8.8383, lng: 13.2344 };
const stageLabels = [
  ['searching_supplier', 'Fornecedor'],
  ['reserving_stock', 'Stock'],
  ['searching_driver', 'Entregador'],
  ['driver_assigned', 'Encontrado'],
  ['pickup', 'Recolha'],
  ['on_route', 'A caminho'],
  ['arrived', 'Chegou'],
  ['delivered', 'Entregue'],
] as const;

export default function TrackingPage() {
  const { address, selectedProduct, quantity, deliveryType } = useOrderStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const snapshot: DispatchSnapshot = useMemo(() => getDispatchSnapshot('GE-000124', elapsed), [elapsed]);
  const activeIndex = stageLabels.findIndex(([stage]) => stage === snapshot.stage);
  const point = address?.lat && address?.lng ? { lat: address.lat, lng: address.lng } : defaultPoint;
  const quote = selectedProduct ? calculateQuote({ product: selectedProduct, quantity, deliveryType, distanceKm: null }) : null;
  const isDelivered = snapshot.stage === 'delivered';
  const isOnRoute = snapshot.stage === 'on_route' || snapshot.stage === 'arrived';

  const contactDriver = () => {
    window.alert('Contacto com o entregador será ligado ao telefone/WhatsApp quando o backend de comunicações estiver conectado.');
  };

  return (
    <div className="page tracking-page">
      <section className="tracking-topbar">
        <div>
          <span className="section-kicker">Pedido #GE-000124</span>
          <h1>{isDelivered ? 'Pedido entregue' : 'Acompanhe a sua entrega'}</h1>
          <p>{snapshot.description}</p>
        </div>
        <div className={`tracking-status ${isDelivered ? 'success' : 'live'}`}>
          <span>{isDelivered ? '✓' : '•'}</span>
          <div><strong>{isDelivered ? 'Concluído' : snapshot.progress + '%'}</strong><small>{isDelivered ? 'Entrega concluída' : 'Atualizado agora'}</small></div>
        </div>
      </section>

      <section className="tracking-progress-card">
        <div className="tracking-progress-head"><span>Progresso do pedido</span><strong>{isDelivered ? 'Concluído' : snapshot.progress + '%'}</strong></div>
        <div className="tracking-progress-bar"><span style={{ width: `${snapshot.progress}%` }} /></div>
        <div className="tracking-stage-labels">{stageLabels.map(([stage, label], index) => <span key={stage} className={index <= activeIndex ? 'active' : ''}>{label}</span>)}</div>
      </section>

      <section className="tracking-layout">
        <div className="tracking-map-panel">
          <div className="tracking-panel-head">
            <div><span className="section-kicker">Localização</span><h2>{isOnRoute ? 'Entregador a caminho' : 'Centro da operação'}</h2></div>
            <span className="map-live-pill"><span className="live-dot" /> Ao vivo</span>
          </div>
          <div className="tracking-map-frame"><RealMap value={point} /></div>
          <div className="tracking-location-strip">
            <span className="tracking-location-icon">⌖</span>
            <div><strong>{address?.address ?? 'Luanda, Angola'}</strong><small>{isOnRoute ? 'A posição será atualizada à medida que o entregador se aproxima.' : 'Estamos a preparar a sua entrega.'}</small></div>
          </div>
          {snapshot.driver && (
            <div className="driver-card-rich tracking-driver-card">
              <div className="driver-avatar">{snapshot.driver.initials}</div>
              <div className="driver-copy"><strong>{snapshot.driver.name}</strong><small>{snapshot.driver.vehicle} · {snapshot.driver.plate}</small><span>★ {snapshot.driver.rating.toFixed(1)} · {snapshot.driver.distanceKm > 0 ? `${snapshot.driver.distanceKm.toFixed(1)} km de distância` : 'Chegou ao destino'}</span></div>
              <button className="secondary-btn" onClick={contactDriver}>Contactar</button>
            </div>
          )}
        </div>

        <aside className="tracking-side">
          <article className="tracking-card tracking-order-card">
            <div className="tracking-card-head"><div><span className="section-kicker">Resumo do pedido</span><h2>{quantity || 1} × {selectedProduct?.label ?? 'Botija 12 KG'}</h2></div><span className="order-number">GE-000124</span></div>
            <div className="tracking-info-grid">
              <div><span>Local de entrega</span><strong>{address?.address ?? 'Luanda, Angola'}</strong></div>
              <div><span>Entrega</span><strong>{deliveryType === 'express' ? 'Expressa' : 'Programada'}</strong></div>
              <div><span>Total estimado</span><strong>{quote ? formatAOA(quote.total) : '9.300 Kz'}</strong></div>
              <div><span>Pagamento</span><strong>Na entrega</strong></div>
            </div>
          </article>

          <article className="tracking-card">
            <div className="tracking-card-head"><div><span className="section-kicker">Etapas</span><h2>Estado da entrega</h2></div></div>
            <div className="tracking-timeline">
              {stageLabels.map(([stage, label], index) => {
                const done = index < activeIndex;
                const current = index === activeIndex;
                return <div className={`tracking-timeline-item ${done ? 'done' : ''} ${current ? 'current' : ''}`} key={stage}>
                  <span className="timeline-marker">{done ? '✓' : current ? '•' : ''}</span>
                  <div><strong>{label}</strong><small>{current ? snapshot.title : done ? 'Concluído' : 'Aguardando'}</small></div>
                </div>;
              })}
            </div>
          </article>

          <div className="delivery-note modern"><span className="delivery-note-icon">▣</span><div><strong>Pagamento na entrega</strong><p>Quando a botija chegar, combine diretamente com o entregador o método de pagamento disponível.</p></div></div>

          <div className="tracking-side-actions">
            <Link to="/pedir" className="primary-btn full">Pedir outra botija <span>→</span></Link>
            <Link to="/perfil" className="secondary-btn full">Voltar para minha conta</Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
