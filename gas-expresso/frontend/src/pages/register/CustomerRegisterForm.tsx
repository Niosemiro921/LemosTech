import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { extractMessage, login, registerCustomer } from '../../services/auth';
import { RegisterAccessFields } from './RegisterAccessFields';
import { AccessForm, emptyAccessForm, validateAccessForm } from './registerConfig';

/**
 * Cadastro do Cliente: formulário simples, uma única página e sem o
 * processo profissional (lateral, passos, documentos ou veículo).
 */
export default function CustomerRegisterForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState<AccessForm>(emptyAccessForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof AccessForm>(field: K, value: AccessForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = validateAccessForm(form);
    if (message) { setError(message); return; }
    setError('');
    setSubmitting(true);
    try {
      const phone = form.phone.trim();
      await registerCustomer({ fullName: form.name.trim(), phone, email: form.email.trim() || undefined, password: form.password });
      const session = await login({ phone, password: form.password, role: 'CUSTOMER' });
      navigate(session.user.status === 'ACTIVE' ? '/perfil' : '/acesso', { replace: true });
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível concluir o cadastro.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="register-card register-card-simple" onSubmit={submit} noValidate>
      <div className="register-card-head">
        <div>
          <span className="register-step-caption">CRIAÇÃO DE CONTA</span>
          <h2>Criar conta de cliente</h2>
          <p>Só precisa do seu contacto e de uma palavra-passe. No final entra directamente na plataforma.</p>
        </div>
      </div>

      <div className="register-form-fields register-fields-simple">
        <RegisterAccessFields form={form} update={update} />
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      <div className="register-actions">
        <button className="primary-btn register-submit" type="submit" disabled={submitting}>
          {submitting ? 'A criar conta…' : 'Criar conta'}
        </button>
      </div>

      <div className="register-card-footer">
        <span>Já tem conta?</span>
        <Link to="/login?role=customer">Entrar na plataforma</Link>
      </div>
    </form>
  );
}
