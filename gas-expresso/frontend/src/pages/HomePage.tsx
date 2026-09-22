import { Link } from 'react-router-dom';
import { MapPreview } from '../components/MapPreview';

const benefits = [
  { icon: '⚡', title: 'Entrega rápida', text: 'Peça agora e acompanhe o percurso até à sua porta.' },
  { icon: '🛡', title: 'Parceiros verificados', text: 'Trabalhamos com fornecedores e entregadores validados.' },
  { icon: '📍', title: 'Localização em tempo real', text: 'Use a sua localização para encontrar cobertura perto de si.' },
];

const steps = [
  ['01', 'Escolha o gás', 'Selecione a capacidade e a quantidade que precisa.'],
  ['02', 'Confirme o local', 'Indique onde quer receber ou use a sua localização.'],
  ['03', 'Acompanhe a entrega', 'Saiba quem está a entregar e acompanhe o pedido.'],
];

function PinIcon() {
  return <span className="icon-chip" aria-hidden="true">⌖</span>;
}

export default function HomePage() {
  return (
    <div className="page home-page">
      <section className="hero home-hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="live-dot" /> Entrega de gás em Angola</span>
          <h1>Gás quando precisa.<br /><span>Na sua porta.</span></h1>
          <p className="hero-lead">
            Encontre gás perto de si, escolha como receber e acompanhe a entrega do início ao fim.
          </p>

          <div className="hero-actions">
            <Link to="/pedir" className="primary-btn primary-btn-lg">Pedir gás agora <span>→</span></Link>
            <Link to="/rastrear" className="secondary-btn">Rastrear pedido</Link>
          </div>

          <div className="hero-trust" aria-label="Garantias">
            <span>✓ Preço transparente</span>
            <span>✓ Parceiros verificados</span>
            <span>✓ Acompanhamento</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="map-shell">
            <MapPreview />
            <div className="map-search-card">
              <div className="map-search-icon"><PinIcon /></div>
              <div>
                <small>A sua localização</small>
                <strong>Defina onde quer receber</strong>
              </div>
              <Link to="/pedir" className="map-search-action" aria-label="Definir localização">→</Link>
            </div>
            <div className="map-status-card">
              <span className="status-dot" />
              <div><strong>Entrega disponível</strong><small>Encontre parceiros na sua zona</small></div>
            </div>
          </div>
        </div>
      </section>

      <section className="location-cta" aria-label="Começar pedido">
        <div className="location-cta-icon"><PinIcon /></div>
        <div>
          <span className="section-kicker">Comece por aqui</span>
          <h2>Quer receber gás onde está?</h2>
          <p>Defina a localização e veja as opções disponíveis na sua zona.</p>
        </div>
        <Link to="/pedir" className="primary-btn">Usar minha localização <span>→</span></Link>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Por que Gás Expresso?</span>
            <h2>Uma experiência simples de ponta a ponta.</h2>
          </div>
          <p>Menos chamadas. Menos espera. Mais controlo sobre a sua entrega.</p>
        </div>

        <div className="highlights-grid">
          {benefits.map((item) => (
            <article className="info-card feature-card" key={item.title}>
              <div className="info-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section how-section">
        <div className="section-heading compact">
          <div>
            <span className="section-kicker">Como funciona</span>
            <h2>Do pedido à porta, sem complicação.</h2>
          </div>
          <Link to="/pedir" className="soft-link">Fazer pedido →</Link>
        </div>

        <div className="steps-grid">
          {steps.map(([number, title, text]) => (
            <article className="step-card-public" key={number}>
              <span className="step-number-public">{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="split-section home-final-section">
        <div className="dark-panel">
          <span className="section-kicker light">Feito para crescer em Angola</span>
          <h2>Uma rede que aproxima clientes, parceiros e entregadores.</h2>
          <p>O Gás Expresso nasceu para tornar a compra e a entrega de gás mais simples, previsível e acompanhável.</p>
          <Link to="/pedir" className="light-btn">Começar pedido <span>→</span></Link>
        </div>
        <div className="white-panel final-stats">
          <div className="mini-stat"><strong>6 KG</strong><span>Capacidade disponível</span></div>
          <div className="mini-stat"><strong>12 KG</strong><span>Opção mais procurada</span></div>
          <div className="mini-stat"><strong>45 KG</strong><span>Para maior consumo</span></div>
        </div>
      </section>
    </div>
  );
}
