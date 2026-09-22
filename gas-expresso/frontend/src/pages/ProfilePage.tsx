import { Link } from 'react-router-dom';
import { useOrderStore } from '../stores/orderStore';
import { calculateQuote } from '../services/pricing';
import { formatAOA } from '../services/catalog';
import { getDispatchSnapshot } from '../services/dispatch';

export default function ProfilePage() {
  const { selectedProduct, quantity, address, deliveryType } = useOrderStore();
  const quote = selectedProduct ? calculateQuote({ product: selectedProduct, quantity, deliveryType, distanceKm: null }) : null;
  const dispatch = getDispatchSnapshot('GE-000124', 18);

  return (
    <div className="page profile-page">
      <section className="profile-hero">
        <div className="profile-identity">
          <div className="profile-avatar profile-avatar-large">NL</div>
          <div>
            <span className="section-kicker">Área do cliente</span>
            <h1>Minha conta</h1>
            <p>Tenha pedidos, endereços e a sua atividade no Gás Expresso sempre à mão.</p>
          </div>
        </div>
        <div className="profile-status-chip"><span className="live-dot" /> Conta ativa</div>
      </section>

      <section className="profile-stats" aria-label="Resumo da conta">
        <article className="profile-stat-card">
          <span className="profile-stat-icon">⌁</span>
          <div><small>Pedidos concluídos</small><strong>12</strong><span>neste histórico</span></div>
        </article>
        <article className="profile-stat-card">
          <span className="profile-stat-icon">★</span>
          <div><small>Experiência</small><strong>4,9</strong><span>avaliação média</span></div>
        </article>
        <article className="profile-stat-card accent">
          <span className="profile-stat-icon">⚡</span>
          <div><small>Último pedido</small><strong>{quote ? formatAOA(quote.total) : '—'}</strong><span>{quote ? 'estimativa atual' : 'faça o seu próximo pedido'}</span></div>
        </article>
      </section>

      <section className="profile-main-grid">
        <div className="profile-main-column">
          <article className="profile-panel">
            <div className="profile-panel-head">
              <div><span className="section-kicker">Acesso rápido</span><h2>O que quer fazer?</h2></div>
            </div>
            <div className="profile-quick-grid">
              <Link to="/pedir" className="profile-action-card primary-action">
                <span className="profile-action-icon">+</span>
                <div><strong>Pedir gás</strong><small>Começar um novo pedido em poucos passos.</small></div>
                <span className="profile-arrow">→</span>
              </Link>
              <Link to="/rastrear" className="profile-action-card">
                <span className="profile-action-icon">⌖</span>
                <div><strong>Rastrear pedido</strong><small>Veja o estado da sua entrega em tempo real.</small></div>
                <span className="profile-arrow">→</span>
              </Link>
              <Link to="/acesso" className="profile-action-card">
                <span className="profile-action-icon">▦</span>
                <div><strong>Outras áreas</strong><small>Aceder às áreas de entregador e fornecedor.</small></div>
                <span className="profile-arrow">→</span>
              </Link>
            </div>
          </article>

          <article className="profile-panel">
            <div className="profile-panel-head">
              <div><span className="section-kicker">Atividade</span><h2>Pedido mais recente</h2></div>
              <Link to="/rastrear" className="soft-link">Ver rastreio</Link>
            </div>
            <div className="recent-order-card">
              <div className="recent-order-product">
                <div className="cylinder small">GÁS</div>
                <div><strong>{quantity || 1} × {selectedProduct?.label ?? 'Botija 12 KG'}</strong><span>{address?.address ?? 'Luanda, Angola'}</span></div>
              </div>
              <div className="recent-order-status">
                <span className="status-pill"><span className="live-dot" /> {dispatch.title}</span>
                <strong>{quote ? formatAOA(quote.total) : '9.300 Kz'}</strong>
              </div>
            </div>
          </article>
        </div>

        <aside className="profile-side-column">
          <article className="profile-panel profile-contact-panel">
            <div className="profile-panel-head"><div><span className="section-kicker">Perfil</span><h2>Dados da conta</h2></div></div>
            <div className="profile-info-list">
              <div><span>Nome</span><strong>Cliente Gás Expresso</strong></div>
              <div><span>Telefone</span><strong>+244 ••• ••• •••</strong></div>
              <div><span>Email</span><strong>Não definido</strong></div>
              <div><span>Endereço principal</span><strong>{address?.address ?? 'Ainda não definido'}</strong></div>
            </div>
            <button className="secondary-btn full" type="button">Editar dados</button>
          </article>

          <article className="profile-panel profile-help-panel">
            <span className="profile-help-icon">?</span>
            <div><strong>Precisa de ajuda?</strong><p>A nossa equipa poderá acompanhar pedidos, entregas e ocorrências.</p></div>
            <Link to="/" className="text-link">Falar com suporte →</Link>
          </article>
        </aside>
      </section>
    </div>
  );
}
