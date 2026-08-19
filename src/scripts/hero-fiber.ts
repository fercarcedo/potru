/**
 * Animated fibres in the hero. Purely decorative: three paths with pulses
 * travelling along them. The global prefers-reduced-motion rule silences the
 * animation.
 */
import { DOM } from '../lib/dom-ids';
import { svgEl } from './svg';

export function initHeroFiber() {
  const svg=document.getElementById(DOM.heroFiber)!;
  const paths=['M-50,480 C300,430 500,520 780,410 S1200,300 1460,340','M-50,530 C350,500 600,590 900,470 S1250,380 1460,420','M-50,420 C250,380 520,450 820,350 S1220,240 1460,270'];
  const colors=['#ffb454','#41e3d2','#41e3d2'];
  paths.forEach((d,i)=>{
    svgEl('path',{d,fill:'none',stroke:colors[i]!,'stroke-width':'1.2',opacity:'.25'},svg);
    for(let k=0;k<2;k++){
      const c=svgEl('circle',{r:'3',fill:colors[i]!},svg);
      svgEl('animateMotion',{dur:(7+i*2)+'s',repeatCount:'indefinite',begin:(k*3.5+i)+'s',path:d},c);
    }
  });
}
