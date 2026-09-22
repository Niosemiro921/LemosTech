import { NavLink } from 'react-router-dom';

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegação móvel">
      <NavLink to="/" end><span>⌂</span><small>Início</small></NavLink>
      <NavLink to="/pedir"><span>＋</span><small>Pedir</small></NavLink>
      <NavLink to="/rastrear"><span>◉</span><small>Rastrear</small></NavLink>
      <NavLink to="/perfil"><span>○</span><small>Conta</small></NavLink>
    </nav>
  );
}
