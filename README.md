# Potru

Visor divulgativo de la renovación tecnológica **GPON → XGS-PON** de la **Red Asturcón**,
la red pública FTTH de Asturias, tal y como la describe el Pliego de Condiciones Técnicas del expediente
**CON 06/2025** de GIT, publicado en la Plataforma de Contratación del Sector Público.

> ⓘ **Proyecto independiente**, no afiliado a GIT ni al Principado de Asturias ·
> fuente: pliego público CON 06/2025

_Potru_ es «potro» en asturiano: la siguiente generación del Asturcón.

## Qué hay dentro

- **Diagrama end-to-end** ONT → splitters → OLT → troncal → PAO, conmutable entre la red
  actual y la renovada, con cada elemento explicado.
- **Mapa** de las 7 áreas, 20 nodos primarios, 9 secundarios pasivos y las poblaciones
  servidas, con las troncales propias y alquiladas diferenciadas.
- **Paseo guiado** de 9 paradas que encuadra el mapa y abre el detalle de los cables:
  secciones circulares con los tubos en norma TIA-598, espectro CWDM por longitud de onda,
  ocupación canal a canal y comparativa 1 G / 10 G.
- **Ficha de cada nodo**, en modal y en página propia (`/nodos/<id>`): planos de ubicación,
  planta y alzados del pliego, equipamiento OLT, ONT en servicio, semanas de migración,
  poblaciones y árboles PON compartidos.
- **Gantt** de la Fase 2, semanas 13–58, coloreado por área.
- **Visor 3D a escala** de cada sala: recinto, puerta y armarios colocados según el plano de
  planta, y cada OLT con sus tarjetas y sus puertos GPON reales (activos encendidos). Se recorre
  con WASD, se mira arrastrando y se amplía con la rueda o pellizcando.

## Regla de oro

**Todos los datos salen del pliego.** Nada se inventa. Cuando algo es interpretación o
representación ilustrativa y no un dato literal, se dice en la propia interfaz
(«ilustrativo», «sin desglose en el pliego», «recreación interpretada»). El visor 3D lleva
su aviso en la cabecera: no es una fotografía ni un modelo real del nodo.

## Desarrollo

```sh
npm install
npm run dev      # servidor de desarrollo
npm run build    # sitio estático en dist/
npm run preview  # sirve dist/ tal y como quedará publicado
npm run check    # astro check (tipos y plantillas)
```

Requiere Node 24 (ver `.nvmrc`).

### Arquitectura

Astro estático, sin JavaScript de servidor. Se construye **en build** todo lo determinista:
secciones estáticas, tarjetas de nodo, enlaces de actuaciones, gantt, los 9 paneles de
cable y las 21 páginas de ficha. Sólo son islas de cliente el diagrama con su toggle, el
mapa y el paseo, el modal y el visor 3D, que además descarga `three` bajo demanda.

```
src/data/nodes.json     los 20 nodos + el PAO, con tarjetas y puertos por OLT
src/data/rooms.json     planta de cada sala: recinto, puerta y armarios, en metros
src/data/content.json   copia del pliego que no es por nodo: hero, arquitectura, paseo, PAO…
src/lib/graphics.ts     generadores SVG puros (CWDM, secciones, ocupación, PAO, gantt)
src/lib/details.ts      los paneles del paseo, compuestos en build, indexados por parada
src/scripts/            islas: diagrama, mapa, paseo, modal, visor 3D
public/planos/          los 105 planos del pliego a resolución original + miniaturas
```

### Los datos

`src/data/nodes.json`, `src/data/rooms.json` y `public/planos/` son la fuente de verdad: se
editan aquí, a mano y contra el pliego. `nodes.json` incluye, por cada OLT, las tarjetas y los
puertos GPON que da su tabla de equipamiento; `rooms.json` transcribe en metros el plano de
planta de cada nodo, y es lo que dibuja el visor 3D. Nacieron de un extractor de un solo uso que leyó el build legado; ese
extractor ya no está en el árbol —cumplió su función y volver a ejecutarlo hoy machacaría
cualquier corrección posterior—, pero sigue recuperable en el commit `dd651e1`:

```sh
git show dd651e1:tools/extract-legacy.mjs
```

Ver [`docs/FUENTES.md`](docs/FUENTES.md).

## Despliegue

GitHub Pages como sitio de proyecto: `https://fercarcedo.github.io/potru/`. El workflow
`.github/workflows/deploy.yml` construye y publica en cada push a `main`. Como el sitio
cuelga de `/potru/`, todo enlace o recurso propio pasa por `import.meta.env.BASE_URL`.

## Licencia

El **código** de este repositorio se publica bajo licencia [MIT](LICENSE).

**Quedan excluidos de esa licencia** los planos, ilustraciones y datos extraídos del pliego
de condiciones técnicas —en particular todo el contenido de `public/planos/` y los conjuntos
de datos de `src/data/nodes.json` y `src/data/rooms.json`—, cuya autoría corresponde a **GIT · Gestión de
Infraestructuras Públicas de Telecomunicaciones del Principado de Asturias S.A.U., M.P.**
Se reproducen aquí por su carácter de documentación pública de contratación, con fines
divulgativos y con atribución a su origen.
