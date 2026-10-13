import { Link } from 'react-router-dom';

export type SupplierPendingModule = 'lots' | 'customers' | 'interactions' | 'segmentation';

const modules: Record<SupplierPendingModule, { eyebrow: string; title: string; description: string; endpoints: string[]; fields: string[]; dependencies: string[] }> = {
  lots: {
    eyebrow: 'ERP · PRODUÇÃO E RASTREABILIDADE', title: 'Lotes de produção',
    description: 'Registo de lotes, data, quantidade, estado e rastreabilidade por produto. A API actual ainda não tem endpoints de lotes e não seria correcto disponibilizar um formulário que falha ao guardar.',
    endpoints: ['GET /suppliers/me/lots', 'POST /suppliers/me/lots', 'PATCH /suppliers/me/lots/:id'],
    fields: ['Código do lote', 'Produto/variante associada', 'Data de produção/entrada', 'Quantidade e unidade', 'Estado: Em produção, Concluído ou Distribuído', 'Histórico de alterações'],
    dependencies: ['Entidade e validação de lote no backend', 'Ligação lote ↔ variante do produto', 'Movimentos/auditoria de quantidade e estado'],
  },
  customers: {
    eyebrow: 'CRM · CARTEIRA DE CLIENTES', title: 'Clientes da empresa',
    description: 'Lista de clientes com compras, valor histórico e última actividade. A API de pedidos da empresa não devolve identificação do cliente na resposta pública do pedido e ainda não existe endpoint de carteira de clientes.',
    endpoints: ['GET /suppliers/me/customers'],
    fields: ['Identificador e nome do cliente', 'Telefone/email conforme permissões', 'Número de pedidos', 'Valor agregado de compras', 'Data da última compra'],
    dependencies: ['Consulta tenant-safe agregada pelo backend', 'Política de acesso aos dados pessoais', 'Paginação e pesquisa server-side'],
  },
  interactions: {
    eyebrow: 'CRM · RELACIONAMENTO', title: 'Contactos e interacções',
    description: 'Registo de notas, chamadas e follow-ups ligados a um cliente. Não existe actualmente uma API persistente para estas interacções; por isso o formulário de registo fica deliberadamente indisponível.',
    endpoints: ['GET /suppliers/me/interactions', 'POST /suppliers/me/interactions'],
    fields: ['Cliente relacionado', 'Tipo: nota, chamada ou follow-up', 'Assunto e conteúdo', 'Responsável e data', 'Próxima acção e estado'],
    dependencies: ['Modelo CRM e relacionamento com CustomerProfile', 'Permissões por utilizador da empresa', 'Retenção/auditoria dos contactos'],
  },
  segmentation: {
    eyebrow: 'CRM · SEGMENTAÇÃO', title: 'Segmentação de clientes',
    description: 'Segmentos de clientes novos, frequentes e inactivos calculados por regras transparentes a partir dos pedidos reais. O backend ainda não expõe a consulta de clientes nem as regras de segmentação.',
    endpoints: ['GET /suppliers/me/segmentation'],
    fields: ['Segmento calculado', 'Critério utilizado', 'Número de pedidos', 'Recência da última compra', 'Data de cálculo'],
    dependencies: ['Base de clientes disponibilizada pela API', 'Definição e versão das regras de segmentação', 'Filtros e paginação'],
  },
};

export default function SupplierIntegrationPendingPage({ module }: { module: SupplierPendingModule }) {
  const data = modules[module];
  return <div className="supplier-module-page page">
    <header className="workspace-heading"><div><span className="section-kicker">{data.eyebrow}</span><h1>{data.title}</h1><p>{data.description}</p></div><Link to="/fornecedor" className="secondary-btn">← Visão geral</Link></header>
    <section className="supplier-integration-hero"><div className="supplier-integration-icon"><span>API</span></div><div><span className="status-pill warning">Integração de backend pendente</span><h2>O ecrã está definido; a operação não será simulada.</h2><p>Quando os endpoints forem implementados e documentados, este módulo poderá carregar, criar e actualizar registos reais. Nenhuma acção fica activa até a persistência estar disponível.</p></div></section>
    <div className="workspace-grid two-col supplier-pending-grid"><section className="workspace-panel"><span className="section-kicker">CONTRATO NECESSÁRIO</span><h2>Endpoints em falta</h2><div className="supplier-endpoint-list">{data.endpoints.map((endpoint) => <code key={endpoint}>{endpoint}</code>)}</div><p className="supplier-muted-copy">O frontend não chama estes caminhos porque não existem no backend enviado.</p></section><section className="workspace-panel"><span className="section-kicker">MODELO PROPOSTO</span><h2>Dados que a API deverá devolver</h2><ul className="supplier-check-list">{data.fields.map((field) => <li key={field}>{field}</li>)}</ul></section></div>
    <section className="workspace-panel"><span className="section-kicker">CRITÉRIOS DE INTEGRAÇÃO</span><h2>O que falta antes de activar o módulo</h2><div className="supplier-dependency-grid">{data.dependencies.map((item, index) => <article key={item}><span>0{index + 1}</span><p>{item}</p></article>)}</div></section>
  </div>;
}
