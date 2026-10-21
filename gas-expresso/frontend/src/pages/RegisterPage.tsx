import { Link, useParams } from 'react-router-dom';
import CustomerRegisterForm from './register/CustomerRegisterForm';
import ProfessionalRegisterForm from './register/ProfessionalRegisterForm';
import { normalizeRegisterRole, registerConfigs, registerRoles, roleSlugs } from './register/registerConfig';

/**
 * Página de cadastro.
 * Cliente recebe um formulário simples; Entregador e Empresa
 * mantêm o fluxo profissional em dois passos (o perfil Empresa foi retirado).
 */
export default function RegisterPage() {
  const { role: rawRole } = useParams();
  const role = normalizeRegisterRole(rawRole);
  const config = registerConfigs[role];

  return (
    <div className={`page register-page register-${roleSlugs[role]}`}>
      <div className={`register-container${config.professional ? ' register-container-wide' : ''}`}>
        <header className="register-page-heading">
          <Link to="/acesso" className="register-back-link">← Voltar aos perfis</Link>
          <span className="register-overline">Gás Expresso <i /> {config.professional ? 'Candidatura profissional' : 'Criação de conta'}</span>
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </header>

        <nav className="register-role-switch" aria-label="Tipo de conta">
          {registerRoles.map((item, index) => (
            <Link key={item} to={`/registar/${roleSlugs[item]}`} className={`register-role-option ${role === item ? 'active' : ''}`}>
              <span className="register-role-number">0{index + 1}</span>
              <span>{registerConfigs[item].label}</span>
            </Link>
          ))}
        </nav>

        {role === 'CUSTOMER'
          ? <CustomerRegisterForm />
          : <ProfessionalRegisterForm role={role} />}
      </div>
    </div>
  );
}
