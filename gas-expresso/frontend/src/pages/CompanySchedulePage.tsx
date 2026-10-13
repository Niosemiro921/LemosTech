import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCompanySchedule, updateCompanySchedule, type CompanySchedule } from '../services/company';
import { extractMessage } from '../services/auth';

export default function CompanySchedulePage() {
  const [items, setItems] = useState<CompanySchedule[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  async function load() { setLoading(true); try { const result = await fetchCompanySchedule(); setItems([...result].sort((a, b) => a.dayOfWeek - b.dayOfWeek)); setError(''); } catch (cause) { setError(extractMessage(cause, 'Não foi possível carregar os horários.')); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  function update(dayOfWeek: number, key: keyof CompanySchedule, value: boolean | string) { setItems((current) => current.map((day) => day.dayOfWeek === dayOfWeek ? { ...day, [key]: value } : day)); setSuccess(''); }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (items.length !== 7 || new Set(items.map((item) => item.dayOfWeek)).size !== 7) { setError('A API deve devolver os sete dias da semana antes de guardar. Actualize a página ou contacte o suporte.'); return; }
    for (const item of items) {
      if (item.enabled && (!item.openTime || !item.closeTime || item.openTime >= item.closeTime)) { setError(`Verifique o horário de ${item.label}: a abertura e o fecho são obrigatórios e o fecho deve ser posterior à abertura.`); return; }
    }
    setSaving(true); setError(''); setSuccess('');
    try { setItems(await updateCompanySchedule(items)); setSuccess('Horários guardados no servidor.'); }
    catch (cause) { setError(extractMessage(cause, 'Não foi possível guardar os horários.')); }
    finally { setSaving(false); }
  }
  return <div className="supplier-module-page page"><header className="workspace-heading"><div><span className="section-kicker">EMPRESA · OPERAÇÃO</span><h1>Horários de atendimento</h1><p>Defina os horários em que a empresa pode receber, preparar e despachar pedidos.</p></div><button className="secondary-btn" onClick={() => void load()} disabled={loading || saving}>↻ Actualizar</button></header>
    {error && <div className="form-error" role="alert">{error}</div>}{success && <div className="success-alert" role="status">{success}</div>}
    <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">SEMANA OPERACIONAL</span><h2>Funcionamento por dia</h2></div><span className="supplier-muted-copy">Hora local da empresa</span></div>
      {loading ? <div className="loading-panel" role="status">A carregar horários…</div> : items.length === 7 ? <form onSubmit={save}><div className="supplier-schedule-list">{items.map((day) => <div className={`supplier-schedule-row ${day.enabled ? 'is-enabled' : ''}`} key={day.dayOfWeek}><label className="supplier-schedule-day"><input type="checkbox" checked={day.enabled} onChange={(event) => update(day.dayOfWeek, 'enabled', event.target.checked)}/><span><strong>{day.label}</strong><small>{day.enabled ? 'Aberto para pedidos' : 'Fechado'}</small></span></label><label><span>Abertura</span><input className="input" type="time" disabled={!day.enabled} value={day.openTime ?? ''} onChange={(event) => update(day.dayOfWeek, 'openTime', event.target.value)}/></label><span className="supplier-schedule-until">até</span><label><span>Fecho</span><input className="input" type="time" disabled={!day.enabled} value={day.closeTime ?? ''} onChange={(event) => update(day.dayOfWeek, 'closeTime', event.target.value)}/></label></div>)}</div><div className="supplier-schedule-footer"><p>As alterações só entram em vigor depois de serem guardadas no servidor.</p><button className="primary-btn" disabled={saving}>{saving ? 'A guardar horários…' : 'Guardar horários'}</button></div></form> : <div className="empty-state"><h3>Horários não disponíveis</h3><p>A API não devolveu os sete dias necessários para editar a semana. Não foram inventados valores por omissão.</p></div>}
    </section><div className="supplier-inline-links"><Link to="/fornecedor/perfil">Perfil da empresa →</Link><Link to="/fornecedor/localizacao">Localização operacional →</Link></div>
  </div>;
}
