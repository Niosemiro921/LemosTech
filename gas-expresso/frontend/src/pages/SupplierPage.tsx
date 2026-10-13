import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { fetchSupplierInventory, fetchSupplierLocation, fetchSupplierOrders, type SupplierInventoryItem, type SupplierLocation, type SupplierOrder } from '../services/supplier';

const activeStatuses = new Set(['AWAITING_SUPPLIER_ACCEPTANCE', 'SUPPLIER_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'DRIVER_SEARCHING', 'DRIVER_ASSIGNED', 'DRIVER_ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED']);
const doneStatuses = new Set(['DELIVERED', 'COMPLETED']);
const statusLabel: Record<string, string> = { AWAITING_SUPPLIER_ACCEPTANCE: 'A aguardar confirmação', SUPPLIER_ACCEPTED: 'Aceite', PREPARING: 'Em preparação', READY_FOR_PICKUP: 'Pronto para recolha', DRIVER_SEARCHING: 'A procurar entregador', DRIVER_ASSIGNED: 'Entregador atribuído', DRIVER_ACCEPTED: 'Entregador aceitou', PICKED_UP: 'Recolhido', IN_TRANSIT: 'Em entrega', ARRIVED: 'Chegou ao destino', DELIVERED: 'Entregue', COMPLETED: 'Concluído', CANCELLED: 'Cancelado', FAILED: 'Falhou' };

export default function SupplierPage() {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [inventory, setInventory] = useState<SupplierInventoryItem[]>([]);
  const [location, setLocation] = useState<SupplierLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const [orderResult, inventoryResult, locationResult] = await Promise.allSettled([fetchSupplierOrders(), fetchSupplierInventory(), fetchSupplierLocation()]);
    const nextErrors: string[] = [];
    if (orderResult.status === 'fulfilled') setOrders(orderResult.value); else nextErrors.push(`Pedidos: ${extractMessage(orderResult.reason, 'não foi possível carregar')}`);
    if (inventoryResult.status === 'fulfilled') setInventory(inventoryResult.value); else nextErrors.push(`Stock: ${extractMessage(inventoryResult.reason, 'não foi possível carregar')}`);
    if (locationResult.status === 'fulfilled') setLocation(locationResult.value); else nextErrors.push(`Localização: ${extractMessage(locationResult.reason, 'não foi possível carregar')}`);
    setErrors(nextErrors); setLoading(false); setRefreshing(false);
  }
  useEffect(() => { void load(); }, []);

  const metrics = useMemo(() => {
    const lowStock = inventory.filter((item) => item.availableQty <= item.reorderLevel);
    const completed = orders.filter((order) => doneStatuses.has(order.status));
    return {
      totalOrders: orders.length,
      activeOrders: orders.filter((order) => activeStatuses.has(order.status)).length,
      completedOrders: completed.length,
      completedSales: completed.reduce((sum, order) => sum + (order.pricing?.subtotal ?? 0), 0),
      available: inventory.reduce((sum, item) => sum + Math.max(0, item.availableQty), 0),
      reserved: inventory.reduce((sum, item) => sum + Math.max(0, item.reservedQty), 0),
      lowStock,
    };
  }, [orders, inventory]);

  return <div className="supplier-module-page page supplier-dashboard-page">
    <header className="supplier-home-hero"><div><span className="section-kicker">PORTAL DA EMPRESA · ERP</span><h1>A operação da sua empresa, num só lugar.</h1><p>Pedidos, inventário e localização operacional consultados directamente na API.</p><span className="supplier-data-note"><span className="live-dot"/> Dados do servidor · {new Date().toLocaleDateString('pt-AO')}</span></div><button className="secondary-btn" onClick={() => void load(true)} disabled={loading || refreshing}>{refreshing ? 'A actualizar…' : '↻ Actualizar dados'}</button></header>
    {errors.length > 0 && <div className="form-error" role="alert"><strong>Algumas áreas não foram carregadas.</strong><ul>{errors.map((item) => <li key={item}>{item}</li>)}</ul></div>}
    {loading ? <div className="loading-panel" role="status">A consultar pedidos, stock e localização…</div> : <>
      <section className="supplier-kpi-grid" aria-label="Indicadores operacionais">
        <article><span className="supplier-kpi-icon">↔</span><small>Pedidos activos</small><strong>{metrics.activeOrders}</strong><span>De {metrics.totalOrders} pedidos recebidos</span></article>
        <article><span className="supplier-kpi-icon">✓</span><small>Pedidos concluídos</small><strong>{metrics.completedOrders}</strong><span>Estado final comunicado pela API</span></article>
        <article><span className="supplier-kpi-icon">▤</span><small>Stock disponível</small><strong>{metrics.available}</strong><span>{metrics.reserved} unidades reservadas</span></article>
        <article className={metrics.lowStock.length ? 'alert-kpi' : ''}><span className="supplier-kpi-icon">!</span><small>Alertas de stock</small><strong>{metrics.lowStock.length}</strong><span>Itens no nível mínimo ou abaixo</span></article>
      </section>
      <div className="supplier-dashboard-grid">
        <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">PEDIDOS</span><h2>Actividade recente</h2></div><Link className="text-link" to="/fornecedor/pedidos">Ver todos →</Link></div>
          {orders.length ? <div className="supplier-live-list">{orders.slice(0, 6).map((order) => <Link className="dashboard-list-row" to={`/fornecedor/pedido/${encodeURIComponent(order.id)}`} key={order.id}><span><strong>{order.reference}</strong><small>{new Date(order.createdAt).toLocaleString('pt-AO')} · {statusLabel[order.status] ?? order.status}</small></span><strong>{formatAOA(order.pricing?.total ?? 0)}</strong></Link>)}</div> : <div className="empty-state compact"><h3>Sem pedidos neste momento</h3><p>Quando a API associar pedidos a esta empresa, aparecerão aqui.</p><Link className="secondary-btn" to="/fornecedor/pedidos">Abrir pedidos</Link></div>}
        </section>
        <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">INVENTÁRIO</span><h2>Stock a vigiar</h2></div><Link className="text-link" to="/fornecedor/stock">Gerir stock →</Link></div>
          {metrics.lowStock.length ? <div className="supplier-live-list">{metrics.lowStock.slice(0, 6).map((item) => <Link className="dashboard-list-row" to="/fornecedor/stock" key={item.id}><span><strong>{item.variant.name}</strong><small>{item.variant.sku} · mínimo {item.reorderLevel}</small></span><strong className="stock-warning-value">{item.availableQty}</strong></Link>)}</div> : <div className="empty-state compact"><h3>Sem alertas de stock</h3><p>Não há itens abaixo do nível mínimo devolvidos pela API.</p></div>}
        </section>
      </div>
      <section className="workspace-panel supplier-location-summary"><div className="supplier-location-icon">⌖</div><div className="supplier-location-summary-copy"><span className="section-kicker">LOCALIZAÇÃO OPERACIONAL</span><h2>{location?.latitude != null && location.longitude != null ? 'Localização da empresa configurada' : 'Configure a localização da empresa'}</h2><p>{location?.latitude != null && location.longitude != null ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} · usada para localizar stock e calcular a empresa candidata` : 'Ainda não há coordenadas guardadas. A localização correcta é necessária para receber pedidos da zona.'}</p></div><Link className="primary-btn" to="/fornecedor/localizacao">{location?.latitude != null && location.longitude != null ? 'Rever mapa' : 'Definir localização'}</Link></section>
      <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">ACESSO RÁPIDO</span><h2>Gestão da empresa</h2></div></div><div className="module-card-grid"><Link to="/fornecedor/stock" className="module-card"><span>ERP</span><strong>Stock</strong><small>Disponibilidade, reservado e nível mínimo.</small>→</Link><Link to="/fornecedor/pedidos" className="module-card"><span>ERP</span><strong>Pedidos</strong><small>Confirme, prepare e encaminhe pedidos.</small>→</Link><Link to="/fornecedor/perfil" className="module-card"><span>CONTA</span><strong>Perfil comercial</strong><small>Estado da conta e limites do cadastro actual.</small>→</Link><Link to="/empresa/documentos" className="module-card"><span>CONFORMIDADE</span><strong>Documentos</strong><small>Consulte documentos e pedidos de revisão.</small>→</Link><Link to="/empresa/horarios" className="module-card"><span>OPERAÇÃO</span><strong>Horários</strong><small>Configure os sete dias da semana.</small>→</Link><Link to="/fornecedor/relatorios" className="module-card"><span>ANÁLISE</span><strong>Desempenho</strong><small>Resumo derivado dos pedidos disponíveis na API.</small>→</Link></div></section>
    </>}
  </div>;
}
