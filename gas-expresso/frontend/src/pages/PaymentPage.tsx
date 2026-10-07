import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';

interface PaymentOrder {
  id: string;
  reference: string;
  paymentMethod: string;
  status: string;
  pricing: { total: number; currency: string };
}

interface PaymentTracking { order: PaymentOrder }

export default function PaymentPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!orderId) {
      setLoading(false);
      return;
    }
    apiGet<PaymentTracking>(`/orders/mine/${encodeURIComponent(orderId)}/tracking`)
      .then((result) => { if (active) setOrder(result.order); })
      .catch((cause) => { if (active) setError(extractMessage(cause, 'Não foi possível carregar os dados do pagamento.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId]);

  if (!orderId) return <div className="page narrow-page payment-page"><div className="payment-card"><span className="section-kicker">Pagamento</span><h1>Nenhum pedido selecionado.</h1><p>Abra esta etapa a partir de um pedido confirmado.</p><Link className="primary-btn" to="/pedir">Fazer pedido</Link></div></div>;

  return (
    <div className="page narrow-page payment-page">
      <div className="page-heading"><div><span className="section-kicker">Pedido confirmado</span><h1>Pagamento e próxima etapa.</h1><p>A forma de pagamento disponível neste fluxo é apresentada pelo servidor. Não há cobrança digital simulada nesta versão.</p></div></div>
      {loading && <div className="payment-card"><p role="status">A carregar os dados do pedido…</p></div>}
      {error && <div className="form-error" role="alert">{error}</div>}
      {order && <div className="payment-card">
        <div className="payment-success-head"><span className="payment-check">✓</span><div><span className="section-kicker">Pedido {order.reference}</span><h2>{order.paymentMethod === 'PAY_ON_DELIVERY' ? 'Pagamento na entrega' : 'Método de pagamento'}</h2><p>{order.paymentMethod === 'PAY_ON_DELIVERY' ? 'O pagamento será efetuado ao concluir a entrega, conforme o método registado no pedido.' : `Método confirmado: ${order.paymentMethod}`}</p></div></div>
        <div className="payment-total"><span>Total do pedido</span><strong>{formatAOA(order.pricing.total)}</strong></div>
        <div className="payment-protection"><strong>Sem cobrança fictícia</strong><span>O frontend não cria transações, QR Codes ou confirmações de pagamento que não tenham vindo da API.</span></div>
        <Link className="primary-btn full" to={`/rastrear?orderId=${encodeURIComponent(order.id)}`}>Acompanhar pedido <span>→</span></Link>
        <Link className="secondary-btn full" to="/perfil">Voltar para minha conta</Link>
      </div>}
    </div>
  );
}
