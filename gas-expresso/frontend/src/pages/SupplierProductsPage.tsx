import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { fetchGasProducts, formatAOA } from '../services/catalog';
import { type GasProduct } from '../types/gas';

export default function SupplierProductsPage() {
  const [products, setProducts] = useState<GasProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchGasProducts()
      .then((data) => { if (active) setProducts(data); })
      .catch(() => { if (active) setError('Não foi possível carregar o catálogo comercial.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="page supplier-module-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">ERP / Produtos</span>
          <h1>Produtos e catálogo comercial.</h1>
          <p>Gerenciar os produtos comercializados pela empresa: catálogo, preços, imagens e configurações.</p>
        </div>
        <div className="heading-actions">
          <Link to="/fornecedor" className="secondary-btn">Voltar ao dashboard</Link>
        </div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {loading ? <div className="loading-panel">A carregar catálogo…</div> : (
        <section className="workspace-panel">
          <div className="panel-title">
            <div>
              <span className="section-kicker">Catálogo</span>
              <h2>Produtos comerciais disponíveis</h2>
            </div>
          </div>
          {products.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {products.map((product) => (
                <article key={product.id} style={{ padding: '15px', border: '1px solid #e5e7eb', borderRadius: '15px', background: '#fff' }}>
                  <span className="section-kicker">{product.size}</span>
                  <h3>{product.label}</h3>
                  <p style={{ margin: '6px 0', color: 'var(--muted)', fontSize: '12px', lineHeight: 1.5 }}>{product.description}</p>
                  <strong>{formatAOA(product.price)}</strong>
                  {product.cylinderPrice ? <small style={{ display: 'block', marginTop: '6px', color: 'var(--muted)', fontSize: '11px' }}>Cilindro novo: {formatAOA(product.cylinderPrice)}</small> : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>Sem produtos</h3>
              <p>A API não devolveu produtos para o catálogo comercial.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
