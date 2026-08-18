/**
 * Animated fibres in the hero. Purely decorative: three paths with pulses
 * travelling along them. The global prefers-reduced-motion rule silences the
 * animation.
 */
import { DOM } from '../lib/dom-ids';

export function initHeroFiber() {
  const svg=document.getElementById(DOM.heroFiber)!,ns='http://www.w3.org/2000/svg';
  const paths=['M-50,480 C300,430 500,520 780,410 S1200,300 1460,340','M-50,530 C350,500 600,590 900,470 S1250,380 1460,420','M-50,420 C250,380 520,450 820,350 S1220,240 1460,270'];
  const colors=['#ffb454','#41e3d2','#41e3d2'];
  paths.forEach((d,i)=>{
    const p=document.createElementNS(ns,'path');
    p.setAttribute('d',d);p.setAttribute('fill','none');p.setAttribute('stroke',colors[i]);
    p.setAttribute('stroke-width','1.2');p.setAttribute('opacity','.25');svg.appendChild(p);
    for(let k=0;k<2;k++){
      const c=document.createElementNS(ns,'circle');
      c.setAttribute('r','3');c.setAttribute('fill',colors[i]);
      const a=document.createElementNS(ns,'animateMotion');
      a.setAttribute('dur',(7+i*2)+'s');a.setAttribute('repeatCount','indefinite');
      a.setAttribute('begin',(k*3.5+i)+'s');a.setAttribute('path',d);
      c.appendChild(a);svg.appendChild(c);
    }
  });
}
