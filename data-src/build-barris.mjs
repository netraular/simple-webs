/**
 * Segunda vista de la página: Barcelona por barrios.
 *
 * Barcelona es un único polígono en el mapa municipal, y dentro de ella la
 * diferencia de precio es mayor que entre municipios (Pedralbes está por encima
 * de 7.000 €/m² y Ciutat Meridiana por debajo de 1.900). Esta vista abre ese
 * polígono en sus 73 barrios, con la misma estructura de datos que la vista
 * municipal para que la página pueda intercambiarlas sin casos especiales.
 *
 * El centroide de cada barrio se calcula como centroide de área del polígono
 * mayor (no la media de vértices, que se desvía hacia donde el contorno tiene
 * más detalle). Sobre él se piden los tiempos en coche a OSRM.
 *
 * Salida: pages/data/bcn-barris.json  y  pages/data/bcn-barris-geo.json
 *
 * La geometría va con extensión .json para que nginx le ponga application/json
 * y Cloudflare la comprima; ver la nota en build-data.mjs.
 */
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const here = (f) => new URL(f, import.meta.url);
const out  = (f) => new URL("../pages/data/" + f, import.meta.url);
const read = (f) => JSON.parse(readFileSync(here(f), "utf8"));
const readOpt = (f) => existsSync(here(f)) ? read(f) : null;

const geo     = read("bcn-barris.geojson");
const compra  = read("compra-bcn-barris.json");
const lloguer = read("lloguer-bcn-barris.json");
const pois    = read("pois.json");
const poblacio = readOpt("bcn-barris-poblacio.json");

const pad2 = (v) => String(v ?? "").replace(/\D/g, "").padStart(2, "0").slice(-2);
const num = (v) => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const idx = (rows, key) => new Map((rows || []).map(r => [pad2(r[key]), r]));
const iCompra  = idx(compra.barris, "codi");
const iLloguer = idx(lloguer.barris, "codi");
const iPob     = idx(poblacio, "codi_barri");

/* --- centroide de área del anillo exterior del polígono mayor --------------- */
function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return a / 2;
}
function ringCentroid(ring) {
  let cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    cx += (ring[j][0] + ring[i][0]) * f;
    cy += (ring[j][1] + ring[i][1]) * f;
  }
  const a = ringArea(ring);
  return Math.abs(a) < 1e-12 ? null : [cx / (6 * a), cy / (6 * a)];
}
function centroid(geometry) {
  const polys = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  let best = null, bestA = -Infinity;
  for (const p of polys) {
    const a = Math.abs(ringArea(p[0]));
    if (a > bestA) { bestA = a; best = p[0]; }
  }
  return best ? ringCentroid(best) : null;
}

/* --- fusión ---------------------------------------------------------------- */
const R = 6371.0088;
const haversine = (aLat, aLon, bLat, bLon) => {
  const r = Math.PI / 180, dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};
const CENTRE = { lat: 41.3870, lon: 2.1701 };

const rows = geo.features.map(f => {
  const codi = pad2(f.properties.codi_barri);
  const C = iCompra.get(codi) || {}, L = iLloguer.get(codi) || {}, P = iPob.get(codi) || {};
  const c = centroid(f.geometry);
  if (!c) throw new Error(`sin centroide: ${f.properties.nom_barri}`);
  const [lon, lat] = c;
  return {
    ine: codi,                                   // misma clave que usa la vista municipal
    nom: f.properties.nom_barri,
    comarca: f.properties.nom_districte,         // el distrito hace de "comarca" en esta vista
    lat: +lat.toFixed(6), lon: +lon.toFixed(6),
    dist_bcn_km: +haversine(CENTRE.lat, CENTRE.lon, lat, lon).toFixed(2),
    poblacio: num(P.poblacio),
    compra_eur_m2: num(C.compra_eur_m2),
    compra_eur_total: num(C.compra_eur_total),
    superficie_mitjana_m2: num(C.superficie_mitjana_m2),
    compra_operacions: num(C.nombre_operacions),
    lloguer_eur_mes: num(L.lloguer_mitja_eur_mes),
    lloguer_eur_m2: num(L.lloguer_eur_m2_mes),
    lloguer_contractes: num(L.nombre_contractes),
    tren: null, estacions: 0,                    // se rellenan abajo
    temps: null,
  };
});

/* --- estaciones por barrio, por point-in-polygon --------------------------- */
const estacions = readOpt("estacions.json") || [];
const ringContains = (ring, lon, lat) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const polyContains = (poly, lon, lat) => {
  if (!ringContains(poly[0], lon, lat)) return false;
  for (let k = 1; k < poly.length; k++) if (ringContains(poly[k], lon, lat)) return false;
  return true;
};
const featContains = (f, lon, lat) => {
  const g = f.geometry;
  return g.type === "Polygon" ? polyContains(g.coordinates, lon, lat)
       : g.coordinates.some(p => polyContains(p, lon, lat));
};

const NET_ORDER = ["Metro", "FGC", "Rodalies", "Tren"];
const byCodi = new Map(rows.map(r => [r.ine, r]));
const nets = new Map();
for (const st of estacions) {
  const f = geo.features.find(ft => featContains(ft, st.lon, st.lat));
  if (!f) continue;
  const c = pad2(f.properties.codi_barri);
  if (!nets.has(c)) nets.set(c, new Set());
  nets.get(c).add(st.xarxa);
  byCodi.get(c).estacions++;
}
for (const [c, set] of nets) {
  byCodi.get(c).tren = [...set].sort((a, b) => NET_ORDER.indexOf(a) - NET_ORDER.indexOf(b)).join(" · ");
}

/* --- tiempos en coche a los puntos de referencia --------------------------- */
if (!process.env.SKIP_OSRM) {
  const coords = [...rows.map(r => `${r.lon},${r.lat}`), ...pois.map(p => `${p.lon},${p.lat}`)].join(";");
  const url = `https://router.project-osrm.org/table/v1/driving/${coords}`
    + `?sources=${rows.map((_, i) => i).join(";")}`
    + `&destinations=${pois.map((_, i) => rows.length + i).join(";")}`
    + `&annotations=duration,distance`;
  console.error(`→ OSRM: ${rows.length} barrios × ${pois.length} destinos`);
  const res = await fetch(url, { headers: { "User-Agent": "simple-webs/pisos-vs-distancia" } });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const j = await res.json();
  if (j.code !== "Ok") throw new Error(`OSRM ${j.code}`);
  rows.forEach((r, i) => {
    r.temps = {};
    pois.forEach((p, k) => {
      const d = j.durations?.[i]?.[k], m = j.distances?.[i]?.[k];
      r.temps[p.id] = (d == null || m == null) ? null : { min: +(d / 60).toFixed(1), km: +(m / 1000).toFixed(1) };
    });
  });
}

/* --- salida ---------------------------------------------------------------- */
const geoOut = {
  type: "FeatureCollection",
  features: geo.features.map(f => ({
    type: "Feature",
    properties: { codi_ine: pad2(f.properties.codi_barri) },
    geometry: f.geometry,
  })),
};

const payload = {
  meta: {
    generat: new Date().toISOString().slice(0, 10),
    radi_km: Math.ceil(Math.max(...rows.map(r => r.dist_bcn_km))),
    centre: { nom: "Plaça de Catalunya", ...CENTRE },
    periodes: {
      compra: String(compra.meta?.periode ?? "—"),
      lloguer: String(lloguer.meta?.periode ?? "—"),
      poblacio: String(poblacio?.[0]?.any ?? "—"),
    },
    nota_fonts:
      "Vista por barrios de Barcelona. Mismas fuentes que la vista municipal, " +
      "desagregadas al barrio. Los barrios sin dato publicado aparecen en gris.",
    fonts: [
      { nom: compra.meta?.font_principal || "Secretaria d'Habitatge — compravendes registrades",
        detall: `Precio de compraventa de vivienda usada por barrio, ${compra.meta?.periode ?? "—"}.`,
        url: compra.meta?.font_principal_url || "https://habitatge.gencat.cat/" },
      { nom: lloguer.meta?.font_principal || "Incasòl — rendes de lloguer",
        detall: `Renta media de los contratos con fianza depositada, por barrio, ${lloguer.meta?.periode ?? "—"}.`,
        url: lloguer.meta?.font_principal_url || "https://analisi.transparenciacatalunya.cat/" },
      { nom: "Open Data BCN — unitats administratives",
        detall: "Contornos de los 73 barrios.",
        url: "https://opendata-ajuntament.barcelona.cat/" },
      { nom: "OpenStreetMap / OSRM",
        detall: "Estaciones y tiempos de conducción en flujo libre.",
        url: "https://www.openstreetmap.org/copyright" },
    ],
  },
  pois,
  municipis: rows,
};

writeFileSync(out("bcn-barris.json"), JSON.stringify(payload));
writeFileSync(out("bcn-barris-geo.json"), JSON.stringify(geoOut));

const sz = (f) => `${(statSync(out(f)).size / 1024).toFixed(0)} KB ` +
                  `(${(gzipSync(readFileSync(out(f))).length / 1024).toFixed(0)} KB gzip)`;
const has = (k) => rows.filter(r => r[k] != null).length;
console.log("── bcn-barris ──────────────────────────────────");
console.log(`  barrios               ${rows.length}`);
console.log(`  con precio de compra  ${has("compra_eur_m2")}`);
console.log(`  con alquiler          ${has("lloguer_eur_mes")}`);
console.log(`  con población         ${has("poblacio")}`);
console.log(`  con tren/metro        ${has("tren")}`);
console.log(`  con tiempos           ${has("temps")}`);
console.log(`  bcn-barris.json       ${sz("bcn-barris.json")}`);
console.log(`  bcn-barris-geo.json   ${sz("bcn-barris-geo.json")}`);
const ord = rows.filter(r => r.compra_eur_m2).sort((a, b) => b.compra_eur_m2 - a.compra_eur_m2);
console.log(`  más caro              ${ord[0].nom} ${ord[0].compra_eur_m2} €/m²`);
console.log(`  más barato            ${ord.at(-1).nom} ${ord.at(-1).compra_eur_m2} €/m²`);
const sinDada = rows.filter(r => r.compra_eur_m2 == null).map(r => r.nom);
if (sinDada.length) console.log(`  sin precio            ${sinDada.join(", ")}`);
