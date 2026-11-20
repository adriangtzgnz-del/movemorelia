/* Interactive SVG map: pan, pinch, wheel zoom, live vehicle markers, route and trip overlays. */
(function(){
'use strict';
const M=window.MM,NS='http://www.w3.org/2000/svg';
let svg,gLbl,gOver,gMarks,meG,tripG,W0=390,H0=600;
const cam={x:600,y:640,z:.85};
let tw=null,fol=null,lastZ=0,filter='all',sel=null,hidden=new Set(),ms=1;
const vmEls=new Map(),cs=[];
let onTap=()=>{},onDrag=()=>{};
const ZMIN=.42,ZMAX=2.6,BOUND={x0:-20,y0:-20,x1:1020,y1:1320};

const icon=t=>t==='bus'?'bus':t==='taxi'?'tax':'car';
function el(tag,attrs,html){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(html!=null)e.innerHTML=html;return e}

function base(){
 let s=`<rect x="-500" y="-500" width="2000" height="2300" class="m-bg"/>`;
 M.PARKS.forEach(p=>s+=`<rect class="m-park" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="14"/>`);
 s+=`<path class="m-river" d="M-80 935 C 160 880, 300 1010, 520 955 S 820 1015, 1080 945"/>`;
 let mp='';for(let x=40;x<=960;x+=60)mp+=`M${x} -60V1360`;for(let y=40;y<=1300;y+=60)mp+=`M-60 ${y}H1060`;
 s+=`<path class="m-min" d="${mp}"/>`;
 const md=M.STREETS.map(st=>'M'+st.pts.map(p=>p.join(' ')).join('L')).join('');
 s+=`<path class="m-cas" d="${md}"/><path class="m-main" d="${md}"/>`;
 s+=`<ellipse class="m-bldg" cx="905" cy="215" rx="36" ry="27"/><ellipse class="m-field" cx="905" cy="215" rx="22" ry="15"/>`;
 return s;
}
function cgroup(parent,x,y,inner,cls){const g=el('g',{class:'cs '+(cls||'')},inner);g._x=x;g._y=y;parent.appendChild(g);cs.push(g);return g}
function labels(){
 M.STREETS.forEach(st=>{
  const h=st.pts[0][1]===st.pts[1][1];
  (st.lx||st.ly).forEach(v=>{const x=h?v:st.pts[0][0],y=h?st.pts[0][1]:v;
   cgroup(gLbl,x,y,`<text class="m-st" text-anchor="middle" y="3.5" ${h?'':'transform="rotate(-90)"'}>${st.n}</text>`,'lst')})});
 M.PLACES.forEach(p=>{
  const a=p.a,tx=a==='r'?9:a==='l'?-9:0,ty=a==='t'?-10:a==='b'?17:4,anc=a==='r'?'start':a==='l'?'end':'middle';
  const dot=p.tag?`<circle r="7" class="m-sv"/><path d="M-3 0.5 0 -3 3 0.5V3.5H-3Z" fill="#fff"/>`:(a==='c'?'':`<circle r="3.6" class="m-dot"/>`);
  const lg=cgroup(gLbl,p.x,p.y,`${dot}<text class="m-pl${p.tag?' sv':''}" x="${p.tag&&a!=='c'?(tx>0?tx+5:tx-5):tx}" y="${ty}" text-anchor="${anc}">${p.n}</text>`,'lp p'+p.p);if(p.tag)lg.setAttribute('data-pid',p.id)});
}
function vMarker(v){
 const g=el('g',{class:'vm '+v.type,'data-vid':v.id});
 g.innerHTML=`<circle class="ring" r="22"/><rect class="hit" x="-23" y="-23" width="46" height="46" rx="12"/><rect class="bg" x="-14" y="-14" width="28" height="28" rx="8.5"/><svg x="-9.5" y="-9.5" width="19" height="19" viewBox="0 0 24 24"><use href="#${icon(v.type)}"/></svg>`+
  (v.type==='bus'?`<g class="lt" transform="translate(14 -14)"><circle r="8"/><text y="3.8" text-anchor="middle">!</text></g><g transform="translate(0 22)"><rect x="-13" y="-8" width="26" height="16" rx="8" fill="${v.r.c}" stroke="#fff" stroke-width="1.5"/><text class="m-rn" y="4" text-anchor="middle">${v.r.id}</text></g>`:'');
 return g;
}

function init(svgEl){
 svg=svgEl;
 svg.innerHTML=base();
 gLbl=el('g',{});gOver=el('g',{});gMarks=el('g',{});
 svg.append(gLbl,gOver,gMarks);
 labels();
 [...M.BUSES,...M.CARS].forEach(v=>{const g=vMarker(v);gMarks.appendChild(g);vmEls.set(v.id,{g,v})});
 tripG=el('g',{class:'vm trip',style:'display:none'});gMarks.appendChild(tripG);
 meG=el('g',{class:'me'},`<circle r="9" class="pulse"><animate attributeName="r" values="9;30" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values=".4;0" dur="2s" repeatCount="indefinite"/></circle><circle r="9" class="dot"/>`);
 gMarks.appendChild(meG);
 size();
 if(window.ResizeObserver)new ResizeObserver(size).observe(svg);
 pointers();
}
function size(){const w=svg.clientWidth,h=svg.clientHeight;if(w&&h){W0=w;H0=h;apply(true)}}
function clamp(){cam.z=Math.max(ZMIN,Math.min(ZMAX,cam.z));cam.x=Math.max(BOUND.x0,Math.min(BOUND.x1,cam.x));cam.y=Math.max(BOUND.y0,Math.min(BOUND.y1,cam.y))}
function apply(force){
 const w=W0/cam.z,h=H0/cam.z;
 svg.setAttribute('viewBox',`${(cam.x-w/2).toFixed(2)} ${(cam.y-h/2).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
 if(force||Math.abs(cam.z-lastZ)>1e-4){lastZ=cam.z;const k=(1/cam.z).toFixed(4);
  for(const g of cs)g.setAttribute('transform',`translate(${g._x} ${g._y}) scale(${k})`);
  svg.classList.toggle('z-far',cam.z<.62);svg.classList.toggle('z-near',cam.z>=1.15)}
}
function scr(){const r=svg.getBoundingClientRect();return{r,s:r.width/W0||1}}
function toWorld(cx,cy){const {r,s}=scr();const lx=(cx-r.left)/s,ly=(cy-r.top)/s;return{x:cam.x+(lx-W0/2)/cam.z,y:cam.y+(ly-H0/2)/cam.z,lx,ly}}
function zoomAt(cx,cy,f){const w=toWorld(cx,cy);cam.z*=f;clamp();cam.x=w.x-(w.lx-W0/2)/cam.z;cam.y=w.y-(w.ly-H0/2)/cam.z;clamp();apply()}

function pointers(){
 const P=new Map();let down=null,moved=false;
 svg.addEventListener('pointerdown',e=>{
  if(e.button>0)return;
  try{svg.setPointerCapture(e.pointerId)}catch(_){}
  P.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(P.size===1){down={x:e.clientX,y:e.clientY,t:performance.now(),tgt:e.target};moved=false}
 });
 svg.addEventListener('pointermove',e=>{
  if(!P.has(e.pointerId))return;
  const prev=P.get(e.pointerId),cur={x:e.clientX,y:e.clientY};
  if(P.size===1){
   if(down&&Math.hypot(cur.x-down.x,cur.y-down.y)>7)moved=true;
   if(moved){stopAuto();const s=scr().s;cam.x-=(cur.x-prev.x)/(cam.z*s);cam.y-=(cur.y-prev.y)/(cam.z*s);clamp();apply()}
  }else if(P.size===2){
   const ids=[...P.keys()],a=P.get(ids[0]),b=P.get(ids[1]);
   const a2=e.pointerId===ids[0]?cur:a,b2=e.pointerId===ids[1]?cur:b;
   const d1=Math.hypot(a.x-b.x,a.y-b.y),d2=Math.hypot(a2.x-b2.x,a2.y-b2.y);
   if(d1>10){stopAuto();moved=true;zoomAt((a2.x+b2.x)/2,(a2.y+b2.y)/2,d2/d1)}
  }
  P.set(e.pointerId,cur);
 });
 const end=e=>{
  if(!P.has(e.pointerId))return;
  if(P.size===1&&down&&!moved&&performance.now()-down.t<600&&e.type==='pointerup'){
   const g=down.tgt&&down.tgt.closest&&down.tgt.closest('[data-vid]');
   onTap(g?g.getAttribute('data-vid'):null);
  }
  P.delete(e.pointerId);if(!P.size)down=null;
 };
 svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
 svg.addEventListener('wheel',e=>{e.preventDefault();stopAuto();zoomAt(e.clientX,e.clientY,Math.exp(-e.deltaY*.0016))},{passive:false});
}
function stopAuto(){tw=null;if(fol){fol=null;onDrag()}}
function center(){return{x:cam.x,y:cam.y,z:cam.z}}

/* camera moves */
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function flyTo(x,y,z,ms=850){tw={a:{...cam},b:{x,y,z:Math.max(ZMIN,Math.min(ZMAX,z||cam.z))},t0:performance.now(),ms}}
function fit(pts,ins={},ms=900){
 if(!pts.length)return;
 const t=ins.t||70,b=ins.b||40,l=ins.l||40,r=ins.r||40;
 let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;pts.forEach(p=>{x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y)});
 const bw=Math.max(60,x1-x0),bh=Math.max(60,y1-y0),aw=Math.max(80,W0-l-r),ah=Math.max(80,H0-t-b);
 const z=Math.max(ZMIN,Math.min(1.6,Math.min(aw/bw,ah/bh)));
 const ux=l+aw/2,uy=t+ah/2;
 flyTo((x0+x1)/2-(ux-W0/2)/z,(y0+y1)/2-(uy-H0/2)/z,z,ms);
}
function follow(fn,z,ins){if(!fn){fol=null;return}fol={fn,ins:ins||{}};tw=null;if(z){const p=fn();if(p)flyTo(p.x,p.y+(((ins||{}).b||0)-((ins||{}).t||0))/2/z,z,700);fol.wait=performance.now()+720}}
function following(){return!!fol}

/* per-frame update */
function frame(){
 if(tw){const k=Math.min(1,(performance.now()-tw.t0)/Math.max(1,tw.ms)),e=ease(k);cam.x=tw.a.x+(tw.b.x-tw.a.x)*e;cam.y=tw.a.y+(tw.b.y-tw.a.y)*e;cam.z=tw.a.z+(tw.b.z-tw.a.z)*e;if(k>=1)tw=null;clamp();apply()}
 else if(fol&&!(fol.wait>performance.now())){const p=fol.fn();if(p){const off=((fol.ins.b||0)-(fol.ins.t||0))/2/cam.z;cam.x+=(p.x-cam.x)*.12;cam.y+=(p.y+off-cam.y)*.12;clamp();apply()}}
 const k=(ms/cam.z).toFixed(4);
 for(const {g,v} of vmEls.values()){
  const show=!hidden.has(v.id)&&(filter==='all'||filter===v.type);
  g.style.display=show?'':'none';if(!show)continue;
  if(v.type==='bus'){const late=v.jam>0;if(g._late!==late){g._late=late;g.classList.toggle('late',late)}}
  const p=M.pos(v);g.setAttribute('transform',`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${k})`);
 }
 const me=window.APPME&&window.APPME();meG.style.display=me?'':'none';if(me)meG.setAttribute('transform',`translate(${me.x.toFixed(1)} ${me.y.toFixed(1)}) scale(${k})`);
 if(tripG._p)tripG.setAttribute('transform',`translate(${tripG._p.x.toFixed(1)} ${tripG._p.y.toFixed(1)}) scale(${k})`);
}

/* selection & overlays */
function setFilter(f){filter=f}
function select(id){if(sel){const o=vmEls.get(sel);o&&o.g.classList.remove('sel')}sel=id;if(id){const o=vmEls.get(id);o&&o.g.classList.add('sel')}}
function hide(id,on){on?hidden.add(id):hidden.delete(id)}
function clearOver(){for(let i=cs.length-1;i>=0;i--)if(cs[i]._over){cs.splice(i,1)}gOver.innerHTML=''}
const pathD=pts=>'M'+pts.map(p=>p.x.toFixed(1)+' '+p.y.toFixed(1)).join('L');
function stopMarks(stops,hl){
 stops.forEach(s=>{const strong=hl&&hl.has(s.n);const named=strong&&!M.PLACES.some(p=>p.n===s.n&&Math.abs(p.x-s.x)+Math.abs(p.y-s.y)<90);const g=cgroup(gOver,s.x,s.y,`<circle r="${strong?7:5.5}" class="m-stop${strong?' hl':''}"/>${named?`<text class="m-sn" x="0" y="-12" text-anchor="middle">${s.n}</text>`:''}`,'stop');g._over=1});
}
function showRoute(r,hlNames){
 clearOver();if(!r)return;
 const pts=r.P.pts.map(([x,y])=>({x,y}));
 gOver.append(el('path',{class:'m-rcas',d:pathD(pts)}),el('path',{class:'m-rline',d:pathD(pts),stroke:r.c}));
 stopMarks(r.stops,new Set(hlNames||[]));
 apply(true);
}
function pin(x,y,cls){const g=cgroup(gOver,x,y,`<path class="m-pin ${cls||''}" d="M0 0C-6-10-14-15-14-25a14 14 0 1 1 28 0c0 10-8 15-14 25z"/><circle cy="-25" r="5.5" fill="#fff"/>`,'pinw');g._over=1;return g}
function showTrip(segs,D){
 clearOver();
 segs.forEach(s=>{
  if(s.kind==='walk')gOver.append(el('path',{class:'m-walk',d:pathD(s.pts)}));
  else if(s.kind==='ride')gOver.append(el('path',{class:'m-rcas',d:pathD(s.pts)}),el('path',{class:'m-rline',d:pathD(s.pts),stroke:s.color}));
 });
 segs.filter(s=>s.stops).forEach(s=>stopMarks(s.stops,new Set([s.stops[0].n,s.stops[s.stops.length-1].n])));
 if(D)pin(D.x,D.y);
 apply(true);
}
function tripVehicle(type,p,color,rid){
 if(!type){tripG.style.display='none';tripG._p=null;return}
 if(tripG._t!==type+rid){tripG._t=type+rid;tripG.setAttribute('class','vm trip '+type);
  tripG.innerHTML=`<rect class="bg" x="-15" y="-15" width="30" height="30" rx="9"/><svg x="-10" y="-10" width="20" height="20" viewBox="0 0 24 24"><use href="#${icon(type)}"/></svg>`+(type==='bus'?`<g transform="translate(0 23)"><rect x="-13" y="-8" width="26" height="16" rx="8" fill="${color}" stroke="#fff" stroke-width="1.5"/><text class="m-rn" y="4" text-anchor="middle">${rid}</text></g>`:'')}
 tripG.style.display='';tripG._p=p;
}
function setScale(f){ms=f}
function camState(){return{...cam,W:W0,H:H0}}

window.MapV={init,frame,flyTo,fit,follow,following,center,setScale,setFilter,select,hide,showRoute,showTrip,clearOver,tripVehicle,size,camState,
 set onTap(f){onTap=f},set onDrag(f){onDrag=f}};
})();
