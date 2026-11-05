import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { fetchAdminPartners, type AdminPartner } from '../services/admin';
import {
  commitImport,
  downloadTemplateFile,
  fetchImportTemplate,
  IMPORT_ENTITY_INFO,
  previewImport,
  type ImportCommitResult,
  type ImportEntity,
  type ImportPreview,
} from '../services/imports';

const actionLabel: Record<string, string> = {
  create: 'Criar',
  update: 'Atualizar',
  skip: 'Ignorar',
};

type Props = { adminMode?: boolean };

export default function ImportsPage({ adminMode = false }: Props) {
  const [entity, setEntity] = useState<ImportEntity>('products');
  const [suppliers, setSuppliers] = useState<AdminPartner[]>([]);
  const [supplierUserId, setSupplierUserId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportCommitResult | null>(null);
  const [busy, setBusy] = useState<'' | 'template' | 'preview' | 'commit'>('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!adminMode) return;
    fetchAdminPartners('SUPPLIER')
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
  }, [adminMode]);

  useEffect(() => {
    setPreview(null);
    setResult(null);
    setError('');
    setMessage('');
  }, [entity, supplierUserId, file]);

  const selectedInfo = IMPORT_ENTITY_INFO.find((info) => info.key === entity)!;
  const requiresSupplier = entity === 'invoices';

  async function downloadTemplate() {
    setBusy('template');
    setError('');
    try {
      const template = await fetchImportTemplate(entity);
      downloadTemplateFile(template);
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível descarregar o modelo.'));
    } finally {
      setBusy('');
    }
  }

  async function runPreview() {
    if (!file) {
      setError('Selecione primeiro um ficheiro CSV.');
      return;
    }
    if (adminMode && requiresSupplier && !supplierUserId) {
      setError('Selecione a empresa fornecedora antes de pré-visualizar faturas.');
      return;
    }
    setBusy('preview');
    setError('');
    setMessage('');
    setResult(null);
    try {
      const data = await previewImport(entity, file, adminMode ? supplierUserId || undefined : undefined);
      setPreview(data);
    } catch (cause) {
      setPreview(null);
      setError(extractMessage(cause, 'Não foi possível analisar o ficheiro.'));
    } finally {
      setBusy('');
    }
  }

  async function runCommit() {
    if (!file || !preview) return;
    if (!window.confirm(`Importar ${preview.valid} linha(s) válida(s)? Esta operação grava dados no sistema.`)) return;
    setBusy('commit');
    setError('');
    setMessage('');
    try {
      const data = await commitImport(entity, file, adminMode ? supplierUserId || undefined : undefined);
      setResult(data);
      setPreview(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      setMessage(`Importação concluída: ${data.created} criado(s), ${data.updated} atualizado(s), ${data.skipped} ignorado(s), ${data.failed} falha(s).`);
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível concluir a importação.'));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="page workspace-page supplier-module-page">
      <div className="workspace-heading">
        <div>
          <span className="section-kicker">{adminMode ? 'Backoffice / Dados' : 'ERP / Dados'}</span>
          <h1>Importar dados de Excel ou CSV.</h1>
          <p>Migre produtos, stock, clientes e faturas a partir de uma folha de cálculo. O sistema valida tudo antes de gravar.</p>
        </div>
        <div className="heading-actions">
          <Link to={adminMode ? '/admin' : '/fornecedor'} className="secondary-btn">
            {adminMode ? 'Voltar ao dashboard' : 'Voltar ao dashboard'}
          </Link>
        </div>
      </div>

      {error && <div className="form-error" role="alert"><strong>Erro:</strong> {error}</div>}
      {message && <div className="success-banner" role="status">{message}</div>}

      <section className="workspace-panel">
        <div className="panel-title">
          <div>
            <span className="section-kicker">Passo 1</span>
            <h2>Escolha o tipo de dados</h2>
          </div>
        </div>
        <div className="supplier-tabs" role="tablist" aria-label="Tipo de importação">
          {IMPORT_ENTITY_INFO.map((info) => (
            <button
              key={info.key}
              type="button"
              className={info.key === entity ? 'active' : ''}
              aria-selected={info.key === entity}
              onClick={() => setEntity(info.key)}
            >
              {info.label}
            </button>
          ))}
        </div>
        <p className="field-help">{selectedInfo.description}</p>

        {adminMode && (
          <label className="field" style={{ marginTop: 14 }}>
            <span>Empresa fornecedora {requiresSupplier ? '(obrigatório para faturas)' : '(opcional, para stock)'}</span>
            <select value={supplierUserId} onChange={(event) => setSupplierUserId(event.target.value)}>
              <option value="">{requiresSupplier ? 'Selecione a empresa…' : 'Catálogo global (sem stock)'}</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name} · {supplier.phone ?? supplier.id}</option>
              ))}
            </select>
          </label>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <button type="button" className="secondary-btn" onClick={() => void downloadTemplate()} disabled={busy !== ''}>
            {busy === 'template' ? 'A preparar…' : '⬇ Descarregar modelo CSV'}
          </button>
        </div>
      </section>

      <section className="workspace-panel">
        <div className="panel-title">
          <div>
            <span className="section-kicker">Passo 2</span>
            <h2>Envie o ficheiro preenchido</h2>
          </div>
        </div>
        <p className="field-help">
          Formatos aceites: <strong>.csv</strong> (no Excel: Ficheiro → Guardar como → CSV UTF-8). Máximo 5 MB e 5.000 linhas.
          No modelo, os campos obrigatórios para <strong>{selectedInfo.label.toLowerCase()}</strong> são: {entity === 'products' ? 'nome do produto, peso (kg) e preço unitário — o SKU é opcional e gerado se faltar' : entity === 'customers' ? 'fullName, phone' : 'number, type, amount, issueDate'}.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          style={{ marginTop: 12 }}
        />

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <button type="button" className="primary-btn" onClick={() => void runPreview()} disabled={!file || busy !== ''}>
            {busy === 'preview' ? 'A validar…' : 'Validar e pré-visualizar'}
          </button>
          {preview && (
            <button type="button" className="secondary-btn" onClick={() => void runCommit()} disabled={preview.valid === 0 || busy !== ''}>
              {busy === 'commit' ? 'A importar…' : `Confirmar importação (${preview.valid})`}
            </button>
          )}
        </div>
      </section>

      {preview && (
        <section className="workspace-panel">
          <div className="panel-title">
            <div>
              <span className="section-kicker">Passo 3</span>
              <h2>Pré-visualização</h2>
            </div>
            <span className="admin-counter">{preview.total}</span>
          </div>
          <div className="metric-strip" style={{ marginBottom: 14 }}>
            <div><span>Linhas</span><strong>{preview.total}</strong></div>
            <div><span>Válidas</span><strong>{preview.valid}</strong></div>
            <div><span>Com erro</span><strong>{preview.invalid}</strong></div>
            <div><span>A ignorar</span><strong>{preview.skipped}</strong></div>
          </div>
          <p className="field-help">
            Cabeçalhos detetados: <strong>{preview.headers.length ? preview.headers.join(' | ') : '(nenhum)'}</strong>
          </p>
          {preview.valid === 0 && (
            <div className="form-error" role="alert" style={{ marginBottom: 14 }}>
              <div>
                <strong>Nenhuma linha válida.</strong>
                <span>
                  Confirme se escolheu o tipo de dados correto (produtos, clientes ou faturas) e se a primeira linha do
                  ficheiro contém os cabeçalhos do modelo descarregado. Compare os cabeçalhos acima com o modelo CSV.
                </span>
              </div>
            </div>
          )}
          {preview.warnings.length > 0 && (
            <div className="form-error" role="alert" style={{ marginBottom: 14 }}>
              <div>
                <strong>Avisos de cabeçalho:</strong>
                <ul style={{ margin: '6px 0 0 18px' }}>{preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
              </div>
            </div>
          )}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Linha</th><th>Estado</th><th>Ação</th><th>Detalhe</th><th>Dados</th></tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.line}>
                    <td>{row.line}</td>
                    <td>{row.valid ? (row.action === 'skip' ? 'Ignorar' : 'Pronta') : 'Erro'}</td>
                    <td>{actionLabel[row.action] ?? row.action}</td>
                    <td>{row.errors.length > 0 ? row.errors.join(' ') : row.message ?? '—'}</td>
                    <td>
                      <small className="table-sub">
                        {Object.entries(row.values).slice(0, 5).map(([key, value]) => `${key}: ${value}`).join(' · ')}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.truncated && <p className="field-help">A mostrar as primeiras 200 linhas. A importação aplica-se a todas as linhas válidas.</p>}
        </section>
      )}

      {result && (
        <section className="workspace-panel">
          <div className="panel-title">
            <div>
              <span className="section-kicker">Resultado</span>
              <h2>Relatório da importação</h2>
            </div>
          </div>
          <div className="metric-strip">
            <div><span>Criados</span><strong>{result.created}</strong></div>
            <div><span>Atualizados</span><strong>{result.updated}</strong></div>
            <div><span>Ignorados</span><strong>{result.skipped}</strong></div>
            <div><span>Falhas</span><strong>{result.failed}</strong></div>
          </div>
          {result.errors.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 14 }}>
              <table className="data-table">
                <thead><tr><th>Linha</th><th>Motivo</th></tr></thead>
                <tbody>
                  {result.errors.map((item) => (
                    <tr key={`${item.line}-${item.message}`}><td>{item.line}</td><td>{item.message}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="workspace-panel">
        <div className="panel-title">
          <div><span className="section-kicker">Como preparar</span><h2>Boas práticas</h2></div>
        </div>
        <ul className="field-help" style={{ lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
          <li>Descarregue o modelo e mantenha a primeira linha de cabeçalhos.</li>
          <li>Use uma linha por produto/SKU, cliente ou fatura. Não junte vários registos numa célula.</li>
          <li>Telefones: 9 dígitos (ex.: 923000000) ou +244923000000. Datas: AAAA-MM-DD ou DD/MM/AAAA.</li>
          <li>Valores em kwanzas, sem símbolo e sem casas decimais (ex.: 15000).</li>
          <li>Reimportar o mesmo ficheiro é seguro: SKUs, telefones e números de fatura existentes são ignorados/atualizados.</li>
          <li>Documentos em PDF/fotos continuam a ser carregados no perfil da empresa; o CSV importa os dados e o registo documental.</li>
        </ul>
      </section>
    </div>
  );
}
