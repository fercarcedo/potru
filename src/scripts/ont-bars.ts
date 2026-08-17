/**
 * Bars for the installed base of ONTs in production. They animate on scroll in.
 */
  const data: [string,string,number,boolean][]=[['Alcatel I-221E-A','no admite >100 Mbps',43.03,true],
    ['Ericsson T063G / T067G','',29.48,false],
    ['Nokia G-241W-A','',17.23,false],
    ['PTI ONT7-4GE-2FXS','con / sin puerto RF',9.63,false],
    ['Nokia G-240G-E','',0.63,false]];
  const box=document.getElementById('ontBars')!;
  data.forEach(([n,note,p,warn])=>{
    const r=document.createElement('div');r.className='bar-row';
    r.innerHTML=`<div class="name">${n}${note?`<small>${note}</small>`:''}</div>
      <div class="bar-track"><div class="bar-fill${warn?' warn':''}" data-w="${p}"></div></div>
      <div class="pct">${p.toFixed(2).replace('.',',')} %</div>`;
    box.appendChild(r);
  });
  const io=new IntersectionObserver(es=>{
    es.forEach(x=>{if(x.isIntersecting){box.querySelectorAll<HTMLElement>('.bar-fill').forEach(b=>b.style.width=b.dataset.w+'%');io.disconnect();}});
  },{threshold:.3});
  io.observe(box);
