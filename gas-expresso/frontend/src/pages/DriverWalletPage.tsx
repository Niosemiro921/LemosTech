import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage, getCurrentUser } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { fetchDriverWallet, fetchPriorityPolicy, fetchWalletTransactions, fetchDriverWithdrawals, requestDriverWithdrawal, requestWalletTopUp, type DriverWallet, type PriorityPolicy, type WalletTransaction, type DriverWithdrawalRequest } from '../services/driverFinance';

const statusLabel: Record<string, string> = { PENDING: 'Pendente', APPROVED: 'Aprovado', PAID: 'Pago', REJECTED: 'Rejeitado', FAILED: 'Falhou' };

export default function DriverWalletPage() {
  const base = getCurrentUser()?.role === 'PRESTADOR' ? '/prestador' : '/driver';
  const [wallet, setWallet] = useState<DriverWallet | null>(null);
  const [tx, setTx] = useState<WalletTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<DriverWithdrawalRequest[]>([]);
  const [policy, setPolicy] = useState<PriorityPolicy | null>(null);
  const [amount, setAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [busy, setBusy] = useState(false);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const load = async () => {
    try {
      const [w, t, p, ws] = await Promise.all([fetchDriverWallet(), fetchWalletTransactions(), fetchPriorityPolicy(), fetchDriverWithdrawals()]);
      setWallet(w); setTx(t); setPolicy(p); setWithdrawals(ws); setError('');
    } catch (e) {
      setError(extractMessage(e, 'Não foi possível carregar a carteira operacional.'));
    }
  };

  useEffect(() => { void load(); const i = window.setInterval(() => void load(), 15000); return () => window.clearInterval(i); }, []);

  const topup = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isSafeInteger(value) || value <= 0) { setError('Indique um valor inteiro válido em Kz. O limite é validado pela API.'); return; }
    setBusy(true); setError(''); setResult('');
    try { const r = await requestWalletTopUp(value); setResult(`Solicitação ${r.reference ?? r.id} criada. O saldo só será creditado após confirmação administrativa.`); setAmount(''); await load(); }
    catch (e) { setError(extractMessage(e, 'Não foi possível solicitar a recarga.')); }
    finally { setBusy(false); }
  };

  const withdraw = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(withdrawAmount);
    if (!Number.isSafeInteger(value) || value <= 0) { setError('Indique um valor inteiro válido em Kz.'); return; }
    if (!withdrawMethod.trim() || !withdrawAccount.trim()) { setError('Preencha o método e a conta de recebimento.'); return; }
    setWithdrawBusy(true); setError(''); setResult('');
    try { const r = await requestDriverWithdrawal({ amount: value, method: withdrawMethod.trim(), account: withdrawAccount.trim() }); setResult(`Pedido ${r.reference ?? r.id} criado. Estado: ${statusLabel[r.status] ?? r.status}.`); setWithdrawAmount(''); setWithdrawMethod(''); setWithdrawAccount(''); await load(); }
    catch (e) { setError(extractMessage(e, 'Não foi possível solicitar o levantamento.')); }
    finally { setWithdrawBusy(false); }
  };

  const balance = wallet?.availableBalance ?? 0;
  return <div className="page workspace-page">
    <div className="workspace-heading"><div><span className="section-kicker">Operação profissional</span><h1>Carteira em Kwanza.</h1><p>Saldo, reservas, recargas, levantamentos e prioridade são controlados pelo backend e sempre apresentados em Kz.</p></div><Link to={base} className="secondary-btn">Voltar à operação</Link></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {result && <div className="success-alert" role="status">{result}</div>}
    <section className="wallet-hero"><div><span className="section-kicker light">Saldo disponível</span><strong>{wallet ? formatAOA(balance) : '—'}</strong><small>{wallet ? 'Valor livre para operação.' : 'A aguardar resposta da API.'}</small></div><div className="wallet-priority"><span>Prioridade</span><strong>{wallet ? wallet.priorityScore : '—'}</strong><small>{wallet?.priorityBand ?? '—'}</small></div></section>
    <div className="workspace-grid three-col">
      <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">Adicionar saldo</span><h2>Solicitar recarga</h2></div></div><form className="form-grid" onSubmit={topup}><div className="field"><label>Valor em Kz</label><input className="input" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Ex.: 50 000"/><small className="field-help">A Administração confirma a recarga antes de o saldo ficar disponível.</small></div><button className="primary-btn" disabled={busy}>{busy ? 'A criar solicitação…' : 'Solicitar recarga'}</button></form></section>
      <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">Levantamento</span><h2>Receber dinheiro</h2></div></div><form className="form-grid" onSubmit={withdraw}><div className="field"><label>Valor em Kz</label><input className="input" inputMode="numeric" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Ex.: 30 000"/></div><div className="field"><label>Método</label><input className="input" value={withdrawMethod} onChange={e => setWithdrawMethod(e.target.value)} placeholder="Método de recebimento"/></div><div className="field"><label>Conta de recebimento</label><input className="input" value={withdrawAccount} onChange={e => setWithdrawAccount(e.target.value)} placeholder="IBAN, telefone ou referência"/></div><button className="primary-btn" disabled={withdrawBusy}>{withdrawBusy ? 'A solicitar…' : 'Solicitar levantamento'}</button></form></section>
      <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">Proteções</span><h2>Estado da carteira</h2></div></div><div className="wallet-rule-list"><div><strong>Mínimo operacional</strong><span>{wallet ? formatAOA(wallet.minimumOperatingBalance) : '—'}</span></div><div><strong>Saldo reservado</strong><span>{wallet ? formatAOA(wallet.reservedBalance) : '—'}</span></div><div><strong>Saldo livre</strong><span>{wallet ? formatAOA(wallet.availableBalance) : '—'}</span></div></div></section>
    </div>
    <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">Prioridade</span><h2>Faixas e critérios devolvidos pelo servidor</h2></div></div><div className="priority-grid">{policy?.bands?.length ? policy.bands.map(b => <div className={`priority-band ${wallet?.priorityBand === b.code ? 'current' : ''}`} key={b.code}><strong>{b.label}</strong><span>A partir de {formatAOA(b.minBalance)}</span><small>{b.description}</small></div>) : <div className="integration-note">A API não devolveu as faixas de prioridade.</div>}</div><div className="factor-list">{policy?.factors?.length ? policy.factors.map(f => <div key={f.code}><strong>{f.label}</strong><span>{f.weight}% · {f.description}</span></div>) : <div className="integration-note">A API não devolveu os fatores de prioridade.</div>}</div></section>
    <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">Levantamentos</span><h2>Histórico</h2></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Data</th><th>Referência</th><th>Solicitado</th><th>Em dinheiro</th><th>Taxa</th><th>Estado</th></tr></thead><tbody>{withdrawals.length ? withdrawals.map(item => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString('pt-AO')}</td><td>{item.reference ?? item.id}</td><td>{formatAOA(item.amount)}</td><td>{formatAOA(item.cashAmount)}</td><td>{formatAOA(item.fee)}</td><td><span className={`status-pill ${item.status === 'PAID' ? 'success' : item.status === 'REJECTED' ? 'danger' : 'warning'}`}>{statusLabel[item.status] ?? item.status}</span></td></tr>) : <tr><td colSpan={6}><div className="empty-state compact"><h3>Sem levantamentos</h3><p>Os pedidos enviados aparecerão aqui.</p></div></td></tr>}</tbody></table></div></section>
    <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">Movimentos</span><h2>Histórico de saldo</h2></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th><th>Saldo após</th></tr></thead><tbody>{tx.length ? tx.map(item => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString('pt-AO')}</td><td>{item.type}</td><td>{item.description}</td><td className={item.amount >= 0 ? 'money-positive' : 'money-negative'}>{item.amount >= 0 ? '+' : ''}{formatAOA(item.amount)}</td><td>{formatAOA(item.balanceAfter)}</td></tr>) : <tr><td colSpan={5}><div className="empty-state compact"><h3>Sem movimentos</h3><p>As operações financeiras confirmadas aparecerão aqui.</p></div></td></tr>}</tbody></table></div></section>
  </div>;
}
