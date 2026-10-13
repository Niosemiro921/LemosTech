import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { fetchSupplierOrders, type SupplierOrder } from '../services/supplier';

const completed = new Set(['DELIVERED', 'COMPLETED']);
export default function SupplierReportsPage() {
  const [orders, setOrders] = useState<SupplierOrder[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  async function load() { setLoading(true); try { setOrders(await fetchSupplierOrders()); setError(''); } catch (cause) { setError(extractMessage(cause, 'Não foi possível carregar os dados dos pedidos.')); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const data = useMemo(() => {
    const done = orders.filter((order) => completed.has(order.status));
    const byMonth = new Map<string, { label: string; amount: number; orders: number }>();
    for (const order of done) {
      const date = new Date(order.createdAt);
      if (Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = byMonth.get(key) ?? { label: date.toLocaleDateString('pt-AO', { month: 'short', year: 'numeric' }), amount: 0, orders: 0 };
      current.amount += order.pricing?.subtotal ?? 0; current.orders += 1; byMonth.set(key, current);
    }
    return { completedCount: done.length, completedValue: done.reduce((sum, order) => sum + (order.pricing?.subtotal ?? 0), 0), months: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([, value]) => value) };
  }, [orders]);
  const maxMonth = Math.max(...data.months.map((month) => month.amount), 1);
  return <div className="supplier-module-page page"><header className="workspace-heading"><div><span className="section-kicker">ANÁLISE · PEDIDOS REAIS</span><h1>Desempenho comercial</h1><p>Resumo local calculado a partir dos pedidos que a API devolve. Não é um relatório financeiro contabilístico.</p></div><button className="secondary-btn" onClick={() => void load()} disabled={loading}>↻ Actualizar</button></header>
    {error && <div className="form-error" role="alert">{error}</div>}
    {loading ? <div className="loading-panel" role="status">A calcular o resumo a partir dos pedidos…</div> : <>
      <div className="supplier-kpi-grid"><article><small>Pedidos no resultado da API</small><strong>{orders.length}</strong><span>Sem paginação server-side neste contrato</span></article><article><small>Pedidos concluídos</small><strong>{data.completedCount}</strong><span>Estados DELIVERED e COMPLETED</span></article><article><small>Subtotal concluído</small><strong>{formatAOA(data.completedValue)}</strong><span>Antes de taxas e descontos</span></article><article><small>Meses com conclusão</small><strong>{data.months.length}</strong><span>Até seis meses com movimento</span></article></div>
      <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">EVOLUÇÃO</span><h2>Subtotal de produtos por mês</h2></div><Link to="/fornecedor/pedidos" className="text-link">Ver pedidos →</Link></div>{data.months.length ? <div className="supplier-report-bars">{data.months.map((month) => <div className="supplier-report-row" key={month.label}><div><strong>{month.label}</strong><small>{month.orders} pedido(s) concluído(s)</small></div><div className="supplier-report-track"><span style={{ width: `${Math.max(2, month.amount / maxMonth * 100)}%` }}/></div><strong>{formatAOA(month.amount)}</strong></div>)}</div> : <div className="empty-state"><h3>Sem pedidos concluídos</h3><p>Quando existirem pedidos concluídos devolvidos pela API, o resumo mensal aparecerá aqui.</p></div>}</section>
      <div className="supplier-api-note"><strong>CRM e fidelização</strong><p>Relatórios de repetição de compra, novos/inactivos e interacções por cliente precisam de endpoints de CRM. Não são inferidos sem identificação do cliente na resposta actual.</p></div>
    </>}
  </div>;
}
