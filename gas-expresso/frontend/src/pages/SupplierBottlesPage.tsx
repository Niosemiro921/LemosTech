import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { fetchSupplierInventory, fetchSupplierInventoryMovements, type SupplierInventoryItem, type SupplierStockMovement } from '../services/supplier';

export default function SupplierBottlesPage() {
  const [items, setItems] = useState<SupplierInventoryItem[]>([]);
  const [movements, setMovements] = useState<SupplierStockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([fetchSupplierInventory(), fetchSupplierInventoryMovements()])
      .then(([inventory, movementRows]) => { if (active) { setItems(inventory); setMovements(movementRows); } })
      .catch(() => { if (active) setError('Não foi possível carregar o controlo de botijas.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="page supplier-module-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">ERP / Botijas</span>
          <h1>Gestão especializada de botijas de gás.</h1>
          <p>Controlar estado, rastreamento e movimento do recipiente físico por número de série.</p>
        </div>
        <div className="heading-actions">
          <Link to="/fornecedor" className="secondary-btn">Voltar ao dashboard</Link>
        </div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {loading ? <div className="loading-panel">A carregar botijas…</div> : (
        <>
          <section className="workspace-panel">
            <div className="panel-title">
              <div>
                <span className="section-kicker">Stock</span>
                <h2>Recipientes e quantidades disponíveis</h2>
              </div>
            </div>
            {items.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Disponível</th>
                      <th>Reservado</th>
                      <th>Nível mínimo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.variant?.name ?? item.variantId}</strong><small className="table-sub">{item.variant?.sku ?? item.variantId}</small></td>
                        <td>{item.availableQty}</td>
                        <td>{item.reservedQty}</td>
                        <td>{item.reorderLevel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <h3>Sem botijas registadas</h3>
                <p>A API não devolveu stock de botijas para esta empresa.</p>
              </div>
            )}
          </section>
          <section className="workspace-panel" style={{ marginTop: '1.5rem' }}>
            <div className="panel-title">
              <div>
                <span className="section-kicker">Movimentos</span>
                <h2>Rastreio e movimentos de stock</h2>
              </div>
            </div>
            {movements.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Quantidade</th>
                      <th>Referência</th>
                      <th>Produto</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id}>
                        <td><span className="status-pill">{movement.type}</span></td>
                        <td>{movement.quantity}</td>
                        <td>{movement.orderReference ?? '—'}</td>
                        <td>{movement.variantName}</td>
                        <td>{new Date(movement.createdAt).toLocaleString('pt-AO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <h3>Sem movimentos</h3>
                <p>A API não devolveu movimentos de stock para esta empresa.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
