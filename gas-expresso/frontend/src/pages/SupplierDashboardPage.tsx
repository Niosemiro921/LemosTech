import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { fetchSupplierDashboard, type SupplierDashboard } from '../services/supplierBusiness';
import { fetchSupplierOrders } from '../services/supplier';
import { fetchSupplierInventory, type SupplierInventoryItem } from '../services/supplier';
import { fetchSupplierInventoryMovements, type SupplierStockMovement } from '../services/supplier';
import { BarChart, DonutChart, HorizontalBars, LineChart, type ChartDatum } from '../components/Charts';

const statusLabels: Record<string, string> = {
  CREATED: 'Criado', AWAITING_SUPPLIER_ACCEPTANCE: 'Esperando aceitação', SUPPLIER_ACCEPTED: 'Aceite', PREPARING: 'Em preparação', READY_FOR_PICKUP: 'Pronto para recolha', DRIVER_SEARCHING: 'Procurando entregador', DRIVER_ASSIGNED: 'Atribuído', DRIVER_ACCEPTED: 'Aceite', PICKED_UP: 'Recolhido', IN_TRANSIT: 'Em trânsito', ARRIVED: 'Chegou', DELIVERED: 'Entregue', COMPLETED: 'Concluído', CANCELLED: 'Cancelado', FAILED: 'Falhou',
};

export default function SupplierDashboardPage() {
  const [dashboard, setDashboard] = useState<SupplierDashboard | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<SupplierInventoryItem[]>([]);
  const [movements, setMovements] = useState<SupplierStockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [d, ords, invs, movs] = await Promise.all([
        fetchSupplierDashboard(),
        fetchSupplierOrders().catch(() => []),
        fetchSupplierInventory().catch(() => []),
        fetchSupplierInventoryMovements().catch(() => []),
      ]);
      setDashboard(d as SupplierDashboard);
      setOrders(ords as any);
      setInventory(invs as SupplierInventoryItem[]);
      setMovements(movs as SupplierStockMovement[]);
      setError('');
    } catch (e) {
      setError(extractMessage(e, 'Não foi possível carregar o dashboard.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const series = dashboard?.salesSeries ?? [];
  const ordersByStatus = dashboard?.ordersByStatus ?? [];
  const monthSales = dashboard?.salesByMonth ?? [];
  const evr = dashboard?.expensesVsRevenue ?? [];
  const comparison = dashboard?.periodComparison;
  const kpis = dashboard?.kpis;

  const lowStock = inventory.filter((i) => i.availableQty <= i.reorderLevel);

  const salesChart: ChartDatum[] = [
    { label: 'Vendas do dia', value: Number(kpis?.salesToday) || 0, color: '#e4572e' },
    { label: 'Vendas da semana', value: Number(kpis?.salesWeek) || 0, color: '#f0a040' },
    { label: 'Vendas do mês', value: Number(kpis?.salesMonth) || 0, color: '#2f9e63' },
    { label: 'Total vendas', value: Number(kpis?.totalSales) || 0, color: '#4a90d9' },
  ];

  const ordersChart: ChartDatum[] = [
    { label: 'Recebidos', value: Number(kpis?.ordersReceived) || 0, color: '#8a918b' },
    { label: 'Pendentes', value: Number(kpis?.ordersPending) || 0, color: '#f0a040' },
    { label: 'Em preparação', value: Number(kpis?.ordersPreparing) || 0, color: '#e4572e' },
    { label: 'Em entrega', value: Number(kpis?.ordersInDelivery) || 0, color: '#4a90d9' },
    { label: 'Entregues', value: Number(kpis?.ordersDelivered) || 0, color: '#18895f' },
    { label: 'Cancelados', value: Number(kpis?.ordersCancelled) || 0, color: '#b93434' },
  ];

  const financeChart: ChartDatum[] = [
    { label: 'Receitas recebidas', value: Number(kpis?.revenueReceived) || 0, color: '#18895f' },
    { label: 'Valores por receber', value: Number(kpis?.amountsToReceive) || 0, color: '#f0a040' },
    { label: 'Despesas registadas', value: Number(kpis?.expenses) || 0, color: '#b93434' },
    { label: 'Margem bruta estimada', value: Number(kpis?.grossMarginEstimated) || 0, color: '#4a90d9' },
  ];

  const bottlesChart: ChartDatum[] = [
    { label: 'Disponíveis', value: Number(kpis?.bottlesAvailable) || 0, color: '#18895f' },
    { label: 'Reservadas', value: Number(kpis?.bottlesReserved) || 0, color: '#f0a040' },
    { label: 'Entregues', value: Number(kpis?.bottlesDelivered) || 0, color: '#4a90d9' },
  ];

  const riskChart: ChartDatum[] = [
    { label: 'Produtos com stock baixo', value: Number(kpis?.lowStockProducts) || 0, color: '#f0a040' },
    { label: 'Produtos sem stock', value: Number(kpis?.outOfStockProducts) || 0, color: '#b93434' },
    { label: 'Compras pendentes', value: Number(kpis?.pendingPurchases) || 0, color: '#8065bd' },
    { label: 'Entregas com atraso', value: Number(kpis?.delayedDeliveries) || 0, color: '#5d6ad0' },
  ];

  return (
    <div className="page supplier-dashboard-page supplier-module-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">Visão geral</span>
          <h1>Dashboard empresarial.</h1>
          <p>Indicadores calculados a partir de dados reais. Filtrar por data, filial ou armazém para cruzar relatórios.</p>
        </div>
        <button className="secondary-btn" onClick={() => void load()} disabled={loading}>
          {loading ? 'A atualizar…' : 'Atualizar'}
        </button>
      </div>

      {error && <div className="form-error" role="alert"><strong>Erro:</strong> {error}</div>}

      <div className="chart-grid">
        <section className="workspace-panel">
          <div className="panel-title">
            <span className="section-kicker">Vendas</span>
            <h2>Volume por período</h2>
          </div>
          <HorizontalBars data={salesChart} formatValue={formatAOA} />
        </section>

        <section className="workspace-panel">
          <div className="panel-title">
            <span className="section-kicker">Funil de pedidos</span>
            <h2>Estado operacional</h2>
          </div>
          <HorizontalBars data={ordersChart} />
        </section>

        <section className="workspace-panel">
          <div className="panel-title">
            <span className="section-kicker">Financeiro</span>
            <h2>Receitas e despesas</h2>
          </div>
          <HorizontalBars data={financeChart} formatValue={formatAOA} />
        </section>

        <section className="workspace-panel">
          <div className="panel-title">
            <span className="section-kicker">Botijas</span>
            <h2>Stock de botijas</h2>
          </div>
          <DonutChart data={bottlesChart} centerValue={String((Number(kpis?.bottlesAvailable) || 0) + (Number(kpis?.bottlesReserved) || 0) + (Number(kpis?.bottlesDelivered) || 0))} centerLabel="botijas" ariaLabel="Stock de botijas" />
        </section>

        <section className="workspace-panel chart-grid-full">
          <div className="panel-title">
            <span className="section-kicker">Riscos operacionais</span>
            <h2>Pontos de atenção</h2>
          </div>
          <HorizontalBars data={riskChart} />
        </section>
      </div>

      <section className="workspace-panel" style={{ marginTop: '1.5rem' }}>
        <div className="panel-title">
          <span className="section-kicker">Evolução das vendas</span>
          <h2>Vendas por dia — últimos 14 dias</h2>
        </div>
        <LineChart data={series.map((point) => ({ label: point.date, value: Number(point.sales) || 0 }))} ariaLabel="Vendas por dia" />
        <p className="chart-caption">Subtotal de pedidos entregues (AOA).</p>
      </section>

      <section className="workspace-panel">
        <div className="panel-title">
          <span className="section-kicker">Vendas por período</span>
          <h2>Por mês — últimos 12 meses</h2>
        </div>
        <BarChart data={monthSales.map((month) => ({ label: month.month, values: [Number(month.amount) || 0] }))} series={[{ name: 'Vendas', color: '#e4572e' }]} ariaLabel="Vendas por mês" />
      </section>

      <section className="workspace-panel">
        <div className="panel-title">
          <span className="section-kicker">Distribuição dos pedidos por estado</span>
          <h2>Estado operacional</h2>
        </div>
        {ordersByStatus.length > 0 ? (
          <DonutChart
            data={ordersByStatus.map((item, index) => ({ label: statusLabels[item.status] ?? item.status, value: Number(item.count) || 0, color: ['#e4572e', '#f0a040', '#2f9e63', '#4a90d9', '#8065bd', '#b93434', '#5d6ad0'][index % 7] }))}
            centerValue={String(ordersByStatus.reduce((sum, item) => sum + (Number(item.count) || 0), 0))}
            centerLabel="pedidos"
            ariaLabel="Distribuição dos pedidos por estado"
          />
        ) : <div className="chart-empty">A API não devolveu pedidos para distribuir.</div>}
      </section>

      <section className="workspace-panel">
        <div className="panel-title">
          <span className="section-kicker">Despesas versus receitas</span>
          <h2>Mês corrente</h2>
        </div>
        <BarChart
          data={evr.map((item) => ({ label: item.period, values: [Number(item.revenue) || 0, Number(item.expenses) || 0] }))}
          series={[{ name: 'Receitas', color: '#2f9e63' }, { name: 'Despesas', color: '#c93636' }]}
          ariaLabel="Despesas versus receitas"
        />
        {comparison && <p className="chart-caption">Comparação com mês anterior: {comparison.previous} vs {comparison.current} — variação {comparison.growth.toFixed(1)}%.</p>}
      </section>

      <section className="workspace-panel" style={{ marginTop: '1.5rem' }}>
        <div className="panel-title">
          <span className="section-kicker">Operação recente</span>
          <h2>Últimos pedidos</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: '680px' }}>
            <thead>
              <tr><th>Ref.</th><th>Estado</th><th>Data</th><th>Valor (Kz)</th><th>Detalhe</th></tr>
            </thead>
            <tbody>
              {orders.slice(0, 8).map((o: any) => (
                <tr key={o.id}>
                  <td><Link className="link" to={`/fornecedor/pedido/${encodeURIComponent(o.id)}`}><strong>{o.reference}</strong></Link></td>
                  <td><span className="status-pill">{statusLabels[o.status] ?? o.status}</span></td>
                  <td><small>{new Date(o.createdAt).toLocaleString('pt-AO')}</small></td>
                  <td><strong>{formatAOA(o.total)}</strong></td>
                  <td><Link to={`/fornecedor/pedidos`}>Abrir →</Link></td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={5}><p style={{ padding: '1rem', textAlign: 'center' }}>Nenhum pedido devolvido pela API.</p></td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '0.5rem 0' }}><Link to="/fornecedor/pedidos" className="secondary-btn">Ver todos os pedidos</Link></div>
      </section>

      <section className="workspace-panel">
        <div className="panel-title">
          <span className="section-kicker">Stock e botijas a vigiar</span>
          <h2>Itens com stock baixo</h2>
        </div>
        {lowStock.length > 0 ? (
          <table className="data-table" style={{ minWidth: '540px' }}>
            <thead><tr><th>Produto</th><th>SKU</th><th>Disponível</th><th>Reservado</th><th>Mínimo</th></tr></thead>
            <tbody>
              {lowStock.map((i) => (
                <tr key={i.id}>
                  <td><Link className="link" to="/fornecedor/stock"><strong>{i.variant.name}</strong></Link></td>
                  <td>{i.variant.sku}</td>
                  <td>{i.availableQty}</td>
                  <td>{i.reservedQty}</td>
                  <td>{i.reorderLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state compact"><p>Sem itens abaixo do nível mínimo.</p></div>
        )}
        <div style={{ paddingTop: '0.5rem' }}><Link to="/fornecedor/stock" className="secondary-btn">Ver inventário completo</Link></div>
      </section>

      <section className="workspace-panel">
        <div className="panel-title">
          <span className="section-kicker">Movimentos de stock</span>
          <h2>Histórico recente</h2>
        </div>
        {movements.length > 0 ? (
          <table className="data-table" style={{ minWidth: '560px' }}>
            <thead><tr><th>Data</th><th>Tipo</th><th>Produto</th><th>Qtd</th><th>Ref. pedido</th></tr></thead>
            <tbody>
              {movements.slice(0, 10).map((m) => (
                <tr key={m.id}>
                  <td><small>{new Date(m.createdAt).toLocaleString('pt-AO')}</small></td>
                  <td><small>{m.type}</small></td>
                  <td><small>{m.variantName} · {m.variantSku}</small></td>
                  <td><strong>{m.quantity}</strong></td>
                  <td><small>{m.orderReference ?? '—'}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state compact"><p>Nenhum movimento registado.</p></div>
        )}
      </section>

      {!loading && dashboard && (
        <div className="page-footer">
          <small>Dashboard calculado a partir da API — {new Date(dashboard.generatedAt).toLocaleString('pt-AO')}. Valores "Vendas" refletem o subtotal de pedidos entregues, não confundir com lucro. Margem bruta estimada depende de custos que ainda não estão registados.</small>
        </div>
      )}
    </div>
  );
}

