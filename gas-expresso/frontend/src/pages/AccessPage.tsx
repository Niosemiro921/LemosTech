import { Link } from 'react-router-dom';

const profiles = [
  { icon: '01', title: 'Cliente', description: 'Peça gás, veja o preço antes de confirmar, acompanhe a entrega e consulte o histórico.', login: '/login?role=customer', action: 'Entrar como cliente', register: '/registar/customer', registerLabel: 'Criar conta de cliente', tone: 'orange' },
  { icon: '02', title: 'Entregador', description: 'Candidate-se com os seus documentos, aguarde a validação e depois receba ofertas reais.', login: '/login?role=driver', action: 'Área do entregador', register: '/registar/driver', registerLabel: 'Candidatar-me como entregador', tone: 'dark' },
  { icon: '03', title: 'Empresa / Fornecedor', description: 'Registe a empresa comercial, NIF e responsável. Após aprovação, gira pedidos, stock, localização e horários.', login: '/login?role=supplier', action: 'Entrar no portal da empresa', register: '/registar/supplier', registerLabel: 'Registar empresa', tone: 'light' },
  { icon: '04', title: 'Admin', description: 'Backoffice restrito para gerir parceiros, aprovações, pedidos, dispatch e auditoria.', login: '/login?role=admin', action: 'Abrir administração', register: null, registerLabel: null, tone: 'admin' },
];

export default function AccessPage() {
  return <div className="page access-page">
    <section className="access-hero"><span className="eyebrow"><span className="live-dot"/> Operação Gás Expresso</span><h1>Uma área certa para cada responsabilidade.</h1><p>Cliente, Entregador, Empresa e Administração têm navegação e permissões próprias. O cadastro empresarial usa o endpoint real de fornecedor do backend.</p></section>
    <section className="access-grid" aria-label="Perfis da plataforma">{profiles.map((profile) => <article className={`access-card ${profile.tone}`} key={profile.title}><div className="access-icon access-number">{profile.icon}</div><span className="access-role">Área {profile.title.toLowerCase()}</span><h2>{profile.title}</h2><p>{profile.description}</p><Link to={profile.login} className="primary-btn access-main-action">{profile.action} <span>→</span></Link>{profile.register && <Link to={profile.register} className="access-secondary-action">{profile.registerLabel}</Link>}</article>)}</section>
    <section className="access-note access-trust-panel"><div><span className="section-kicker">Perfis alinhados ao backend</span><h2>Empresa não é o mesmo que Prestador.</h2><p>Nesta versão, o backend suporta Cliente, Entregador, Empresa/Fornecedor e Admin. O cadastro de Prestador independente será exposto quando existir um endpoint e permissões próprios.</p></div><div className="access-trust-list"><span>✓ Permissões por perfil</span><span>✓ API como fonte de verdade</span><span>✓ Estados de carregamento e erro</span><span>✓ Módulos empresariais separados</span></div></section>
  </div>;
}
