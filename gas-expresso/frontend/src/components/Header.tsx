import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function Header() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = location.pathname === '/';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Gás Expresso — início">
          <span className="brand-mark">GE</span>
          <span className="brand-copy">
            <span>GÁS <strong>EXPRESSO</strong></span>
            <small>ENTREGA DE GÁS</small>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="Navegação principal">
          <Link className={isHome ? 'active' : ''} to="/">Início</Link>
          <Link to="/pedir">Pedir gás</Link>
          <Link to="/rastrear">Rastrear</Link>
          <Link to="/perfil">Minha conta</Link>
          <Link to="/acesso">Áreas</Link>
        </nav>

        <div className="header-actions">
          <Link to="/acesso" className="header-login">Entrar</Link>
          <Link to="/pedir" className="header-cta">Pedir gás</Link>
          <button
            className={`mobile-menu-trigger ${menuOpen ? 'is-open' : ''}`}
            type="button"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-site-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </header>

      {menuOpen && (
        <>
          <button className="mobile-menu-backdrop" type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />
          <aside id="mobile-site-menu" className="mobile-site-menu" aria-label="Menu móvel">
            <div className="mobile-menu-head">
              <div>
                <span className="section-kicker">Navegação</span>
                <h2>Gás Expresso</h2>
              </div>
              <button type="button" className="mobile-menu-close" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}>×</button>
            </div>

            <nav className="mobile-menu-links">
              <Link to="/">Início <span>→</span></Link>
              <Link to="/pedir">Pedir gás <span>→</span></Link>
              <Link to="/rastrear">Rastrear pedido <span>→</span></Link>
              <Link to="/perfil">Minha conta <span>→</span></Link>
              <Link to="/acesso">Áreas profissionais <span>→</span></Link>
            </nav>

            <div className="mobile-menu-footer">
              <Link to="/acesso" className="secondary-btn full">Entrar na plataforma</Link>
              <Link to="/pedir" className="primary-btn full">Pedir gás agora</Link>
              <small>Cliente, entregador e fornecedor numa só plataforma.</small>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
