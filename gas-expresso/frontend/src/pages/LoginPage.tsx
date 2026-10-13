import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AccountRole, clearSession, extractMessage, login, rolePath } from '../services/auth';

const roleLabels: Record<AccountRole, string> = {
  CUSTOMER: 'Cliente',
  DRIVER: 'Entregador',
  SUPPLIER: 'Empresa',
  PRESTADOR: 'Prestador',
  ADMIN: 'Administrador',
};

const roleIcons: Record<AccountRole, string> = {
  CUSTOMER: '👤',
  DRIVER: '🚚',
  SUPPLIER: '🏪',
  PRESTADOR: '🧰',
  ADMIN: '🔐',
};

const roleRegisterSlug: Record<AccountRole, string | null> = {
  CUSTOMER: 'customer',
  DRIVER: 'driver',
  SUPPLIER: null, // perfil Empresa retirado das opções públicas
  PRESTADOR: 'prestador',
  ADMIN: null,
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get('role')?.toUpperCase() as AccountRole | undefined;
  const validRequested = requestedRole && requestedRole in roleLabels ? requestedRole : undefined;
  const [role, setRole] = useState<AccountRole>(validRequested ?? 'CUSTOMER');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (phone.replace(/\D/g, '').length < 6 || password.length < 8) {
      setError('Introduza um telefone válido e uma senha com pelo menos 8 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      const session = await login({ phone, password, role });
      if (session.user.role !== role) {
        clearSession();
        setError(`Esta conta pertence à área de ${roleLabels[session.user.role].toLowerCase()}.`);
        return;
      }
      const requestedPath = (location.state as { from?: unknown } | null)?.from;
      const destination = typeof requestedPath === 'string' && requestedPath.startsWith('/') ? requestedPath : rolePath(role);
      navigate(session.user.status === 'ACTIVE' ? destination : '/estado-candidatura', { replace: true });
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível iniciar sessão.'));
    } finally { setSubmitting(false); }
  }

  const publicRoles = (Object.keys(roleLabels) as AccountRole[]).filter(item => item !== 'SUPPLIER');
  const visibleRoles = publicRoles.filter(item => item !== 'ADMIN' || validRequested === 'ADMIN');
  const registerTarget = roleRegisterSlug[role];

  return <div className="page auth-page"><div className="auth-shell"><section className="auth-intro"><span className="section-kicker">Acesso seguro</span><h1>Entre no Gás Expresso.</h1><p>O sistema mantém uma experiência própria para Cliente, Entregador, Prestador e Administração.</p><div className="auth-points"><span>✓ Cliente: pedidos e rastreio</span><span>✓ Entregador: operação, pedidos e ganhos</span><span>✓ Prestador: empresa parceira de entregas</span><span>✓ Admin: área restrita</span></div></section><form className="auth-card" onSubmit={handleSubmit}><div className="auth-card-head"><div><span className="section-kicker">Entrar</span><h2>Selecione o seu perfil</h2></div><span className="auth-badge">Sessão protegida</span></div><div className="role-switch" role="tablist" aria-label="Perfil">{visibleRoles.map(item => <button key={item} type="button" className={role===item?'role-option active':'role-option'} onClick={()=>setRole(item)}>{roleIcons[item]}<span>{roleLabels[item]}</span></button>)}</div><div className="form-grid"><div className="field"><label htmlFor="login-phone">Telefone</label><input id="login-phone" className="input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+244 9XX XXX XXX" autoComplete="tel" /></div><div className="field"><label htmlFor="login-password">Senha</label><input id="login-password" className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" /></div></div>{error&&<div className="form-error" role="alert">{error}</div>}<button className="primary-btn full" type="submit" disabled={submitting}>{submitting?'A entrar…':`Entrar como ${roleLabels[role]}`} {!submitting&&<span>→</span>}</button>{registerTarget && <div style={{marginTop:'1rem',textAlign:'center',fontSize:'0.9rem',color:'var(--muted)'}}><span>Não tem conta? </span><Link to={`/registar/${registerTarget}`} style={{color:'var(--brand)',fontWeight:600}}>Registar como {roleLabels[role].toLowerCase()} →</Link></div>}<p className="auth-footnote">O servidor determina o papel, estado da conta e permissões. Contas profissionais só operam quando elegíveis.</p><Link to="/acesso" className="back-link">← Voltar para escolher perfil</Link></form></div></div>;
}
