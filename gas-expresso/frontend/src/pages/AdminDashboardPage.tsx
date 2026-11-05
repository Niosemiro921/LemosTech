import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminOverview, type AdminOverview } from '../services/admin';
import { extractMessage } from '../services/auth';
import { LogoutButton } from '../components/LogoutButton';
import { DonutChart, HorizontalBars, type ChartDatum } from '../components/Charts';
import { formatAOA } from '../services/catalog';

const REFRESH_INTERVAL_MS = 15_000;
const numberAO = new Intl.NumberFormat('pt-AO');

function displayNumber(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? '—' : numberAO.format(value);
}

function getRegisteredUsers(data: AdminOverview | null) {
  if (!data) return null;
  if (typeof data.totalUsers === 'number') return data.totalUsers;
  if (data.usersByRole && Object.keys(data.usersByRole).length) {
    return Object.values(data.usersByRole).reduce((sum, count) => sum + (Number(count) || 0), 0);
  }
  return null;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    const load = async (quiet: boolean) => {
      if (inFlight) return;
      inFlight = true;
      if (!quiet && active) setLoading(true);
      if (quiet && active) setRefreshing(true);
      try {
        const overview = await fetchAdminOverview();
        if (!active) return;
        setData(overview);
        setLastUpdated(new Date());
        setError('');
      } catch (cause) {
        if (active) setError(extractMessage(cause, 'Não foi possível carregar as métricas administrativas.'));
      } finally {
        inFlight = false;
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    void load(false);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, REFRESH_INTERVAL_MS);
    const onFocus = () => { if (document.visibilityState === 'visible') void load(true); };
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const registeredUsers = getRegisteredUsers(data);
  const fornecedores = data ? (typeof data.fornecedores === 'number' ? data.fornecedores : data.usersByRole?.SUPPLIER ?? null) : null;
  const currentActive = useMemo(() => {
    if (!data) return null;
    return (data.usersByStatus?.ACTIVE ?? null);
  }, [data]);
  const analyticsEnabled = data?.analyticsEnabled === true;

  const composition: ChartDatum[] = data ? [
    { label: 'Clientes', value: Number(data.customers) || 0, color: '#e4572e' },
    { label: 'Entregadores', value: Number(data.drivers) || 0, color: '#2f9e63' },
    { label: 'Empresas', value: Number(data.companies) || 0, color: '#4a90d9' },
    { label: 'Profissionais', value: Number(fornecedores) || 0, color: '#8065bd' },
  ] : [];

  const statusData: ChartDatum[] = data?.usersByStatus
    ? Object.entries(data.usersByStatus).map(([label, value], index) => ({ label, value: Number(value) || 0, color: ['#18895f', '#f0a040', '#b93434', '#8a918b'][index % 4] }))
    : [];

  const activity: ChartDatum[] = analyticsEnabled ? [
    { label: 'Cliques na área do cliente', value: Number(data?.clientClicksLast24h) || 0, color: '#e4572e' },
    { label: 'Páginas abertas por clientes', value: Number(data?.clientPageViewsLast24h) || 0, color: '#f0a040' },
    { label: 'Cliques em todas as áreas', value: Number(data?.clicksLast24h) || 0, color: '#2f9e63' },
  ] : [];

  const operations: ChartDatum[] = [
    { label: 'Pedidos activos', value: Number(data?.activeOrders) || 0, color: '#e4572e' },
    { label: 'Pedidos concluídos', value: Number(data?.completedOrders) || 0, color: '#18895f' },
    { label: 'Incidentes abertos', value: Number(data?.incidentsOpen) || 0, color: '#b93434' },
    { label: 'Inscrições pendentes', value: Number(data?.pendingApplications) || 0, color: '#f0a040' },
    { label: 'Documentos a expirar', value: Number(data?.expiringDocuments) || 0, color: '#8065bd' },
    { label: 'Recargas pendentes', value: Number(data?.walletTopUpsPending) || 0, color: '#4a90d9' },
    { label: 'Levantamentos pendentes', value: Number(data?.walletWithdrawalsPending) || 0, color: '#5d6ad0' },
    { label: 'Novos registos · 24h', value: Number(data?.registrationsLast24h) || 0, color: '#8a918b' },
  ];

  const orderFlow: ChartDatum[] = [
    { label: 'Concluídos', value: Number(data?.completedOrders) || 0, color: '#18895f' },
    { label: 'Em operação', value: Number(data?.activeOrders) || 0, color: '#e4572e' },
    { label: 'Incidentes', value: Number(data?.incidentsOpen) || 0, color: '#b93434' },
  ];

  return (
    <div className="page admin-page admin-dashboard-v5">
      <div className="workspace-heading admin-dashboard-heading">
        <div>
          <span className="section-kicker">Gás Expresso · Centro de controlo</span>
          <h1>Visão geral da operação.</h1>
          <p>Registos, actividade dos clientes, parceiros e pedidos — com actualização automática.</p>
          <div className="admin-live-status" role="status">
            <span className={`admin-live-dot ${refreshing ? 'refreshing' : ''}`} />
            <span>{refreshing ? 'A actualizar métricas…' : 'Actualização automática a cada 15 segundos'}</span>
            {lastUpdated && <span className="admin-updated-at">Última leitura: {lastUpdated.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
          </div>
        </div>
        <div className="admin-actions-row admin-dashboard-actions">
          <span className="admin-lock">Acesso restrito</span>
          <button type="button" className="secondary-btn" onClick={() => { void fetchAdminOverview().then((overview) => { setData(overview); setLastUpdated(new Date()); setError(''); }).catch((cause: unknown) => setError(extractMessage(cause, 'Não foi possível actualizar as métricas.'))).finally(() => setRefreshing(false)); setRefreshing(true); }} disabled={refreshing}>↻ Actualizar</button>
          <Link to="/admin/wallet/top-ups" className="secondary-btn">Recargas</Link>
          <Link to="/admin/importar" className="secondary-btn">Importar dados</Link>
          <LogoutButton className="secondary-btn" />
        </div>
      </div>

      {error && <div className="form-error admin-dashboard-error" role="alert"><strong>Não foi possível actualizar os dados.</strong><span>{error}</span>{data && <small>Os últimos valores recebidos continuam visíveis; verifique a API.</small>}</div>}

      {loading && !data ? (
        <div className="admin-loading-grid" aria-label="A carregar métricas">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="admin-metric-skeleton" />)}
        </div>
      ) : (
        <div className="chart-grid">
          <section className="workspace-panel">
            <div className="admin-panel-heading">
              <div><span className="section-kicker">Contas</span><h2>Distribuição por perfil.</h2><p>Total de {displayNumber(registeredUsers)} contas registadas.</p></div>
            </div>
            <DonutChart data={composition} centerValue={displayNumber(registeredUsers)} centerLabel="contas registadas" ariaLabel="Distribuição de contas por perfil" />
          </section>

          <section className="workspace-panel">
            <div className="admin-panel-heading">
              <div><span className="section-kicker">Estado</span><h2>Contas por estado.</h2><p>Distribuição dos perfis conforme o estado da conta.</p></div>
            </div>
            {statusData.length > 0
              ? <DonutChart data={statusData} centerValue={displayNumber(statusData.reduce((sum, item) => sum + item.value, 0))} centerLabel="contas" ariaLabel="Contas por estado" />
              : <div className="chart-empty">A API não devolveu contas por estado.</div>}
          </section>

          <section className="workspace-panel">
            <div className="admin-panel-heading">
              <div><span className="section-kicker">Actividade · 24h</span><h2>Utilização da plataforma.</h2><p>Eventos registados nas últimas 24 horas.</p></div>
              <span className={`admin-integrity-pill ${analyticsEnabled ? 'enabled' : 'pending'}`}>{analyticsEnabled ? 'Analytics activo' : 'Analytics por activar'}</span>
            </div>
            {analyticsEnabled
              ? <HorizontalBars data={activity} />
              : <div className="chart-empty">Analytics por activar no backend — os contadores aparecem aqui quando a integração estiver ligada.</div>}
            {!analyticsEnabled && <div className="admin-analytics-hint"><strong>Contadores ainda não ligados ao servidor.</strong><p>Os números não serão inventados nem retirados apenas deste navegador. Aplique o patch do backend incluído no pacote para guardar eventos agregáveis e activá-los aqui.</p></div>}
          </section>

          <section className="workspace-panel">
            <div className="admin-panel-heading">
              <div><span className="section-kicker">Operação</span><h2>Fila e pendências.</h2><p>Pedidos, incidentes e processos administrativos.</p></div>
            </div>
            <HorizontalBars data={operations} />
          </section>

          <section className="workspace-panel chart-grid-full">
            <div className="admin-panel-heading">
              <div><span className="section-kicker">Financeiro</span><h2>Receita concluída.</h2><p>Valores em kwanzas de pedidos entregues/concluídos, conforme a API.</p></div>
            </div>
            <div className="finance-chart-row">
              <div className="revenue-hero">
                <small>Receita concluída</small>
                <strong>{data && typeof data.revenue === 'number' ? formatAOA(data.revenue) : '—'}</strong>
                <p>{displayNumber(data?.completedOrders)} pedidos concluídos · {displayNumber(data?.incidentsOpen)} incidentes abertos · {displayNumber(data?.pendingApplications)} inscrições pendentes</p>
              </div>
              <div className="finance-chart">
                <DonutChart data={orderFlow} centerValue={displayNumber((Number(data?.completedOrders) || 0) + (Number(data?.activeOrders) || 0) + (Number(data?.incidentsOpen) || 0))} centerLabel="pedidos" ariaLabel="Pedidos concluídos, em operação e com incidentes" />
              </div>
            </div>
            {currentActive !== null && <p className="admin-status-footnote">Contas com estado ACTIVE: <strong>{displayNumber(currentActive)}</strong></p>}
          </section>
        </div>
      )}

      <div className="admin-link-grid admin-link-grid-v5">
        <Link to="/admin/applications" className="admin-link-card"><span>01</span><div><strong>Candidaturas</strong><p>Aprovar, rejeitar ou pedir documentos a novos parceiros.</p></div>→</Link>
        <Link to="/admin/partners" className="admin-link-card"><span>02</span><div><strong>Parceiros</strong><p>Consultar e gerir empresas e profissionais aprovados.</p></div>→</Link>
        <Link to="/admin/orders" className="admin-link-card"><span>03</span><div><strong>Pedidos</strong><p>Pesquisar o ciclo completo de pedidos, estado e valores.</p></div>→</Link>
        <Link to="/admin/dispatch" className="admin-link-card"><span>04</span><div><strong>Despacho</strong><p>Ver a fila de pedidos e recomendações do algoritmo.</p></div>→</Link>
        <Link to="/admin/audit" className="admin-link-card"><span>05</span><div><strong>Auditoria</strong><p>Rastrear alterações administrativas e financeiras.</p></div>→</Link>
        <Link to="/admin/wallet/top-ups" className="admin-link-card"><span>06</span><div><strong>Carteiras</strong><p>Rever recargas e pedidos financeiros dos profissionais.</p></div>→</Link>
        <Link to="/admin/email" className="admin-link-card"><span>07</span><div><strong>Comunicações</strong><p>Enviar notificações por email através do servidor.</p></div>→</Link>
        <Link to="/admin/analytics" className="admin-link-card"><span>08</span><div><strong>Analytics</strong><p>Eventos de navegação, cliques e áreas da aplicação.</p></div>→</Link>
        <Link to="/admin/billing" className="admin-link-card"><span>09</span><div><strong>Assinaturas</strong><p>Confirmar transferências, licenças e planos das empresas.</p></div>→</Link>
      </div>

      <section className="workspace-panel admin-principles">
        <div><span className="section-kicker">Operação</span><h2>Controlos essenciais.</h2></div>
        <div className="principle-grid"><span>Stock reservado no servidor</span><span>Aprovação explícita de parceiros</span><span>Saldo confirmado pelo servidor</span><span>Preço validado na confirmação</span></div>
      </section>
    </div>
  );
}
