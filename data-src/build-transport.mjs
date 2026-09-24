/**
 * Monta los datos de pages/transporte-publico.html.
 *
 * Cruza lo que ya existe (precios y padrón de pisos-bcn.json / bcn-barris.json)
 * con lo nuevo (el desglose por tramo de transit.json, el trazado de la red de
 * linies.json y la matriz de isócronas de isocrones.json).
 *
 * Salida, en pages/data/:
 *
 *   transporte-muni.json    92 municipios: atributos + los 6 destinos exactos
 *   transporte-barris.json  73 barrios, lo mismo
 *   linies.json             trazado y paradas de la red
 *   iso-ancores.json        la rejilla de anclajes, común a las dos escalas
 *   iso-muni.json           matriz de minutos, 1 byte por (origen, anclaje)
 *   iso-barris.json         íd.
 *
 * Los tres ficheros `iso-*` se separan a propósito: solo hacen falta si el
 * usuario pincha un punto propio, así que la página los pide entonces y no
 * antes. Sin eso, la carga inicial cargaría con varios cientos de KB que la
 * mayoría de visitas no van a usar.
 */
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";

const HERE = new URL("./", import.meta.url);
const src  = (f) => new URL("./" + f, HERE);
const out  = (f) => new URL("../pages/data/" + f, HERE);
const read = (u) => JSON.parse(readFileSync(u, "utf8"));
const readOpt = (f) => existsSync(src(f)) ? read(src(f)) : null;

const avisos = [];

const transit = readOpt("transit.json");
const linies  = readOpt("linies.json");
const iso     = readOpt("isocrones.json");
const pois    = read(src("pois.json"));

if (!transit) throw new Error("falta transit.json — lanza antes fetch-transit.py");
if (!linies)  avisos.push("falta linies.json: la página se quedará sin la red dibujada");
if (!iso)     avisos.push("falta isocrones.json: la página se quedará sin el punto libre");

const pisos  = read(out("pisos-bcn.json"));
const barris = read(out("bcn-barris.json"));

/* Los destinos que de verdad tienen ruta calculada. No se toman de pois.json:
   allí hay puntos (la playa, Collserola) que nunca se encaminaron, y ofrecerlos
   en el desplegable sería prometer un dato que no existe. */
const DESTINS = Object.keys(transit.meta?.destins || {});
const poiDe = new Map(pois.map(p => [p.id, p]));
const destins = DESTINS.map(id => {
  const p = poiDe.get(id);
  const c = transit.meta.destins[id];
  return {
    id,
    nom: p?.nom ?? id,
    tipus: p?.tipus ?? null,
    nota: p?.nota ?? null,
    lat: c.lat, lon: c.lon,
  };
});
// Nombres para los tres destinos que no son POI de la página antigua.
const NOMS = {
  "castelldefels": ["Castelldefels (estació)", "estación de Rodalies"],
  "sant-cugat-estacio": ["Sant Cugat (estació FGC)", "centro de Sant Cugat"],
};
for (const d of destins) {
  if (NOMS[d.id]) { d.nom = NOMS[d.id][0]; d.tipus ||= NOMS[d.id][1]; }
}

/** ¿Este destino coincide con el propio municipio? Un trayecto de 2 min andando
    de Castelldefels a la estación de Castelldefels es cierto pero no informa de
    nada, y en el gráfico y en los filtros se come la escala. Se marca. */
const trivial = (m, d) => {
  const dx = (d.lon - m.lon) * Math.cos(41.45 * Math.PI / 180);
  const dy = d.lat - m.lat;
  return Math.hypot(dx, dy) * 111.32 < 3;      // menos de 3 km en línea recta
};

function monta(fitxerPisos, blocTransit, idKey) {
  const tr = new Map(Object.entries(blocTransit || {}));
  const files = [];
  let ambDesglos = 0;
  for (const m of fitxerPisos.municipis) {
    const id = String(m[idKey]);
    const t = tr.get(id) || tr.get(id.padStart(5, "0"));
    const dst = {};
    for (const d of destins) {
      const v = t?.destins?.[d.id];
      if (!v) { dst[d.id] = null; continue; }
      if (v.a_peu != null) ambDesglos++;
      dst[d.id] = {
        min: v.min,
        transbords: v.transbords,
        modes: v.modes,
        a_peu: v.a_peu ?? null,
        a_peu_acces: v.a_peu_acces ?? null,
        en_vehicle: v.en_vehicle ?? null,
        espera: v.espera ?? null,
        linies: (v.linies || []).map(l => ({
          ref: l.ref, xarxa: l.xarxa, min: l.min,
          de: l.de?.nom ?? null, a: l.a?.nom ?? null,
          // Coordenadas de subida y bajada: son las que dibujan el itinerario
          // sobre el mapa cuando pinchas un municipio.
          dl: l.de?.lat != null ? [l.de.lon, l.de.lat] : null,
          al: l.a?.lat != null ? [l.a.lon, l.a.lat] : null,
        })),
        ...(v.arriba_tard ? { arriba_tard: true, arribada_local: v.arribada_local } : {}),
        ...(trivial(m, d) ? { trivial: true } : {}),
      };
    }
    files.push({
      ine: id,
      nom: m.nom,
      comarca: m.comarca,
      lat: m.lat, lon: m.lon,
      dist_bcn_km: m.dist_bcn_km,
      poblacio: m.poblacio,
      compra_eur_m2: m.compra_eur_m2,
      compra_eur_total: m.compra_eur_total,
      lloguer_eur_mes: m.lloguer_eur_mes,
      renda_llar_eur: m.ind?.renda_llar_eur ?? null,
      tren: m.tren ?? null,
      sortides: t?.sortides_hora_punta ?? m.sortides ?? null,
      destins: dst,
    });
  }
  return { files, ambDesglos };
}

const mun = monta(pisos,  transit.municipis, "ine");
const bar = monta(barris, transit.barris,    "ine");

if (mun.ambDesglos === 0) {
  avisos.push("transit.json no trae el desglose por tramo (a_peu): el filtro de "
            + "caminata no funcionará. ¿Has relanzado fetch-transit.py?");
}

const metaComu = {
  generat: new Date().toISOString().slice(0, 10),
  destins,
  transit: {
    hora: transit.meta?.hora_referencia ?? null,
    metode: transit.meta?.metode ?? null,
    desglos: transit.meta?.desglos ?? null,
    limitacions: transit.meta?.limitacions ?? null,
    hora_punta: transit.meta?.hora_punta ?? null,
    font: transit.meta?.font ?? null,
  },
  iso: iso ? {
    hora: iso.hora, metode: iso.metode, font: iso.font,
    limit_min: iso.limit_min, cella_m: iso.cella_m,
  } : null,
  periodes: pisos.meta?.periodes ?? null,
  casa: pisos.meta?.casa ?? null,
};

writeFileSync(out("transporte-muni.json"), JSON.stringify({
  meta: { ...metaComu, escala: "municipis", radi_km: pisos.meta?.radi_km ?? 30 },
  files: mun.files,
}));
writeFileSync(out("transporte-barris.json"), JSON.stringify({
  meta: { ...metaComu, escala: "barris", radi_km: barris.meta?.radi_km ?? 9 },
  files: bar.files,
}));

if (linies) writeFileSync(out("linies.json"), JSON.stringify(linies));

if (iso) {
  writeFileSync(out("iso-ancores.json"), JSON.stringify({
    generat: iso.generat, metode: iso.metode, font: iso.font, hora: iso.hora,
    limit_min: iso.limit_min, cella_m: iso.cella_m, bbox: iso.bbox,
    dlat: iso.dlat, dlon: iso.dlon, ncols: iso.ncols,
    inabastable: iso.inabastable, ancores: iso.ancores,
  }));
  writeFileSync(out("iso-muni.json"),   JSON.stringify(iso.municipis));
  writeFileSync(out("iso-barris.json"), JSON.stringify(iso.barris));
}

/* --------------------------------------------------------------------------
   Resumen — la misma tabla que imprimen los otros build-*, para ver de un
   vistazo si algo se ha quedado a medias.
   -------------------------------------------------------------------------- */
const kb = (f) => existsSync(out(f)) ? (statSync(out(f)).size / 1024).toFixed(0) + " KB" : "—";
const cob = (files, d) => files.filter(m => m.destins[d]).length;

console.log("── transporte ──────────────────────────────────");
console.log(`  municipios            ${mun.files.length}`);
console.log(`  barrios               ${bar.files.length}`);
console.log(`  destinos              ${destins.length}  (${destins.map(d => d.id).join(", ")})`);
for (const d of destins) {
  const a = cob(mun.files, d.id), b = cob(bar.files, d.id);
  const pa = (100 * a / mun.files.length).toFixed(0), pb = (100 * b / bar.files.length).toFixed(0);
  console.log(`    ${d.id.padEnd(20)} muni ${String(a).padStart(3)}/${mun.files.length} (${pa}%)`
            + `   barris ${String(b).padStart(2)}/${bar.files.length} (${pb}%)`);
}
const ambPeu = mun.files.filter(m => Object.values(m.destins).some(d => d?.a_peu != null)).length;
console.log(`  con desglose a pie    ${ambPeu}/${mun.files.length}`);
if (linies) {
  const perX = {};
  for (const l of linies.linies) perX[l.xarxa] = (perX[l.xarxa] || 0) + 1;
  console.log(`  líneas dibujadas      ${linies.linies.length}  ${JSON.stringify(perX)}`);
  console.log(`  paradas               ${linies.parades.length}`);
}
if (iso) {
  console.log(`  anclajes isócrona     ${iso.ancores.length} (rejilla de ${iso.cella_m} m)`);
}
console.log("  ── tamaños ──");
for (const f of ["transporte-muni.json", "transporte-barris.json", "linies.json",
                 "iso-ancores.json", "iso-muni.json", "iso-barris.json"]) {
  console.log(`    ${f.padEnd(24)} ${kb(f).padStart(8)}`);
}
for (const a of avisos) console.warn(`  ⚠ ${a}`);
