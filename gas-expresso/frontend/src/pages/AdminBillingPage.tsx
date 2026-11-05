import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import {
  confirmAdminBillingInvoice,
  fetchAdminBillingInvoices,
  fetchAdminBillingPlans,
  fetchAdminSubscriptions,
  rejectAdminBillingInvoice,
  updateAdminBillingPlan,
  updateAdminSubscriptionStatus,
  type AdminSubscription,
  type AdminSubscriptionInvoice,
  type BillingPlan,
  type SubscriptionInvoiceStatus,
  type SubscriptionStatus,
} from '../services/billing';

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

const subscriptionLabel: Record<SubscriptionStatus, string> = {
  TRIAL: 'Teste',
  ACTIVE: 'Ativa',
  PAST_DUE: 'Em atraso',
  SUSPENDED: 'Suspensa',
  CANCELLED: 'Cancelada',
};

const subscriptionTone: Record<SubscriptionStatus, string> = {
  TRIAL: 'warning',
  ACTIVE: 'success',
  PAST_DUE: 'danger',
  SUSPENDED: 'danger',
  CANCELLED: 'danger',
};

const cycleLabel = { MONTHLY: 'Mensal', YEARLY: 'Anual' } as const;

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('pt-AO') : '—';
}

export default function AdminBillingPage() {
  const [invoices, setInvoices] = useState<AdminSubscriptionInvoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [invoiceList, subscriptionList, planList] = await Promise.all([
        fetchAdminBillingInvoices(),
        fetchAdminSubscriptions(),
        fetchAdminBillingPlans(),
      ]);
      setInvoices(invoiceList);
      setSubscriptions(subscriptionList);
      setPlans(planList);
      setError('');
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível carregar as assinaturas.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
      await load();
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível concluir a operação.'));
    } finally {
      setBusy('');
    }
  }

  const pendingInvoices = invoices.filter((invoice) => invoice.status === 'AWAITING_CONFIRMATION' || invoice.status === 'PENDING');

  return (
    <div className="page workspace-page admin-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">Backoffice / Assinaturas</span>
          <h1>Licenças e pagamentos.</h1>
          <p>Confirme transferências, gira assinaturas das empresas e ajuste os preços dos planos.</p>
        </div>
        <div className="admin-actions-row">
          <button type="button" className="secondary-btn" onClick={() => void load()} disabled={loading}>{loading ? 'A carregar…' : '↻ Atualizar'}</button>
          <Link to="/admin" className="secondary-btn">Dashboard</Link>
        </div>
      </div>

      {error && <div className="form-error" role="alert"><strong>Erro:</strong> {error}</div>}
      {message && <div className="success-banner" role="status">{message}</div>}

      {loading && !invoices.length ? <div className="loading-panel">A carregar assinaturas…</div> : (
        <>
          <section className="workspace-panel">
            <div className="panel-title">
              <div><span className="section-kicker">Faturação</span><h2>Comprovativos e pagamentos</h2></div>
              <span className="admin-counter">{pendingInvoices.length}</span>
            </div>
            {invoices.length === 0 ? (
              <div className="empty-state compact"><h3>Sem faturas</h3><p>Ainda não foram geradas faturas de assinatura.</p></div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Empresa</th><th>Fatura</th><th>Plano</th><th>Período</th><th>Valor</th><th>Estado</th><th>Ações</th></tr></thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td><strong>{invoice.supplier.tradeName}</strong><small className="table-sub">{invoice.supplier.user.phone}</small></td>
                        <td><strong>{invoice.number}</strong><small className="table-sub">{new Date(invoice.createdAt).toLocaleString('pt-AO')}</small></td>
                        <td>{invoice.plan.name}<small className="table-sub">{cycleLabel[invoice.billingCycle]}</small></td>
                        <td><small>{formatDate(invoice.periodStart)} → {formatDate(invoice.periodEnd)}</small></td>
                        <td><strong>{formatAOA(invoice.amount)}</strong></td>
                        <td>
                          <span className={`status-pill ${invoiceTone[invoice.status]}`}>{invoiceLabel[invoice.status]}</span>
                          {invoice.proofUrl && <a className="link table-sub" href={invoice.proofUrl} target="_blank" rel="noreferrer">Ver comprovativo</a>}
                          {invoice.reviewNote && <small className="table-sub">{invoice.reviewNote}</small>}
                        </td>
                        <td><InvoiceActions invoice={invoice} busy={busy === invoice.id} onConfirm={() => run(invoice.id, () => confirmAdminBillingInvoice(invoice.id), `Pagamento ${invoice.number} confirmado.`)} onReject={(reason) => run(invoice.id, () => rejectAdminBillingInvoice(invoice.id, reason), `Fatura ${invoice.number} rejeitada.`)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="workspace-panel">
            <div className="panel-title">
              <div><span className="section-kicker">Empresas</span><h2>Assinaturas ativas e em atraso</h2></div>
            </div>
            {subscriptions.length === 0 ? (
              <div className="empty-state compact"><h3>Sem assinaturas</h3><p>As empresas passam a ter assinatura automaticamente quando acessam a área de licença.</p></div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Empresa</th><th>Plano</th><th>Estado</th><th>Fim do período</th><th>Dias</th><th>Ações</th></tr></thead>
                  <tbody>
                    {subscriptions.map((subscription) => (
                      <tr key={subscription.id}>
                        <td><strong>{subscription.supplier.tradeName}</strong><small className="table-sub">{subscription.supplier.user.phone}</small></td>
                        <td>{subscription.plan.name}<small className="table-sub">{cycleLabel[subscription.billingCycle]}</small></td>
                        <td><span className={`status-pill ${subscriptionTone[subscription.status]}`}>{subscriptionLabel[subscription.status]}</span></td>
                        <td><small>{formatDate(subscription.status === 'TRIAL' ? subscription.trialEndsAt : subscription.currentPeriodEnd)}</small></td>
                        <td>{subscription.daysRemaining ?? '—'}</td>
                        <td>
                          <div className="inline-actions">
                            {subscription.status !== 'SUSPENDED' && (
                              <button type="button" className="tiny-btn danger-btn" disabled={busy === subscription.supplierId} onClick={() => void run(subscription.supplierId, () => updateAdminSubscriptionStatus(subscription.supplierId, 'suspend'), `Assinatura de ${subscription.supplier.tradeName} suspensa.`)}>Suspender</button>
                            )}
                            {subscription.status !== 'ACTIVE' && (
                              <button type="button" className="tiny-btn success-btn" disabled={busy === subscription.supplierId} onClick={() => void run(subscription.supplierId, () => updateAdminSubscriptionStatus(subscription.supplierId, 'reactivate'), `Assinatura de ${subscription.supplier.tradeName} reativada.`)}>Reativar</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="workspace-panel">
            <div className="panel-title">
              <div><span className="section-kicker">Catálogo</span><h2>Planos e preços</h2></div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Plano</th><th>Mensal (Kz)</th><th>Anual (Kz)</th><th>Filiais</th><th>Utilizadores</th><th>Ativo</th><th>Ação</th></tr></thead>
                <tbody>
                  {plans.map((plan) => (
                    <PlanRow key={plan.id} plan={plan} onSave={(input) => run(plan.id, () => updateAdminBillingPlan(plan.id, input), `Plano ${plan.name} atualizado.`)} busy={busy === plan.id} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function InvoiceActions({ invoice, busy, onConfirm, onReject }: { invoice: AdminSubscriptionInvoice; busy: boolean; onConfirm: () => void; onReject: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
    return <span className="table-sub">Sem ação</span>;
  }
  return (
    <div className="inline-actions billing-actions">
      {invoice.status === 'AWAITING_CONFIRMATION' && (
        <button type="button" className="tiny-btn success-btn" disabled={busy} onClick={onConfirm}>Confirmar</button>
      )}
      <input className="input billing-reason" placeholder="Motivo" value={reason} onChange={(event) => setReason(event.target.value)} />
      <button type="button" className="tiny-btn danger-btn" disabled={busy || reason.trim().length < 3} onClick={() => onReject(reason.trim())}>Rejeitar</button>
    </div>
  );
}

function PlanRow({ plan, busy, onSave }: { plan: BillingPlan; busy: boolean; onSave: (input: { name: string; priceMonthly: number; priceYearly: number; maxBranches: number | null; maxUsers: number | null; active: boolean }) => void }) {
  const [name, setName] = useState(plan.name);
  const [monthly, setMonthly] = useState(String(plan.priceMonthly));
  const [yearly, setYearly] = useState(String(plan.priceYearly));
  const [branches, setBranches] = useState(plan.maxBranches == null ? '' : String(plan.maxBranches));
  const [users, setUsers] = useState(plan.maxUsers == null ? '' : String(plan.maxUsers));
  const [active, setActive] = useState(plan.active);

  return (
    <tr>
      <td><strong>{plan.code}</strong><input className="input" value={name} onChange={(event) => setName(event.target.value)} /></td>
      <td><input className="input billing-number" type="number" min="0" value={monthly} onChange={(event) => setMonthly(event.target.value)} /></td>
      <td><input className="input billing-number" type="number" min="0" value={yearly} onChange={(event) => setYearly(event.target.value)} /></td>
      <td><input className="input billing-number" type="number" min="1" placeholder="Ilimitado" value={branches} onChange={(event) => setBranches(event.target.value)} /></td>
      <td><input className="input billing-number" type="number" min="1" placeholder="Ilimitado" value={users} onChange={(event) => setUsers(event.target.value)} /></td>
      <td><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /></td>
      <td>
        <button type="button" className="tiny-btn success-btn" disabled={busy} onClick={() => onSave({
          name: name.trim(),
          priceMonthly: Number(monthly) || 0,
          priceYearly: Number(yearly) || 0,
          maxBranches: branches.trim() ? Number(branches) : null,
          maxUsers: users.trim() ? Number(users) : null,
          active,
        })}>{busy ? 'A guardar…' : 'Guardar'}</button>
      </td>
    </tr>
  );
}
