import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage, fetchMe, type SessionUser } from '../services/auth';
import { fetchSupplierLocation, type SupplierLocation } from '../services/supplier';

export default function SupplierProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [location, setLocation] = useState<SupplierLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const results = await Promise.allSettled([fetchMe(), fetchSupplierLocation()]);
    const errors: string[] = [];
    if (results[0].status === 'fulfilled') setUser(results[0].value); else errors.push(extractMessage(results[0].reason, 'Não foi possível consultar a conta.'));
    if (results[1].status === 'fulfilled') setLocation(results[1].value); else errors.push(extractMessage(results[1].reason, 'Não foi possível consultar a localização.'));
    setError(errors.join(' '));
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const stateLabel: Record<string, string> = { ACTIVE: 'Activa', PENDING_REVIEW: 'Em análise', DOCUMENTS_REQUIRED: 'Documentos necessários', REJECTED: 'Rejeitada', SUSPENDED: 'Suspensa' };
  return <div className="supplier-module-page page">
    <header className="workspace-heading"><div><span className="section-kicker">EMPRESA · CONTA</span><h1>Perfil da empresa</h1><p>Consulte o estado da conta e as informações disponíveis no backend actual.</p></div><button className="secondary-btn" onClick={() => void load()} disabled={loading}>↻ Actualizar</button></header>
    {error && <div className="form-error" role="alert">{error}</div>}
    {loading ? <div className="loading-panel" role="status">A consultar os dados da conta…</div> : <div className="workspace-grid two-col supplier-profile-grid">
      <section className="workspace-panel"><span className="section-kicker">CONTA DE ACESSO</span><h2>Credenciais e estado</h2><dl className="supplier-profile-details"><div><dt>Telefone</dt><dd>{user?.phone || 'Não devolvido pela API'}</dd></div><div><dt>Email</dt><dd>{user?.email || 'Não informado'}</dd></div><div><dt>Tipo de conta</dt><dd>{user?.role === 'SUPPLIER' ? 'Empresa / Fornecedor' : user?.role || 'Não devolvido'}</dd></div><div><dt>Estado</dt><dd><span className={`status-pill ${user?.status === 'ACTIVE' ? 'success' : 'warning'}`}>{stateLabel[user?.status ?? ''] ?? user?.status ?? 'Desconhecido'}</span></dd></div><div><dt>ID da conta</dt><dd className="supplier-mono-value">{user?.id || 'Não devolvido pela API'}</dd></div></dl>
        {user?.status !== 'ACTIVE' && <div className="supplier-inline-warning"><strong>Acesso operacional condicionado</strong><p>A conta só poderá operar quando a Administração a aprovar. O estado apresentado é o devolvido pelo servidor.</p></div>}
      </section>
      <section className="workspace-panel"><span className="section-kicker">IDENTIDADE COMERCIAL</span><h2>Dados legais da empresa</h2><p>O cadastro inicial guarda razão social, nome comercial, NIF e responsável. Contudo, o backend enviado não tem endpoints de leitura ou actualização do perfil comercial, por isso estes dados não podem ser apresentados ou editados aqui com segurança.</p><div className="supplier-pending-fields"><div><span>Razão social</span><strong>Endpoint de perfil em falta</strong></div><div><span>Nome comercial</span><strong>Endpoint de perfil em falta</strong></div><div><span>NIF</span><strong>Endpoint de perfil em falta</strong></div><div><span>Responsável</span><strong>Endpoint de perfil em falta</strong></div></div><div className="supplier-api-note"><strong>Pendência do backend</strong><p>Implementar GET e PATCH em <code>/suppliers/me/profile</code>, com validação dos dados e registo de auditoria antes de activar um formulário de edição.</p></div></section>
      <section className="workspace-panel supplier-profile-location-card"><span className="section-kicker">LOCALIZAÇÃO OPERACIONAL</span><h2>{location?.latitude != null && location.longitude != null ? 'Coordenadas configuradas' : 'Localização ainda não configurada'}</h2><p>{location?.latitude != null && location.longitude != null ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Defina o ponto da empresa no mapa real para ajudar o sistema a seleccionar a empresa na cotação.'}</p><Link className="primary-btn" to="/fornecedor/localizacao">Gerir localização →</Link></section>
      <section className="workspace-panel"><span className="section-kicker">CONTA E EQUIPA</span><h2>Mais configurações</h2><div className="supplier-settings-links"><Link to="/empresa/documentos">Documentos <span>Consultar estado e revisão →</span></Link><Link to="/empresa/equipa">Equipa <span>Ver utilizadores conhecidos →</span></Link><Link to="/empresa/horarios">Horários <span>Definir dias e horas de atendimento →</span></Link></div></section>
    </div>}
  </div>;
}
