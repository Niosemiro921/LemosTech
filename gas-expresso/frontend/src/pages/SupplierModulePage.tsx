import { Link } from 'react-router-dom';

type ModuleKey = 'production-lots' | 'finance' | 'customers' | 'interactions' | 'segmentation' | 'reports';
const modules: Record<ModuleKey, { eyebrow: string; title: string; description: string; endpoints: string[] }> = {
  'production-lots': { eyebrow: 'ERP / Lotes', title: 'Lotes de produção.', description: 'A interface está separada para gerir código, datas, quantidade e estados dos lotes. Não apresentamos linhas fictícias enquanto o contrato da API não estiver exposto neste frontend.', endpoints: ['/suppliers/me/lots (listar)', '/suppliers/me/lots (criar)', '/suppliers/me/lots/{id} (editar)'] },
  finance: { eyebrow: 'ERP / Financeiro', title: 'Financeiro do fornecedor.', description: 'A receita de pedidos pode ser consultada no dashboard, mas faturas, pagamentos e despesas precisam de fontes financeiras próprias para não confundir vendas com tesouraria.', endpoints: ['/suppliers/me/invoices', '/suppliers/me/payments', '/suppliers/me/expenses'] },
  customers: { eyebrow: 'CRM / Clientes', title: 'Clientes do fornecedor.', description: 'A estrutura está pronta para perfis e histórico de compras. O endpoint de clientes do fornecedor não aparece no contrato existente deste frontend.', endpoints: ['/suppliers/me/customers'] },
  interactions: { eyebrow: 'CRM / Interações', title: 'Contactos e interações.', description: 'Registo de notas, chamadas e follow-ups sem criar contactos locais que não existam na API.', endpoints: ['/suppliers/me/interactions'] },
  segmentation: { eyebrow: 'CRM / Segmentação', title: 'Segmentação comercial.', description: 'As categorias de clientes precisam da base de clientes e histórico para serem calculadas pelo servidor.', endpoints: ['/suppliers/me/customers/segments'] },
  reports: { eyebrow: 'CRM / Relatórios', title: 'Relatórios de vendas e fidelização.', description: 'Não mostramos gráficos vazios com valores inventados. Assim que a API devolver agregados, o módulo pode apresentá-los nesta área.', endpoints: ['/suppliers/me/reports/sales', '/suppliers/me/reports/retention'] },
};

export default function SupplierModulePage({ module }: { module: ModuleKey }) {
 const data=modules[module];
 return <div className="page workspace-page supplier-module-page"><div className="workspace-heading"><div><span className="section-kicker">{data.eyebrow}</span><h1>{data.title}</h1><p>{data.description}</p></div><Link className="secondary-btn" to="/fornecedor">Dashboard</Link></div><section className="integration-panel"><span className="integration-badge">Integração pendente</span><h2>A API deste módulo não está identificada no contrato atual do frontend.</h2><p>Não criámos dados de demonstração. O módulo só deve passar a mostrar e gravar informação depois de ligar os endpoints reais.</p><div className="endpoint-list">{data.endpoints.map(endpoint=><code key={endpoint}>{endpoint}</code>)}</div><div className="integration-actions"><Link className="primary-btn" to="/fornecedor/stock">Voltar ao Stock</Link><Link className="secondary-btn" to="/fornecedor/pedidos">Ver pedidos</Link></div></section></div>;
}
