import { NavLink, Outlet } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';
import { LogoutButton } from './LogoutButton';

const modules = [
  { to: '/fornecedor', label: 'Dashboard', icon: '⌂', end: true },
  { to: '/fornecedor/stock', label: 'Stock', icon: '▤' },
  { to: '/fornecedor/lotes', label: 'Lotes de produção', icon: '◫' },
  { to: '/fornecedor/pedidos', label: 'Pedidos e entregas', icon: '⇄' },
  { to: '/fornecedor/financeiro', label: 'Financeiro', icon: 'Kz' },
];
const crm = [
  { to: '/fornecedor/clientes', label: 'Clientes', icon: '○' },
  { to: '/fornecedor/interacoes', label: 'Contactos e interações', icon: '□' },
  { to: '/fornecedor/segmentacao', label: 'Segmentação', icon: '⌁' },
  { to: '/fornecedor/relatorios', label: 'Relatórios', icon: '▥' },
];

export function SupplierShell() {
  const user = getCurrentUser();
  return (
    <div className="supplier-app-shell">
      <aside className="supplier-sidebar">
        <div className="supplier-sidebar-brand">
          <span className="brand-mark">GE</span>
          <div><strong>GÁS EXPRESSO</strong><small>PORTAL DO FORNECEDOR</small></div>
        </div>
        <div className="supplier-user-chip"><span className="header-user-avatar">{(user?.name ?? 'FO').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</span><div><strong>{user?.name ?? 'Fornecedor'}</strong><small>Conta operacional</small></div></div>
        <nav className="supplier-side-nav" aria-label="Módulos do fornecedor">
          <span className="side-nav-title">ERP</span>
          {modules.map((item) => <NavLink key={item.to} to={item.to} end={item.end}><span>{item.icon}</span>{item.label}</NavLink>)}
          <span className="side-nav-title">CRM</span>
          {crm.map((item) => <NavLink key={item.to} to={item.to}><span>{item.icon}</span>{item.label}</NavLink>)}
          <span className="side-nav-title">Conta</span>
          <NavLink to="/empresa/documentos"><span>DOC</span>Documentos</NavLink>
          <NavLink to="/empresa/equipa"><span>EQ</span>Equipa</NavLink>
          <NavLink to="/empresa/horarios"><span>HX</span>Horários</NavLink>
          <NavLink to="/suporte"><span>?</span>Suporte</NavLink>
        </nav>
        <div className="supplier-sidebar-footer"><LogoutButton /></div>
      </aside>
      <main className="supplier-workspace"><Outlet /></main>
    </div>
  );
}
