import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RealMap } from '../components/RealMap';

type Stage = 'incoming' | 'accepted' | 'pickup' | 'on_route' | 'arrived' | 'completed';

const stages: Record<Stage, { title: string; description: string; cta: string }> = {
  incoming: { title: 'Novo pedido disponível', description: 'Revise o valor, a distância e os pontos de recolha e entrega antes de aceitar.', cta: 'Aceitar pedido' },
  accepted: { title: 'Pedido aceite', description: 'Dirija-se ao fornecedor para recolher a botija.', cta: 'Iniciar deslocação ao fornecedor' },
  pickup: { title: 'Recolha no fornecedor', description: 'Quando receber a botija, confirme a recolha.', cta: 'Confirmar recolha' },
  on_route: { title: 'A caminho do cliente', description: 'O cliente já pode acompanhar o progresso da entrega.', cta: 'Marcar como cheguei' },
  arrived: { title: 'Você chegou', description: 'Entregue a botija e receba o pagamento combinado com o cliente.', cta: 'Concluir entrega' },
  completed: { title: 'Entrega concluída', description: 'O pedido terminou e o valor foi registado nos seus ganhos.', cta: 'Voltar ao painel' },
};

export default function DriverOrderPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [stage, setStage] = useState<Stage>('incoming');
  const point = { lat: -8.9165, lng: 13.1802 };

  const nextStage = (): Stage | undefined => ({
    incoming: 'accepted',
    accepted: 'pickup',
    pickup: 'on_route',
    on_route: 'arrived',
    arrived: 'completed',
    completed: undefined,
  }[stage]);

  const handleAction = () => {
    const next = nextStage();
    if (!next) navigate('/driver');
    else setStage(next);
  };

  return (
    <div className="page operation-detail-page driver-order-page">
      <div className="operation-detail-topbar">
        <button className="back-link" onClick={() => navigate('/driver')}>← Voltar ao painel</button>
        <span className="section-kicker">Entregador · Pedido #{orderId ?? 'GE-000124'}</span>
      </div>

      <div className="driver-request-banner">
        <div>
          <span className="section-kicker">Oferta de entrega</span>
          <h1>{stages[stage].title}</h1>
          <p>{stages[stage].description}</p>
        </div>
        {stage === 'incoming' && <span className="urgent-chip">Agora</span>}
      </div>

      <div className="operation-detail-grid">
        <main className="operation-main-card">
          <div className="driver-offer-grid">
            <div><small>Você recebe</small><strong>1.500 Kz</strong><span>por esta entrega</span></div>
            <div><small>Distância</small><strong>6,8 km</strong><span>≈ 17 min</span></div>
            <div><small>Carga</small><strong>12 KG</strong><span>1 botija</span></div>
          </div>

          <div className="driver-route-card">
            <div className="route-point"><span className="route-dot pickup-dot" /><div><small>RECOLHA</small><strong>Viana Central</strong><span>Fornecedor verificado</span></div></div>
            <div className="route-line" />
            <div className="route-point"><span className="route-dot drop-dot" /><div><small>ENTREGA</small><strong>Talatona, Luanda</strong><span>Cliente Gás Expresso</span></div></div>
          </div>

          <div className="driver-map-wrap detail-map">
            <RealMap value={point} />
            <div className="driver-map-overlay"><strong>Rota</strong><span>Viana Central → Talatona</span><small>≈ 6,8 km</small></div>
          </div>

          <button className="primary-btn full" onClick={handleAction}>{stages[stage].cta} <span>→</span></button>
          {stage === 'incoming' && <button className="danger-outline-btn full" onClick={() => navigate('/driver')}>Recusar pedido</button>}

          <p className="demo-note">No backend real, aceitar e recusar serão operações transacionais do Dispatch Engine.</p>
        </main>

        <aside className="operation-side-card">
          <div className="section-kicker">Detalhes</div>
          <div className="side-info-row"><span>Pedido</span><strong>#{orderId ?? 'GE-000124'}</strong></div>
          <div className="side-info-row"><span>Produto</span><strong>Botija 12 KG</strong></div>
          <div className="side-info-row"><span>Cliente</span><strong>Gás Expresso</strong></div>
          <div className="side-info-row"><span>Pagamento</span><strong>Na entrega</strong></div>
          <div className="side-divider" />
          <strong>Regras da entrega</strong>
          <p>Confirme a recolha antes de iniciar a rota para o cliente. O sistema atualizará o acompanhamento automaticamente.</p>
          <Link className="secondary-btn full" to="/driver">Painel do entregador</Link>
        </aside>
      </div>
    </div>
  );
}
