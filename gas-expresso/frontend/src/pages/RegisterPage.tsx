import { Link, useParams } from 'react-router-dom';
import CustomerRegisterForm from './register/CustomerRegisterForm';
import ProfessionalRegisterForm from './register/ProfessionalRegisterForm';
import SupplierRegisterForm from './register/SupplierRegisterForm';
import { normalizeRegisterRole, registerConfigs, registerRoles, roleSlugs } from './register/registerConfig';

export default function RegisterPage() {
  const { role: rawRole } = useParams();
  const role = normalizeRegisterRole(rawRole);
  const config = registerConfigs[role];

  if (role === 'PRESTADOR') {
    return <div className="page register-page"><section className="workspace-panel supplier-pending-register"><span className="section-kicker">Perfil profissional</span><h1>Cadastro de prestador independente ainda não disponível.</h1><p>O backend actual reconhece Cliente, Entregador, Empresa/Fornecedor e Admin. Não existe ainda um endpoint próprio de registo para Prestador; não vamos enviar os dados para o cadastro empresarial nem criar uma conta fictícia.</p><Link className="primary-btn" to="/acesso">Escolher outro perfil</Link></section></div>;
  }

  return (
    <div className={`page register-page register-${roleSlugs[role]}`}>
      <div className={`register-container${config.professional ? ' register-container-wide' : ''}`}>
        <header className="register-page-heading">
          <Link to="/acesso" className="register-back-link">← Voltar aos perfis</Link>
          <span className="register-overline">Gás Expresso <i /> {role === 'SUPPLIER' ? 'Cadastro de empresa' : config.professional ? 'Candidatura profissional' : 'Criação de conta'}</span>
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </header>
        <nav className="register-role-switch" aria-label="Tipo de conta">
          {registerRoles.map((item, index) => (
            <Link key={item} to={`/registar/${roleSlugs[item]}`} className={`register-role-option ${role === item ? 'active' : ''}`}>
              <span className="register-role-number">0{index + 1}</span><span>{registerConfigs[item].label}</span>
            </Link>
          ))}
        </nav>
        {role === 'CUSTOMER' ? <CustomerRegisterForm /> : role === 'SUPPLIER' ? <SupplierRegisterForm /> : <ProfessionalRegisterForm role={role} />}
      </div>
    </div>
  );
}
