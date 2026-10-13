import { NavLink, Outlet } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';
import { LogoutButton } from './LogoutButton';

const erp = [
  { to: '/fornecedor', label: 'Visão geral', icon: '⌂', end: true },
  { to: '/fornecedor/pedidos', label: 'Pedidos', icon: '↔' },
  { to: '/fornecedor/stock', label: 'Stock', icon: '▤' },
  { to: '/fornecedor/localizacao', label: 'Localização', icon: '⌖' },
  { to: '/fornecedor/lotes', label: 'Lotes de produção', icon: '◫' },
  { to: '/fornecedor/financeiro', label: 'Financeiro', icon: 'Kz' },
];
const crm = [
  { to: '/fornecedor/clientes', label: 'Clientes', icon: '○' },
  { to: '/fornecedor/interacoes', label: 'Interações', icon: '□' },
  { to: '/fornecedor/segmentacao', label: 'Segmentação', icon: '⌁' },
  { to: '/fornecedor/relatorios', label: 'Relatórios', icon: '▥' },
];
const account = [
  { to: '/fornecedor/perfil', label: 'Perfil da empresa', icon: 'ME' },
  { to: '/empresa/documentos', label: 'Documentos', icon: 'DOC' },
  { to: '/empresa/equipa', label: 'Equipa', icon: 'EQ' },
  { to: '/empresa/horarios', label: 'Horários', icon: 'HX' },
];

function SideLinks({ items }: { items: typeof erp }) {
  return <>{items.map((item) => <NavLink key={item.to} to={item.to} end={item.end}><span aria-hidden="true">{item.icon}</span>{item.label}</NavLink>)}</>;
}

export function SupplierShell() {
  const user = getCurrentUser();
  const initials = (user?.name ?? 'GE').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  return <div className="supplier-app-shell">
    <aside className="supplier-sidebar">
      <NavLink to="/fornecedor" className="supplier-sidebar-brand" aria-label="Portal da empresa — início"><span className="brand-mark">GE</span><div><strong>GÁS EXPRESSO</strong><small>PORTAL DA EMPRESA</small></div></NavLink>
      <div className="supplier-user-chip"><span className="header-user-avatar">{initials}</span><div><strong>{user?.name || 'Conta empresarial'}</strong><small>Portal comercial · {user?.status === 'ACTIVE' ? 'Activa' : user?.status === 'PENDING_REVIEW' ? 'Em análise' : user?.status ?? 'Sessão autenticada'}</small></div></div>
      <nav className="supplier-side-nav" aria-label="Módulos da empresa">
        <span className="side-nav-title">ERP · Operação</span><SideLinks items={erp}/>
        <span className="side-nav-title">CRM · Clientes</span><SideLinks items={crm}/>
        <span className="side-nav-title">Empresa · Conta</span><SideLinks items={account}/>
        <NavLink to="/suporte"><span>?</span>Ajuda e suporte</NavLink>
      </nav>
      <div className="supplier-sidebar-footer"><LogoutButton label="Terminar sessão"/></div>
    </aside>
    <main className="supplier-workspace"><Outlet/></main>
  </div>;
}
