/* MoveMorelia demo: city data, live simulation and trip planner (sample data, not real). */
(function(){
'use strict';
const U=6;          // meters per map unit
const SCALE=15;     // simulated seconds per real second
const DW=25;        // seconds a bus waits at each stop
const CAP=40;
const SPD={bus:.93,taxi:1.39,car:1.3,walk:.23}; // map units per simulated second
const ME0={x:650,y:575};

/* a = label side (r,l,t,b,c), p = priority (1 always, 2 only zoomed in) */
const PLACES=[
 {id:'centro',n:'Centro Histórico',s:'Catedral de Morelia',x:445,y:510,a:'t',p:1},
 {id:'plaza',n:'Plaza de Armas',s:'Centro',x:525,y:572,a:'b',p:2},
 {id:'tarascas',n:'Fuente de las Tarascas',s:'Av. Madero Oriente',x:612,y:518,a:'t',p:2},
 {id:'dulces',n:'Mercado de Dulces',s:'Centro',x:362,y:505,a:'l',p:2},
 {id:'acueducto',n:'Acueducto de Morelia',s:'Av. Acueducto',x:622,y:690,a:'l',p:2},
 {id:'bosque',n:'Bosque Cuauhtémoc',s:'Av. Acueducto',x:755,y:668,a:'c',p:1},
 {id:'cu',n:'Ciudad Universitaria',s:'UMSNH',x:285,y:885,a:'c',p:1},
 {id:'americas',n:'Plaza Las Américas',s:'Centro comercial',x:665,y:1112,a:'b',p:1},
 {id:'estadio',n:'Estadio Morelos',s:'Periférico Norte',x:905,y:240,a:'b',p:1},
 {id:'central',n:'Central de Autobuses',s:'Terminal de autobuses',x:190,y:325,a:'r',p:1},
 {id:'villas',n:'Villas del Pedregal',s:'Fraccionamiento',x:190,y:140,a:'r',p:1},
 {id:'altozano',n:'Altozano',s:'Zona sur',x:425,y:1200,a:'r',p:2},
 {id:'tec',n:'Tecmilenio',s:'Campus Morelia',x:885,y:965,a:'l',p:1,tag:'Escuela'},
 {id:'casa',n:'Casa',s:'Lugar guardado',x:230,y:1015,a:'r',p:1,tag:'Casa'},
 {id:'trabajo',n:'Trabajo',s:'Lugar guardado',x:598,y:1036,a:'l',p:1,tag:'Trabajo'}
];

const STREETS=[
 {n:'Periférico Norte',pts:[[-60,300],[1060,300]],lx:[300,720]},
 {n:'Av. Madero',pts:[[-60,540],[1060,540]],lx:[290,760]},
 {n:'Av. Camelinas',pts:[[-60,800],[1060,800]],lx:[520,760]},
 {n:'Periférico Sur',pts:[[-60,1080],[1060,1080]],lx:[260,770]},
 {n:'Calle Pedregal',pts:[[-60,160],[400,160]],lx:[300]},
 {n:'Av. Siervo de la Nación',pts:[[160,-60],[160,1360]],ly:[440,940]},
 {n:'Av. Morelos',pts:[[400,-60],[400,1360]],ly:[400,950]},
 {n:'Av. Acueducto',pts:[[640,-60],[640,1360]],ly:[410,950]},
 {n:'Av. Solidaridad',pts:[[860,-60],[860,1360]],ly:[420,850]}
];
const PARKS=[{x:680,y:585,w:150,h:180},{x:210,y:835,w:150,h:110},{x:455,y:485,w:100,h:36},{x:440,y:1120,w:110,h:120}];

const RDEF=[
 {id:'08',n:'Ruta 08',from:'Villas del Pedregal',to:'Centro',c:'#1E6AE6',bus:4,
  pts:[[160,160],[160,300],[860,300],[860,540],[160,540],[160,160]],
  stops:[['Villas del Pedregal',160,160],['Central de Autobuses',160,300],['Estadio Morelos',860,300],['Av. Madero Ote.',760,540],['Fuente de las Tarascas',640,540],['Plaza de Armas',520,540],['Centro Histórico',440,540],['Av. Madero Pte.',260,540]]},
 {id:'21',n:'Ruta 21',from:'Centro',to:'Las Américas',c:'#0E7490',bus:3,
  pts:[[440,540],[400,540],[400,1080],[640,1080],[640,540],[440,540]],
  stops:[['Centro Histórico',440,540],['Av. Morelos Sur',400,800],['Glorieta Periférico Sur',400,1080],['Plaza Las Américas',640,1080],['Av. Camelinas',640,800],['Acueducto',640,660],['Fuente de las Tarascas',640,540],['Plaza de Armas',520,540]]},
 {id:'14',n:'Ruta 14',from:'Centro',to:'Ciudad Universitaria',c:'#6D28D9',bus:2,
  pts:[[440,540],[400,540],[400,800],[160,800],[160,540],[440,540]],
  stops:[['Centro Histórico',440,540],['Av. Morelos',400,680],['Ciudad Universitaria',280,800],['Av. Siervo de la Nación',160,680],['Av. Madero Pte.',260,540]]},
 {id:'33',n:'Ruta 33',from:'Las Tarascas',to:'Tecmilenio',c:'#DB2777',bus:3,
  pts:[[640,540],[860,540],[860,1080],[640,1080],[640,540]],
  stops:[['Fuente de las Tarascas',640,540],['Av. Madero Ote.',760,540],['Av. Solidaridad',860,700],['Tecmilenio',860,960],['Plaza Las Américas',640,1080],['Av. Camelinas',640,800],['Acueducto',640,660]]}
];

const VDEF=[
 {id:'T214',type:'taxi',n:'Taxi 214',drv:'Jorge M.',car:'Nissan Versa blanco',plate:'PTM-214',rate:4.8,seats:3,d:120,
  pts:[[640,540],[860,540],[860,800],[640,800],[640,540]]},
 {id:'T087',type:'taxi',n:'Taxi 087',drv:'Luis R.',car:'Chevrolet Aveo blanco',plate:'PTM-087',rate:4.6,seats:4,d:300,
  pts:[[400,300],[640,300],[640,540],[400,540],[400,300]]},
 {id:'A552',type:'car',n:'Auto de plataforma',drv:'Ana G.',car:'Kia Rio gris',plate:'NLR-552',rate:4.9,seats:3,d:60,
  pts:[[400,800],[640,800],[640,1080],[400,1080],[400,800]]},
 {id:'A318',type:'car',n:'Auto de plataforma',drv:'Diego S.',car:'Mazda 2 rojo',plate:'NKT-318',rate:4.7,seats:2,d:420,
  pts:[[160,540],[400,540],[400,800],[160,800],[160,540]]}
];

/* ---------- path helpers ---------- */
function mkPath(pts){const seg=[];let L=0;for(let i=0;i<pts.length-1;i++){const [x1,y1]=pts[i],[x2,y2]=pts[i+1];const l=Math.hypot(x2-x1,y2-y1);seg.push({x1,y1,x2,y2,l,d0:L});L+=l}return{pts,seg,L}}
function at(P,d){d=((d%P.L)+P.L)%P.L;for(const s of P.seg){if(d<=s.d0+s.l+1e-9){const k=s.l?(d-s.d0)/s.l:0;return{x:s.x1+(s.x2-s.x1)*k,y:s.y1+(s.y2-s.y1)*k}}}const s=P.seg[P.seg.length-1];return{x:s.x2,y:s.y2}}
function proj(P,x,y){let best=1e9,bd=0;for(const s of P.seg){const dx=s.x2-s.x1,dy=s.y2-s.y1;let k=((x-s.x1)*dx+(y-s.y1)*dy)/(s.l*s.l);k=Math.max(0,Math.min(1,k));const dd=Math.hypot(s.x1+dx*k-x,s.y1+dy*k-y);if(dd<best-1e-6){best=dd;bd=s.d0+k*s.l}}return bd}
/* points along the loop from d1 forward to d2 */
function sub(P,d1,d2){d1=((d1%P.L)+P.L)%P.L;d2=((d2%P.L)+P.L)%P.L;if(d2<=d1)d2+=P.L;const out=[at(P,d1)];for(let lap=0;lap<2;lap++)for(const s of P.seg){const vd=s.d0+s.l+lap*P.L;if(vd>d1+1e-6&&vd<d2-1e-6)out.push({x:s.x2,y:s.y2})}out.push(at(P,d2));return out}
function man(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)}
function lpath(a,b){return Math.abs(a.x-b.x)<1||Math.abs(a.y-b.y)<1?[{x:a.x,y:a.y},{x:b.x,y:b.y}]:[{x:a.x,y:a.y},{x:b.x,y:a.y},{x:b.x,y:b.y}]}
function polyLen(pts){const c=[0];for(let i=1;i<pts.length;i++)c.push(c[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y));return c}
function polyAt(pts,c,k){const L=c[c.length-1],d=Math.max(0,Math.min(1,k))*L;for(let i=1;i<pts.length;i++){if(d<=c[i]+1e-9){const s=c[i]-c[i-1],t=s?(d-c[i-1])/s:0;return{x:pts[i-1].x+(pts[i].x-pts[i-1].x)*t,y:pts[i-1].y+(pts[i].y-pts[i-1].y)*t}}}const p=pts[pts.length-1];return{x:p.x,y:p.y}}

/* ---------- build world ---------- */
const ROUTES=RDEF.map(r=>{const P=mkPath(r.pts);const stops=r.stops.map(([n,x,y])=>({n,x,y,d:proj(P,x,y)})).sort((a,b)=>a.d-b.d);return{...r,P,stops,buses:[]}});
const BUSES=[];
let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
function initBuses(){
 BUSES.length=0;seed=7;
 ROUTES.forEach(r=>{r.buses=[];for(let k=0;k<r.bus;k++){
  const d=(r.P.L*(k+.37))/r.bus;
  const b={id:r.id+'-'+'ABCD'[k],type:'bus',r,d,dw:0,jam:0,at:-1,occ:10+Math.floor(rnd()*22),ni:0};
  b.ni=nextIdx(r,d);BUSES.push(b);r.buses.push(b)}});
}
function nextIdx(r,d){let best=0,bd=1e9;r.stops.forEach((s,i)=>{const rel=(s.d-d+r.P.L)%r.P.L;if(rel>.5&&rel<bd){bd=rel;best=i}});return best}
const CARS=VDEF.map(v=>({...v,P:mkPath(v.pts),d0:v.d}));
function resetSim(){ROUTES.forEach(r=>r.inc=null);initBuses();CARS.forEach(v=>v.d=v.d0)}
resetSim();

/* ---------- simulation ---------- */
function step(dt){
 for(const b of BUSES){
  let rem=dt;const r=b.r,L=r.P.L,n=r.stops.length;
  let guard=0;
  while(rem>1e-6&&guard++<20){
   if(b.jam>0){const u=Math.min(b.jam,rem);b.jam-=u;rem-=u;continue}
   if(b.dw>0){const u=Math.min(b.dw,rem);b.dw-=u;rem-=u;continue}
   const ns=r.stops[b.ni];let to=(ns.d-b.d+L)%L;if(to<1e-6)to=L;
   const can=SPD.bus*rem;
   if(can>=to){b.d=(b.d+to)%L;rem-=to/SPD.bus;b.dw=DW;b.at=b.ni;b.occ=Math.max(4,Math.min(CAP-2,b.occ+Math.round((rnd()-.45)*12)));b.ni=(b.ni+1)%n}
   else{b.d=(b.d+can)%L;rem=0;b.at=-1}
  }
 }
 for(const v of CARS)v.d=(v.d+SPD[v.type]*dt)%v.P.L;
 for(const r of ROUTES)if(r.inc&&r.buses.every(b=>!(b.jam>0)))r.inc=null;
}
/* a traffic incident holds every bus of the route for the given minutes */
function incident(r,reason,min){r.inc={reason,min,at:Date.now()};r.buses.forEach(b=>{b.jam=(b.jam||0)+min*60})}
function pos(v){return v.type==='bus'?at(v.r.P,v.d):at(v.P,v.d)}

/* seconds until bus b reaches stop index si */
function busEta(b,si){
 const r=b.r,L=r.P.L,n=r.stops.length;
 if(b.dw>0&&b.at===si&&!(b.jam>0))return 0;
 const rel=(r.stops[si].d-b.d+L)%L;
 let t=rel/SPD.bus+(b.dw>0?b.dw:0)+(b.jam>0?b.jam:0);
 let k=b.ni,g=0;while(k!==si&&g++<n){t+=DW;k=(k+1)%n}
 return t;
}
function loopT(r){return r.P.L/SPD.bus+r.stops.length*DW}
function arrivals(r,si){return r.buses.map(b=>({b,t:busEta(b,si)})).sort((a,b)=>a.t-b.t)}
function nearestStop(r,p){let bi=0,bd=1e9;r.stops.forEach((s,i)=>{const d=man(s,p);if(d<bd){bd=d;bi=i}});return bi}
function vehEta(v,p){return man(pos(v),p)/SPD[v.type]+45}
function busStatus(b,si){if(b.jam>0)return{k:'late',t:'Retrasado'};if(b.dw>0&&b.at===si)return{k:'here',t:'En tu parada'};const t=busEta(b,si);if(t<45)return{k:'near',t:'Llegando'};if(b.dw>0)return{k:'stop',t:'Detenido en parada'};return{k:'go',t:'En camino'}}

/* ---------- planner ---------- */
function options(o,D,only){
 const out=[];
 if(man(o,D)<30)return out;
 if(!only||only.type==='bus'){
  const bus=[];
  for(const r of ROUTES){
   if(only&&only.r&&only.r!==r)continue;
   const bi=nearestStop(r,o),ai=nearestStop(r,D);if(bi===ai)continue;
   const bs=r.stops[bi],as=r.stops[ai];
   const w1=man(o,bs)/SPD.walk,w2=man(as,D)/SPD.walk;
   if(w1>1200||w2>1200)continue;
   const arr=arrivals(r,bi);let pick=arr.find(x=>x.t>=w1);let wt;
   if(pick)wt=pick.t-w1;else{pick=arr[0];wt=pick.t+loopT(r)-w1}
   const L=r.P.L,rd=(as.d-bs.d+L)%L;let nst=0,k=(bi+1)%r.stops.length;while(k!==ai){nst++;k=(k+1)%r.stops.length}
   const ride=rd/SPD.bus+nst*DW;
   const total=w1+wt+ride+w2;
   bus.push({k:'bus',r,b:pick.b,bi,ai,bs,as,w1,wait:wt,ride,w2,total,dist:man(o,bs)+rd+man(as,D),nst:nst+1,price:11,space:CAP-pick.b.occ,o,D});
  }
  bus.sort((a,b)=>a.total-b.total);out.push(...bus.slice(0,only?1:2));
 }
 for(const type of ['taxi','car']){
  if(only&&only.type!==type)continue;
  const pool=CARS.filter(v=>v.type===type&&(!only||!only.v||only.v===v));
  if(!pool.length)continue;
  const v=pool.map(v=>({v,t:vehEta(v,o)})).sort((a,b)=>a.t-b.t)[0];
  const dist=man(o,D),ride=dist/SPD[type],km=dist*U/1000;
  out.push({k:type,v:v.v,wait:v.t,ride,total:v.t+ride,dist,price:Math.round(type==='taxi'?30+km*9:28+km*8),space:v.v.seats,o,D});
 }
 if(out.length){
  const f=out.reduce((a,b)=>a.total<b.total?a:b);f.fast=true;
  const kinds=new Set(out.map(x=>x.k));
  if(kinds.size>1){const c=out.reduce((a,b)=>a.price<=b.price?a:b);if(c!==f)c.cheap=true}
 }
 return out;
}

/* ---------- formatting ---------- */
const mins=t=>Math.max(1,Math.round(t/60));
function etaTxt(t){return t<45?'Llegando':mins(t)+' min'}
function clock(sec){return new Date(Date.now()+sec*1000).toLocaleTimeString('es-MX',{hour:'numeric',minute:'2-digit'})}
function km(units){const m=units*U;return m<1000?Math.round(m/10)*10+' m':(m/1000).toFixed(1)+' km'}

window.MM={U,SCALE,DW,CAP,SPD,ME0,PLACES,STREETS,PARKS,ROUTES,BUSES,CARS,
 at,sub,man,lpath,polyLen,polyAt,step,incident,pos,busEta,arrivals,nearestStop,vehEta,busStatus,options,loopT,
 mins,etaTxt,clock,km,resetSim};
})();
