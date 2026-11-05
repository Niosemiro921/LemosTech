import { Link } from 'react-router-dom';

export default function SupplierBranchesPage() {
  return (
    <div className="page supplier-module-page">
      <div className="workspace-heading"><div><span className="section-kicker">Administrativo</span><h1>Filiais e pontos de venda.</h1><p>Configurar filiais com stock e dados operacionais próprios.</p></div></div>
      <div className="empty-state">
        <h2>Página em integração</h2>
        <p>Este módulo ainda não possui integração backend — endpoints pendentes para `branches`.</p>
        <ul style={{ textAlign: 'left', marginTop: '1rem', color: '#68706b' }}>
          <li>GET /suppliers/me/branches</li>
          <li>POST /suppliers/me/branches</li>
          <li>PATCH /suppliers/me/branches/:id</li>
          <li>GET /suppliers/me/branches/:id/stock</li>
        </ul>
        <Link to="/fornecedo" className="secondary-btn">Voltar ao dashboard</Link>
      </div>
    </div>
  );
}