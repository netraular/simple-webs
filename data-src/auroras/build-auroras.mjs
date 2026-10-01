/**
 * Genera `pages/data/auroras.json`: la actividad geomagnética desde 1932 y el
 * ciclo solar, para que `pages/auroras.html` cuente cuándo hubo las auroras más
 * potentes y cuándo es más probable que se repitan.
 *
 * Aquí solo se descarga, se compacta y se valida. Todo lo que depende del lugar
 * del lector (umbral de Kp, horas de noche) lo calcula la página encima.
 *
 * Fuentes (detalle en `auroras.SOURCES.md`):
 *   - GFZ Potsdam: Kp de cada 3 horas desde 1932-01-01.
 *   - WDC Kyoto: Dst horario desde 1957 (definitivo, provisional, tiempo real).
 *   - SILSO (Observatorio Real de Bélgica): número de manchas mensual y suavizado.
 *   - NOAA SWPC: previsión mensual del ciclo 25 hasta su final.
 *
 * Ningún valor se inventa ni se interpola. Los únicos números puestos a mano son
 * los supuestos del ciclo 26 (`CICLO26`), que todavía no ha empezado: llevan su
 * fuente al lado y la página los presenta como supuesto, no como dato.
 *
 * Las descargas crudas se cachean en `_work/`. `--fresh` fuerza la redescarga.
 *
 * Uso:  node build-auroras.mjs [--fresh]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const WORK = new URL("_work/", import.meta.url);
const OUT = new URL("../../pages/data/auroras.json", import.meta.url);
const FRESH = process.argv.includes("--fresh");
mkdirSync(new URL("dst/", WORK), { recursive: true });

const UA = "Mozilla/5.0 (simple-webs build-auroras.mjs)";

/* ---------------------------------------------------------------- descargas */

/**
 * Descarga con caché. `opcional` devuelve null ante un 404/403 en vez de
 * abortar: Kyoto publica cada mes en una sola de sus tres carpetas
 * (definitivo, provisional o tiempo real) y las otras dos responden 404/403.
 */
async function get(url, cacheName, { opcional = false, minLen = 100 } = {}) {
  const file = new URL(cacheName, WORK);
  if (!FRESH && existsSync(file)) return readFileSync(file, "utf8");
  let last;
  for (let intento = 1; intento <= 4; intento++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(120_000) });
      if (opcional && (r.status === 404 || r.status === 403)) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const txt = await r.text();
      if (txt.length < minLen) throw new Error(`respuesta sospechosamente corta (${txt.length} B)`);
      writeFileSync(file, txt);
      return txt;
    } catch (e) {
      last = e;
      await new Promise((ok) => setTimeout(ok, 1500 * intento));
    }
  }
  throw new Error(`no se pudo descargar ${url}: ${last.message}`);
}

const dia = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const diaNum = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400e3;

/* ------------------------------------------------------------- Kp del GFZ */

console.log("Kp (GFZ)…");
const kpTxt = await get("https://kp.gfz.de/app/files/Kp_ap_Ap_SN_F107_since_1932.txt", "kp-gfz.txt", {
  minLen: 1e6,
});

/**
 * Una línea por día: fecha, 8 valores de Kp en décimas exactas de tercio
 * (0.000, 0.333, 0.667…), 8 de ap, Ap, número de manchas diario y F10.7.
 * Se codifica cada Kp en tercios (0…27) como un carácter, `48 + tercios`:
 * 8 caracteres por día, ~280 kB para 95 años, y la página lo lee sin parsear.
 */
let kp = "";
let kpDesde = null, kpHasta = null, prev = null, provisionales = 0;
for (const linea of kpTxt.split("\n")) {
  if (!linea.trim() || linea.startsWith("#")) continue;
  const c = linea.trim().split(/\s+/);
  const f = dia(+c[0], +c[1], +c[2]);
  if (prev !== null && diaNum(f) !== diaNum(prev) + 1) throw new Error(`Kp: hueco entre ${prev} y ${f}`);
  prev = f;
  kpDesde ??= f;
  kpHasta = f;
  for (let i = 7; i < 15; i++) {
    const v = Number(c[i]);
    const t = Math.round(v * 3);
    if (!(v >= 0) || t > 27 || Math.abs(v * 3 - t) > 0.02) throw new Error(`Kp raro ${c[i]} el ${f}`);
    kp += String.fromCharCode(48 + t);
  }
  // Última columna: 0 = provisional (quick-look), 1 = definitivo, 2 = definitivo y validado.
  if (c[27] === "0") provisionales++;
}
const nDias = kp.length / 8;
console.log(`  ${nDias} días, ${kpDesde} → ${kpHasta} (${provisionales} provisionales al final)`);

/* ------------------------------------------------------------ Dst de Kyoto */

/**
 * Página mensual con un <pre>: una fila por día, el número del día en 2
 * caracteres y luego 3 bloques de 8 horas, cada bloque un espacio + 8 campos
 * de 4 caracteres. Ancho fijo a propósito: "-412-405" no lleva espacio entre
 * valores. 9999 es hueco.
 */
function parseDst(html, y, m) {
  const out = new Map();
  const pre = html.slice(html.indexOf("DAY"));
  for (const linea of pre.split("\n").slice(1)) {
    if (!/^\s?\d{1,2}\s/.test(linea)) continue;
    const d = +linea.slice(0, 2);
    const resto = linea.slice(2);
    const vals = [];
    for (let b = 0; b < 3; b++) {
      const bloque = resto.slice(b * 33 + 1, b * 33 + 33);
      for (let k = 0; k < 8; k++) {
        const s = bloque.slice(k * 4, k * 4 + 4).trim();
        if (s === "") continue;
        const v = Number(s);
        if (!Number.isFinite(v)) throw new Error(`Dst ${y}-${m}-${d}: campo raro "${s}"`);
        if (v !== 9999) vals.push(v);
      }
    }
    if (vals.length) out.set(dia(y, m, d), Math.min(...vals));
  }
  return out;
}

console.log("Dst (WDC Kyoto)…");
const dstMin = new Map(); // día -> Dst mínimo horario (nT)
const dstVersion = { final: 0, provisional: 0, realtime: 0 };
const [hy, hm] = [+kpHasta.slice(0, 4), +kpHasta.slice(5, 7)];
const meses = [];
for (let y = 1957; y <= hy; y++) for (let m = 1; m <= 12; m++) if (y < hy || m <= hm) meses.push([y, m]);
let hecho = 0;
async function mesDst([y, m]) {
  const ym = `${y}${String(m).padStart(2, "0")}`;
  for (const v of ["final", "provisional", "realtime"]) {
    const html = await get(`https://wdc.kugi.kyoto-u.ac.jp/dst_${v}/${ym}/index.html`, `dst/${ym}-${v}.html`, {
      opcional: true,
    });
    if (html && html.includes("DAY")) {
      dstVersion[v]++;
      for (const [k, x] of parseDst(html, y, m)) dstMin.set(k, x);
      if (++hecho % 120 === 0) console.log(`  ${hecho}/${meses.length} meses`);
      return;
    }
  }
  console.warn(`  ! sin Dst publicado para ${ym}`);
}
// De cuatro en cuatro: con caché fría son ~840 páginas y no hay prisa.
for (let i = 0; i < meses.length; i += 4) await Promise.all(meses.slice(i, i + 4).map(mesDst));
console.log(`  ${dstMin.size} días con Dst (definitivo ${dstVersion.final}, provisional ${dstVersion.provisional}, tiempo real ${dstVersion.realtime} meses)`);

/**
 * Solo viajan los días de tormenta intensa (Dst ≤ −100 nT, el umbral clásico
 * de Gonzalez et al. 1994): la página usa el Dst para ordenar las tormentas
 * más fuertes, donde el Kp ya está saturado en 9, no para nada diario.
 */
const DST_UMBRAL = -100;
const dst = {};
for (const [k, v] of [...dstMin].sort()) if (v <= DST_UMBRAL) dst[k] = v;

/* ------------------------------------------------------ manchas: SILSO */

console.log("Manchas solares (SILSO)…");
const [snM, snMs] = await Promise.all([
  get("https://www.sidc.be/SILSO/DATA/SN_m_tot_V2.0.txt", "sn-mensual.txt"),
  get("https://www.sidc.be/SILSO/DATA/SN_ms_tot_V2.0.txt", "sn-suavizado.txt"),
]);
/** Columnas: año, mes, fecha decimal, valor, desviación, nº obs., marca provisional. −1 = sin dato. */
function serieSilso(txt) {
  const m = new Map();
  for (const l of txt.split("\n")) {
    const c = l.trim().split(/\s+/);
    if (c.length < 4) continue;
    const v = Number(c[3]);
    if (v >= 0) m.set(`${c[0]}-${c[1].padStart(2, "0")}`, v);
  }
  return m;
}
const snMensual = serieSilso(snM);
const snSuave = serieSilso(snMs);

/**
 * Mínimos y máximos de ciclo: extremos del suavizado a 13 meses que lo son en
 * ±48 meses a la redonda. Con empate (1913, 1923, 1996 repiten valor dos meses
 * seguidos) se queda el primero; SILSO a veces da el segundo, un mes de
 * diferencia que aquí no cambia nada. `test-auroras.mjs` contrasta las fechas.
 */
const claves = [...snSuave.keys()].sort();
const vals = claves.map((k) => snSuave.get(k));
const extremos = (cmp) => {
  const r = [];
  for (let i = 48; i < vals.length - 6; i++) {
    const w = vals.slice(Math.max(0, i - 48), i + 49);
    const objetivo = cmp === "min" ? Math.min(...w) : Math.max(...w);
    if (vals[i] === objetivo && !(r.length && i - r.at(-1).i < 48)) r.push({ i, mes: claves[i], sn: vals[i] });
  }
  return r;
};
const minimos = extremos("min");
const maximos = extremos("max");

/** Numeración oficial: el ciclo 1 empieza en el mínimo de 1755. */
const ciclos = [];
minimos.forEach((mn, k) => {
  const n = k + 1;
  const sig = minimos[k + 1];
  const mx = maximos.find((x) => x.mes > mn.mes && (!sig || x.mes < sig.mes));
  if (!mx) return;
  ciclos.push({ n, min: mn.mes, snMin: mn.sn, max: mx.mes, snMax: mx.sn, fin: sig ? sig.mes : null });
});
if (minimos[0].mes !== "1755-02") throw new Error(`el primer mínimo debería ser 1755-02 y es ${minimos[0].mes}`);
const ciclosKp = ciclos.filter((c) => !c.fin || c.fin >= "1932-01");
console.log("  ciclos con Kp: " + ciclosKp.map((c) => `${c.n} (máx ${c.max}, ${c.snMax})`).join(", "));

/* ------------------------------------------- previsión del ciclo 25: NOAA */

console.log("Previsión del ciclo (NOAA SWPC)…");
const pred = JSON.parse(
  await get("https://services.swpc.noaa.gov/json/solar-cycle/predicted-solar-cycle.json", "noaa-prediccion.json"),
);
const prediccion = pred.map((p) => ({
  mes: p["time-tag"],
  sn: p.predicted_ssn,
  bajo: p.low_ssn,
  alto: p.high_ssn,
}));

/**
 * Supuestos del ciclo 26, que no ha empezado. La página los usa para situar en
 * el tiempo la fase de los años 2031+ y enseña el margen al lector.
 *   - Mínimo: NOAA dice que el ciclo 26 empezará "entre enero de 2029 y
 *     diciembre de 2032"; su curva del ciclo 25 toca fondo (SN 8) en 2030-12.
 *   - Máximo: las predicciones publicadas van de sep-2034 (Rodríguez et al.
 *     2024) a mar-2036 (Javaraiah 2019), con Luo & Tan 2024 en 2035–36. Se
 *     toma el centro, 2035-06, y ±1,5 años lo cubre todo.
 * Fuentes y amplitudes previstas en `auroras.SOURCES.md` § "Ciclo 26".
 */
const CICLO26 = {
  min: "2030-12",
  minMargen: 1.5, // ± años
  max: "2035-06",
  maxMargen: 1.5,
  // Máximo de manchas (13 meses suavizado). Centro de las previsiones publicadas
  // (107 Wu & Qin 2021, 121 Rodríguez et al. 2024, 133 Luo & Tan 2024); el techo
  // es repetir el 25 (Asikainen & Mantere 2023 lo ven "probablemente más fuerte").
  sn: { central: 120, bajo: 107, alto: 161 },
  fuente: "NOAA SWPC (inicio 2029–2032); Rodríguez et al. 2024, Luo & Tan 2024, Javaraiah 2019 (máximo 2034–2036)",
};

/* ------------------------------------- latitud geomagnética: AACGM-v2 */

/**
 * Las reglas que relacionan el Kp con la latitud del óvalo auroral están en
 * coordenadas geomagnéticas corregidas (AACGM), no en las de un dipolo: en
 * Europa la diferencia llega a 10° (Madrid: 43° de dipolo, 33° AACGM). La
 * página no puede calcular AACGM (son armónicos esféricos de orden 10 sobre el
 * IGRF), así que aquí se pide una rejilla mundial a la calculadora oficial de
 * Dartmouth (Shepherd 2014) y la página la interpola. Las ciudades de la lista
 * se piden exactas aparte, solo para que `test-auroras.mjs` mida el error de
 * interpolar.
 *
 * La calculadora acepta listas separadas por comas y las empareja punto a
 * punto: 100 puntos por petición, una docena de peticiones en total.
 */
console.log("Latitud geomagnética AACGM-v2 (Dartmouth)…");
const AACGM_URL = "https://sdnet.thayer.dartmouth.edu/aacgm/aacgm_calc.php";
const AACGM_FECHA = "20260101", AACGM_ALT = 110; // km: altura típica de la aurora verde
/** Una petición: devuelve Map "lat,lon" -> latitud AACGM, vacío si la calculadora la rechaza entera. */
async function aacgmPeticion(puntos, cacheName) {
  const file = new URL(cacheName, WORK);
  let txt;
  if (!FRESH && existsSync(file)) txt = readFileSync(file, "utf8");
  else {
    const body = new URLSearchParams({
      date_ymd: AACGM_FECHA, time_hms: "0000", alt: String(AACGM_ALT),
      lat: puntos.map((p) => p[0]).join(","), lon: puntos.map((p) => p[1]).join(","),
      x_flag: "0", t_flag: "0", g_flag: "0", submit: "Submit",
    });
    const r = await fetch(AACGM_URL, { method: "POST", body, headers: { "User-Agent": UA }, signal: AbortSignal.timeout(120_000) });
    if (!r.ok) throw new Error(`AACGM: HTTP ${r.status}`);
    txt = await r.text();
    writeFileSync(file, txt);
    await new Promise((ok) => setTimeout(ok, 700)); // sin prisa: es un servicio universitario
  }
  // Tras la última línea de guiones: lat lon (geográficas) latAACGM lonAACGM MLT por punto.
  // Un punto sin definir sale con menos columnas, así que no se lee de cinco en
  // cinco: se busca cada pareja pedida, en orden, y se toma el número que la sigue.
  const out = new Map();
  const plano = txt.replace(/<[^>]*>/g, " ");
  const i = plano.lastIndexOf("-------");
  if (i < 0) return out;
  const tok = plano.slice(i + 7).trim().split(/\s+/);
  let k = 0;
  for (const p of puntos) {
    const a = p[0].toFixed(4), b = p[1].toFixed(4);
    let j = k;
    while (j + 2 < tok.length && !(tok[j] === a && tok[j + 1] === b)) j++;
    if (j + 2 >= tok.length) continue;
    const v = Number(tok[j + 2]);
    if (/^-?\d+\.\d+$/.test(tok[j + 2])) out.set(`${p[0].toFixed(2)},${p[1].toFixed(2)}`, v);
    k = j + 2;
  }
  return out;
}
/**
 * Si un solo punto cae donde AACGM no está definido (junto al ecuador
 * magnético), la calculadora descarta la petición entera y no devuelve nada.
 * Entonces se parte por la mitad hasta aislarlo: ese punto queda a null.
 */
async function aacgm(puntos, cacheName) {
  const r = await aacgmPeticion(puntos, `${cacheName}.html`);
  const clave = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  if (r.size === 0 && puntos.length > 1) {
    const m = Math.ceil(puntos.length / 2);
    return [...(await aacgm(puntos.slice(0, m), `${cacheName}a`)), ...(await aacgm(puntos.slice(m), `${cacheName}b`))];
  }
  return puntos.map((p) => {
    const v = r.get(clave(p));
    return Number.isFinite(v) && Math.abs(v) <= 90 ? v : null;
  });
}
const REJ = { lat0: -80, dlat: 5, nlat: 33, lon0: -180, dlon: 10, nlon: 36 };
const nodos = [];
for (let a = 0; a < REJ.nlat; a++) for (let o = 0; o < REJ.nlon; o++) nodos.push([REJ.lat0 + a * REJ.dlat, REJ.lon0 + o * REJ.dlon]);
const rejilla = [];
for (let k = 0; k < nodos.length; k += 100) rejilla.push(...(await aacgm(nodos.slice(k, k + 100), `aacgm-rejilla-${k}`)));
const huecos = rejilla.filter((v) => v === null).length;
console.log(`  rejilla ${REJ.nlat}×${REJ.nlon}, ${huecos} nodos sin definir (ecuador magnético)`);
if (rejilla.length !== nodos.length || huecos > nodos.length * 0.15) throw new Error("AACGM: la rejilla ha llegado incompleta");

/** Las mismas ciudades que lista la página, para contrastar la interpolación. */
const CIUDADES = [
  ["Barcelona", 41.39, 2.17], ["Madrid", 40.42, -3.7], ["París", 48.86, 2.35], ["Londres", 51.51, -0.13],
  ["Edimburgo", 55.95, -3.19], ["Oslo", 59.91, 10.75], ["Reikiavik", 64.15, -21.94], ["Tromsø", 69.65, 18.96],
  ["Nueva York", 40.71, -74.01], ["Fairbanks", 64.84, -147.72], ["Ushuaia", -54.8, -68.3], ["Hobart", -42.88, 147.33],
];
const exactas = await aacgm(CIUDADES.map((c) => [c[1], c[2]]), "aacgm-ciudades");
const ciudadesAacgm = Object.fromEntries(CIUDADES.map((c, k) => [c[0], { lat: c[1], lon: c[2], mlat: exactas[k] }]));
console.log("  " + CIUDADES.map((c, k) => `${c[0]} ${exactas[k]?.toFixed(1)}°`).join(", "));

/* -------------------------------------------------------------- salida */

const desde = "1932-01";
const mensual = (m) => {
  const ks = [...m.keys()].filter((k) => k >= desde).sort();
  return { desde: ks[0], v: ks.map((k) => m.get(k)) };
};
const out = {
  meta: {
    generado: new Date().toISOString().slice(0, 10),
    kp: { desde: kpDesde, hasta: kpHasta, provisionales },
    dst: { umbral: DST_UMBRAL, dias: dstMin.size, desde: [...dstMin.keys()].sort()[0], versiones: dstVersion },
    fuentes: {
      kp: "GFZ Potsdam, Kp_ap_Ap_SN_F107_since_1932.txt (CC BY 4.0)",
      dst: "WDC for Geomagnetism, Kyoto (Dst definitivo/provisional/tiempo real)",
      manchas: "SILSO, Royal Observatory of Belgium (SN v2.0)",
      prediccion: "NOAA SWPC, predicted-solar-cycle.json",
    },
  },
  kp,
  dst,
  sn: mensual(snMensual),
  snSuave: mensual(snSuave),
  ciclos: ciclosKp,
  prediccion,
  ciclo26: CICLO26,
  aacgm: {
    fuente: `AACGM-v2, calculadora de Dartmouth (Shepherd 2014), ${AACGM_FECHA}, ${AACGM_ALT} km`,
    ...REJ,
    v: rejilla.map((v) => (v === null ? null : Math.round(v * 10) / 10)),
    ciudades: ciudadesAacgm,
  },
};
writeFileSync(OUT, JSON.stringify(out));
console.log(`✓ ${OUT.pathname.split("/").slice(-3).join("/")} ${(JSON.stringify(out).length / 1024).toFixed(0)} kB`);
