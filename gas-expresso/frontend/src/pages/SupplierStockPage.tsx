import { useEffect, useState, FormEvent } from 'react';
import { extractMessage } from '../services/auth';
import { fetchSupplierInventory, updateSupplierInventory, type SupplierInventoryItem } from '../services/supplier';
import { fetchSupplierDashboard } from '../services/supplierBusiness';
import { formatAOA, fetchGasProducts } from '../services/catalog';

type Dashboard = { inventoryUnits: number; sales: number; orders: number; lowStock: number; pendingInvoices: number; currency: string; monthlySales?: Array<{ month: string; amount: number }> };

export default function SupplierStockPage() {
  const [items, setItems] = useState<SupplierInventoryItem[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newVariant, setNewVariant] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newNote, setNewNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [variants, setVariants] = useState<Array<{ id: string; label: string; description: string; price: number }>>([]);

  async function load() {
    setLoading(true);
    try {
      const [data, d, catalog] = await Promise.all([fetchSupplierInventory(), fetchSupplierDashboard(), fetchGasProducts()]);
      setItems(data);
      setValues(Object.fromEntries(data.map(i => [i.variantId, String(i.availableQty)])));
      setDash(d as unknown as Dashboard);
      setVariants(catalog.map(p => ({ id: p.id, label: p.label, description: p.description, price: p.price })));
      setError('');
    } catch (e) {
      setError(extractMessage(e, 'Não foi possível carregar o stock.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function save(item: SupplierInventoryItem) {
    const availableQty = Number(values[item.variantId]);
    if (!Number.isInteger(availableQty) || availableQty < item.reservedQty) {
      setError('A quantidade disponível deve ser inteira e não pode ficar abaixo do stock reservado.');
      return;
    }
    setBusy(item.variantId);
    setError('');
    try {
      await updateSupplierInventory(item.variantId, availableQty, item.reorderLevel);
      await load();
    } catch (e) {
      setError(extractMessage(e, 'Não foi possível atualizar o stock.'));
    } finally {
      setBusy(null);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const qty = Number(newQty);
    const selectedVariant = variants.find(v => v.id === newVariant);
    if (!newVariant) { setError('Selecione uma variante válida do catálogo.'); return; }
    if (!selectedVariant) { setError('Variante não encontrada no catálogo.'); return; }
    if (!Number.isInteger(qty) || qty < 0) { setError('A quantidade deve ser um número inteiro positivo.'); return; }
    setCreating(true); setError('');
    try {
      const existing = items.find(i => i.variantId === newVariant);
      const targetQty = existing ? existing.availableQty + qty : qty;
      const reorderLevel = existing ? existing.reorderLevel : 5;
      const note = newNote.trim() || (existing ? `Entrada de ${qty} unidade(s).` : `Entrada inicial de ${qty} unidade(s).`);
      await updateSupplierInventory(newVariant, targetQty, reorderLevel, note);
      setNewVariant(''); setNewQty(''); setNewNote(''); setShowCreate(false);
      await load();
    } catch (e) {
      setError(extractMessage(e, 'Não foi possível criar o item de stock. Verifique se a variante existe.'));
    } finally {
      setCreating(false);
    }
  }

  const totalAvailable = items.reduce((s, i) => s + i.availableQty, 0);
  const totalReserved = items.reduce((s, i) => s + i.reservedQty, 0);
  const totalValue = items.reduce((s, i) => s + i.availableQty * i.variant.unitPrice, 0);
  const monthlyEstimate = dash?.monthlySales?.slice(-1)?.[0]?.amount ?? dash?.sales ?? 0;

  return (
    <div className="page workspace-page supplier-module-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">ERP / Stock</span>
          <h1>Stock operacional.</h1>
          <p>O fornecedor controla disponibilidade, entrada e saída de produtos. Registe novas entradas e veja o que sobrou.</p>
        </div>
        <button className="secondary-btn" onClick={() => void load()} disabled={loading}>Atualizar</button>
        <button className="primary-btn" onClick={() => setShowCreate(s => !s)}>
          {showCreate ? 'Cancelar' : 'Criar / Registar item'}
        </button>
      </div>

      {showCreate && (
        <section className="workspace-panel" style={{ marginBottom: '1.5rem' }}>
          <h3>Criar / Registar item de stock</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'end' }}>
            <div>
              <label htmlFor="new-variant">Produto / Variante <small>(obrigatório)</small></label>
              <select id="new-variant" className="input" value={newVariant} onChange={e => setNewVariant(e.target.value)} required>
                <option value="">Selecione...</option>
                {variants.map(v => <option key={v.id} value={v.id}>{v.label} — {v.description || '—'} ({formatAOA(v.price)})</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="new-qty">Quantidade de entrada</label>
              <input id="new-qty" className="input" type="number" min="0" step="1" value={newQty} onChange={e => setNewQty(e.target.value)} placeholder="0" required />
            </div>
            <div>
              <label htmlFor="new-note">Nota (motivo)</label>
              <input id="new-note" className="input" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Entrada de produto..." />
            </div>
            <button className="primary-btn" type="submit" disabled={creating}>{creating ? 'A guardar...' : 'Registar entrada'}</button>
          </form>
        </section>
      )}

      {error && <div className="form-error" role="alert"><strong>Erro:</strong> {error}</div>}

      {loading ? <div className="loading-panel">A carregar inventário…</div> : items.length ? (
        <>
          <section className="workspace-panel">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Produto</th><th>SKU</th><th>Disponível</th><th>Reservado</th><th>Mínimo</th><th>Preço unitário</th><th>Acção</th></tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td><strong>{item.variant.name}</strong></td>
                      <td>{item.variant.sku}</td>
                      <td>
                        <input className="table-number-input" type="number" min={item.reservedQty}
                          value={values[item.variantId] ?? item.availableQty}
                          onChange={e => setValues(v => ({ ...v, [item.variantId]: e.target.value }))} />
                      </td>
                      <td>{item.reservedQty}</td>
                      <td>{item.reorderLevel}</td>
                      <td>{formatAOA(item.variant.unitPrice)}</td>
                      <td>
                        <button className="tiny-btn" disabled={busy === item.variantId} onClick={() => void save(item)}>
                          {busy === item.variantId ? 'A guardar…' : 'Guardar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="workspace-panel" style={{ marginTop: '1.5rem' }}>
            <h3>Relatório de stock — o que sobrou</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
              <article><small>Itens no inventário</small><strong>{items.length}</strong><span>Produtos registados</span></article>
              <article><small>Disponível (total)</small><strong>{totalAvailable}</strong><span>Unidades em armazém</span></article>
              <article><small>Reservado</small><strong>{totalReserved}</strong><span>Associadas a pedidos</span></article>
              <article><small>Valor em stock</small><strong>{formatAOA(totalValue)}</strong><span>Estimativa pelo preço unitário</span></article>
              <article><small>Vendas / mês (aprox.)</small><strong>{formatAOA(monthlyEstimate)}</strong><span>Com base nos últimos dados</span></article>
            </div>
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fcf6', borderRadius: '8px' }}>
              <strong>Nota:</strong> Quando os produtos saem (pedidos entregues), a quantidade disponível reduz automaticamente. O valor mensal é uma estimativa baseada nas vendas registadas no painel do fornecedor.
            </div>
          </section>
        </>
      ) : (
        <div className="empty-state">
          <h2>Stock vazio</h2>
          <p>A API não devolveu produtos para esta empresa. Use o botão <strong>Criar / Registar item</strong> acima para adicionar o primeiro produto.</p>
        </div>
      )}
    </div>
  );
}
