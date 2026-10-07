import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { fetchDriverEarnings, type DriverEarning } from '../services/driver';

export default function DriverEarningsPage() {
  const [items, setItems] = useState<DriverEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchDriverEarnings()
      .then((earnings) => {
        if (active) setItems(earnings);
      })
      .catch((cause: unknown) => {
        if (active) setError(extractMessage(cause, 'Não foi possível carregar os ganhos acumulados.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => items.reduce(
    (result, item) => ({
      gross: result.gross + item.gross,
      net: result.net + item.net,
    }),
    { gross: 0, net: 0 },
  ), [items]);

  return (
    <div className="page workspace-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">Financeiro</span>
          <h1>Ganhos do entregador.</h1>
          <p>90% da taxa de entrega é acumulada ao concluir cada entrega; estes valores ainda não representam levantamentos.</p>
        </div>
        <Link to="/driver" className="secondary-btn">Operação</Link>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {loading ? <div className="loading-panel" role="status">A carregar ganhos…</div> : <>
        <div className="metric-strip">
          <article><small>Entregas concluídas</small><strong>{items.length}</strong></article>
          <article><small>Taxas de entrega</small><strong>{formatAOA(totals.gross)}</strong></article>
          <article><small>Acumulado para o entregador</small><strong>{formatAOA(totals.net)}</strong></article>
        </div>
        <section className="workspace-panel">
          <div className="panel-title">
            <div><span className="section-kicker">Detalhe</span><h2>Histórico de ganhos acumulados</h2></div>
          </div>
          <p className="integration-note">A parcela da plataforma é 10% da taxa de entrega. O saldo acumulado não é o mesmo que o saldo operacional da carteira.</p>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Pedido</th><th>Data da entrega</th><th>Taxa bruta</th><th>Plataforma (10%)</th><th>Entregador (90%)</th><th>Estado</th></tr></thead>
              <tbody>
                {items.length ? items.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.reference}</strong></td>
                    <td>{new Date(item.createdAt).toLocaleString('pt-AO')}</td>
                    <td>{formatAOA(item.gross)}</td>
                    <td>{formatAOA(item.platformFee)}</td>
                    <td className="money-positive"><strong>{formatAOA(item.net)}</strong></td>
                    <td><span className="status-pill success">Acumulado</span></td>
                  </tr>
                )) : <tr><td colSpan={6}><div className="empty-state compact"><h3>Sem entregas concluídas</h3><p>Os ganhos serão acumulados quando uma entrega for marcada como concluída.</p></div></td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </>}
      <p><Link to="/driver/saldo" className="secondary-btn">Consultar carteira operacional</Link></p>
    </div>
  );
}
