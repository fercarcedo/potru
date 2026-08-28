/**
 * Bars for the installed base of ONTs in production. They animate on scroll in.
 */
import { ontInstallBase } from '../lib/data';
import { DOM } from '../lib/dom-ids';
import { escapeHtml as esc } from '../lib/escape-html';

export function initOntBars() {
  const box = document.getElementById(DOM.ontBars)!;
  const locale = document.documentElement.lang === 'en' ? 'en' : 'es';
  /* the decimal separator is the one thing here that's locale, not
     translation: 43,03 % in Spanish, 43.03 % in English */
  const pct = (p: number) => (locale === 'en' ? p.toFixed(2) : p.toFixed(2).replace('.', ','));
  ontInstallBase(locale).forEach(({ model: n, note, pct: p, warn }) => {
    const r = document.createElement('div');
    r.className = 'bar-row';
    r.innerHTML = `<div class="name">${esc(n)}${note ? `<small>${esc(note)}</small>` : ''}</div>
      <div class="bar-track"><div class="bar-fill${warn ? ' warn' : ''}" data-w="${p}"></div></div>
      <div class="pct">${pct(p)} %</div>`;
    box.appendChild(r);
  });
  const io = new IntersectionObserver(
    (es) => {
      es.forEach((x) => {
        if (x.isIntersecting) {
          box
            .querySelectorAll<HTMLElement>('.bar-fill')
            .forEach((b) => (b.style.width = b.dataset.w + '%'));
          io.disconnect();
        }
      });
    },
    { threshold: 0.3 },
  );
  io.observe(box);
}
