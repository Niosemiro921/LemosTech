import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractMessage, getCurrentUser, rolePath } from '../services/auth';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead, type NotificationItem } from '../services/customer';
export default function NotificationsPage(){
 const accountPath = rolePath(getCurrentUser()?.role ?? 'CUSTOMER');
 const [items,setItems]=useState<NotificationItem[]>([]); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
 const load=async()=>{try{setItems(await fetchNotifications());setError('')}catch(e){setError(extractMessage(e,'Não foi possível carregar as notificações.'))}};
 useEffect(()=>{void load()},[]);
 const mark=async(id:string)=>{try{await markNotificationRead(id);setItems(s=>s.map(i=>i.id===id?{...i,readAt:new Date().toISOString()}:i))}catch(e){setError(extractMessage(e,'Não foi possível atualizar a notificação.'))}};
 const markAll=async()=>{setBusy(true);setError('');try{await markAllNotificationsRead();setItems(s=>s.map(i=>({...i,readAt:i.readAt??new Date().toISOString()})))}catch(e){setError(extractMessage(e,'Não foi possível marcar as notificações.'))}finally{setBusy(false)}};
 return <div className="page workspace-page"><div className="workspace-heading"><div><span className="section-kicker">Centro de notificações</span><h1>Atualizações importantes.</h1><p>Pedidos, entregas, segurança e avisos da plataforma ficam reunidos aqui.</p></div><div className="heading-actions"><button className="secondary-btn" disabled={busy || !items.some(i=>!i.readAt)} onClick={()=>void markAll()}>Marcar tudo como lido</button><Link to={accountPath} className="secondary-btn">Conta</Link></div></div>{error&&<div className="form-error" role="alert">{error}</div>}<section className="workspace-panel"><div className="stack-list">{items.length?items.map(item=><article className={`notification-card ${item.readAt?'read':'unread'}`} key={item.id}><div className="notification-dot"/><div className="notification-copy"><div className="entity-title-row"><strong>{item.title}</strong>{!item.readAt&&<span className="status-pill warning">Nova</span>}</div><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString('pt-AO')}</small></div>{!item.readAt&&<button className="soft-link-btn" onClick={()=>void mark(item.id)}>Marcar lida</button>}</article>):<div className="empty-state compact"><h3>Sem notificações</h3><p>Quando houver atualizações relevantes, elas aparecerão aqui.</p></div>}</div></section></div>;
}
