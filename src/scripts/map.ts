// @ts-nocheck -- Literal port of the legacy build's JavaScript.
// This module and viewer3d.ts build SVG DOM / a WebGL scene leaning on JS's
// implicit number-to-string coercion in setAttribute, exactly as the original
// did. Typing them would mean rewriting hundreds of call sites and would put
// the visual parity this migration is bound to at risk. The rest of the project
// (src/lib, components, pages and the other islands) does pass `npm run check`.
/**
 * Schematic map: trunks (own ones solid, leased ones dashed) with an ambient
 * pulse, primary and secondary nodes, the towns each one serves, and the loop
 * around the shared PON tree in Llanes.
 *
 * Exports the <svg> and the trunk index so the tour (tour.ts) can frame and
 * highlight; the legacy passed them through window.__map.
 */
import { NODES, byId } from '../lib/data';
import { openNode } from './modal';

const NS = 'http://www.w3.org/2000/svg';

  export const svg=document.getElementById('astMap')!,tip=document.getElementById('mapTip')!,shell=svg.parentElement!;
  const POS={muros:[385,120],luarca:[300,115],navia:[235,105],castropol:[120,120],tapia:[175,95],
    tineo:[300,220],cangas:[255,295],mieres:[560,245],polalena:[545,362],morcin:[502,288],
    moreda:[612,302],cabanaquinta:[655,348],felechosa:[700,388],blimea:[700,240],langreo:[645,203],
    arriondas:[880,175],infiesto:[805,190],nava:[735,175],llanes:[965,125],colombres:[1045,120]};
  const SECONDARY=[
    ['Vegadeo',95,160,'#41e3d2','castropol','cable de 96 ff.oo. Castropol\u2013Vegadeo'],
    ['La Caridad',205,140,'#41e3d2','tapia','tubos 4\u20138 del cable Castropol\u2013Cudillero'],
    ['Soto del Barco',420,145,'#41e3d2','muros','fibra desde Muros de Nal\u00f3n'],
    ['Sta. Eulalia de Cabranes',757,148,'#9df08a','infiesto','fibra desde Infiesto'],
    ['Villamayor',843,205,'#9df08a','infiesto','fibra desde Infiesto'],
    ['El Entrego',674,264,'#c9a0ff','blimea','fibra desde Blimea'],
    ['Sotrondio',712,278,'#c9a0ff','blimea','fibra desde Blimea'],
    ['Barredos',744,294,'#c9a0ff','blimea','fibra desde Blimea'],
    ['Pola de Laviana',772,310,'#c9a0ff','blimea','fibra desde Blimea']];
  const PAO={x:590,y:95},MIE=POS.mieres;
  function e2(t,a){const el=document.createElementNS(NS,t);for(const k in a)el.setAttribute(k,a[k]);svg.appendChild(el);return el;}
  e2('path',{d:'M60,80 C250,55 480,70 620,62 C800,55 980,80 1110,92',fill:'none',stroke:'#1c2c44','stroke-width':1.5,'stroke-dasharray':'6 5'});
  e2('text',{x:1108,y:78,fill:'#3d5473','font-size':10,'text-anchor':'end','letter-spacing':'.2em'}).textContent='MAR CANTÁBRICO';
  /* ---- TRUNKS (own ones solid, leased ones dashed) ---- */
  export const TR: Record<string, SVGElement>={};
  function trunk(id,d,own,label,lx,ly){
    const p=e2('path',{d,fill:'none',stroke:own?'#41e3d2':'#ffb454','stroke-width':2.2,
      opacity:.55,'stroke-dasharray':own?'0':'7 6','stroke-linecap':'round'});
    if(label){const t=e2('text',{x:lx,y:ly,fill:own?'#37b3a6':'#c99a54','font-size':8.5,'letter-spacing':'.08em'});t.textContent=label;TR[id+'_lbl']=t;}
    /* permanent ambient pulse: the cable is "alive" */
    const amb=e2('circle',{r:2.6,fill:own?'#41e3d2':'#ffb454',opacity:.85});
    const am=document.createElementNS(NS,'animateMotion');
    am.setAttribute('dur',(6+(id.length%4)*1.7)+'s');am.setAttribute('repeatCount','indefinite');
    am.setAttribute('path',d);amb.appendChild(am);
    TR[id]=p;return p;
  }
  trunk('occ','M352,127 L300,115 L235,105 L205,140 L175,95 L120,120 L95,160',true,'PROPIA 64F \u00b7 CUDILLERO\u2013VEGADEO (v\u00eda ADIF)',118,66);
  trunk('occrent','M590,95 C540,108 470,142 420,145 L385,120 L352,127',false,'ALQUILADA+CWDM \u00b7 GIJ\u00d3N\u2013CUDILLERO',462,184);
  e2('circle',{cx:352,cy:127,r:3.5,fill:'none',stroke:'#8da0b8','stroke-width':1.2});
  /* el rótulo va abajo a la izquierda y en dos líneas: en una sola se solapaba
     con «Muros de Nalón», que arranca en x=346, y quedaba ilegible */
  e2('line',{x1:349,y1:130,x2:332,y2:145,stroke:'#5a6f8d','stroke-width':.7,opacity:.6});
  e2('text',{x:318,y:154,fill:'#8da0b8','font-size':8.5,'text-anchor':'middle'}).textContent='Cudillero';
  e2('text',{x:318,y:164,fill:'#5a6f8d','font-size':7.5,'text-anchor':'middle'}).textContent='(arqueta ADIF)';
  trunk('minera','M590,95 C588,145 572,200 560,245',true,'AUTOVÍA MINERA',503,168);
  trunk('lena','M560,245 L545,362',true);
  trunk('nalon','M578,165 C615,182 645,190 645,203 L700,240',true);
  trunk('morcin','M560,245 L502,288',false);
  trunk('aller','M560,245 C585,270 600,288 612,302 L655,348 L700,388',false,'ADIF Sta.Cruz–Collanzo',742,352);
  trunk('surocc','M420,145 C390,180 340,200 300,220 L255,295',false,'F.O. ALQUILADA + CWDM',282,258);
  trunk('suror','M590,95 C650,130 700,160 735,175 L805,190 L880,175 C915,160 940,140 965,125',false,'GIJÓN–NAVA–INFIESTO–ARRIONDAS–LLANES',688,116);
  trunk('orient','M965,125 L1045,120',false);
  const rd=e2('path',{d:'M965,125 C880,72 730,58 590,95',fill:'none',stroke:'#9db4d8','stroke-width':1.8,opacity:.5,'stroke-dasharray':'2 6','stroke-linecap':'round'});
  TR['redund']=rd;
  const rdl=e2('text',{x:770,y:52,fill:'#7288a8','font-size':8.5,'letter-spacing':'.08em'});
  rdl.textContent='RUTA REDUNDANTE ORIENTE\u2194GIJ\u00d3N (desde Llanes)';TR['redund_lbl']=rdl;

  SECONDARY.forEach(([name,x,y,col,par,how])=>{
    if(POS[par]) e2('line',{x1:POS[par][0],y1:POS[par][1],x2:x,y2:y,stroke:col,'stroke-width':.9,opacity:.35,'stroke-dasharray':'3 3'});
    const g=document.createElementNS(NS,'g');svg.appendChild(g);g.style.cursor='help';
    const c=document.createElementNS(NS,'circle');
    c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',4.5);
    c.setAttribute('fill','#060b14');c.setAttribute('stroke',col);c.setAttribute('stroke-width',1.6);c.setAttribute('opacity',.85);
    g.appendChild(c);
    const t=document.createElementNS(NS,'text');
    t.setAttribute('x',x);t.setAttribute('y',y+16);t.setAttribute('fill','#8da0b8');
    t.setAttribute('font-size',7.5);t.setAttribute('text-anchor','middle');
    t.setAttribute('class','lbl-move');
    t.textContent=name;g.appendChild(t);
    g.addEventListener('mousemove',ev=>{
      const r=shell.getBoundingClientRect();
      tip.style.opacity=1;
      tip.style.left=Math.min(ev.clientX-r.left+14,r.width-260)+'px';
      tip.style.top=(ev.clientY-r.top-10)+'px';
      tip.innerHTML=`<b>${name} · nodo secundario</b><br>Sin electr\u00f3nica activa: solo repartidores \u00f3pticos pasivos. Se conecta al primario de ${byId[par].name} por ${how}. La renovaci\u00f3n no act\u00faa aqu\u00ed: al no haber OLT, no hay equipo que sustituir.`;
    });
    g.addEventListener('mouseleave',()=>tip.style.opacity=0);
  });
  NODES.forEach(n=>{
    const [x,y]=POS[n.id];
    const g=document.createElementNS(NS,'g');svg.appendChild(g);g.style.cursor='pointer';
    const HOSTONLY=['mieres','langreo'];
    const c=document.createElementNS(NS,'circle');
    c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',7);
    c.setAttribute('fill',n.color);c.setAttribute('opacity',.95);g.appendChild(c);
    if(HOSTONLY.includes(n.id)){
      const ring=document.createElementNS(NS,'circle');
      ring.setAttribute('cx',x);ring.setAttribute('cy',y);ring.setAttribute('r',11);
      ring.setAttribute('fill','none');ring.setAttribute('stroke','#8da0b8');
      ring.setAttribute('stroke-width',1);ring.setAttribute('stroke-dasharray','2 3');g.appendChild(ring);
    }
    const halo=document.createElementNS(NS,'circle');
    halo.setAttribute('cx',x);halo.setAttribute('cy',y);halo.setAttribute('r',7);
    halo.setAttribute('fill','none');halo.setAttribute('stroke',n.color);halo.setAttribute('stroke-width',1);
    const an=document.createElementNS(NS,'animate');an.setAttribute('attributeName','r');an.setAttribute('values','7;15');an.setAttribute('dur','2.6s');an.setAttribute('repeatCount','indefinite');
    const ao=document.createElementNS(NS,'animate');ao.setAttribute('attributeName','opacity');ao.setAttribute('values','.6;0');ao.setAttribute('dur','2.6s');ao.setAttribute('repeatCount','indefinite');
    halo.appendChild(an);halo.appendChild(ao);g.appendChild(halo);
    const lbl=document.createElementNS(NS,'text');
    /* Navia sits close enough to Tapia that their names touched; it drops a
       little so both stay legible */
    const LBL_DY: Record<string, number> = { navia: 9 };
    lbl.setAttribute('x',x);lbl.setAttribute('y',y+22+(LBL_DY[n.id]||0));lbl.setAttribute('fill','#8da0b8');
    lbl.setAttribute('font-size',9.5);lbl.setAttribute('text-anchor','middle');
    lbl.setAttribute('class','lbl-fixed');
    lbl.textContent=n.name+(['mieres','langreo'].includes(n.id)?' *':'');g.appendChild(lbl);
    g.addEventListener('mousemove',ev=>{
      const r=shell.getBoundingClientRect();
      tip.style.opacity=1;
      tip.style.left=Math.min(ev.clientX-r.left+14,r.width-260)+'px';
      tip.style.top=(ev.clientY-r.top-10)+'px';
      const ont=n.olts.reduce((a,o)=>a+o.onts,0);
      const ho=['mieres','langreo'].includes(n.id)?`<br><span style="color:#ffb454">* Alberga el nodo/OLT pero su casco urbano NO figura entre las poblaciones servidas: la cobertura de la Red Asturc\u00f3n aqu\u00ed son sus n\u00facleos perif\u00e9ricos.</span>`:'';
      const pl=n.towns&&n.towns.length>1?`<br><span style="color:#b8c6d8">Sirve a: ${n.towns.slice(0,3).join(', ')}${n.towns.length>3?'…':''}</span>`:'';
      tip.innerHTML=`<b>${n.name}</b><br>${n.olts.length} OLT · ${ont} ONT · migración sem. ${n.weekFrom}–${n.weekTo}${pl}${ho}<br><span style="color:${n.color}">Área ${n.area}</span> · <u>pulsa para la ficha</u>`;
    });
    g.addEventListener('mouseleave',()=>tip.style.opacity=0);
    g.addEventListener('click',()=>openNode(n.id));
  });
  const gp=document.createElementNS(NS,'g');svg.appendChild(gp);gp.style.cursor='pointer';
  const sq=document.createElementNS(NS,'rect');
  sq.setAttribute('x',PAO.x-10);sq.setAttribute('y',PAO.y-10);sq.setAttribute('width',20);sq.setAttribute('height',20);
  sq.setAttribute('rx',4);sq.setAttribute('fill','#0e1a2e');sq.setAttribute('stroke','#41e3d2');sq.setAttribute('stroke-width',2);
  gp.appendChild(sq);
  const pl=document.createElementNS(NS,'text');
  pl.setAttribute('x',PAO.x);pl.setAttribute('y',PAO.y-18);pl.setAttribute('fill','#e8eef6');
  pl.setAttribute('font-size',10);pl.setAttribute('text-anchor','middle');pl.setAttribute('font-weight',600);
  pl.textContent='GIJÓN · PAO';gp.appendChild(pl);
  gp.addEventListener('click',()=>openNode('pao'));
  gp.addEventListener('mousemove',ev=>{
    const r=shell.getBoundingClientRect();
    tip.style.opacity=1;
    tip.style.left=Math.min(ev.clientX-r.left+14,r.width-260)+'px';
    tip.style.top=(ev.clientY-r.top-10)+'px';
    tip.innerHTML=`<b>PAO · Gijón</b><br>Punto de acceso de operadores. Aquí y en Mieres van los enrutadores nuevos.<br><u>pulsa para la ficha</u>`;
  });
  gp.addEventListener('mouseleave',()=>tip.style.opacity=0);
  const leg=document.getElementById('areaLegend')!;
  const seen=new Set();
  NODES.forEach(n=>{
    if(seen.has(n.area))return;seen.add(n.area);
    const s=document.createElement('span');
    s.style.cssText='display:flex;align-items:center;gap:6px';
    s.innerHTML=`<span class="dot" style="background:${n.color}"></span>${n.area}`;
    leg.appendChild(s);
  });
  const s2=document.createElement('span');
  s2.style.marginLeft='auto';s2.className='mono';
  s2.textContent='● primario (OLT) · ○ secundario (pasivo) · • población servida · ▢ PAO · * nodo sin cobertura en su casco urbano';
  leg.appendChild(s2);
  /* ---- layer of served towns ---- */
  const TOWN_POS={
    muros:[['San Esteban de Pravia',402,98]],
    navia:[['Puerto de Vega',258,86],['Pol. de Coa\u00f1a',224,124]],
    castropol:[['Figueras',130,96],['Barres',105,100],['Piant\u00f3n',82,140]],
    tineo:[['Pol. La Curiscada',334,193]],
    mieres:[['Figaredo',516,275],['Sta. Cruz',553,292],['Uj\u00f3',528,308],['Tur\u00f3n',598,272],['Rioturbio',592,220]],
    polalena:[['Villallana',568,336]],
    moreda:[['Caborana',586,326],['Oyanco',630,324],['Villanueva',644,286]],
    cabanaquinta:[['Corigos',678,368]],
    langreo:[['Tuilla',655,180]],
    infiesto:[['Sevares',850,198]],
    llanes:[['Posada',903,132],['Barro',928,97],['Celorio',938,154],['Porr\u00faa',992,152]]
  };
  const townsLayer=document.createElementNS(NS,'g');svg.appendChild(townsLayer);
  Object.entries(TOWN_POS).forEach(([nid,list])=>{
    const n=byId[nid];const [nx,ny]=POS[nid];
    list.forEach(([name,x,y])=>{
      const ln=document.createElementNS(NS,'line');
      ln.setAttribute('x1',nx);ln.setAttribute('y1',ny);ln.setAttribute('x2',x);ln.setAttribute('y2',y);
      ln.setAttribute('stroke',n.color);ln.setAttribute('stroke-width',.7);ln.setAttribute('opacity',.22);
      townsLayer.appendChild(ln);
      const d=document.createElementNS(NS,'circle');
      d.setAttribute('cx',x);d.setAttribute('cy',y);d.setAttribute('r',2.4);
      d.setAttribute('fill',n.color);d.setAttribute('opacity',.75);
      townsLayer.appendChild(d);
      const t=document.createElementNS(NS,'text');
      t.setAttribute('x',x);t.setAttribute('y',y-5);t.setAttribute('fill','#6f8199');
      t.setAttribute('font-size',7);t.setAttribute('text-anchor','middle');
      t.setAttribute('class','lbl-move');
      t.textContent=name;townsLayer.appendChild(t);
    });
  });
  /* shared PON tree: Barro–Celorio–Porrúa–Posada (Llanes) */
  const shp=document.createElementNS(NS,'path');
  shp.setAttribute('d','M892,130 C888,102 914,86 934,92 C964,102 1004,132 998,154 C992,170 938,168 912,156 C900,150 894,142 892,130 Z');
  shp.setAttribute('fill','rgba(255,215,107,.05)');shp.setAttribute('stroke','#ffd76b');
  shp.setAttribute('stroke-width','1');shp.setAttribute('stroke-dasharray','3 4');shp.setAttribute('opacity','.6');
  townsLayer.appendChild(shp);
  const sht=document.createElementNS(NS,'text');
  sht.setAttribute('x',940);sht.setAttribute('y',80);sht.setAttribute('fill','#c9a44e');
  sht.setAttribute('font-size',7.5);sht.setAttribute('text-anchor','middle');sht.setAttribute('letter-spacing','.06em');
  sht.textContent='\u00c1RBOL PON COMPARTIDO';townsLayer.appendChild(sht);
  shp.style.pointerEvents='all';shp.style.cursor='help';
  shp.addEventListener('mousemove',ev=>{
    const r=shell.getBoundingClientRect();
    tip.style.opacity=1;
    tip.style.left=Math.min(ev.clientX-r.left+14,r.width-260)+'px';
    tip.style.top=(ev.clientY-r.top-10)+'px';
    tip.innerHTML=`<b>\u00c1rbol PON compartido</b><br>Detalle t\u00e9cnico del pliego: las redes FTTH de Barro, Celorio, Porr\u00faa y Posada de Llanes est\u00e1n compartidas entre s\u00ed \u2014 varias poblaciones cuelgan de los mismos \u00e1rboles \u00f3pticos pasivos del nodo de Llanes, en lugar de tener cada una su PON independiente.`;
  });
  shp.addEventListener('mouseleave',()=>tip.style.opacity=0);
  const townsBtn=document.getElementById('townsToggle')!;
  let townsOn=true;
  townsBtn.onclick=()=>{townsOn=!townsOn;townsLayer.style.display=townsOn?'':'none';
    townsBtn.textContent=townsOn?'\u25c9 Poblaciones servidas: visibles':'\u25cb Poblaciones servidas: ocultas';};

  /* ---- map zoom: scales the viewBox about whatever is on screen ---- */
  const HOME_W = 1160, HOME_H = 470, MIN_W = 240;
  /** Zooms about the middle of the current view, keeping its aspect ratio. */
  export function zoomMap(factor: number) {
    const [x, y, w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number) as number[];
    const cx = x + w / 2, cy = y + h / 2;
    let nw = Math.max(MIN_W, Math.min(HOME_W, w * factor));
    let nh = h * (nw / w);
    if (nh > HOME_H) { nh = HOME_H; nw = w * (nh / h); }
    const nx = Math.max(0, Math.min(HOME_W - nw, cx - nw / 2));
    const ny = Math.max(0, Math.min(HOME_H - nh, cy - nh / 2));
    const r2 = (v: number) => Math.round(v * 100) / 100;
    svg.setAttribute('viewBox', `${r2(nx)} ${r2(ny)} ${r2(nw)} ${r2(nh)}`);
  }
  const zoomIn = document.getElementById('mapZoomIn') as HTMLButtonElement | null;
  const zoomOut = document.getElementById('mapZoomOut') as HTMLButtonElement | null;
  zoomIn?.addEventListener('click', () => zoomMap(0.72));
  zoomOut?.addEventListener('click', () => zoomMap(1 / 0.72));

  const vb = () => svg.getAttribute('viewBox')!.split(' ').map(Number) as number[];

  /**
   * Keeps the pad honest: grey out whichever button can no longer do anything,
   * and only offer the grab cursor while there is something to pan to. Driven
   * by a MutationObserver so it also follows the guided tour, which rewrites
   * the viewBox itself.
   */
  function syncMap() {
    const [, , w, h] = vb();
    const zoomedIn = w < HOME_W - 0.5 || h < HOME_H - 0.5;
    if (zoomIn) zoomIn.disabled = w <= MIN_W + 0.5;
    if (zoomOut) zoomOut.disabled = !zoomedIn;
    svg.style.cursor = zoomedIn ? 'grab' : '';
    /* only swallow touch gestures when there is actually room to pan */
    svg.style.touchAction = zoomedIn ? 'none' : '';
  }
  new MutationObserver(syncMap).observe(svg, { attributes: true, attributeFilter: ['viewBox'] });
  syncMap();

  /* ---- drag to pan, once zoomed in ---- */
  let dragged = false;
  let pan: { x: number; y: number; vx: number; vy: number; moved: number } | null = null;
  svg.addEventListener('pointerdown', (e: PointerEvent) => {
    const [x, y, w, h] = vb();
    if (w >= HOME_W - 0.5 && h >= HOME_H - 0.5) return;   /* nothing to pan */
    pan = { x: e.clientX, y: e.clientY, vx: x, vy: y, moved: 0 };
    svg.setPointerCapture(e.pointerId);
    svg.style.cursor = 'grabbing';
  });
  svg.addEventListener('pointermove', (e: PointerEvent) => {
    if (!pan) return;
    const [, , w, h] = vb();
    const rect = svg.getBoundingClientRect();
    const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
    pan.moved = Math.max(pan.moved, Math.hypot(dx, dy));
    /* screen pixels → viewBox units */
    const nx = Math.max(0, Math.min(HOME_W - w, pan.vx - dx * (w / rect.width)));
    const ny = Math.max(0, Math.min(HOME_H - h, pan.vy - dy * (h / rect.height)));
    const r2 = (v: number) => Math.round(v * 100) / 100;
    svg.setAttribute('viewBox', `${r2(nx)} ${r2(ny)} ${r2(w)} ${r2(h)}`);
  });
  const endPan = (e: PointerEvent) => {
    if (!pan) return;
    dragged = pan.moved > 4;
    pan = null;
    svg.releasePointerCapture?.(e.pointerId);
    syncMap();
  };
  svg.addEventListener('pointerup', endPan);
  svg.addEventListener('pointercancel', endPan);
  /* a drag that ends over a node must not also open its record */
  svg.addEventListener('click', (e: Event) => {
    if (!dragged) return;
    dragged = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);

  /* ---- declutter: nudge the small labels off the node names ----
     The legacy map had 13 pairs of overlapping labels — «Pol. de Coaña» sat on
     top of «Navia» and «Tapia de Casariego», and so on. Node names hold their
     place; town and secondary-node labels are moved to the first nearby spot
     that is clear. */
  {
    const grow = (r: DOMRect | any, m = 0.5) =>
      ({ x: r.x - m, y: r.y - m, w: r.width + m * 2, h: r.height + m * 2 });
    const hits = (a: any, b: any) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const fixed = [...svg.querySelectorAll('.lbl-fixed')].map((e: any) => grow(e.getBBox()));
    const placed: any[] = [];
    const OFFSETS: [number, number][] =
      [[0, 0], [0, 11], [0, -11], [14, 8], [-14, 8], [0, 19], [20, 0], [-20, 0], [0, -19]];
    for (const el of [...svg.querySelectorAll('.lbl-move')] as any[]) {
      const x0 = +el.getAttribute('x'), y0 = +el.getAttribute('y');
      for (const [dx, dy] of OFFSETS) {
        el.setAttribute('x', x0 + dx); el.setAttribute('y', y0 + dy);
        const box = grow(el.getBBox());
        if (![...fixed, ...placed].some((o) => hits(box, o))) break;
      }
      placed.push(grow(el.getBBox()));
    }
  }
