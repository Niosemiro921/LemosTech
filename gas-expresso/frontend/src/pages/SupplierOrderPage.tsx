import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supplierOrders } from '../services/supplier';

const steps = [
  { key: 'new', label: 'Novo pedido' },
  { key: 'accepted', label: 'Aceite' },
  { key: 'preparing', label: 'Preparação' },
  { key: 'ready', label: 'Pronto para recolha' },
  { key: 'collected', label: 'Recolhido' },
] as const;

type Status = typeof steps[number]['key'];

export default function SupplierOrderPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const source = useMemo(() => supplierOrders.find((item) => item.id === orderId) ?? supplierOrders[0], [orderId]);
  const [status, setStatus] = useState<Status>(source.status as Status);
  const currentIndex = Math.max(0, steps.findIndex((step) => step.key === status));
  const next = steps[currentIndex + 1]?.key as Status | undefined;

  const actionLabel = status === 'new'
    ? 'Aceitar pedido'
    : status === 'accepted'
      ? 'Começar preparação'
      : status === 'preparing'
        ? 'Marcar como pronto'
        : status === 'ready'
          ? 'Confirmar recolha'
          : 'Pedido concluído';

  return (
    <div className="page operation-detail-page">
      <div className="operation-detail-topbar">
        <button className="back-link" onClick={() => navigate('/supplier')}>← Voltar aos pedidos</button>
        <span className="section-kicker">Fornecedor · Operação</span>
      </div>

      <div className="operation-detail-grid">
        <main className="operation-main-card">
          <div className="operation-title-row">
            <div>
              <span className="operation-id">Pedido #{source.id}</span>
              <h1>{source.quantity} × {source.productName}</h1>
              <p>Entrega para <strong>{source.customerArea}</strong> · {source.distanceKm} km</p>
            </div>
            <span className={`status-pill ${status === 'ready' || status === 'collected' ? 'success' : ''}`}>
              {steps[currentIndex]?.label}
            </span>
          </div>

          <section className="operation-stepper">
            {steps.map((step, index) => (
              <div className={`operation-step ${index <= currentIndex ? 'done' : ''}`} key={step.key}>
                <span>{index < currentIndex ? '✓' : index + 1}</span>
                <small>{step.label}</small>
              </div>
            ))}
          </section>

          <section className="operation-detail-section">
            <div className="section-kicker">Pedido recebido</div>
            <h2>Confirme antes de preparar</h2>
            <div className="order-facts-grid">
              <div><small>Produto</small><strong>{source.productName}</strong></div>
              <div><small>Quantidade</small><strong>{source.quantity} unidade(s)</strong></div>
              <div><small>Cliente</small><strong>{source.customerArea}</strong></div>
              <div><small>Distância</small><strong>{source.distanceKm} km</strong></div>
              <div><small>Valor do pedido</small><strong>{source.supplierNet.toLocaleString('pt-AO')} Kz</strong></div>
              <div><small>Pagamento</small><strong>Na entrega</strong></div>
            </div>
          </section>

          <section className="operation-confirm-card">
            <div>
              <strong>{status === 'new' ? 'Aceitar este pedido?' : actionLabel}</strong>
              <p>
                {status === 'new' && 'Ao aceitar, o stock necessário fica reservado e o pedido entra na sua fila de preparação.'}
                {status === 'accepted' && 'Confirme que começou a separar a botija solicitada.'}
                {status === 'preparing' && 'A botija está pronta? Marque-a como pronta para que o dispatch possa enviar um entregador.'}
                {status === 'ready' && 'O entregador recolheu a botija? Confirme a recolha para libertar o próximo estado.'}
                {status === 'collected' && 'Este pedido já foi entregue ao fluxo logístico.'}
              </p>
            </div>
            {next ? (
              <button className="primary-btn" onClick={() => setStatus(next)}>{actionLabel} <span>→</span></button>
            ) : (
              <Link className="secondary-btn" to="/supplier">Voltar aos pedidos</Link>
            )}
          </section>
        </main>

        <aside className="operation-side-card">
          <div className="section-kicker">Stock reservado</div>
          <div className="stock-reserve-number">{source.quantity}</div>
          <p>unidade(s) de {source.productName.replace('Botija ', '')} KG reservadas para este pedido.</p>
          <div className="side-divider" />
          <div className="supplier-payout"><span>Valor do fornecedor</span><strong>{source.supplierNet.toLocaleString('pt-AO')} Kz</strong></div>
          <div className="side-divider" />
          <strong>Depois de marcar “Pronto para recolha”</strong>
          <p>O pedido passa para o motor de dispatch, que procura um entregador disponível.</p>
        </aside>
      </div>
    </div>
  );
}
