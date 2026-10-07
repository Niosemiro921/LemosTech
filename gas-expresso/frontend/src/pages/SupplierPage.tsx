import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { fetchSupplierInventory, fetchSupplierOrders, type SupplierInventoryItem, type SupplierOrder } from '../services/supplier';

export default function SupplierPage() {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [inventory, setInventory] = useState<SupplierInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [orderData, stockData] = await Promise.all([fetchSupplierOrders(), fetchSupplierInventory()]);
      setOrders(orderData);
      setInventory(stockData);
      setError('');
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível carregar o dashboard do fornecedor.'));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  const metrics = useMemo(() => ({
    sales: orders.reduce((sum, order) => sum + (order.pricing.subtotal ?? 0), 0),
    stock: inventory.reduce((sum, item) => sum + Math.max(0, item.availableQty ?? 0), 0),
    reserved: inventory.reduce((sum, item) => sum + Math.max(0, item.reservedQty ?? 0), 0),
    low: inventory.filter((item) => item.availableQty <= item.reorderLevel).length,
  }), [orders, inventory]);

  return <div className="page supplier-dashboard-page supplier-module-page">
    <div className="workspace-heading"><div><span className="section-kicker">ERP / Dashboard</span><h1>Visão operacional do fornecedor.</h1><p>Vendas e stock calculados exclusivamente a partir dos dados devolvidos pela API.</p></div><button className="secondary-btn" onClick={() => void load()} disabled={loading}>{loading ? 'A atualizar…' : 'Atualizar'}</button></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {loading && <div className="loading-panel" role="status">A carregar os indicadores da operação…</div>}
    {!loading && <>
      <div className="supplier-kpi-grid">
        <article><small>Valor bruto dos pedidos</small><strong>{formatAOA(metrics.sales)}</strong><span>Subtotal dos pedidos devolvidos</span></article>
        <article><small>Stock disponível</small><strong>{metrics.stock}</strong><span>Unidades disponíveis na API</span></article>
        <article><small>Stock reservado</small><strong>{metrics.reserved}</strong><span>Unidades já reservadas</span></article>
        <article className={metrics.low ? 'alert-kpi' : ''}><small>Alertas de stock</small><strong>{metrics.low}</strong><span>Itens abaixo do nível mínimo</span></article>
      </div>
      <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">Pedido / stock</span><h2>Operação recente</h2></div></div>
        {orders.length ? <div className="supplier-dashboard-grid"><div><h3>Pedidos</h3>{orders.slice(0, 8).map((order) => <Link className="dashboard-list-row" to={`/fornecedor/pedidos?order=${encodeURIComponent(order.id)}`} key={order.id}><span><strong>{order.reference}</strong><small>{new Date(order.createdAt).toLocaleString('pt-AO')} · {order.status}</small></span><strong>{formatAOA(order.pricing.subtotal)}</strong></Link>)}</div><div><h3>Stock a vigiar</h3>{inventory.filter((item) => item.availableQty <= item.reorderLevel).slice(0, 8).map((item) => <Link className="dashboard-list-row" to="/fornecedor/stock" key={item.id}><span><strong>{item.variant.name}</strong><small>{item.variant.sku} · mínimo {item.reorderLevel}</small></span><strong>{item.availableQty}</strong></Link>)}{inventory.filter((item) => item.availableQty <= item.reorderLevel).length === 0 && <div className="empty-state compact"><h3>Sem alertas</h3><p>Nenhum item abaixo do nível mínimo devolvido pelo servidor.</p></div>}</div></div> : <div className="empty-state"><h3>Nenhum pedido devolvido</h3><p>A operação não tem pedidos disponíveis neste momento.</p></div>}
      </section>
      <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">Módulos</span><h2>Gestão do negócio</h2></div></div><div className="module-card-grid"><Link to="/fornecedor/stock" className="module-card"><span>ERP</span><strong>Stock</strong><small>Disponível e reservado, com níveis mínimos.</small>→</Link><Link to="/fornecedor/pedidos" className="module-card"><span>ERP</span><strong>Pedidos e entregas</strong><small>Ciclo operacional do pedido.</small>→</Link><Link to="/fornecedor/lotes" className="module-card"><span>ERP</span><strong>Lotes de produção</strong><small>Interface preparada; depende do endpoint de lotes.</small>→</Link><Link to="/fornecedor/financeiro" className="module-card"><span>ERP</span><strong>Financeiro</strong><small>Receita de pedidos disponível; faturação completa depende da API.</small>→</Link><Link to="/fornecedor/clientes" className="module-card"><span>CRM</span><strong>Clientes</strong><small>Perfil e histórico de compras.</small>→</Link><Link to="/fornecedor/interacoes" className="module-card"><span>CRM</span><strong>Interações</strong><small>Notas, contactos e follow-up.</small>→</Link><Link to="/fornecedor/segmentacao" className="module-card"><span>CRM</span><strong>Segmentação</strong><small>Novos, frequentes e inativos.</small>→</Link><Link to="/fornecedor/relatorios" className="module-card"><span>CRM</span><strong>Relatórios</strong><small>Desempenho e fidelização.</small>→</Link></div></section>
    </>}
  </div>;
}
