import { Link } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';
import { LogoutButton } from './LogoutButton';

export default function PrestadorPage() {
  const user = getCurrentUser();
  return (
    <div className="page professional-page prestador-page">
      <div className="professional-topbar">
        <div><span className="section-kicker">Área do prestador</span><h1>Operação de serviços.</h1><p>O acesso é limitado às funções atribuídas ao seu perfil pelo servidor.</p></div>
        <LogoutButton className="secondary-btn" />
      </div>
      <section className="professional-identity">
        <div className="profile-avatar-xl">{(user?.name ?? 'PR').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</div>
        <div><span className="section-kicker">Sessão activa</span><h2>{user?.name ?? 'Prestador'}</h2><p>{user?.phone}{user?.email ? ` · ${user.email}` : ''}</p><span className={`status-pill ${user?.status === 'ACTIVE' ? 'success' : 'warning'}`}>{user?.status ?? '—'}</span></div>
      </section>
      <div className="professional-cards">
        <Link to="/notificacoes" className="professional-card"><span>01</span><strong>Notificações</strong><small>Acompanhar comunicações que o servidor enviar para a sua conta.</small>→</Link>
        <Link to="/suporte" className="professional-card"><span>02</span><strong>Suporte</strong><small>Registar uma questão operacional e acompanhar o atendimento.</small>→</Link>
      </div>
      <div className="security-callout large"><strong>Controlo de acesso</strong><span>“Pedir gás” e “Rastreamento” pertencem exclusivamente ao perfil Cliente e não ficam disponíveis nesta área.</span></div>
    </div>
  );
}
