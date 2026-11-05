import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { fetchSupplierOrders, type SupplierOrder } from '../services/supplier';

const deliveryLabels: Record<string, string> = {
  AWAITING_SUPPLIER_ACCEPTANCE: 'Novo',
  SUPPLIER_ACCEPTED: 'Aceite',
  PREPARING: 'Em preparação',
  READY_FOR_PICKUP: 'Pronto para recolha',
  DRIVER_SEARCHING: 'A procurar entregador',
  DRIVER_ASSIGNED: 'Entregador atribuído',
  DRIVER_ACCEPTED: 'Entregador atribuído',
  TO_PICKUP: 'A caminho',
  AT_PICKUP: 'Na empresa',
  PICKED_UP: 'Recolhido',
  IN_TRANSIT: 'Em trânsito',
  ARRIVED: 'Chegou',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

const deliveryStatuses = [
  'PREPARING',
  'READY_FOR_PICKUP',
  'DRIVER_SEARCHING',
  'DRIVER_ASSIGNED',
  'DRIVER_ACCEPTED',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED',
  'DELIVERED',
  'COMPLETED',
];

export default function SupplierDeliveriesPage() {
  const [items, setItems] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchSupplierOrders()
      .then((data) => { if (active) setItems(data); })
      .catch(() => { if (active) setError('Não foi possível carregar as entregas.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const deliveries = useMemo(() => items.filter((order) => deliveryStatuses.includes(order.status)), [items]);

  return (
    <div className="page supplier-module-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">ERP / Entregas</span>
          <h1>Entregas e logística.</h1>
          <p>Acompanhar preparação e entrega dos pedidos da empresa.</p>
        </div>
        <div className="heading-actions">
          <Link to="/fornecedor" className="secondary-btn">Voltar ao dashboard</Link>
        </div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {loading ? <div className="loading-panel">A carregar entregas…</div> : (
        <section className="workspace-panel">
          <div className="panel-title">
            <div>
              <span className="section-kicker">Entregas</span>
              <h2>Entregas e pedidos em curso</h2>
            </div>
          </div>
          {deliveries.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Referência</th>
                    <th>Estado</th>
                    <th>Artigos</th>
                    <th>Morada de entrega</th>
                    <th>Valor (Kz)</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((order) => (
                    <tr key={order.id}>
                      <td><Link className="link" to={`/fornecedor/pedido/${encodeURIComponent(order.id)}`}><strong>{order.reference}</strong></Link></td>
                      <td><span className={`status-pill ${order.status === 'DELIVERED' || order.status === 'COMPLETED' ? 'success' : order.status === 'CANCELLED' ? 'danger' : 'warning'}`}>{deliveryLabels[order.status] ?? order.status}</span></td>
                      <td>{order.items.map((item) => `${item.quantity} × ${item.variantName}`).join(', ')}</td>
                      <td>{order.deliveryAddress}</td>
                      <td><strong>{formatAOA(order.pricing.total)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>Sem entregas</h3>
              <p>A API não devolveu pedidos em fase de entrega para esta empresa.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
