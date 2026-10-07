import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { extractMessage, getCurrentUser, updateCustomerProfile, type SessionUser } from '../services/auth';
import { LogoutButton } from '../components/LogoutButton';
import { formatAOA } from '../services/catalog';

interface CustomerOrder {
  id: string;
  reference: string;
  status: string;
  deliveryAddress: string;
  pricing: { total: number };
  items: Array<{ variantName: string; quantity: number }>;
  createdAt: string;
}
const statusLabels: Record<string, string> = {
  AWAITING_SUPPLIER_ACCEPTANCE: 'A aguardar empresa',
  SUPPLIER_ACCEPTED: 'Pedido aceite',
  PREPARING: 'A preparar',
  READY_FOR_PICKUP: 'Pronto para recolha',
  DRIVER_SEARCHING: 'A procurar entregador',
  DRIVER_ACCEPTED: 'Entregador atribuído',
  PICKED_UP: 'Botija recolhida',
  IN_TRANSIT: 'A caminho',
  ARRIVED: 'Entregador chegou',
  DELIVERED: 'Entregue',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  FAILED: 'Falhou',
};

export default function ProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(getCurrentUser());
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');

  useEffect(() => {
    let active = true;
    Promise.all([apiGet<SessionUser>('/auth/me'), apiGet<CustomerOrder[]>('/orders/mine')])
      .then(([profile, customerOrders]) => {
        if (!active) return;
        setUser(profile);
        setName(profile.name ?? '');
        setEmail(profile.email ?? '');
        setOrders(customerOrders);
      })
      .catch((cause: unknown) => {
        if (active) setError(extractMessage(cause, 'Não foi possível carregar a conta.'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await updateCustomerProfile({ fullName: name, email: email || null });
      setUser(updated);
      setEditing(false);
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível guardar os dados.'));
    } finally {
      setSaving(false);
    }
  };

  const completedCount = orders.filter((order) => ['DELIVERED', 'COMPLETED'].includes(order.status)).length;
  const latestOrder = orders[0];

  return (
    <div className="page profile-page">
      <section className="profile-hero">
        <div className="profile-identity"><div className="profile-avatar profile-avatar-large">{(user?.name ?? 'GE').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div><span className="section-kicker">Área do cliente</span><h1>Minha conta</h1><p>Consulte os seus pedidos e mantenha os dados de contacto atualizados.</p></div></div>
        <div className="profile-status-chip"><span className="live-dot" /> Conta {user?.status === 'ACTIVE' ? 'ativa' : user?.status}</div>
      </section>
      {error && <div className="form-error" role="alert">{error}</div>}
      {loading && <p role="status">A carregar a sua conta…</p>}
      <section className="profile-stats" aria-label="Resumo da conta">
        <article className="profile-stat-card"><span className="profile-stat-icon">⌁</span><div><small>Pedidos realizados</small><strong>{orders.length}</strong><span>{completedCount} concluídos</span></div></article>
        <article className="profile-stat-card"><span className="profile-stat-icon">☎</span><div><small>Telefone</small><strong>{user?.phone ?? '—'}</strong><span>Contacto da conta</span></div></article>
        <article className="profile-stat-card accent"><span className="profile-stat-icon">⚡</span><div><small>Último pedido</small><strong>{latestOrder ? formatAOA(latestOrder.pricing.total) : '—'}</strong><span>{latestOrder ? latestOrder.reference : 'Sem pedidos'}</span></div></article>
      </section>
      <section className="profile-main-grid">
        <div className="profile-main-column">
          <article className="profile-panel">
            <div className="profile-panel-head"><div><span className="section-kicker">Acesso rápido</span><h2>O que quer fazer?</h2></div></div>
            <div className="profile-quick-grid">
              <Link to="/pedir" className="profile-action-card primary-action"><span className="profile-action-icon">+</span><div><strong>Pedir gás</strong><small>Começar um novo pedido.</small></div><span className="profile-arrow">→</span></Link>
              <Link to="/rastrear" className="profile-action-card"><span className="profile-action-icon">⌖</span><div><strong>Rastrear pedido</strong><small>Ver o estado atualizado das entregas.</small></div><span className="profile-arrow">→</span></Link>
              <Link to="/enderecos" className="profile-action-card"><span className="profile-action-icon">⌂</span><div><strong>Meus endereços</strong><small>Guarde destinos recorrentes e referências.</small></div><span className="profile-arrow">→</span></Link>
              <Link to="/notificacoes" className="profile-action-card"><span className="profile-action-icon">!</span><div><strong>Notificações</strong><small>Veja atualizações importantes dos pedidos.</small></div><span className="profile-arrow">→</span></Link>
              <Link to="/suporte" className="profile-action-card"><span className="profile-action-icon">?</span><div><strong>Suporte</strong><small>Abra e acompanhe atendimentos.</small></div><span className="profile-arrow">→</span></Link>
            </div>
          </article>
          <article className="profile-panel">
            <div className="profile-panel-head"><div><span className="section-kicker">Atividade</span><h2>Histórico de pedidos</h2></div></div>
            {orders.length === 0 && !loading ? <p>Ainda não fez nenhum pedido.</p> : orders.slice(0, 8).map((order) => <div className="recent-order-card" key={order.id}><div className="recent-order-product"><div className="cylinder small">GÁS</div><div><strong>{order.items.map((item) => `${item.quantity} × ${item.variantName}`).join(', ')}</strong><span>{order.reference} · {new Date(order.createdAt).toLocaleDateString('pt-AO')}</span></div></div><div className="recent-order-status"><span className="status-pill">{statusLabels[order.status] ?? order.status}</span><strong>{formatAOA(order.pricing.total)}</strong><Link to={`/rastrear?orderId=${encodeURIComponent(order.id)}`} className="soft-link">Rastrear</Link></div></div>)}
          </article>
        </div>
        <aside className="profile-side-column">
          <article className="profile-panel profile-contact-panel">
            <div className="profile-panel-head"><div><span className="section-kicker">Perfil</span><h2>Dados da conta</h2></div></div>
            {editing ? <form className="form-grid" onSubmit={save}>
              <div className="field"><label htmlFor="profile-name">Nome completo</label><input id="profile-name" className="input" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} /></div>
              <div className="field"><label htmlFor="profile-email">Email</label><input id="profile-email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
              <div className="profile-info-list"><div><span>Telefone</span><strong>{user?.phone}</strong></div></div>
              <button className="primary-btn full" type="submit" disabled={saving}>{saving ? 'A guardar…' : 'Guardar alterações'}</button>
              <button className="secondary-btn full" type="button" onClick={() => { setEditing(false); setName(user?.name ?? ''); setEmail(user?.email ?? ''); }}>Cancelar</button>
            </form> : <>
              <div className="profile-info-list"><div><span>Nome</span><strong>{user?.name ?? '—'}</strong></div><div><span>Telefone</span><strong>{user?.phone ?? '—'}</strong></div><div><span>Email</span><strong>{user?.email ?? 'Não definido'}</strong></div></div>
              <button className="secondary-btn full" type="button" onClick={() => setEditing(true)}>Editar dados</button>
            </>}
            <LogoutButton />
          </article>
          <article className="profile-panel profile-help-panel"><span className="profile-help-icon">?</span><div><strong>Precisa de ajuda?</strong><p>A nossa equipa poderá acompanhar pedidos, entregas e ocorrências.</p></div><Link to="/" className="text-link">Falar com suporte →</Link></article>
        </aside>
      </section>
    </div>
  );
}
