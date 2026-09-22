import { useNavigate } from 'react-router-dom';
import { createDispatch } from '../services/dispatch';
import { formatAOA } from '../services/catalog';
import { calculateQuote } from '../services/pricing';
import { useOrderStore } from '../stores/orderStore';

export default function ConfirmPage() {
  const navigate = useNavigate();
  const { selectedProduct, quantity, deliveryType, address, scheduledAt } = useOrderStore();
  const product = selectedProduct;

  if (!product || !address) {
    navigate('/pedir');
    return null;
  }

  const quote = calculateQuote({ product, quantity, deliveryType, distanceKm: null });

  const scheduleLabel = scheduledAt
    ? new Date(scheduledAt).toLocaleString('pt-AO', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Agora · 20–40 min';

  return (
    <div className="page narrow-page">
      <div className="page-heading">
        <span className="section-kicker">Última revisão</span>
        <h1>Confirme o seu pedido.</h1>
        <p>Revise os detalhes. O pagamento será feito diretamente ao entregador no momento da entrega.</p>
      </div>

      <div className="confirmation-card">
        <div className="confirmation-product"><div className="cylinder">GÁS</div><div><span className="section-kicker">Produto</span><strong>{quantity} × {product.label}</strong><small>{formatAOA(product.price)} por botija</small></div></div>
        <div className="confirm-row"><span>Entrega</span><strong>{deliveryType === 'express' ? 'Expressa' : 'Programada'}</strong></div>
        <div className="confirm-row"><span>Quando</span><strong>{scheduleLabel}</strong></div>
        <div className="confirm-row"><span>Local</span><strong>{address.address}</strong></div>
        <div className="confirm-row"><span>Coordenadas</span><strong>{address.lat?.toFixed(5)}, {address.lng?.toFixed(5)}</strong></div>
        <div className="divider" />
        <div className="confirm-row"><span>Produtos</span><strong>{formatAOA(quote.subtotal)}</strong></div>
        <div className="confirm-row"><span>Entrega</span><strong>{formatAOA(quote.deliveryFee)}</strong></div>
        <div className="confirm-row"><span>Comissão Gás Expresso</span><strong>{formatAOA(quote.platformFee)}</strong></div>
        {quote.discount > 0 && <div className="confirm-row"><span>Desconto</span><strong>- {formatAOA(quote.discount)}</strong></div>}
        <div className="divider" />
        <div className="confirm-row total-row"><span>Total estimado</span><strong>{formatAOA(quote.total)}</strong></div>
        <button className="primary-btn full" onClick={() => { createDispatch(); navigate('/rastrear'); }}>Confirmar e procurar entregador <span>→</span></button>
        <small className="demo-note">Pagamento na entrega: combine o método diretamente com o entregador quando receber a botija.</small>
      </div>
    </div>
  );
}
