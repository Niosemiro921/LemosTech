import { Link } from 'react-router-dom';

const profiles = [
  {
    icon: '👤',
    title: 'Cliente',
    description: 'Peça gás, acompanhe entregas e consulte o seu histórico.',
    login: '/perfil',
    action: 'Entrar como cliente',
    register: '/pedir',
    registerLabel: 'Criar conta de cliente',
    tone: 'orange',
  },
  {
    icon: '🚚',
    title: 'Entregador',
    description: 'Fique online, receba pedidos e faça as entregas da sua zona.',
    login: '/driver',
    action: 'Entrar na área do entregador',
    register: '/driver',
    registerLabel: 'Quero ser entregador',
    tone: 'dark',
  },
  {
    icon: '🏪',
    title: 'Fornecedor',
    description: 'Receba pedidos, controle o stock e prepare as botijas para recolha.',
    login: '/supplier',
    action: 'Entrar na área do fornecedor',
    register: '/supplier',
    registerLabel: 'Quero ser fornecedor',
    tone: 'soft',
  },
];

export default function AccessPage() {
  return (
    <div className="page access-page">
      <section className="access-hero">
        <span className="eyebrow"><span className="live-dot" /> Plataforma Gás Expresso</span>
        <h1>Escolha como quer usar o Gás Expresso.</h1>
        <p>Cliente, entregador ou fornecedor: cada perfil tem o seu próprio ambiente e fluxo de trabalho.</p>
      </section>

      <section className="access-grid" aria-label="Perfis da plataforma">
        {profiles.map((profile) => (
          <article className={`access-card ${profile.tone}`} key={profile.title}>
            <div className="access-icon">{profile.icon}</div>
            <span className="access-role">Área {profile.title.toLowerCase()}</span>
            <h2>{profile.title}</h2>
            <p>{profile.description}</p>

            <Link to={profile.login} className="primary-btn access-main-action">{profile.action} <span>→</span></Link>
            <Link to={profile.register} className="access-secondary-action">{profile.registerLabel}</Link>
          </article>
        ))}
      </section>

      <section className="access-note">
        <div>
          <span className="section-kicker">Arquitetura</span>
          <h2>Uma plataforma, três experiências.</h2>
          <p>Mais tarde, o backend vai proteger cada área com autenticação e permissões. Nesta fase do frontend, os acessos estão abertos para testarmos toda a operação.</p>
        </div>
        <Link to="/" className="secondary-btn">Voltar ao início</Link>
      </section>
    </div>
  );
}
