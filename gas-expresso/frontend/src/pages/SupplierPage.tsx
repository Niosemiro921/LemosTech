import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { inventory as seedInventory, statusLabels, supplierOrders as seedOrders, SupplierOrderStatus } from '../services/supplier';

const nextStatus: Partial<Record<SupplierOrderStatus, SupplierOrderStatus>> = {
  new: 'accepted',
  accepted: 'preparing',
  preparing: 'ready',
  ready: 'collected',
};

export default function SupplierPage() {
  const [orders, setOrders] = useState(seedOrders);
  const inventory = seedInventory;
  const [tab, setTab] = useState<'overview' | 'orders' | 'stock'>('overview');

  const metrics = useMemo(() => ({
    newOrders: orders.filter((order) => order.status === 'new').length,
    preparing: orders.filter((order) => order.status === 'preparing' || order.status === 'accepted').length,
    ready: orders.filter((order) => order.status === 'ready').length,
    today: orders.reduce((sum, order) => sum + order.supplierNet, 0),
  }), [orders]);

  const advanceOrder = (id: string) => {
    setOrders((current) => current.map((order) => {
      if (order.id !== id) return order;
      return { ...order, status: nextStatus[order.status] ?? order.status };
    }));
  };

  return (
    <div className="page supplier-page">
      <div className="supplier-topbar">
        <div>
          <span className="section-kicker">Painel do fornecedor</span>
          <h1>Central de operações.</h1>
          <p>Receba pedidos, controle o stock e prepare cada botija para recolha.</p>
        </div>
        <div className="supplier-status"><span className="status-dot" /> Operação ativa</div>
      </div>

      <div className="supplier-metrics">
        <article><small>Pedidos novos</small><strong>{metrics.newOrders}</strong><span>aguardando aceitação</span></article>
        <article><small>Em preparação</small><strong>{metrics.preparing}</strong><span>em operação</span></article>
        <article><small>Prontos para recolha</small><strong>{metrics.ready}</strong><span>aguardando entregador</span></article>
        <article><small>Valor dos pedidos</small><strong>{metrics.today.toLocaleString('pt-AO')} Kz</strong><span>carteira operacional</span></article>
      </div>

      <div className="supplier-tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Visão geral</button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Pedidos</button>
        <button className={tab === 'stock' ? 'active' : ''} onClick={() => setTab('stock')}>Stock</button>
      </div>

      {tab !== 'stock' && (
        <section className="supplier-panel">
          <div className="supplier-panel-head">
            <div><span className="section-kicker">Fila de pedidos</span><h2>Pedidos que precisam de ação</h2></div>
            <button className="secondary-btn" onClick={() => setTab('orders')}>Ver todos</button>
          </div>

          <div className="supplier-orders">
            {orders.map((order) => (
              <article className="supplier-order" key={order.id}>
                <div className="supplier-order-main">
                  <div className="supplier-order-badge">{order.productName.replace('Botija ', '')}</div>
                  <div>
                    <span className="supplier-order-id">Pedido #{order.id} · {order.requestedAt}</span>
                    <h3>{order.quantity} × {order.productName}</h3>
                    <p>Entrega em <strong>{order.customerArea}</strong> · {order.distanceKm} km</p>
                  </div>
                </div>
                <div className="supplier-order-side">
                  <span className={`status-pill ${order.status === 'ready' ? 'success' : ''}`}>{statusLabels[order.status]}</span>
                  <strong>{order.supplierNet.toLocaleString('pt-AO')} Kz</strong>
                  {order.status !== 'collected' && <Link className="primary-btn small" to={`/supplier/pedido/${order.id}`}>Abrir pedido</Link>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab !== 'orders' && (
        <section className="supplier-panel">
          <div className="supplier-panel-head">
            <div><span className="section-kicker">Inventário</span><h2>Stock por capacidade</h2></div>
            <button className="secondary-btn" onClick={() => setTab('stock')}>Gerir stock</button>
          </div>
          <div className="supplier-stock-grid">
            {inventory.map((item) => {
              const total = item.available + item.reserved;
              const percent = Math.min(100, Math.round((item.available / Math.max(total, 1)) * 100));
              const low = item.available <= item.reorderPoint;
              return (
                <article className="supplier-stock-card" key={item.sku}>
                  <div className="stock-card-head"><div><span className="supplier-order-id">{item.sku}</span><h3>{item.name}</h3></div><span className={`status-pill ${low ? 'warning' : 'success'}`}>{low ? 'Stock baixo' : 'Disponível'}</span></div>
                  <div className="stock-number"><strong>{item.available}</strong><span>disponíveis</span></div>
                  <div className="stock-bar"><span style={{ width: `${percent}%` }} /></div>
                  <div className="stock-meta"><span>Reservado {item.reserved}</span><span>Repor em {item.reorderPoint}</span></div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="supplier-footer-card">
        <div><span className="section-kicker">Operação Gás Expresso</span><strong>O entregador só recebe o pedido depois de o fornecedor confirmar a preparação.</strong><p>Isso mantém o stock e o dispatch sincronizados.</p></div>
        <Link to="/driver" className="secondary-btn">Ver fluxo do entregador</Link>
      </section>
    </div>
  );
}
