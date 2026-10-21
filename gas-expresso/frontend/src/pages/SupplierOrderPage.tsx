import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { acceptSupplierOrder, fetchSupplierOrders, prepareSupplierOrder, readySupplierOrder, startDispatch, type SupplierOrder } from '../services/supplier';

const labels: Record<string, string> = {
  AWAITING_SUPPLIER_ACCEPTANCE: 'A aguardar resposta da empresa',
  SUPPLIER_ACCEPTED: 'Pedido aceite',
  PREPARING: 'Em preparação',
  READY_FOR_PICKUP: 'Pronto para recolha',
  DRIVER_SEARCHING: 'A procurar entregador',
  DRIVER_ACCEPTED: 'Entregador atribuído',
  PICKED_UP: 'Recolhido pelo entregador',
  IN_TRANSIT: 'Em entrega',
  ARRIVED: 'Entregador chegou',
  DELIVERED: 'Entregue',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  FAILED: 'Falhou',
};

export default function SupplierOrderPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<SupplierOrder | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const orders = await fetchSupplierOrders();
      setOrder(orders.find((item) => item.id === orderId) ?? null);
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível carregar o pedido.'));
    }
  };
  useEffect(() => { void refresh(); }, [orderId]);

  const act = async () => {
    if (!order) return;
    setBusy(true);
    setError('');
    try {
      if (order.status === 'AWAITING_SUPPLIER_ACCEPTANCE') await acceptSupplierOrder(order.id);
      else if (order.status === 'SUPPLIER_ACCEPTED') await prepareSupplierOrder(order.id);
      else if (order.status === 'PREPARING') {
        await readySupplierOrder(order.id);
        await startDispatch(order.id);
      } else if (order.status === 'READY_FOR_PICKUP') await startDispatch(order.id);
      await refresh();
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível atualizar o pedido.'));
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  const action = order?.status === 'AWAITING_SUPPLIER_ACCEPTANCE' ? 'Aceitar pedido'
    : order?.status === 'SUPPLIER_ACCEPTED' ? 'Iniciar preparação'
      : order?.status === 'PREPARING' ? 'Marcar pronto e procurar entregador'
        : order?.status === 'READY_FOR_PICKUP' ? 'Iniciar procura de entregador' : null;

  return <div className="page operation-detail-page">
    <div className="operation-detail-topbar"><button className="back-link" onClick={() => navigate('/fornecedor')}>← Voltar ao painel</button><span className="section-kicker">Operação da empresa</span></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {!order ? <p role="status">A carregar pedido… Se o pedido não pertencer à sua conta, não será apresentado.</p> : <div className="operation-detail-grid">
      <main className="operation-main-card"><span className="section-kicker">{order.reference}</span><h1>{labels[order.status] ?? order.status}</h1><p>Recebido em {new Date(order.createdAt).toLocaleString('pt-AO')}</p>
        <div className="driver-order-card"><div className="driver-order-head"><div><small>Produtos do pedido</small><strong>{order.items.map((item) => `${item.quantity} × ${item.variantName}`).join(', ')}</strong></div><span className="order-amount">{formatAOA(order.pricing.total)}</span></div><div className="driver-order-meta"><span>Entrega: {order.deliveryAddress}</span><span>Subtotal de produtos: {formatAOA(order.pricing.subtotal)}</span></div></div>
        {action ? <button className="primary-btn full" disabled={busy} onClick={() => void act()}>{busy ? 'A atualizar…' : action} <span>→</span></button> : <p>Não existem ações pendentes para este pedido.</p>}
      </main>
      <aside className="operation-side-card"><div className="section-kicker">Estado</div><div className="side-info-row"><span>Referência</span><strong>{order.reference}</strong></div><div className="side-info-row"><span>Estado</span><strong>{labels[order.status] ?? order.status}</strong></div><div className="side-info-row"><span>Pagamento</span><strong>Na entrega</strong></div><div className="side-divider" /><p>As transições e a reserva de stock são registadas pelo sistema.</p><Link className="secondary-btn full" to="/fornecedor">Painel da empresa</Link></aside>
    </div>}
  </div>;
}
