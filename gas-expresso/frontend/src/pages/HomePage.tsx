import { Link } from 'react-router-dom';

const benefits = [
  { icon: '⚡', title: 'Pedido com preço antes de confirmar', text: 'A plataforma consulta o servidor para calcular produto, entrega, comissão e disponibilidade.' },
  { icon: '✓', title: 'Rede profissional validada', text: 'Empresas e entregadores passam por um processo de aprovação antes de operar.' },
  { icon: '⌖', title: 'Acompanhamento do pedido', text: 'Depois de confirmar, acompanha o estado da operação e a localização quando disponível.' },
];

const steps = [
  ['01', 'Escolha a botija', 'Selecione a capacidade e a quantidade no catálogo real da plataforma.'],
  ['02', 'Defina o endereço', 'Use a pesquisa, a sua localização ou ajuste o ponto diretamente no mapa.'],
  ['03', 'Confirme e acompanhe', 'Veja o preço calculado, confirme e acompanhe o pedido até à entrega.'],
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
            O Gás Expresso liga clientes, empresas e entregadores numa única operação, com preço e estado confirmados pelo servidor.
          </p>

          <div className="hero-actions">
            <Link to="/pedir" className="primary-btn primary-btn-lg">Pedir gás agora <span>→</span></Link>
            <Link to="/rastrear" className="secondary-btn">Rastrear pedido</Link>
          </div>

          <div className="hero-trust" aria-label="Compromissos da plataforma">
            <span>✓ Preço transparente</span>
            <span>✓ Operação por perfil</span>
            <span>✓ Estados sincronizados</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="home-operation-card">
            <div className="home-operation-head">
              <div>
                <span className="section-kicker">Como funciona</span>
                <h2>Uma operação feita para ser acompanhada.</h2>
              </div>
              <span className="home-operation-badge">API + mapa real</span>
            </div>

            <div className="home-operation-route">
              <div className="home-operation-point">
                <span className="home-operation-icon"><PinIcon /></span>
                <div><strong>Local de entrega</strong><small>Definido no pedido pelo cliente</small></div>
              </div>
              <span className="home-operation-line" />
              <div className="home-operation-point">
                <span className="home-operation-icon success">✓</span>
                <div><strong>Empresa + stock</strong><small>Disponibilidade validada pelo servidor</small></div>
              </div>
              <span className="home-operation-line" />
              <div className="home-operation-point">
                <span className="home-operation-icon dark">→</span>
                <div><strong>Entregador</strong><small>Atribuição e localização durante a operação</small></div>
              </div>
            </div>

            <div className="home-operation-trust">
              <div><strong>Sem preço inventado</strong><span>O valor mostrado vem da cotação da API.</span></div>
              <div><strong>Sem stock fictício</strong><span>A disponibilidade é verificada antes da confirmação.</span></div>
              <div><strong>Sem estado simulado</strong><span>O acompanhamento usa o estado real do pedido.</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="location-cta" aria-label="Começar pedido">
        <div className="location-cta-icon"><PinIcon /></div>
        <div>
          <span className="section-kicker">Comece por aqui</span>
          <h2>Quer receber gás onde está?</h2>
          <p>Defina a localização no pedido e a plataforma verifica a cobertura e o preço da sua entrega.</p>
        </div>
        <Link to="/pedir" className="primary-btn">Definir localização <span>→</span></Link>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Por que Gás Expresso?</span>
            <h2>Uma experiência simples de ponta a ponta.</h2>
          </div>
          <p>Menos chamadas. Menos incerteza. Mais controlo sobre a operação.</p>
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
            <h2>Do pedido à porta, sem atalhos.</h2>
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
          <h2>Uma rede que aproxima clientes, empresas e entregadores.</h2>
          <p>O Gás Expresso organiza a operação desde a cotação até à entrega, sem apresentar informação que não tenha sido confirmada pelo servidor.</p>
          <Link to="/pedir" className="light-btn">Começar pedido <span>→</span></Link>
        </div>
        <div className="white-panel final-stats">
          <div className="mini-stat"><strong>6 KG</strong><span>Formato disponível no catálogo</span></div>
          <div className="mini-stat"><strong>12 KG</strong><span>Formato disponível no catálogo</span></div>
          <div className="mini-stat"><strong>45 KG</strong><span>Formato disponível no catálogo</span></div>
          <small className="home-final-note">A disponibilidade final depende do catálogo e stock devolvidos pelo servidor.</small>
        </div>
      </section>
    </div>
  );
}
