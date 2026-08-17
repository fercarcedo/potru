/**
 * Guided tour of the network: 9 stops that frame the map, highlight trunks and
 * open the cable detail. The detail panels arrive already drawn from the build
 * (src/lib/details.ts); this only reveals the one for the current stop.
 */
import { byId } from '../lib/data';
import { TR, svg } from './map';
import { openNode } from './modal';

  const panel=document.getElementById('tourPanel')!;
  const btnStart=document.getElementById('tourStart')!;
  const tpStep=document.getElementById('tpStep')!,tpTitle=document.getElementById('tpTitle')!,
        tpText=document.getElementById('tpText')!,tpPrev=document.getElementById('tpPrev')!,
        tpNext=document.getElementById('tpNext')!,tpEnter=document.getElementById('tpEnter')!,
        tpExit=document.getElementById('tpExit')!;
  const HOME: number[]=[0,0,1160,470];
  interface Step { vb: number[]; hl: string[]; node: string | null; t: string; x: string }
  const STEPS: Step[]=[
   {vb:[440,20,420,240],hl:[],node:'pao',
    t:'Gijón / PAO — la puerta de la red',
    x:'Todo el tráfico de la Red Asturcón entra y sale por este punto: el enrutador Alcatel 7750SR-7, hoy al 100% de ocupación, conecta los 20 nodos con las jaulas de los operadores. La renovación instala aquí un enrutador nuevo (PF-2) junto al actual. Puedes entrar y ver el plano de planta y los alzados reales de la sala.'},
   {vb:[430,60,320,230],hl:['minera'],node:'mieres',
    t:'Troncal de la Autovía Minera · fibra propia',
    x:'De Gijón a Mieres, la troncal propia de la red transita por las canalizaciones de la Autovía AS-I "Mieres–Gijón", con segregación de fibras hacia la Cuenca del Nalón. En Mieres — cabecera de las tres cuencas — se instala el segundo enrutador nuevo del contrato. Entra para ver sus 4 OLT Alcatel en los alzados.'},
   {vb:[450,150,360,290],hl:['lena','morcin','aller','nalon'],node:'blimea',
    t:'Las cuencas: propia hacia Lena, alquilada hacia Morcín y Aller',
    x:'Desde Mieres, la fibra propia se prolonga al sur hacia Pola de Lena; hacia Morcín y hacia la Cuenca del Aller se usan fibras alquiladas — en Aller, sobre el tendido ferroviario de ADIF entre Santa Cruz de Mieres y Collanzo. En la Cuenca del Nalón te espera Blimea, el nodo más denso de la red: 8 OLT en producción. Entra a verlo.'},
   {vb:[40,40,560,230],hl:['occ','occrent'],node:null,
    t:'Troncal Occidental: propia hasta Cudillero, alquilada hasta Gijón',
    x:'Ojo al matiz: la fibra PROPIA de la red (64 fibras sobre la vía ADIF Ferrol–Gijón) llega desde Vegadeo hasta la arqueta de la estación de Cudillero — el círculo del mapa, al oeste de Muros. El tramo Gijón–Cudillero (pasando por Soto del Barco y Muros de Nalón) se cursa por SOLO 2 fibras ópticas alquiladas a terceros — cable FO Gijón–Avilés–Muros–Cudillero, unos 60 km — exprimidas con equipos CWDM (línea discontinua ámbar). Sobre la troncal propia cuelgan, de este a oeste, Soto del Barco, Muros, Luarca, Navia, La Caridad, Tapia, Castropol y Vegadeo, con segregaciones del cable Castropol–Cudillero en Puerto de Vega, Figueras y La Caridad.'},
   {vb:[280,40,340,220],hl:['occ','occrent'],node:'muros',
    t:'Muros de Nalón — cabecera CWDM y nodo piloto',
    x:'Aquí concentra el área Occidental sus longitudes de onda: dos CWDM Transmode 8133 de 8 canales (todos ocupados: las OLT de Luarca, Navia, Tapia, Castropol y el Hospital de Jarrio) que viajan por el tramo ALQUILADO Cudillero–Gijón, con 21 dB de pérdidas medidas. Desde el nodo, la fibra propia sirve a Muros, Soto del Barco y San Esteban de Pravia. Será el primer nodo en migrar (semanas 13–17): su éxito valida el procedimiento para los otros 19.'},
   {vb:[180,150,360,220],hl:['surocc'],node:'cangas',
    t:'Suroccidente · fibra alquilada y el único 1:32',
    x:'Tineo y Cangas del Narcea se conectan sobre portadores de fibra alquilada con equipos CWDM (el 8140 del PAO conserva 2 canales libres). Cangas es el único nodo de la red con espliteado 1:32 en vez de 1:64, un matiz que condiciona el dimensionado de puertos de su nueva OLT. Entra a ver sus dos OLT Alcatel.'},
   {vb:[560,40,520,240],hl:['suror','redund'],node:null,
    t:'Troncal Suroriental · Gijón–Nava–Infiesto–Arriondas–Llanes',
    x:'Todo el suroriente se articula sobre una troncal de fibra alquilada que enhebra Nava, Infiesto y Arriondas, con extremos en el PAO y en el nodo de Llanes. Sus tramas viajan en CWDM 8133 con los 8 canales ocupados — sin facilidades vacantes, uno de los motivos por los que el adjudicatario podrá aportar equipos de transporte nuevos.'},
   {vb:[700,20,440,240],hl:['orient','redund'],node:'llanes',
    t:'Oriente · Llanes y Colombres, con redundancia',
    x:'El extremo oriental llega por fibra alquilada Gijón–Llanes y Llanes–Colombres. Fíjate en la línea punteada azulada: desde Llanes, las tramas de las OLT del oriente (y también las del suroriente) vuelven al PAO por una segunda ruta de fibra redundada — si la principal cae, el tráfico sobrevive. Llanes suma 1.046 ONT en dos OLT — entra a ver la sala.'},
   {vb:HOME,hl:['occ','occrent','minera','lena','nalon','morcin','aller','surocc','suror','orient','redund'],node:null,
    t:'La red completa, lista para los 10 Gbps',
    x:'Este es el lienzo sobre el que actúa el contrato: toda la fibra — propia y alquilada — y los splitters se reutilizan; cambian las 20 OLT, los enrutadores y la gestión. Cada nueva OLT se conectará con enlaces de mínimo 10 Gbps extremo a extremo, y la migración avanzará de oeste a este entre las semanas 13 y 58. Pulsa cualquier nodo para su ficha.'}
  ];
  const tpDetBtn=document.getElementById('tpDetBtn')!,tpDet=document.getElementById('tpDet')!;
  tpDetBtn.onclick=()=>{
    const open=tpDet.style.display!=='none';
    tpDet.style.display=open?'none':'block';
    tpDetBtn.textContent=open?'\u25a0\u25a0 Ver los cables por dentro':'\u25a0\u25a0 Ocultar los cables';
  };
  let idx=-1, animId: number|null=null, pulses: SVGElement[]=[];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setVB(target: number[]){
    if(animId)cancelAnimationFrame(animId);
    const cur=svg.getAttribute('viewBox')!.split(' ').map(Number);
    if(reduced){svg.setAttribute('viewBox',target.join(' '));return;}
    const t0=performance.now(),D=700;
    function f(t: number){
      const k=Math.min((t-t0)/D,1),e=1-Math.pow(1-k,3);
      svg.setAttribute('viewBox',cur.map((c,i)=>c+(target[i]-c)*e).join(' '));
      if(k<1)animId=requestAnimationFrame(f);
    }
    animId=requestAnimationFrame(f);
  }
  function clearPulses(){pulses.forEach(p=>p.remove());pulses=[];}
  function highlight(ids: string[]){
    Object.entries(TR).forEach(([k,el])=>{
      if(k.endsWith('_lbl')){el.setAttribute('opacity',ids.includes(k.replace('_lbl',''))?'1':'.55');return;}
      const on=ids.includes(k);
      el.setAttribute('opacity',on?'.95':'.22');
      el.setAttribute('stroke-width',on?'3.4':'2.2');
    });
    clearPulses();
    if(!reduced)ids.forEach(id=>{
      const path=TR[id];if(!path)return;
      const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('r','3.6');c.setAttribute('fill',path.getAttribute('stroke')!);
      const a=document.createElementNS('http://www.w3.org/2000/svg','animateMotion');
      a.setAttribute('dur','3.4s');a.setAttribute('repeatCount','indefinite');
      a.setAttribute('path',path.getAttribute('d')!);
      c.appendChild(a);svg.appendChild(c);pulses.push(c);
    });
  }
  function show(i: number){
    idx=i;const s=STEPS[i]!;
    panel.classList.add('open');
    tpStep.textContent=`Paseo por la red · parada ${i+1} de ${STEPS.length}`;
    tpTitle.textContent=s.t;tpText.textContent=s.x;
    /* the 9 panels are already in the DOM from the build: reveal this stop's */
    const det=tpDet.querySelector<HTMLElement>(`[data-det="${i}"]`);
    tpDet.querySelectorAll<HTMLElement>('[data-det]').forEach(d=>{d.hidden=d!==det});
    tpDet.style.display='none';
    tpDetBtn.style.display=det?'inline-block':'none';
    tpDetBtn.textContent='\u25a0\u25a0 Ver los cables por dentro';
    (tpPrev as HTMLButtonElement).disabled=i===0;
    tpNext.textContent=i===STEPS.length-1?'Terminar ✓':'Siguiente ▶';
    tpEnter.style.display=s.node&&byId[s.node]!.gallery.length>1?'inline-block':'none';
    if(s.node)tpEnter.onclick=()=>openNode(s.node!,1);
    tpEnter.textContent='⌂ Entrar en el nodo';
    setVB(s.vb);highlight(s.hl);
    panel.scrollIntoView({behavior:reduced?'auto':'smooth',block:'nearest'});
  }
  function exitTour(){
    panel.classList.remove('open');idx=-1;
    setVB(HOME);highlight([]);clearPulses();
    Object.entries(TR).forEach(([k,el])=>{if(!k.endsWith('_lbl')){el.setAttribute('opacity','.55');el.setAttribute('stroke-width','2.2');}else{el.setAttribute('opacity','1');}});
    btnStart.textContent='▶ Reanudar el paseo';
  }
  btnStart.onclick=()=>show(idx>=0&&idx<STEPS.length?idx:0);
  tpPrev.onclick=()=>show(Math.max(0,idx-1));
  tpNext.onclick=()=>{if(idx===STEPS.length-1)exitTour();else show(idx+1)};
  tpExit.onclick=exitTour;
