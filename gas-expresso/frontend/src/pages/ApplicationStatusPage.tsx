import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearSession, fetchMe, getSession, rolePath, type AccountStatus } from '../services/auth';
import { extractMessage } from '../services/auth';

const statusCopy: Record<AccountStatus, { title: string; description: string; tone: string }> = {
  PENDING_REVIEW: { title: 'Candidatura em análise', description: 'A equipa está a verificar os dados submetidos.', tone: 'warning' },
  DOCUMENTS_REQUIRED: { title: 'Precisamos de mais documentação', description: 'Consulte a equipa de validação para saber o que falta.', tone: 'warning' },
  REJECTED: { title: 'Candidatura não aprovada', description: 'A conta não pode operar neste momento.', tone: 'danger' },
  SUSPENDED: { title: 'Conta suspensa', description: 'A operação está temporariamente bloqueada.', tone: 'danger' },
  ACTIVE: { title: 'Conta aprovada', description: 'A sua conta profissional está autorizada a operar.', tone: 'success' },
};

export default function ApplicationStatusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Estado enviado pelo formulário de cadastro: permite agradecer e explicar os próximos passos.
  const justRegistered = Boolean((location.state as { justRegistered?: boolean } | null)?.justRegistered);
  const session = getSession();
  const [user, setUser] = useState(session?.user ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = () => {
    setError('');
    setLoading(true);
    fetchMe().then((fresh) => fresh && setUser(fresh)).catch((cause) => setError(extractMessage(cause, 'Não foi possível atualizar o estado.'))).finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  if (!user) return <div className="page auth-page"><div className="status-page-card"><h1>Não existe candidatura nesta sessão.</h1><Link to="/acesso" className="primary-btn">Voltar às áreas</Link></div></div>;
  const copy = statusCopy[user.status];
  const label = user.role === 'DRIVER' ? 'entregador' : user.role === 'PRESTADOR' ? 'prestador' : 'empresa';
  const isPrestador = user.role === 'PRESTADOR';
  const waitingConfirmation = justRegistered && user.status === 'PENDING_REVIEW';
  const heroTone = user.status === 'ACTIVE' || waitingConfirmation ? 'success' : copy.tone;

  return <div className="page auth-page"><div className="status-page-card">
    <div className={`status-hero-icon status-${heroTone}`}>{user.status === 'ACTIVE' || waitingConfirmation ? '✓' : '!'}</div>
    <span className="section-kicker">{waitingConfirmation ? 'Candidatura enviada' : 'Estado da conta profissional'}</span>
    <h1>{waitingConfirmation ? 'Candidatura enviada com sucesso!' : copy.title}</h1>
    <p>{waitingConfirmation
      ? isPrestador
        ? 'Recebemos os dados da empresa. A conta fica em análise e ainda não pode operar — assim que a Administração validar, passa a entrar normalmente na sua área.'
        : 'Recebemos os seus dados e a documentação. A conta fica em análise e ainda não pode operar — assim que a Administração aprovar, passa a entrar normalmente na sua área.'
      : copy.description}</p>
    {!waitingConfirmation && <p>Perfil: <strong>{label}</strong>.</p>}
    {waitingConfirmation && <div className="register-review-card"><span className="register-review-check">✓</span><div><strong>O que acontece agora</strong><span>{isPrestador
      ? '1. A equipa valida os dados da empresa. 2. Pode consultar esta página quando quiser, com “Atualizar estado” — a sessão fica guardada neste dispositivo. 3. Quando a conta ficar ativa, o botão principal passa a “Ir para a minha área”.'
      : '1. A equipa valida os dados e os documentos. 2. Pode consultar esta página quando quiser, com “Atualizar estado” — a sessão fica guardada neste dispositivo. 3. Quando a conta ficar ativa, o botão principal passa a “Ir para a minha área”.'}</span></div></div>}
    {user.reviewNote && <div className="review-note"><strong>Nota da equipa</strong><span>{user.reviewNote}</span></div>}
    <div className="status-steps">
      <div className="status-step done"><span>1</span><div><strong>Cadastro enviado</strong><small>Os dados foram recebidos pelo servidor.</small></div></div>
      <div className={`status-step ${user.status === 'PENDING_REVIEW' || user.status === 'DOCUMENTS_REQUIRED' ? 'current' : user.status === 'ACTIVE' ? 'done' : ''}`}><span>2</span><div><strong>Validação</strong><small>{user.status === 'DOCUMENTS_REQUIRED' ? 'Existem documentos ou informações pendentes.' : isPrestador ? 'A equipa verifica os dados da empresa.' : 'A equipa verifica os dados profissionais.'}</small></div></div>
      <div className={`status-step ${user.status === 'ACTIVE' ? 'done' : ''}`}><span>3</span><div><strong>Operação autorizada</strong><small>Pedidos e ofertas só ficam disponíveis quando o servidor indicar ACTIVE.</small></div></div>
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="status-actions">
      {user.status === 'ACTIVE'
        ? <>
            <button className="primary-btn" onClick={() => navigate(rolePath(user.role))}>Ir para a minha área →</button>
            <button className="secondary-btn" disabled={loading} onClick={refresh}>{loading ? 'A atualizar…' : 'Atualizar estado'}</button>
          </>
        : <>
            <button className="primary-btn" disabled={loading} onClick={refresh}>{loading ? 'A atualizar…' : 'Atualizar estado'}</button>
            <button className="secondary-btn" onClick={() => { clearSession(); navigate('/login'); }}>Sair da conta</button>
          </>}
    </div>
    <div className="status-account"><strong>{user.name ?? 'Conta profissional'}</strong><span>{user.phone}</span>{user.reviewedAt && <span>Última revisão: {new Date(user.reviewedAt).toLocaleString('pt-AO')}</span>}</div>
  </div></div>;
}
