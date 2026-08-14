/**
 * Node record modal. Same material as /nodos/<id>, without leaving the home
 * page. The plan gallery comes from nodes.json (real paths now, no base64).
 */
import { ACTION_DESC, asset, byId, cardLabel } from '../lib/data';
import { openWalk } from './walk';

const base=import.meta.env.BASE_URL;
const mBg=document.getElementById('modalBg')!;
export function openNode(id: string, view=0){
  const n=byId[id]; if(!n)return;
  const gallery=n.gallery;
  view=Math.min(view,gallery.length-1);
  const img=document.getElementById('mImg') as HTMLImageElement;
  const shot=gallery[view]!;
  img.src=asset(shot.src);
  img.width=shot.w; img.height=shot.h;
  document.getElementById('mBadge')!.style.display = view>0 ? 'block':'none';
  const tabs=document.getElementById('mTabs')!;
  tabs.innerHTML='';
  if(gallery.length>1){
    gallery.forEach((g,i)=>{
      const b=document.createElement('button');
      b.textContent=g.label; if(i===view)b.classList.add('on');
      b.onclick=e=>{e.stopPropagation();openNode(id,i)};
      tabs.appendChild(b);
    });
  }
  document.getElementById('mTitle')!.innerHTML=`${n.name} <span class="mtag" style="background:${n.color}22;color:${n.color};border:1px solid ${n.color}55">ÁREA ${n.area.toUpperCase()}</span>`;
  document.getElementById('mAddr')!.textContent='📍 '+n.address;
  document.getElementById('mEnv')!.textContent=n.enclosure;
  const ex=document.getElementById('mExtra')!;
  if(n.extra){ex.style.display='block';ex.textContent=n.extra}else ex.style.display='none';
  const pb=document.getElementById('mPobl')!;
  if(n.towns&&n.towns.length){
    pb.style.display='block';
    pb.innerHTML=`<div class="act-label">Poblaciones servidas por este nodo</div>
      <div class="town-chips">${n.towns.map(p=>`<span>${p}</span>`).join('')}</div>`+
      (n.townsNote?`<div class="town-note">${n.townsNote}</div>`:'')+
      (n.ponGroups?`<div class="act-label" style="margin-top:14px">\u00c1rboles PON compartidos (detalle t\u00e9cnico)</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px">${n.ponGroups.groups.map(gr=>
          `<div style="border:1.5px dashed #c9a44e;border-radius:12px;padding:8px 10px;display:flex;align-items:center;gap:6px;background:rgba(255,215,107,.05)">
            ${gr.map((p,i)=>`${i?'<span style=\\"color:#c9a44e\\">\u2500\u25c6\u2500</span>':''}<span style="background:var(--panel2);border:1px solid var(--line);border-radius:99px;padding:4px 11px;font-size:.76rem">${p}</span>`).join('')}
            <span style="color:#c9a44e;font-size:.64rem;font-family:'IBM Plex Mono',monospace;margin-left:4px">MISMA PON</span>
          </div>`).join('')}</div>
        <div class="town-note" style="border-left-color:#c9a44e">${n.ponGroups.note}</div>`:'');
  } else pb.style.display='none';
  const t=document.getElementById('mOlt')!;
  if(n.olts.length){
    let tot=0,rows=n.olts.map(o=>{tot+=o.onts;return `<tr><td class="mono">${o.code}</td><td>${o.vendor}</td><td class="mono" title="${o.note??''}">${cardLabel(o)}</td><td class="mono">${o.portsActive} / ${o.portsTotal}</td><td class="mono">${o.onts}</td></tr>`}).join('');
    t.style.display='table';
    t.innerHTML=`<tr><th>OLT</th><th>Equipo actual</th><th>Tarjetas</th><th>Puertos GPON act./tot.</th><th>ONT</th></tr>${rows}
      ${n.olts.length>1?`<tr class="total"><td colspan="4">Total del nodo</td><td class="mono">${tot}</td></tr>`:''}`;
  } else t.style.display='none';
  const mig=document.getElementById('mMig')!;
  if(n.id==='pao'){
    mig.innerHTML=`<div class="box"><b>Fase 1</b><span>semanas 1–12</span></div><div class="box"><b>Sin migración</b><span>de usuarios</span></div>`;
  } else {
    const dur=n.weekTo-n.weekFrom+1;
    mig.innerHTML=`<div class="box"><b>Semana ${n.weekFrom}</b><span>replanteo e inicio</span></div>
      <div class="box"><b>Semana ${n.weekTo}</b><span>fin de migración</span></div>
      <div class="box"><b>${dur} semanas</b><span>ventana total</span></div>
      <div class="box"><b>${n.olts.reduce((a,o)=>a+o.onts,0)} ONT</b><span>a migrar</span></div>`;
  }
  const wbtn=document.getElementById('mWalk')!;
  wbtn.style.display=n.gallery.length>1?'block':'none';
  wbtn.onclick=()=>{closeModal();openWalk(n.id)};
  document.getElementById('mActs')!.innerHTML=n.actions.map(a=>{
    const [cls,desc,href]=ACTION_DESC[a]!;
    return `<a class="${cls}" href="${href}" data-close title="${desc}">${a} · ${desc}</a>`;
  }).join('');
  /* permalink to the full record, in case someone wants to share it */
  const perma=document.getElementById('mPerma') as HTMLAnchorElement;
  perma.href=`${base}nodos/${n.id}`;
  mBg.classList.add('open');document.body.style.overflow='hidden';
}
export function closeModal(){mBg.classList.remove('open');document.body.style.overflow=''}
document.getElementById('mClose')!.onclick=closeModal;
mBg.addEventListener('click',e=>{
  if(e.target===mBg)closeModal();
  /* links to an action are anchors on this very page: close before jumping */
  if((e.target as HTMLElement).closest('[data-close]'))closeModal();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
