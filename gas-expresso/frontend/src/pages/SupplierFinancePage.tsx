import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { fetchSupplierOrders, type SupplierOrder } from '../services/supplier';

const completed = new Set(['DELIVERED', 'COMPLETED']);
const pending = new Set(['AWAITING_SUPPLIER_ACCEPTANCE', 'SUPPLIER_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'DRIVER_SEARCHING', 'DRIVER_ASSIGNED', 'DRIVER_ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED']);

export default function SupplierFinancePage() {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load() { setLoading(true); try { setOrders(await fetchSupplierOrders()); setError(''); } catch (cause) { setError(extractMessage(cause, 'Não foi possível carregar os valores dos pedidos.')); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const summary = useMemo(() => {
    const finished = orders.filter((order) => completed.has(order.status));
    return {
      orders: orders.length,
      pending: orders.filter((order) => pending.has(order.status)).length,
      completed: finished.length,
      cancelled: orders.filter((order) => ['CANCELLED', 'FAILED'].includes(order.status)).length,
      productValue: finished.reduce((sum, order) => sum + (order.pricing?.subtotal ?? 0), 0),
      deliveryFees: finished.reduce((sum, order) => sum + (order.pricing?.deliveryFee ?? 0), 0),
      totalValue: finished.reduce((sum, order) => sum + (order.pricing?.total ?? 0), 0),
    };
  }, [orders]);

  return <div className="supplier-module-page page">
    <header className="workspace-heading"><div><span className="section-kicker">ERP · FINANCEIRO</span><h1>Resumo financeiro operacional</h1><p>Valores agregados de pedidos reais devolvidos pela API. Não representam liquidação ou recebimento contabilístico.</p></div><button className="secondary-btn" onClick={() => void load()} disabled={loading}>↻ Actualizar</button></header>
    {error && <div className="form-error" role="alert">{error}</div>}
    {loading ? <div className="loading-panel" role="status">A consultar pedidos para construir o resumo…</div> : <>
      <div className="supplier-kpi-grid"><article><small>Pedidos devolvidos</small><strong>{summary.orders}</strong><span>Sem filtro financeiro na API actual</span></article><article><small>Em curso</small><strong>{summary.pending}</strong><span>Pedidos ainda em operação</span></article><article><small>Concluídos</small><strong>{summary.completed}</strong><span>Estados finais recebidos da API</span></article><article><small>Cancelados / falhados</small><strong>{summary.cancelled}</strong><span>Não incluídos nos valores concluídos</span></article></div>
      <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">PEDIDOS CONCLUÍDOS</span><h2>Valores registados no pedido</h2></div><Link to="/fornecedor/pedidos" className="text-link">Consultar pedidos →</Link></div><div className="supplier-finance-total-grid"><article><small>Subtotal de produtos</small><strong>{formatAOA(summary.productValue)}</strong></article><article><small>Taxas de entrega</small><strong>{formatAOA(summary.deliveryFees)}</strong></article><article><small>Total cobrado no pedido</small><strong>{formatAOA(summary.totalValue)}</strong></article></div><p className="supplier-muted-copy">Os valores vêm do preço guardado em cada pedido. Como o backend actual usa pagamento na entrega e não expõe uma reconciliação financeira completa do fornecedor, estes montantes não devem ser tratados como saldo recebido.</p></section>
      <section className="workspace-panel"><span className="section-kicker">FACTURAÇÃO</span><h2>Facturas, despesas e pagamentos</h2><p>A interface de criação de facturas foi desactivada até existir persistência financeira real. O backend não tem endpoints para contas a receber, contas a pagar, emissão de factura ou reconciliação do fornecedor.</p><div className="supplier-api-note"><strong>Endpoints necessários</strong><p><code>GET/POST /suppliers/me/invoices</code>, consulta de pagamentos e um fluxo de reconciliação ligado a pagamentos confirmados. Não foi criada nenhuma factura fictícia.</p></div></section>
    </>}
  </div>;
}
