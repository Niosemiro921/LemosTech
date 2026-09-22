import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RealMap } from '../components/RealMap';

type DriverStage = 'available' | 'incoming' | 'accepted' | 'pickup' | 'on_route' | 'arrived' | 'completed';

const stageCopy: Record<DriverStage, { title: string; description: string; cta: string }> = {
  available: { title: 'Você está offline', description: 'Fique online para começar a receber pedidos.', cta: 'Ficar online' },
  incoming: { title: 'Novo pedido', description: 'Há uma entrega próxima esperando por você.', cta: 'Aceitar pedido' },
  accepted: { title: 'Pedido aceite', description: 'Dirija-se ao ponto de recolha para buscar a botija.', cta: 'Iniciar recolha' },
  pickup: { title: 'A recolher pedido', description: 'Confirme quando receber a botija do fornecedor.', cta: 'Confirmar recolha' },
  on_route: { title: 'A caminho do cliente', description: 'O cliente já pode acompanhar a sua rota.', cta: 'Marcar como cheguei' },
  arrived: { title: 'Você chegou', description: 'Entregue a botija e confirme a conclusão do pedido.', cta: 'Concluir entrega' },
  completed: { title: 'Entrega concluída', description: 'Excelente. O pedido foi encerrado com sucesso.', cta: 'Voltar a ficar online' },
};

export default function DriverPage() {
  const [online, setOnline] = useState(false);
  const [stage, setStage] = useState<DriverStage>('available');
  const point = useMemo(() => ({ lat: -8.9165, lng: 13.1802 }), []);
  const step = stage === 'available' ? 0 : ['incoming','accepted','pickup','on_route','arrived','completed'].indexOf(stage) + 1;
  const canAct = stage !== 'available' || online;

  const handlePrimary = () => {
    if (stage === 'available') {
      setOnline(true);
      setStage('incoming');
      return;
    }
    if (stage === 'completed') {
      setStage('incoming');
      return;
    }
    const next: Record<Exclude<DriverStage,'available'|'completed'>, DriverStage> = {
      incoming: 'accepted',
      accepted: 'pickup',
      pickup: 'on_route',
      on_route: 'arrived',
      arrived: 'completed',
    };
    setStage(next[stage as keyof typeof next]);
  };

  const toggleOnline = () => {
    if (online) {
      setOnline(false);
      setStage('available');
    } else {
      setOnline(true);
      setStage('incoming');
    }
  };

  return (
    <div className="page driver-page">
      <div className="driver-topbar">
        <div>
          <span className="section-kicker">Painel do entregador</span>
          <h1>Olá, João.</h1>
          <p>Controle suas entregas e acompanhe os seus ganhos.</p>
        </div>
        <button className={`online-toggle ${online ? 'online' : ''}`} onClick={toggleOnline}>
          <span className="status-dot" /> {online ? 'Online' : 'Offline'}
        </button>
      </div>

      <div className="driver-stats-grid">
        <div className="driver-stat"><small>Hoje</small><strong>18.500 Kz</strong><span>Ganhos</span></div>
        <div className="driver-stat"><small>Entregas</small><strong>7</strong><span>Concluídas</span></div>
        <div className="driver-stat"><small>Avaliação</small><strong>4,9 ★</strong><span>Excelente</span></div>
      </div>

      <div className="driver-layout">
        <section className="driver-main-card">
          <div className="driver-card-head">
            <div><span className="section-kicker">Operação</span><h2>{stageCopy[stage].title}</h2><p>{stageCopy[stage].description}</p></div>
            <span className={`driver-stage-badge ${stage === 'completed' ? 'done' : ''}`}>{stage === 'available' ? 'Em espera' : `${Math.max(step, 1)}/6`}</span>
          </div>

          <div className="driver-map-wrap">
            <RealMap value={point} />
            <div className="driver-map-overlay"><strong>Destino</strong><span>Talatona, Luanda</span><small>≈ 6,8 km · 17 min</small></div>
          </div>

          <div className="driver-order-card">
            <div className="driver-order-head"><div><small>Pedido #GE-000124</small><strong>1 × Botija 12 KG</strong></div><span className="order-amount">9.300 Kz</span></div>
            <div className="driver-order-meta"><span>📍 Fornecedor: Viana Central</span><span>🏠 Cliente: Talatona</span><span>💵 Pagamento: na entrega</span></div>
          </div>

          <button className="primary-btn full" onClick={handlePrimary} disabled={!canAct && stage !== 'available'}>{stageCopy[stage].cta}<span>→</span></button>
          {stage !== 'available' && <Link className="secondary-btn full" to="/driver/pedido/GE-000124">Abrir página completa do pedido</Link>}
          <p className="demo-note">Fluxo visual de protótipo. No backend real, cada mudança será autorizada pelo estado do pedido e pela API de dispatch.</p>
        </section>

        <aside className="driver-side">
          <div className="driver-profile-card">
            <div className="driver-avatar large">JM</div>
            <div><strong>João Manuel</strong><small>Entregador verificado</small><span>★ 4,9 · 328 entregas</span></div>
          </div>
          <div className="driver-menu-card">
            <Link to="/driver"><span>🛵</span> Entrega atual <b>{stage === 'completed' ? 'Concluída' : 'Ativa'}</b></Link>
            <button><span>💰</span> Ganhos <b>18.500 Kz</b></button>
            <button><span>📋</span> Histórico <b>328</b></button>
            <button><span>⚙️</span> Perfil e documentos <b>✓</b></button>
          </div>
          <div className="driver-safety-card"><strong>Segurança primeiro</strong><p>Não inicie uma entrega se a botija, o veículo ou a documentação apresentarem qualquer irregularidade.</p></div>
        </aside>
      </div>
    </div>
  );
}
