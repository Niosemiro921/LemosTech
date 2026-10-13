import { useEffect, useMemo, useState } from 'react';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { fetchSupplierInventory, updateSupplierInventory, type SupplierInventoryItem } from '../services/supplier';

export default function SupplierStockPage() {
  const [items, setItems] = useState<SupplierInventoryItem[]>([]);
  const [values, setValues] = useState<Record<string, { available: string; minimum: string; note: string }>>({});
  const [query, setQuery] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await fetchSupplierInventory();
      setItems(data);
      setValues(Object.fromEntries(data.map((item) => [item.variantId, { available: String(item.availableQty), minimum: String(item.reorderLevel), note: '' }])));
      setError('');
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível carregar o stock.'));
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => items.filter((item) => {
    const matchesQuery = `${item.variant.name} ${item.variant.sku} ${item.variant.product?.name ?? ''}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (!lowOnly || item.availableQty <= item.reorderLevel);
  }), [items, query, lowOnly]);
  const lowStock = items.filter((item) => item.availableQty <= item.reorderLevel).length;
  const totalAvailable = items.reduce((sum, item) => sum + item.availableQty, 0);
  const totalReserved = items.reduce((sum, item) => sum + item.reservedQty, 0);

  function edit(variantId: string, key: 'available' | 'minimum' | 'note', value: string) {
    setValues((current) => ({ ...current, [variantId]: { ...(current[variantId] ?? { available: '', minimum: '', note: '' }), [key]: value } }));
    setSuccess('');
  }

  async function save(item: SupplierInventoryItem) {
    const value = values[item.variantId] ?? { available: String(item.availableQty), minimum: String(item.reorderLevel), note: '' };
    const availableQty = Number(value.available);
    const reorderLevel = Number(value.minimum);
    if (!Number.isInteger(availableQty) || availableQty < item.reservedQty) { setError(`O stock disponível de ${item.variant.name} deve ser um inteiro e não pode ser inferior às ${item.reservedQty} unidades reservadas.`); return; }
    if (!Number.isInteger(reorderLevel) || reorderLevel < 0) { setError('O nível mínimo deve ser um número inteiro igual ou superior a zero.'); return; }
    if (availableQty !== item.availableQty && value.note.trim().length < 3) { setError('Indique o motivo para alterar a quantidade de stock.'); return; }
    setBusy(item.variantId); setError(''); setSuccess('');
    try {
      await updateSupplierInventory(item.variantId, availableQty, reorderLevel, value.note);
      setSuccess(`Stock de ${item.variant.name} actualizado.`);
      await load();
    } catch (cause) { setError(extractMessage(cause, 'Não foi possível actualizar o stock.')); }
    finally { setBusy(null); }
  }

  return <div className="supplier-module-page page">
    <header className="workspace-heading"><div><span className="section-kicker">ERP · INVENTÁRIO</span><h1>Stock operacional</h1><p>Actualize quantidades e níveis mínimos. As reservas de pedidos são protegidas pelo servidor.</p></div><button className="secondary-btn" onClick={() => void load()} disabled={loading}>↻ Actualizar</button></header>
    {error && <div className="form-error" role="alert">{error}</div>}{success && <div className="success-alert" role="status">{success}</div>}
    {loading ? <div className="loading-panel" role="status">A carregar inventário da empresa…</div> : <>
      <div className="supplier-kpi-grid supplier-stock-metrics"><article><small>Referências de produto</small><strong>{items.length}</strong><span>Variações devolvidas pela API</span></article><article><small>Unidades disponíveis</small><strong>{totalAvailable}</strong><span>Saldo operacional de stock</span></article><article><small>Unidades reservadas</small><strong>{totalReserved}</strong><span>Associadas a pedidos em curso</span></article><article className={lowStock ? 'alert-kpi' : ''}><small>Alertas de stock</small><strong>{lowStock}</strong><span>Disponível ≤ nível mínimo</span></article></div>
      <section className="workspace-panel"><div className="supplier-filter-tools"><label className="supplier-search-field"><span>Pesquisar produto</span><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou SKU" /></label><label className="supplier-checkbox-filter"><input type="checkbox" checked={lowOnly} onChange={(event) => setLowOnly(event.target.checked)}/> Mostrar apenas alertas de stock</label></div>
      {filtered.length ? <div className="supplier-stock-list">{filtered.map((item) => { const value = values[item.variantId] ?? { available: String(item.availableQty), minimum: String(item.reorderLevel), note: '' }; const changed = Number(value.available) !== item.availableQty || Number(value.minimum) !== item.reorderLevel; const low = item.availableQty <= item.reorderLevel; return <article className="supplier-stock-row" key={item.id}>
        <div className="supplier-stock-product"><div className="supplier-stock-product-icon">{item.variant.weightKg}kg</div><div><strong>{item.variant.name}</strong><small>{item.variant.product?.name || 'GPL'} · SKU {item.variant.sku}</small><span className={`status-pill ${low ? 'warning' : 'success'}`}>{low ? 'Stock baixo' : 'Disponível'}</span></div></div>
        <div className="supplier-stock-field"><label htmlFor={`available-${item.variantId}`}>Disponível</label><input id={`available-${item.variantId}`} className="input" type="number" min={item.reservedQty} step="1" value={value.available} onChange={(event) => edit(item.variantId, 'available', event.target.value)} /><small>{item.reservedQty} reservadas</small></div>
        <div className="supplier-stock-field"><label htmlFor={`minimum-${item.variantId}`}>Alerta mínimo</label><input id={`minimum-${item.variantId}`} className="input" type="number" min="0" step="1" value={value.minimum} onChange={(event) => edit(item.variantId, 'minimum', event.target.value)} /><small>Preço: {formatAOA(item.variant.unitPrice)}</small></div>
        <div className="supplier-stock-action"><label htmlFor={`note-${item.variantId}`}>Motivo do ajuste</label><input id={`note-${item.variantId}`} className="input" value={value.note} onChange={(event) => edit(item.variantId, 'note', event.target.value)} placeholder="Obrigatório se mudar a quantidade" /><button className="primary-btn small" disabled={!changed || busy === item.variantId} onClick={() => void save(item)}>{busy === item.variantId ? 'A guardar…' : 'Guardar alteração'}</button></div>
      </article>; })}</div> : <div className="empty-state"><h2>{items.length ? 'Nenhum resultado' : 'Ainda sem inventário'}</h2><p>{items.length ? 'Altere a pesquisa ou desactive o filtro de alertas.' : 'O inventário desta empresa ainda não contém referências. O cadastro inicial de inventário de produtos deve ser feito pela operação autorizada.'}</p></div>}
      <div className="supplier-api-note"><strong>Histórico de movimentos</strong><p>O backend regista os ajustes feitos nesta página, mas ainda não expõe um endpoint de consulta ao livro de movimentos. O histórico não é simulado e será apresentado quando existir essa API.</p></div>
      </section>
    </>}
  </div>;
}
