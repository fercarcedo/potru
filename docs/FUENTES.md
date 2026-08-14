# Fuentes

## El pliego

Todo el contenido de Potru procede de un único documento público:

| | |
|---|---|
| Documento | Pliego de Condiciones Técnicas |
| Expediente | **CON 06/2025** |
| Órgano | GIT · Gestión de Infraestructuras Públicas de Telecomunicaciones del Principado de Asturias S.A.U., M.P. |
| Objeto | Renovación del equipamiento electrónico FTTH de la red ASTURCON: GPON → XGSPON |
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
- **Planos** de ubicación, planta y alzados de los 20 nodos y del PAO
  (`public/planos/*.jpg`, 105 imágenes): anexos gráficos del pliego.
- **Discrepancias documentadas en la propia interfaz**: el pliego general cita 5 nodos
  secundarios, pero las fichas por área detallan 9 (Vegadeo, La Caridad y Soto del Barco en
  el Occidente; Cabranes y Villamayor en el Suroriente; El Entrego, Sotrondio, Barredos y
  Pola de Laviana en el Nalón). El sitio muestra 9 y explica la diferencia.
- **Lo que NO es literal** se marca como tal donde aparece: el reparto de tubos de la
  troncal de la Autovía Minera es ilustrativo (la segregación hacia el Nalón sí es literal),
  los tubos 1–15 del TROMIENSCFO128 figuran sin desglose, y todo el visor 3D es una
  recreación interpretada a partir de planta y alzados, nunca una fotografía.

## El build legado

Antes de esta migración el sitio era un solo `asturcon-xgspon.html` de 5,3 MB (versión
`v13 · PAO FOTO`), generado por una cadena de scripts Python (`build_site*.py` +
`patch_v*.py`) que embebía los 105 planos en base64 dentro de un objeto `DATA`.

Ese HTML tampoco se versiona: sería 5,3 MB de base64 duplicado de lo que ya vive en
`public/planos/`. Para regenerar el dataset y las imágenes desde él:

```sh
node tools/extract-legacy.mjs "/ruta/a/asturcon-xgspon.html"
node tools/extract-legacy.mjs "/ruta/a/asturcon-xgspon.html" --no-images  # sólo el JSON
```

El extractor localiza `const DATA = {`, empareja llaves hasta el cierre y lo interpreta
como JSON. **Nunca lo trata como texto plano**: el pipeline de parches dejó secuencias
`\uXXXX` literales dentro de los strings JS, y sólo se resuelven bien al parsear.

Escribe:

- `src/data/nodes.json` — los 20 nodos primarios y el PAO, con cada plano convertido en una
  entrada de galería (ruta relativa + tamaño intrínseco leído del marcador SOF del JPEG).
- `public/planos/*.jpg` — las 105 imágenes, byte a byte como venían. No se recodifican ni
  se redimensionan: son material de origen del pliego. Cuando un nodo repite vista (Tineo
  tiene dos «Alzado derecho») el segundo fichero lleva sufijo `-2`.

## Atribución y licencia

Los planos, ilustraciones y datos extraídos del pliego son de **GIT**, y quedan excluidos de
la licencia MIT que cubre el código. Ver la sección «Licencia» del [README](../README.md).

Potru es un proyecto independiente, no afiliado a GIT ni al Principado de Asturias.
