import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminOverview, type AdminOverview } from '../services/admin';
import { extractMessage } from '../services/auth';
import { LogoutButton } from '../components/LogoutButton';
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

  const metrics = [
    { label: 'Contas registadas', value: displayNumber(registeredUsers), detail: 'Todos os perfis contabilizados', accent: 'neutral', icon: '01' },
    { label: 'Clientes', value: displayNumber(data?.customers), detail: 'Contas de cliente', accent: 'orange', icon: '02' },
    { label: 'Entregadores', value: displayNumber(data?.drivers), detail: data?.activeDrivers == null ? 'Registados no sistema' : `${displayNumber(data.activeDrivers)} online/activos`, accent: 'green', icon: '03' },
    { label: 'Empresas', value: displayNumber(data?.companies), detail: data?.activeCompanies == null ? 'Fornecedores registados' : `${displayNumber(data.activeCompanies)} com conta activa`, accent: 'blue', icon: '04' },
    { label: 'Empresaes', value: displayNumber(fornecedores), detail: 'Perfis profissionais separados', accent: 'purple', icon: '05' },
    { label: 'Novos registos · 24h', value: displayNumber(data?.registrationsLast24h), detail: 'Contas criadas nas últimas 24 horas', accent: 'neutral', icon: '06' },
    { label: 'Pedidos activos', value: displayNumber(data?.activeOrders), detail: 'Ainda em operação', accent: 'orange', icon: '07' },
    { label: 'Cliques do cliente · 24h', value: analyticsEnabled ? displayNumber(data?.clientClicksLast24h) : '—', detail: analyticsEnabled ? `${displayNumber(data?.clientPageViewsLast24h)} visualizações da área de cliente` : 'Activar a integração de analytics no backend', accent: analyticsEnabled ? 'green' : 'muted', icon: '08' },
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
          <LogoutButton className="secondary-btn" />
        </div>
      </div>

      {error && <div className="form-error admin-dashboard-error" role="alert"><strong>Não foi possível actualizar os dados.</strong><span>{error}</span>{data && <small>Os últimos valores recebidos continuam visíveis; verifique a API.</small>}</div>}

      {loading && !data ? (
        <div className="admin-loading-grid" aria-label="A carregar métricas">
          {Array.from({ length: 8 }).map((_, index) => <div key={index} className="admin-metric-skeleton" />)}
        </div>
      ) : (
        <div className="admin-dashboard-metrics">
          {metrics.map((metric) => (
            <article className={`admin-metric-card accent-${metric.accent}`} key={metric.label}>
              <div className="admin-metric-top"><span>{metric.label}</span><small>{metric.icon}</small></div>
              <strong className="admin-metric-value">{metric.value}</strong>
              <p>{metric.detail}</p>
            </article>
          ))}
        </div>
      )}

      <div className="admin-dashboard-main-grid">
        <section className="workspace-panel admin-activity-panel">
          <div className="admin-panel-heading"><div><span className="section-kicker">Actividade</span><h2>Utilização da plataforma.</h2><p>Eventos registados nas últimas 24 horas.</p></div><span className={`admin-integrity-pill ${analyticsEnabled ? 'enabled' : 'pending'}`}>{analyticsEnabled ? 'Analytics activo' : 'Analytics por activar'}</span></div>
          <div className="admin-activity-stats">
            <div><span>Cliques na área do cliente</span><strong>{analyticsEnabled ? displayNumber(data?.clientClicksLast24h) : '—'}</strong><small>Botões e ligações accionados</small></div>
            <div><span>Páginas abertas por clientes</span><strong>{analyticsEnabled ? displayNumber(data?.clientPageViewsLast24h) : '—'}</strong><small>Navegações registadas</small></div>
            <div><span>Cliques em todas as áreas</span><strong>{analyticsEnabled ? displayNumber(data?.clicksLast24h) : '—'}</strong><small>Cliente, entregador, empresa e administração</small></div>
          </div>
          {!analyticsEnabled && <div className="admin-analytics-hint"><strong>Contadores ainda não ligados ao servidor.</strong><p>Os números não serão inventados nem retirados apenas deste navegador. Aplique o patch do backend incluído no pacote para guardar eventos agregáveis e activá-los aqui.</p></div>}
          {currentActive !== null && <p className="admin-status-footnote">Contas com estado ACTIVE: <strong>{displayNumber(currentActive)}</strong></p>}
        </section>

        <section className="workspace-panel admin-revenue-panel">
          <div><span className="section-kicker">Financeiro</span><h2>Receita concluída.</h2><p>Valores em kwanzas de pedidos entregues/concluídos, conforme a API.</p></div>
          <strong>{data && typeof data.revenue === 'number' ? formatAOA(data.revenue) : '—'}</strong>
          <div className="admin-mini-finance-row"><span>Pedidos concluídos</span><b>{displayNumber(data?.completedOrders)}</b></div>
          <div className="admin-mini-finance-row"><span>Incidentes abertos</span><b>{displayNumber(data?.incidentsOpen)}</b></div>
          <div className="admin-mini-finance-row"><span>Inscrições pendentes</span><b>{displayNumber(data?.pendingApplications)}</b></div>
        </section>
      </div>

      <div className="admin-link-grid admin-link-grid-v5">
        <Link to="/admin/applications" className="admin-link-card"><span>01</span><div><strong>Candidaturas</strong><p>Aprovar, rejeitar ou pedir documentos a novos parceiros.</p></div>→</Link>
        <Link to="/admin/partners" className="admin-link-card"><span>02</span><div><strong>Parceiros</strong><p>Consultar e gerir empresas e profissionais aprovados.</p></div>→</Link>
        <Link to="/admin/orders" className="admin-link-card"><span>03</span><div><strong>Pedidos</strong><p>Pesquisar o ciclo completo de pedidos, estado e valores.</p></div>→</Link>
        <Link to="/admin/dispatch" className="admin-link-card"><span>04</span><div><strong>Despacho</strong><p>Ver a fila de pedidos e recomendações do algoritmo.</p></div>→</Link>
        <Link to="/admin/audit" className="admin-link-card"><span>05</span><div><strong>Auditoria</strong><p>Rastrear alterações administrativas e financeiras.</p></div>→</Link>
        <Link to="/admin/wallet/top-ups" className="admin-link-card"><span>06</span><div><strong>Carteiras</strong><p>Rever recargas e pedidos financeiros dos profissionais.</p></div>→</Link>
        <Link to="/admin/email" className="admin-link-card"><span>07</span><div><strong>Comunicações</strong><p>Enviar notificações por email através do servidor.</p></div>→</Link>
        <Link to="/admin/analytics" className="admin-link-card"><span>08</span><div><strong>Analytics</strong><p>Eventos de navegação, cliques e áreas da aplicação.</p></div>→</Link>
      </div>

      <section className="workspace-panel admin-principles">
        <div><span className="section-kicker">Operação</span><h2>Controlos essenciais.</h2></div>
        <div className="principle-grid"><span>Stock reservado no servidor</span><span>Aprovação explícita de parceiros</span><span>Saldo confirmado pelo servidor</span><span>Preço validado na confirmação</span></div>
      </section>
    </div>
  );
}
