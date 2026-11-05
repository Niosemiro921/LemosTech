import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatAOA } from '../services/catalog';
import { fetchSupplierInventoryMovements, type SupplierStockMovement } from '../services/supplier';
import { fetchSupplierInvoices, type SupplierInvoice } from '../services/supplierBusiness';

interface AuditEntry {
  id: string;
  entity: 'STOCK' | 'INVOICE';
  action: string;
  detail: string;
  amount: number | null;
  at: string;
}

const movementLabels: Record<string, string> = { RESERVE: 'Reserva de stock', RELEASE: 'Libertação de stock', ADJUSTMENT: 'Ajuste de stock' };
const invoiceLabels: Record<string, string> = { SALE: 'Fatura de venda', PURCHASE: 'Fatura de compra' };
const statusLabels: Record<string, string> = { PENDING: 'Pendente', PAID: 'Paga', CANCELLED: 'Anulada' };

export default function SupplierAuditPage() {
  const [movements, setMovements] = useState<SupplierStockMovement[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [entity, setEntity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([fetchSupplierInventoryMovements(), fetchSupplierInvoices()])
      .then(([movementRows, invoiceRows]) => { if (!active) return; setMovements(movementRows); setInvoices(invoiceRows); })
      .catch(() => { if (active) setError('Não foi possível carregar os registos de auditoria.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const entries = useMemo<AuditEntry[]>(() => {
    const stock: AuditEntry[] = movements.map((movement) => ({
      id: `stock-${movement.id}`,
      entity: 'STOCK',
      action: movementLabels[movement.type] ?? movement.type,
      detail: `${movement.quantity > 0 ? '+' : ''}${movement.quantity} × ${movement.variantName}${movement.orderReference ? ` · ${movement.orderReference}` : ''}${movement.note ? ` · ${movement.note}` : ''}`,
      amount: null,
      at: movement.createdAt,
    }));
    const docs: AuditEntry[] = invoices.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      entity: 'INVOICE',
      action: `${invoiceLabels[invoice.type] ?? invoice.type} · ${statusLabels[invoice.status] ?? invoice.status}`,
      detail: `${invoice.number}${invoice.description ? ` · ${invoice.description}` : ''}`,
      amount: invoice.amount,
      at: invoice.issueDate,
    }));
    return [...stock, ...docs]
      .filter((entry) => !entity || entry.entity === entity)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [movements, invoices, entity]);

  return (
    <div className="page supplier-module-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">Control</span>
          <h1>Auditoria e logs.</h1>
          <p>Rastrear ações sensíveis (stock, preços, pagamentos, faturas, cauções, permissões, anulações).</p>
        </div>
        <div className="heading-actions">
          <Link to="/fornecedor" className="secondary-btn">Voltar ao dashboard</Link>
        </div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="filter-bar supplier-filter-bar">
        <select className="input" value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">Todas as entidades</option>
          <option value="STOCK">Stock</option>
          <option value="INVOICE">Faturas</option>
        </select>
      </div>
      {loading ? <div className="loading-panel">A carregar registos…</div> : (
        <section className="workspace-panel">
          <div className="panel-title">
            <div>
              <span className="section-kicker">Registos</span>
              <h2>Ações registadas</h2>
            </div>
          </div>
          {entries.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Data</th><th>Entidade</th><th>Ação</th><th>Detalhe</th><th>Valor</th></tr></thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.at).toLocaleString('pt-AO')}</td>
                      <td><span className="status-pill">{entry.entity}</span></td>
                      <td><strong>{entry.action}</strong></td>
                      <td>{entry.detail}</td>
                      <td>{entry.amount === null ? '—' : formatAOA(entry.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state"><h3>Sem registos</h3><p>Não há ações registadas para os filtros selecionados.</p></div>
          )}
        </section>
      )}
    </div>
  );
}
