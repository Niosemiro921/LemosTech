import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RealMap } from '../components/RealMap';
import { apiGet } from '../lib/api';
import { extractMessage } from '../services/auth';
import { formatAOA } from '../services/catalog';
import { fetchLiveTracking, openTrackingSocket, type LiveTrackingResponse } from '../services/tracking';

interface OrderItem { variantName: string; quantity: number }
interface CustomerOrder {
  id: string; reference: string; status: string; deliveryType: string; paymentMethod: string; deliveryAddress: string; latitude: number; longitude: number;
  pricing: { total: number; currency: string; estimatedMinutes?: number }; items: OrderItem[];
  statusHistory: Array<{ status: string; note?: string; createdAt: string }>; createdAt: string; updatedAt?: string;
}
interface Tracking extends LiveTrackingResponse { order: CustomerOrder }
const statusLabels: Record<string, string> = {
  AWAITING_SUPPLIER_ACCEPTANCE:'A aguardar empresa', SUPPLIER_ACCEPTED:'Pedido aceite', PREPARING:'A preparar', READY_FOR_PICKUP:'Pronto para recolha', DRIVER_SEARCHING:'A procurar entregador', DRIVER_ACCEPTED:'Entregador atribuído', TO_PICKUP:'Entregador a caminho da empresa', AT_PICKUP:'Na empresa', PICKED_UP:'Botija recolhida', IN_TRANSIT:'A caminho da entrega', ARRIVED:'Entregador chegou', DELIVERED:'Entregue', COMPLETED:'Concluído', CANCELLED:'Cancelado', FAILED:'Falha na entrega'
};
const stageKeys = ['AWAITING_SUPPLIER_ACCEPTANCE','SUPPLIER_ACCEPTED','PREPARING','READY_FOR_PICKUP','DRIVER_SEARCHING','DRIVER_ACCEPTED','TO_PICKUP','AT_PICKUP','PICKED_UP','IN_TRANSIT','ARRIVED','DELIVERED'];
const terminal = new Set(['DELIVERED','COMPLETED','CANCELLED','FAILED']);

export default function TrackingPage() {
 const [searchParams] = useSearchParams(); const orderId=searchParams.get('orderId'); const [tracking,setTracking]=useState<Tracking|null>(null); const [orders,setOrders]=useState<CustomerOrder[]>([]); const [error,setError]=useState(''); const [loading,setLoading]=useState(true); const [live,setLive]=useState<'connected'|'polling'|'disconnected'|'error'>('polling'); const [lastUpdate,setLastUpdate]=useState<string|null>(null);
 useEffect(()=>{
  let active=true; let timer:number|undefined; let closeSocket:()=>void=()=>undefined; let socketStarted=false;
  const schedule=(delay:number)=>{if(!active)return;if(timer)window.clearTimeout(timer);timer=window.setTimeout(()=>void refresh(),delay)};
  const refresh=async()=>{
   try{
    let id=orderId;
    if(!id){const list=await apiGet<CustomerOrder[]>('/orders/mine'); if(!active)return; setOrders(list); id=list.find(o=>!terminal.has(o.status))?.id??list[0]?.id??null;}
    if(!id){setTracking(null);setLoading(false);schedule(10000);return;}
    const result=await fetchLiveTracking(id); if(!active)return;
    setTracking(result as Tracking); setLastUpdate(new Date().toISOString()); setError(''); setLoading(false);
    if(!socketStarted){
      socketStarted=true;
      closeSocket=openTrackingSocket(id,(next)=>{if(!active)return;setTracking(next as Tracking);setLastUpdate(new Date().toISOString());setLive('connected')},state=>setLive(state==='connected'?'connected':state));
    }
    schedule(result.delivery?5000:10000);
   }catch(cause){if(!active)return;setError(extractMessage(cause,'Não foi possível carregar o rastreio.'));setLoading(false);setLive('polling');schedule(10000)}
  };
  void refresh(); return()=>{active=false;if(timer)window.clearTimeout(timer);closeSocket()};
 },[orderId]);
 const order=tracking?.order; const statusIndex=order?stageKeys.indexOf(order.status):-1;
 const deliveryPoint=tracking?.delivery?.driver.latitude!=null&&tracking.delivery.driver.longitude!=null?{lat:tracking.delivery.driver.latitude,lng:tracking.delivery.driver.longitude}:order?{lat:order.latitude,lng:order.longitude}:null;
 const itemLabel=order?.items.map(i=>`${i.quantity} × ${i.variantName}`).join(', '); const progress=terminal.has(order?.status??'')?(order?.status==='DELIVERED'||order?.status==='COMPLETED'?100:0):Math.max(4,((statusIndex+1)/stageKeys.length)*100);
 const connectionLabel=live==='connected'?'Ligação em tempo real':live==='polling'?'Atualização automática':live==='disconnected'?'Tempo real indisponível · atualização automática':'Tempo real com erro · atualização automática';
 const eta=tracking?.delivery?.estimatedMinutes; const distance=tracking?.delivery?.distanceKm;
 const timeline=useMemo(()=>order?.statusHistory??[],[order?.statusHistory]);
 return <div className="page tracking-page"><section className="tracking-topbar"><div><span className="section-kicker">{order?`Pedido ${order.reference}`:'Rastreio de pedidos'}</span><h1>{order?(statusLabels[order.status]??order.status):'Acompanhe a sua entrega'}</h1><p>{tracking?.delivery?'A localização do entregador é recebida automaticamente enquanto a entrega está activa.':'O estado do pedido é consultado no servidor até existir um entregador associado.'}</p></div>{order&&<div className={`tracking-status ${terminal.has(order.status)?'success':'live'}`}><span>{terminal.has(order.status)?'✓':'•'}</span><div><strong>{statusLabels[order.status]??order.status}</strong><small>{new Date(order.updatedAt??order.createdAt).toLocaleString('pt-AO')}</small></div></div>}</section>
 {loading&&<p role="status">A carregar o rastreio…</p>}{error&&<div className="form-error" role="alert">{error}<button className="secondary-btn" onClick={()=>window.location.reload()}>Tentar novamente</button></div>}
 {!loading&&!order&&!error&&<div className="empty-state"><h2>Ainda não tem pedidos</h2><p>Os pedidos confirmados aparecerão aqui.</p><Link to="/pedir" className="primary-btn">Pedir gás <span>→</span></Link></div>}
 {order&&<><section className="tracking-progress-card"><div className="tracking-progress-head"><span>Progresso do pedido</span><strong>{terminal.has(order.status)?statusLabels[order.status]:`${Math.round(progress)}%`}</strong></div><div className="tracking-progress-bar"><span style={{width:`${progress}%`}}/></div><div className="tracking-stage-labels">{stageKeys.map((status,index)=><span key={status} className={index<=statusIndex?'active':''}>{statusLabels[status]}</span>)}</div></section>
 <section className="tracking-layout"><div className="tracking-map-panel"><div className="tracking-panel-head"><div><span className="section-kicker">Localização</span><h2>{tracking?.delivery?'Entregador em tempo real':'Local de entrega'}</h2></div><span className="map-live-pill"><span className={live==='connected'?'live-dot':'status-dot'} /> {connectionLabel}</span></div><div className="tracking-map-frame"><RealMap value={deliveryPoint} markerLabel={tracking?.delivery?'Entregador':'Local de entrega'} interactive={false}/></div><div className="tracking-arrival-card"><div><span className="section-kicker">Chegada</span><strong>{eta!=null?`~${eta} min`:order.status==='ARRIVED'?'Chegou ao destino':statusLabels[order.status]??order.status}</strong><small>{distance!=null?`${distance.toFixed(1)} km restantes`:lastUpdate?`Última atualização ${new Date(lastUpdate).toLocaleTimeString('pt-AO')}`:'A aguardar localização'}</small></div><div className="arrival-ring">{tracking?.delivery?'GPS':'—'}</div></div><div className="tracking-location-strip"><span className="tracking-location-icon">⌖</span><div><strong>{order.deliveryAddress}</strong><small>{tracking?.delivery?'A posição apresentada pertence ao entregador durante esta entrega.':'A localização do entregador aparecerá quando houver atribuição e partilha de posição.'}</small></div></div>{tracking?.delivery?.driver&&<div className="driver-card-rich tracking-driver-card"><div className="driver-avatar">{tracking.delivery.driver.fullName.split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase()}</div><div className="driver-copy"><strong>{tracking.delivery.driver.fullName}</strong><small>{tracking.delivery.driver.vehicleType}</small><span>★ {tracking.delivery.driver.ratingAverage.toFixed(1)} {tracking.delivery.driver.lastLocationAt?`· GPS ${new Date(tracking.delivery.driver.lastLocationAt).toLocaleTimeString('pt-AO')}`:''}</span></div><a className="secondary-btn" href={`tel:${encodeURIComponent(tracking.delivery.driver.phone)}`}>Ligar</a></div>}</div>
 <aside className="tracking-side"><article className="tracking-card tracking-order-card"><div className="tracking-card-head"><div><span className="section-kicker">Resumo do pedido</span><h2>{itemLabel}</h2></div><span className="order-number">{order.reference}</span></div><div className="tracking-info-grid"><div><span>Local</span><strong>{order.deliveryAddress}</strong></div><div><span>Entrega</span><strong>{order.deliveryType==='EXPRESS'?'Expressa':'Programada'}</strong></div><div><span>Total</span><strong>{formatAOA(order.pricing.total)}</strong></div><div><span>Pagamento</span><strong>{order.paymentMethod==='PAY_ON_DELIVERY'?'Na entrega':order.paymentMethod}</strong></div></div></article><article className="tracking-card"><div className="tracking-card-head"><div><span className="section-kicker">Histórico</span><h2>Atualizações</h2></div></div><div className="tracking-timeline">{timeline.map((entry,index)=><div className={`tracking-timeline-item ${index===timeline.length-1?'current':'done'}`} key={`${entry.status}-${entry.createdAt}`}><span className="timeline-marker">{index<timeline.length-1?'✓':'•'}</span><div><strong>{statusLabels[entry.status]??entry.status}</strong><small>{new Date(entry.createdAt).toLocaleString('pt-AO')}{entry.note?` · ${entry.note}`:''}</small></div></div>)}</div></article><div className="tracking-side-actions"><Link to="/pedir" className="primary-btn full">Pedir outra botija <span>→</span></Link><Link to="/suporte" className="secondary-btn full">Preciso de ajuda</Link></div>{orders.length>1&&<label className="field">Outro pedido<select className="input" value={order.id} onChange={e=>window.location.href=`/rastrear?orderId=${encodeURIComponent(e.target.value)}`}>{orders.map(item=><option key={item.id} value={item.id}>{item.reference} · {statusLabels[item.status]??item.status}</option>)}</select></label>}</aside></section></>}
 </div>;
}
