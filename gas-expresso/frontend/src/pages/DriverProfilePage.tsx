import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoutButton } from '../components/LogoutButton';
import { extractMessage, fetchMe, type SessionUser } from '../services/auth';
import { fetchDriverProfile, type DriverProfile } from '../services/driver';
import { setDriverOnline, setDriverOffline } from '../services/driver';

export default function DriverProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetchMe(), fetchDriverProfile()]).then(([nextUser, nextProfile]) => { setUser(nextUser); setProfile(nextProfile); }).catch(cause => setError(extractMessage(cause, 'Não foi possível carregar o perfil.'))).finally(() => setLoading(false));
  }, []);

  const toggleOnline = async () => {
    if (!profile) return;
    try {
      if (profile.isOnline) {
        await setDriverOffline();
      } else {
        if (!navigator.geolocation) throw new Error('Permita o acesso à localização para ficar online.');
        const point = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Permita o acesso à localização para ficar online.')), { enableHighAccuracy: true, timeout: 15_000 }));
        await setDriverOnline(point.coords.latitude, point.coords.longitude);
      }
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível alterar o estado online.'));
    }
  };

  return <div className="page workspace-page driver-profile-page"><div className="workspace-heading"><div><span className="section-kicker">Conta / Entregador</span><h1>O seu perfil.</h1><p>Dados de acesso e operação devolvidos pelo servidor.</p></div><LogoutButton className="secondary-btn" /></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {loading ? <div className="loading-panel">A carregar perfil…</div> : <div className="workspace-grid two-col">
      <section className="workspace-panel"><div className="profile-hero-mini"><span className="header-user-avatar large">{(user?.name ?? 'GE').split(/\s+/).map(p => p[0]).slice(0,2).join('').toUpperCase()}</span><div><span className="section-kicker">{user?.status ?? '—'}</span><h2>{user?.name ?? profile?.fullName ?? '—'}</h2><p>{user?.phone ?? '—'}{user?.email ? ` · ${user.email}` : ''}</p></div></div><div className="profile-detail-grid"><div><small>Veículo</small><strong>{profile?.vehicleType ?? '—'}</strong></div><div><small>Avaliação</small><strong>{profile ? `${profile.ratingAverage.toFixed(1)} ★` : '—'}</strong></div><div><small>Entregas concluídas</small><strong>{profile?.completedDeliveries ?? '—'}</strong></div><div><small>Estado</small><strong>{profile?.isOnline ? 'Online' : 'Offline'}</strong></div></div></section>
      <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">Operação</span><h2>Ferramentas</h2></div></div><div className="profile-action-list"><Link to="/driver/documentos"><strong>Documentos</strong><span>Consultar estado dos documentos operacionais →</span></Link><Link to="/driver/incidentes"><strong>Incidentes</strong><span>Registar e acompanhar ocorrências →</span></Link><Link to="/driver/saldo"><strong>Carteira</strong><span>Saldo, recargas e prioridade de despacho →</span></Link><Link to="/suporte"><strong>Suporte</strong><span>Contactar a equipa de operação →</span></Link></div></section>
    <section className="workspace-panel"><div className="panel-title"><div><span className="section-kicker">Operação</span><h2>Ferramentas</h2></div></div><div className="profile-action-list"><Link to="/driver/documentos"><strong>Documentos</strong><span>Consultar estado dos documentos operacionais →</span></Link><Link to="/driver/incidentes"><strong>Incidentes</strong><span>Registar e acompanhar ocorrências →</span></Link><Link to="/driver/saldo"><strong>Carteira</strong><span>Saldo, recargas e prioridade de despacho →</span></Link><Link to="/suporte"><strong>Suporte</strong><span>Contactar a equipa de operação →</span></Link><button className="online-toggle ${profile?.isOnline?'online':''}" onClick={()=>toggleOnline()}><span className="status-dot"/>{profile?.isOnline?'Ficar offline':'Ficar online'}</button></div></section>
    </div>}
  </div>;
}
