import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import {
  confirmAdminTopUp,
  fetchAdminTopUps,
  rejectAdminTopUp,
  fetchAdminWithdrawals,
  approveAdminWithdrawal,
  rejectAdminWithdrawal,
  payAdminWithdrawal,
  type AdminTopUpRequest,
  type AdminWithdrawalRequest,
} from '../services/adminWallet';

const label: Record<string, string> = { PENDING: 'Pendente', APPROVED: 'Aprovado', REJECTED: 'Rejeitado', PAID: 'Pago', COMPLETED: 'Concluído' };
const methodLabel: Record<string, string> = { multicaixa: 'Multicaixa Express (IBAN)', redotpay: 'Redotpay' };

export default function AdminWalletTopUpsPage() {
  const [topups, setTopups] = useState<AdminTopUpRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState<AdminWithdrawalRequest | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [payBusy, setPayBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([fetchAdminTopUps(), fetchAdminWithdrawals()]);
      setTopups(a);
      setWithdrawals(b);
      setError('');
    } catch (e) {
      setError(extractMessage(e, 'Não foi possível carregar a carteira administrativa.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 15000); return () => window.clearInterval(timer); }, []);

  const run = async (fn: () => Promise<unknown>, id: string) => {
    setBusy(id);
    setError('');
    try { await fn(); await load(); }
    catch (e) { setError(extractMessage(e, 'Não foi possível concluir a operação.')); }
    finally { setBusy(null); }
  };

  const openPay = (item: AdminWithdrawalRequest) => {
    setPaying(item);
    setPaymentReference('');
    setPaymentProofUrl('');
    setError('');
  };

  const submitPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paying) return;
    setPayBusy(true);
    setError('');
    try {
      await payAdminWithdrawal(paying.id, paymentReference.trim(), paymentProofUrl.trim() || undefined);
      setPaying(null);
      await load();
    } catch (e) {
      setError(extractMessage(e, 'Não foi possível registar o pagamento.'));
    } finally {
      setPayBusy(false);
    }
  };

  return (
    <div className="page workspace-page admin-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">Backoffice / Financeiro</span>
          <h1>Carteira dos profissionais.</h1>
          <p>Recargas são confirmadas antes de entrar no saldo. Levantamentos passam por reserva, aprovação e pagamento manual comprovado.</p>
        </div>
        <div className="admin-actions-row">
          <Link to="/admin/email" className="secondary-btn">Enviar email</Link>
          <Link to="/admin/wallet/withdrawals" className="primary-btn">Solicitar saque</Link>
          <Link to="/admin" className="secondary-btn">Dashboard</Link>
        </div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {loading ? <div className="loading-panel">A carregar operações financeiras…</div> : <>
        <section className="workspace-panel">
          <div className="panel-title"><div><span className="section-kicker">Entrada de saldo</span><h2>Recargas pendentes</h2></div><span className="admin-counter">{topups.filter(x => x.status === 'PENDING').length}</span></div>
          {topups.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Entregador</th><th>Referência</th><th>Valor</th><th>Estado</th><th>Solicitado</th><th>Ação</th></tr></thead><tbody>
            {topups.map(i => <tr key={i.id}><td><strong>{i.driverName}</strong><small className="table-sub">{i.driverId}</small></td><td>{i.reference ?? i.id}</td><td>{formatAOA(i.amount)}</td><td><span className={`status-pill ${i.status === 'REJECTED' ? 'danger' : i.status === 'APPROVED' ? 'success' : 'warning'}`}>{label[i.status] ?? i.status}</span></td><td>{new Date(i.createdAt).toLocaleString('pt-AO')}</td><td>{i.status === 'PENDING' ? <div className="inline-actions"><button className="tiny-btn success-btn" disabled={busy === i.id} onClick={() => void run(() => confirmAdminTopUp(i.id), i.id)}>Confirmar</button><button className="tiny-btn danger-btn" disabled={busy === i.id} onClick={() => void run(() => rejectAdminTopUp(i.id, 'Recarga rejeitada na revisão administrativa.'), i.id)}>Rejeitar</button></div> : <span className="table-sub">Sem ação</span>}</td></tr>)}
          </tbody></table></div> : <div className="empty-state compact"><h3>Sem solicitações de recarga</h3><p>A API não devolveu recargas pendentes.</p></div>}
        </section>

        <section className="workspace-panel">
          <div className="panel-title"><div><span className="section-kicker">Saída de saldo</span><h2>Levantamentos</h2></div><span className="admin-counter">{withdrawals.filter(x => x.status === 'PENDING' || x.status === 'APPROVED').length}</span></div>
          {withdrawals.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Beneficiário</th><th>Referência</th><th>Pedido</th><th>Método / Conta</th><th>Estado</th><th>Comprovativo</th><th>Ações</th></tr></thead><tbody>
            {withdrawals.map(i => <tr key={i.id}>
              <td><strong>{i.driverName}</strong><small className="table-sub">{i.account}</small></td>
              <td>{i.reference ?? i.id}</td>
              <td>{formatAOA(i.amount)}</td>
              <td>{methodLabel[i.method] ?? i.method}</td>
              <td><span className={`status-pill ${i.status === 'PAID' ? 'success' : i.status === 'REJECTED' ? 'danger' : 'warning'}`}>{label[i.status] ?? i.status}</span></td>
              <td>{i.paymentReference ? <span className="table-sub">{i.paymentReference}{i.paymentProofUrl ? <> · <a href={i.paymentProofUrl} target="_blank" rel="noreferrer">ver</a></> : null}</span> : <span className="table-sub">—</span>}</td>
              <td><div className="inline-actions">
                {i.status === 'PENDING' && <button className="tiny-btn success-btn" disabled={busy === i.id} onClick={() => void run(() => approveAdminWithdrawal(i.id), i.id)}>Aprovar</button>}
                {(i.status === 'PENDING' || i.status === 'APPROVED') && <button className="tiny-btn danger-btn" disabled={busy === i.id} onClick={() => void run(() => rejectAdminWithdrawal(i.id, 'Levantamento rejeitado na revisão administrativa.'), i.id)}>Rejeitar</button>}
                {i.status === 'APPROVED' && <button className="tiny-btn success-btn" disabled={busy === i.id} onClick={() => openPay(i)}>Registar pagamento</button>}
                {i.status === 'PAID' && <span className="table-sub">Sem ação</span>}
              </div></td>
            </tr>)}
          </tbody></table></div> : <div className="empty-state compact"><h3>Sem levantamentos</h3><p>A API não devolveu pedidos de levantamento.</p></div>}
        </section>
      </>}

      {paying && <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
        <form onSubmit={submitPay} style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <span className="section-kicker">Pagamento manual</span>
            <h2 style={{ margin: '4px 0' }}>Registar comprovativo</h2>
            <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>{formatAOA(paying.amount)} para {paying.account} ({methodLabel[paying.method] ?? paying.method}). Faz primeiro a transferência no Multicaixa Express / Redotpay e regista aqui o comprovativo.</p>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600 }}>
            ID / comprovativo da transferência
            <input value={paymentReference} onChange={e => setPaymentReference(e.target.value)} required minLength={3} maxLength={200} placeholder="Ex: ID da operação MCX Express" style={{ padding: '10px 12px', fontSize: 15, borderRadius: 6, border: '1px solid #c7c7c7' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600 }}>
            URL do comprovativo (opcional)
            <input value={paymentProofUrl} onChange={e => setPaymentProofUrl(e.target.value)} maxLength={2000} placeholder="https://..." style={{ padding: '10px 12px', fontSize: 15, borderRadius: 6, border: '1px solid #c7c7c7' }} />
          </label>
          <div className="inline-actions" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="secondary-btn" disabled={payBusy} onClick={() => setPaying(null)}>Cancelar</button>
            <button type="submit" className="primary-btn" disabled={payBusy || paymentReference.trim().length < 3}>{payBusy ? 'A registar…' : 'Confirmar pagamento'}</button>
          </div>
        </form>
      </div>}
    </div>
  );
}
