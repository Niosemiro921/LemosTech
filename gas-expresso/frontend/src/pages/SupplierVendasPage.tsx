import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { fetchSupplierOrders, type SupplierOrder } from '../services/supplier';
import { fetchSupplierCustomers, fetchSupplierInteractions } from '../services/supplierBusiness';

interface SupplierInteraction {
  id: string;
  customerId: string;
  type: string;
  subject: string;
  message: string;
  nextActionAt?: string | null;
  createdAt: string;
  customer?: { customer: { fullName: string } | null; phone?: string } | null;
}

export default function SupplierVendasPage() {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [interactions, setInteractions] = useState<SupplierInteraction[]>([]);
  const [customers, setCustomers] = useState<Array<{ customerId: string; name: string; totalSpent: number; totalOrders: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([fetchSupplierOrders(), fetchSupplierInteractions(), fetchSupplierCustomers()])
      .then(([orderRows, interactionRows, customerRows]) => {
        if (!active) return;
        setOrders(orderRows);
        setInteractions(interactionRows);
        setCustomers(customerRows);
      })
      .catch(() => { if (active) setError('Não foi possível carregar as vendas.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const labels: Record<string, string> = { AWAITING_SUPPLIER_ACCEPTANCE: 'Novo', SUPPLIER_ACCEPTED: 'Aceite', PREPARING: 'Em preparação', READY_FOR_PICKUP: 'Pronto para recolha', DRIVER_SEARCHING: 'A procurar entregador', DRIVER_ACCEPTED: 'Entregador atribuído', TO_PICKUP: 'A caminho', AT_PICKUP: 'Na empresa', PICKED_UP: 'Recolhido', IN_TRANSIT: 'Em trânsito', ARRIVED: 'Chegou', DELIVERED: 'Entregue', COMPLETED: 'Concluído', CANCELLED: 'Cancelado' };

  return (
    <div className="page supplier-module-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">CRM / Vendas</span>
          <h1>Vendas.</h1>
          <p>Gerenciar vendas manuais e interagir com clientes.</p>
        </div>
        <div className="heading-actions">
          <Link to="/fornecedor" className="secondary-btn">Voltar ao dashboard</Link>
        </div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {loading ? <div className="loading-panel">A carregar vendas…</div> : (
        <>
          <section className="workspace-panel">
            <div className="panel-title">
              <div>
                <span className="section-kicker">Vendas</span>
                <h2>Pedidos de venda</h2>
              </div>
            </div>
            {orders.length ? (
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
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td><strong>{order.reference}</strong></td>
                        <td><span className={`status-pill ${order.status === 'DELIVERED' || order.status === 'COMPLETED' ? 'success' : order.status === 'CANCELLED' ? 'danger' : 'warning'}`}>{labels[order.status] ?? order.status}</span></td>
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
                <h3>Sem vendas</h3>
                <p>A API não devolveu pedidos de venda para esta empresa.</p>
              </div>
            )}
          </section>
          <section className="workspace-panel" style={{ marginTop: '1.5rem' }}>
            <div className="panel-title">
              <div>
                <span className="section-kicker">Interação</span>
                <h2>Clientes e interações</h2>
              </div>
            </div>
            {customers.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Interações</th>
                      <th>Compras</th>
                      <th>Total gasto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.customerId}>
                        <td><strong>{customer.name}</strong></td>
                        <td>{interactions.filter((interaction) => interaction.customerId === customer.customerId).length}</td>
                        <td>{customer.totalOrders}</td>
                        <td><strong>{formatAOA(customer.totalSpent)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <h3>Sem clientes</h3>
                <p>A API não devolveu clientes para esta empresa.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
