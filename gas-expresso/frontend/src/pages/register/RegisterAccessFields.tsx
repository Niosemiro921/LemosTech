import { AccessForm, passwordScore } from './registerConfig';

interface RegisterAccessFieldsProps {
  form: AccessForm;
  update: <K extends keyof AccessForm>(field: K, value: AccessForm[K]) => void;
  nameLabel?: string;
}

/** Campos de acesso (nome, contacto e palavra-passe) usados pelo cliente e pelos perfis profissionais. */
export function RegisterAccessFields({ form, update, nameLabel = 'Nome completo' }: RegisterAccessFieldsProps) {
  const score = passwordScore(form.password);
  return <>
    <div className="field">
      <label htmlFor="reg-name">{nameLabel}</label>
      <input id="reg-name" className="input" autoComplete="name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
    </div>
    <div className="field">
      <label htmlFor="reg-phone">Telefone</label>
      <input id="reg-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
      <small className="field-help">Ex.: +244 9XX XXX XXX</small>
    </div>
    <div className="field">
      <label htmlFor="reg-email">Email <span className="register-field-note">opcional</span></label>
      <input id="reg-email" className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
    </div>
    <div className="field">
      <label htmlFor="reg-password">Palavra-passe</label>
      <input id="reg-password" className="input" type="password" autoComplete="new-password" minLength={10} value={form.password} onChange={(e) => update('password', e.target.value)} required />
      <div className="password-strength" aria-label="Força da palavra-passe">
        <span className={`strength-${score}`} />
        <small>{score >= 4 ? 'Boa proteção' : '10+ caracteres, letras e números'}</small>
      </div>
    </div>
    <div className="field">
      <label htmlFor="reg-confirm">Confirmar palavra-passe</label>
      <input id="reg-confirm" className="input" type="password" autoComplete="new-password" minLength={10} value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} required />
    </div>
    <label className="consent-row">
      <input type="checkbox" checked={form.consent} onChange={(e) => update('consent', e.target.checked)} />
      <span>Li e aceito os termos de uso e a política de privacidade.</span>
    </label>
  </>;
}
