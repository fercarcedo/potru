/**
 * The "see inside the cables" panels of the guided tour, keyed by the id of
 * the stop each one belongs to (TOUR_STOPS in src/lib/data.ts). They are
 * composed AT BUILD TIME with the generators in graphics.ts and embedded
 * hidden in the page: the tour island only reveals or hides them.
 *
 * The key is the whole contract with the tour. This used to be a plain
 * array lined up with tour.ts's own array of stops by position alone, so
 * inserting or reordering a stop silently paired a stop's prose with
 * another stop's drawing; tests/lib/details.test.ts now checks every key
 * here is a real stop id.
 *
 * Every figure comes from the CON 06/2025 pliego. Where a layout is
 * illustrative rather than literal, the caption of the drawing says so.
 */
import { PAO_TRANSPORT } from './data';
import { CW8, mkCWDM, mkPAO, mkSection, occRow } from './graphics';

/* Two mkSection cuts stacked in the same panel: each SVG's own bottom
   padding varies with how much its zooms and labels fill it, so back to
   back they can end up touching. A fixed gap between them beats relying on
   that leftover space to be enough. */
const SECTION_GAP = '<div style="height:28px"></div>';

export const DETAILS: Record<string, string> = {
  /* PAO: unified panel, in the same visual language as the sections */
  pao: mkPAO(PAO_TRANSPORT),

  'autovia-minera': mkSection(
    'Troncal propia · Autovía AS-I Mieres–Gijón (corte esquemático)',
    8,
    {
      access: [6, 7, 8],
      labels: [
        { tubes: [6, 7, 8], color: 'var(--xgs)', text: 'tubos 6–8|SEGREGACIÓN →|Cuenca del Nalón' },
        { tubes: [1, 2, 3, 4, 5], text: 'tubos 1–5 (ilustr.)|Gijón ↔ Mieres' },
      ],
    },
    [
      {
        t: 7,
        oc: null,
        label: 'Segregación → Cuenca del Nalón',
        sub: 'anillo cian = segregadas|hacia Langreo / Blimea',
      },
    ],
    'Fibra PROPIA por canalizaciones de la Autovía Minera · Caudal, Aller y Nalón llegan por fibra directa al 7750 de Mieres, sin equipos de transporte. Reparto de tubos ilustrativo; la segregación hacia el Nalón es literal del pliego.',
  ),

  /* the mining valleys */
  cuencas:
    mkSection(
      'Cable propio TRONSCPLEFO32 · 32 ff.oo. · Mieres–Pola de Lena',
      4,
      {
        labels: [{ tubes: [1, 2, 3, 4], text: 'tubos 1–4 · 32 ff propias|Mieres ↔ Pola de Lena' }],
      },
      [
        {
          t: 1,
          oc: null,
          label: 'Tubo tipo · 8 fibras',
          sub: 'colores de fibra según norma TIA-598',
        },
      ],
      '',
    ) +
    SECTION_GAP +
    mkSection(
      'Cable TROMIENSCFO128 · 128 ff.oo. · 16 tubos',
      16,
      {
        access: [16],
        labels: [
          { tubes: [16], color: 'var(--xgs)', text: 'tubo 16|prolongado → VILLALLANA' },
          { tubes: [1, 8], text: 'tubos 1–15|red troncal Mieres|(sin desglose)' },
        ],
      },
      [
        {
          t: 16,
          oc: null,
          label: 'Tubo 16 · prolongado → Villallana',
          sub: 'acceso FTTH de Villallana|desde Pola de Lena',
        },
      ],
      'Morcín: fibra ALQUILADA · Cuenca del Aller: ALQUILADA sobre ferrocarril ADIF Santa Cruz de Mieres–Collanzo; el tramo Collanzo–Felechosa es de otro propietario.',
    ),

  /* own western trunk: real fibre-by-fibre data */
  'troncal-occidental':
    mkSection(
      'Cable CUDILLERO–CASTROPOL · 64 ff.oo. · 8 tubos × 8 fibras (vía ADIF)',
      8,
      {
        access: [4, 5, 6, 7, 8],
        dead: [3],
        /* Tubes 1 and 2 already get a zoom below with the same "transporte
           …" wording and their own leader line to the ring — a second label
           here duplicated it and sat squarely in the path of tube 1's zoom
           leader, so it read as crossed out. Tube 3 keeps its label: it's
           the one ring mark (the dead cross) that isn't self-explanatory
           without it. */
        labels: [
          { tubes: [3], color: 'var(--danger)', text: 'TUBO 3 · SIN SALIDA|segregado en Tapia' },
          {
            tubes: [4, 5, 6, 7, 8],
            color: 'var(--xgs)',
            text: 'TUBOS 4–8 · ACCESO|Pto. Vega · Figueras|· La Caridad',
          },
        ],
      },
      [
        {
          t: 1,
          oc: 2,
          label: 'Tubo 1 · transporte Luarca→Cudillero',
          sub: 'tramas OLT → par alquilado|de Gijón (2 ff.oo.)',
        },
        {
          t: 2,
          oc: 5,
          label: 'Tubo 2/1 · transporte Navia→Luarca',
          sub: 'tubo 1 en Navia · sigue|como tubo 2 en Luarca',
        },
        {
          t: 3,
          nf: true,
          label: 'Tubo 3 · sin salida (segregado en Tapia)',
          sub: 'tubos 3–8 sin fusionar|hacia Cudillero',
        },
      ],
      'Anillo cian = tubos 4–8 de ACCESO, segregados en <b>Puerto de Vega</b> (Navia), <b>Figueras</b> (Castropol) y <b>La Caridad</b> (Tapia) · Tapia–Castropol: 3 oc/5 vac · regeneradores eléctrico-ópticos en Navia, Luarca y Muros · distancias: Castropol–Tapia 19 km · Tapia–Navia 16 · Navia–Luarca 22 · Luarca–Muros 49 · Muros–Gijón 60',
    ) +
    SECTION_GAP +
    mkSection(
      'Cable CASTROPOL–VEGADEO · 96 ff.oo. · 12 tubos × 8 fibras',
      12,
      {
        access: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        labels: [
          { tubes: [12, 1, 2], color: 'var(--xgs)', text: 'TUBOS 1–12 · ACCESO|Vegadeo y Barres' },
        ],
      },
      [{ t: 1, oc: null, label: 'Tubos 1–12 → acceso de Vegadeo y Barres' }],
      '',
    ),

  /* Muros CWDM */
  muros: mkCWDM(
    'Desglose CWDM 8133 de Muros de Nalón → Gijón (colores normalizados por λ)',
    [
      { l: 1471, to: 'OLT Tapia de Casariego' },
      { l: 1491, to: 'OLT Castropol' },
      { l: 1511, free: true },
      { l: 1531, to: 'Hospital de Jarrio' },
      { l: 1551, to: 'Hospital de Jarrio' },
      { l: 1571, to: 'OLT Muros de Nalón' },
      { l: 1591, to: 'OLT Navia' },
      { l: 1611, to: 'OLT Luarca' },
    ],
    'Todas las λ comparten el PAR de <b>2 ff.oo. alquiladas</b> (cable FO GIJÓN–AVILÉS–MUROS–CUDILLERO, ≈60 km) · pérdidas tras filtros: <b>21 dB</b> · ampliable de 8 a 16 canales',
  ),

  /* south-west */
  suroccidente: `${occRow('CWDM 8140 (en el PAO)', 4, 2, CW8)}
    ${mkCWDM(
      'CWDM 8133 en Tineo · canales 5–8 dedicados al Hospital',
      [
        { l: 1551, to: 'Hospital Carmen y Severo Ochoa' },
        { l: 1571, to: 'Hospital Carmen y Severo Ochoa' },
        { l: 1591, to: 'Hospital Carmen y Severo Ochoa' },
        { l: 1611, to: 'Hospital Carmen y Severo Ochoa' },
      ],
      '2× Transmode 5800 cursan las 4 tramas del hospital · otros 2× 5800 llevan las 6 tramas (3+3) de las OLT de Cangas del Narcea',
    )}`,

  /* south-east */
  suroriente: `${occRow('CWDM 8133 · Gijón–Nava–Infiesto–Arriondas–Llanes', 8, 8, CW8)}
    <div style="color:var(--muted);margin-top:6px;padding-left:6px">Transmode 5800 4×1 Gbps sobre fibra alquilada · sin facilidades vacantes: uno de los motivos por los que el contrato permite aportar equipos de transporte nuevos · redundado con el PAO desde Llanes</div>`,

  /* east */
  oriente: `${occRow('CWDM 8133 · Gijón–Llanes–Colombres', 8, 8, CW8)}
    <div style="display:flex;align-items:center;gap:10px;margin-top:10px;padding-left:6px">
    <svg viewBox="0 0 150 34" style="width:150px"><path d="M6,26 C40,26 110,26 144,26" stroke="var(--gpon)" stroke-width="2.5" fill="none" stroke-dasharray="7 6"/><path d="M6,10 C50,-2 100,-2 144,10" stroke="var(--muted)" stroke-width="2" fill="none" stroke-dasharray="2 5"/><text x="75" y="8" fill="var(--muted)" font-size="8" text-anchor="middle">ruta redundante</text><text x="75" y="33" fill="#c99a54" font-size="8" text-anchor="middle">ruta principal</text></svg>
    <span style="color:var(--muted)">Si la principal cae, las tramas del Oriente y Suroriente vuelven al PAO por la segunda ruta desde Llanes</span></div>`,

  /* closing */
  'red-completa': `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <span style="color:var(--txt);min-width:150px">Enlace por OLT hoy</span><svg viewBox="0 0 200 14" style="width:200px"><line x1="0" y1="7" x2="200" y2="7" stroke="var(--gpon)" stroke-width="2"/></svg><span style="color:#c99a54">1 Gbps</span></div>
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:8px">
    <span style="color:var(--txt);min-width:150px">Enlace renovado</span><svg viewBox="0 0 200 14" style="width:200px"><line x1="0" y1="7" x2="200" y2="7" stroke="var(--xgs)" stroke-width="7"/><line x1="0" y1="7" x2="200" y2="7" stroke="var(--xgs)" stroke-width="13" opacity=".2"/></svg><span style="color:var(--xgs-tx)">≥ 10 Gbps extremo a extremo</span></div>
    <div style="color:var(--muted);margin-top:10px">Prioridad a portadores directos vacantes; CWDM o equipos nuevos del adjudicatario donde no los haya · los nodos cabecera pueden encadenar su área</div>`,
};
