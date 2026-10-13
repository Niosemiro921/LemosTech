import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { extractMessage, login, registerSupplier } from '../../services/auth';
import { RegisterAccessFields } from './RegisterAccessFields';
import { AccessForm, emptyAccessForm, validateAccessForm } from './registerConfig';

type SupplierFields = { legalName: string; tradeName: string; nif: string; };
const emptySupplier: SupplierFields = { legalName: '', tradeName: '', nif: '' };

/** Formulário exclusivamente ligado ao contrato real POST /auth/register/supplier. */
export default function SupplierRegisterForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [access, setAccess] = useState<AccessForm>(emptyAccessForm);
  const [company, setCompany] = useState<SupplierFields>(emptySupplier);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateAccess = <K extends keyof AccessForm>(key: K, value: AccessForm[K]) => setAccess((current) => ({ ...current, [key]: value }));
  const updateCompany = <K extends keyof SupplierFields>(key: K, value: SupplierFields[K]) => setCompany((current) => ({ ...current, [key]: value }));

  function continueToCompany(event: FormEvent) {
    event.preventDefault();
    const message = validateAccessForm(access);
    if (message) { setError(message); return; }
    setError('');
    setStep(2);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (company.legalName.trim().length < 2 || company.tradeName.trim().length < 2 || company.nif.trim().length < 5) {
      setError('Preencha a razão social, o nome comercial e um NIF válido.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const phone = access.phone.trim();
      await registerSupplier({
        legalName: company.legalName.trim(),
        tradeName: company.tradeName.trim(),
        nif: company.nif.trim(),
        responsibleName: access.name.trim(),
        phone,
        email: access.email.trim() || undefined,
        password: access.password,
      });
      const session = await login({ phone, password: access.password, role: 'SUPPLIER' });
      navigate(session.user.status === 'ACTIVE' ? '/fornecedor' : '/estado-candidatura', { replace: true, state: { justRegistered: true } });
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível enviar o cadastro da empresa.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="register-layout supplier-register-layout">
      <aside className="register-aside">
        <div className="register-aside-badge">Cadastro comercial</div>
        <h2>Uma área própria para a sua empresa.</h2>
        <p>Depois da análise da equipa, a empresa poderá gerir pedidos, stock, localização e horários.</p>
        <div className="register-process">
          <div className="register-process-step"><span>01</span><div><strong>Conta responsável</strong><small>Contacto e credenciais de acesso.</small></div></div>
          <div className="register-process-step"><span>02</span><div><strong>Identidade comercial</strong><small>Razão social, nome comercial e NIF.</small></div></div>
          <div className="register-process-step"><span>03</span><div><strong>Análise</strong><small>O estado é definido pela API e pela Administração.</small></div></div>
        </div>
        <div className="register-aside-trust"><span>✓ Cadastro enviado ao backend real</span><span>✓ Sem aprovação fictícia</span><span>✓ Acesso operacional após aprovação</span></div>
      </aside>
      <form className="register-card" onSubmit={step === 1 ? continueToCompany : submit} noValidate>
        <div className="register-card-head">
          <div><span className="register-step-caption">PASSO {step} DE 2</span><h2>{step === 1 ? 'Dados do responsável' : 'Dados da empresa'}</h2><p>{step === 1 ? 'Estes dados são usados para autenticação e contacto.' : 'Estes são os campos actualmente aceites pelo endpoint de registo da empresa.'}</p></div>
          <div className="register-step-indicator" aria-label={`Passo ${step} de 2`}><span className="active"/><span className={step === 2 ? 'active' : ''}/></div>
        </div>
        {step === 1 ? <div className="register-form-fields"><RegisterAccessFields form={access} update={updateAccess} nameLabel="Nome do responsável"/></div> : <div className="register-form-fields">
          <div className="register-section-note"><strong>Identificação legal e comercial</strong><span>O registo actual do backend guarda estes dados. Registo comercial, actividade e morada detalhada devem ser acrescentados quando existir contrato de API para esses campos.</span></div>
          <div className="register-special-grid">
            <div className="field"><label htmlFor="supplier-legal-name">Razão social *</label><input id="supplier-legal-name" className="input" autoComplete="organization" value={company.legalName} onChange={(event) => updateCompany('legalName', event.target.value)} required minLength={2}/></div>
            <div className="field"><label htmlFor="supplier-trade-name">Nome comercial *</label><input id="supplier-trade-name" className="input" value={company.tradeName} onChange={(event) => updateCompany('tradeName', event.target.value)} required minLength={2}/></div>
            <div className="field full-field"><label htmlFor="supplier-nif">NIF da empresa *</label><input id="supplier-nif" className="input" inputMode="numeric" autoComplete="off" value={company.nif} onChange={(event) => updateCompany('nif', event.target.value.trimStart())} required minLength={5}/><small>Confirme que o NIF corresponde à documentação oficial da empresa.</small></div>
          </div>
        </div>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="register-actions">{step === 2 && <button type="button" className="register-previous" onClick={() => { setStep(1); setError(''); }} disabled={submitting}>← Voltar</button>}<button className="primary-btn register-submit" type="submit" disabled={submitting}>{submitting ? 'A enviar…' : step === 1 ? 'Continuar →' : 'Enviar cadastro da empresa'}</button></div>
        <div className="register-card-footer"><span>Já tem conta empresarial?</span><Link to="/login?role=supplier">Entrar no portal da empresa</Link></div>
      </form>
    </div>
  );
}
