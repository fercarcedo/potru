/**
 * Bars for the installed base of ONTs in production. They animate on scroll in.
 */
import { ONT_INSTALL_BASE } from '../lib/data';
import { DOM } from '../lib/dom-ids';
import { escapeHtml as esc } from '../lib/escape-html';

export function initOntBars() {
  const box=document.getElementById(DOM.ontBars)!;
  ONT_INSTALL_BASE.forEach(({model:n,note,pct:p,warn})=>{
    const r=document.createElement('div');r.className='bar-row';
    r.innerHTML=`<div class="name">${esc(n)}${note?`<small>${esc(note)}</small>`:''}</div>
      <div class="bar-track"><div class="bar-fill${warn?' warn':''}" data-w="${p}"></div></div>
      <div class="pct">${p.toFixed(2).replace('.',',')} %</div>`;
    box.appendChild(r);
  });
  const io=new IntersectionObserver(es=>{
    es.forEach(x=>{if(x.isIntersecting){box.querySelectorAll<HTMLElement>('.bar-fill').forEach(b=>b.style.width=b.dataset.w+'%');io.disconnect();}});
  },{threshold:.3});
  io.observe(box);
}
