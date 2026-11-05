import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { fetchSupplierExpenses, type SupplierFinanceSummary } from '../services/supplierBusiness';

export default function SupplierPayablePage() {
  const [summary, setSummary] = useState<SupplierFinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchSupplierExpenses()
      .then((data) => { if (active) setSummary(data); })
      .catch(() => { if (active) setError('Não foi possível carregar as despesas.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const items = summary?.items ?? [];

  return (
    <div className="page supplier-module-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">Financeiro</span>
          <h1>Contas a pagar.</h1>
          <p>Despesas e compras registadas como pendentes.</p>
        </div>
        <div className="heading-actions">
          <Link to="/fornecedor" className="secondary-btn">Voltar ao dashboard</Link>
        </div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <section className="workspace-panel">
        <div className="panel-title">
          <div>
            <span className="section-kicker">Despesas</span>
            <h2>Despesas pendentes</h2>
          </div>
        </div>
        {loading ? <div className="loading-panel">A carregar…</div> : items.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Referência</th>
                  <th>Valor</th>
                  <th>Estado</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.reference}</strong></td>
                    <td>{formatAOA(item.amount)}</td>
                    <td><span className="status-pill warning">{item.status}</span></td>
                    <td>{new Date(item.date).toLocaleDateString('pt-AO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <h3>Sem despesas</h3>
            <p>A API não devolveu registos de despesas para esta empresa.</p>
          </div>
        )}
        {summary && <p style={{ margin: '14px 0 0', color: 'var(--muted)', fontSize: '12px' }}>Total registado: <strong>{formatAOA(summary.total)}</strong> · Moeda {summary.currency}.</p>}
      </section>
    </div>
  );
}
