import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { acceptSupplierOrder, cancelSupplierOrder, fetchSupplierOrders, prepareSupplierOrder, readySupplierOrder, startDispatch, type SupplierOrder } from '../services/supplier';

const paymentLabel = (value?: string) => value === 'PAY_ON_DELIVERY' ? 'Pagamento na entrega' : value || 'Não informado pela API';
const deliveryLabel = (value?: string) => value === 'EXPRESS' ? 'Expressa' : value === 'SCHEDULED' ? 'Programada' : 'Não informada pela API';
const labels: Record<string, string> = { AWAITING_SUPPLIER_ACCEPTANCE: 'A aguardar resposta da empresa', SUPPLIER_ACCEPTED: 'Pedido aceite', PREPARING: 'Em preparação', READY_FOR_PICKUP: 'Pronto para recolha', DRIVER_SEARCHING: 'A procurar entregador', DRIVER_ASSIGNED: 'Entregador atribuído', DRIVER_ACCEPTED: 'Entregador aceitou', PICKED_UP: 'Recolhido pelo entregador', IN_TRANSIT: 'Em entrega', ARRIVED: 'Entregador chegou', DELIVERED: 'Entregue', COMPLETED: 'Concluído', CANCELLED: 'Cancelado', FAILED: 'Falhou' };
export default function SupplierOrderPage() {
  const { orderId } = useParams(); const navigate = useNavigate();
  const [order, setOrder] = useState<SupplierOrder | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notFound, setNotFound] = useState(false); const [success, setSuccess] = useState(''); const [cancelNote, setCancelNote] = useState(''); const [cancelling, setCancelling] = useState(false);
  async function refresh() {
    if (!orderId) { setNotFound(true); setLoading(false); return; }
    setLoading(true);
    try { const orders = await fetchSupplierOrders(); const current = orders.find((item) => item.id === orderId) ?? null; setOrder(current); setNotFound(!current); setError(''); }
    catch (cause) { setError(extractMessage(cause, 'Não foi possível carregar o pedido.')); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [orderId]);
  async function act() {
    if (!order) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      if (order.status === 'AWAITING_SUPPLIER_ACCEPTANCE') await acceptSupplierOrder(order.id);
      else if (order.status === 'SUPPLIER_ACCEPTED') await prepareSupplierOrder(order.id);
      else if (order.status === 'PREPARING') await readySupplierOrder(order.id);
      else if (order.status === 'READY_FOR_PICKUP') await startDispatch(order.id);
      else return;
      setSuccess('O estado do pedido foi actualizado no servidor.'); await refresh();
    } catch (cause) { setError(extractMessage(cause, 'Não foi possível actualizar o pedido.')); await refresh(); }
    finally { setBusy(false); }
  }
  const action = order?.status === 'AWAITING_SUPPLIER_ACCEPTANCE' ? 'Aceitar pedido' : order?.status === 'SUPPLIER_ACCEPTED' ? 'Iniciar preparação' : order?.status === 'PREPARING' ? 'Marcar como pronto para recolha' : order?.status === 'READY_FOR_PICKUP' ? 'Iniciar procura de entregador' : null;
  const canCancel = Boolean(order && ['CREATED', 'AWAITING_SUPPLIER_ACCEPTANCE', 'SUPPLIER_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'DRIVER_SEARCHING', 'DRIVER_ASSIGNED'].includes(order.status));
  async function cancelOrder() {
    if (!order) return;
    if (cancelNote.trim().length < 3) { setError('Informe um motivo com pelo menos 3 caracteres.'); return; }
    setCancelling(true); setError(''); setSuccess('');
    try { await cancelSupplierOrder(order.id, cancelNote); setSuccess('Pedido cancelado pelo servidor e stock reservado libertado.'); setCancelNote(''); await refresh(); }
    catch (cause) { setError(extractMessage(cause, 'Não foi possível cancelar o pedido.')); await refresh(); }
    finally { setCancelling(false); }
  }
  return <div className="page operation-detail-page supplier-order-detail-page">
    <div className="operation-detail-topbar"><button className="back-link" onClick={() => navigate('/fornecedor/pedidos')}>← Voltar aos pedidos</button><span className="section-kicker">OPERAÇÃO DA EMPRESA</span></div>
    {error && <div className="form-error" role="alert">{error}</div>}{success && <div className="success-alert" role="status">{success}</div>}
    {loading ? <div className="loading-panel" role="status">A carregar detalhes do pedido…</div> : notFound || !order ? <section className="workspace-panel"><div className="empty-state"><h2>Pedido não encontrado</h2><p>O backend não devolveu este pedido para a empresa autenticada. Confirme a referência ou volte à lista.</p><Link className="primary-btn" to="/fornecedor/pedidos">Voltar aos pedidos</Link></div></section> : <div className="operation-detail-grid">
      <main className="operation-main-card"><span className="section-kicker">{order.reference}</span><h1>{labels[order.status] ?? order.status}</h1><p>Recebido em {new Date(order.createdAt).toLocaleString('pt-AO')}</p>
        <div className="supplier-order-detail-status"><span className={`status-pill ${['DELIVERED', 'COMPLETED'].includes(order.status) ? 'success' : ['CANCELLED', 'FAILED'].includes(order.status) ? 'danger' : 'warning'}`}>{labels[order.status] ?? order.status}</span><span>Actualizado em {new Date(order.updatedAt ?? order.createdAt).toLocaleString('pt-AO')}</span></div>
        <section className="driver-order-card"><div className="driver-order-head"><div><small>Produtos do pedido</small><strong>{order.items.map((item) => `${item.quantity} × ${item.variantName}`).join(', ') || 'Itens não devolvidos'}</strong></div><span className="order-amount">{formatAOA(order.pricing?.total ?? 0)}</span></div><div className="driver-order-meta"><span>Entrega: {order.deliveryAddress}</span><span>Subtotal dos produtos: {formatAOA(order.pricing?.subtotal ?? 0)}</span><span>Taxa de entrega: {formatAOA(order.pricing?.deliveryFee ?? 0)}</span><span>Modo: {deliveryLabel(order.deliveryType)}</span>{order.scheduledAt && <span>Agendada para: {new Date(order.scheduledAt).toLocaleString('pt-AO')}</span>}</div></section>
        {action ? <div className="supplier-order-next-action"><strong>Próxima acção recomendada</strong><p>Execute apenas esta transição. Depois de confirmada pelo servidor, a próxima etapa será apresentada.</p><button className="primary-btn full" disabled={busy || cancelling} onClick={() => void act()}>{busy ? 'A actualizar…' : action} <span>→</span></button></div> : <div className="supplier-api-note"><strong>Sem acções de preparação pendentes</strong><p>O estado actual não permite esta transição pelo portal empresarial.</p></div>}
        {canCancel && <section className="supplier-cancel-order"><strong>Precisa de cancelar este pedido?</strong><p>O motivo fica registado. O backend valida o estado e liberta o stock reservado dentro da mesma operação.</p><label htmlFor="supplier-cancel-note">Motivo do cancelamento</label><textarea id="supplier-cancel-note" className="input" value={cancelNote} onChange={(event) => setCancelNote(event.target.value)} minLength={3} maxLength={500} rows={3} placeholder="Descreva o motivo para o cliente e para a auditoria"/><button className="danger-btn" type="button" disabled={cancelling || busy || cancelNote.trim().length < 3} onClick={() => void cancelOrder()}>{cancelling ? 'A cancelar…' : 'Confirmar cancelamento'}</button></section>}
      </main>
      <aside className="operation-side-card"><div className="section-kicker">RESUMO DO PEDIDO</div><div className="side-info-row"><span>Referência</span><strong>{order.reference}</strong></div><div className="side-info-row"><span>Estado</span><strong>{labels[order.status] ?? order.status}</strong></div><div className="side-info-row"><span>Pagamento</span><strong>{paymentLabel(order.paymentMethod)}</strong></div><div className="side-info-row"><span>Distância estimada</span><strong>{order.pricing?.distanceKm != null ? `${order.pricing.distanceKm.toFixed(1)} km` : 'Não disponível'}</strong></div><div className="side-info-row"><span>Previsão inicial</span><strong>{order.pricing?.estimatedMinutes != null ? `${order.pricing.estimatedMinutes} min` : 'Não disponível'}</strong></div><div className="side-divider"/><p>Preço, reserva de stock e transições vêm do backend. A previsão de distância/tempo é a devolvida pelo contrato actual da API.</p><Link className="secondary-btn full" to="/fornecedor/pedidos">Lista de pedidos</Link></aside>
    </div>}
  </div>;
}
