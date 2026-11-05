import { NavLink, Outlet } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';
import { LogoutButton } from './LogoutButton';

type ShellModule = { to: string; label: string; icon: string; end?: boolean };
type ShellSection = { title: string; items: ShellModule[] };

const sections: ShellSection[] = [
  {
    title: 'Visão geral',
    items: [
      { to: '/fornecedor', label: 'Dashboard', icon: '⌂', end: true },
      { to: '/fornecedor/relatorios', label: 'Relatórios e análises', icon: '▥' },
    ],
  },
  {
    title: 'Operacional',
    items: [
      { to: '/fornecedor/pedidos', label: 'Pedidos e vendas', icon: '⇄' },
      { to: '/fornecedor/entregas', label: 'Entregas e logística', icon: '➤' },
      { to: '/fornecedor/produtos', label: 'Produtos e serviços', icon: '◈' },
      { to: '/fornecedor/botijas', label: 'Gestão de botijas', icon: '⛁' },
      { to: '/fornecedor/stock', label: 'Stock e armazéns', icon: '▤' },
      { to: '/fornecedor/compras', label: 'Compras e aprovisionamento', icon: '⇑' },
    ],
  },
  {
    title: 'Comercial',
    items: [
      { to: '/fornecedor/clientes', label: 'Clientes e CRM', icon: '☷' },
      { to: '/fornecedor/fornecedores', label: 'Fornecedores', icon: '☶' },
      { to: '/fornecedor/vendas', label: 'Vendas', icon: '∑' },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { to: '/fornecedor/faturacao', label: 'Faturação e documentos', icon: '¶' },
      { to: '/fornecedor/receber', label: 'Contas a receber', icon: '↓' },
      { to: '/fornecedor/pagar', label: 'Contas a pagar', icon: '↑' },
      { to: '/fornecedor/despesas', label: 'Despesas', icon: '￿' },
      { to: '/fornecedor/financeiro', label: 'Finanças', icon: 'Kz' },
    ],
  },
  {
    title: 'Control',
    items: [
      { to: '/fornecedor/relatorios', label: 'Relatórios', icon: '▥' },
      { to: '/fornecedor/auditoria', label: 'Auditoria', icon: '☰' },
      { to: '/fornecedor/importar', label: 'Importar dados', icon: '⇪' },
    ],
  },
];

const accountNav = [
  { to: '/fornecedor/perfil', label: 'Definições da empresa', icon: '⚙' },
  { to: '/fornecedor/assinatura', label: 'Assinatura e pagamentos', icon: 'Kz' },
  { to: '/empresa/equipa', label: 'Colaboradores e permissões', icon: '☺' },
  { to: '/empresa/documentos', label: 'Documentos', icon: '☰' },
  { to: '/fornecedor/horarios', label: 'Horários', icon: '□' },
];

export function SupplierShell() {
  const user = getCurrentUser();
  const initials = (user?.name ?? 'FO').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="supplier-app-shell">
      <aside className="supplier-sidebar">
        <div className="supplier-sidebar-brand">
          <span className="brand-mark">GE</span>
          <div><strong>GÁS EXPRESSO</strong><small>PORTAL DO FORNECEDOR</small></div>
        </div>
        <div className="supplier-user-chip"><span className="header-user-avatar">{initials}</span><div><strong>{user?.name ?? 'Fornecedor'}</strong><small>Conta operacional</small></div></div>
        <nav className="supplier-side-nav" aria-label="Módulos do ERP">
          {sections.map((section) => (
            <div key={section.title}>
              <span className="side-nav-title">{section.title}</span>
              {section.items.map((item) => <NavLink key={item.to} to={item.to} end={item.end}><span>{item.icon}</span>{item.label}</NavLink>)}
            </div>
          ))}
          <span className="side-nav-title">Conta</span>
          {accountNav.map((item) => <NavLink key={item.to} to={item.to}><span>{item.icon}</span>{item.label}</NavLink>)}
          <NavLink to="/suporte"><span>?</span>Suporte</NavLink>
        </nav>
        <div className="supplier-sidebar-footer"><LogoutButton /></div>
      </aside>
      <main className="supplier-workspace"><Outlet /></main>
    </div>
  );
}
