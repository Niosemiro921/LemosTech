import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { createSupplierInvoice, fetchSupplierInvoices, type SupplierInvoice } from '../services/supplierBusiness';

const typeLabels: Record<string, string> = { SALE: 'Venda', PURCHASE: 'Compra' };
const statusLabels: Record<string, string> = { PENDING: 'Pendente', PAID: 'Pago', CANCELLED: 'Cancelada' };

export default function SupplierInvoicesPage() {
  const [items, setItems] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [q, setQ] = useState('');
  const [form, setForm] = useState({
    number: '',
    type: 'SALE' as 'SALE' | 'PURCHASE',
    amount: '',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    description: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      setItems(await fetchSupplierInvoices());
      setError('');
    } catch (e) {
      setError(extractMessage(e, 'Não foi possível carregar os documentos.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(
    () => items.filter((item) => (!typeFilter || item.type === typeFilter) && (!q || `${item.number} ${item.description ?? ''}`.toLowerCase().includes(q.toLowerCase()))),
    [items, typeFilter, q],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createSupplierInvoice({
        number: form.number,
        type: form.type,
        amount: Number(form.amount),
        issueDate: new Date(form.issueDate).toISOString(),
        ...(form.dueDate ? { dueDate: new Date(form.dueDate).toISOString() } : {}),
        ...(form.description ? { description: form.description } : {}),
      });
      setForm((current) => ({ ...current, number: '', amount: '', description: '' }));
      await load();
    } catch (e) {
      setError(extractMessage(e, 'Não foi possível registar o documento.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page supplier-module-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">ERP / Faturação</span>
          <h1>Faturação e documentos.</h1>
          <p>Gerenciamento documental comercial: faturas, recibos, notas de crédito/débito e guias.</p>
        </div>
        <div className="heading-actions">
          <Link to="/fornecedor" className="secondary-btn">Voltar ao dashboard</Link>
        </div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="workspace-grid two-col">
        <section className="workspace-panel">
          <div className="panel-title"><h2>Registar documento</h2></div>
          <form className="form-grid" onSubmit={submit}>
            <div className="field"><label>Número</label><input className="input" value={form.number} onChange={(e) => setForm((x) => ({ ...x, number: e.target.value }))} required /></div>
            <div className="field"><label>Tipo</label><select className="input" value={form.type} onChange={(e) => setForm((x) => ({ ...x, type: e.target.value as 'SALE' | 'PURCHASE' }))}><option value="SALE">Venda</option><option value="PURCHASE">Compra</option></select></div>
            <div className="field"><label>Valor (Kz)</label><input className="input" inputMode="numeric" value={form.amount} onChange={(e) => setForm((x) => ({ ...x, amount: e.target.value.replace(/\D/g, '') }))} required /></div>
            <div className="field"><label>Emissão</label><input className="input" type="date" value={form.issueDate} onChange={(e) => setForm((x) => ({ ...x, issueDate: e.target.value }))} /></div>
            <div className="field"><label>Vencimento</label><input className="input" type="date" value={form.dueDate} onChange={(e) => setForm((x) => ({ ...x, dueDate: e.target.value }))} /></div>
            <div className="field full-field"><label>Descrição</label><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm((x) => ({ ...x, description: e.target.value }))} /></div>
            <button className="primary-btn" disabled={saving}>{saving ? 'A guardar…' : 'Registar documento'}</button>
          </form>
        </section>
        <section className="workspace-panel">
          <div className="panel-title"><h2>Documentos emitidos</h2></div>
          <div className="filter-bar supplier-filter-bar" style={{ marginBottom: '0.75rem' }}>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar número ou descrição" />
            <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Todos os tipos</option>
              <option value="SALE">Venda</option>
              <option value="PURCHASE">Compra</option>
            </select>
          </div>
          {loading ? <div className="loading-panel">A carregar…</div> : filtered.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Número</th><th>Tipo</th><th>Valor</th><th>Estado</th><th>Emissão</th></tr></thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.number}</strong>{item.description && <small className="table-sub">{item.description}</small>}</td>
                      <td>{typeLabels[item.type] ?? item.type}</td>
                      <td><strong>{formatAOA(item.amount)}</strong></td>
                      <td><span className={`status-pill ${item.status === 'PAID' ? 'success' : item.status === 'CANCELLED' ? 'danger' : 'warning'}`}>{statusLabels[item.status] ?? item.status}</span></td>
                      <td>{new Date(item.issueDate).toLocaleDateString('pt-AO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state"><h3>Sem documentos</h3><p>Nenhum documento foi devolvido pela API.</p></div>
          )}
        </section>
      </div>
    </div>
  );
}
