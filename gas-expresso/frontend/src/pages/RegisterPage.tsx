import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AccountRole, createDemoUser, rolePath, saveSession } from '../services/auth';

const roleConfig: Record<AccountRole, { title: string; subtitle: string; icon: string; status: string }> = {
  CUSTOMER: { title: 'Criar conta de cliente', subtitle: 'Peça gás e acompanhe as suas entregas.', icon: '👤', status: 'A sua conta ficará ativa após a verificação do telefone.' },
  DRIVER: { title: 'Quero ser entregador', subtitle: 'Receba pedidos na sua zona e faça entregas.', icon: '🚚', status: 'A candidatura será enviada para análise da Gás Expresso.' },
  SUPPLIER: { title: 'Quero ser fornecedor', subtitle: 'Venda gás através da rede Gás Expresso.', icon: '🏪', status: 'Os dados e documentos da empresa serão analisados antes da ativação.' },
};

export default function RegisterPage() {
  const { role: rawRole } = useParams();
  const role = (rawRole || 'customer').toUpperCase() as AccountRole;
  const safeRole: AccountRole = roleConfig[role] ? role : 'CUSTOMER';
  const config = roleConfig[safeRole];
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', company: '', taxId: '', document: '', vehicle: '' });
  const [error, setError] = useState('');

  const isProfessional = useMemo(() => safeRole !== 'CUSTOMER', [safeRole]);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!form.name.trim() || form.phone.replace(/\D/g, '').length < 9 || form.password.length < 6) {
      setError('Preencha nome, telefone válido e uma senha com pelo menos 6 caracteres.');
      return;
    }
    if (safeRole === 'SUPPLIER' && (!form.company.trim() || !form.taxId.trim())) {
      setError('Para fornecedores, preencha a empresa e o NIF.');
      return;
    }
    const user = createDemoUser({
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      role: safeRole,
      status: safeRole === 'CUSTOMER' ? 'ACTIVE' : 'PENDING_REVIEW',
    });
    saveSession(user);
    navigate(safeRole === 'CUSTOMER' ? rolePath(safeRole) : '/estado-candidatura');
  }

  return (
    <div className="page auth-page">
      <div className="auth-shell registration">
        <section className="auth-intro">
          <div className="auth-avatar">{config.icon}</div>
          <span className="section-kicker">Cadastro</span>
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
          <div className="status-callout"><strong>O que acontece depois?</strong><span>{config.status}</span></div>
          <Link to="/acesso" className="back-link">← Escolher outro perfil</Link>
        </section>

        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-card-head"><div><span className="section-kicker">Dados básicos</span><h2>Preencha os seus dados</h2></div><span className="auth-step">1 / 2</span></div>
          <div className="form-grid two-col">
            <div className="field"><label htmlFor="reg-name">{safeRole === 'SUPPLIER' ? 'Nome do responsável' : 'Nome completo'}</label><input id="reg-name" className="input" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Seu nome" /></div>
            <div className="field"><label htmlFor="reg-phone">Telefone</label><input id="reg-phone" className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+244 9XX XXX XXX" /></div>
            <div className="field"><label htmlFor="reg-email">Email <span className="optional">opcional</span></label><input id="reg-email" type="email" className="input" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="voce@email.com" /></div>
            <div className="field"><label htmlFor="reg-password">Senha</label><input id="reg-password" type="password" className="input" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
          </div>

          {safeRole === 'DRIVER' && <div className="registration-block"><span className="section-kicker">Validação operacional</span><h3>Dados do entregador</h3><div className="form-grid two-col"><div className="field"><label htmlFor="reg-document">Documento de identificação</label><input id="reg-document" className="input" value={form.document} onChange={(e) => update('document', e.target.value)} placeholder="Número do documento" /></div><div className="field"><label htmlFor="reg-vehicle">Veículo</label><input id="reg-vehicle" className="input" value={form.vehicle} onChange={(e) => update('vehicle', e.target.value)} placeholder="Ex.: Motorizada, carrinha" /></div></div></div>}

          {safeRole === 'SUPPLIER' && <div className="registration-block"><span className="section-kicker">Dados da empresa</span><h3>Informações do fornecedor</h3><div className="form-grid two-col"><div className="field"><label htmlFor="reg-company">Nome comercial</label><input id="reg-company" className="input" value={form.company} onChange={(e) => update('company', e.target.value)} placeholder="Nome da empresa" /></div><div className="field"><label htmlFor="reg-tax">NIF</label><input id="reg-tax" className="input" value={form.taxId} onChange={(e) => update('taxId', e.target.value)} placeholder="NIF" /></div></div><p className="field-help">Na próxima fase vamos acrescentar documentos, localização do estabelecimento, produtos e licenças aplicáveis.</p></div>}

          {isProfessional && <div className="info-strip"><strong>🔒 Verificação antes de operar</strong><span>O cadastro não coloca a conta profissional online automaticamente.</span></div>}
          {error && <div className="form-error">{error}</div>}
          <button className="primary-btn full" type="submit">{safeRole === 'CUSTOMER' ? 'Criar conta e continuar' : 'Enviar candidatura'} <span>→</span></button>
          <p className="auth-footnote">Ao continuar, você aceita os termos de utilização da plataforma.</p>
          <Link to="/login" className="back-link">Já tenho uma conta → Entrar</Link>
        </form>
      </div>
    </div>
  );
}
