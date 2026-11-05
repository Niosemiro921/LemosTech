import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage, getCurrentUser } from '../services/auth';
import { fetchProfessionalProfile, updateProfessionalProfile, type ProfessionalProfile } from '../services/professional';
import { fetchSupplierProfile, updateSupplierProfile, type SupplierProfile } from '../services/professional';
import { fetchDriverWallet, type DriverWallet } from '../services/driverFinance';
import { fetchDriverOffers, fetchCurrentDelivery, fetchDriverProfile, type DriverDelivery, type DriverOffer, type DriverProfile } from '../services/driver';
import { uploadLicensePhoto, uploadProfessionalPhoto, uploadSupplierPhoto, uploadVehiclePhoto } from '../services/media';

type CompanyProfileForm = {
  legalName: string;
  tradeName: string;
  nif: string;
  commercialRegistration: string;
  activity: string;
  responsibleName: string;
  phoneAlt: string;
  province: string;
  municipality: string;
  neighborhood: string;
  address: string;
  fullName: string;
  documentNumber: string;
  driverLicenseNumber: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleCapacityKg: string;
  experienceYears: string;
  insurancePolicyNumber: string;
  insuranceExpiresAt: string;
};

const emptyCompanyProfileForm: CompanyProfileForm = {
  legalName: '',
  tradeName: '',
  nif: '',
  commercialRegistration: '',
  activity: '',
  responsibleName: '',
  phoneAlt: '',
  province: '',
  municipality: '',
  neighborhood: '',
  address: '',
  fullName: '',
  documentNumber: '',
  driverLicenseNumber: '',
  vehicleType: 'MOTORCYCLE',
  vehiclePlate: '',
  vehicleCapacityKg: '45',
  experienceYears: '0',
  insurancePolicyNumber: '',
  insuranceExpiresAt: '',
};

type CompanyFiles = { photo?: File; supplierPhoto?: File; vehicle?: File; license?: File };

function text(value: unknown): string {
  const next = value == null ? '' : String(value);
  return next;
}

async function settle<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch {
    return null;
  }
}

export default function EmpresaProfilePage() {
  const user = getCurrentUser();
  const [professional, setProfessional] = useState<ProfessionalProfile | null>(null);
  const [supplier, setSupplier] = useState<SupplierProfile | null>(null);
  const [wallet, setWallet] = useState<DriverWallet | null>(null);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [delivery, setDelivery] = useState<DriverDelivery | null>(null);
  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [form, setForm] = useState<CompanyProfileForm>(emptyCompanyProfileForm);
  const [files, setFiles] = useState<CompanyFiles>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [professionalData, supplierData, walletData, driverData, deliveryData] = await Promise.all([
        settle(fetchProfessionalProfile()),
        settle(fetchSupplierProfile()),
        settle(fetchDriverWallet()),
        settle(fetchDriverProfile()),
        settle(fetchCurrentDelivery()),
      ]);
      setProfessional(professionalData);
      setSupplier(supplierData);
      setWallet(walletData);
      setDriver(driverData);
      setDelivery(deliveryData);
      setOffers(driverData?.isOnline ? (await settle(fetchDriverOffers())) ?? [] : []);
      setForm({
        legalName: text(supplierData?.legalName),
        tradeName: text(supplierData?.tradeName),
        nif: text(supplierData?.nif ?? professionalData?.nif),
        commercialRegistration: text(supplierData?.commercialRegistration),
        activity: text(supplierData?.activity),
        responsibleName: text(supplierData?.responsibleName),
        phoneAlt: text(supplierData?.phoneAlt),
        province: text(supplierData?.province ?? professionalData?.province),
        municipality: text(supplierData?.municipality ?? professionalData?.municipality),
        neighborhood: text(supplierData?.neighborhood ?? professionalData?.neighborhood),
        address: text(supplierData?.address ?? professionalData?.address),
        fullName: text(professionalData?.fullName),
        documentNumber: text(professionalData?.documentNumber),
        driverLicenseNumber: text(professionalData?.driverLicenseNumber),
        vehicleType: text(professionalData?.vehicleType) || 'MOTORCYCLE',
        vehiclePlate: text(professionalData?.vehiclePlate),
        vehicleCapacityKg: text(professionalData?.vehicleCapacityKg) || '45',
        experienceYears: text(professionalData?.experienceYears) || '0',
        insurancePolicyNumber: text(professionalData?.insurancePolicyNumber),
        insuranceExpiresAt: professionalData?.insuranceExpiresAt ? String(professionalData.insuranceExpiresAt).slice(0, 10) : '',
      });
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível carregar o perfil.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setOk('');
    try {
      const professionalPayload = {
        fullName: form.fullName.trim(),
        documentNumber: form.documentNumber.trim(),
        nif: form.nif.trim(),
        driverLicenseNumber: form.driverLicenseNumber.trim(),
        vehicleType: form.vehicleType,
        vehiclePlate: form.vehiclePlate.trim(),
        vehicleCapacityKg: Number(form.vehicleCapacityKg) || 45,
        experienceYears: Number(form.experienceYears) || 0,
        insurancePolicyNumber: form.insurancePolicyNumber.trim(),
        insuranceExpiresAt: form.insuranceExpiresAt ? form.insuranceExpiresAt : null,
        province: form.province.trim(),
        municipality: form.municipality.trim(),
        neighborhood: form.neighborhood.trim(),
        address: form.address.trim(),
      };
      const supplierPayload = {
        legalName: form.legalName.trim(),
        tradeName: form.tradeName.trim(),
        nif: form.nif.trim(),
        commercialRegistration: form.commercialRegistration.trim(),
        activity: form.activity.trim(),
        responsibleName: form.responsibleName.trim(),
        phoneAlt: form.phoneAlt.trim(),
        province: form.province.trim(),
        municipality: form.municipality.trim(),
        neighborhood: form.neighborhood.trim(),
        address: form.address.trim(),
      };
      if (professional) await updateProfessionalProfile(professionalPayload);
      const jobs: Promise<unknown>[] = [];
      if (files.supplierPhoto) jobs.push(uploadSupplierPhoto(files.supplierPhoto));
      if (professional && files.photo) jobs.push(uploadProfessionalPhoto(files.photo));
      if (professional && files.vehicle) jobs.push(uploadVehiclePhoto(files.vehicle));
      if (professional && files.license) jobs.push(uploadLicensePhoto(files.license));
      if (jobs.length) await Promise.all(jobs);
      await updateSupplierProfile(supplierPayload);
      setOk('Perfil atualizado com sucesso.');
      await load();
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível guardar o perfil.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page workspace-page">
        <div className="workspace-heading">
          <div>
            <span className="section-kicker">Empresa / Perfil</span>
            <h1>Dados profissionais.</h1>
            <p>Atualize a informação usada pela operação e pela validação administrativa.</p>
          </div>
        </div>
        <div className="loading-panel">A carregar perfil…</div>
      </div>
    );
  }

  const photoUrl = professional?.photoUrl ?? supplier?.photoUrl ?? null;
  return (
    <div className="page workspace-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">Empresa / Perfil</span>
          <h1>{supplier?.legalName ?? professional?.fullName ?? user?.name ?? 'Empresa'}</h1>
          <p>Atualize a informação usada pela operação e pela validação administrativa.</p>
        </div>
        <div className="heading-actions">
          <Link className="secondary-btn" to="/fornecedor">Voltar à operação</Link>
          <Link className="secondary-btn" to="/fornecedor/stock">Stock</Link>
          <Link className="secondary-btn" to="/fornecedor/clientes">Clientes</Link>
        </div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {ok && <div className="success-alert">{ok}</div>}
      <form className="professional-profile-form" onSubmit={save}>
        <section className="workspace-panel">
          <div className="panel-title">
            <div>
              <span className="section-kicker">Identidade visual</span>
              <h2>Logótipo e fotografia</h2>
              <p>Imagem institucional usada no portal.</p>
            </div>
          </div>
          <div className="profile-media-row">
            <div className="large-photo-preview">
              {photoUrl ? <img src={photoUrl} alt="Logótipo da empresa" /> : <span className="large-photo-fallback">Logo</span>}
            </div>
            <div className="media-copy">
              <strong>Logótipo da empresa</strong>
              <small>Imagem institucional apresentada no portal.</small>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFiles((current) => ({ ...current, supplierPhoto: event.target.files?.[0] }))} />
            </div>
          </div>
          <div className="profile-media-row" style={{ marginTop: '14px' }}>
            <div className="media-copy">
              <strong>Fotografia do responsável</strong>
              <small>Usada no perfil do operador e na validação.</small>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFiles((current) => ({ ...current, photo: event.target.files?.[0] }))} />
            </div>
          </div>
        </section>

        <section className="workspace-panel">
          <div className="panel-title">
            <div>
              <span className="section-kicker">Empresa</span>
              <h2>Perfil comercial</h2>
              <p>NIF, registo comercial e atividade da empresa.</p>
            </div>
          </div>
          <div className="register-special-grid">
            <div className="field"><label>Razão social</label><input className="input" value={form.legalName} onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))} /></div>
            <div className="field"><label>Nome comercial</label><input className="input" value={form.tradeName} onChange={(event) => setForm((current) => ({ ...current, tradeName: event.target.value }))} /></div>
            <div className="field"><label>NIF</label><input className="input" value={form.nif} onChange={(event) => setForm((current) => ({ ...current, nif: event.target.value }))} /></div>
            <div className="field"><label>Registo comercial</label><input className="input" value={form.commercialRegistration} onChange={(event) => setForm((current) => ({ ...current, commercialRegistration: event.target.value }))} /></div>
            <div className="field full-field"><label>Atividade</label><input className="input" value={form.activity} onChange={(event) => setForm((current) => ({ ...current, activity: event.target.value }))} /></div>
            <div className="field"><label>Responsável</label><input className="input" value={form.responsibleName} onChange={(event) => setForm((current) => ({ ...current, responsibleName: event.target.value }))} /></div>
            <div className="field"><label>Telefone alternativo</label><input className="input" value={form.phoneAlt} onChange={(event) => setForm((current) => ({ ...current, phoneAlt: event.target.value }))} /></div>
          </div>
        </section>

        <section className="workspace-panel">
          <div className="panel-title">
            <div>
              <span className="section-kicker">Localização</span>
              <h2>Localização operacional</h2>
              <p>Onde a empresa opera e recebe as entregas.</p>
            </div>
          </div>
          <div className="register-special-grid">
            <div className="field"><label>Província</label><input className="input" value={form.province} onChange={(event) => setForm((current) => ({ ...current, province: event.target.value }))} /></div>
            <div className="field"><label>Município</label><input className="input" value={form.municipality} onChange={(event) => setForm((current) => ({ ...current, municipality: event.target.value }))} /></div>
            <div className="field"><label>Bairro</label><input className="input" value={form.neighborhood} onChange={(event) => setForm((current) => ({ ...current, neighborhood: event.target.value }))} /></div>
            <div className="field full-field"><label>Morada operacional</label><textarea className="input" rows={3} value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></div>
          </div>
        </section>

        <section className="workspace-panel">
          <div className="panel-title">
            <div>
              <span className="section-kicker">Operador</span>
              <h2>Dados do operador</h2>
              <p>Identificação e veículo usados nas entregas.</p>
            </div>
          </div>
          <div className="register-special-grid">
            <div className="field"><label>Nome completo</label><input className="input" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} /></div>
            <div className="field"><label>Documento</label><input className="input" value={form.documentNumber} onChange={(event) => setForm((current) => ({ ...current, documentNumber: event.target.value }))} /></div>
            <div className="field"><label>Carteira de motorista</label><input className="input" value={form.driverLicenseNumber} onChange={(event) => setForm((current) => ({ ...current, driverLicenseNumber: event.target.value }))} /></div>
            <div className="field"><label>Tipo de veículo</label><select className="input" value={form.vehicleType} onChange={(event) => setForm((current) => ({ ...current, vehicleType: event.target.value }))}><option value="MOTORCYCLE">Motorizada</option><option value="CAR">Carro</option><option value="VAN">Carrinha</option><option value="CUPAPATA">Cupapata</option></select></div>
            <div className="field"><label>Matrícula</label><input className="input" value={form.vehiclePlate} onChange={(event) => setForm((current) => ({ ...current, vehiclePlate: event.target.value }))} /></div>
            <div className="field"><label>Experiência (anos)</label><input className="input" type="number" min="0" value={form.experienceYears} onChange={(event) => setForm((current) => ({ ...current, experienceYears: event.target.value }))} /></div>
            <div className="field"><label>Capacidade (kg)</label><input className="input" type="number" min="1" value={form.vehicleCapacityKg} onChange={(event) => setForm((current) => ({ ...current, vehicleCapacityKg: event.target.value }))} /></div>
            <div className="field"><label>Seguro</label><input className="input" value={form.insurancePolicyNumber} onChange={(event) => setForm((current) => ({ ...current, insurancePolicyNumber: event.target.value }))} /></div>
            <div className="field full-field"><label>Validade do seguro</label><input className="input" type="date" value={form.insuranceExpiresAt} onChange={(event) => setForm((current) => ({ ...current, insuranceExpiresAt: event.target.value }))} /></div>
          </div>
          <div className="upload-grid" style={{ marginTop: '16px' }}>
            <label className="upload-card">
              <strong>Foto da carteira</strong>
              <span>{professional?.driverLicensePhotoUrl ? 'Documento enviado · substitua se necessário' : 'Selecionar fotografia'}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFiles((current) => ({ ...current, license: event.target.files?.[0] }))} />
            </label>
            <label className="upload-card">
              <strong>Foto do veículo</strong>
              <span>{professional?.vehiclePhotoUrl ? 'Foto enviada · substitua se necessário' : 'Selecionar fotografia'}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFiles((current) => ({ ...current, vehicle: event.target.files?.[0] }))} />
            </label>
          </div>
        </section>

        <button className="primary-btn" disabled={saving}>{saving ? 'A guardar…' : 'Guardar perfil'}</button>
      </form>
    </div>
  );
}
