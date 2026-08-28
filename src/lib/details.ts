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
 *
 * `details(locale)` resolves this module's own bilingual titles/labels/feet
 * (a `Bi` literal per string, the same nesting convention as content.json
 * and nodes.json) and threads the locale into every generator call, so the
 * few words those generators draw themselves (VACANTE/FREE, ocupadas/used…)
 * come out consistent with the prose around them.
 */
import { t, type Bi, paoTransport } from './data';
import { CW8, mkCWDM, mkPAO, mkSection, occRow } from './graphics';
import { escapeHtml as esc } from './escape-html';
import type { Locale } from '../i18n/types';

const tt = (es: string, en: string): Bi => ({ es, en });

/* Two mkSection cuts stacked in the same panel: each SVG's own bottom
   padding varies with how much its zooms and labels fill it, so back to
   back they can end up touching. A fixed gap between them beats relying on
   that leftover space to be enough. */
const SECTION_GAP = '<div style="height:28px"></div>';

export function details(locale: Locale = 'es'): Record<string, string> {
  const s = (b: Bi) => t(b, locale);

  return {
    /* PAO: unified panel, in the same visual language as the sections. */
    pao: mkPAO(paoTransport(locale), locale),

    'autovia-minera': mkSection(
      s(
        tt(
          'Troncal propia · Autovía AS-I Mieres–Gijón (corte esquemático)',
          'Own trunk · AS-I motorway Mieres–Gijón (schematic cross-section)',
        ),
      ),
      8,
      {
        access: [6, 7, 8],
        labels: [
          {
            tubes: [6, 7, 8],
            color: 'var(--xgs)',
            text: s(
              tt('tubos 6–8|SEGREGACIÓN →|Cuenca del Nalón', 'tubes 6–8|SPLIT OFF →|Nalón basin'),
            ),
          },
          {
            tubes: [1, 2, 3, 4, 5],
            text: s(
              tt('tubos 1–5 (ilustr.)|Gijón ↔ Mieres', 'tubes 1–5 (illustr.)|Gijón ↔ Mieres'),
            ),
          },
        ],
      },
      [
        {
          t: 7,
          oc: null,
          label: s(tt('Segregación → Cuenca del Nalón', 'Split-off → Nalón basin')),
          sub: s(
            tt(
              'anillo cian = segregadas|hacia Langreo / Blimea',
              'cyan ring = split off|toward Langreo / Blimea',
            ),
          ),
        },
      ],
      s(
        tt(
          'Fibra PROPIA por canalizaciones de la Autovía Minera · Caudal, Aller y Nalón llegan por fibra directa al 7750 de Mieres, sin equipos de transporte. Reparto de tubos ilustrativo; la segregación hacia el Nalón es literal del pliego.',
          'OWN fibre through the Autovía Minera ducting · Caudal, Aller and Nalón reach the Mieres 7750 over direct fibre, with no transport equipment. Tube allocation is illustrative; the split toward the Nalón is literal from the pliego.',
        ),
      ),
      locale,
    ),

    /* the mining valleys */
    cuencas:
      mkSection(
        s(
          tt(
            'Cable propio TRONSCPLEFO32 · 32 ff.oo. · Mieres–Pola de Lena',
            'Own cable TRONSCPLEFO32 · 32 fibres · Mieres–Pola de Lena',
          ),
        ),
        4,
        {
          labels: [
            {
              tubes: [1, 2, 3, 4],
              text: s(
                tt(
                  'tubos 1–4 · 32 ff propias|Mieres ↔ Pola de Lena',
                  'tubes 1–4 · 32 own fibres|Mieres ↔ Pola de Lena',
                ),
              ),
            },
          ],
        },
        [
          {
            t: 1,
            oc: null,
            label: s(tt('Tubo tipo · 8 fibras', 'Typical tube · 8 fibres')),
            sub: s(
              tt('colores de fibra según norma TIA-598', 'fibre colours per the TIA-598 standard'),
            ),
          },
        ],
        '',
        locale,
      ) +
      SECTION_GAP +
      mkSection(
        s(
          tt(
            'Cable TROMIENSCFO128 · 128 ff.oo. · 16 tubos',
            'Cable TROMIENSCFO128 · 128 fibres · 16 tubes',
          ),
        ),
        16,
        {
          access: [16],
          labels: [
            {
              tubes: [16],
              color: 'var(--xgs)',
              text: s(tt('tubo 16|prolongado → VILLALLANA', 'tube 16|extended → VILLALLANA')),
            },
            {
              tubes: [1, 8],
              text: s(
                tt(
                  'tubos 1–15|red troncal Mieres|(sin desglose)',
                  'tubes 1–15|Mieres trunk network|(no breakdown)',
                ),
              ),
            },
          ],
        },
        [
          {
            t: 16,
            oc: null,
            label: s(tt('Tubo 16 · prolongado → Villallana', 'Tube 16 · extended → Villallana')),
            sub: s(
              tt(
                'acceso FTTH de Villallana|desde Pola de Lena',
                'Villallana FTTH access|from Pola de Lena',
              ),
            ),
          },
        ],
        s(
          tt(
            'Morcín: fibra ALQUILADA · Cuenca del Aller: ALQUILADA sobre ferrocarril ADIF Santa Cruz de Mieres–Collanzo; el tramo Collanzo–Felechosa es de otro propietario.',
            'Morcín: LEASED fibre · Aller basin: LEASED over the ADIF Santa Cruz de Mieres–Collanzo railway; the Collanzo–Felechosa stretch belongs to another owner.',
          ),
        ),
        locale,
      ),

    /* own western trunk: real fibre-by-fibre data */
    'troncal-occidental':
      mkSection(
        s(
          tt(
            'Cable CUDILLERO–CASTROPOL · 64 ff.oo. · 8 tubos × 8 fibras (vía ADIF)',
            'Cable CUDILLERO–CASTROPOL · 64 fibres · 8 tubes × 8 fibres (via ADIF)',
          ),
        ),
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
            {
              tubes: [3],
              color: 'var(--danger)',
              text: s(
                tt(
                  'TUBO 3 · SIN SALIDA|segregado en Tapia',
                  'TUBE 3 · DEAD END|split off in Tapia',
                ),
              ),
            },
            {
              tubes: [4, 5, 6, 7, 8],
              color: 'var(--xgs)',
              text: s(
                tt(
                  'TUBOS 4–8 · ACCESO|Pto. Vega · Figueras|· La Caridad',
                  'TUBES 4–8 · ACCESS|Pto. Vega · Figueras|· La Caridad',
                ),
              ),
            },
          ],
        },
        [
          {
            t: 1,
            oc: 2,
            label: s(
              tt('Tubo 1 · transporte Luarca→Cudillero', 'Tube 1 · transport Luarca→Cudillero'),
            ),
            sub: s(
              tt(
                'tramas OLT → par alquilado|de Gijón (2 ff.oo.)',
                'OLT frames → leased pair|to Gijón (2 fibres)',
              ),
            ),
          },
          {
            t: 2,
            oc: 5,
            label: s(tt('Tubo 2/1 · transporte Navia→Luarca', 'Tube 2/1 · transport Navia→Luarca')),
            sub: s(
              tt(
                'tubo 1 en Navia · sigue|como tubo 2 en Luarca',
                'tube 1 in Navia · continues|as tube 2 in Luarca',
              ),
            ),
          },
          {
            t: 3,
            nf: true,
            label: s(
              tt(
                'Tubo 3 · sin salida (segregado en Tapia)',
                'Tube 3 · dead end (split off in Tapia)',
              ),
            ),
            sub: s(
              tt('tubos 3–8 sin fusionar|hacia Cudillero', 'tubes 3–8 unspliced|toward Cudillero'),
            ),
          },
        ],
        s(
          tt(
            'Anillo cian = tubos 4–8 de ACCESO, segregados en <b>Puerto de Vega</b> (Navia), <b>Figueras</b> (Castropol) y <b>La Caridad</b> (Tapia) · Tapia–Castropol: 3 oc/5 vac · regeneradores eléctrico-ópticos en Navia, Luarca y Muros · distancias: Castropol–Tapia 19 km · Tapia–Navia 16 · Navia–Luarca 22 · Luarca–Muros 49 · Muros–Gijón 60',
            'Cyan ring = tubes 4–8 for ACCESS, split off in <b>Puerto de Vega</b> (Navia), <b>Figueras</b> (Castropol) and <b>La Caridad</b> (Tapia) · Tapia–Castropol: 3 used/5 free · electro-optical regenerators in Navia, Luarca and Muros · distances: Castropol–Tapia 19 km · Tapia–Navia 16 · Navia–Luarca 22 · Luarca–Muros 49 · Muros–Gijón 60',
          ),
        ),
        locale,
      ) +
      SECTION_GAP +
      mkSection(
        s(
          tt(
            'Cable CASTROPOL–VEGADEO · 96 ff.oo. · 12 tubos × 8 fibras',
            'Cable CASTROPOL–VEGADEO · 96 fibres · 12 tubes × 8 fibres',
          ),
        ),
        12,
        {
          access: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          labels: [
            {
              tubes: [12, 1, 2],
              color: 'var(--xgs)',
              text: s(
                tt(
                  'TUBOS 1–12 · ACCESO|Vegadeo y Barres',
                  'TUBES 1–12 · ACCESS|Vegadeo and Barres',
                ),
              ),
            },
          ],
        },
        [
          {
            t: 1,
            oc: null,
            label: s(
              tt(
                'Tubos 1–12 → acceso de Vegadeo y Barres',
                'Tubes 1–12 → Vegadeo and Barres access',
              ),
            ),
          },
        ],
        '',
        locale,
      ),

    /* Muros CWDM */
    muros: mkCWDM(
      s(
        tt(
          'Desglose CWDM 8133 de Muros de Nalón → Gijón (colores normalizados por λ)',
          'CWDM 8133 breakdown, Muros de Nalón → Gijón (colours normalised by λ)',
        ),
      ),
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
      s(
        tt(
          'Todas las λ comparten el PAR de <b>2 ff.oo. alquiladas</b> (cable FO GIJÓN–AVILÉS–MUROS–CUDILLERO, ≈60 km) · pérdidas tras filtros: <b>21 dB</b> · ampliable de 8 a 16 canales',
          'All λ share the <b>2 leased fibres</b> pair (cable FO GIJÓN–AVILÉS–MUROS–CUDILLERO, ≈60 km) · losses after filters: <b>21 dB</b> · expandable from 8 to 16 channels',
        ),
      ),
      locale,
    ),

    /* south-west */
    suroccidente: `${occRow(s(tt('CWDM 8140 (en el PAO)', 'CWDM 8140 (at the PAO)')), 4, 2, CW8, locale)}
    ${mkCWDM(
      s(
        tt(
          'CWDM 8133 en Tineo · canales 5–8 dedicados al Hospital',
          'CWDM 8133 in Tineo · channels 5–8 dedicated to the Hospital',
        ),
      ),
      [
        { l: 1551, to: 'Hospital Carmen y Severo Ochoa' },
        { l: 1571, to: 'Hospital Carmen y Severo Ochoa' },
        { l: 1591, to: 'Hospital Carmen y Severo Ochoa' },
        { l: 1611, to: 'Hospital Carmen y Severo Ochoa' },
      ],
      s(
        tt(
          '2× Transmode 5800 cursan las 4 tramas del hospital · otros 2× 5800 llevan las 6 tramas (3+3) de las OLT de Cangas del Narcea',
          "2× Transmode 5800 units carry the hospital's 4 frames · another 2× 5800 units carry the 6 frames (3+3) of the Cangas del Narcea OLTs",
        ),
      ),
      locale,
    )}`,

    /* south-east: Tabla 65/70/74 of the pliego — the same table, verbatim, in
       the fiches of Arriondas, Nava and Llanes — lado W (direct route through
       the interior); lado E duplicates it channel for channel over the coastal
       route via Llanes, so only one side is drawn */
    suroriente: mkCWDM(
      s(
        tt(
          'CWDM 8133 · Gijón–Nava–Infiesto–Arriondas–Llanes (lado W · ruta directa)',
          'CWDM 8133 · Gijón–Nava–Infiesto–Arriondas–Llanes (side W · direct route)',
        ),
      ),
      [
        { l: 1511, to: 'OLT Colombres' },
        {
          l: 1531,
          to: s(tt('Hospital Grande Covián · Anillo 7', 'Hospital Grande Covián · Ring 7')),
        },
        {
          l: 1551,
          to: s(tt('Hospital Grande Covián · Anillo 7', 'Hospital Grande Covián · Ring 7')),
        },
        { l: 1571, to: 'OLT Llanes' },
        { l: 1471, to: 'OLT Llanes' },
        { l: 1491, to: s(tt('OLT Arriondas · redundante', 'OLT Arriondas · redundant')) },
        { l: 1591, to: s(tt('OLT Infiesto · redundante', 'OLT Infiesto · redundant')) },
        { l: 1611, to: s(tt('OLT Nava · redundante', 'OLT Nava · redundant')) },
      ],
      s(
        tt(
          'Redundado en dos lados idénticos: <b>lado W</b> (interior, el de arriba) y <b>lado E</b> (costa, vía Llanes) · sin facilidades vacantes de portadores ni de transporte · los canales 2–3 alimentan además un anillo local (2× Transmode 5810, «Anillo 7») exclusivo para el Hospital Grande Covián de Arriondas',
          'Redundant across two identical sides: <b>side W</b> (interior, the one above) and <b>side E</b> (coast, via Llanes) · no vacant carrier or transport facilities · channels 2–3 also feed a local ring (2× Transmode 5810, "Ring 7") dedicated to the Hospital Grande Covián in Arriondas',
        ),
      ),
      locale,
    ),

    /* east: Colombres' own fiche names a DIFFERENT, smaller CWDM for its link
       to Llanes — not the shared 8133 above. The pliego's own PAO equipment
       summary lists «Área Oriental: CWDM 8133, 8 canales, todos ocupados»,
       identical wording to the Suroriental line above; that reads as the
       general chapter re-using boilerplate rather than a second literal 8133,
       since Colombres' own equipment section — more specific — names a
       smaller, distinct device. Transcribed as the node fiche states it. */
    oriente:
      mkCWDM(
        s(
          tt(
            'CWDM 8140 · Llanes–Colombres (lado E) · ruta redundante de Colombres',
            'CWDM 8140 · Llanes–Colombres (side E) · Colombres redundant route',
          ),
        ),
        [
          { l: 1471, free: true },
          { l: 1491, to: s(tt('OLT Colombres · redundante', 'OLT Colombres · redundant')) },
          { l: 1591, free: true },
          { l: 1611, to: s(tt('OLT Colombres · redundante', 'OLT Colombres · redundant')) },
        ],
        s(
          tt(
            'Enfrentado con un CWDM 8140 (lado W) en Llanes · el enlace PRINCIPAL de Colombres va por el canal 1 del CWDM 8133 compartido con el Suroriente (panel anterior) — este 8140 es solo la ruta de respaldo · canales 5–8 en la misma rejilla de longitudes de onda que la tabla anterior, la ficha de Colombres no repite los nm · <b>el resumen general de equipos del PAO da esta área como «CWDM 8133, 8 canales, todos ocupados» — la misma cifra que el Suroriente; aquí se transcribe el dato de la ficha del propio nodo, más específico</b>',
            "Mirrored by a CWDM 8140 (side W) in Llanes · Colombres' MAIN link runs over channel 1 of the CWDM 8133 shared with the Southeast (previous panel) — this 8140 is only the backup route · channels 5–8 sit on the same wavelength grid as the previous table, and Colombres' own fiche does not repeat the nm values · <b>the PAO's general equipment summary lists this area as \"CWDM 8133, 8 channels, all occupied\" — the same figure as the Southeast; the figure transcribed here is the more specific one from the node's own fiche</b>",
          ),
        ),
        locale,
      ) +
      `<div style="display:flex;align-items:center;gap:10px;margin-top:14px;padding-left:8px">
    <svg viewBox="0 0 150 34" style="width:150px"><path d="M6,26 C40,26 110,26 144,26" stroke="var(--gpon)" stroke-width="2.5" fill="none" stroke-dasharray="7 6"/><path d="M6,10 C50,-2 100,-2 144,10" stroke="var(--muted)" stroke-width="2" fill="none" stroke-dasharray="2 5"/><text x="75" y="8" fill="var(--muted)" font-size="8" text-anchor="middle">${esc(s(tt('ruta redundante', 'redundant route')))}</text><text x="75" y="33" fill="#c99a54" font-size="8" text-anchor="middle">${esc(s(tt('ruta principal', 'main route')))}</text></svg>
    <span style="color:var(--muted)">${esc(
      s(
        tt(
          'Si la principal cae, las tramas del Oriente y Suroriente vuelven al PAO por la segunda ruta desde Llanes',
          "If the main route fails, the East's and Southeast's frames return to the PAO over the second route from Llanes",
        ),
      ),
    )}</span></div>`,

    /* closing */
    'red-completa': `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <span style="color:var(--txt);min-width:150px">${esc(s(tt('Enlace por OLT hoy', 'Link per OLT today')))}</span><svg viewBox="0 0 200 14" style="width:200px"><line x1="0" y1="7" x2="200" y2="7" stroke="var(--gpon)" stroke-width="2"/></svg><span style="color:#c99a54">1 Gbps</span></div>
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:8px">
    <span style="color:var(--txt);min-width:150px">${esc(s(tt('Enlace renovado', 'Renewed link')))}</span><svg viewBox="0 0 200 14" style="width:200px"><line x1="0" y1="7" x2="200" y2="7" stroke="var(--xgs)" stroke-width="7"/><line x1="0" y1="7" x2="200" y2="7" stroke="var(--xgs)" stroke-width="13" opacity=".2"/></svg><span style="color:var(--xgs-tx)">${esc(s(tt('≥ 10 Gbps extremo a extremo', '≥ 10 Gbps end to end')))}</span></div>
    <div style="color:var(--muted);margin-top:10px">${esc(
      s(
        tt(
          'Prioridad a portadores directos vacantes; CWDM o equipos nuevos del adjudicatario donde no los haya · los nodos cabecera pueden encadenar su área',
          'Priority to vacant direct carriers; CWDM or new contractor equipment where none are available · headend nodes may chain their area',
        ),
      ),
    )}</div>`,
  };
}
