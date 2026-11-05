import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { fetchSupplierInvoices, type SupplierInvoice } from '../services/supplierBusiness';

const labels: Record<string, string> = { PENDING: 'Pendente', PAID: 'Pago', CANCELLED: 'Cancelada', RECEIVED: 'Recebida' };

export default function SupplierPurchasesPage() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const rows = await fetchSupplierInvoices();
      setInvoices(rows.filter((invoice) => invoice.type === 'PURCHASE'));
      setError('');
    } catch (e) {
      setError(extractMessage(e, 'Não foi possível carregar as compras.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const purchases = useMemo(() => invoices, [invoices]);

  return (
    <div className="page supplier-module-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">ERP / Compras</span>
          <h1>Compras e aprovisionamento.</h1>
          <p>Gerenciar aquisições de gás, botijas e acessórios.</p>
        </div>
        <div className="heading-actions">
          <Link to="/fornecedor" className="secondary-btn">Voltar ao dashboard</Link>
        </div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {loading ? <div className="loading-panel">A carregar compras…</div> : (
        <section className="workspace-panel">
          <div className="panel-title">
            <div>
              <span className="section-kicker">Compras</span>
              <h2>Aquisições registadas</h2>
            </div>
          </div>
          {purchases.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fatura</th>
                    <th>Estado</th>
                    <th>Descrição</th>
                    <th>Valor (Kz)</th>
                    <th>Emissão</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((invoice) => (
                    <tr key={invoice.id}>
                      <td><strong>{invoice.number}</strong></td>
                      <td><span className={`status-pill ${invoice.status === 'PAID' || invoice.status === 'RECEIVED' ? 'success' : 'warning'}`}>{labels[invoice.status] ?? invoice.status}</span></td>
                      <td>{invoice.description ?? '—'}</td>
                      <td><strong>{formatAOA(invoice.amount)}</strong></td>
                      <td>{new Date(invoice.issueDate).toLocaleDateString('pt-AO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>Sem compras</h3>
              <p>Não há aquisições registadas para esta empresa.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
