# Fuentes

## El pliego

Todo el contenido de Potru procede de un único documento público:

| | |
|---|---|
| Documento | Pliego de Condiciones Técnicas |
| Expediente | **CON 06/2025** |
| Órgano | GIT · Gestión de Infraestructuras Públicas de Telecomunicaciones del Principado de Asturias S.A.U., M.P. |
| Objeto | Renovación del equipamiento electrónico FTTH de la Red Asturcón: GPON → XGS-PON |
| Aprobación | 22-12-2025 |
| Extensión | 460 páginas |
| Publicación | Plataforma de Contratación del Sector Público (PLACSP) |
| Fichero | `DOC20251223135602PCT CON 06_2025.pdf` (54 MB) |

El PDF **no se versiona** en este repositorio por tamaño. Se descarga del anuncio de
licitación en PLACSP.

## De dónde sale cada cosa

- **Datos de red** (52 poblaciones, 24 concejos, 60.051 puntos serviciables, +8.400
  usuarios, 806 PON, 20 nodos primarios, 7 áreas), **inventario OLT y ONT**, **calendario
  de fases y semanas por nodo**, **descripción de troncales y sistemas CWDM**,
  **envolventes de cada nodo** y **poblaciones servidas**: pliego, apartados generales y
  fichas por área.
- **Tarjetas y puertos por OLT**: la columna TARJETAS de cada tabla de equipamiento, más la
  prosa que la acompaña («equipado con 16 tarjetas de 2 puertos GPON GLT2A»). De ahí salen
  `cards`, `cardModel` y `portsPerCard` en `src/data/nodes.json`. Los modelos de tarjeta son
  GLT2A y GLT2B (2 puertos), GLT4A (4 puertos) y las de 8 puertos del Ericsson BLM 1500, que el
  pliego no nombra.
- **Planos** de ubicación, planta y alzados de los 20 nodos y del PAO
  (`public/planos/*.jpg`, 105 imágenes): anexos gráficos del pliego, extraídos con
  `pdfimages -j` del PDF, que los lleva incrustados como JPEG. Se copian tal cual, sin
  recodificar: son los píxeles originales del documento (1891 × 1310 la mayoría de los
  planos; el build legado los servía reducidos a 720 px de ancho). Cada imagen se emparejó
  con su original comparando el contenido, no el título, y se comprobó después contra el
  índice de ilustraciones del pliego.
- **Dos excepciones recompuestas**: en las hojas de ubicación de Muros de Nalón y Tapia de
  Casariego la fotografía aérea del nodo no forma parte del JPEG de fondo, sino que va
  superpuesta como objeto aparte en el PDF. En esas dos se compone la foto sobre su hueco,
  que si no aparece en blanco. En el resto de nodos la foto ya viene dentro de la imagen.
- **Miniaturas** `*-ubicacion-thumb.jpg` (480 px): sólo para las tarjetas del índice de
  nodos, que se ven a 230 px. Las fichas y el modal usan siempre la imagen completa.
- **Distribución de cada sala** (`src/data/rooms.json`): transcrita en metros del plano de planta
  de cada nodo — contorno del recinto, hueco de puerta y cada armario con su ancho, su fondo y su
  rótulo. Los planos de Blimea, Mieres y Tineo se leyeron del PDF a 400 ppp, porque en los JPEG
  de `public/planos/` los rótulos de bastidor son ilegibles. Se modela sólo el recinto de la
  Red Asturcón: lo colindante ajeno (centro de transformación de Hidrocantábrico, sala SCC-BO,
  pasillos) queda como muro ciego. Además del contorno y los armarios se transcriben:
  - `trays`, el recorrido de la **rejiband** que el plano dibuja como banda rayada. No es una
    tirada por fila: los nodos caseta la llevan por el muro del fondo, bajan por la izquierda,
    vuelven por el frente y cierran con un montante cerca de la puerta, y Felechosa dobla ese
    montante. Tineo añade un ramal central y una tirada «por el suelo», e Infiesto una «bajada».
  - `hatches`, las **tapas** de la canaleta de suelo: seis registros de 445 × 595 mm en el pasillo
    de cada caseta («PLANTA SIN SUELO»; no son arquetas, sino las tapas del canal de cables).
  - `vents`, los **huecos para aire acondicionado** del muro izquierdo de las casetas y la
    **salida de aire** que Felechosa rotula en el muro del fondo. El plano da su posición y su
    ancho a lo largo del muro; la altura sobre el suelo no está en el plano y es interpretación.
  - `units` en un armario cuyo rótulo nombra más de un equipo («Repartidor F.O. + TX Cube»,
    «GPON y vídeo», «DWDM y splitter», «Splitter + vídeo · Transmode»): cada uno ocupa su franja
    del bastidor en vez de dibujarse uno solo. Transmode es una plataforma DWDM, así que
    «DWDM y splitter» y «Splitter + vídeo · Transmode» se dibujan con los mismos elementos.
  - El escalado de los planos caseta (4 450 × 2 400 mm) se fijó con dos referencias del propio
    dibujo: el paso de 445 mm de las tapas y los 4,14 m entre caras interiores de muro.
  - **Salas remedidas contra la cadena de cotas de su plano**, porque la transcripción anterior
    no cerraba: Infiesto, Nava, Arriondas y Colombres son la misma caseta de 4 450 × 2 400 mm que
    Navia —interior 4,14 × 2,09 m— y estaban entradas como 4,25/4,17 × 1,89, lo que comía los
    huecos de 0,10–0,30 m entre armarios que el plano acota. Tineo llevaba la puerta en el muro
    izquierdo y el plano la pone en el muro inferior del ala izquierda (1,400 m, doble hoja), con
    las anchuras del Control A.A. y del CGBT intercambiadas y sin el «Alarmas entorno» ni el aire
    acondicionado de esa fila. Cangas era 1,300 m menos profunda de lo que mide el plano —de ahí
    que la OLT baja quedase a 0,30 m de la puerta— y le faltaban la escalera de bajada al sótano y
    la máquina de aire en el techo. Pola de Lena estaba como rectángulo de 4,30 × 5,20 con la
    puerta abajo a la izquierda; mide 4,84 × 6,23 m y se entra por la puerta doble de 1,4 m del
    muro izquierdo. Blimea tenía la puerta en el muro izquierdo y va en el muro inferior del ala
    izquierda. En Mieres los rótulos «BASTIDOR n FRONTAL» son marcas de vista de alzado, no
    bastidores, y se habían transcrito como tres bastidores en mitad de la sala.
    Las cinco salas difíciles (Mieres, Tineo, Blimea, Pola de Lena y Cangas) se releyeron del PDF
    a 400 ppp; la escala de cada una se fijó con dos cotas independientes del propio plano.
  - **Detalle por armario remedido**: en Langreo y en Llanes el Repartidor F.O. tiene 0,6 m de
    fondo y sobresale 0,30 m de la fila —estaba a 0,33 como el resto, que es por qué se veía
    distinto—, Llanes tiene un tercer armario de «Baterías» (0,600 × 0,500) junto al Transporte
    DWDM que faltaba, y Langreo una «Alarma de incendios» de 170 mm. Los dos «Bastidor COGENT» de
    Langreo se dibujan en el plano con arco de puerta, así que se modelan como armario cerrado con
    frente perforado abisagrado, no como bastidor abierto.
- **Discrepancias documentadas en la propia interfaz**: el pliego general cita 5 nodos
  secundarios, pero las fichas por área detallan 9 (Vegadeo, La Caridad y Soto del Barco en
  el Occidente; Cabranes y Villamayor en el Suroriente; El Entrego, Sotrondio, Barredos y
  Pola de Laviana en el Nalón). El sitio muestra 9 y explica la diferencia.
- **Incoherencias del propio pliego**, transcritas tal cual y anotadas en el dato: NVI/1C dice
  «7 tarjetas de 8 puertos» pero su tabla da 44 puertos totales; BLI/1B y BLI/9B registran más
  puertos activos que totales (6/5 y 12/11); y la prosa de MUR/1D dice «48 tarjetas» donde su
  tabla dice 4 (4 × 8 = 32 puertos, que es lo que cuadra).
- **Lo que NO es literal** se marca como tal donde aparece: el reparto de tubos de la
  troncal de la Autovía Minera es ilustrativo (la segregación hacia el Nalón sí es literal),
  los tubos 1–15 del TROMIENSCFO128 figuran sin desglose, y en el visor 3D los acabados, los colores y el
  aspecto de los equipos son interpretación: el plano da huellas y rótulos, no fotografías.

## El build legado

Antes de esta migración el sitio era un solo `asturcon-xgspon.html` de 5,3 MB (versión
`v13 · PAO FOTO`), generado por una cadena de scripts Python (`build_site*.py` +
`patch_v*.py`) que embebía los 105 planos en base64 dentro de un objeto `DATA`.

Ese HTML tampoco se versiona: sería 5,3 MB de base64 duplicado de lo que ya vive en
`public/planos/`.

De él salieron, mediante un extractor de un solo uso (`tools/extract-legacy.mjs`,
recuperable con `git show dd651e1:tools/extract-legacy.mjs`):

- `src/data/nodes.json` — los 20 nodos primarios y el PAO, con cada plano convertido en una
  entrada de galería (ruta relativa + tamaño intrínseco leído del marcador SOF del JPEG).
- `public/planos/*.jpg` — las 105 imágenes. Cuando un nodo repite vista (Tineo tiene dos
  «Alzado derecho») el segundo fichero lleva sufijo `-2`. **Estas imágenes ya no son las que
  salieron del legado**: se sustituyeron por los originales incrustados en el PDF, de mucha
  más resolución (ver arriba).

El extractor localizaba `const DATA = {`, emparejaba llaves hasta el cierre y lo
interpretaba como JSON. **Nunca lo trataba como texto plano**: el pipeline de parches dejó
secuencias `\uXXXX` literales dentro de los strings JS, y sólo se resuelven bien al parsear.

**Ya no está en el árbol y no debe reejecutarse a ciegas**: borraba `public/planos/` entero
y reescribía el JSON, así que hoy destruiría cualquier corrección hecha desde entonces. La
fuente de verdad son el JSON y las imágenes versionados; se editan a mano contra el pliego.

## Atribución y licencia

Los planos, ilustraciones y datos extraídos del pliego son de **GIT**, y quedan excluidos de
la licencia MIT que cubre el código. Ver la sección «Licencia» del [README](../README.md).

Potru es un proyecto independiente, no afiliado a GIT ni al Principado de Asturias.
