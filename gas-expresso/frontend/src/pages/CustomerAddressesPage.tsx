import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage } from '../services/auth';
import { createCustomerAddress, deleteCustomerAddress, fetchCustomerAddresses, updateCustomerAddress, type CustomerAddress } from '../services/customer';

export default function CustomerAddressesPage() {
  const [items, setItems] = useState<CustomerAddress[]>([]);
  const [form, setForm] = useState({ id: '', label: 'Casa', address: '', municipality: '', province: '', reference: '', latitude: '', longitude: '', isDefault: false });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => { try { setItems(await fetchCustomerAddresses()); setError(''); } catch (e) { setError(extractMessage(e, 'Não foi possível carregar os endereços.')); } };
  useEffect(() => { void load(); }, []);
  const reset = () => { setEditing(false); setForm({ id: '', label: 'Casa', address: '', municipality: '', province: '', reference: '', latitude: '', longitude: '', isDefault: false }); };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const payload = { label: form.label.trim(), address: form.address.trim(), municipality: form.municipality.trim() || null, province: form.province.trim() || null, reference: form.reference.trim() || null, latitude: form.latitude ? Number(form.latitude) : null, longitude: form.longitude ? Number(form.longitude) : null, isDefault: form.isDefault };
      if (editing) await updateCustomerAddress(form.id, payload); else await createCustomerAddress(payload);
      reset(); await load();
    } catch (e) { setError(extractMessage(e, 'Não foi possível guardar o endereço.')); } finally { setBusy(false); }
  };
  const edit = (item: CustomerAddress) => setForm({ id: item.id, label: item.label, address: item.address, municipality: item.municipality ?? '', province: item.province ?? '', reference: item.reference ?? '', latitude: item.latitude?.toString() ?? '', longitude: item.longitude?.toString() ?? '', isDefault: !!item.isDefault });
  const remove = async (id: string) => { if (!window.confirm('Remover este endereço?')) return; try { await deleteCustomerAddress(id); await load(); } catch (e) { setError(extractMessage(e, 'Não foi possível remover o endereço.')); } };
  return <div className="page workspace-page">
    <div className="workspace-heading"><div><span className="section-kicker">Área do cliente</span><h1>Os seus endereços.</h1><p>Guarde destinos recorrentes com referência e localização para pedir mais rápido.</p></div><Link to="/perfil" className="secondary-btn">Voltar à conta</Link></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="workspace-grid two-col">
      <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">Novo endereço</span><h2>{editing ? 'Editar endereço' : 'Adicionar endereço'}</h2></div></div>
        <form className="form-grid" onSubmit={submit}>
          <div className="form-2"><div className="field"><label>Etiqueta</label><select className="input" value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))}><option>Casa</option><option>Trabalho</option><option>Loja</option><option>Outro</option></select></div><div className="field"><label>Província</label><input className="input" value={form.province} onChange={e=>setForm(f=>({...f,province:e.target.value}))} /></div></div>
          <div className="form-2"><div className="field"><label>Município</label><input className="input" value={form.municipality} onChange={e=>setForm(f=>({...f,municipality:e.target.value}))} /></div><div className="field"><label>Morada</label><input className="input" value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} required /></div></div>
          <div className="field"><label>Referência</label><textarea className="textarea" value={form.reference} onChange={e=>setForm(f=>({...f,reference:e.target.value}))} placeholder="Ex.: portão azul, junto à escola..." /></div>
          <div className="form-2"><div className="field"><label>Latitude</label><input className="input" inputMode="decimal" value={form.latitude} onChange={e=>setForm(f=>({...f,latitude:e.target.value}))} /></div><div className="field"><label>Longitude</label><input className="input" inputMode="decimal" value={form.longitude} onChange={e=>setForm(f=>({...f,longitude:e.target.value}))} /></div></div>
          <label className="check-row"><input type="checkbox" checked={form.isDefault} onChange={e=>setForm(f=>({...f,isDefault:e.target.checked}))}/><span>Definir como endereço principal</span></label>
          <div className="form-actions"><button className="primary-btn" disabled={busy}>{busy ? 'A guardar…' : editing ? 'Guardar alterações' : 'Adicionar endereço'}</button>{editing && <button type="button" className="secondary-btn" onClick={reset}>Cancelar</button>}</div>
        </form>
      </section>
      <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">Guardados</span><h2>Endereços</h2></div><span className="count-badge">{items.length}</span></div>
        <div className="stack-list">{items.length ? items.map(item => <article className="entity-card" key={item.id}><div><div className="entity-title-row"><strong>{item.label}</strong>{item.isDefault && <span className="status-pill success">Principal</span>}</div><p>{item.address}</p><small>{[item.municipality, item.province].filter(Boolean).join(' · ')}{item.reference ? ` · ${item.reference}` : ''}</small></div><div className="card-actions"><button className="soft-link-btn" onClick={()=>{ setEditing(true); edit(item); }}>Editar</button><button className="danger-link" onClick={()=>void remove(item.id)}>Remover</button></div></article>) : <div className="empty-state compact"><h3>Nenhum endereço guardado</h3><p>Adicione o seu endereço principal para acelerar os próximos pedidos.</p></div>}</div>
      </section>
    </div>
  </div>;
}
