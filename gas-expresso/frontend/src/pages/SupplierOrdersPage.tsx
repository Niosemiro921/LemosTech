import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { acceptSupplierOrder, fetchSupplierOrders, prepareSupplierOrder, readySupplierOrder, startDispatch, type SupplierOrder } from '../services/supplier';

const labels: Record<string, string> = { AWAITING_SUPPLIER_ACCEPTANCE: 'Novo pedido', SUPPLIER_ACCEPTED: 'Aceite', PREPARING: 'Em preparação', READY_FOR_PICKUP: 'Pronto para recolha', DRIVER_SEARCHING: 'A procurar entregador', DRIVER_ASSIGNED: 'Entregador atribuído', DRIVER_ACCEPTED: 'Entregador aceitou', PICKED_UP: 'Recolhido', IN_TRANSIT: 'Em entrega', ARRIVED: 'Chegou ao destino', DELIVERED: 'Entregue', COMPLETED: 'Concluído', CANCELLED: 'Cancelado', FAILED: 'Falhou' };
const statuses = Object.keys(labels);
const paymentLabel = (value?: string) => value === 'PAY_ON_DELIVERY' ? 'Pagamento na entrega' : value || 'Pagamento não informado pela API';
const deliveryLabel = (value?: string) => value === 'EXPRESS' ? 'Entrega expressa' : value === 'SCHEDULED' ? 'Entrega programada' : 'Modalidade não informada pela API';

export default function SupplierOrdersPage() {
  const [items, setItems] = useState<SupplierOrder[]>([]); const [filter, setFilter] = useState(''); const [query, setQuery] = useState(''); const [busyId, setBusyId] = useState<string | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  async function load() { setLoading(true); try { setItems(await fetchSupplierOrders()); setError(''); } catch (cause) { setError(extractMessage(cause, 'Não foi possível carregar os pedidos da empresa.')); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const filtered = useMemo(() => items.filter((item) => (!filter || item.status === filter) && (!query.trim() || `${item.reference} ${item.deliveryAddress} ${item.items.map((row) => row.variantName).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()))), [items, filter, query]);
  const counts = useMemo(() => ({ new: items.filter((item) => item.status === 'AWAITING_SUPPLIER_ACCEPTANCE').length, preparing: items.filter((item) => ['SUPPLIER_ACCEPTED', 'PREPARING'].includes(item.status)).length, ready: items.filter((item) => item.status === 'READY_FOR_PICKUP').length }), [items]);
  async function act(order: SupplierOrder) {
    setBusyId(order.id); setError(''); setSuccess('');
    try {
      if (order.status === 'AWAITING_SUPPLIER_ACCEPTANCE') await acceptSupplierOrder(order.id);
      else if (order.status === 'SUPPLIER_ACCEPTED') await prepareSupplierOrder(order.id);
      else if (order.status === 'PREPARING') await readySupplierOrder(order.id);
      else if (order.status === 'READY_FOR_PICKUP') await startDispatch(order.id);
      else return;
      setSuccess(`Pedido ${order.reference} actualizado.`); await load();
    } catch (cause) { setError(extractMessage(cause, 'Não foi possível actualizar o pedido.')); }
    finally { setBusyId(null); }
  }
  function actionLabel(order: SupplierOrder) { if (order.status === 'AWAITING_SUPPLIER_ACCEPTANCE') return 'Aceitar pedido'; if (order.status === 'SUPPLIER_ACCEPTED') return 'Iniciar preparação'; if (order.status === 'PREPARING') return 'Marcar como pronto'; if (order.status === 'READY_FOR_PICKUP') return 'Procurar entregador'; return null; }

  return <div className="supplier-module-page page"><header className="workspace-heading"><div><span className="section-kicker">ERP · OPERAÇÃO</span><h1>Pedidos e entregas</h1><p>Execute uma transição de cada vez. Cada mudança de estado é validada e persistida pelo backend.</p></div><button className="secondary-btn" onClick={() => void load()} disabled={loading || busyId !== null}>↻ Actualizar</button></header>
    {error && <div className="form-error" role="alert">{error}</div>}{success && <div className="success-alert" role="status">{success}</div>}
    {!loading && <div className="supplier-kpi-grid supplier-order-metrics"><article><small>Novos</small><strong>{counts.new}</strong><span>Aguardam resposta da empresa</span></article><article><small>Em preparação</small><strong>{counts.preparing}</strong><span>Aceites ou em preparação</span></article><article><small>Prontos para recolha</small><strong>{counts.ready}</strong><span>Podem iniciar procura de entregador</span></article><article><small>Total de pedidos</small><strong>{items.length}</strong><span>Registos devolvidos pela API</span></article></div>}
    <section className="workspace-panel"><div className="supplier-filter-tools"><label className="supplier-search-field"><span>Pesquisar pedidos</span><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Referência, produto ou endereço"/></label><label className="supplier-search-field"><span>Estado</span><select className="input" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">Todos os estados</option>{statuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></label></div>
      {loading ? <div className="loading-panel" role="status">A carregar pedidos da API…</div> : filtered.length ? <div className="supplier-orders">{filtered.map((order) => { const action = actionLabel(order); return <article className="supplier-order" key={order.id}><div className="supplier-order-main"><div className="supplier-order-badge">{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</div><div className="supplier-order-copy"><span className="supplier-order-id">{order.reference} · {new Date(order.createdAt).toLocaleString('pt-AO')}</span><h3>{order.items.map((item) => `${item.quantity} × ${item.variantName}`).join(', ') || 'Itens não devolvidos'}</h3><p>{order.deliveryAddress}</p><small>{order.scheduledAt ? `Entrega programada: ${new Date(order.scheduledAt).toLocaleString('pt-AO')}` : deliveryLabel(order.deliveryType)} · {paymentLabel(order.paymentMethod)}</small></div></div><div className="supplier-order-side"><span className={`status-pill ${['DELIVERED', 'COMPLETED'].includes(order.status) ? 'success' : ['CANCELLED', 'FAILED'].includes(order.status) ? 'danger' : 'warning'}`}>{labels[order.status] ?? order.status}</span><strong>{formatAOA(order.pricing?.total ?? 0)}</strong>{action && <button className="primary-btn small" disabled={busyId === order.id} onClick={() => void act(order)}>{busyId === order.id ? 'A processar…' : action}</button>}<Link className="secondary-btn" to={`/fornecedor/pedido/${encodeURIComponent(order.id)}`}>Ver detalhes</Link></div></article>; })}</div> : <div className="empty-state"><h3>{items.length ? 'Nenhum pedido corresponde ao filtro' : 'Ainda não há pedidos'}</h3><p>{items.length ? 'Altere a pesquisa ou seleccione Todos os estados.' : 'Quando um cliente confirmar um pedido atribuído à sua empresa, ele aparecerá aqui.'}</p>{items.length > 0 && <button className="secondary-btn" onClick={() => { setQuery(''); setFilter(''); }}>Limpar filtros</button>}</div>}
    </section>
  </div>;
}
