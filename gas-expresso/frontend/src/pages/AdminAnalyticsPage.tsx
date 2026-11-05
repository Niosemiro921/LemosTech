import { useEffect, useState } from 'react';
import { extractMessage, getCurrentUser } from '../services/auth';
import { apiGet } from '../lib/api';
import { DonutChart, HorizontalBars, type ChartDatum } from '../components/Charts';

type Summary = { counts: Array<{ eventType: string; area: string; _count: { id: number } }>; total: number };

function aggregate(entries: Array<{ label: string; value: number }>): ChartDatum[] {
  const map = new Map<string, number>();
  for (const entry of entries) {
    map.set(entry.label, (map.get(entry.label) ?? 0) + entry.value);
  }
  return Array.from(map, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

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

  const counts = data?.counts ?? [];
  const byArea = aggregate(counts.map((entry) => ({ label: entry.area || 'Sem área', value: Number(entry._count?.id) || 0 })));
  const byEvent = aggregate(counts.map((entry) => ({ label: entry.eventType || 'Sem tipo', value: Number(entry._count?.id) || 0 })));

  return <div className="page"><div className="workspace-heading"><span className="section-kicker">Backoffice / Analytics</span><h1>Resumo de eventos</h1><p>Eventos registados pelo tracker de analytics.</p></div>
  <button className="secondary-btn" onClick={() => void load()} disabled={loading}>{loading ? 'A carregar…' : 'Atualizar'}</button>
  {error && <div className="form-error">{error}</div>}
  {loading ? <div className="loading-panel">A carregar…</div> : (
    <div className="chart-grid">
      <section className="workspace-panel">
        <div className="panel-title">
          <span className="section-kicker">Total</span>
          <h2>Eventos por área</h2>
        </div>
        <DonutChart data={byArea} centerValue={new Intl.NumberFormat('pt-AO').format(data?.total ?? 0)} centerLabel="eventos" ariaLabel="Eventos por área" />
      </section>
      <section className="workspace-panel">
        <div className="panel-title">
          <span className="section-kicker">Detalhe</span>
          <h2>Eventos por tipo</h2>
        </div>
        <HorizontalBars data={byEvent} maxItems={12} />
      </section>
      <section className="workspace-panel chart-grid-full">
        <div className="panel-title">
          <span className="section-kicker">Comparação</span>
          <h2>Áreas mais utilizadas</h2>
        </div>
        <HorizontalBars data={byArea} />
      </section>
    </div>
  )}</div>;
}
