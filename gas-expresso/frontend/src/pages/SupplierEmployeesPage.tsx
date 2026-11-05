import { Link } from 'react-router-dom';

export default function SupplierEmployeesPage() {
  return (
    <div className="page supplier-module-page">
      <div className="workspace-heading"><div><span className="section-kicker">Administrativo</span><h1>Colaboradores, permissões e filiais.</h1><p>Gerenciar utilizadores associados à empresa e suas funções.</p></div></div>
      <div className="empty-state">
        <h2>Página em integração</h2>
        <p>Este módulo ainda não possui integração backend — endpoints pendentes para `team`.</p>
        <ul style={{ textAlign: 'left', marginTop: '1rem', color: '#68706b' }}>
          <li>GET /suppliers/me/team</li>
          <li>POST /suppliers/me/team/invite</li>
          <li>PATCH /suppliers/me/team/:userId/role</li>
          <li>DELETE /suppliers/me/team/:userId</li>
        </ul>
        <Link to="/fornecedo" className="secondary-btn">Voltar ao dashboard</Link>
      </div>
    </div>
  );
}