import { Link, useNavigate } from 'react-router-dom';
import { clearSession, getSession, rolePath } from '../services/auth';

export default function ApplicationStatusPage() {
  const navigate = useNavigate();
  const session = getSession();
  const label = session?.role === 'DRIVER' ? 'entregador' : 'fornecedor';

  return (
    <div className="page auth-page">
      <div className="status-page-card">
        <div className="status-hero-icon">✓</div>
        <span className="section-kicker">Candidatura recebida</span>
        <h1>Estamos a analisar o seu cadastro.</h1>
        <p>O seu perfil de {label} foi criado, mas ainda não está autorizado a operar. Depois da validação, o estado da conta será atualizado.</p>
        <div className="status-steps">
          <div className="status-step done"><span>1</span><div><strong>Cadastro enviado</strong><small>Recebemos os seus dados.</small></div></div>
          <div className="status-step current"><span>2</span><div><strong>Em análise</strong><small>Verificação da documentação e do perfil.</small></div></div>
          <div className="status-step"><span>3</span><div><strong>Conta aprovada</strong><small>Você poderá entrar no ambiente operacional.</small></div></div>
        </div>
        <div className="status-actions">
          <Link to="/" className="secondary-btn">Voltar ao início</Link>
          <button className="primary-btn" onClick={() => { clearSession(); navigate('/login'); }}>Sair e voltar ao login</button>
        </div>
        {session && <div className="status-account"><strong>{session.name}</strong><span>{session.phone}</span></div>}
      </div>
    </div>
  );
}
