import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { requestAdminWithdrawal } from '../services/adminWallet';
import { apiGet } from '../lib/api';

export default function AdminWithdrawalPage() {
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('');
  const [method, setMethod] = useState<'multicaixa'|'redotpay'>('multicaixa');
  const [busy, setBusy] = useState(false);
  type AdminWallet = { balance:number; reservedBalance:number; availableBalance:number; currency:string; };
  const [wallet, setWallet] = useState<AdminWallet | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const loadWallet = async () => {
    try {
      const data = await apiGet<AdminWallet>('/admin/wallet/me');
      setWallet(data);
      return data;
    } catch (e) {
      setWallet(null);
      setError(extractMessage(e, 'Não foi possível carregar o saldo administrativo.'));
      return null;
    }
  };

  useEffect(()=>{ void loadWallet(); },[]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(''); setOk('');
    try {
      const val = parseInt(amount, 10);
      if (!Number.isFinite(val) || val < 1000) throw new Error('Valor mínimo 1.000 Kz.');
      if (!account.trim()) throw new Error(method === 'multicaixa' ? 'Informe o IBAN de destino.' : 'Informe a conta Redotpay.');
      if (!wallet) throw new Error('Saldo administrativo indisponível. Recarregue a página.');
      if (val > wallet.availableBalance) throw new Error('Saldo disponível insuficiente para este levantamento.');
      const res = await requestAdminWithdrawal(val, account.trim(), method);
      setOk(`Saque solicitado: ${formatAOA(res.amount)} para ${res.method === 'multicaixa' ? 'Multicaixa Express (IBAN)' : 'Redotpay'} (${res.account}). Ref: ${res.reference}`);
      setAmount('');
      setAccount('');
      await loadWallet();
    } catch (e: any) {
      setError(extractMessage(e, 'Não foi possível solicitar o saque.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page workspace-page admin-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">Backoffice / Financeiro</span>
          <h1>Levantar saldo administrativo</h1>
          <p>Retirar saldo replicado para IBAN (Multicaixa Express) ou Redotpay.</p>
        </div>
        <div className="admin-actions-row">
          <Link to="/admin/wallet/top-ups" className="secondary-btn">Voltar à carteira</Link>
          <Link to="/admin" className="secondary-btn">Dashboard</Link>
        </div>
      </div>
      <div className="workspace-panel" style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="panel-title"><h2>Solicitar saque</h2></div>
        {error && <div className="form-error" role="alert">{error}</div>}
        {ok && <div className="form-success" role="status">{ok}</div>}
        <div style={{ padding: 14, background: '#e0f2fe', borderRadius: 8, border: '1px solid #bae6fd', marginBottom: 20 }}>
          <strong>Saldo replicado disponível para saque:</strong> {wallet ? `${formatAOA(wallet.availableBalance)} ${wallet.currency}` : 'Indisponível'}
          {wallet && <span style={{ display: 'block', marginTop: 4, fontSize: 13, color: '#475569' }}>Saldo total: {formatAOA(wallet.balance)} · Reservado: {formatAOA(wallet.reservedBalance)}</span>}
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ padding: 16, background: '#f6f8fb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <label htmlFor="amt" style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14, color: '#374151' }}>Valor (Kz)</label>
            <input id="amt" type="number" min={1000} step={1000} value={amount} onChange={e => setAmount(e.target.value)} disabled={busy} required style={{ width: '100%', padding: '10px 12px', fontSize: 16, borderRadius: 6, border: '1px solid #c7c7c7', boxSizing: 'border-box' }} />
          </div>
          <div style={{ padding: 16, background: '#f6f8fb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <label htmlFor="method" style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14, color: '#374151' }}>Método de pagamento</label>
            <select id="method" value={method} onChange={e => setMethod(e.target.value as 'multicaixa'|'redotpay')} disabled={busy} style={{ width: '100%', padding: '10px 12px', fontSize: 16, borderRadius: 6, border: '1px solid #c7c7c7', boxSizing: 'border-box' }}>
              <option value="multicaixa">Multicaixa Express (IBAN)</option>
              <option value="redotpay">Redotpay</option>
            </select>
          </div>
          <div style={{ padding: 16, background: '#f6f8fb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <label htmlFor="acc" style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14, color: '#374151' }}>{method === 'multicaixa' ? 'IBAN de destino' : 'Conta Redotpay'}</label>
            <input id="acc" type="text" value={account} onChange={e => setAccount(e.target.value)} disabled={busy} placeholder={method === 'multicaixa' ? 'Ex: AO06 0000 0000 0000 0000 0000 0' : 'Ex: 900123456'} required style={{ width: '100%', padding: '10px 12px', fontSize: 16, borderRadius: 6, border: '1px solid #c7c7c7', boxSizing: 'border-box' }} />
          </div>
          <div style={{ padding: 14, background: '#fff5eb', borderRadius: 8, border: '1px solid #fdd6a5', color: '#92400e', fontSize: 14 }}>
            O pagamento é feito manualmente pelo operador (Multicaixa Express / Redotpay). O levantamento só passa a <strong>Pago</strong> depois de registares o ID/comprovativo da transferência.
          </div>
          <button className="primary-btn" type="submit" disabled={busy || !wallet} style={{ padding: '12px', fontSize: 16, borderRadius: 8, cursor: (busy || !wallet) ? 'not-allowed' : 'pointer', opacity: (busy || !wallet) ? 0.7 : 1 }}>
            {busy ? 'Enviando...' : 'Solicitar saque'}
          </button>
        </form>
      </div>
    </div>
  );
}
