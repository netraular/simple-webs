/**
 * Integra todas las fuentes crudas de data-src/ en los dos ficheros que la
 * página consume:
 *
 *   pages/data/pisos-bcn.json     municipios + precios + tiempos + estaciones
 *   pages/data/municipis.geojson  contornos, recortados a esos municipios
 *
 * Principio rector: un municipio sin dato publicado queda a null. Nunca se
 * rellena un hueco con una interpolación ni con la media de la comarca — la
 * página pinta esos casos en gris y lo dice.
 *
 * Uso:  node build-data.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const here = (f) => new URL(f, import.meta.url);
const out  = (f) => new URL("../pages/data/" + f, import.meta.url);
const read = (f) => JSON.parse(readFileSync(here(f), "utf8"));
const readOpt = (f) => existsSync(here(f)) ? read(f) : null;

const municipis = read("municipis.json");
const pois      = read("pois.json");
const temps     = readOpt("temps.json") || {};
const estacions = readOpt("estacions.json") || [];
/** Las fuentes vienen unas como array pelado y otras como {meta, municipis}.
 *  Se normaliza a array, guardando el meta aparte cuando lo traen. */
function rowsOf(x) {
  if (!x) return null;
  if (Array.isArray(x)) return x;
  for (const k of ["municipis", "dades", "data", "rows"]) if (Array.isArray(x[k])) return x[k];
  return null;
}
const lloguerRaw = readOpt("lloguer.json");
const compraRaw  = readOpt("compra.json");
const lloguer = rowsOf(lloguerRaw);
const compra  = rowsOf(compraRaw);
const geo     = read("municipis.geojson");

const warn = [];
if (!lloguer) warn.push("falta lloguer.json — no habrá métricas de alquiler");
if (!compra)  warn.push("falta compra.json — no habrá métricas de compra");

/* ---------------------------------------------------------------------------
   1. Índices por código INE. Se normaliza a 5 dígitos con ceros por delante:
      las fuentes mezclan "8019" y "08019" y si no, no casan.
   --------------------------------------------------------------------------- */
const ine5 = (v) => String(v ?? "").replace(/\D/g, "").padStart(5, "0").slice(-5);

function indexBy(rows, key = "codi_ine") {
  const m = new Map();
  for (const r of rows || []) m.set(ine5(r[key]), r);
  return m;
}
const idxLloguer = indexBy(lloguer);
const idxCompra  = indexBy(compra);

/* ---------------------------------------------------------------------------
   2. Estaciones → municipio, por point-in-polygon contra los contornos reales.
      Asignar a la capital más cercana daría errores en la costa y en el Vallès,
      donde los núcleos están a menos de 2 km unos de otros.
   --------------------------------------------------------------------------- */
function ringContains(ring, lon, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** Un polígono contiene el punto si está en el anillo exterior y en ningún hueco. */
function polyContains(poly, lon, lat) {
  if (!ringContains(poly[0], lon, lat)) return false;
  for (let k = 1; k < poly.length; k++) if (ringContains(poly[k], lon, lat)) return false;
  return true;
}
function featContains(f, lon, lat) {
  const g = f.geometry;
  if (!g) return false;
  if (g.type === "Polygon") return polyContains(g.coordinates, lon, lat);
  if (g.type === "MultiPolygon") return g.coordinates.some(p => polyContains(p, lon, lat));
  return false;
}

/** Caja envolvente por feature, para descartar rápido antes del test caro. */
const bboxes = new Map();
for (const f of geo.features) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const scan = (ring) => { for (const [x, y] of ring) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  } };
  const g = f.geometry;
  if (g?.type === "Polygon") g.coordinates.forEach(scan);
  else if (g?.type === "MultiPolygon") g.coordinates.forEach(p => p.forEach(scan));
  bboxes.set(f, [x0, y0, x1, y1]);
}

const NET_ORDER = ["Metro", "FGC", "Rodalies", "Tren"];
const perMuni = new Map();          // ine → Set de redes
const countMuni = new Map();        // ine → nº de estaciones
let sinMunicipi = 0;

for (const st of estacions) {
  let hit = null;
  for (const f of geo.features) {
    const [x0, y0, x1, y1] = bboxes.get(f);
    if (st.lon < x0 || st.lon > x1 || st.lat < y0 || st.lat > y1) continue;
    if (featContains(f, st.lon, st.lat)) { hit = f; break; }
  }
  if (!hit) { sinMunicipi++; continue; }
  const ine = ine5(hit.properties.codi_ine);
  if (!perMuni.has(ine)) perMuni.set(ine, new Set());
  perMuni.get(ine).add(st.xarxa);
  countMuni.set(ine, (countMuni.get(ine) || 0) + 1);
}

/* ---------------------------------------------------------------------------
   3. Fusión
   --------------------------------------------------------------------------- */
const num = (v) => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const rows = municipis.map(m => {
  const ine = ine5(m.codi_ine);
  const L = idxLloguer.get(ine) || {};
  const C = idxCompra.get(ine) || {};
  const nets = [...(perMuni.get(ine) || [])].sort((a, b) => NET_ORDER.indexOf(a) - NET_ORDER.indexOf(b));

  return {
    ine,
    nom: m.nom,
    comarca: m.comarca,
    lat: m.lat,
    lon: m.lon,
    dist_bcn_km: m.dist_bcn_km,
    poblacio: m.poblacio ?? null,
    superficie_km2: m.superficie_km2 ?? null,

    compra_eur_m2:          num(C.compra_eur_m2),
    compra_eur_total:       num(C.compra_eur_total),
    superficie_mitjana_m2:  num(C.superficie_mitjana_m2),
    compra_operacions:      num(C.nombre_operacions),
    lloguer_eur_mes:        num(L.lloguer_mitja_eur_mes ?? L.lloguer_eur_mes ?? L.renda_mitjana),
    lloguer_eur_m2:         num(L.lloguer_eur_m2_mes ?? L.lloguer_eur_m2),
    lloguer_contractes:     num(L.nombre_contractes ?? L.contractes),

    tren: nets.length ? nets.join(" · ") : null,
    estacions: countMuni.get(ine) || 0,
    temps: temps[ine] || null,
  };
});

/* ---------------------------------------------------------------------------
   4. GeoJSON recortado a los municipios que publicamos, y sin properties
      sobrantes (cada byte cuenta: esto lo descarga el navegador).
   --------------------------------------------------------------------------- */
const keep = new Set(rows.map(r => r.ine));
const geoOut = {
  type: "FeatureCollection",
  features: geo.features
    .filter(f => keep.has(ine5(f.properties.codi_ine)))
    .map(f => ({
      type: "Feature",
      properties: { codi_ine: ine5(f.properties.codi_ine) },
      geometry: f.geometry,
    })),
};

/* ---------------------------------------------------------------------------
   5. Metadatos y procedencia — lo que la página muestra en "De dónde salen"
   --------------------------------------------------------------------------- */
const periodeLloguer = lloguerRaw?.meta?.periode || lloguer?.[0]?.periode || (lloguer?.[0]?.any ?? "—");
const periodeCompra  = compraRaw?.meta?.periode  || compra?.[0]?.periode  || (compra?.[0]?.any  ?? "—");

const payload = {
  meta: {
    generat: new Date().toISOString().slice(0, 10),
    radi_km: 30,
    centre: { nom: "Plaça de Catalunya", lat: 41.3870, lon: 2.1701 },
    periodes: {
      compra: String(periodeCompra),
      lloguer: String(periodeLloguer),
      poblacio: String(municipis[0]?.poblacio_any ?? "—"),
    },
    nota_fonts:
      "Todas las cifras son de fuentes públicas oficiales. Ningún valor está estimado " +
      "ni interpolado: cuando un municipio no tiene dato publicado, aparece en gris y " +
      "como «—» en la tabla.",
    fonts: [],   // se rellena abajo
  },
  pois,
  municipis: rows,
};

payload.meta.fonts = [
  { nom: "Idescat — cens de població i superfície",
    detall: `Población y superficie municipal, referencia ${municipis[0]?.poblacio_any ?? "—"}.`,
    url: "https://api.idescat.cat/emex/v1/dades.json?i=f271,f321&tipus=mun&lang=ca" },
  { nom: "ICGC — caps de municipi georeferenciats",
    detall: "Coordenadas del núcleo urbano de cada municipio y código INE.",
    url: "https://analisi.transparenciacatalunya.cat/resource/wpyq-we8x.json" },
  ...(lloguer ? [{
    nom: lloguerRaw?.meta?.font_principal || "Incasòl — rendes de lloguer",
    detall: `${lloguerRaw?.meta?.metrica_principal || "Renta media de los contratos de alquiler con fianza depositada"}. Periodo ${periodeLloguer}. Los municipios con muy pocos contratos no se publican, por secreto estadístico.`,
    url: lloguerRaw?.meta?.font_principal_url || "https://analisi.transparenciacatalunya.cat/",
  }] : []),
  ...(compra ? [{
    nom: compraRaw?.meta?.font_principal || "Precio de compraventa",
    detall: `${compraRaw?.meta?.metrica_principal || "Precio medio por metro cuadrado"}. Periodo ${periodeCompra}. ${compraRaw?.meta?.cobertura_font_principal || ""}`.trim(),
    url: compraRaw?.meta?.font_principal_url || "https://habitatge.gencat.cat/",
  }] : []),
  { nom: "OpenStreetMap — estaciones",
    detall: "Estaciones de Metro, FGC y Rodalies asignadas a su municipio por geometría. Datos © colaboradores de OpenStreetMap, ODbL.",
    url: "https://www.openstreetmap.org/copyright" },
  { nom: "OSRM — tiempos en coche",
    detall: "Tiempo de conducción en flujo libre sobre la red de OpenStreetMap. No modela tráfico: en hora punta hacia Barcelona la cifra real es notablemente peor.",
    url: "https://project-osrm.org/" },
];

/* ---------------------------------------------------------------------------
   6. Escritura + comprobaciones de cordura
   --------------------------------------------------------------------------- */
mkdirSync(new URL("../pages/data/", import.meta.url), { recursive: true });
writeFileSync(out("pisos-bcn.json"), JSON.stringify(payload));
writeFileSync(out("municipis.geojson"), JSON.stringify(geoOut));

const size = (f) => {
  const b = statSync(out(f)).size;
  const g = gzipSync(readFileSync(out(f))).length;
  return `${(b / 1024).toFixed(0)} KB (${(g / 1024).toFixed(0)} KB gzip)`;
};

const has = (k) => rows.filter(r => r[k] != null).length;
console.log("── pisos-bcn.json ──────────────────────────────");
console.log(`  municipios            ${rows.length}  (${rows.filter(r => r.dist_bcn_km <= 30).length} a ≤30 km)`);
console.log(`  con precio de compra  ${has("compra_eur_m2")}`);
console.log(`  con alquiler €/mes    ${has("lloguer_eur_mes")}`);
console.log(`  con alquiler €/m²     ${has("lloguer_eur_m2")}`);
console.log(`  con tren/metro        ${has("tren")}`);
console.log(`  con tiempos en coche  ${has("temps")}`);
console.log(`  estaciones fuera de todo municipio: ${sinMunicipi} de ${estacions.length}`);
console.log(`  tamaño                ${size("pisos-bcn.json")}`);
console.log(`── municipis.geojson ───────────────────────────`);
console.log(`  features              ${geoOut.features.length} de ${geo.features.length}`);
console.log(`  tamaño                ${size("municipis.geojson")}`);
const faltanGeo = rows.filter(r => !keep.has(r.ine) || !geoOut.features.some(f => f.properties.codi_ine === r.ine));
if (faltanGeo.length) console.log(`  ⚠ sin contorno: ${faltanGeo.map(r => r.nom).join(", ")}`);
for (const w of warn) console.log("  ⚠ " + w);

// Muestra de control: si estos números se salen de madre, algo casó mal.
console.log("── control ─────────────────────────────────────");
for (const n of ["Barcelona", "Sant Cugat del Vallès", "Terrassa", "Mataró", "Castelldefels", "Rubí"]) {
  const r = rows.find(x => x.nom === n);
  if (!r) { console.log(`  ${n}: NO ESTÁ`); continue; }
  console.log(`  ${n.padEnd(24)} compra ${String(r.compra_eur_m2 ?? "—").padStart(6)} €/m² · ` +
              `lloguer ${String(r.lloguer_eur_mes ?? "—").padStart(6)} €/mes · ` +
              `${r.tren ?? "sin tren"}`);
}
