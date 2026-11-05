import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { uploadSubscriptionProof } from '../services/media';
import {
  createSubscriptionInvoice,
  fetchBillingOverview,
  submitSubscriptionProof,
  type BillingCycle,
  type BillingOverview,
  type SubscriptionInvoice,
  type SubscriptionInvoiceStatus,
  type SubscriptionStatus,
} from '../services/billing';

const statusLabel: Record<SubscriptionStatus, string> = {
  TRIAL: 'Período de teste',
  ACTIVE: 'Ativa',
  PAST_DUE: 'Pagamento em atraso',
  SUSPENDED: 'Suspensa',
  CANCELLED: 'Cancelada',
};

const statusTone: Record<SubscriptionStatus, string> = {
  TRIAL: 'warning',
  ACTIVE: 'success',
  PAST_DUE: 'danger',
  SUSPENDED: 'danger',
  CANCELLED: 'danger',
};

const invoiceLabel: Record<SubscriptionInvoiceStatus, string> = {
  PENDING: 'Aguarda pagamento',
  AWAITING_CONFIRMATION: 'Comprovativo em revisão',
  PAID: 'Pago',
  REJECTED: 'Rejeitado',
  CANCELLED: 'Cancelado',
};

const invoiceTone: Record<SubscriptionInvoiceStatus, string> = {
  PENDING: 'warning',
  AWAITING_CONFIRMATION: 'warning',
  PAID: 'success',
  REJECTED: 'danger',
  CANCELLED: 'danger',
};

const cycleLabel: Record<BillingCycle, string> = { MONTHLY: 'Mensal', YEARLY: 'Anual' };

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('pt-AO') : '—';
}

export default function SupplierBillingPage() {
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    try {
      setOverview(await fetchBillingOverview());
      setError('');
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível carregar a assinatura.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function requestPlan(planId: string) {
    setBusy(planId);
    setError('');
    setMessage('');
    try {
      const invoice = await createSubscriptionInvoice(planId, cycle);
      setMessage(`Fatura ${invoice.number} criada. Efetue a transferência e anexe o comprovativo.`);
      await load();
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível criar a fatura.'));
    } finally {
      setBusy('');
    }
  }

  const subscription = overview?.subscription;
  const canOperate = subscription?.canOperate ?? true;

  return (
    <div className="page workspace-page supplier-module-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">Conta / Assinatura</span>
          <h1>Licença e pagamentos.</h1>
          <p>Escolha o plano, transfira o valor e anexe o comprovativo. A assinatura é ativada depois da confirmação da equipa.</p>
        </div>
        <Link to="/fornecedor" className="secondary-btn">Voltar ao dashboard</Link>
      </div>

      {error && <div className="form-error" role="alert"><strong>Erro:</strong> {error}</div>}
      {message && <div className="success-banner" role="status">{message}</div>}

      {loading && !overview ? <div className="loading-panel">A carregar assinatura…</div> : overview && (
        <>
          {!canOperate && (
            <div className="form-error" role="alert">
              <strong>A operação está limitada.</strong>
              <span>A assinatura está {statusLabel[subscription!.status].toLowerCase()}. Regularize o pagamento para voltar a aceitar e preparar pedidos.</span>
            </div>
          )}

          <section className="workspace-panel">
            <div className="panel-title">
              <div>
                <span className="section-kicker">Estado atual</span>
                <h2>{subscription!.plan.name} · {cycleLabel[subscription!.billingCycle]}</h2>
              </div>
              <span className={`status-pill ${statusTone[subscription!.status]}`}>{statusLabel[subscription!.status]}</span>
            </div>
            <div className="billing-summary">
              <div><small>Plano</small><strong>{subscription!.plan.name}</strong></div>
              <div><small>Valor</small><strong>{formatAOA(subscription!.billingCycle === 'YEARLY' ? subscription!.plan.priceYearly : subscription!.plan.priceMonthly)}</strong></div>
              <div><small>Fim do período</small><strong>{formatDate(subscription!.status === 'TRIAL' ? subscription!.trialEndsAt : subscription!.currentPeriodEnd)}</strong></div>
              <div><small>Dias restantes</small><strong>{subscription!.daysRemaining == null ? '—' : subscription!.daysRemaining}</strong></div>
            </div>
            {subscription!.status === 'TRIAL' && (
              <p className="chart-caption">Está no período de teste. Escolha um plano abaixo para garantir a continuidade do acesso.</p>
            )}
          </section>

          <section className="workspace-panel">
            <div className="panel-title">
              <div><span className="section-kicker">Planos</span><h2>Escolha a licença</h2></div>
              <div className="billing-cycle-toggle">
                <button type="button" className={cycle === 'MONTHLY' ? 'active' : ''} onClick={() => setCycle('MONTHLY')}>Mensal</button>
                <button type="button" className={cycle === 'YEARLY' ? 'active' : ''} onClick={() => setCycle('YEARLY')}>Anual (2 meses grátis)</button>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Plano</th><th>Valor</th><th>Filiais</th><th>Utilizadores</th><th>Ação</th></tr></thead>
                <tbody>
                  {overview.plans.map((plan) => (
                    <tr key={plan.id}>
                      <td><strong>{plan.name}</strong><small className="table-sub">{plan.description ?? plan.code}</small></td>
                      <td><strong>{formatAOA(cycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly)}</strong><small className="table-sub">{cycle === 'YEARLY' ? 'por ano' : 'por mês'}</small></td>
                      <td>{plan.maxBranches ?? 'Ilimitadas'}</td>
                      <td>{plan.maxUsers ?? 'Ilimitados'}</td>
                      <td>
                        <button type="button" className="primary-btn" disabled={busy === plan.id} onClick={() => void requestPlan(plan.id)}>
                          {busy === plan.id ? 'A gerar…' : 'Gerar fatura'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="workspace-panel">
            <div className="panel-title">
              <div><span className="section-kicker">Pagamento</span><h2>Dados para transferência</h2></div>
            </div>
            <div className="billing-bank">
              <div><small>Banco</small><strong>{overview.paymentInstructions.bank}</strong></div>
              <div><small>Titular</small><strong>{overview.paymentInstructions.accountName}</strong></div>
              <div><small>IBAN</small><strong className="billing-iban">{overview.paymentInstructions.iban}</strong></div>
            </div>
            <p className="chart-caption">{overview.paymentInstructions.note}</p>
          </section>

          <section className="workspace-panel">
            <div className="panel-title">
              <div><span className="section-kicker">Histórico</span><h2>Faturas de assinatura</h2></div>
            </div>
            {overview.invoices.length === 0 ? (
              <div className="empty-state compact"><p>Ainda não existem faturas de assinatura.</p></div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Fatura</th><th>Plano</th><th>Período</th><th>Valor</th><th>Estado</th><th>Comprovativo</th></tr></thead>
                  <tbody>
                    {overview.invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td><strong>{invoice.number}</strong><small className="table-sub">{new Date(invoice.createdAt).toLocaleString('pt-AO')}</small></td>
                        <td>{invoice.plan.name}<small className="table-sub">{cycleLabel[invoice.billingCycle]}</small></td>
                        <td><small>{formatDate(invoice.periodStart)} → {formatDate(invoice.periodEnd)}</small></td>
                        <td><strong>{formatAOA(invoice.amount)}</strong></td>
                        <td>
                          <span className={`status-pill ${invoiceTone[invoice.status]}`}>{invoiceLabel[invoice.status]}</span>
                          {invoice.reviewNote && <small className="table-sub">{invoice.reviewNote}</small>}
                        </td>
                        <td><ProofCell invoice={invoice} onDone={load} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ProofCell({ invoice, onDone }: { invoice: SubscriptionInvoice; onDone: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = invoice.status === 'PENDING' || invoice.status === 'REJECTED';

  if (!canSubmit) {
    return invoice.proofUrl
      ? <a className="link" href={invoice.proofUrl} target="_blank" rel="noreferrer">Ver comprovativo</a>
      : <span className="table-sub">Sem comprovativo</span>;
  }

  async function submit() {
    if (!file) { setError('Selecione o comprovativo.'); return; }
    setBusy(true);
    setError('');
    try {
      const uploaded = await uploadSubscriptionProof(file);
      await submitSubscriptionProof(invoice.id, uploaded.url, note.trim() || undefined);
      setFile(null);
      setNote('');
      await onDone();
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível enviar o comprovativo.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="proof-cell">
      {invoice.proofUrl && <a className="link" href={invoice.proofUrl} target="_blank" rel="noreferrer">Ver atual</a>}
      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      <input className="input" placeholder="Nota (opcional)" value={note} onChange={(event) => setNote(event.target.value)} />
      {error && <small className="form-error-inline">{error}</small>}
      <button type="button" className="tiny-btn success-btn" disabled={busy} onClick={() => void submit()}>{busy ? 'A enviar…' : 'Enviar comprovativo'}</button>
    </div>
  );
}
