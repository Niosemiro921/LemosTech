import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, rolePath } from '../services/auth';
import { LogoutButton } from './LogoutButton';

const labels = { CUSTOMER: 'Minha conta', DRIVER: 'Operação', SUPPLIER: 'Fornecedor', PRESTADOR: 'Prestador', ADMIN: 'Administração' } as const;

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = getCurrentUser();
  const customer = user?.role === 'CUSTOMER';
  const accountPath = user ? rolePath(user.role) : '/acesso';
  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => { document.body.style.overflow = menuOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [menuOpen]);

  const profileLabel = user ? labels[user.role] : 'Entrar';
  const close = () => setMenuOpen(false);

  return <>
    <header className="topbar">
      <Link to="/" className="brand" aria-label="Gás Expresso — início"><span className="brand-mark">GE</span><span className="brand-copy"><span>GÁS <strong>EXPRESSO</strong></span><small>ENTREGA DE GÁS · ANGOLA</small></span></Link>
      <nav className="desktop-nav" aria-label="Navegação principal">
        <Link className={location.pathname === '/' ? 'active' : ''} to="/">Início</Link>
        {customer && <><Link className={location.pathname.startsWith('/pedir') ? 'active' : ''} to="/pedir">Pedir gás</Link><Link className={location.pathname.startsWith('/rastrear') ? 'active' : ''} to="/rastrear">Rastrear</Link></>}
        {user && <Link className={location.pathname === accountPath || location.pathname.startsWith(`${accountPath}/`) ? 'active' : ''} to={accountPath}>{profileLabel}</Link>}
        {user?.role === 'ADMIN' && <Link className={location.pathname.startsWith('/admin') ? 'active' : ''} to="/admin">Backoffice</Link>}
        {!user && <Link className={location.pathname === '/acesso' ? 'active' : ''} to="/acesso">Áreas</Link>}
      </nav>
      <div className="header-actions">
        {user ? (
          <>
            <button className="header-user-chip" type="button" onClick={() => navigate(accountPath)}>
              <span className="header-user-avatar">{(user.name ?? 'GE').split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()}</span>
              <span className="header-user-copy"><strong>{user.name ?? profileLabel}</strong><small>{profileLabel}</small></span>
            </button>
            <LogoutButton className="header-logout-btn" label="Terminar sessão" />
          </>
        ) : (
          <>
            <Link to="/login" className="header-login">Entrar</Link>
            <Link to="/registar/customer" className="header-cta">Criar conta</Link>
          </>
        )}
        {customer && <Link to="/pedir" className="header-cta">Pedir gás</Link>}
        <button className={`mobile-menu-trigger ${menuOpen ? 'is-open' : ''}`} type="button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}><span/><span/><span/></button>
      </div>
    </header>
    {menuOpen && <><button className="mobile-menu-backdrop" type="button" aria-label="Fechar menu" onClick={close}/><aside className="mobile-site-menu" id="mobile-site-menu"><div className="mobile-menu-head"><div><span className="section-kicker">Navegação</span><h2>Gás Expresso</h2><small>{user ? `${profileLabel} · sessão activa` : 'Plataforma de entrega de gás'}</small></div><button type="button" className="mobile-menu-close" onClick={close}>×</button></div><nav className="mobile-menu-links"><Link to="/" onClick={close}>Início <span>→</span></Link>{customer && <><Link to="/pedir" onClick={close}>Pedir gás <span>→</span></Link><Link to="/rastrear" onClick={close}>Rastrear pedido <span>→</span></Link><Link to="/enderecos" onClick={close}>Endereços <span>→</span></Link></>}{user && <Link to={accountPath} onClick={close}>{profileLabel} <span>→</span></Link>}{user?.role === 'ADMIN' && <Link to="/admin" onClick={close}>Backoffice <span>→</span></Link>}{!user && <Link to="/acesso" onClick={close}>Áreas profissionais <span>→</span></Link>}</nav><div className="mobile-menu-footer">{user ? <LogoutButton /> : <Link to="/login" className="primary-btn full" onClick={close}>Entrar na plataforma</Link>}</div></aside></>}
  </>;
}
