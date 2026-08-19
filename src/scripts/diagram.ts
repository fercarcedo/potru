/**
 * End-to-end schematic ONT → splitters → OLT → trunk → PAO, with the
 * GPON ↔ XGS-PON toggle and its downstream traffic pulses.
 *
 * Drawn on the client rather than at build time: it changes completely when the
 * mode is toggled and its pulses are <animateMotion>, so rebuilding it is both
 * simpler and closer to the legacy than shipping two static versions.
 */
import { DIAGRAM_INFO } from '../lib/data';
import { DOM } from '../lib/dom-ids';
import { svgEl, type SvgAttrs } from './svg';

export function initDiagram() {
  const ND=document.getElementById(DOM.netDiagram)!;
  const infoBox=document.getElementById(DOM.infoBox)!;
  let mode: 'gpon' | 'xgs' = 'gpon';
  const INFO = DIAGRAM_INFO;
  /** svgEl() bound to the diagram's own <svg> as the default parent. */
  function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: SvgAttrs, parent?: Element){
    return svgEl(tag, attrs, parent ?? ND);
  }
  function buildDiagram(){
  ND.innerHTML='';
  const c=mode==='gpon'?'#ffb454':'#41e3d2',passive='#5a6f8d',txt='#e8eef6',mut='#8da0b8',Y=210;
  [[120,300],[300,440],[440,610],[700,880],[880,1000]].forEach(([x1,x2])=>el('line',{x1,y1:Y,x2,y2:Y,stroke:c,'stroke-width':2,opacity:.85}));
  for(let i=0;i<4;i++){
    const p=el('circle',{r:4,fill:c});
    el('animateMotion',{dur:'5s',repeatCount:'indefinite',begin:(i*1.25)+'s',path:`M1000,${Y} L120,${Y}`},p);
    el('animate',{attributeName:'opacity',values:'0;1;1;0',dur:'5s',repeatCount:'indefinite',begin:(i*1.25)+'s'},p);
  }
  [[300,60],[300,120],[300,300],[300,360]].forEach(([x,y])=>{
    el('line',{x1:x,y1:Y,x2:170,y2:y,stroke:c,'stroke-width':1,opacity:.3});
    el('circle',{cx:162,cy:y,r:4,fill:'none',stroke:mut,'stroke-width':1,opacity:.5});
  });
  const gOnt=el('g',{class:'node-el','data-key':'ont'});
  el('rect',{x:70,y:Y-32,width:100,height:64,rx:8,fill:'#0e1a2e',stroke:c,'stroke-width':1.5},gOnt);
  el('text',{x:120,y:Y-4,fill:txt,'font-size':13,'text-anchor':'middle','font-weight':600},gOnt).textContent='ONT';
  el('text',{x:120,y:Y+16,fill:mut,'font-size':9,'text-anchor':'middle'},gOnt).textContent=mode==='gpon'?'6 modelos · 4 fabricantes':'GPON + XGS-PON';
  el('text',{x:120,y:Y+52,fill:mut,'font-size':10,'text-anchor':'middle'},gOnt).textContent='domicilio del usuario';
  const gS16=el('g',{class:'node-el','data-key':'split'});
  el('path',{d:`M285,${Y-26} L315,${Y} L285,${Y+26} Z`,fill:'#12233c',stroke:passive,'stroke-width':1.5},gS16);
  el('text',{x:300,y:Y+48,fill:mut,'font-size':10,'text-anchor':'middle'},gS16).textContent='splitter 1:16';
  const gS4=el('g',{class:'node-el','data-key':'split'});
  el('path',{d:`M425,${Y-20} L450,${Y} L425,${Y+20} Z`,fill:'#12233c',stroke:passive,'stroke-width':1.5},gS4);
  el('text',{x:437,y:Y+42,fill:mut,'font-size':10,'text-anchor':'middle'},gS4).textContent='splitter 1:4';
  el('text',{x:368,y:Y-38,fill:passive,'font-size':9,'text-anchor':'middle','letter-spacing':'.1em'}).textContent='RED PASIVA · 1×64';
  const gOlt=el('g',{class:'node-el','data-key':'olt'});
  el('rect',{x:610,y:Y-58,width:90,height:116,rx:8,fill:'#0e1a2e',stroke:c,'stroke-width':2},gOlt);
  for(let i=0;i<4;i++)el('rect',{x:622,y:Y-46+i*24,width:66,height:14,rx:3,fill:i<2?c:(mode==='xgs'?'#1d5c55':'#5a4526'),opacity:i<2?.85:.5},gOlt);
  el('text',{x:655,y:Y-70,fill:txt,'font-size':13,'text-anchor':'middle','font-weight':600},gOlt).textContent='NODO · OLT';
  el('text',{x:655,y:Y+80,fill:mut,'font-size':9.5,'text-anchor':'middle'},gOlt).textContent=mode==='gpon'?'Alcatel 7342 / Ericsson BLM':'OLT dual GPON/XGS-PON';
  el('text',{x:655,y:Y+95,fill:c,'font-size':9,'text-anchor':'middle'},gOlt).textContent=mode==='gpon'?'×20 nodos · enlaces 1 Gbps':'×20 nodos · ≥10 Gbps';
  const gT=el('g',{class:'node-el','data-key':'troncal'});
  el('rect',{x:760,y:Y-16,width:96,height:32,rx:16,fill:'#12233c',stroke:passive,'stroke-width':1.5},gT);
  el('text',{x:808,y:Y+4,fill:txt,'font-size':10.5,'text-anchor':'middle'},gT).textContent='TRONCAL';
  el('text',{x:808,y:Y+40,fill:mut,'font-size':9.5,'text-anchor':'middle'},gT).textContent=mode==='gpon'?'propia / alquilada + CWDM':'directos + CWDM / nuevos';
  const gP=el('g',{class:'node-el','data-key':'pao'});
  el('rect',{x:1000,y:Y-64,width:120,height:128,rx:8,fill:'#0e1a2e',stroke:c,'stroke-width':2},gP);
  el('text',{x:1060,y:Y-38,fill:txt,'font-size':13,'text-anchor':'middle','font-weight':600},gP).textContent='PAO GIJÓN';
  if(mode==='gpon'){
    el('rect',{x:1014,y:Y-20,width:92,height:26,rx:4,fill:'#5a4526'},gP);
    el('text',{x:1060,y:Y-3,fill:txt,'font-size':9,'text-anchor':'middle'},gP).textContent='7750SR-7 · 100%';
    el('text',{x:1060,y:Y+26,fill:mut,'font-size':9,'text-anchor':'middle'},gP).textContent='sin capacidad de';
    el('text',{x:1060,y:Y+38,fill:mut,'font-size':9,'text-anchor':'middle'},gP).textContent='ampliación';
  }else{
    el('rect',{x:1014,y:Y-24,width:92,height:22,rx:4,fill:'#5a4526',opacity:.55},gP);
    el('text',{x:1060,y:Y-9,fill:txt,'font-size':8.5,'text-anchor':'middle'},gP).textContent='7750 actual';
    el('rect',{x:1014,y:Y+2,width:92,height:22,rx:4,fill:'#1d5c55'},gP);
    el('text',{x:1060,y:Y+17,fill:'#9df0e6','font-size':8.5,'text-anchor':'middle'},gP).textContent='+ enrutador nuevo';
    el('text',{x:1060,y:Y+42,fill:c,'font-size':8.5,'text-anchor':'middle'},gP).textContent='+ enrutador en MIERES';
  }
  el('text',{x:1060,y:Y+82,fill:mut,'font-size':9.5,'text-anchor':'middle'},gP).textContent='jaulas de operadores';
  const gO=el('g',{class:'node-el','data-key':'oss'});
  el('rect',{x:610,y:40,width:250,height:44,rx:8,fill:'#0c1524',stroke:mode==='gpon'?passive:c,'stroke-width':1.2,'stroke-dasharray':mode==='gpon'?'4 3':'0'},gO);
  el('text',{x:735,y:58,fill:txt,'font-size':11,'text-anchor':'middle','font-weight':600},gO).textContent=mode==='gpon'?'OSS · 6 gestores + NetCool':'OSS · gestión integral única';
  el('text',{x:735,y:74,fill:mut,'font-size':9,'text-anchor':'middle'},gO).textContent=mode==='gpon'?'AMS · Entriview · SAM · TNM · GENView · Cimplicity':'nuevos gestores integrados con OSS de GIT (Fase 1)';
  el('line',{x1:655,y1:84,x2:655,y2:Y-58,stroke:mode==='gpon'?passive:c,'stroke-width':1,'stroke-dasharray':'3 4',opacity:.6});
  el('line',{x1:830,y1:84,x2:1050,y2:Y-64,stroke:mode==='gpon'?passive:c,'stroke-width':1,'stroke-dasharray':'3 4',opacity:.6});
  el('text',{x:560,y:Y+150,fill:mut,'font-size':10,'text-anchor':'middle','letter-spacing':'.18em'}).textContent=mode==='gpon'?'── RED EN PRODUCCIÓN DESDE 2004 ──':'── RED RENOVADA · MIGRACIÓN SIN CORTE HASTA CONFORMIDAD ──';
  ND.querySelectorAll('.node-el').forEach(g=>{
    g.addEventListener('click',()=>{
      infoBox.innerHTML=INFO[g.getAttribute('data-key')!]![mode];
      infoBox.style.borderLeftColor=mode==='gpon'?'var(--gpon)':'var(--xgs)';
    });
  });
  }
  buildDiagram();
  const bG=document.getElementById(DOM.btnGpon)!,bX=document.getElementById(DOM.btnXgs)!;
  function setMode(m: 'gpon' | 'xgs'){
    mode=m;
    bG.className=m==='gpon'?'active-gpon':'';bX.className=m==='xgs'?'active-xgs':'';
    bG.setAttribute('aria-selected',String(m==='gpon'));bX.setAttribute('aria-selected',String(m==='xgs'));
    buildDiagram();
    infoBox.innerHTML=m==='gpon'
      ?'<b>Red actual (GPON).</b> Dos plataformas OLT distintas, seis gestores, enlaces de 1 Gbps y un enrutador saturado. Pulsa los elementos para el detalle.'
      :'<b>Red renovada (GPON/XGS-PON).</b> 20 OLT duales, dos enrutadores nuevos, enlaces ≥10 Gbps y gestión unificada, reutilizando toda la fibra y los splitters. Pulsa los elementos para el detalle.';
    infoBox.style.borderLeftColor=m==='gpon'?'var(--gpon)':'var(--xgs)';
  }
  bG.onclick=()=>setMode('gpon');bX.onclick=()=>setMode('xgs');
}
