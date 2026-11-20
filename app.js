/* MoveMorelia demo app: screens, navigation, trips, delays, tutorial and easy mode. */
(function(){
'use strict';
const M=window.MM,V=window.MapV;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const app=$('#app');
const ICON={bus:'bus',taxi:'tax',car:'car'},TILE={bus:'bu',taxi:'tx',car:'cr'};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ic=(id,cls)=>`<svg${cls?` class="${cls}"`:''} aria-hidden="true"><use href="#${id}"/></svg>`;
const tile=(t,sm)=>`<div class="tile ${TILE[t]}${sm?' sm':''}">${ic(ICON[t])}</div>`;
const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const plural=(n,a,b)=>n===1?a:b;
const hhmm=t=>new Date(t).toLocaleTimeString('es-MX',{hour:'numeric',minute:'2-digit'});

const KEYS=['favR','favP','hist','guide','trips','alerts','who','easy','voice','dAlerts','entry','onb'];
const store={
 get(k,d){try{const v=localStorage.getItem('mm_'+k);return v?JSON.parse(v):d}catch(e){return d}},
 set(k,v){try{localStorage.setItem('mm_'+k,JSON.stringify(v))}catch(e){}},
 clear(){try{KEYS.forEach(k=>localStorage.removeItem('mm_'+k))}catch(e){}}
};

const S={
 tab:'map',me:{...M.ME0},mapF:'all',listF:'all',listQ:'',
 plan:{o:null,d:null,mode:'all',opts:[]},
 sel:null,preview:null,psegs:null,trip:null,tripPos:null,
 who:store.get('who',null),easy:store.get('easy',false),voice:store.get('voice',true),
 dAlerts:store.get('dAlerts',true),entry:store.get('entry',null),onb:store.get('onb',false),
 favR:new Set(store.get('favR',['08'])),favP:null,
 hist:store.get('hist',[]),bells:new Set(),fired:{},alerts:store.get('alerts',true),
 guide:store.get('guide',{}),trips:store.get('trips',0),inbox:[],unread:0
};
S.favP=new Set(store.get('favP',['casa',S.who==='work'?'trabajo':'tec']));
window.APPME=()=>S.trip&&S.trip.riding?null:(S.tripPos||S.me);
const stu=()=>S.who!=='work';
const meP=()=>({id:'me',n:'Tu ubicación actual',s:'Ubicación del teléfono',x:S.me.x,y:S.me.y,me:true});
const placeById=id=>M.PLACES.find(p=>p.id===id);
const routeById=id=>M.ROUTES.find(r=>r.id===id);
const carById=id=>M.CARS.find(v=>v.id===id);
const busById=id=>M.BUSES.find(b=>b.id===id);
const vehById=id=>busById(id)||carById(id);
const mainPlace=()=>placeById(stu()?'tec':'trabajo');
const entryTime=()=>S.entry||(stu()?'07:00':'09:00');
const fmtH=h=>{const [a,b]=h.split(':').map(Number);const d=new Date();d.setHours(a,b,0,0);return hhmm(d)};
const isPublic=p=>!p.tag||p.id==='tec';
const placeIcon=p=>p.me?'loc':p.id==='casa'?'hom':p.id==='tec'?'school':p.id==='trabajo'?'work':p.tag?'star':'pin';

/* ---------------- guide ---------------- */
const GUIDE=[
 {k:'search',t:'Busca un destino',d:'Toca “¿A dónde vas?” en el mapa.',go:()=>{tab('map')}},
 {k:'vehicle',t:'Toca un vehículo en el mapa',d:'Mira en cuánto llega y cuánto espacio tiene.',go:()=>{tab('map')}},
 {k:'filter',t:'Filtra la lista',d:'En Cerca, elige camiones, taxis o coches.',go:()=>{tab('list')}},
 {k:'details',t:'Abre los detalles de un camión',d:'Sus paradas, su estado y el espacio libre.',go:()=>{tab('list')}},
 {k:'plan',t:'Compara opciones de viaje',d:'En Rutas, elige un destino y selecciona una.',go:()=>{tab('plan')}},
 {k:'trip',t:'Haz un viaje completo',d:'Inicia el viaje y llega a tu destino.',go:()=>{tab('plan')}},
 {k:'delay',t:'Recibe un aviso de retraso',d:'Toca “Simular retraso” o espera a que pase uno.',go:()=>{tab('prof')}},
 {k:'easy',t:'Prueba el modo fácil',d:'En Perfil: letra grande y botones sencillos.',go:()=>{tab('prof')}}
];
function done(k){if(S.guide[k])return;S.guide[k]=1;store.set('guide',S.guide);renderGuide()}
function guideItems(){return GUIDE.map((g,i)=>`<li class="${S.guide[g.k]?'done':''}"><button type="button" data-act="guide-go" data-i="${i}"><span class="ck">${ic('chk')}</span><span><b>${g.t}</b><small>${g.d}</small></span></button></li>`).join('')}
function renderGuide(){
 const n=GUIDE.filter(g=>S.guide[g.k]).length;
 $('#guide').innerHTML=guideItems();$('#gcount').textContent=`${n} de ${GUIDE.length}`;$('#gbar').style.width=(n/GUIDE.length*100)+'%';
 const gp=$('#gpage');if(gp)gp.innerHTML=guideRows();
}
function guideRows(){return `<div class="rows">${GUIDE.map((g,i)=>`<button class="row" type="button" data-act="guide-go" data-i="${i}"><span class="ri ${S.guide[g.k]?'':'mute'}" style="${S.guide[g.k]?'background:#DCF7E7;color:#16A34A':''}">${ic(S.guide[g.k]?'chk':'help')}</span><span class="rt"><b>${g.t}</b><small>${g.d}</small></span>${ic('chv','chev')}</button>`).join('')}</div>`}

/* ---------------- voice (easy mode) ---------------- */
const canSpeak=(()=>{try{return 'speechSynthesis' in window&&typeof SpeechSynthesisUtterance!=='undefined'}catch(e){return false}})();
function speak(t){if(!S.easy||!S.voice||!canSpeak)return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='es-MX';u.rate=.95;speechSynthesis.speak(u)}catch(e){}}

/* ---------------- notifications & inbox ---------------- */
let notT=0;
const NICON={bu:'bus',tx:'tax',cr:'car',ok:'chk',wa:'warn',in:'bell'};
function notify(t,title,text){
 const n=$('#notif');
 n.innerHTML=`<div class="tile ${t}">${ic(NICON[t]||'bell')}</div><div><b>${esc(title)}</b><span>${esc(text)}</span></div><small>ahora</small>`;
 if(t==='ok')n.querySelector('.tile').style.cssText='background:#DCF7E7;color:#16A34A';
 if(t==='in')n.querySelector('.tile').style.cssText='background:#EEF4FF;color:#1E6AE6';
 n.classList.add('in');clearTimeout(notT);notT=setTimeout(()=>n.classList.remove('in'),t==='wa'?5600:4200);
 speak(title+'. '+text);
}
function log(t,title,text){S.inbox.unshift({t,title,text,at:Date.now()});S.inbox=S.inbox.slice(0,40);S.unread++;updDots()}
function updDots(){$$('.udot').forEach(d=>{d.hidden=!S.unread})}
function openInbox(){
 closeDrawer();S.unread=0;updDots();
 const st=t=>t==='wa'?'background:#FFEDD5;color:#C2410C':t==='ok'?'background:#DCF7E7;color:#16A34A':'';
 openPage(phd('Avisos')+`<div class="pbody">${S.inbox.length?`<div class="rows">${S.inbox.map(n=>`<div class="row irow"><span class="ri" style="${st(n.t)}">${ic(NICON[n.t]||'bell')}</span><span class="rt"><b>${esc(n.title)}</b><small>${esc(n.text)}</small></span><span class="rv">${hhmm(n.at)}</span></div>`).join('')}</div>`:`<div class="empty"><b>Sin avisos por ahora</b>Aquí verás los retrasos y cuando tu camión esté por llegar.</div>`}
 <p style="margin:16px 4px;font-size:13.5px;color:var(--t3);line-height:1.5">Te avisamos de retrasos en tus rutas favoritas y en las que pasan cerca de ti. Puedes apagarlos en Perfil.</p></div>`);
}

/* ---------------- tabs ---------------- */
function tab(t){
 closeDrawer();closePages();
 S.tab=t;
 $$('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+t));
 $$('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
 if(t==='list'){renderList();$('#llist').scrollTop=0}
 if(t==='plan')renderPlan();
 if(t==='fav')renderFav();
 if(t==='prof')renderProf();
 if(t==='map')requestAnimationFrame(()=>V.size());
}

/* ---------------- chips ---------------- */
const FILTERS=[['all','Todos',''],['bus','Camiones','#1E6AE6'],['taxi','Taxis','#F5B700'],['car','Coches','#1FAF5C']];
function chips(where,cur){return FILTERS.map(([k,t,c])=>`<button type="button" class="chip${k===cur?' on':''}" data-act="chip" data-w="${where}" data-k="${k}">${c?`<i style="background:${c}"></i>`:''}${t}</button>`).join('')}
function renderChips(){$('#mchips').innerHTML=chips('map',S.mapF);$('#lchips').innerHTML=chips('list',S.listF)}

/* ---------------- options helpers ---------------- */
function adj(opts){opts.forEach(o=>{if(o.k==='bus'){o.price=stu()?6:11;o.stu=stu()}});return opts}
const bestOpt=opts=>opts.filter(x=>x.k==='bus')[0]||opts[0];
function goNow(p){setDest(p);S.plan.o=null;const opts=computePlan();if(!opts.length){notify('in','Ya estás ahí','Elige otro destino.');return}preview(bestOpt(opts))}

/* ---------------- "para ti" ---------------- */
function forYou(){
 const D=mainPlace();if(!D||M.man(S.me,D)<40)return '';
 const opts=adj(M.options(meP(),D));if(!opts.length)return '';
 const o=bestOpt(opts);
 const [hh,mm]=entryTime().split(':').map(Number);const t=new Date();t.setHours(hh,mm,0,0);
 const leave=new Date(t.getTime()-(o.total+300)*1000);const tomorrow=leave.getTime()<Date.now();
 const extra=o.k==='bus'&&o.r.inc?`<span class="stu">Incluye retraso de ${o.r.inc.min} min</span>`:stu()&&o.k==='bus'?`<span class="stu">Pasaje estudiante: $${o.price}</span>`:`<span class="stu">${optName(o)}</span>`;
 return `<div class="fy"><span class="k">${ic(stu()?'school':'work')}Para ti · ${stu()?'Estudiante':'Trabajador'}</span><b>Para llegar a ${stu()?D.n:'tu trabajo'} a las ${hhmm(t)}</b><p>Sal ${tomorrow?'mañana ':''}a las ${hhmm(leave)} · ${optName(o)} · ${M.mins(o.total)} min</p><div class="row2">${extra}<button class="go" type="button" data-act="go-now" data-id="${D.id}">Ver ruta</button></div></div>`;
}

/* ---------------- list ---------------- */
function entries(){
 const out=[];
 for(const r of M.ROUTES){const si=M.nearestStop(r,S.me);const a=M.arrivals(r,si)[0];out.push({id:'r'+r.id,type:'bus',r,si,b:a.b,t:a.t})}
 for(const v of M.CARS)out.push({id:'v'+v.id,type:v.type,v,t:M.vehEta(v,S.me)});
 return out;
}
function entryMatch(e,q){
 if(!q)return true;q=norm(q);
 const txt=e.r?[e.r.n,e.r.id,e.r.from,e.r.to,'camion',...e.r.stops.map(s=>s.n)].join(' '):[e.v.n,e.v.drv,e.v.car,e.v.type==='taxi'?'taxi':'auto coche plataforma'].join(' ');
 return norm(txt).includes(q);
}
function cardInner(e){
 if(e.r){const r=e.r,st=r.stops[e.si],sp=M.CAP-e.b.occ;
  const sub=r.inc?`<small class="lt">Retraso +${r.inc.min} min · ${r.inc.reason}</small>`:`<small>${r.from} – ${r.to}</small>`;
  return `${tile('bus')}<div class="ci"><b>Camión ${r.n}</b>${sub}<p>Llegada: <strong data-f="eta">${M.etaTxt(e.t)}</strong> · ${st.n}</p><em data-f="sp">Espacio disponible: ${sp}/${M.CAP}</em><div class="bar"><i data-f="bar" style="width:${sp/M.CAP*100}%;background:#1E6AE6"></i></div></div>${ic('chv','chev')}`}
 const v=e.v;
 return `${tile(v.type)}<div class="ci"><b>${v.n}</b><small>${v.type==='taxi'?'Disponible cerca de ti':v.drv+' · '+v.car}</small><p>Llegada: <strong data-f="eta">${M.etaTxt(e.t)}</strong></p><em>Espacio disponible: ${v.seats}/4</em><div class="bar"><i style="width:${v.seats/4*100}%;background:${v.type==='taxi'?'#F5B700':'#1FAF5C'}"></i></div></div>${ic('chv','chev')}`;
}
function renderList(){
 const list=entries().filter(e=>(S.listF==='all'||e.type===S.listF)&&entryMatch(e,S.listQ)).sort((a,b)=>a.t-b.t);
 const fy=S.listF==='all'&&!S.listQ?forYou():'';
 $('#llist').innerHTML=fy+(list.length?list.map(e=>`<button class="card" type="button" data-act="open" data-id="${e.id}">${cardInner(e)}</button>`).join(''):
  `<div class="empty"><b>Sin resultados</b>No encontramos “${esc(S.listQ)}”. Prueba con una ruta como 08 o un lugar como Centro.</div>`);
}
function updList(){
 const map=new Map(entries().map(e=>[e.id,e]));
 $$('#llist .card').forEach(c=>{const e=map.get(c.dataset.id);if(!e)return;
  const eta=c.querySelector('[data-f="eta"]');if(eta)eta.textContent=M.etaTxt(e.t);
  if(e.r){const sp=M.CAP-e.b.occ;const s=c.querySelector('[data-f="sp"]');if(s)s.textContent=`Espacio disponible: ${sp}/${M.CAP}`;const b=c.querySelector('[data-f="bar"]');if(b)b.style.width=sp/M.CAP*100+'%'}});
}

/* ---------------- pages ---------------- */
const stack=[];
function openPage(html,cls,onClose){
 const p=document.createElement('section');p.className='page '+(cls||'');p.innerHTML=html;p._close=onClose;
 $('#pages').appendChild(p);stack.push(p);app.classList.add('light-top');
 requestAnimationFrame(()=>requestAnimationFrame(()=>p.classList.add('in')));
 return p;
}
function closeTop(){const p=stack.pop();if(!p)return;p.classList.remove('in');p._close&&p._close();setTimeout(()=>p.remove(),380);if(!stack.length)app.classList.remove('light-top')}
function closePages(){while(stack.length)closeTop()}
const phd=(title,extra='')=>`<div class="phd"><button class="back" type="button" data-act="back" aria-label="Regresar">${ic('bk')}</button><b>${title}</b>${extra}</div>`;

/* ---------------- search ---------------- */
let searchCb=null,searchCtx='dest';
function openSearch(ctx,cb){
 searchCb=cb;searchCtx=ctx;
 const ttl=ctx==='origin'?'¿Desde dónde sales?':ctx==='fav'?'Agregar a favoritos':'¿A dónde vas?';
 const p=openPage(`<div class="phd"><button class="back" type="button" data-act="back" aria-label="Regresar">${ic('bk')}</button><label class="sinput">${ic('sch')}<input id="sq" type="search" placeholder="${ttl}" autocomplete="off" aria-label="${ttl}"></label></div><div class="pbody" id="sres"></div>`,'spage');
 const inp=p.querySelector('#sq');
 inp.addEventListener('input',()=>renderSearch(inp.value));
 renderSearch('');
 setTimeout(()=>{try{inp.focus({preventScroll:true})}catch(e){}},380);
}
function prow(p,act){
 const d=p.me?'':` · ${M.km(M.man(S.me,p))}`;
 return `<button class="row" type="button" data-act="${act}" data-id="${p.id}"><span class="ri${p.me||p.tag?'':' mute'}">${ic(placeIcon(p))}</span><span class="rt"><b>${esc(p.n)}</b><small>${esc(p.s)}${d}</small></span></button>`;
}
function renderSearch(q){
 const box=$('#sres');if(!box)return;
 let h='';
 if(q.trim()){
  const res=M.PLACES.filter(p=>(isPublic(p)||S.favP.has(p.id))&&norm(p.n+' '+p.s).includes(norm(q.trim())));
  h=res.length?`<div class="rows">${res.map(p=>prow(p,'pick')).join('')}</div>`:`<div class="empty"><b>Sin resultados</b>No encontramos “${esc(q)}”. Prueba con Centro, Tecmilenio o Las Américas.</div>`;
 }else{
  if(searchCtx==='origin')h+=`<div class="rows" style="margin-top:6px">${prow(meP(),'pick')}</div>`;
  const saved=[...S.favP].map(placeById).filter(Boolean);
  if(saved.length&&searchCtx!=='fav')h+=`<div class="sect">Tus lugares</div><div class="rows">${saved.map(p=>prow(p,'pick')).join('')}</div>`;
  const rec=[];S.hist.slice().reverse().forEach(x=>{const p=placeById(x.pid);if(p&&!rec.includes(p))rec.push(p)});
  if(rec.length&&searchCtx!=='fav')h+=`<div class="sect">Recientes</div><div class="rows">${rec.slice(0,3).map(p=>prow(p,'pick')).join('')}</div>`;
  const pop=M.PLACES.filter(p=>isPublic(p)&&!S.favP.has(p.id));
  h+=`<div class="sect">Lugares populares</div><div class="rows">${pop.map(p=>prow(p,'pick')).join('')}</div>`;
 }
 box.innerHTML=h;
}
function pickPlace(id){const p=id==='me'?meP():placeById(id);const cb=searchCb;searchCb=null;closeTop();if(cb&&p)setTimeout(()=>cb(p),60)}

/* ---------------- map sheet ---------------- */
const sheet=$('#msheet');
let sheetMode=null;
function showSheet(html,mode){sheet.innerHTML=html;sheetMode=mode;sheet.classList.remove('hide');syncSheet()}
function hideSheet(){sheet.classList.add('hide');sheetMode=null;syncSheet()}
function syncSheet(){const h=sheet.classList.contains('hide')?0:sheet.offsetHeight;$('#v-map').style.setProperty('--sh',h+'px');return h}
if(window.ResizeObserver)new ResizeObserver(syncSheet).observe(sheet);
/* resting state of the map sheet: easy-mode shortcuts, or nothing */
function idle(){
 if(S.trip||S.preview||S.sel)return;
 if(S.easy)showSheet(easyHTML(),'easy');else if(sheetMode==='easy'||sheetMode===null)hideSheet();
}
function easyHTML(){
 const D=mainPlace();
 const b=(act,id,tc,icn,t,s)=>`<button class="ebtn" type="button" data-act="${act}"${id?` data-id="${id}"`:''}><span class="tile ${tc}">${ic(icn)}</span><span><b>${t}</b>${s?`<small>${s}</small>`:''}</span>${ic('chv','chev')}</button>`;
 return `<div class="grab"></div><b class="eh">¿A dónde quieres ir?</b><div class="ebtns">${b('go-now',D.id,'bu',stu()?'school':'work',stu()?'A la escuela':'Al trabajo',stu()?D.n:'Tu lugar de trabajo')}${b('go-now','casa','cr','hom','A mi casa','Lugar guardado')}${b('search-map','','wk','sch','A otro lugar','Escribe a dónde vas')}</div>`;
}

function selectVehicle(id,fly){
 const v=vehById(id);if(!v)return;
 if(S.preview)closePreview();
 S.sel=id;V.select(id);done('vehicle');
 if(v.type==='bus'){const si=M.nearestStop(v.r,S.me);V.showRoute(v.r,[v.r.stops[si].n])}else V.clearOver();
 showSheet(vSheet(v),'veh');
 if(fly){const p=M.pos(v);const c=V.center();V.flyTo(p.x,p.y+(syncSheet()/2-40)/Math.max(c.z,1),Math.max(c.z,1.05))}
}
function vSheet(v){
 if(v.type==='bus'){const r=v.r,si=M.nearestStop(r,S.me),st=r.stops[si];const on=S.bells.has(r.id);
  const em=r.inc?`<em class="lt">Retraso de ${r.inc.min} min · ${r.inc.reason}</em>`:`<em data-f="sp">Espacio disponible: ${M.CAP-v.occ}/${M.CAP}</em>`;
  return `<div class="grab"></div><div class="shd">${tile('bus')}<div class="ci"><b>Camión ${r.n}</b><small>${r.from} – ${r.to}</small><p>Llegada: <strong data-f="eta">${M.etaTxt(M.busEta(v,si))}</strong> · ${st.n}</p>${em}</div><button class="xbtn" type="button" data-act="sh-close" aria-label="Cerrar">${ic('x')}</button></div>
  <div class="srow"><button class="btn sec" type="button" data-act="bell" data-id="${r.id}">${ic(on?'bell':'bello')}${on?'Aviso activo':'Avisarme'}</button><button class="btn pri" type="button" data-act="open" data-id="r${r.id}">Ver detalles</button></div>`}
 return `<div class="grab"></div><div class="shd">${tile(v.type)}<div class="ci"><b>${v.n}</b><small>${v.drv} · ★ ${v.rate} · ${v.car}</small><p>Llegada: <strong data-f="eta">${M.etaTxt(M.vehEta(v,S.me))}</strong> · hasta donde estás</p><em>Espacio disponible: ${v.seats}/4</em></div><button class="xbtn" type="button" data-act="sh-close" aria-label="Cerrar">${ic('x')}</button></div>
 <div class="srow"><button class="btn sec" type="button" data-act="open" data-id="v${v.id}">Ver detalles</button><button class="btn pri" type="button" data-act="request" data-id="${v.id}">${v.type==='taxi'?'Pedir taxi':'Pedir auto'}</button></div>`;
}
function updSheet(){
 if(sheetMode!=='veh'||!S.sel)return;const v=vehById(S.sel);const e=sheet.querySelector('[data-f="eta"]');if(!e)return;
 if(v.type==='bus'){const si=M.nearestStop(v.r,S.me);e.textContent=M.etaTxt(M.busEta(v,si));const s=sheet.querySelector('[data-f="sp"]');if(s)s.textContent=`Espacio disponible: ${M.CAP-v.occ}/${M.CAP}`}
 else e.textContent=M.etaTxt(M.vehEta(v,S.me));
}
function deselect(){S.sel=null;V.select(null);if(!S.preview&&!S.trip){V.clearOver();hideSheet();idle()}}

/* ---------------- details ---------------- */
let det=null;
function heroSVG(type,color,label){
 if(type==='bus')return `<svg class="veh" viewBox="0 0 220 90" aria-hidden="true"><rect x="6" y="6" width="208" height="66" rx="14" fill="#1E6AE6"/><rect x="6" y="6" width="208" height="12" rx="10" fill="#3B8BFF"/><rect x="6" y="54" width="208" height="8" fill="${color}"/><rect x="18" y="22" width="28" height="24" rx="4" fill="#0E2E66"/><rect x="52" y="22" width="28" height="24" rx="4" fill="#0E2E66"/><rect x="86" y="22" width="28" height="24" rx="4" fill="#0E2E66"/><rect x="120" y="22" width="28" height="24" rx="4" fill="#0E2E66"/><rect x="156" y="22" width="24" height="44" rx="3" fill="#0E2E66"/><rect x="167" y="22" width="2" height="44" fill="#1E6AE6"/><rect x="186" y="18" width="24" height="30" rx="6" fill="#0E2E66"/><rect x="204" y="58" width="8" height="7" rx="2" fill="#FFE07A"/><text x="22" y="40" font-size="10" font-weight="800" fill="#fff" font-family="system-ui,sans-serif" opacity=".9">${label}</text><g class="wh"><circle cx="50" cy="74" r="14" fill="#1C1C22"/><circle cx="50" cy="74" r="6" fill="#B8C0CA"/><rect x="48.5" y="62" width="3" height="24" fill="#B8C0CA"/></g><g class="wh"><circle cx="172" cy="74" r="14" fill="#1C1C22"/><circle cx="172" cy="74" r="6" fill="#B8C0CA"/><rect x="170.5" y="62" width="3" height="24" fill="#B8C0CA"/></g></svg>`;
 const sign=type==='taxi'?`<rect x="84" y="2" width="34" height="11" rx="3" fill="#1C1C22"/><text x="101" y="10.5" font-size="8" font-weight="800" fill="#FFD34D" text-anchor="middle" font-family="system-ui,sans-serif">TAXI</text>`:'';
 const wheel=x=>`<g class="wh"><circle cx="${x}" cy="66" r="14" fill="#1C1C22"/><circle cx="${x}" cy="66" r="6" fill="#B8C0CA"/><rect x="${x-1.5}" y="54" width="3" height="24" fill="#B8C0CA"/></g>`;
 return `<svg class="veh small" viewBox="0 0 200 82" aria-hidden="true">${sign}<path d="M10 56c0-9 6-14 16-15l30-3 22-21c4-3 8-4 13-4h38c6 0 10 2 14 6l18 19c14 1 26 6 26 18v8c0 3-2 5-5 5H15c-3 0-5-2-5-5z" fill="${color}"/><path d="M84 20h22v19H62z" fill="#0E2E66"/><path d="M112 20h22c3 0 5 1 7 3l15 16h-44z" fill="#0E2E66"/><rect x="186" y="50" width="8" height="6" rx="2" fill="#FFE07A"/><rect x="10" y="52" width="180" height="4" fill="#000" opacity=".12"/>${wheel(52)}${wheel(152)}</svg>`;
}
function openDetails(id){
 done('details');
 if(id[0]==='r'){
  const r=routeById(id.slice(1));const si=M.nearestStop(r,S.me),n=r.stops.length;
  const rows=[-2,-1,0,1,2].map(k=>r.stops[(si+k+n)%n]);
  const fav=S.favR.has(r.id),bell=S.bells.has(r.id);
  const p=openPage(phd('Detalles',`<button class="ib bell${bell?' on':''}" type="button" data-act="bell" data-id="${r.id}" aria-label="Avisarme cuando llegue">${ic(bell?'bell':'bello')}</button><button class="ib${fav?' on':''}" type="button" data-act="fav-route" data-id="${r.id}" aria-label="Guardar en favoritos">${ic(fav?'star':'staro')}</button>`)+
  `<div class="pbody"><div class="hero" data-f="hero"><div class="cloud" style="top:18px"></div><div class="cloud" style="top:46px;width:60px;animation-delay:-9s"></div><div class="sky"></div><div class="sky b"></div><div class="road"></div>${heroSVG('bus',r.c,'RUTA '+r.id)}<span class="pill" data-f="pill"><i></i><span>En camino</span></span></div>
  <div class="dtt"><b>Camión ${r.n}</b><span>${r.from} – ${r.to}</span></div>
  <div class="lateb" data-f="late" hidden></div>
  <div class="dsx"><div class="dbx">${ic('clk')}<div><small>Llega a tu parada</small><strong data-f="eta">–</strong></div></div><div class="dbx">${ic('ppl')}<div><small>Espacio disponible</small><strong data-f="sp">–</strong><div class="bar"><i data-f="bar" style="background:#1E6AE6"></i></div></div></div></div>
  <div class="nextb" data-f="next"></div>
  <div class="sect">Paradas cercanas</div>
  <div class="tl"><div class="tlin"><div class="rail" style="height:${4*46}px"></div><div class="rfill" data-f="fill"></div><div class="bmk" data-f="bmk">${ic('bus')}</div>${rows.map((s,i)=>`<div class="srowt${i===2?' me':''}"><span class="d"></span><span>${s.n}</span>${i===2?'<em>Tu parada</em>':''}</div>`).join('')}</div><div class="tlnote" data-f="note"></div></div>
  <div class="dbtns"><button class="btn pri" type="button" data-act="d-map" data-id="${r.id}">${ic('mapi')}Ver en el mapa</button><button class="btn sec" type="button" data-act="bell" data-id="${r.id}" data-f="bellbtn">${ic(bell?'bell':'bello')}${bell?'Te avisaremos cuando llegue':'Avisarme cuando llegue'}</button></div></div>`,'dpage',()=>{det=null});
  det={p,r,si,rows};updDetails();
 }else{
  const v=carById(id.slice(1));
  const color=v.type==='taxi'?'#F5B700':v.car.includes('rojo')?'#D63B3B':v.car.includes('gris')?'#9AA3AE':'#1FAF5C';
  const p=openPage(phd('Detalles')+`<div class="pbody"><div class="hero"><div class="cloud" style="top:18px"></div><div class="cloud" style="top:46px;width:60px;animation-delay:-9s"></div><div class="sky"></div><div class="sky b"></div><div class="road"></div>${heroSVG(v.type,color)}<span class="pill"><i></i><span>Disponible</span></span></div>
  <div class="dtt"><b>${v.n}</b><span>${v.type==='taxi'?'Disponible cerca de ti':'Viaje privado a tu destino'}</span></div>
  <div class="dsx"><div class="dbx">${ic('clk')}<div><small>Llega a ti en</small><strong data-f="eta">–</strong></div></div><div class="dbx">${ic('ppl')}<div><small>Espacio disponible</small><strong>${v.seats} / 4</strong><div class="bar"><i style="width:${v.seats*25}%;background:${v.type==='taxi'?'#F5B700':'#1FAF5C'}"></i></div></div></div></div>
  <div class="drv"><div class="av">${v.drv.split(' ').map(x=>x[0]).join('')}</div><div class="rt"><b>${v.drv}</b><small>★ ${v.rate} · ${v.car}</small></div><span class="plate">${v.plate}</span></div>
  <div class="dbtns"><button class="btn pri" type="button" data-act="request" data-id="${v.id}">${ic(ICON[v.type])}${v.type==='taxi'?'Pedir este taxi':'Pedir este auto'}</button><button class="btn sec" type="button" data-act="d-mapv" data-id="${v.id}">${ic('mapi')}Ver en el mapa</button></div></div>`,'dpage',()=>{det=null});
  det={p,v};updDetails();
 }
}
function updDetails(){
 if(!det)return;const f=k=>det.p.querySelector(`[data-f="${k}"]`);
 if(det.v){f('eta').textContent=M.etaTxt(M.vehEta(det.v,S.me));return}
 const {r,si,rows}=det,L=r.P.L,n=r.stops.length;
 const arr=M.arrivals(r,si),b=arr[0].b,st=M.busStatus(b,si),sp=M.CAP-b.occ;
 f('eta').textContent=st.k==='here'?'En la parada':M.etaTxt(arr[0].t);
 f('sp').textContent=`${sp} / ${M.CAP}`;f('bar').style.width=sp/M.CAP*100+'%';
 const pill=f('pill');pill.className='pill '+st.k;pill.querySelector('span').textContent=st.k==='late'&&r.inc?`Retrasado +${r.inc.min} min`:st.t;
 f('hero').classList.toggle('still',b.dw>0||b.jam>0);
 const lb=f('late'),key=r.inc?r.inc.at:0;
 if(lb._k!==key){lb._k=key;lb.hidden=!r.inc;if(r.inc)lb.innerHTML=`${ic('warn')}<div><b>Retraso de ${r.inc.min} min</b>${esc(r.inc.reason)}. Los tiempos de llegada ya incluyen el retraso.</div>`}
 f('next').innerHTML=arr[1]?`Siguiente camión: <b>${M.etaTxt(arr[1].t)}</b>${arr[2]?` · después <b>${M.etaTxt(arr[2].t)}</b>`:''}`:'';
 const d0=rows[0].d,rd=rows.map(s=>(s.d-d0+L)%L),rel=(b.d-d0+L)%L;
 let y,note;
 if(rel<=rd[2]+.5){let i=0;while(i<3&&rel>rd[i+1])i++;const seg=rd[i+1]-rd[i]||1;y=(i+Math.min(1,(rel-rd[i])/seg))*46;
  note=b.jam>0?`Detenido por ${r.inc?r.inc.reason.toLowerCase():'tráfico'}`:b.dw>0&&b.at>=0?`Detenido en ${r.stops[b.at].n}`:i<2?`Va entre ${rows[i].n} y ${rows[i+1].n}`:'Llegando a tu parada';
  if(st.k==='here'){y=92;note='El camión está en tu parada'}}
 else{y=0;let c=0,k=b.ni;const i0=r.stops.indexOf(rows[0]);while(k!==i0&&c<n){c++;k=(k+1)%n}c=Math.max(1,c);note=`${b.jam>0?'Detenido por tráfico. ':''}Viene a ${c} ${plural(c,'parada','paradas')} antes de ${rows[0].n}`}
 f('bmk').style.transform=`translateY(${y}px)`;f('fill').style.height=y+'px';f('note').textContent=note;
}

/* ---------------- planner ---------------- */
function computePlan(){const o=S.plan.o||meP(),D=S.plan.d;S.plan.opts=D?adj(M.options(o,D)):[];return S.plan.opts}
const MODES=[['all','Todas','rt'],['bus','Camión','bus'],['taxi','Taxi','tax'],['car','Coche','car']];
function optName(o){return o.k==='bus'?'Camión '+o.r.n:o.k==='taxi'?o.v.n:'Auto de plataforma'}
function legsHTML(o){
 if(o.k==='bus')return `<span>${ic('wlk')}${M.mins(o.w1)} min</span><i>›</i><span style="color:${o.r.c}">${ic('bus')}${o.r.n}</span><i>›</i><span>${ic('wlk')}${M.mins(o.w2)} min</span>`;
 return `<span>${ic(ICON[o.k])}Llega en ${M.mins(o.wait)} min</span><i>›</i><span>${ic('nav')}Viaje de ${M.mins(o.ride)} min</span>`;
}
function optHTML(o,i){
 const space=o.k==='bus'?`Espacio: ${o.space}/${M.CAP}`:`Disponible: ${o.space}/4`;
 const late=o.k==='bus'&&o.r.inc?`<span class="tag o">Retraso +${o.r.inc.min} min</span>`:'';
 return `<div class="opt">${o.fast?'<span class="badge">Más rápido</span>':''}${o.cheap?'<span class="badge c">Más barato</span>':''}<div class="top">${tile(o.k)}<div class="ci"><b>${optName(o)}</b><small>${M.mins(o.total)} min · ${M.km(o.dist)}</small><p>Llegas ${M.clock(o.total)}</p><span><span class="tag ${o.k==='bus'?'b':'g'}">${space}</span>${late}</span></div><div class="side"><span class="price">$${o.price}</span>${o.stu?'<span class="pnote">Estudiante</span>':''}<button class="sel" type="button" data-act="select" data-i="${i}">Seleccionar<span class="ok">¡Listo!</span></button></div></div><div class="legs">${legsHTML(o)}</div></div>`;
}
function renderPlan(){
 const o=S.plan.o,D=S.plan.d;
 $('#po').textContent=o?o.n:'Tu ubicación actual';
 const pd=$('#pd');pd.textContent=D?D.n:'¿A dónde vas?';pd.classList.toggle('ph',!D);
 $('#ptabs').innerHTML=MODES.map(([k,t,i])=>`<button type="button" role="tab" aria-selected="${k===S.plan.mode}" class="${k===S.plan.mode?'on':''}" data-act="mode" data-k="${k}">${ic(i)}${t}</button>`).join('');
 const box=$('#plist');
 if(!D){
  const saved=[...S.favP].map(placeById).filter(Boolean);
  box.innerHTML=`<div style="height:12px"></div>${forYou()}<div class="empty" style="padding:10px 8px 6px"><b>¿A dónde quieres ir?</b>Elige un destino y te mostramos cómo llegar en camión, taxi o auto.</div>${saved.length?`<div class="sect">Tus lugares</div><div class="qp">${saved.map(p=>`<button class="qpb" type="button" data-act="go-place" data-id="${p.id}"><span class="tile bu">${ic(placeIcon(p))}</span><span><b>${p.n}</b><small>${M.km(M.man(S.me,p))}</small></span></button>`).join('')}</div>`:''}<div class="sect">Lugares populares</div><div class="qp">${['centro','americas','cu','bosque'].map(placeById).map(p=>`<button class="qpb" type="button" data-act="go-place" data-id="${p.id}"><span class="tile wk">${ic('pin')}</span><span><b>${p.n}</b><small>${M.km(M.man(S.me,p))}</small></span></button>`).join('')}</div>`;
  return;
 }
 const opts=computePlan();
 if(!opts.length){box.innerHTML=`<div class="empty"><b>Ya estás ahí</b>Tu origen y tu destino están en el mismo lugar.</div>`;return}
 const shown=opts.map((x,i)=>[x,i]).filter(([x])=>S.plan.mode==='all'||x.k===S.plan.mode);
 box.innerHTML=`<div class="plb">${shown.length} ${plural(shown.length,'opción','opciones')} · Salida ahora</div>`+(shown.length?shown.map(([x,i])=>optHTML(x,i)).join(''):`<div class="empty"><b>No hay ${S.plan.mode==='bus'?'camión directo':'opciones'} para este viaje</b>Prueba con otro tipo de transporte.</div>`);
}
function setDest(p){S.plan.d=p;if(S.plan.o&&S.plan.o.id===p.id)S.plan.o=null}

/* ---------------- trip preview ---------------- */
function buildTrip(o){
 const segs=[],O=o.o,D=o.D;
 const mk=s=>{s.c=M.polyLen(s.pts);return s};
 if(o.k==='bus'){
  const r=o.r,bs=o.bs,as=o.as,L=r.P.L;
  if(M.man(O,bs)>4)segs.push(mk({kind:'walk',pts:M.lpath(O,bs),sec:o.w1,ms:Math.min(5200,Math.max(2400,o.w1*9)),to:bs.n}));
  segs.push(mk({kind:'wait',pts:M.sub(r.P,bs.d-Math.min(320,L*.2),bs.d),veh:'bus',color:r.c,rid:r.id,sec:o.wait,ms:3800,at:{x:bs.x,y:bs.y}}));
  const rs=[];let k=o.bi;for(let g=0;g<20;g++){rs.push(r.stops[k]);if(k===o.ai)break;k=(k+1)%r.stops.length}
  const rideLen=(as.d-bs.d+L)%L;
  const s=mk({kind:'ride',pts:M.sub(r.P,bs.d,as.d),veh:'bus',color:r.c,rid:r.id,sec:o.ride,ms:Math.min(13000,Math.max(6500,o.ride*6)),stops:rs});
  s.fr=rs.slice(1).map(x=>((x.d-bs.d+L)%L)/rideLen);segs.push(s);
  if(M.man(as,D)>4)segs.push(mk({kind:'walk',pts:M.lpath(as,D),sec:o.w2,ms:Math.min(4500,Math.max(2200,o.w2*9)),to:D.n}));
 }else{
  const vp=M.pos(o.v);
  segs.push(mk({kind:'wait',pts:M.lpath(vp,O),veh:o.k,color:o.k==='taxi'?'#F5B700':'#1FAF5C',sec:o.wait,ms:4400,at:{x:O.x,y:O.y}}));
  segs.push(mk({kind:'ride',pts:M.lpath(O,D),veh:o.k,color:o.k==='taxi'?'#D99A00':'#1FAF5C',sec:o.ride,ms:Math.min(12000,Math.max(6500,o.ride*6))}));
 }
 return segs;
}
function stepsHTML(o){
 const st=[];
 if(o.k==='bus'){
  if(M.man(o.o,o.bs)>4)st.push(['wk','wlk',`Camina a ${o.bs.n}`,`${M.mins(o.w1)} min · ${M.km(M.man(o.o,o.bs))}`]);
  st.push(['bu','bus',`Toma la ${o.r.n}`,`${o.r.inc?`Viene con retraso · llega en ${M.etaTxt(o.w1+o.wait)}`:`Llega en ${M.etaTxt(o.w1+o.wait)} · dirección ${o.r.to}`}`]);
  st.push(['bu','rt',`Viaja ${o.nst} ${plural(o.nst,'parada','paradas')}`,`Baja en ${o.as.n} · ${M.mins(o.ride)} min`]);
  if(M.man(o.as,o.D)>4)st.push(['wk','wlk',`Camina a ${o.D.n}`,`${M.mins(o.w2)} min · ${M.km(M.man(o.as,o.D))}`]);
 }else{
  const v=o.v;
  st.push([TILE[o.k],ICON[o.k],`Tu ${o.k==='taxi'?'taxi':'auto'} llega en ${M.mins(o.wait)} min`,`${v.drv} · ${v.car} · ${v.plate}`]);
  st.push([TILE[o.k],'nav',`Viaje de ${M.mins(o.ride)} min`,`Te deja en ${o.D.n} · $${o.price}`]);
 }
 st.push(['fl','flag',`Llegas a ${o.D.n}`,`Aprox. ${M.clock(o.total)}`]);
 return `<ol class="steps">${st.map(([t,i,b,s])=>`<li><div class="tile sm ${t}">${ic(i)}</div><div class="ci"><b>${esc(b)}</b><small>${esc(s)}</small></div></li>`).join('')}</ol>`;
}
function preview(o){
 if(!o)return;
 closePages();if(S.tab!=='map')tab('map');
 S.sel=null;V.select(null);
 S.preview=o;S.psegs=buildTrip(o);app.classList.add('pv');
 V.showTrip(S.psegs,o.D.me?null:o.D);V.tripVehicle(null);
 showSheet(`<div class="grab"></div><div class="shd"><div class="ci"><small>Hacia</small><b>${esc(o.D.n)}</b></div><button class="xbtn" type="button" data-act="pv-close" aria-label="Cancelar">${ic('x')}</button></div>
 <div class="sum"><b>${M.mins(o.total)} min</b><span>${optName(o)} · ${M.km(o.dist)} · $${o.price}${o.stu?' estudiante':''}</span></div>${stepsHTML(o)}
 <div class="srow"><button class="btn sec" type="button" data-act="pv-more">Otras opciones</button><button class="btn pri" type="button" data-act="pv-start">${ic('nav')}Iniciar viaje</button></div>`,'preview');
 const h=syncSheet();
 const pts=[];S.psegs.forEach(s=>pts.push(...s.pts));pts.push(o.o,o.D);
 V.fit(pts,{t:40,b:h+24,l:36,r:36},900);
 speak(`Hacia ${o.D.n}. ${M.mins(o.total)} minutos en ${optName(o)}.`);
}
function closePreview(){app.classList.remove('pv');S.preview=null;S.psegs=null;V.clearOver();hideSheet();idle()}

/* ---------------- trip ---------------- */
function startTrip(){
 const o=S.preview;if(!o)return;
 const segs=S.psegs;S.preview=null;app.classList.remove('pv');
 const T={o,segs,i:0,t0:performance.now(),totalSec:segs.reduce((a,s)=>a+s.sec,0),riding:false,told:{}};
 S.trip=T;S.tripPos={x:o.o.x,y:o.o.y};
 app.classList.add('trip');
 const vid=o.k==='bus'?o.b.id:o.v.id;T.hid=vid;V.hide(vid,true);
 $('#tripbar').hidden=false;$('#tripbar')._b='';
 showSheet(`<div class="grab"></div><div class="shd"><div class="tile sm ${TILE[o.k]}">${ic(ICON[o.k])}</div><div class="ci"><b data-f="tarr">Llegas ${M.clock(o.total)}</b><small data-f="trem">Faltan ${M.mins(o.total)} min · ${M.km(o.dist)}</small></div><button class="btn ghost" type="button" data-act="trip-end" style="height:40px;font-size:14px">Terminar</button></div><div class="prog"><i data-f="tprog"></i></div>`,'trip');
 segStart(T);
 V.follow(()=>S.tripPos,1.25,{t:110,b:syncSheet()});$('.fab').classList.add('on');
}
function segStart(T){
 const s=T.segs[T.i];T.st=performance.now();T.riding=s.kind==='ride';
 if(s.kind==='ride'&&T.o.k!=='bus')notify(TILE[T.o.k],T.o.k==='taxi'?'Tu taxi llegó':'Tu auto llegó',`Busca el ${T.o.v.car}, placas ${T.o.v.plate}.`);
}
function tripBar(ico,b,s){const tb=$('#tripbar');const k=ico+'|'+b+'|'+s;if(tb._k===k)return;tb._k=k;tb.innerHTML=`<div class="ti">${ic(ico)}</div><div class="tt"><b>${esc(b)}</b><span>${esc(s)}</span></div>`;if(tb._b!==b){tb._b=b;speak(b)}}
function tripFrame(now){
 const T=S.trip;let s=T.segs[T.i];let k=(now-T.st)/s.ms;
 if(k>=1){if(T.i<T.segs.length-1){T.i++;segStart(T);s=T.segs[T.i];k=0}else{finishTrip(true);return}}
 const p=M.polyAt(s.pts,s.c,k),o=T.o;
 if(s.kind==='walk'){S.tripPos=p;V.tripVehicle(null);tripBar('wlk',`Camina a ${s.to}`,`${M.mins(s.sec*(1-k))} min · ${M.km(s.c[s.c.length-1]*(1-k))}`)}
 else if(s.kind==='wait'){S.tripPos=s.at;V.tripVehicle(s.veh,p,s.color,s.rid);
  const left=s.sec*(1-k);
  if(o.k==='bus')tripBar(T.late?'warn':'bus',left<45?`Tu camión está llegando`:`Tu camión llega en ${M.mins(left)} min`,T.late?`Viene con ${T.late} min de retraso · ${o.r.n}`:`${o.r.n} · dirección ${o.r.to} · ${o.bs.n}`);
  else tripBar(ICON[o.k],left<45?`Tu ${o.k==='taxi'?'taxi':'auto'} está llegando`:`Tu ${o.k==='taxi'?'taxi':'auto'} llega en ${M.mins(left)} min`,`${o.v.drv} · ${o.v.car} · ${o.v.plate}`)}
 else{S.tripPos=p;V.tripVehicle(s.veh,p,s.color,s.rid);
  if(o.k==='bus'){const left=s.fr.filter(f=>f>k+.001).length;
   tripBar('bus',`Bájate en ${o.as.n}`,left>1?`Faltan ${left} paradas · ${o.r.n}`:left===1?'Es la siguiente parada':'Bájate aquí');
   if(left===1&&!T.told.next){T.told.next=1;notify('bu','Bájate en la siguiente parada',`La próxima es ${o.as.n}. Prepárate para bajar.`)}}
  else tripBar('nav',`Vas hacia ${o.D.n}`,`Llegas en ${M.mins(s.sec*(1-k))} min · ${M.km(s.c[s.c.length-1]*(1-k))}`)}
 let el=0;for(let j=0;j<T.i;j++)el+=T.segs[j].sec;el+=s.sec*Math.min(1,k);
 const rem=Math.max(0,T.totalSec-el);
 const ta=sheet.querySelector('[data-f="tarr"]'),txt=`Llegas ${M.clock(rem)}`;if(ta&&ta.textContent!==txt)ta.textContent=txt;
 const tr=sheet.querySelector('[data-f="trem"]');if(tr)tr.textContent=`Faltan ${M.mins(rem)} min · ${M.km(o.dist*(rem/T.totalSec))}`;
 const pg=sheet.querySelector('[data-f="tprog"]');if(pg)pg.style.width=Math.min(100,el/T.totalSec*100)+'%';
}
function finishTrip(arrived){
 const T=S.trip;if(!T)return;const o=T.o;
 S.trip=null;V.follow(null);V.tripVehicle(null);V.hide(T.hid,false);
 $('#tripbar').hidden=true;$('.fab').classList.remove('on');
 if(arrived){
  S.me={x:o.D.x,y:o.D.y};
  S.tripPos=null;S.plan.d=null;S.plan.o=null;
  const rec={pid:o.D.id,n:o.D.n,k:o.k,via:optName(o),min:M.mins(o.total),km:M.km(o.dist),price:o.price,at:Date.now()};
  S.hist.push(rec);S.hist=S.hist.slice(-30);store.set('hist',S.hist);S.trips++;store.set('trips',S.trips);done('trip');
  const canFav=o.D.id&&!o.D.me&&!S.favP.has(o.D.id);
  const md=$('#modal');md.hidden=false;
  md.innerHTML=`<div class="mc" role="dialog" aria-label="Llegaste"><div class="okc">${ic('chk')}</div><h3>¡Llegaste!</h3><p>${esc(o.D.n)}</p><div class="mstats"><div><b>${M.mins(o.total)} min</b><small>Duración</small></div><div><b>${M.km(o.dist)}</b><small>Distancia</small></div><div><b>$${o.price}</b><small>${o.k==='bus'?(o.stu?'Estudiante':'Pasaje'):'Tarifa'}</small></div></div><div class="mbtns">${canFav?`<button class="btn sec" type="button" data-act="arr-fav" data-id="${o.D.id}">${ic('star')}Guardar en favoritos</button>`:''}<button class="btn pri" type="button" data-act="arr-ok">Listo</button></div></div>`;
  speak(`Llegaste a ${o.D.n}.`);
 }else{S.tripPos=null;notify('in','Viaje terminado','Puedes planear otro desde Rutas.')}
 app.classList.remove('trip');V.clearOver();hideSheet();idle();
 if(!arrived)V.flyTo(S.me.x,S.me.y,1);
}

/* ---------------- delays ---------------- */
const REASONS={'08':['Tráfico pesado en Av. Madero','Obra en Periférico Norte'],'21':['Choque en Av. Camelinas','Tráfico en Av. Morelos Sur'],'14':['Tráfico cerca de Ciudad Universitaria','Obra en Av. Siervo de la Nación'],'33':['Tráfico en Av. Solidaridad','Choque en Periférico Sur']};
function relevant(r){
 if(S.favR.has(r.id)||S.bells.has(r.id))return true;
 if(S.trip&&S.trip.o.r===r)return true;if(S.preview&&S.preview.r===r)return true;
 const st=r.stops[M.nearestStop(r,S.me)];return M.man(st,S.me)/M.SPD.walk<=600;
}
function makeDelay(force){
 const free=M.ROUTES.filter(r=>!r.inc);
 if(!free.length){if(force)notify('in','Ya hay retrasos activos','Espera a que termine alguno y vuelve a intentar.');return}
 let r;
 if(force){const T=S.trip;const pref=[T&&T.o.k==='bus'&&!T.o.r.inc?T.o.r:null,...free.filter(x=>S.favR.has(x.id)),...free.filter(relevant),...free].filter(Boolean);r=pref[0]}
 else{const pool=free.filter(relevant);const src=pool.length&&Math.random()<.75?pool:free;r=src[Math.floor(Math.random()*src.length)]}
 const rs=REASONS[r.id]||['Tráfico'];const reason=rs[Math.floor(Math.random()*rs.length)];const min=4+Math.floor(Math.random()*5);
 M.incident(r,reason,min);onDelay(r);
}
function onDelay(r){
 const si=M.nearestStop(r,S.me),st=r.stops[si],a=M.arrivals(r,si)[0];
 const title=`Retraso en la ${r.n}`,text=`${r.inc.reason}. Llega ${r.inc.min} min tarde a ${st.n}: ahora en ${M.etaTxt(a.t)}.`;
 log('wa',title,text);
 const T=S.trip;
 if(T&&T.o.k==='bus'&&T.o.r===r){const wi=T.segs.findIndex(s=>s.kind==='wait');if(wi>=T.i){const w=T.segs[wi];w.sec+=r.inc.min*60;w.ms+=3500;T.totalSec+=r.inc.min*60;T.o.total+=r.inc.min*60;T.late=r.inc.min}
  notify('wa','Tu camión viene con retraso',`${r.inc.reason}. Llega ${r.inc.min} min más tarde.`);done('delay')}
 else if(S.dAlerts&&relevant(r)){notify('wa',title,text);done('delay')}
 r._had=true;refreshLive();
}
function refreshLive(){
 if(S.tab==='list'&&!stack.length)renderList();
 if(S.tab==='fav')renderFav();
 if(S.tab==='plan'&&S.plan.d&&!stack.length)renderPlan();
 if(det)updDetails();
 if(sheetMode==='veh'&&S.sel){const v=vehById(S.sel);if(v)showSheet(vSheet(v),'veh')}
}

/* ---------------- favorites ---------------- */
function renderFav(){
 const places=[...S.favP].map(placeById).filter(Boolean);
 const routes=[...S.favR].map(routeById).filter(Boolean);
 $('#flist').innerHTML=`<div class="sect">Lugares</div><div class="rows">${places.map(p=>`<div class="row"><span class="ri">${ic(placeIcon(p))}</span><span class="rt"><b>${p.n}</b><small>${p.s} · ${M.km(M.man(S.me,p))}</small></span><button class="btn sec" type="button" data-act="go-place" data-id="${p.id}" style="height:36px;font-size:13.5px;padding:0 14px">Ir</button><button class="xbtn" type="button" data-act="rm-place" data-id="${p.id}" aria-label="Quitar ${p.n}">${ic('x')}</button></div>`).join('')}<button class="row" type="button" data-act="add-place"><span class="ri mute">${ic('pin')}</span><span class="rt"><b>Agregar lugar</b><small>Guarda los lugares a los que vas seguido</small></span>${ic('chv','chev')}</button></div>
 <div class="sect">Rutas favoritas</div>${routes.length?`<div class="rows">${routes.map(r=>{const si=M.nearestStop(r,S.me);return `<button class="row" type="button" data-act="open" data-id="r${r.id}"><span class="ri" style="background:${r.c};color:#fff">${ic('bus')}</span><span class="rt"><b>${r.n}</b>${r.inc?`<small style="color:#C2410C;font-weight:700">Retraso +${r.inc.min} min</small>`:`<small>${r.from} – ${r.to}</small>`}</span><span class="rv" data-fr="${r.id}">${M.etaTxt(M.arrivals(r,si)[0].t)}</span>${ic('chv','chev')}</button>`}).join('')}</div>`:`<div class="empty" style="padding:18px 10px">Toca la estrella en los detalles de una ruta para guardarla aquí.</div>`}
 <div class="sect">Últimos viajes</div>${S.hist.length?`<div class="rows">${S.hist.slice(-3).reverse().map(histRow).join('')}</div>`:`<div class="empty" style="padding:18px 10px">Aún no haces viajes. Planea uno en Rutas.</div>`}`;
}
function updFav(){$$('[data-fr]').forEach(e=>{const r=routeById(e.dataset.fr);e.textContent=M.etaTxt(M.arrivals(r,M.nearestStop(r,S.me))[0].t)})}
function histRow(h){return `<div class="row"><span class="ri" style="${h.k==='bus'?'':h.k==='taxi'?'background:#FFF4CC;color:#7C5D00':'background:#DCF7E7;color:#15803D'}">${ic(ICON[h.k])}</span><span class="rt"><b>${esc(h.n)}</b><small>${esc(h.via)} · ${h.min} min · ${h.km}</small></span><span class="rv" style="color:var(--t3);font-weight:600">${hhmm(h.at)}</span></div>`}
function syncTagLabels(){$$('#map [data-pid]').forEach(g=>{g.style.display=S.favP.has(g.dataset.pid)?'':'none'})}
function saveFavP(){store.set('favP',[...S.favP]);syncTagLabels()}

/* ---------------- who / easy ---------------- */
function setWho(w){
 const was=S.who;S.who=w;store.set('who',w);
 const keep=w==='work'?'trabajo':'tec',drop=w==='work'?'tec':'trabajo';
 if(was&&was!==w)S.favP.delete(drop);S.favP.add(keep);saveFavP();
 if(S.tab==='prof')renderProf();if(S.tab==='list')renderList();if(S.tab==='plan')renderPlan();if(S.tab==='fav')renderFav();
 if(sheetMode==='easy')idle();
}
function setEasy(on){
 S.easy=on;store.set('easy',on);app.classList.toggle('easy',on);V.setScale(on?1.3:1);
 if(on){done('easy');idle()}else if(sheetMode==='easy')hideSheet();
 requestAnimationFrame(()=>syncSheet());
}

/* ---------------- profile ---------------- */
const tog=(act,on,icn,b,s)=>`<button class="row" type="button" data-act="${act}" role="switch" aria-checked="${on}"><span class="ri">${ic(icn)}</span><span class="rt"><b>${b}</b><small>${s}</small></span><span class="tog${on?' on':''}"></span></button>`;
function renderProf(){
 const kmTot=S.hist.reduce((a,h)=>a+(parseFloat(h.km)*(h.km.includes(' m')&&!h.km.includes('km')?.001:1)||0),0);
 $('#prof').innerHTML=`<div class="pcardx"><div class="av">${ic(stu()?'school':'work')}</div><div><b>Usuario de prueba</b><small>${stu()?'Estudiante':'Trabajador'} · Morelia, Michoacán</small></div></div>
 <div class="sect">Uso la app para</div><div class="segc" role="radiogroup"><button type="button" role="radio" aria-checked="${stu()}" class="${stu()?'on':''}" data-act="who" data-w="student">${ic('school')}Ir a la escuela</button><button type="button" role="radio" aria-checked="${!stu()}" class="${!stu()?'on':''}" data-act="who" data-w="work">${ic('work')}Ir al trabajo</button></div>
 <div class="stats"><div><b>${S.trips}</b><small>Viajes</small></div><div><b>${kmTot.toFixed(1)}</b><small>km recorridos</small></div><div><b>${S.favR.size+S.favP.size}</b><small>Favoritos</small></div></div>
 <div class="sect">Ajustes</div><div class="rows">
 ${tog('tog-easy',S.easy,'txt','Modo fácil','Letra grande y botones sencillos. Ideal para personas mayores')}
 ${S.easy&&canSpeak?tog('tog-voice',S.voice,'spk','Leer en voz alta','La app te dice las instrucciones del viaje'):''}
 ${tog('tog-alerts',S.alerts,'bell','Avisos de llegada','Te avisamos cuando tu camión esté por llegar')}
 ${tog('tog-dalerts',S.dAlerts,'warn','Avisos de retraso','Te avisamos si tu camión viene tarde')}
 <div class="row col"><span class="ri">${ic('clk')}</span><span class="rt"><b>Hora de entrada</b><small>${stu()?'A la escuela':'Al trabajo'} · te decimos a qué hora salir</small><span class="hrs">${['07:00','08:00','09:00','10:00'].map(h=>`<button type="button" class="chip${entryTime()===h?' on':''}" data-act="entry" data-h="${h}">${fmtH(h)}</button>`).join('')}</span></span></div>
 <button class="row" type="button" data-act="hist"><span class="ri">${ic('hist')}</span><span class="rt"><b>Historial de viajes</b><small>${S.hist.length} ${plural(S.hist.length,'viaje','viajes')}</small></span>${ic('chv','chev')}</button></div>
 <div class="sect">Próximamente</div><div class="rows">${[['card','Pagar con QR o tarjeta','Paga tu pasaje desde la app'],['chat','Reportes de la comunidad','Avisa a otros de tráfico y retrasos']].map(([i,b,s])=>`<button class="row dis" type="button" data-act="soon" data-n="${b}"><span class="ri mute">${ic(i)}</span><span class="rt"><b>${b}</b><small>${s}</small></span><span class="soon">Pronto</span></button>`).join('')}</div>
 <div class="sect">Demo</div><div class="rows"><button class="row" type="button" data-act="tutorial"><span class="ri">${ic('help')}</span><span class="rt"><b>Ver tutorial</b><small>Cómo usar la app, paso a paso</small></span>${ic('chv','chev')}</button><button class="row" type="button" data-act="sim-delay"><span class="ri" style="background:#FFEDD5;color:#C2410C">${ic('warn')}</span><span class="rt"><b>Simular retraso</b><small>Para mostrar cómo llega un aviso</small></span>${ic('chv','chev')}</button><button class="row" type="button" data-act="guide"><span class="ri">${ic('chk')}</span><span class="rt"><b>Lista de pruebas</b><small>${GUIDE.filter(g=>S.guide[g.k]).length} de ${GUIDE.length} pasos</small></span>${ic('chv','chev')}</button><button class="row" type="button" data-act="about"><span class="ri">${ic('info')}</span><span class="rt"><b>Acerca del proyecto</b><small>Equipo y créditos</small></span>${ic('chv','chev')}</button><button class="row" type="button" data-act="reset"><span class="ri mute">${ic('hist')}</span><span class="rt"><b>Reiniciar demo</b><small>Borra viajes, favoritos y progreso</small></span></button></div>`;
}

/* ---------------- tutorial ---------------- */
let onbI=0;
const art={
 hello:()=>`<div><span class="tile big">${ic('mm')}</span><span class="tile bu fl1">${ic('bus')}</span><span class="tile tx fl2">${ic('tax')}</span><span class="tile cr fl3">${ic('car')}</span></div>`,
 map:()=>`<div class="a-map"><i class="grid"></i><span class="tile bu fl1">${ic('bus')}</span><span class="tile tx fl2">${ic('tax')}</span><span class="tile cr" style="right:22%;top:52%">${ic('car')}</span><span class="medot"></span><div class="mini"><span class="tile bu">${ic('bus')}</span><div><b>Camión Ruta 08</b><small>Espacio: 26/40</small></div><strong>3 min</strong></div></div>`,
 search:()=>`<div class="a-col"><div class="sb">${ic('sch')}<span>${stu()?'Tecmilenio':'Trabajo'}</span><i></i></div><div class="mini"><span class="tile wk">${ic('wlk')}</span><div><b>Camina a la parada</b><small>3 min</small></div></div><div class="mini"><span class="tile bu">${ic('bus')}</span><div><b>Toma la Ruta 33</b><small>Baja en ${stu()?'Tecmilenio':'Plaza Las Américas'}</small></div></div></div>`,
 cmp:()=>`<div class="a-col"><div class="mini"><span class="tile bu">${ic('bus')}</span><div><b>Camión Ruta 33</b><small>24 min · ${stu()?'$6 estudiante':'$11'}</small></div><strong>Elegir</strong></div><div class="mini"><span class="tile tx">${ic('tax')}</span><div><b>Taxi 214</b><small>11 min · $64</small></div><strong>Elegir</strong></div><div class="mini"><span class="tile cr">${ic('car')}</span><div><b>Auto de plataforma</b><small>15 min · $58</small></div><strong>Elegir</strong></div></div>`,
 alert:()=>`<div class="a-col"><div class="mini"><span class="tile wa">${ic('warn')}</span><div><b>Retraso en la Ruta 08</b><small>Tráfico en Av. Madero · +6 min</small></div></div><div class="mini"><span class="tile bu">${ic('bus')}</span><div><b>La Ruta 33 está llegando</b><small>Llega en 1 min a tu parada</small></div></div></div>`,
 easy:()=>`<div class="a-easy"><span class="aa">Aa<small>+</small></span><span class="ebtn"><span class="tile bu">${ic(stu()?'school':'work')}</span><span><b>${stu()?'A la escuela':'Al trabajo'}</b></span></span></div>`
};
function onbSteps(){return [
 {k:'who'},
 {a:'map',h:'Mira todo en el mapa',p:'Ve en tiempo real dónde van los camiones, taxis y autos. Toca uno para saber cuándo llega y si hay lugar.'},
 {a:'search',h:'Dinos a dónde vas',p:`Escribe tu destino, como ${stu()?'tu escuela':'tu trabajo'}, y te decimos cómo llegar paso a paso.`},
 {a:'cmp',h:'Compara y elige',p:'Camión, taxi o auto: ves cuánto tardas, cuánto cuesta y a qué hora llegas.'+(stu()?' Con tu credencial pagas pasaje de estudiante.':' También te decimos a qué hora salir para llegar a tiempo.')},
 {a:'alert',h:'Te avisamos',p:'Si tu camión viene con retraso o ya está por llegar, te llega un aviso al momento.'},
 {k:'easy'}
]}
function openTutorial(){closeDrawer();closePages();let o=$('#onb');if(!o){o=document.createElement('div');o.id='onb';o.className='onb';o.setAttribute('role','dialog');o.setAttribute('aria-label','Tutorial');app.appendChild(o)}onbI=0;renderOnb()}
function renderOnb(){
 const o=$('#onb');if(!o)return;const steps=onbSteps(),s=steps[onbI],n=steps.length;
 const dots=`<div class="dots">${steps.map((_,i)=>`<i class="${i===onbI?'on':''}"></i>`).join('')}</div>`;
 const top=`<div class="top"><small>${onbI+1} de ${n}</small>${onbI<n-1?`<button class="skip" type="button" data-act="onb-skip">Saltar</button>`:''}</div>`;
 let body;
 if(s.k==='who')body=`<div class="art sm">${art.hello()}</div><h2>¡Hola! ¿Para qué vas a usar MoveMorelia?</h2><p>Así te mostramos lo que más te sirve.</p><div class="who"><button class="whob${S.who==='student'?' on':''}" type="button" data-act="onb-who" data-w="student"><span class="tile bu">${ic('school')}</span><span><b>Soy estudiante</b><small>Voy a la escuela o a la universidad</small></span></button><button class="whob${S.who==='work'?' on':''}" type="button" data-act="onb-who" data-w="work"><span class="tile cr">${ic('work')}</span><span><b>Soy trabajador</b><small>Voy al trabajo todos los días</small></span></button></div>${dots}`;
 else if(s.k==='easy')body=`<div class="art">${art.easy()}</div><h2>¿Quieres el modo fácil?</h2><p>Letras más grandes, botones sencillos y la app te lee las instrucciones. Ideal para personas mayores. Lo puedes cambiar después en Perfil.</p>${dots}<div class="obtns"><button class="btn pri" type="button" data-act="onb-easy" data-v="1">Sí, activar modo fácil</button><button class="btn ghost" type="button" data-act="onb-easy" data-v="0">No, gracias</button></div>`;
 else body=`<div class="art">${art[s.a]()}</div><h2>${s.h}</h2><p>${s.p}</p>${dots}<div class="obtns"><button class="btn pri" type="button" data-act="onb-next">Siguiente</button></div>`;
 o.innerHTML=top+`<div class="step">${body}</div>`;
}
function closeOnb(){
 const o=$('#onb');if(o){o.classList.add('out');setTimeout(()=>o.remove(),320)}
 if(!S.who)setWho('student');
 S.onb=true;store.set('onb',true);tab('map');
 if(S.easy)idle();else setTimeout(showCoach,450);
}
function showCoach(){
 if($('.coach')||S.tab!=='map')return;
 const c=document.createElement('div');c.className='coach';c.innerHTML=`<b>Empieza aquí</b><span>Toca para buscar a dónde vas.</span>`;
 $('#v-map').appendChild(c);const ms=$('.msearch');ms.classList.add('glow');
 const off=()=>{c.remove();ms.classList.remove('glow');document.removeEventListener('pointerdown',off,true)};
 setTimeout(()=>document.addEventListener('pointerdown',off,true),300);setTimeout(off,9000);
}

/* ---------------- drawer & info pages ---------------- */
function openDrawer(){
 const d=$('#drawer');d.hidden=false;
 d.innerHTML=`<div class="scrim" data-act="dr-close"></div><div class="dp" role="dialog" aria-label="Menú"><div class="dbrand"><span class="tile">${ic('mm')}</span><div><b>MoveMorelia</b><small>Para estudiantes y trabajadores</small></div></div><div class="rows">${[['map','pin','Mapa'],['list','lst','Cerca de ti'],['plan','rt','Planear un viaje'],['fav','star','Favoritos']].map(([t,i,n])=>`<button class="row" type="button" data-act="dr-tab" data-t="${t}"><span class="ri">${ic(i)}</span><span class="rt"><b>${n}</b></span></button>`).join('')}</div><div class="sect">Más</div><div class="rows"><button class="row" type="button" data-act="inbox"><span class="ri">${ic('bell')}</span><span class="rt"><b>Avisos</b>${S.unread?`<small>${S.unread} sin leer</small>`:''}</span></button><button class="row" type="button" data-act="hist"><span class="ri">${ic('hist')}</span><span class="rt"><b>Historial de viajes</b></span></button><button class="row" type="button" data-act="tutorial"><span class="ri">${ic('help')}</span><span class="rt"><b>Ver tutorial</b></span></button><button class="row" type="button" data-act="about"><span class="ri">${ic('info')}</span><span class="rt"><b>Acerca del proyecto</b></span></button></div><p class="dfoot">Proyecto escolar · Tecmilenio Campus Morelia. Datos simulados con fines de demostración.</p></div>`;
 requestAnimationFrame(()=>requestAnimationFrame(()=>d.classList.add('in')));
}
function closeDrawer(){const d=$('#drawer');if(d.hidden)return;d.classList.remove('in');setTimeout(()=>{d.hidden=true},320)}
function openHist(){closeDrawer();openPage(phd('Historial de viajes')+`<div class="pbody">${S.hist.length?`<div class="rows">${S.hist.slice().reverse().map(histRow).join('')}</div>`:`<div class="empty"><b>Aún no haces viajes</b>Planea uno en Rutas y aparecerá aquí.</div>`}</div>`)}
function openGuide(){closeDrawer();openPage(phd('Lista de pruebas')+`<div class="pbody"><p style="margin:2px 2px 14px;color:var(--t3);font-size:14.5px;line-height:1.5">Sigue estos pasos para ver todo lo que hace la app. Se marcan solos cuando los haces.</p><div id="gpage">${guideRows()}</div></div>`)}
function openAbout(){closeDrawer();openPage(phd('Acerca del proyecto')+`<div class="pbody"><div class="pcardx" style="margin-top:0"><div class="av">${ic('mm')}</div><div><b>MoveMorelia</b><small>Uber, pero para el transporte público</small></div></div><p style="font-size:14.5px;line-height:1.55;color:var(--t2);margin:16px 2px">Una app para ver en tiempo real los camiones, taxis y autos de Morelia, saber cuándo llegan y cuánto espacio tienen, y planear tu viaje.</p><div class="sect">¿Para quién es?</div><div class="rows"><div class="row"><span class="ri">${ic('school')}</span><span class="rt"><b>Estudiantes</b><small style="white-space:normal">Que van a la escuela en camión. Ven su pasaje de estudiante y a qué hora salir.</small></span></div><div class="row"><span class="ri">${ic('work')}</span><span class="rt"><b>Trabajadores</b><small style="white-space:normal">Que necesitan llegar a tiempo todos los días y saber si su camión viene tarde.</small></span></div><div class="row"><span class="ri">${ic('txt')}</span><span class="rt"><b>Personas mayores</b><small style="white-space:normal">Con el modo fácil: letra grande, botones sencillos e instrucciones en voz alta.</small></span></div></div><div class="sect">Equipo</div><div class="rows">${[['Adrián','Apertura e identidad','#5AA9FF'],['María','Mapa interactivo','#7FDBFF'],['Tyson','Lista de transportes','#FFC93C'],['Victoria','Detalles del vehículo','#45E08E'],['Santiago','Planificador de rutas','#AE9FFF']].map(([n,p,c])=>`<div class="row"><span class="ri" style="background:${c};color:#0A0D14;font-weight:800">${n[0]}</span><span class="rt"><b>${n}</b><small>${p}</small></span></div>`).join('')}</div><p style="font-size:13px;color:var(--t3);line-height:1.5;margin:16px 2px">Proyecto escolar de Tecmilenio Campus Morelia. Las rutas, horarios, tarifas, retrasos y conductores son datos de ejemplo.</p></div>`)}
function resetDemo(){
 if(S.trip)finishTrip(false);closePreview();deselect();closePages();closeDrawer();$('#modal').hidden=true;
 store.clear();
 Object.assign(S,{me:{...M.ME0},mapF:'all',listF:'all',listQ:'',plan:{o:null,d:null,mode:'all',opts:[]},favR:new Set(['08']),favP:new Set(['casa','tec']),hist:[],bells:new Set(),fired:{},alerts:true,guide:{},trips:0,tripPos:null,who:null,easy:false,voice:true,dAlerts:true,entry:null,onb:false,inbox:[],unread:0});
 M.resetSim();V.setFilter('all');setEasy(false);hideSheet();updDots();syncTagLabels();$('#lq').value='';renderChips();renderGuide();tab('map');V.flyTo(S.me.x-70,S.me.y+40,.8,700);
 nextDelay=performance.now()+45000;
 openTutorial();
}

/* ---------------- actions ---------------- */
function act(a,el){
 const id=el.dataset.id;
 switch(a){
  case 'menu':openDrawer();break;
  case 'inbox':openInbox();break;
  case 'dr-close':closeDrawer();break;
  case 'dr-tab':tab(el.dataset.t);break;
  case 'back':closeTop();break;
  case 'search-map':openSearch('dest',p=>{done('search');goNow(p)});break;
  case 'go-now':{const p=placeById(id);if(p)goNow(p);break}
  case 'locate':if(S.trip){V.follow(()=>S.tripPos,null,{t:110,b:syncSheet()});el.classList.add('on')}else V.flyTo(S.me.x,S.me.y+syncSheet()/2/1.05,1.05);break;
  case 'chip':{const w=el.dataset.w,k=el.dataset.k;if(w==='map'){S.mapF=k;V.setFilter(k);if(S.sel){const v=vehById(S.sel);if(k!=='all'&&v.type!==k)deselect()}}else{S.listF=k;if(k!=='all')done('filter');renderList()}renderChips();break}
  case 'open':openDetails(id);break;
  case 'bell':{const r=routeById(id);const on=!S.bells.has(id);on?S.bells.add(id):S.bells.delete(id);
   if(on){const st=r.stops[M.nearestStop(r,S.me)];notify('bu',S.alerts?'Aviso activado':'Activa los avisos en Perfil',S.alerts?`Te avisamos cuando la ${r.n} esté por llegar a ${st.n}.`:'Los avisos de llegada están apagados.')}
   $$(`[data-act="bell"][data-id="${id}"]`).forEach(b=>{if(b.classList.contains('ib')){b.classList.toggle('on',on);b.innerHTML=ic(on?'bell':'bello')}else b.innerHTML=ic(on?'bell':'bello')+(b.closest('.sheet')?(on?'Aviso activo':'Avisarme'):(on?'Te avisaremos cuando llegue':'Avisarme cuando llegue'))});break}
  case 'fav-route':{const on=!S.favR.has(id);on?S.favR.add(id):S.favR.delete(id);store.set('favR',[...S.favR]);el.classList.toggle('on',on);el.innerHTML=ic(on?'star':'staro');notify(on?'bu':'in',on?'Guardada en favoritos':'Quitada de favoritos',`Ruta ${id}`);break}
  case 'd-map':{const r=routeById(id);const b=M.arrivals(r,M.nearestStop(r,S.me))[0].b;closePages();tab('map');setTimeout(()=>selectVehicle(b.id,true),80);break}
  case 'd-mapv':closePages();tab('map');setTimeout(()=>selectVehicle(id,true),80);break;
  case 'request':{const v=carById(id);const go=D=>{setDest(D);const o=M.options(S.plan.o||meP(),D,{type:v.type,v})[0];if(!o){notify('in','Ya estás ahí','Elige otro destino.');return}preview(o)};
   openSearch('dest',p=>{done('search');go(p)});break}
  case 'sh-close':deselect();break;
  case 'pv-close':closePreview();break;
  case 'pv-more':{const D=S.preview.D;setDest(D);closePreview();tab('plan');break}
  case 'pv-start':startTrip();break;
  case 'trip-end':finishTrip(false);break;
  case 'arr-ok':$('#modal').hidden=true;V.flyTo(S.me.x,S.me.y+60,1,800);break;
  case 'arr-fav':S.favP.add(id);saveFavP();el.outerHTML=`<button class="btn ok" type="button" disabled>${ic('chk')}Guardado en favoritos</button>`;break;
  case 'pick':pickPlace(id);break;
  case 'pick-origin':openSearch('origin',p=>{S.plan.o=p.me?null:p;renderPlan()});break;
  case 'pick-dest':openSearch('dest',p=>{done('search');setDest(p);renderPlan()});break;
  case 'swap':{const o=S.plan.o,D=S.plan.d;if(!D){openSearch('dest',p=>{setDest(p);renderPlan()});break}
   S.plan.o=D.me?null:D;S.plan.d=o||meP();$('.swp').classList.toggle('spin');renderPlan();break}
  case 'mode':S.plan.mode=el.dataset.k;renderPlan();break;
  case 'select':{const o=S.plan.opts[+el.dataset.i];if(!o)break;el.classList.add('done');done('plan');setTimeout(()=>preview(o),550);break}
  case 'go-place':{const p=placeById(id);setDest(p);S.plan.o=null;tab('plan');break}
  case 'rm-place':S.favP.delete(id);saveFavP();renderFav();break;
  case 'add-place':openSearch('fav',p=>{if(!p.me){S.favP.add(p.id);saveFavP();notify('ok','Lugar guardado',p.n)}renderFav()});break;
  case 'tog-alerts':S.alerts=!S.alerts;store.set('alerts',S.alerts);renderProf();break;
  case 'tog-dalerts':S.dAlerts=!S.dAlerts;store.set('dAlerts',S.dAlerts);renderProf();break;
  case 'tog-easy':setEasy(!S.easy);renderProf();if(S.easy)notify('ok','Modo fácil activado','Letra más grande y botones sencillos en el mapa.');break;
  case 'tog-voice':S.voice=!S.voice;store.set('voice',S.voice);renderProf();break;
  case 'who':setWho(el.dataset.w);break;
  case 'entry':S.entry=el.dataset.h;store.set('entry',S.entry);renderProf();break;
  case 'sim-delay':makeDelay(true);break;
  case 'tutorial':openTutorial();break;
  case 'onb-who':setWho(el.dataset.w);onbI=1;renderOnb();break;
  case 'onb-next':onbI=Math.min(onbI+1,onbSteps().length-1);renderOnb();break;
  case 'onb-skip':closeOnb();break;
  case 'onb-easy':setEasy(el.dataset.v==='1');closeOnb();break;
  case 'hist':openHist();break;
  case 'guide':openGuide();break;
  case 'about':openAbout();break;
  case 'reset':resetDemo();break;
  case 'soon':notify('in',el.dataset.n,'Esta función llegará en una próxima versión.');break;
  case 'guide-go':{const g=GUIDE[+el.dataset.i];const o=$('#onb');if(o)closeOnb();closePages();closeDrawer();g.go();break}
 }
}
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-act],[data-tab]');if(!t||t.disabled)return;
 if(t.dataset.tab){if(!S.trip)tab(t.dataset.tab);return}
 act(t.dataset.act,t);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#onb'))closeOnb();else if(!$('#drawer').hidden)closeDrawer();else if(stack.length)closeTop();else if(S.preview)closePreview();else if(sheetMode==='veh')deselect()}});
$('#lq').addEventListener('input',e=>{S.listQ=e.target.value;renderList()});

/* ---------------- map wiring ---------------- */
V.init($('#map'));
V.onTap=id=>{if(S.trip||S.preview)return;if(id)selectVehicle(id,false);else if(S.sel)deselect()};
V.onDrag=()=>{$('.fab').classList.remove('on')};
V.flyTo(S.me.x-70,S.me.y+40,.8,0);

/* ---------------- device fit ---------------- */
const mq=matchMedia('(max-width:560px)');
function fitDevice(){
 const dw=$('#devwrap'),dev=$('#device');
 if(mq.matches){dw.style.width='';dw.style.height='';dev.style.transform='';}
 else{const s=Math.min(1,(innerHeight-48)/872,(Math.max(320,$('#stagebox').clientWidth||innerWidth)-8)/418);dw.style.width=418*s+'px';dw.style.height=872*s+'px';dev.style.transform=`scale(${s})`}
 V.size();syncSheet();
}
addEventListener('resize',fitDevice);mq.addEventListener&&mq.addEventListener('change',fitDevice);

/* ---------------- loops ---------------- */
let last=performance.now(),nextDelay=performance.now()+45000;
function loop(now){
 const dt=Math.min(.1,Math.max(0,(now-last)/1000));last=now;
 M.step(dt*M.SCALE);
 if(S.trip)tripFrame(now);
 if(S.tab==='map')V.frame();
 requestAnimationFrame(loop);
}
function tick(){
 if(S.tab==='list'&&!stack.length)updList();
 if(S.tab==='fav')updFav();
 updDetails();updSheet();
 if(S.alerts)for(const rid of S.bells){const r=routeById(rid),si=M.nearestStop(r,S.me),a=M.arrivals(r,si)[0];
  if(a.t<=75&&!S.fired[a.b.id]){S.fired[a.b.id]=1;const t=`La ${r.n} está llegando`,x=a.t<20?`Ya está en ${r.stops[si].n}.`:`Llega en 1 min a ${r.stops[si].n}.`;notify('bu',t,x);log('bu',t,x)}
  for(const b of r.buses)if(S.fired[b.id]&&M.busEta(b,si)>200)delete S.fired[b.id]}
 for(const r of M.ROUTES)if(r._had&&!r.inc){r._had=false;log('ok',`La ${r.n} ya va normal`,'El retraso terminó. Los tiempos volvieron a la normalidad.');refreshLive()}
 const now=performance.now();
 if(now>nextDelay&&!$('#onb')&&!document.hidden){nextDelay=now+60000+Math.random()*40000;makeDelay(false)}
}
function clockTick(){const d=new Date();$('#clock').textContent=`${d.getHours()%12||12}:${String(d.getMinutes()).padStart(2,'0')}`}

if(S.easy){app.classList.add('easy');V.setScale(1.3)}
renderChips();renderGuide();fitDevice();clockTick();syncTagLabels();updDots();
setInterval(tick,500);setInterval(clockTick,15000);
requestAnimationFrame(loop);
if(!S.onb)openTutorial();else idle();
setTimeout(()=>$('#splash').classList.add('out'),1300);
})();
