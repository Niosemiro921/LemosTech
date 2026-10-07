import { NavLink } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';

function itemsForRole() {
  const role = getCurrentUser()?.role;
  switch (role) {
    case 'DRIVER':
      return [
        { to: '/driver', icon: '⌂', label: 'Início' },
        { to: '/driver/pedidos', icon: '⇄', label: 'Pedidos' },
        { to: '/driver/saldo', icon: 'Kz', label: 'Carteira' },
        { to: '/driver/ganhos', icon: '↕', label: 'Histórico' },
        { to: '/driver/perfil', icon: '○', label: 'Perfil' },
      ];
    case 'SUPPLIER':
      return [
        { to: '/fornecedor', icon: '⌂', label: 'Início' },
        { to: '/fornecedor/pedidos', icon: '⇄', label: 'Pedidos' },
        { to: '/fornecedor/stock', icon: '▤', label: 'Stock' },
        { to: '/fornecedor/relatorios', icon: '▥', label: 'Relatórios' },
        { to: '/empresa/documentos', icon: '○', label: 'Conta' },
      ];
    case 'ADMIN':
      return [
        { to: '/admin', icon: '⌂', label: 'Início' },
        { to: '/admin/orders', icon: '⇄', label: 'Pedidos' },
        { to: '/admin/dispatch', icon: '◎', label: 'Dispatch' },
        { to: '/admin/partners', icon: '○', label: 'Parceiros' },
        { to: '/admin', icon: '▦', label: 'Admin' },
      ];
    default:
      return [
        { to: '/perfil', icon: '⌂', label: 'Início' },
        { to: '/pedir', icon: '+', label: 'Pedir gás' },
        { to: '/rastrear', icon: '◎', label: 'Rastrear' },
        { to: '/enderecos', icon: '⌖', label: 'Endereços' },
        { to: '/perfil', icon: '○', label: 'Perfil' },
      ];
  }
}

export function BottomNav() {
  return <nav className="bottom-nav" aria-label="Navegação principal">{itemsForRole().map(item => <NavLink key={`${item.to}-${item.label}`} to={item.to} className={({isActive}) => isActive ? 'bottom-nav-item active' : 'bottom-nav-item'}><span>{item.icon}</span><small>{item.label}</small></NavLink>)}</nav>;
}
