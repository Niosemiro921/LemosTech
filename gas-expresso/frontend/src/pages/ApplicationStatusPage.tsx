import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const session = getSession();
  const [user, setUser] = useState(session?.user ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    fetchMe().then((fresh) => { if (fresh) setUser(fresh); }).catch((cause) => setError(extractMessage(cause, 'Não foi possível atualizar o estado.'))).finally(() => setLoading(false));
  }, []);

  if (!user) return <div className="page auth-page"><div className="status-page-card"><h1>Não existe candidatura nesta sessão.</h1><Link to="/acesso" className="primary-btn">Voltar às áreas</Link></div></div>;
  const copy = statusCopy[user.status];
  const label = user.role === 'DRIVER' ? 'entregador' : 'empresa';

  return <div className="page auth-page"><div className="status-page-card">
    <div className={`status-hero-icon status-${copy.tone}`}>{user.status === 'ACTIVE' ? '✓' : '!'}</div>
    <span className="section-kicker">Estado da conta profissional</span>
    <h1>{copy.title}</h1>
    <p>{copy.description} Perfil: <strong>{label}</strong>.</p>
    {user.reviewNote && <div className="review-note"><strong>Nota da equipa</strong><span>{user.reviewNote}</span></div>}
    <div className="status-steps">
      <div className="status-step done"><span>1</span><div><strong>Cadastro enviado</strong><small>Os dados foram recebidos pelo servidor.</small></div></div>
      <div className={`status-step ${user.status === 'PENDING_REVIEW' || user.status === 'DOCUMENTS_REQUIRED' ? 'current' : user.status === 'ACTIVE' ? 'done' : ''}`}><span>2</span><div><strong>Validação</strong><small>{user.status === 'DOCUMENTS_REQUIRED' ? 'Existem documentos ou informações pendentes.' : 'A equipa verifica os dados profissionais.'}</small></div></div>
      <div className={`status-step ${user.status === 'ACTIVE' ? 'done' : ''}`}><span>3</span><div><strong>Operação autorizada</strong><small>Pedidos e ofertas só ficam disponíveis quando o servidor indicar ACTIVE.</small></div></div>
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="status-actions">
      <button className="secondary-btn" disabled={loading} onClick={() => { setError(''); setLoading(true); fetchMe().then((fresh) => fresh && setUser(fresh)).catch((cause) => setError(extractMessage(cause, 'Não foi possível atualizar o estado.'))).finally(() => setLoading(false)); }}>{loading ? 'A atualizar…' : 'Atualizar estado'}</button>
      {user.status === 'ACTIVE' ? <button className="primary-btn" onClick={() => navigate(rolePath(user.role))}>Ir para a minha área →</button> : <button className="primary-btn" onClick={() => { clearSession(); navigate('/login'); }}>Sair e voltar ao login</button>}
    </div>
    <div className="status-account"><strong>{user.name}</strong><span>{user.phone}</span>{user.reviewedAt && <span>Última revisão: {new Date(user.reviewedAt).toLocaleString('pt-AO')}</span>}</div>
  </div></div>;
}
