import { useEffect, useState } from 'react';
import { extractMessage, getCurrentUser } from '../services/auth';
import { apiGet } from '../lib/api';

type Summary = { counts: Array<{ eventType: string; area: string; _count: { id: number } }>; total: number };

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      setData(await apiGet<Summary>('/analytics/summary'));
    } catch (e) { setError(extractMessage(e, 'Não foi possível carregar analytics.')) } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const user = getCurrentUser();
  if (!user || user.role !== 'ADMIN') return <div className="page"><h2>Acesso restrito — Administração</h2></div>;

  return <div className="page"><div className="workspace-heading"><span className="section-kicker">Backoffice / Analytics</span><h1>Resumo de eventos</h1><p>Eventos registados pelo tracker de analytics.</p></div>
  <button className="secondary-btn" onClick={() => void load()} disabled={loading}>{loading ? 'A carregar…' : 'Atualizar'}</button>
  {error && <div className="form-error">{error}</div>}
  {loading ? <div className="loading-panel">A carregar…</div> : (
    <section className="workspace-panel">
      <h3>Total de eventos: {data?.total ?? 0}</h3>
      <table className="data-table">
        <thead><tr><th>Tipo</th><th>Área</th><th>Contagem</th></tr></thead>
        <tbody>{data?.counts?.map((c: any) => <tr key={c.eventType + c.area}><td>{c.eventType}</td><td>{c.area}</td><td><strong>{c._count?.id ?? 0}</strong></td></tr>)}</tbody>
      </table>
    </section>
  )}</div>;
}
