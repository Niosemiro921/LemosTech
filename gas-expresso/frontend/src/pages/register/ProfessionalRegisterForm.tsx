import { ChangeEvent, FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { extractMessage, login, registerDriver, registerPrestador, rolePath } from '../../services/auth';
import { uploadLicensePhoto, uploadProfessionalPhoto, uploadVehiclePhoto } from '../../services/media';
import { RegisterAccessFields } from './RegisterAccessFields';
import { AccessForm, ProfessionalRegisterRole, emptyAccessForm, validateAccessForm } from './registerConfig';

type ProfessionalForm = {
  // Entregador: documentos e veículo
  documentNumber: string;
  driverLicenseNumber: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleCapacityKg: string;
  experienceYears: string;
  insurancePolicyNumber: string;
  insuranceExpiresAt: string;
  // Prestador (empresa): identificação comercial
  legalName: string;
  tradeName: string;
  nif: string;
  commercialRegistration: string;
  activity: string;
  // Localização (comum aos dois)
  province: string;
  municipality: string;
  neighborhood: string;
  address: string;
};

const emptyProfessionalForm: ProfessionalForm = {
  documentNumber: '', driverLicenseNumber: '', vehicleType: 'MOTORCYCLE', vehiclePlate: '',
  vehicleCapacityKg: '45', experienceYears: '0', insurancePolicyNumber: '', insuranceExpiresAt: '',
  legalName: '', tradeName: '', nif: '', commercialRegistration: '', activity: '',
  province: '', municipality: '', neighborhood: '', address: '',
};

interface ProfessionalFiles {
  profile?: File;
  vehicle?: File;
  license?: File;
}

/**
 * Candidatura profissional em dois passos:
 * - Entregador: documentos, veículo e fotografias.
 * - Prestador: apenas dados da empresa (é uma empresa parceira que opera entregas).
 */
export default function ProfessionalRegisterForm({ role }: { role: ProfessionalRegisterRole }) {
  const navigate = useNavigate();
  const isPrestador = role === 'PRESTADOR';
  const [step, setStep] = useState(1);
  const [access, setAccess] = useState<AccessForm>(emptyAccessForm);
  const [profile, setProfile] = useState<ProfessionalForm>(emptyProfessionalForm);
  const [files, setFiles] = useState<ProfessionalFiles>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateAccess<K extends keyof AccessForm>(field: K, value: AccessForm[K]) {
    setAccess((current) => ({ ...current, [field]: value }));
  }
  function updateProfile<K extends keyof ProfessionalForm>(field: K, value: ProfessionalForm[K]) {
    setProfile((current) => ({ ...current, [field]: value }));
  }
  function fileChange(field: keyof ProfessionalFiles) {
    return (event: ChangeEvent<HTMLInputElement>) => setFiles((current) => ({ ...current, [field]: event.target.files?.[0] }));
  }

  function validateProfessional(): string {
    if (isPrestador) {
      if (profile.legalName.trim().length < 2 || profile.tradeName.trim().length < 2 || profile.nif.trim().length < 5) {
        return 'Preencha a razão social, o nome comercial e o NIF da empresa.';
      }
      if (!profile.activity.trim()) return 'Informe a atividade da empresa.';
      return '';
    }
    if (profile.documentNumber.trim().length < 4 || profile.driverLicenseNumber.trim().length < 4) {
      return 'Informe o documento de identificação e a carteira de motorista.';
    }
    if (!profile.vehicleType) return 'Selecione o tipo de veículo.';
    if (!files.profile || !files.vehicle || !files.license) {
      return 'Fotografia pessoal, foto do veículo e foto da carteira são obrigatórias.';
    }
    return '';
  }

  function next(event: FormEvent) {
    event.preventDefault();
    const message = validateAccessForm(access);
    if (message) { setError(message); return; }
    setError('');
    setStep(2);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = validateProfessional();
    if (message) { setError(message); return; }
    setError('');
    setSubmitting(true);
    try {
      const phone = access.phone.trim();
      const email = access.email.trim() || undefined;

      if (isPrestador) {
        await registerPrestador({
          fullName: access.name.trim(),
          phone,
          email,
          password: access.password,
          legalName: profile.legalName.trim(),
          tradeName: profile.tradeName.trim(),
          nif: profile.nif.trim(),
          commercialRegistration: profile.commercialRegistration.trim() || undefined,
          activity: profile.activity.trim(),
          province: profile.province.trim() || undefined,
          municipality: profile.municipality.trim() || undefined,
          neighborhood: profile.neighborhood.trim() || undefined,
          address: profile.address.trim() || undefined,
        });
      } else {
        await registerDriver({
          fullName: access.name.trim(),
          phone,
          email,
          password: access.password,
          documentNumber: profile.documentNumber.trim(),
          vehicleType: profile.vehicleType,
          vehiclePlate: profile.vehiclePlate.trim() || undefined,
          driverLicenseNumber: profile.driverLicenseNumber.trim(),
          experienceYears: Number(profile.experienceYears) || 0,
          province: profile.province.trim() || undefined,
          municipality: profile.municipality.trim() || undefined,
          neighborhood: profile.neighborhood.trim() || undefined,
          address: profile.address.trim() || undefined,
          insurancePolicyNumber: profile.insurancePolicyNumber.trim() || undefined,
          insuranceExpiresAt: profile.insuranceExpiresAt || undefined,
          vehicleCapacityKg: Number(profile.vehicleCapacityKg) || 45,
        });
      }

      const session = await login({ phone, password: access.password, role });

      if (!isPrestador) {
        const uploads: Promise<unknown>[] = [];
        if (files.profile) uploads.push(uploadProfessionalPhoto(files.profile));
        if (files.vehicle) uploads.push(uploadVehiclePhoto(files.vehicle));
        if (files.license) uploads.push(uploadLicensePhoto(files.license));
        if (uploads.length) await Promise.all(uploads);
      }

      const approved = session.user.status === 'ACTIVE';
      navigate(approved ? rolePath(role) : '/estado-candidatura', { replace: true, state: approved ? undefined : { justRegistered: true } });
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível concluir o cadastro.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="register-layout">
      <aside className="register-aside">
        <div className="register-aside-badge">Validação profissional</div>
        <h2>{isPrestador ? 'A empresa opera com dados reais.' : 'Dados reais antes de operar.'}</h2>
        <p>A candidatura fica pendente até a Administração validar o perfil{isPrestador ? ' da empresa' : ' e a documentação'}.</p>
        <div className="register-process">
          <div className="register-process-step"><span>01</span><div><strong>Acesso</strong><small>Telefone, email e palavra-passe.</small></div></div>
          <div className="register-process-step"><span>02</span><div><strong>{isPrestador ? 'Dados da empresa' : 'Perfil do entregador'}</strong><small>{isPrestador ? 'Razão social, NIF, atividade e localização.' : 'Documentos, veículo, localidade e experiência.'}</small></div></div>
          <div className="register-process-step"><span>03</span><div><strong>Validação</strong><small>A equipa aprova ou solicita documentos adicionais.</small></div></div>
        </div>
        <div className="register-aside-trust">
          <span>✓ Dados enviados ao servidor</span>
          <span>✓ Nenhuma aprovação simulada</span>
          <span>✓ Estado controlado pela API</span>
        </div>
      </aside>

      <form className="register-card" onSubmit={step === 1 ? next : submit} noValidate>
        <div className="register-card-head">
          <div>
            <span className="register-step-caption">PASSO {step} DE 2</span>
            <h2>{step === 1 ? 'Dados de acesso' : isPrestador ? 'Dados da empresa' : 'Perfil do entregador'}</h2>
            <p>{step === 1 ? 'Estes dados serão usados para entrar na plataforma.' : isPrestador ? 'Estes dados identificam a empresa parceira e são enviados ao backend para validação.' : 'Todos os campos são enviados ao backend; as fotografias são guardadas pelo serviço de media da API.'}</p>
          </div>
          <div className="register-step-indicator" aria-label={`Passo ${step} de 2`}>
            <span className="active" />
            <span className={step === 2 ? 'active' : ''} />
          </div>
        </div>

        {step === 1 ? (
          <div className="register-form-fields">
            <RegisterAccessFields
              form={access}
              update={updateAccess}
              nameLabel={isPrestador ? 'Responsável pela empresa' : 'Nome completo'}
            />
          </div>
        ) : (
          <div className="register-form-fields">
            {isPrestador ? (
              <>
                <div className="register-section-note">
                  <strong>Identificação da empresa</strong>
                  <span>Use os dados oficiais da empresa; a Administração pode pedir o registo comercial durante a validação.</span>
                </div>
                <div className="register-special-grid">
                  <div className="field"><label htmlFor="pre-name">Nome comercial</label><input id="pre-name" className="input" value={profile.tradeName} onChange={(e) => updateProfile('tradeName', e.target.value)} /></div>
                  <div className="field"><label htmlFor="pre-legal">Razão social</label><input id="pre-legal" className="input" value={profile.legalName} onChange={(e) => updateProfile('legalName', e.target.value)} /></div>
                  <div className="field"><label htmlFor="pre-nif">NIF</label><input id="pre-nif" className="input" inputMode="numeric" value={profile.nif} onChange={(e) => updateProfile('nif', e.target.value)} /></div>
                  <div className="field"><label htmlFor="pre-registry">Registo comercial</label><input id="pre-registry" className="input" value={profile.commercialRegistration} onChange={(e) => updateProfile('commercialRegistration', e.target.value)} /></div>
                  <div className="field full-field"><label htmlFor="pre-activity">Atividade da empresa</label><input id="pre-activity" className="input" value={profile.activity} onChange={(e) => updateProfile('activity', e.target.value)} placeholder="Ex.: distribuição de gás propano" /></div>
                </div>
                <AddressFields profile={profile} update={updateProfile} />
              </>
            ) : (
              <>
                <div className="register-section-note">
                  <strong>Identificação do entregador</strong>
                  <span>Estes dados iniciam uma candidatura e não colocam a conta automaticamente online.</span>
                </div>
                <div className="register-special-grid">
                  <div className="field"><label htmlFor="pro-document">Documento de identificação</label><input id="pro-document" className="input" value={profile.documentNumber} onChange={(e) => updateProfile('documentNumber', e.target.value)} /></div>
                  <div className="field"><label htmlFor="pro-license">Carteira de motorista</label><input id="pro-license" className="input" value={profile.driverLicenseNumber} onChange={(e) => updateProfile('driverLicenseNumber', e.target.value)} /></div>
                  <div className="field"><label htmlFor="pro-vehicle">Tipo de veículo</label>
                    <select id="pro-vehicle" className="input" value={profile.vehicleType} onChange={(e) => updateProfile('vehicleType', e.target.value)}>
                      <option value="MOTORCYCLE">Motorizada</option>
                      <option value="CAR">Carro</option>
                      <option value="VAN">Carrinha</option>
                    </select>
                  </div>
                  <div className="field"><label htmlFor="pro-plate">Matrícula</label><input id="pro-plate" className="input" value={profile.vehiclePlate} onChange={(e) => updateProfile('vehiclePlate', e.target.value)} /></div>
                  <div className="field"><label htmlFor="pro-capacity">Capacidade (kg)</label><input id="pro-capacity" className="input" type="number" min="1" value={profile.vehicleCapacityKg} onChange={(e) => updateProfile('vehicleCapacityKg', e.target.value)} /></div>
                  <div className="field"><label htmlFor="pro-experience">Anos de experiência</label><input id="pro-experience" className="input" type="number" min="0" max="50" value={profile.experienceYears} onChange={(e) => updateProfile('experienceYears', e.target.value)} /></div>
                  <div className="field"><label htmlFor="pro-insurance">Apólice do seguro</label><input id="pro-insurance" className="input" value={profile.insurancePolicyNumber} onChange={(e) => updateProfile('insurancePolicyNumber', e.target.value)} /></div>
                  <div className="field"><label htmlFor="pro-insurance-expiry">Validade do seguro</label><input id="pro-insurance-expiry" className="input" type="date" value={profile.insuranceExpiresAt} onChange={(e) => updateProfile('insuranceExpiresAt', e.target.value)} /></div>
                </div>
                <AddressFields profile={profile} update={updateProfile} />
                <div className="upload-grid">
                  <label className="upload-card"><strong>Fotografia pessoal</strong><span>JPG/PNG/WEBP até 5 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={fileChange('profile')} /><small>{files.profile?.name ?? 'Selecionar'}</small></label>
                  <label className="upload-card"><strong>Foto da motorizada / carro</strong><span>Identificação visual do veículo</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={fileChange('vehicle')} /><small>{files.vehicle?.name ?? 'Selecionar'}</small></label>
                  <label className="upload-card"><strong>Foto da carteira</strong><span>Documento legível</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={fileChange('license')} /><small>{files.license?.name ?? 'Selecionar'}</small></label>
                </div>
              </>
            )}

            <div className="register-review-card">
              <span className="register-review-check">✓</span>
              <div>
                <strong>O que acontece depois</strong>
                <span>A candidatura fica pendente para revisão. A área operacional só fica disponível quando a API devolver a conta como ativa.</span>
              </div>
            </div>
          </div>
        )}

        {error && <div className="form-error" role="alert">{error}</div>}

        <div className="register-actions">
          {step === 2 && (
            <button type="button" className="register-previous" onClick={() => { setStep(1); setError(''); }} disabled={submitting}>← Voltar</button>
          )}
          <button className="primary-btn register-submit" type="submit" disabled={submitting}>
            {submitting ? 'A enviar…' : step === 1 ? 'Continuar →' : 'Enviar candidatura'}
          </button>
        </div>

        <div className="register-card-footer">
          <span>Já tem conta?</span>
          <Link to={`/login?role=${role.toLowerCase()}`}>Entrar na plataforma</Link>
        </div>
      </form>
    </div>
  );
}

function AddressFields({ profile, update }: {
  profile: ProfessionalForm;
  update: <K extends keyof ProfessionalForm>(field: K, value: ProfessionalForm[K]) => void;
}) {
  return (
    <div className="register-special-grid">
      <div className="field"><label htmlFor="addr-province">Província</label><input id="addr-province" className="input" value={profile.province} onChange={(e) => update('province', e.target.value)} /></div>
      <div className="field"><label htmlFor="addr-municipality">Município</label><input id="addr-municipality" className="input" value={profile.municipality} onChange={(e) => update('municipality', e.target.value)} /></div>
      <div className="field"><label htmlFor="addr-neighborhood">Bairro</label><input id="addr-neighborhood" className="input" value={profile.neighborhood} onChange={(e) => update('neighborhood', e.target.value)} /></div>
      <div className="field full-field"><label htmlFor="addr-street">Morada / referência operacional</label><textarea id="addr-street" className="input" rows={3} value={profile.address} onChange={(e) => update('address', e.target.value)} /></div>
    </div>
  );
}
