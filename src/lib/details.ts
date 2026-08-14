/**
 * The 9 "see inside the cables" panels of the guided tour, one per stop. They
 * are composed AT BUILD TIME with the generators in graphics.ts and embedded
 * hidden in the page: the tour island only reveals or hides them.
 *
 * Every figure comes from the CON 06/2025 pliego. Where a layout is
 * illustrative rather than literal, the caption of the drawing says so.
 */
import { CW8, mkCWDM, mkPAO, mkSection, occRow } from './graphics';

export const DETAILS: string[] = [
  /* 0 PAO: unified panel, in the same visual language as the sections */
  mkPAO(),

  /* 1 Autovía Minera trunk */
  mkSection('Troncal propia · Autovía AS-I Mieres–Gijón (corte esquemático)', 8,
    {
      access: [6, 7, 8], labels: [
        { tubes: [6, 7, 8], color: '#41e3d2', text: 'tubos 6–8|SEGREGACIÓN →|Cuenca del Nalón' },
        { tubes: [1, 2, 3, 4, 5], text: 'tubos 1–5 (ilustr.)|Gijón ↔ Mieres' }]
    },
    [{ t: 7, oc: null, label: 'Segregación → Cuenca del Nalón', sub: 'anillo cian = segregadas|hacia Langreo / Blimea' }],
    'Fibra PROPIA por canalizaciones de la Autovía Minera · Caudal, Aller y Nalón llegan por fibra directa al 7750 de Mieres, sin equipos de transporte. Reparto de tubos ilustrativo; la segregación hacia el Nalón es literal del pliego.'),

  /* 2 the mining valleys */
  mkSection('Cable propio TRONSCPLEFO32 · 32 ff.oo. · Mieres–Pola de Lena', 4,
    { labels: [{ tubes: [1, 2, 3, 4], text: 'tubos 1–4 · 32 ff propias|Mieres ↔ Pola de Lena' }] },
    [{ t: 1, oc: null, label: 'Tubo tipo · 8 fibras', sub: 'colores de fibra según norma TIA-598' }], '') +
  mkSection('Cable TROMIENSCFO128 · 128 ff.oo. · 16 tubos', 16,
    {
      access: [16], labels: [
        { tubes: [16], color: '#41e3d2', text: 'tubo 16|prolongado → VILLALLANA' },
        { tubes: [1, 8], text: 'tubos 1–15|red troncal Mieres|(sin desglose)' }]
    },
    [{ t: 16, oc: null, label: 'Tubo 16 · prolongado → Villallana', sub: 'acceso FTTH de Villallana|desde Pola de Lena' }],
    'Morcín: fibra ALQUILADA · Cuenca del Aller: ALQUILADA sobre ferrocarril ADIF Santa Cruz de Mieres–Collanzo; el tramo Collanzo–Felechosa es de otro propietario.'),

  /* 3 own western trunk: real fibre-by-fibre data */
  mkSection('Cable CUDILLERO–CASTROPOL · 64 ff.oo. · 8 tubos × 8 fibras (vía ADIF)', 8,
    {
      access: [4, 5, 6, 7, 8], dead: [3], labels: [
        { tubes: [1], color: '#c8d4e2', text: 'TUBO 1 · TRANSPORTE|Luarca→Cudillero|2 oc · 6 vacantes' },
        { tubes: [2], color: '#c8d4e2', text: 'TUBO 2 · TRANSPORTE|Navia→Luarca|5 oc · 3 vacantes' },
        { tubes: [3], color: '#ff7d6b', text: 'TUBO 3 · SIN SALIDA|segregado en Tapia' },
        { tubes: [4, 5, 6, 7, 8], color: '#41e3d2', text: 'TUBOS 4–8 · ACCESO|Pto. Vega · Figueras|· La Caridad' }]
    },
    [{ t: 1, oc: 2, label: 'Tubo 1 · transporte Luarca→Cudillero', sub: 'tramas OLT → par alquilado|de Gijón (2 ff.oo.)' },
    { t: 2, oc: 5, label: 'Tubo 2/1 · transporte Navia→Luarca', sub: 'tubo 1 en Navia · sigue|como tubo 2 en Luarca' },
    { t: 3, nf: true, label: 'Tubo 3 · sin salida (segregado en Tapia)', sub: 'tubos 3–8 sin fusionar|hacia Cudillero' }],
    'Anillo cian = tubos 4–8 de ACCESO, segregados en <b>Puerto de Vega</b> (Navia), <b>Figueras</b> (Castropol) y <b>La Caridad</b> (Tapia) · Tapia–Castropol: 3 oc/5 vac · regeneradores eléctrico-ópticos en Navia, Luarca y Muros · distancias: Castropol–Tapia 19 km · Tapia–Navia 16 · Navia–Luarca 22 · Luarca–Muros 49 · Muros–Gijón 60') +
  mkSection('Cable CASTROPOL–VEGADEO · 96 ff.oo. · 12 tubos × 8 fibras', 12,
    {
      access: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], labels: [
        { tubes: [12, 1, 2], color: '#41e3d2', text: 'TUBOS 1–12 · ACCESO|Vegadeo y Barres' }]
    },
    [{ t: 1, oc: null, label: 'Tubos 1–12 → acceso de Vegadeo y Barres' }], ''),

  /* 4 Muros CWDM */
  mkCWDM('Desglose CWDM 8133 de Muros de Nalón → Gijón (colores normalizados por λ)', [
    { l: 1471, to: 'OLT Tapia de Casariego' },
    { l: 1491, to: 'OLT Castropol' },
    { l: 1511, free: true },
    { l: 1531, to: 'Hospital de Jarrio' },
    { l: 1551, to: 'Hospital de Jarrio' },
    { l: 1571, to: 'OLT Muros de Nalón' },
    { l: 1591, to: 'OLT Navia' },
    { l: 1611, to: 'OLT Luarca' }],
    'Todas las λ comparten el PAR de <b>2 ff.oo. alquiladas</b> (cable FO GIJÓN–AVILÉS–MUROS–CUDILLERO, ≈60 km) · pérdidas tras filtros: <b>21 dB</b> · ampliable de 8 a 16 canales'),

  /* 5 south-west */
  `${occRow('CWDM 8140 (en el PAO)', 4, 2, CW8)}
    ${mkCWDM('CWDM 8133 en Tineo · canales 5–8 dedicados al Hospital', [
    { l: 1551, to: 'Hospital Carmen y Severo Ochoa' },
    { l: 1571, to: 'Hospital Carmen y Severo Ochoa' },
    { l: 1591, to: 'Hospital Carmen y Severo Ochoa' },
    { l: 1611, to: 'Hospital Carmen y Severo Ochoa' }],
    '2× Transmode 5800 cursan las 4 tramas del hospital · otros 2× 5800 llevan las 6 tramas (3+3) de las OLT de Cangas del Narcea')}`,

  /* 6 south-east */
  `${occRow('CWDM 8133 · Gijón–Nava–Infiesto–Arriondas–Llanes', 8, 8, CW8)}
    <div style="color:#8da0b8;margin-top:6px">Transmode 5800 4×1 Gb/s sobre fibra alquilada · sin facilidades vacantes: uno de los motivos por los que el contrato permite aportar equipos de transporte nuevos · redundado con el PAO desde Llanes</div>`,

  /* 7 east */
  `${occRow('CWDM 8133 · Gijón–Llanes–Colombres', 8, 8, CW8)}
    <div style="display:flex;align-items:center;gap:10px;margin-top:10px">
    <svg viewBox="0 0 150 34" style="width:150px"><path d="M6,26 C40,26 110,26 144,26" stroke="#ffb454" stroke-width="2.5" fill="none" stroke-dasharray="7 6"/><path d="M6,10 C50,-2 100,-2 144,10" stroke="#9db4d8" stroke-width="2" fill="none" stroke-dasharray="2 5"/><text x="75" y="8" fill="#9db4d8" font-size="8" text-anchor="middle">ruta redundante</text><text x="75" y="33" fill="#c99a54" font-size="8" text-anchor="middle">ruta principal</text></svg>
    <span style="color:#8da0b8">Si la principal cae, las tramas del Oriente y Suroriente vuelven al PAO por la segunda ruta desde Llanes</span></div>`,

  /* 8 closing */
  `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <span style="color:#e8eef6;min-width:150px">Enlace por OLT hoy</span><svg viewBox="0 0 200 14" style="width:200px"><line x1="0" y1="7" x2="200" y2="7" stroke="#ffb454" stroke-width="2"/></svg><span style="color:#c99a54">1 Gb/s</span></div>
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:8px">
    <span style="color:#e8eef6;min-width:150px">Enlace renovado</span><svg viewBox="0 0 200 14" style="width:200px"><line x1="0" y1="7" x2="200" y2="7" stroke="#41e3d2" stroke-width="7"/><line x1="0" y1="7" x2="200" y2="7" stroke="#41e3d2" stroke-width="13" opacity=".2"/></svg><span style="color:var(--xgs)">≥ 10 Gb/s extremo a extremo</span></div>
    <div style="color:#8da0b8;margin-top:10px">Prioridad a portadores directos vacantes; CWDM o equipos nuevos del adjudicatario donde no los haya · los nodos cabecera pueden encadenar su área</div>`,
];
