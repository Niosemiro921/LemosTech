import { Link } from 'react-router-dom';

export default function SupplierSuppliersPage() {
  return (
    <div className="page supplier-module-page">
      <div className="workspace-heading"><div><span className="section-kicker">CRM / Fornecedores</span><h1>Fornecedores.</h1><p>Registar entidades das quais a empresa compra bens ou serviços.</p></div></div>
      <div className="empty-state">
        <h2>Página em integração</h2>
        <p>Este módulo ainda não possui integração backend — endpoints pendentes para `suppliers/me/suppliers`.</p>
        <ul style={{ textAlign: 'left', marginTop: '1rem', color: '#68706b' }}>
          <li>GET /suppliers/me/suppliers</li>
          <li>POST /suppliers/me/suppliers</li>
          <li>GET /suppliers/me/suppliers/:id/purchases</li>
        </ul>
        <Link to="/fornecedor" className="secondary-btn">Voltar ao dashboard</Link>
      </div>
    </div>
  );
}
