import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AccountRole, extractMessage, login, registerCustomer, registerDriver, registerSupplier, rolePath } from '../services/auth';

const roleConfig: Record<'CUSTOMER' | 'DRIVER' | 'SUPPLIER', { title: string; subtitle: string; displayName: string; action: string }> = {
  CUSTOMER: { title: 'Gás na sua porta, sem complicação.', subtitle: 'Crie a sua conta para pedir, acompanhar e gerir as suas entregas.', displayName: 'Cliente', action: 'Criar conta' },
  DRIVER: { title: 'Entre na operação como entregador.', subtitle: 'Candidate-se com os seus dados reais. A conta profissional só fica operacional depois da validação.', displayName: 'Entregador', action: 'Enviar candidatura' },
  SUPPLIER: { title: 'Traga a sua empresa para a rede.', subtitle: 'Cadastre os dados oficiais da empresa e aguarde a validação antes de receber pedidos.', displayName: 'Empresa', action: 'Enviar candidatura' },
};

const roleSlugs: Record<'CUSTOMER' | 'DRIVER' | 'SUPPLIER', string> = { CUSTOMER: 'customer', DRIVER: 'driver', SUPPLIER: 'empresa' };

export default function RegisterPage() {
  const { role: rawRole } = useParams();
  const normalized = rawRole?.toUpperCase();
  const role: AccountRole = normalized === 'DRIVER' ? 'DRIVER' : normalized === 'SUPPLIER' || normalized === 'EMPRESA' ? 'SUPPLIER' : 'CUSTOMER';
  const config = roleConfig[role];
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', phone: '+244 ', email: '', password: '', confirmPassword: '', company: '', legalName: '', taxId: '', document: '', vehicle: '', consent: false });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isProfessional = role !== 'CUSTOMER';
  const totalSteps = isProfessional ? 2 : 1;
  const passwordScore = useMemo(() => {
    let score = 0;
    if (form.password.length >= 10) score++;
    if (/[A-Z]/.test(form.password)) score++;
    if (/[a-z]/.test(form.password)) score++;
    if (/\d/.test(form.password)) score++;
    if (/[^A-Za-z0-9]/.test(form.password)) score++;
    return score;
  }, [form.password]);

  function update(field: keyof typeof form, value: string | boolean) { setForm((current) => ({ ...current, [field]: value })); }
  function validateBase() {
    if (form.name.trim().length < 2) return 'Introduza o nome completo.';
    if (form.phone.replace(/\D/g, '').length < 9) return 'Introduza um número de telefone angolano válido.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Verifique o endereço de email.';
    if (form.password.length < 10) return 'A palavra-passe deve ter pelo menos 10 caracteres.';
    if (form.password !== form.confirmPassword) return 'A confirmação da palavra-passe não coincide.';
    if (passwordScore < 3) return 'Use uma palavra-passe mais forte: letras e números, de preferência com símbolo.';
    if (!form.consent) return 'Aceite os termos e a política de privacidade para continuar.';
    return '';
  }
  function next(event: FormEvent) {
    event.preventDefault();
    const message = validateBase();
    if (message) { setError(message); return; }
    setError('');
    if (isProfessional) setStep(2); else void submitRegistration();
  }
  async function submitRegistration() {
    setError('');
    if (role === 'SUPPLIER' && (!form.company.trim() || !form.legalName.trim() || form.taxId.trim().length < 5)) { setError('Preencha a razão social, o nome comercial e o NIF.'); return; }
    if (role === 'DRIVER' && (form.document.trim().length < 4 || form.vehicle.trim().length < 2)) { setError('Preencha o documento de identificação e o tipo de veículo.'); return; }
    setSubmitting(true);
    try {
      if (role === 'CUSTOMER') await registerCustomer({ fullName: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || undefined, password: form.password });
      else if (role === 'DRIVER') await registerDriver({ fullName: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || undefined, password: form.password, documentNumber: form.document.trim(), vehicleType: form.vehicle.trim() });
      else await registerSupplier({ legalName: form.legalName.trim(), tradeName: form.company.trim(), nif: form.taxId.trim(), responsibleName: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || undefined, password: form.password });
      const session = await login({ phone: form.phone.trim(), password: form.password });
      navigate(session.user.status === 'ACTIVE' ? rolePath(role) : '/estado-candidatura', { replace: true });
    } catch (cause) { setError(extractMessage(cause, 'Não foi possível concluir o registo.')); } finally { setSubmitting(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); if (step === 1) void next(event); else void submitRegistration(); }

  return <div className={`page register-page register-${roleSlugs[role]}`}>
    <div className="register-container">
      <header className="register-page-heading">
        <Link to="/acesso" className="register-back-link">← Voltar aos perfis</Link>
        <span className="register-overline">Gás Expresso <i /> {isProfessional ? 'Candidatura profissional' : 'Conta pessoal'}</span>
        <h1>{config.title}</h1>
        <p>{config.subtitle}</p>
      </header>

      <nav className="register-role-switch" aria-label="Tipo de conta">
        {(['CUSTOMER', 'DRIVER', 'SUPPLIER'] as ('CUSTOMER' | 'DRIVER' | 'SUPPLIER')[]).map((item, index) => (
          <Link key={item} to={`/registar/${roleSlugs[item]}`} className={`register-role-option ${role === item ? 'active' : ''}`}>
            <span className="register-role-number">0{index + 1}</span><span>{roleConfig[item].displayName}</span>
          </Link>
        ))}
      </nav>

      <div className="register-layout">
        <aside className="register-aside">
          <div className="register-aside-badge">{isProfessional ? 'Validação profissional' : 'Conta pessoal'}</div>
          <h2>{isProfessional ? 'Antes de operar, a conta passa por validação.' : 'Tenha tudo o que precisa num só lugar.'}</h2>
          <p>{isProfessional ? 'O envio do formulário cria uma candidatura. A operação só fica disponível quando a API devolver a conta como ativa.' : 'Use a mesma conta para pedir gás, consultar o histórico e acompanhar as suas entregas.'}</p>
          <div className="register-process">
            <div className="register-process-step"><span>01</span><div><strong>Dados reais</strong><small>Informe apenas dados que possa comprovar.</small></div></div>
            {isProfessional && <div className="register-process-step"><span>02</span><div><strong>Revisão</strong><small>A equipa verifica os dados profissionais e pode solicitar informação adicional.</small></div></div>}
            <div className="register-process-step"><span>{isProfessional ? '03' : '02'}</span><div><strong>{isProfessional ? 'Ativação' : 'Conta pronta'}</strong><small>{isProfessional ? 'Só depois da aprovação a área operacional fica disponível.' : 'Depois do registo, pode entrar e usar o serviço.'}</small></div></div>
          </div>
          <div className="register-aside-trust"><span>✓ Dados tratados de forma protegida</span><span>✓ Sem ativação profissional automática</span><span>✓ Estado confirmado pelo servidor</span></div>
        </aside>

        <form className="register-card" onSubmit={submit} noValidate>
          <div className="register-card-head">
            <div>
              <span className="register-step-caption">{isProfessional ? `PASSO ${step} DE ${totalSteps}` : 'CRIAÇÃO DE CONTA'}</span>
              <h2>{step === 1 ? 'Dados de acesso' : role === 'DRIVER' ? 'Dados do entregador' : 'Dados da empresa'}</h2>
              <p>{step === 1 ? 'Os dados abaixo serão usados para autenticar a conta.' : 'Preencha somente dados verdadeiros. A equipa poderá solicitar documentação adicional na validação.'}</p>
            </div>
            <div className="register-step-indicator" aria-label={`Passo ${step} de ${totalSteps}`}>
              {Array.from({ length: totalSteps }, (_, i) => <span key={i} className={i + 1 <= step ? 'active' : ''} />)}
            </div>
          </div>

          {step === 1 ? <div className="register-form-fields">
            <div className="field"><label htmlFor="reg-name">{role === 'SUPPLIER' ? 'Responsável da empresa' : 'Nome completo'}</label><input id="reg-name" className="input" value={form.name} onChange={(e) => update('name', e.target.value)} autoComplete="name" required /></div>
            <div className="field"><label htmlFor="reg-phone">Telefone</label><input id="reg-phone" type="tel" className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} autoComplete="tel" inputMode="tel" required /><small className="field-help">Formato recomendado: +244 9XX XXX XXX</small></div>
            <div className="field"><label htmlFor="reg-email">Email <span className="register-field-note">opcional</span></label><input id="reg-email" type="email" className="input" value={form.email} onChange={(e) => update('email', e.target.value)} autoComplete="email" /></div>
            <div className="field"><label htmlFor="reg-password">Palavra-passe</label><input id="reg-password" type="password" className="input" value={form.password} onChange={(e) => update('password', e.target.value)} autoComplete="new-password" minLength={10} required /><div className="password-strength" aria-label="Força da palavra-passe"><span className={`strength-${passwordScore}`} /><small>{passwordScore >= 4 ? 'Boa proteção' : 'Use 10+ caracteres, letras e números'}</small></div></div>
            <div className="field"><label htmlFor="reg-confirm">Confirmar palavra-passe</label><input id="reg-confirm" type="password" className="input" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} autoComplete="new-password" minLength={10} required /></div>
            <label className="consent-row"><input type="checkbox" checked={form.consent} onChange={(e) => update('consent', e.target.checked)} /><span>Li e aceito os termos de utilização e a política de privacidade do Gás Expresso.</span></label>
          </div> : <div className="register-form-fields">
            {role === 'DRIVER' ? <>
              <div className="register-section-note"><strong>Identificação do entregador</strong><span>Estes dados iniciam uma candidatura e não colocam a conta automaticamente online.</span></div>
              <div className="field"><label htmlFor="reg-document">Documento de identificação</label><input id="reg-document" className="input" value={form.document} onChange={(e) => update('document', e.target.value)} autoComplete="off" required /></div>
              <div className="field"><label htmlFor="reg-vehicle">Tipo de veículo</label><input id="reg-vehicle" className="input" value={form.vehicle} onChange={(e) => update('vehicle', e.target.value)} placeholder="Ex.: Moto, motorizada ou carrinha" required /></div>
              <div className="register-review-card"><span className="register-review-check">✓</span><div><strong>O que acontece depois</strong><span>A candidatura fica pendente para revisão. A operação só é liberada quando o estado da conta estiver ativo.</span></div></div>
            </> : <>
              <div className="register-section-note"><strong>Identificação oficial da empresa</strong><span>Os dados devem corresponder aos registos oficiais que serão apresentados durante a validação.</span></div>
              <div className="field"><label htmlFor="reg-company">Nome comercial</label><input id="reg-company" className="input" value={form.company} onChange={(e) => update('company', e.target.value)} required /></div>
              <div className="field"><label htmlFor="reg-legal">Razão social</label><input id="reg-legal" className="input" value={form.legalName} onChange={(e) => update('legalName', e.target.value)} required /></div>
              <div className="field"><label htmlFor="reg-nif">NIF</label><input id="reg-nif" className="input" value={form.taxId} onChange={(e) => update('taxId', e.target.value.toUpperCase())} inputMode="numeric" required /></div>
              <div className="register-review-card"><span className="register-review-check">✓</span><div><strong>O que acontece depois</strong><span>A empresa fica em análise. A área operacional só fica disponível depois da aprovação devolvida pelo servidor.</span></div></div>
            </>}
          </div>}

          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="register-actions">{step === 2 && <button type="button" className="secondary-btn" onClick={() => { setStep(1); setError(''); }}>Voltar</button>}<button type="submit" className="primary-btn" disabled={submitting}>{submitting ? 'A enviar…' : step === 1 && isProfessional ? 'Continuar' : config.action} <span>→</span></button></div>
          <p className="register-security-note">Os dados profissionais ficam sujeitos ao estado de aprovação devolvido pela API. Não mostramos uma conta como operacional sem confirmação do servidor.</p>
        </form>
      </div>
    </div>
  </div>;

}
