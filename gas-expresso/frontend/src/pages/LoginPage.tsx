import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AccountRole, createDemoUser, rolePath, saveSession } from '../services/auth';

const roleLabels: Record<AccountRole, string> = {
  CUSTOMER: 'Cliente',
  DRIVER: 'Entregador',
  SUPPLIER: 'Fornecedor',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<AccountRole>('CUSTOMER');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (phone.replace(/\D/g, '').length < 9 || password.length < 4) {
      setError('Preencha um telefone válido e uma senha com pelo menos 4 caracteres.');
      return;
    }
    const user = createDemoUser({
      name: role === 'CUSTOMER' ? 'Cliente Gás Expresso' : role === 'DRIVER' ? 'Entregador Gás Expresso' : 'Fornecedor Gás Expresso',
      phone,
      role,
      status: role === 'CUSTOMER' ? 'ACTIVE' : 'PENDING_REVIEW',
    });
    saveSession(user);
    navigate(rolePath(role));
  }

  return (
    <div className="page auth-page">
      <div className="auth-shell">
        <section className="auth-intro">
          <span className="section-kicker">Acesso seguro</span>
          <h1>Entre no Gás Expresso.</h1>
          <p>Uma conta para cada experiência. O acesso operacional depende do perfil e do estado da conta.</p>
          <div className="auth-points">
            <span>✓ Cliente: pedidos e rastreio</span>
            <span>✓ Entregador: entregas e ganhos</span>
            <span>✓ Fornecedor: pedidos e stock</span>
          </div>
        </section>

        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-card-head">
            <div>
              <span className="section-kicker">Entrar</span>
              <h2>Selecione o seu perfil</h2>
            </div>
            <span className="auth-badge">Demo UX</span>
          </div>

          <div className="role-switch" role="tablist" aria-label="Perfil">
            {(Object.keys(roleLabels) as AccountRole[]).map((item) => (
              <button key={item} type="button" className={role === item ? 'role-option active' : 'role-option'} onClick={() => setRole(item)}>
                {item === 'CUSTOMER' ? '👤' : item === 'DRIVER' ? '🚚' : '🏪'}
                <span>{roleLabels[item]}</span>
              </button>
            ))}
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="login-phone">Telefone</label>
              <input id="login-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+244 9XX XXX XXX" autoComplete="tel" />
            </div>
            <div className="field">
              <label htmlFor="login-password">Senha</label>
              <input id="login-password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}
          <button className="primary-btn full" type="submit">Entrar como {roleLabels[role]} <span>→</span></button>
          <p className="auth-footnote">Nesta fase o login é simulado localmente. A autenticação real entrará com o backend.</p>
          <Link to="/acesso" className="back-link">← Voltar para escolher perfil</Link>
        </form>
      </div>
    </div>
  );
}
