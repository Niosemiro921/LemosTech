import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchAdminPartners, updateAdminPartnerStatus, type AdminPartner } from '../services/admin';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';

type PartnerAction = 'approve' | 'reject' | 'suspend' | 'reactivate';

export default function AdminPartnersPage() {
  const [params, setParams] = useSearchParams();
  const [type, setType] = useState(params.get('type') || '');
  const [items, setItems] = useState<AdminPartner[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setItems(await fetchAdminPartners(type || undefined));
      setError('');
    } catch (requestError) {
      setError(extractMessage(requestError, 'Não foi possível carregar os parceiros.'));
    }
  };

  useEffect(() => {
    void load();
  }, [type]);

  const action = async (id: string, kind: PartnerAction) => {
    const reason = kind === 'reject'
      ? window.prompt('Indique o motivo da rejeição.')
      : undefined;
    if (kind === 'reject' && reason === null) return;
    if (kind === 'reject' && !reason?.trim()) {
      setError('O motivo da rejeição é obrigatório.');
      return;
    }

    try {
      await updateAdminPartnerStatus(id, kind, reason ?? undefined);
      await load();
    } catch (requestError) {
      setError(extractMessage(requestError, 'Não foi possível executar a ação.'));
    }
  };

  const setFilter = (value: string) => {
    setType(value);
    setParams(value ? { type: value } : {});
  };

  return (
    <div className="page admin-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">Backoffice / Parceiros</span>
          <h1>Empresas e entregadores.</h1>
          <p>O estado operacional deve ser decidido pelo servidor após validação.</p>
        </div>
        <Link to="/admin" className="secondary-btn">Dashboard</Link>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="filter-bar">
        <button className={type === '' ? 'active' : ''} onClick={() => setFilter('')}>Todos</button>
        <button className={type === 'DRIVER' ? 'active' : ''} onClick={() => setFilter('DRIVER')}>Entregadores</button>
        <button className={type === 'SUPPLIER' ? 'active' : ''} onClick={() => setFilter('SUPPLIER')}>Empresas</button>
      </div>
      <section className="workspace-panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Parceiro</th><th>Tipo</th><th>Estado</th><th>Contacto</th><th>Saldo</th><th>Acções</th></tr>
            </thead>
            <tbody>
              {items.length ? items.map((partner) => (
                <tr key={partner.id}>
                  <td><strong>{partner.name}</strong><small className="table-sub">{partner.id}</small></td>
                  <td>{partner.type}</td>
                  <td>
                    <span className={`status-pill ${partner.status === 'ACTIVE' ? 'success' : partner.status === 'SUSPENDED' ? 'danger' : 'warning'}`}>
                      {partner.status}
                    </span>
                  </td>
                  <td>{partner.phone || '—'}</td>
                  <td>{partner.balance != null ? formatAOA(partner.balance) : '—'}</td>
                  <td>
                    <div className="inline-actions">
                      {['PENDING_REVIEW', 'DOCUMENTS_REQUIRED'].includes(partner.status) && <>
                        <button className="tiny-btn success-btn" onClick={() => void action(partner.id, 'approve')}>Aprovar</button>
                        <button className="tiny-btn danger-btn" onClick={() => void action(partner.id, 'reject')}>Rejeitar</button>
                      </>}
                      {partner.status === 'ACTIVE' && (
                        <button className="tiny-btn danger-btn" onClick={() => void action(partner.id, 'suspend')}>Suspender</button>
                      )}
                      {['REJECTED', 'SUSPENDED'].includes(partner.status) && (
                        <button className="tiny-btn" onClick={() => void action(partner.id, 'reactivate')}>Reactivar</button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6}><div className="empty-state compact"><h3>Sem parceiros</h3><p>A API não devolveu registos.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
