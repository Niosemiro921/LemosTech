import { NavLink } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';

export function BottomNav() {
  const role = getCurrentUser()?.role;
  if (!role || role === 'ADMIN' || role === 'SUPPLIER') return null;
  const items = role === 'CUSTOMER'
    ? [
      { to: '/pedir', label: 'Pedir', icon: '+' },
      { to: '/rastrear', label: 'Rastrear', icon: '⌖' },
      { to: '/perfil', label: 'Perfil', icon: '○' },
    ]
    : [
      { to: '/driver', label: 'Início', icon: '⌂' },
      { to: '/driver/pedidos', label: 'Pedidos', icon: '≡' },
      { to: '/driver/saldo', label: 'Carteira', icon: 'Kz' },
      { to: '/driver/ganhos', label: 'Histórico', icon: '↺' },
      { to: '/driver/perfil', label: 'Perfil', icon: '○' },
    ];
  return <nav className="bottom-nav" aria-label="Navegação rápida">{items.map(item => <NavLink key={item.to} to={item.to} className={({isActive}) => isActive ? 'active bottom-nav-item' : 'bottom-nav-item'}><span>{item.icon}</span><small>{item.label}</small></NavLink>)}</nav>;
}
