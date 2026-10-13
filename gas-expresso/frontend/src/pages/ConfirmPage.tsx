import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatAOA } from '../services/catalog';
import { createCustomerOrder } from '../services/orders';
import { createQuote, type QuotePricingView } from '../services/quote';
import { extractMessage } from '../services/auth';
import { useOrderStore } from '../stores/orderStore';
import { ORDER_KIND_META } from '../services/orderKinds';
import { normalizeOrderKind } from '../types/gas';

export default function ConfirmPage() {
  const navigate = useNavigate();
  const {
    selectedProduct,
    quantity,
    deliveryType,
    address,
    scheduledAt,
    changeForAmount,
    bottleExchangeType,
    bottleBrand,
    valveType,
    deliveryNotes,
  } = useOrderStore();
  const [quote, setQuote] = useState<QuotePricingView | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const orderKind = normalizeOrderKind(bottleExchangeType);
  const [idempotencyKey] = useState(() => {
    const storageKey = 'gas-expresso-order-idempotency';
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const generated = crypto.randomUUID();
    sessionStorage.setItem(storageKey, generated);
    return generated;
  });

  useEffect(() => {
    if (!selectedProduct || !address || address.lat == null || address.lng == null) {
      navigate('/pedir', { replace: true });
      return;
    }
    let current = true;
    setLoading(true);
    setError('');
    createQuote({
      product: selectedProduct,
      quantity,
      deliveryType,
      latitude: address.lat,
      longitude: address.lng,
      deliveryAddress: address.address,
      scheduledAt,
      bottleExchangeType: orderKind,
    })
      .then((result) => {
        if (current) {
          setQuote(result);
          if (!result.available) setError(result.message ?? 'Não há disponibilidade para esta entrega.');
        }
      })
      .catch((cause: unknown) => {
        if (current) setError(extractMessage(cause, 'Não foi possível obter o preço atualizado.'));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [navigate, selectedProduct, quantity, deliveryType, address, scheduledAt, orderKind]);

  if (!selectedProduct || !address) return null;
  const product = selectedProduct;
  const kindMeta = ORDER_KIND_META[orderKind];
  const showBottleDetails = orderKind !== 'NEW_CYLINDER';
  const scheduleLabel = scheduledAt
    ? new Date(scheduledAt).toLocaleString('pt-AO', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Assim que a empresa aceitar';

  const valveLabels: Record<string, string> = {
    QUICK_20MM: 'Válvula Rápida 20mm',
    QUICK_22MM: 'Válvula Rápida 22mm',
    THREAD_SCREW: 'Rosca / Tradicional',
  };

  const submitOrder = async () => {
    if (!quote?.available || address.lat == null || address.lng == null) return;
    setSubmitting(true);
    setError('');
    try {
      const order = await createCustomerOrder({
        product,
        quantity,
        deliveryType,
        deliveryAddress: address.address,
        latitude: address.lat,
        longitude: address.lng,
        scheduledAt,
        idempotencyKey,
        changeForAmount,
        bottleExchangeType,
        bottleBrand,
        valveType,
        deliveryNotes,
      });
      sessionStorage.removeItem('gas-expresso-order-idempotency');
      navigate(`/pagamento?orderId=${encodeURIComponent(order.id)}`, { replace: true });
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível criar o pedido.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page narrow-page">
      <div className="page-heading">
        <span className="section-kicker">Última revisão</span>
        <h1>Confirme seu pedido.</h1>
        <p>O pedido será enviado à empresa e o pagamento será feito na entrega.</p>
      </div>
      <div className="confirmation-card">
        <div className="confirmation-product">
          <div className="cylinder">GÁS</div>
          <div>
            <span className="section-kicker">Produto</span>
            <strong>
              {quantity} × {product.label}
            </strong>
            <small>{formatAOA(product.price)} por botija</small>
          </div>
        </div>

        <div className="confirm-row">
          <span>Atendimento</span>
          <strong>{kindMeta.icon} {kindMeta.label}</strong>
        </div>
        <div className="confirm-note">{kindMeta.note}</div>
        {showBottleDetails && (
          <div className="confirm-row">
            <span>Marca & Válvula</span>
            <strong>{bottleBrand} às {valveLabels[valveType] ?? valveType}</strong>
          </div>
        )}
        <div className="confirm-row">
          <span>Troco na entrega</span>
          <strong>
            {changeForAmount ? `Preparar troco para ${formatAOA(changeForAmount)}` : 'Valor exato / Sem troco'}
          </strong>
        </div>
        {deliveryNotes && (
          <div className="confirm-row">
            <span>Instruções</span>
            <small style={{ fontWeight: 600, color: 'var(--text-dark, #1e293b)' }}>{deliveryNotes}</small>
          </div>
        )}
        <div className="confirm-row">
          <span>Entrega</span>
          <strong>{deliveryType === 'express' ? '⚡ Expressa' : '📅 Programada'}</strong>
        </div>
        <div className="confirm-row">
          <span>Quando</span>
          <strong>{scheduleLabel}</strong>
        </div>
        <div className="confirm-row">
          <span>Local</span>
          <strong>{address.address}</strong>
        </div>

        {quote?.available && (
          <>
            <div className="divider" />
            <div className="confirm-row">
              <span>Gás</span>
              <strong>{formatAOA(quote.subtotal)}</strong>
            </div>
            {quote.cylinderFee > 0 && (
              <div className="confirm-row">
                <span>Cilindro novo ({quantity} × {product.label})</span>
                <strong>{formatAOA(quote.cylinderFee)}</strong>
              </div>
            )}
            <div className="confirm-row">
              <span>Entrega</span>
              <strong>{formatAOA(quote.deliveryFee)}</strong>
            </div>
            <div className="confirm-row">
              <span>Comissão Gás Expresso</span>
              <strong>{formatAOA(quote.platformFee)}</strong>
            </div>
            {quote.discount > 0 && (
              <div className="confirm-row">
                <span>Desconto</span>
                <strong>- {formatAOA(quote.discount)}</strong>
              </div>
            )}
            <div className="divider" />
            <div className="confirm-row total-row">
              <span>Total a pagar</span>
              <strong>{formatAOA(quote.total)}</strong>
            </div>
            {changeForAmount && changeForAmount > quote.total && (
              <div className="confirm-row" style={{ color: 'var(--brand, #e4572e)' }}>
                <span>Troco a receber</span>
                <strong>{formatAOA(changeForAmount - quote.total)}</strong>
              </div>
            )}
          </>
        )}

        {loading && <p role="status">Confirmando preço, estoque e disponibilidade com o servidor...</p>}
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <button
          className="primary-btn full"
          onClick={submitOrder}
          disabled={loading || submitting || !quote?.available}
        >
          {submitting ? 'Criando pedido...' : loading ? 'Validando...' : 'Confirmar pedido'}
          {!loading && !submitting && <span>→</span>}
        </button>
        <small className="payment-note">Pagamento na entrega: o valor total é o que foi confirmado no pedido.</small>
      </div>
    </div>
  );
}