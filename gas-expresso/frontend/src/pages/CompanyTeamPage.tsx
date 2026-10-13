import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCompanyTeam, type CompanyTeamMember } from '../services/company';
import { extractMessage } from '../services/auth';

const roleLabels: Record<string, string> = { OWNER: 'Proprietário', ADMIN: 'Administrador', OPERATOR: 'Operador' };
const statusLabels: Record<string, string> = { ACTIVE: 'Activa', PENDING_REVIEW: 'Em análise', DOCUMENTS_REQUIRED: 'Documentos necessários', REJECTED: 'Rejeitada', SUSPENDED: 'Suspensa' };

export default function CompanyTeamPage() {
  const [items, setItems] = useState<CompanyTeamMember[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  async function load() { setLoading(true); try { setItems(await fetchCompanyTeam()); setError(''); } catch (cause) { setError(extractMessage(cause, 'Não foi possível carregar a equipa.')); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  return <div className="supplier-module-page page"><header className="workspace-heading"><div><span className="section-kicker">EMPRESA · ACESSOS</span><h1>Equipa da empresa</h1><p>Consulte os utilizadores associados à operação. A API actual permite consulta, mas ainda não permite convidar, editar ou remover membros.</p></div><button className="secondary-btn" onClick={() => void load()} disabled={loading}>↻ Actualizar</button></header>
    {error && <div className="form-error" role="alert">{error}</div>}
    <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">DIRECTÓRIO</span><h2>Utilizadores conhecidos pela API</h2></div><span className="supplier-muted-copy">{items.length} membro(s)</span></div>
      {loading ? <div className="loading-panel" role="status">A consultar equipa…</div> : items.length ? <div className="table-wrap"><table className="data-table supplier-company-table"><thead><tr><th>Utilizador</th><th>Contacto</th><th>Função</th><th>Estado</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small className="table-sub">ID {item.id}</small></td><td>{item.phone || '—'}<small className="table-sub">{item.email || 'Email não informado'}</small></td><td>{roleLabels[item.role] ?? item.role}</td><td><span className={`status-pill ${item.status === 'ACTIVE' ? 'success' : item.status === 'REJECTED' || item.status === 'SUSPENDED' ? 'danger' : 'warning'}`}>{statusLabels[item.status] ?? item.status}</span></td></tr>)}</tbody></table></div> : <div className="empty-state"><h3>Não há membros para apresentar</h3><p>A API não devolveu utilizadores associados à conta actual.</p></div>}
    </section>
    <div className="supplier-api-note"><strong>Gestão de acessos em falta</strong><p>Para convidar membros e definir permissões por função, o backend precisa de endpoints de listagem paginada, convite/criação, actualização de papel e desactivação de membros. Até lá, esta página é só de consulta.</p></div>
    <div className="supplier-inline-links"><Link to="/fornecedor/perfil">Perfil da empresa →</Link><Link to="/empresa/documentos">Documentos →</Link></div>
  </div>;
}
