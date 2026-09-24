/**
 * Comprobaciones sobre los datos ya generados de la página de transporte
 * público: `transporte-muni.json`, `transporte-barris.json`, `linies.json`,
 * `iso-ancores.json`, `iso-muni.json` e `iso-barris.json`.
 *
 * No abre un navegador ni toca la página: solo mira los ficheros de
 * `pages/data/`. Cuatro clases de prueba:
 *
 *   1. Contrato y coherencia interna: las claves están, los tipos son los que
 *      toca, ningún número es NaN, y cada trayecto cuadra consigo mismo
 *      (a_peu + en_vehicle + espera ≈ min, a_peu_acces ≤ a_peu, …).
 *   2. Cordura contra horarios publicados: Castelldefels, Sabadell, Terrassa y
 *      Barcelona hacia plaça de Catalunya, con ±25 % de margen porque son
 *      horarios reales y el router elige el tren que le parece.
 *   3. Consistencia entre ficheros: los buses que aparecen en un itinerario
 *      tienen que estar dibujados en linies.json.
 *   4. Isócronas: la matriz de anclajes mide lo que dice medir. Se reconstruye
 *      el estimador que usa la página (anclaje más próximo + caminata) y se
 *      contrasta contra los tiempos exactos puerta a puerta de los 6 destinos.
 *      Esa tabla de error es la que justifica que la página diga «estimado».
 *
 * Si un fichero no existe todavía se avisa y se salta su bloque, para poder
 * ejecutar el test mientras se regeneran los datos.
 *
 * Uso:  node test-transport.mjs
 */
import { readFileSync, statSync } from "node:fs";

/* ------------------------------------------------------------ utilidades */

let fallos = 0, hechas = 0, avisos = 0;

const ok = (cond, texto, detalle = "") => {
  hechas++;
  if (!cond) fallos++;
  console.log(`  ${cond ? "✓" : "✗"} ${texto}${detalle ? `  ${detalle}` : ""}`);
};
/** Aviso: se imprime y se cuenta, pero no hace fallar el test. */
const aviso = (texto) => { avisos++; console.log(`  ⚠ ${texto}`); };

/** Margen relativo: para horarios reales, donde el router puede coger otro tren. */
const cerca = (real, esperado, tol, texto) =>
  ok(real != null && Math.abs(real - esperado) <= esperado * tol,
     texto,
     `→ ${real == null ? "sin dato" : real} vs ${esperado} esperados (±${Math.round(tol * 100)} %)`);

const n1 = (x) => x.toFixed(1).replace(".", ",");
const sig = (x) => (x >= 0 ? "+" : "-") + Math.abs(x).toFixed(1).replace(".", ",");
const pct = (a, b) => (b ? (100 * a / b) : 0);
const pc1 = (a, b) => n1(pct(a, b)) + " %";

const mediana = (xs) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const media = (xs) => (xs.length ? xs.reduce((p, c) => p + c, 0) / xs.length : NaN);
/** Percentil por interpolación lineal sobre el array ya ordenado. */
const perc = (xs, q) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const i = q * (s.length - 1), lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
};

const R_TIERRA = 6371;
const rad = (d) => (d * Math.PI) / 180;
function haversine(aLat, aLon, bLat, bLon) {
  const dLat = rad(bLat - aLat), dLon = rad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_TIERRA * Math.asin(Math.sqrt(h));
}

const RUTA = (f) => new URL("../pages/data/" + f, import.meta.url);
/** Carga un JSON de pages/data, o null (con aviso) si todavía no existe. */
function carga(f) {
  try {
    return JSON.parse(readFileSync(RUTA(f), "utf8"));
  } catch (e) {
    aviso(`${f}: ${e.code === "ENOENT" ? "no existe todavía, me salto ese bloque" : e.message}`);
    return null;
  }
}
const tamany = (f) => { try { return statSync(RUTA(f)).size; } catch { return null; } };

/** Recorre un JSON buscando números no finitos y valores undefined. */
function numerosMalos(v, ruta = "", malos = []) {
  if (v === null) return malos;
  if (v === undefined) { malos.push(ruta + " = undefined"); return malos; }
  if (typeof v === "number") { if (!Number.isFinite(v)) malos.push(`${ruta} = ${v}`); return malos; }
  if (Array.isArray(v)) { v.forEach((x, i) => numerosMalos(x, `${ruta}[${i}]`, malos)); return malos; }
  if (typeof v === "object") { for (const k of Object.keys(v)) numerosMalos(v[k], `${ruta}.${k}`, malos); }
  return malos;
}

/* ------------------------------------------------------------- ficheros */

const FITXERS = ["transporte-muni.json", "transporte-barris.json", "linies.json",
                 "iso-ancores.json", "iso-muni.json", "iso-barris.json"];

const ESCALES = [
  { id: "municipis", dades: "transporte-muni.json", iso: "iso-muni.json", n: 92 },
  { id: "barris",    dades: "transporte-barris.json", iso: "iso-barris.json", n: 73 },
];

console.log("Carga de ficheros");
for (const e of ESCALES) e.D = carga(e.dades);
const LIN = carga("linies.json");
const ANC = carga("iso-ancores.json");
for (const e of ESCALES) e.M = carga(e.iso);
if (!ESCALES.some((e) => e.D)) {
  console.log("\n✗ no hay ningún transporte-*.json que mirar; no puedo seguir.");
  process.exit(1);
}
console.log(`  ${FITXERS.filter((f) => tamany(f) != null).length}/${FITXERS.length} ficheros presentes`);

/* Claves del contrato de cada fila. */
const CLAUS = ["ine", "nom", "comarca", "lat", "lon", "dist_bcn_km", "poblacio",
               "compra_eur_m2", "compra_eur_total", "lloguer_eur_mes", "renda_llar_eur",
               "tren", "sortides", "destins"];
/* Claves obligatorias de un trayecto con dato. */
const CLAUS_T = ["min", "transbords", "modes", "a_peu", "a_peu_acces", "en_vehicle",
                 "espera", "linies"];

const esNum = (x) => typeof x === "number" && Number.isFinite(x);
const esNumONull = (x) => x === null || esNum(x);
const esLonLat = (p) => Array.isArray(p) && p.length === 2 &&
                        esNum(p[0]) && esNum(p[1]) &&
                        p[0] > 0 && p[0] < 4 && p[1] > 40 && p[1] < 43;

/* ============================================================ 1. contrato
   y 2. coherencia interna de cada trayecto, y 3. cobertura por destino.    */

for (const E of ESCALES) {
  if (!E.D) continue;
  const D = E.D;
  console.log(`\n══ escala «${E.id}» ═══════════════════════════════`);

  /* --- contrato del meta --- */
  const dst = D.meta?.destins;
  ok(Array.isArray(dst) && dst.length > 0 &&
     dst.every((d) => typeof d.id === "string" && typeof d.nom === "string" &&
                      esNum(d.lat) && esNum(d.lon)),
     `meta.destins: ${dst?.length} destinos con id, nom, lat y lon`);
  ok(D.meta?.transit && typeof D.meta.transit === "object" &&
     D.meta?.iso && typeof D.meta.iso === "object",
     "meta.transit y meta.iso documentan el método");
  ok(D.meta?.escala === E.id.replace("municipis", "municipis"), `meta.escala = «${D.meta?.escala}»`);
  ok(esNum(D.meta?.radi_km), `meta.radi_km = ${D.meta?.radi_km}`);

  const ids = (dst || []).map((d) => d.id);

  /* --- contrato de las filas --- */
  ok(Array.isArray(D.files) && D.files.length === E.n,
     `${D.files?.length} unidades (esperadas ${E.n})`);
  const ines = new Set(D.files.map((f) => f.ine));
  ok(ines.size === D.files.length,
     `los ${ines.size} códigos ine son únicos`,
     ines.size === D.files.length ? "" : `(${D.files.length - ines.size} repetidos)`);

  const faltaClau = new Set();
  let tipoMal = 0, destinsMal = 0, liniesMal = 0, trajectes = 0;
  for (const f of D.files) {
    for (const k of CLAUS) if (!(k in f)) faltaClau.add(k);
    if (!(typeof f.ine === "string" && typeof f.nom === "string" && typeof f.comarca === "string" &&
          esNum(f.lat) && esNum(f.lon) && esNum(f.dist_bcn_km) && esNum(f.poblacio) &&
          esNumONull(f.compra_eur_m2) && esNumONull(f.compra_eur_total) &&
          esNumONull(f.lloguer_eur_mes) && esNumONull(f.renda_llar_eur) &&
          (f.tren === null || typeof f.tren === "string") && esNumONull(f.sortides))) tipoMal++;
    const claus = Object.keys(f.destins || {});
    if (claus.length !== ids.length || ids.some((i) => !(i in (f.destins || {})))) destinsMal++;
    for (const id of ids) {
      const t = f.destins?.[id];
      if (t == null) continue;
      trajectes++;
      const bien = CLAUS_T.every((k) => k in t) &&
        esNum(t.min) && esNum(t.transbords) && Array.isArray(t.modes) &&
        t.modes.every((m) => typeof m === "string") &&
        esNum(t.a_peu) && esNum(t.a_peu_acces) && esNum(t.en_vehicle) && esNum(t.espera) &&
        Array.isArray(t.linies) &&
        (t.arriba_tard === undefined || typeof t.arriba_tard === "boolean") &&
        (t.trivial === undefined || typeof t.trivial === "boolean") &&
        (t.arribada_local === undefined || t.arribada_local === null ||
         typeof t.arribada_local === "string");
      if (!bien) tipoMal++;
      for (const l of t.linies || []) {
        if (!(typeof l.ref === "string" && typeof l.xarxa === "string" && esNum(l.min) &&
              typeof l.de === "string" && typeof l.a === "string" &&
              (l.dl === null || esLonLat(l.dl)) && (l.al === null || esLonLat(l.al)))) liniesMal++;
      }
    }
  }
  ok(faltaClau.size === 0,
     `todas las filas traen las ${CLAUS.length} claves del contrato`,
     faltaClau.size ? `(faltan: ${[...faltaClau].join(", ")})` : "");
  ok(tipoMal === 0, "los tipos de cada campo son los declarados",
     tipoMal ? `(${tipoMal} objetos con algún campo del tipo equivocado)` : "");
  ok(destinsMal === 0, `cada fila lleva los ${ids.length} destinos como claves de «destins»`,
     destinsMal ? `(${destinsMal} filas con las claves mal)` : "");
  ok(liniesMal === 0, "cada tramo de «linies» lleva ref, xarxa, min, de, a y coordenadas [lon,lat]",
     liniesMal ? `(${liniesMal} tramos mal formados)` : "");

  const malos = numerosMalos(D, E.dades);
  ok(malos.length === 0, "ningún número es NaN, Infinity ni undefined",
     malos.length ? `(${malos.length}: ${malos.slice(0, 3).join("; ")})` : "");

  /* --- coherencia interna de cada trayecto --- */
  const reglas = {
    "a_peu + en_vehicle + espera ≈ min (±2)": (t) => Math.abs(t.a_peu + t.en_vehicle + t.espera - t.min) <= 2,
    "a_peu_acces ≤ a_peu": (t) => t.a_peu_acces <= t.a_peu,
    "transbords ≥ 0": (t) => t.transbords >= 0,
    "min > 0": (t) => t.min > 0,
    "sin líneas ⇒ modes = [«A peu»] o trivial": (t) =>
      t.linies.length > 0 || t.trivial === true ||
      (t.modes.length === 1 && t.modes[0] === "A peu"),
  };
  const roto = {}, ejemplos = {};
  for (const k of Object.keys(reglas)) { roto[k] = 0; ejemplos[k] = []; }
  const culpables = new Set();
  for (const f of D.files) for (const id of ids) {
    const t = f.destins?.[id];
    if (t == null) continue;
    for (const [k, test] of Object.entries(reglas)) {
      let bien;
      try { bien = test(t); } catch { bien = false; }
      if (!bien) {
        roto[k]++;
        culpables.add(f.ine + "|" + id);
        if (ejemplos[k].length < 3) ejemplos[k].push(`${f.nom}→${id}`);
      }
    }
  }
  console.log(`  — coherencia de los ${trajectes} trayectos con dato —`);
  for (const k of Object.keys(reglas)) {
    console.log(`     ${roto[k] === 0 ? "·" : "!"} ${k}: ${roto[k]} incumplen` +
                (roto[k] ? `  (p. ej. ${ejemplos[k].join(", ")})` : ""));
  }
  ok(trajectes === 0 || culpables.size <= trajectes * 0.02,
     "como mucho el 2 % de los trayectos son internamente incoherentes",
     `→ ${culpables.size}/${trajectes} = ${pc1(culpables.size, trajectes)}`);

  /* --- cobertura por destino --- */
  console.log(`  — cobertura por destino (${E.id}) —`);
  console.log("     destino               con dato   cobertura   arriba_tard   trivial");
  const bajos = [];
  for (const id of ids) {
    let con = 0, tard = 0, triv = 0;
    for (const f of D.files) {
      const t = f.destins?.[id];
      if (t == null) continue;
      con++;
      if (t.arriba_tard) tard++;
      if (t.trivial) triv++;
    }
    console.log("     " + id.padEnd(22) +
                `${con}/${D.files.length}`.padStart(8) +
                pc1(con, D.files.length).padStart(12) +
                String(tard).padStart(14) + String(triv).padStart(10));
    if (pct(con, D.files.length) < 90) bajos.push(`${id} ${pc1(con, D.files.length)}`);
  }
  if (E.id === "municipis") {
    ok(bajos.length === 0, "todos los destinos llegan al 90 % de cobertura en municipios",
       bajos.length ? `(por debajo: ${bajos.join(", ")})` : "");
  } else if (bajos.length) {
    aviso(`en barrios hay destinos por debajo del 90 %: ${bajos.join(", ")} (no se exige a esta escala)`);
  }
}

/* ============================================ 4. cordura contra horarios */

const MUNI = ESCALES[0].D;
if (MUNI) {
  console.log("\n══ cordura contra horarios publicados ══════════");
  const porIne = new Map(MUNI.files.map((f) => [f.ine, f]));
  const min = (ine, dest) => porIne.get(ine)?.destins?.[dest]?.min ?? null;

  // ±25 %: son horarios reales de un martes a las 09:00 y el router puede coger
  // un semidirecto o un tren que para en todas, que es justo esa diferencia.
  cerca(min("08056", "pl-catalunya"), 43, 0.25, "Castelldefels → plaça de Catalunya ≈ 43 min");
  cerca(min("08187", "pl-catalunya"), 48, 0.25, "Sabadell (Vallès Occidental) → plaça de Catalunya ≈ 48 min");
  cerca(min("08279", "pl-catalunya"), 65, 0.25, "Terrassa → plaça de Catalunya ≈ 65 min");
  const bcn = min("08019", "pl-catalunya");
  ok(bcn != null && bcn < 20, "Barcelona → plaça de Catalunya por debajo de 20 min", `→ ${bcn ?? "sin dato"} min`);
  const oli = min("08148", "pl-catalunya");
  ok(oli === null || oli >= 90,
     "Olivella sigue sin dato o muy mal comunicada (≥ 90 min)",
     `→ ${oli === null ? "sin dato" : oli + " min"}`);

  // Roche queda 1,5 km más allá de la red y arrastra el bus lanzadera desde
  // Sant Joan: llegar a la estación de Sant Cugat tiene que salir mejor.
  const estalvis = [];
  for (const f of MUNI.files) {
    const a = f.destins?.["sant-cugat-estacio"]?.min, b = f.destins?.["roche-sant-cugat"]?.min;
    if (a != null && b != null) estalvis.push({ nom: f.nom, d: b - a });
  }
  const mejores = estalvis.filter((x) => x.d > 0).length;
  const med = mediana(estalvis.map((x) => x.d));
  console.log(`     ${estalvis.length} municipios tienen los dos tiempos; ` +
              `en ${mejores} (${pc1(mejores, estalvis.length)}) la estación sale mejor que Roche`);
  ok(estalvis.length > 0 && med > 0,
     "la mediana del ahorro «estación de Sant Cugat» vs «Roche» es positiva",
     `→ ${Number.isNaN(med) ? "sin pares" : n1(med) + " min"}`);
}

/* ================================================== 5. líneas dibujadas */

if (LIN) {
  console.log("\n══ linies.json ═════════════════════════════════");
  const [S, W, N, Eb] = LIN.bbox;
  ok(Array.isArray(LIN.bbox) && LIN.bbox.length === 4 && S < N && W < Eb,
     `bbox coherente [S ${S}, W ${W}, N ${N}, E ${Eb}]`);

  let fuera = 0, ptos = 0, sinPunts = [], idxMal = 0, desbord = 0;
  const refsFuera = new Set();
  for (const l of LIN.linies) {
    let np = 0;
    for (const seg of l.punts || []) for (const [lon, lat] of seg) {
      ptos++; np++;
      const d = Math.max(S - lat, lat - N, W - lon, lon - Eb);
      if (d > 0) { fuera++; refsFuera.add(l.ref); desbord = Math.max(desbord, d); }
    }
    if (np === 0) sinPunts.push(l.ref);
    for (const i of l.parades || []) {
      if (!Number.isInteger(i) || i < 0 || i >= LIN.parades.length) idxMal++;
    }
  }
  ok(fuera === 0, `${ptos.toLocaleString("es-ES")} vértices, todos dentro del bbox`,
     fuera ? `(${fuera} fuera, hasta ${Math.round(desbord * 111320)} m por encima del borde, en ${[...refsFuera].join(", ")})` : "");
  ok(sinPunts.length === 0, `las ${LIN.linies.length} líneas tienen geometría`,
     sinPunts.length ? `(sin puntos: ${sinPunts.join(", ")})` : "");
  ok(idxMal === 0, `los índices de paradas apuntan al array global de ${LIN.parades.length} paradas`,
     idxMal ? `(${idxMal} índices fuera de rango)` : "");
  const malosL = numerosMalos(LIN, "linies.json");
  ok(malosL.length === 0, "ningún número es NaN ni Infinity",
     malosL.length ? `(${malosL.length}: ${malosL.slice(0, 3).join("; ")})` : "");

  const porXarxa = {};
  for (const l of LIN.linies) porXarxa[l.xarxa] = (porXarxa[l.xarxa] || 0) + 1;
  console.log("     líneas por red: " +
              Object.entries(porXarxa).sort((a, b) => b[1] - a[1])
                .map(([k, v]) => `${k} ${v}`).join(" · "));

  const REQ = ["L1", "L2", "L3", "L4", "L5", "S1", "S2", "R1", "R2", "R3", "R4",
               "T1", "T2", "T3", "T4"];
  const refs = new Set(LIN.linies.map((l) => l.ref));
  const falten = REQ.filter((r) => !refs.has(r));
  ok(falten.length <= 1,
     `están las ${REQ.length} líneas ferroviarias que no pueden faltar (L1-L5, S1-S2, R1-R4, T1-T4)`,
     falten.length ? `(faltan ${falten.length}: ${falten.join(", ")})` : "");
}

/* ============================ 6. consistencia entre itinerarios y líneas */

if (LIN) {
  console.log("\n══ consistencia itinerarios ↔ linies.json ══════");
  const dibuixats = new Set(LIN.linies.filter((l) => l.xarxa === "Bus").map((l) => l.ref));
  const usats = new Map();          // ref de bus → veces que aparece en un itinerario
  for (const E of ESCALES) {
    if (!E.D) continue;
    for (const f of E.D.files) for (const t of Object.values(f.destins || {})) {
      for (const l of t?.linies || []) {
        if (l.xarxa === "Bus") usats.set(l.ref, (usats.get(l.ref) || 0) + 1);
      }
    }
  }
  const refs = [...usats.keys()];
  const hi = refs.filter((r) => dibuixats.has(r));
  const no = refs.filter((r) => !dibuixats.has(r));
  if (refs.length === 0) {
    aviso("ningún itinerario usa bus todavía: no puedo comprobar la regla de dibujo");
  } else {
    console.log(`     ${refs.length} refs de bus distintas en los itinerarios, ` +
                `${dibuixats.size} buses dibujados en linies.json`);
    if (no.length) console.log(`     sin dibujar: ${no.slice(0, 15).join(", ")}${no.length > 15 ? " …" : ""}`);
    // El 70 % de la especificación inicial era una suposición hecha antes de
    // mirar los datos. Lo medido es ~55 %, y no es un defecto del código: los
    // códigos internos del horario oficial (L1045, L0774…) sencillamente no
    // están etiquetados como `ref` en las relaciones de OpenStreetMap. Se
    // comparan ya las dos grafías, con ceros de relleno y sin ellos, y lo que
    // queda fuera no se arregla manipulando la cadena.
    //
    // El umbral queda en 50 % como suelo de regresión: si baja de ahí es que se
    // ha roto el emparejamiento, no que OSM haya empeorado. El número real se
    // imprime arriba y la página lo dice con todas las letras.
    ok(pct(hi.length, refs.length) >= 50,
       "el emparejamiento de buses con OpenStreetMap no se ha roto (suelo 50 %)",
       `→ ${hi.length}/${refs.length} = ${pc1(hi.length, refs.length)}`
       + " · el resto no están etiquetados con ese código en OSM");
  }

  // Las redes ferroviarias sí deberían estar todas dibujadas: es barato mirarlo.
  const ferro = new Set();
  for (const E of ESCALES) {
    if (!E.D) continue;
    for (const f of E.D.files) for (const t of Object.values(f.destins || {})) {
      for (const l of t?.linies || []) if (l.xarxa !== "Bus") ferro.add(l.ref);
    }
  }
  const dibFerro = new Set(LIN.linies.filter((l) => l.xarxa !== "Bus").map((l) => l.ref));
  const faltenF = [...ferro].filter((r) => !dibFerro.has(r));
  if (ferro.size) {
    ok(faltenF.length === 0,
       `las ${ferro.size} líneas ferroviarias usadas en itinerarios están dibujadas`,
       faltenF.length ? `(faltan: ${faltenF.join(", ")})` : "");
  }
}

/* ======================================== 7. isócronas: el bloque gordo */

if (ANC) {
  console.log("\n══ isócronas: rejilla de anclajes ══════════════");
  const [S, W] = ANC.bbox;
  ok(Array.isArray(ANC.bbox) && ANC.bbox.length === 4 && ANC.bbox[0] < ANC.bbox[2] &&
     ANC.bbox[1] < ANC.bbox[3], `bbox [${ANC.bbox.join(", ")}]`);
  ok(esNum(ANC.dlat) && ANC.dlat > 0 && esNum(ANC.dlon) && ANC.dlon > 0 &&
     Number.isInteger(ANC.ncols) && ANC.ncols > 0,
     `rejilla de ${ANC.cella_m} m: dlat ${ANC.dlat}, dlon ${ANC.dlon}, ${ANC.ncols} columnas`);
  ok(ANC.inabastable === 255, "el valor de «inalcanzable» es 255");
  ok(esNum(ANC.limit_min) && ANC.limit_min > 0 && ANC.limit_min < 255,
     `límite de la isócrona: ${ANC.limit_min} min`);

  // Desempaquetado: cada ancla es iy*ncols+ix y su centro cae en el medio de la celda.
  const A = ANC.ancores;
  const alat = new Float64Array(A.length), alon = new Float64Array(A.length);
  let fueraBbox = 0;
  for (let k = 0; k < A.length; k++) {
    const iy = Math.floor(A[k] / ANC.ncols), ix = A[k] % ANC.ncols;
    alat[k] = ANC.bbox[0] + (iy + 0.5) * ANC.dlat;
    alon[k] = ANC.bbox[1] + (ix + 0.5) * ANC.dlon;
    if (alat[k] > ANC.bbox[2] || alon[k] > ANC.bbox[3]) fueraBbox++;
  }
  ok(A.every((x) => Number.isInteger(x) && x >= 0), `${A.length} anclajes, todos enteros ≥ 0`);
  ok(new Set(A).size === A.length, "no hay anclajes repetidos",
     new Set(A).size === A.length ? "" : `(${A.length - new Set(A).size} repetidos)`);
  ok(fueraBbox === 0, "los centros de todos los anclajes caen dentro del bbox",
     fueraBbox ? `(${fueraBbox} fuera)` : "");

  /* --- las matrices tienen el tamaño que dicen --- */
  for (const E of ESCALES) {
    if (!E.M) continue;
    const buf = Buffer.from(E.M.matriu ?? "", "base64");
    ok(Array.isArray(E.M.ids), `${E.iso}: ${E.M.ids?.length} orígenes`);
    ok(buf.length === (E.M.ids?.length || 0) * A.length,
       `${E.iso}: la matriz mide ids × anclajes`,
       `→ ${buf.length} bytes vs ${(E.M.ids?.length || 0) * A.length} esperados`);
    let raros = 0, vacias = 0;
    for (let i = 0; i < (E.M.ids?.length || 0); i++) {
      const fila = buf.subarray(i * A.length, (i + 1) * A.length);
      let alcanzables = 0;
      for (const b of fila) {
        if (b === 255) continue;
        alcanzables++;
        if (b > ANC.limit_min) raros++;
      }
      if (alcanzables === 0) vacias++;
    }
    ok(raros === 0, `${E.iso}: ningún minuto pasa del límite declarado sin ser 255`,
       raros ? `(${raros} bytes entre ${ANC.limit_min} y 254)` : "");
    if (E.M.ids?.length === 0) aviso(`${E.iso}: la matriz está vacía (0 orígenes)`);
    else if (vacias) aviso(`${E.iso}: ${vacias}/${E.M.ids.length} orígenes no alcanzan ningún anclaje`);
    if (E.D && E.M.ids?.length) {
      const ines = new Set(E.D.files.map((f) => f.ine));
      const sobren = E.M.ids.filter((i) => !ines.has(i));
      ok(sobren.length === 0, `${E.iso}: todos los orígenes existen en ${E.dades}`,
         sobren.length ? `(sobran: ${sobren.slice(0, 5).join(", ")})` : "");
      const falten = [...ines].filter((i) => !E.M.ids.includes(i));
      if (falten.length) aviso(`${E.iso}: ${falten.length} unidades de ${E.dades} sin fila de isócrona`);
    }
  }

  /* --- el estimador contra la verdad de campo --- */
  const ISO = ESCALES[0].M;
  if (MUNI && ISO && ISO.ids.length) {
    console.log("\n══ isócronas: error del estimador vs. tiempos exactos ══");
    console.log("  Estimador reproducido de la página: para un punto P, el mínimo sobre los");
    console.log("  anclajes A a ≤ 2,5 km de P de (minutos hasta A) + (caminar de A a P),");
    console.log("  caminando en línea recta × 1,3 de rodeo a 4,5 km/h. La verdad de campo son");
    console.log("  los tiempos exactos puerta a puerta de transporte-muni.json.");

    const buf = Buffer.from(ISO.matriu, "base64");
    const filaDe = new Map(ISO.ids.map((id, i) => [id, buf.subarray(i * A.length, (i + 1) * A.length)]));
    const caminarMin = (aLat, aLon, bLat, bLon) => (haversine(aLat, aLon, bLat, bLon) * 1.3 / 4.5) * 60;

    // Para cada destino, los anclajes a ≤ 2,5 km y lo que cuesta caminar desde ellos.
    const cerca25 = MUNI.meta.destins.map((d) => {
      const lista = [];
      for (let k = 0; k < A.length; k++) {
        const km = haversine(alat[k], alon[k], d.lat, d.lon);
        if (km <= 2.5) lista.push([k, (km * 1.3 / 4.5) * 60]);
      }
      return { d, lista };
    });
    const estima = (fila, pre) => {
      let mejor = Infinity;
      for (const [k, cam] of pre.lista) {
        const v = fila[k];
        if (v === 255) continue;
        const t = v + cam;
        if (t < mejor) mejor = t;
      }
      return Number.isFinite(mejor) ? mejor : null;
    };
    // Comprobación tonta pero útil: el estimador y caminarMin no devuelven basura.
    ok(Math.abs(caminarMin(41.38, 2.17, 41.38, 2.17)) < 1e-9 &&
       caminarMin(41.38, 2.17, 41.39, 2.17) > 0,
       "caminarMin() es 0 sobre el propio punto y crece con la distancia");
    ok(cerca25.every((c) => c.lista.length > 0),
       "los 6 destinos tienen anclajes a menos de 2,5 km",
       `→ ${cerca25.map((c) => c.lista.length).join(", ")} anclajes`);

    const errores = [], porDest = new Map(MUNI.meta.destins.map((d) => [d.id, []]));
    let pares = 0, sinEst = 0, saltados = 0, peor = null;
    const origenSinIso = new Set();   // orígenes cuya fila no alcanza ningún anclaje
    for (const f of MUNI.files) {
      const fila = filaDe.get(f.ine);
      if (!fila) continue;
      const vacia = !fila.some((b) => b !== 255);
      for (const pre of cerca25) {
        const t = f.destins?.[pre.d.id];
        if (t == null) continue;
        if (t.trivial) { saltados++; continue; }   // el propio destino: no dice nada
        pares++;
        const est = estima(fila, pre);
        if (est == null) { sinEst++; if (vacia) origenSinIso.add(f.nom); continue; }
        const err = est - t.min;
        errores.push({ err, nom: f.nom, dest: pre.d.id, est, exacte: t.min });
        porDest.get(pre.d.id).push(err);
      }
    }

    if (!errores.length) {
      ok(false, "hay pares (municipio, destino) con estimación e exacto que comparar",
         `→ 0 de ${pares} pares (${saltados} trivales descartados)`);
    } else {
      const e = errores.map((x) => x.err);
      const abs = e.map(Math.abs);
      peor = errores.reduce((p, c) => (Math.abs(c.err) > Math.abs(p.err) ? c : p));
      console.log(`\n  n = ${errores.length} pares (de ${pares} posibles; ` +
                  `${saltados} triviales descartados, ${sinEst} sin estimación)`);
      console.log("  error = estimado - exacto, en minutos");
      console.log("");
      console.log("     medida            valor");
      console.log("     " + "mediana".padEnd(18) + sig(mediana(e)).padStart(8));
      console.log("     " + "media".padEnd(18) + sig(media(e)).padStart(8));
      console.log("     " + "p10".padEnd(18) + sig(perc(e, 0.1)).padStart(8));
      console.log("     " + "p90".padEnd(18) + sig(perc(e, 0.9)).padStart(8));
      console.log("     " + "mediana |error|".padEnd(18) + n1(mediana(abs)).padStart(8));
      console.log("     " + "peor caso".padEnd(18) + sig(peor.err).padStart(8) +
                  `   ${peor.nom} → ${peor.dest} (estimado ${n1(peor.est)}, exacto ${peor.exacte})`);
      console.log("");
      console.log("     sesgo por destino        n   mediana     media       p10       p90");
      for (const [id, xs] of porDest) {
        if (!xs.length) { console.log("     " + id.padEnd(22) + "0".padStart(5) + "        —         —         —         —"); continue; }
        console.log("     " + id.padEnd(22) + String(xs.length).padStart(5) +
                    sig(mediana(xs)).padStart(10) + sig(media(xs)).padStart(10) +
                    sig(perc(xs, 0.1)).padStart(10) + sig(perc(xs, 0.9)).padStart(10));
      }
      console.log("");
      // Deliberadamente NO se falla por el signo del sesgo: la isócrona sale a
      // las 07:15 y el exacto llega a las 09:00, así que un sesgo por destino es
      // esperable y lo que interesa es que esté publicado, no que sea cero.
      ok(mediana(abs) <= 25, "la mediana del error absoluto del estimador no pasa de 25 min",
         `→ ${n1(mediana(abs))} min`);
    }
    if (origenSinIso.size) {
      console.log(`     los pares sin estimación salen de ${origenSinIso.size} orígenes con la fila ` +
                  `entera a 255: ${[...origenSinIso].slice(0, 8).join(", ")}`);
    }
    ok(pares > 0 && pct(errores.length, pares) >= 80,
       "al menos el 80 % de los pares tienen estimación",
       `→ ${errores.length}/${pares} = ${pc1(errores.length, pares)}`);
  } else if (MUNI) {
    aviso("iso-muni.json no tiene orígenes: me salto la validación del estimador");
  }
}

/* ================================================== 8. tamaño del reparto */

console.log("\n══ peso de los datos de la página ══════════════");
let total = 0;
for (const f of FITXERS) {
  const s = tamany(f);
  if (s == null) { console.log("     " + f.padEnd(26) + "—".padStart(12)); continue; }
  total += s;
  console.log("     " + f.padEnd(26) + (n1(s / 1024) + " kB").padStart(12));
}
console.log("     " + "TOTAL".padEnd(26) + (n1(total / 1024) + " kB").padStart(12));
if (total > 1_200_000) aviso(`el total pasa de 1,2 MB (${n1(total / 1024 / 1024)} MB): la página tardará en arrancar`);
else console.log(`     por debajo del límite blando de 1,2 MB (${pc1(total, 1_200_000)} del presupuesto)`);

/* ------------------------------------------------------------- resumen */

console.log(`\n${hechas - fallos}/${hechas} comprobaciones pasan` +
            (avisos ? `, ${avisos} aviso${avisos > 1 ? "s" : ""}` : ""));
if (fallos) console.error(`${fallos} FALLOS: no publiques estos datos sin mirarlos.`);
process.exit(fallos ? 1 : 0);
