/**
 * Trazado y paradas de las líneas de transporte público del entorno de
 * Barcelona, desde OpenStreetMap vía Overpass.
 *
 * Dos capas, con criterios distintos a propósito:
 *
 *   FERROVIARIA  metro, FGC, Rodalies y tranvía. Se dibuja entera: son ~40
 *                líneas y son las que mueven gente a distancia.
 *
 *   BUS          NO todas. En el encuadre hay 1.312 relaciones de ruta de bus
 *                (670 pares operador+línea distintos): dibujarlas sería una
 *                mancha ilegible de varios MB. Se quedan solo las que aparecen
 *                en algún itinerario óptimo de `transit.json`, es decir las que
 *                de verdad forman parte de un trayecto que alguien haría. Cada
 *                línea dibujada se justifica sola.
 *
 * Se descarta la larga distancia (AVE, Ouigo, Iryo, Alvia, SNCF): comparte vía
 * con Rodalies pero no es transporte de cercanías, y confunde el mapa.
 *
 * Salida: linies.json → { generat, bbox, linies: [...], parades: [...] }
 *
 * Las respuestas crudas de Overpass se cachean en _work/, que está en
 * .gitignore: volver a lanzarlo no vuelve a descargar. Usa --fresh para forzar.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";

const HERE = new URL("./", import.meta.url);
const WORK = new URL("./_work/", HERE);
if (!existsSync(WORK)) mkdirSync(WORK, { recursive: true });
const FRESH = process.argv.includes("--fresh");

/* El encuadre del mapa: la bbox de municipis-geo.json, con un margen de ~0,08°
   para que las líneas no se corten justo en el borde visible. */
const BBOX = [41.18, 1.63, 41.77, 2.58];   // S, W, N, E

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

/** Overpass con reintentos, endpoints de respaldo y caché en disco.
    Mismo patrón que fetch-estacions.mjs: GET con User-Agent propio (a un POST
    pelado responde 406) y espera larga si contesta 429/504, que es lo normal
    en las instancias públicas. */
async function overpass(nom, ql) {
  const cau = new URL(`overpass-${nom}.json`, WORK);
  if (!FRESH && existsSync(cau)) {
    console.error(`· ${nom}: de la caché`);
    return JSON.parse(readFileSync(cau, "utf8"));
  }
  for (const ep of ENDPOINTS) {
    for (let intent = 1; intent <= 3; intent++) {
      try {
        console.error(`→ ${nom}: ${ep} (intento ${intent})`);
        const res = await fetch(`${ep}?data=${encodeURIComponent(ql)}`, {
          headers: { "User-Agent": "simple-webs/transporte-publico (github.com/netraular/simple-webs)" },
        });
        if (res.status === 429 || res.status === 504) {
          console.error("  ocupado, espero 25 s");
          await new Promise(r => setTimeout(r, 25000));
          continue;
        }
        if (!res.ok) { console.error(`  ${res.status}, siguiente endpoint`); break; }
        const txt = await res.text();
        writeFileSync(cau, txt);
        console.error(`  ${(txt.length / 1024).toFixed(0)} KB`);
        return JSON.parse(txt);
      } catch (e) {
        console.error(`  ${e.message}`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
  throw new Error(`ningún endpoint de Overpass respondió para ${nom}`);
}

/* --------------------------------------------------------------------------
   Clasificación
   -------------------------------------------------------------------------- */

/** Larga distancia: comparte infraestructura con Rodalies pero no es cercanías. */
const LLARGA = /ave|ouigo|iryo|alvia|avlo|euromed|talgo|intercity|sncf|tgv|trenhotel/i;

/** Red legible a partir de las etiquetas de la relación. null = no nos interesa. */
function xarxa(t) {
  const blob = [t.network, t.operator, t.brand, t.name, t.ref].filter(Boolean).join(" ");
  if (LLARGA.test(blob)) return null;
  if (t.route === "tram" || t.route === "light_rail") return "Tram";
  if (t.route === "subway") return "Metro";
  if (t.route === "bus") return "Bus";
  // Los funiculares no son una red aparte para quien los usa: el de Vallvidrera
  // (FV) es de FGC y va en su plano; el de Montjuïc (FM) es de TMB y sale en el
  // del metro, y de hecho aparece en itinerarios reales. Se clasifican por
  // operador, no por tecnología.
  //
  // El del Tibidabo (FT) lo opera Barcelona de Serveis Municipals: sube a un
  // parque de atracciones y no es transporte de cercanías. Fuera, por el mismo
  // criterio que la larga distancia. Meterlo en "Metro" —que es lo que hacía el
  // comodín anterior— era sencillamente falso.
  if (t.route === "funicular") {
    if (/fgc|ferrocarrils de la generalitat/i.test(blob)) return "FGC";
    if (/tmb|transports metropolitans|metro de barcelona/i.test(blob)) return "Metro";
    return null;
  }
  if (t.route === "train") {
    if (/fgc|ferrocarrils de la generalitat/i.test(blob)) return "FGC";
    if (/rodalies|renfe|cercan/i.test(blob)) return "Rodalies";
    return null;               // tren sin operador reconocible: fuera
  }
  return null;
}

/* --------------------------------------------------------------------------
   Geometría
   -------------------------------------------------------------------------- */

const R5 = (v) => Math.round(v * 1e5) / 1e5;
const mateix = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;

/** Encadena los `way` de la relación en polilíneas continuas.
    Los miembros vienen en orden de recorrido pero cada tramo puede estar
    digitalizado al revés; y en las relaciones mal mantenidas hay saltos. En vez
    de forzar un único trazo (que dibujaría rectas fantasma a través del mapa),
    cada salto abre un segmento nuevo: el hueco se ve, que es lo honesto. */
function encadena(members) {
  const segs = [];
  let cur = null;
  for (const m of members) {
    if (m.type !== "way" || !m.geometry) continue;
    if (m.role && m.role !== "" && m.role !== "forward" && m.role !== "backward") continue;
    const g = m.geometry.filter(p => p && p.lat != null).map(p => [p.lon, p.lat]);
    if (g.length < 2) continue;
    if (!cur) { cur = g; continue; }
    const fi = cur[cur.length - 1];
    if (mateix(fi, g[0]))                      cur.push(...g.slice(1));
    else if (mateix(fi, g[g.length - 1]))      cur.push(...g.slice(0, -1).reverse());
    else { segs.push(cur); cur = g; }
  }
  if (cur) segs.push(cur);
  return segs.filter(s => s.length >= 2);
}

/** Douglas-Peucker con la longitud corregida por el coseno de la latitud, para
    que la tolerancia sea métrica de verdad y no "grados", que en longitud valen
    un 25 % menos que en latitud a esta altura del mundo. */
function simplifica(pts, tolM) {
  if (pts.length <= 2) return pts;
  const kx = Math.cos(41.45 * Math.PI / 180);
  const tol = tolM / 111320;                       // grados de latitud
  const d2 = (p, a, b) => {
    let [px, py] = [(p[0] - a[0]) * kx, p[1] - a[1]];
    const [bx, by] = [(b[0] - a[0]) * kx, b[1] - a[1]];
    const ll = bx * bx + by * by;
    if (ll > 0) {
      const t = Math.max(0, Math.min(1, (px * bx + py * by) / ll));
      px -= bx * t; py -= by * t;
    }
    return px * px + py * py;
  };
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const pila = [[0, pts.length - 1]];
  while (pila.length) {
    const [i, j] = pila.pop();
    let best = -1, bd = tol * tol;
    for (let k = i + 1; k < j; k++) {
      const d = d2(pts[k], pts[i], pts[j]);
      if (d > bd) { bd = d; best = k; }
    }
    if (best > 0) { keep[best] = 1; pila.push([i, best], [best, j]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const dins = ([lon, lat]) =>
  lat >= BBOX[0] && lat <= BBOX[2] && lon >= BBOX[1] && lon <= BBOX[3];

/** Punto exacto donde el segmento a→b cruza el borde del encuadre (a dentro,
    b fuera). Se toma el primer corte, que es el que toca el borde. */
function talla(a, b) {
  const [S, W, N, E] = BBOX;
  let t = 1;
  const cand = (num, den) => {
    if (den === 0) return;
    const u = num / den;
    if (u >= 0 && u < t) t = u;
  };
  if (b[1] > N) cand(N - a[1], b[1] - a[1]);
  if (b[1] < S) cand(S - a[1], b[1] - a[1]);
  if (b[0] > E) cand(E - a[0], b[0] - a[0]);
  if (b[0] < W) cand(W - a[0], b[0] - a[0]);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Recorta al encuadre partiendo en trozos. El trazo llega justo hasta el borde
    — interpolando el cruce, no quedándose con el vértice de fuera, que podía
    sobresalir más de 150 m — y así no se queda colgando a media pantalla ni se
    sale del lienzo. */
function retalla(seg) {
  const out = [];
  let cur = null;
  for (let i = 0; i < seg.length; i++) {
    if (dins(seg[i])) {
      if (!cur) { cur = []; if (i > 0) cur.push(talla(seg[i], seg[i - 1])); }
      cur.push(seg[i]);
    } else if (cur) {
      cur.push(talla(cur[cur.length - 1], seg[i]));
      out.push(cur); cur = null;
    }
  }
  if (cur) out.push(cur);
  return out.filter(s => s.length >= 2);
}

/* --------------------------------------------------------------------------
   Montaje de una capa
   -------------------------------------------------------------------------- */

const linies = [];
const parades = [];
const idxParada = new Map();            // "lat,lon" -> índice en `parades`

function afegeixParada(nom, lat, lon, xar) {
  const k = `${R5(lat)},${R5(lon)}`;
  let i = idxParada.get(k);
  if (i == null) {
    i = parades.length;
    parades.push({ nom: nom || null, lat: R5(lat), lon: R5(lon), xarxes: [] });
    idxParada.set(k, i);
  }
  const p = parades[i];
  if (!p.nom && nom) p.nom = nom;
  if (xar && !p.xarxes.includes(xar)) p.xarxes.push(xar);
  return i;
}

/**
 * @param els      relaciones de Overpass con `out geom`
 * @param nodes    Map nodeId -> {nom, lat, lon} (de la segunda consulta)
 * @param tolM     tolerancia de simplificación en metros
 * @param accepta  filtro extra por relación (para quedarse solo con unos refs)
 * @param ambParades  guardar la lista de paradas. Para el bus va en false: son
 *                 ~4.500 paradas que pesan más que todos los trazados juntos y
 *                 que, dibujadas, serían una nube de puntos ilegible. De un bus
 *                 interesa por dónde pasa, no dónde para exactamente.
 */
function muntaCapa(els, nodes, tolM, accepta = () => true, ambParades = true) {
  // Una línea tiene varias relaciones: ida, vuelta y variantes de servicio. Nos
  // quedamos con la variante de trazado más largo, que es la que dibuja la
  // línea entera; las cortas son refuerzos que ya quedan por debajo.
  const grups = new Map();
  for (const e of els) {
    const t = e.tags || {};
    const xar = xarxa(t);
    if (!xar || !t.ref || !accepta(t, xar)) continue;
    const segs = encadena(e.members || []).flatMap(retalla);
    const n = segs.reduce((a, s) => a + s.length, 0);
    if (!n) continue;
    const clau = `${xar}|${t.ref}`;
    const prev = grups.get(clau);
    if (!prev || n > prev.n) grups.set(clau, { e, t, xar, segs, n });
  }

  for (const [clau, g] of [...grups].sort((a, b) => a[0].localeCompare(b[0]))) {
    const punts = g.segs
      .map(s => simplifica(s, tolM).map(([lo, la]) => [R5(lo), R5(la)]))
      .filter(s => s.length >= 2);
    if (!punts.length) continue;

    // Paradas: los miembros con rol stop/platform, en orden de recorrido y sin
    // repetir (OSM suele poner el nodo `stop` y el `platform` de la misma parada).
    const vistes = new Set(), pIdx = [];
    for (const m of (ambParades ? g.e.members || [] : [])) {
      if (m.type !== "node") continue;
      if (!/^(stop|platform)/.test(m.role || "")) continue;
      const nd = nodes.get(m.ref);
      const lat = nd?.lat ?? m.lat, lon = nd?.lon ?? m.lon;
      if (lat == null || lon == null || !dins([lon, lat])) continue;
      const i = afegeixParada(nd?.nom, lat, lon, g.xar);
      const nomK = parades[i].nom || `#${i}`;
      if (vistes.has(nomK)) continue;
      vistes.add(nomK);
      pIdx.push(i);
    }

    linies.push({
      ref: g.t.ref,
      xarxa: g.xar,
      nom: g.t.name || null,
      operador: g.t.operator || null,
      color: g.t.colour || g.t.color || null,   // de OSM; la página no lo usa (ver SOURCES)
      punts,
      parades: pIdx,
    });
  }
}

/* --------------------------------------------------------------------------
   1. Capa ferroviaria
   -------------------------------------------------------------------------- */

const [S, W, N, E] = BBOX;
const bb = `${S},${W},${N},${E}`;

const relsFerro = await overpass("ferro", `[out:json][timeout:300];
rel["type"="route"]["route"~"^(subway|light_rail|tram|train|funicular)$"](${bb});
out geom;`);

const nodesFerro = await overpass("ferro-nodes", `[out:json][timeout:300];
rel["type"="route"]["route"~"^(subway|light_rail|tram|train|funicular)$"](${bb})->.r;
node(r.r);
out body;`);

function mapaNodes(json) {
  const m = new Map();
  for (const el of json.elements || []) {
    if (el.type !== "node") continue;
    m.set(el.id, { nom: el.tags?.name || null, lat: el.lat, lon: el.lon });
  }
  return m;
}

const nodes = mapaNodes(nodesFerro);
muntaCapa(relsFerro.elements || [], nodes, 25);
const nFerro = linies.length;
console.error(`✓ ferroviaria: ${nFerro} líneas`);

/* --------------------------------------------------------------------------
   2. Capa de bus — solo las líneas que aparecen en algún itinerario
   -------------------------------------------------------------------------- */

let refsBus = new Set();
try {
  const tr = JSON.parse(readFileSync(new URL("./transit.json", HERE), "utf8"));
  for (const bloc of [tr.municipis || {}, tr.barris || {}]) {
    for (const v of Object.values(bloc)) {
      for (const d of Object.values(v.destins || {})) {
        for (const l of d?.linies || []) {
          if (l.xarxa === "Bus" && l.ref) refsBus.add(String(l.ref).toUpperCase());
        }
      }
    }
  }
} catch {
  console.error("! no hay transit.json todavía: me salto la capa de bus");
}

if (refsBus.size) {
  console.error(`· buses en algún itinerario: ${refsBus.size} refs`);
  const relsBus = await overpass("bus", `[out:json][timeout:600];
rel["type"="route"]["route"="bus"](${bb});
out geom;`);
  const nodesBus = await overpass("bus-nodes", `[out:json][timeout:600];
rel["type"="route"]["route"="bus"](${bb})->.r;
node(r.r);
out body;`);
  const nb = mapaNodes(nodesBus);
  for (const [k, v] of nb) nodes.set(k, v);
  // Los buses van más simplificados (60 m) y sin paradas: son muchos y son
  // contexto, no el objeto de lectura. Y siguen la carretera, que ya tiene
  // forma reconocible.
  // El horario oficial escribe los códigos con ceros de relleno (L0077) y OSM
  // sin ellos (L77). Se comparan las dos formas. Recupera pocas líneas, pero
  // las recupera: el resto de las que faltan es que en OSM no están etiquetadas
  // con ese código, y eso no se arregla con manipular la cadena.
  const senseZeros = (s) => String(s).toUpperCase().replace(/^([A-Z]*)0+(\d)/, "$1$2");
  const refsNorm = new Set([...refsBus].map(senseZeros));
  muntaCapa(relsBus.elements || [], nodes, 60,
            (t) => refsBus.has(String(t.ref).toUpperCase())
                || refsNorm.has(senseZeros(t.ref)), false);
  console.error(`✓ bus: ${linies.length - nFerro} líneas dibujadas de ${refsBus.size} buscadas`);
}

/* --------------------------------------------------------------------------
   3. Salida
   -------------------------------------------------------------------------- */

const doc = {
  generat: new Date().toISOString().slice(0, 10),
  bbox: BBOX,
  font: "© col·laboradors d'OpenStreetMap, ODbL — https://www.openstreetmap.org/copyright",
  nota: ("Capa ferroviaria completa (metro, FGC, Rodalies, tram), sense llarga "
       + "distancia. Capa de bus NOMES amb les linies que surten en algun "
       + "itinerari optim de transit.json. Traçat simplificat (Douglas-Peucker, "
       + "25 m ferroviaria / 60 m bus) i coordenades a 5 decimals. Dels busos no "
       + "se'n guarden les parades."),
  linies,
  parades,
};

const out = new URL("./linies.json", HERE);
writeFileSync(out, JSON.stringify(doc));
const kb = (JSON.stringify(doc).length / 1024).toFixed(0);

const perXarxa = {};
for (const l of linies) perXarxa[l.xarxa] = (perXarxa[l.xarxa] || 0) + 1;
const punts = linies.reduce((a, l) => a + l.punts.reduce((b, s) => b + s.length, 0), 0);

console.error(`\n✓ linies.json · ${kb} KB`);
console.error(`  líneas    ${linies.length}  ${JSON.stringify(perXarxa)}`);
console.error(`  puntos    ${punts}`);
console.error(`  paradas   ${parades.length}`);
for (const l of linies.filter(x => x.xarxa !== "Bus")) {
  console.error(`    ${l.xarxa.padEnd(9)} ${String(l.ref).padEnd(6)} ${String(l.parades.length).padStart(3)} parades`);
}
