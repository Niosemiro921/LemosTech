import { useEffect, useState, FormEvent } from 'react';
import { extractMessage } from '../services/auth';
import { fetchSupplierInventory, updateSupplierInventory, fetchSupplierInventoryMovements, type SupplierInventoryItem, type SupplierStockMovement } from '../services/supplier';
import { fetchSupplierOrders, type SupplierOrder } from '../services/supplier';
import { fetchSupplierDashboard } from '../services/supplierBusiness';
import { formatAOA, fetchGasProducts } from '../services/catalog';

type Dashboard = { inventoryUnits: number; sales: number; orders: number; lowStock: number; pendingInvoices: number; currency: string; monthlySales?: Array<{ month: string; amount: number }> };
type DeliveryStatus = 'COMPLETED' | 'DELIVERED';
const deliveryStatusLabels: Record<string, string> = { COMPLETED: 'Entregue', DELIVERED: 'Entregue', DELIVERING: 'Entregando', DELIVERY_PENDING: 'Em entrega' };
const deliveryStatusClass: Record<string, string> = { COMPLETED: 'active', DELIVERED: 'active', DELIVERING: 'ok', DELIVERY_PENDING: 'pending' };

const movementLabels: Record<string, string> = { RESERVE: 'Reserva (pedido)', RELEASE: 'Saída (entrega)', ADJUSTMENT: 'Ajuste manual' };
const movementColors: Record<string, { bg: string; fg: string }> = {
  RESERVE: { bg: '#e7f0ff', fg: '#1d4ed8' },
  RELEASE: { bg: '#fdecec', fg: '#b91c1c' },
  ADJUSTMENT: { bg: '#eef6e4', fg: '#3f6212' },
};

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
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [movements, setMovements] = useState<SupplierStockMovement[]>([]);
  const [applying, setApplying] = useState(false);
  const deliveredOrders = orders.filter(o => o.status === 'COMPLETED' || o.status === 'DELIVERED');

  async function load() {
    setLoading(true);
    try {
      const [data, d, ords, movs] = await Promise.all([
        fetchSupplierInventory(),
        fetchSupplierDashboard(),
        fetchSupplierOrders().catch(() => [] as SupplierOrder[]),
        fetchSupplierInventoryMovements().catch(() => [] as SupplierStockMovement[]),
      ]);
      setItems(data);
      setValues(Object.fromEntries(data.map(i => [i.variantId, String(i.availableQty)])));
      setDash(d as unknown as Dashboard);
      setOrders(ords);
      setMovements(movs);
      setError('');
    } catch (e) {
      setError(extractMessage(e, 'Não foi possível carregar o stock.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalog = await fetchGasProducts();
        if (!cancelled) setVariants(catalog.map(p => ({ id: p.id, label: p.label, description: p.description, price: p.price })));
      } catch {
        // catálogo pode falhar — não bloqueia o inventário
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
    const variantId = newVariant.trim();
    if (!variantId) { setError('Selecione ou indique a variante do produto.'); return; }
    if (variants.length > 0 && !variants.some(v => v.id === variantId)) { setError('Variante não encontrada no catálogo.'); return; }
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(variantId)) { setError('Identificador de variante inválido. Selecione no catálogo ou copie o UUID completo do produto.'); return; }
    if (!Number.isInteger(qty) || qty < 0) { setError('A quantidade deve ser um número inteiro positivo.'); return; }
    setCreating(true); setError('');
    try {
      const existing = items.find(i => i.variantId === variantId);
      const targetQty = existing ? existing.availableQty + qty : qty;
      const reorderLevel = existing ? existing.reorderLevel : 5;
      const note = newNote.trim() || (existing ? `Entrada de ${qty} unidade(s).` : `Entrada inicial de ${qty} unidade(s).`);
      await updateSupplierInventory(variantId, targetQty, reorderLevel, note);
      setNewVariant(''); setNewQty(''); setNewNote(''); setShowCreate(false);
      await load();
    } catch (e) {
      setError(extractMessage(e, 'Não foi possível criar o item de stock. Verifique se a variante existe.'));
    } finally {
      setCreating(false);
    }
  }

  async function applyDeliveries() {
    setApplying(true); setError('');
    try {
      const delivered = deliveredOrders;
      if (!delivered.length) { setError('Nenhuma entrega recente para aplicar.'); setApplying(false); return; }
      const totals = new Map<string, number>();
      for (const o of delivered) {
        for (const it of (o.items ?? [])) {
          const match = items.find(i => i.variant.name === it.variantName || i.variant.sku === it.variantName);
          if (match) totals.set(match.variantId, (totals.get(match.variantId) ?? 0) + (it.quantity ?? 0));
        }
      }
      for (const [variantId, qty] of totals) {
        const item = items.find(i => i.variantId === variantId);
        if (!item) continue;
        const newQty = Math.max(0, item.availableQty - qty);
        await updateSupplierInventory(variantId, newQty, item.reorderLevel, 'Saída confirmada por entrega.');
      }
      await load();
    } catch (e) {
      setError(extractMessage(e, 'Não foi possível aplicar saídas. Verifique se o stock está consistente.'));
    } finally {
      setApplying(false);
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
              {variants.length > 0 ? (
                <select id="new-variant" className="input" value={newVariant} onChange={e => setNewVariant(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {variants.map(v => <option key={v.id} value={v.id}>{v.label} — {v.description || '—'} ({formatAOA(v.price)})</option>)}
                </select>
              ) : (
                <>
                  <input id="new-variant" className="input" value={newVariant} onChange={e => setNewVariant(e.target.value)} placeholder="UUID da variante (ex: 550e8400-...)" required />
                  <small style={{ color: '#777' }}>Catálogo não carregado — insira o UUID direto do produto.</small>
                </>
              )}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Itens no inventário', value: String(items.length), desc: 'Produtos registados' },
                { label: 'Disponível (total)', value: String(totalAvailable), desc: 'Unidades em armazém' },
                { label: 'Reservado', value: String(totalReserved), desc: 'Associadas a pedidos em curso' },
                { label: 'Valor em stock', value: formatAOA(totalValue), desc: 'Estimativa pelo preço unitário' },
                { label: 'Vendas / mês (aprox.)', value: formatAOA(monthlyEstimate), desc: 'Com base nos últimos dados' },
              ].map((card) => (
                <div key={card.label} style={{ background: '#fff', border: '1px solid #dde5d0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7f3a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '0.35rem' }}>{card.label}</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2a3a1d', lineHeight: 1.1 }}>{card.value}</div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7f3a', marginTop: '0.35rem' }}>{card.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: '#f6f8f0', border: '1px solid #dde5d0', borderRadius: '8px', fontSize: '0.9rem', color: '#4a5a2e', lineHeight: 1.5 }}>
              <strong style={{ color: '#2a3a1d' }}>Nota:</strong> As saídas das entregas reduzem o stock disponível. Enquanto a baixa automática não estiver activa no servidor, use o botão <strong>Aplicar saídas das entregas no inventário</strong> para atualizar as quantidades. O valor mensal é uma estimativa baseada nas vendas registadas no painel do fornecedor.
            </div>

            <h3 style={{ marginTop: '1.5rem', fontSize: '1.1rem', color: '#2a3a1d' }}>Entradas e saídas de stock (movimentos)</h3>
            {movements.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: '520px' }}>
                  <thead><tr><th>Data</th><th>Tipo</th><th>Variante</th><th>Qtd</th><th>Nota</th><th>Ref. pedido</th></tr></thead>
                  <tbody>
                    {movements.slice(0, 10).map(m => (
                      <tr key={m.id}>
                        <td><small>{new Date(m.createdAt).toLocaleString('pt-AO')}</small></td>
                        <td><span style={{ padding: '0.15rem 0.4rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 600, background: movementColors[m.type]?.bg ?? '#eee', color: movementColors[m.type]?.fg ?? '#333' }}>{movementLabels[m.type] ?? m.type}</span></td>
                        <td><strong>{m.variantName}</strong><small> · {m.variantSku}</small></td>
                        <td><strong style={{ color: m.quantity > 0 ? '#2a3a1d' : '#b91c1c' }}>{m.quantity > 0 ? '+' + m.quantity : m.quantity}</strong></td>
                        <td><small>{m.note || '—'}</small></td>
                        <td><small>{m.orderReference ?? '—'}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state compact" style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.9rem' }}>
                <p>Nenhum movimento registado ainda. As entradas manuais aparecem como <strong>Ajuste manual</strong>; as reservas e entregas aparecem automaticamente.</p>
              </div>
            )}

            <h3 style={{ marginTop: '1.5rem', fontSize: '1.1rem', color: '#2a3a1d' }}>Entregas recentes</h3>
            <div style={{ marginBottom: '0.6rem' }}>
              <button className="primary-btn" disabled={applying || deliveredOrders.length === 0} onClick={() => void applyDeliveries()}>
                {applying ? 'A processar...' : 'Aplicar saídas das entregas no inventário'}
              </button>
            </div>
            <div style={{ marginBottom: '0.6rem' }}>
              <button className="primary-btn" disabled={applying || deliveredOrders.length === 0} onClick={() => void applyDeliveries()}>
                {applying ? 'A processar...' : 'Aplicar saídas das entregas no inventário'}
              </button>
            </div>
            {deliveredOrders.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: '520px' }}>
                  <thead><tr><th>Ref.</th><th>Estado</th><th>Data</th><th>Valor</th><th>Itens</th></tr></thead>
                  <tbody>
                    {deliveredOrders.slice(0, 6).map(o => (
                      <tr key={o.id}>
                        <td><strong>{o.reference}</strong></td>
                        <td><span style={{ padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, background: '#dde5d0', color: '#2a3a1d' }}>{deliveryStatusLabels[o.status] || o.status}</span></td>
                        <td><small>{new Date(o.createdAt).toLocaleString('pt-AO')}</small></td>
                        <td>{formatAOA(o.pricing?.subtotal ?? 0)}</td>
                        <td><small>{o.items?.length ?? 0} item(s)</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state compact" style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.9rem' }}>
                <p>Nenhuma entrega concluída registada recentemente. Quando os pedidos passam a <strong>Entregue</strong>, o stock associado baixa automaticamente.</p>
              </div>
            )}
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
