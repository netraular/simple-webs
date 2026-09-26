/**
 * Prueba las capas de transporte-publico.html contra los datos reales, sin
 * navegador.
 *
 * Extrae del HTML los bloques que no tocan el DOM —las utilidades de formato,
 * la tabla `CAPES` y la regresión— y los ejecuta contra `zonas.json`. Lo que se
 * busca es que ninguna de las capas que ofrece el desplegable reviente, dé NaN,
 * o prometa un mapa que saldría entero gris, y que la recta de tendencia del
 * gráfico tenga el signo que dice la página.
 *
 * Sustituye a test-logica.mjs y test-vistas.mjs, que hacían lo mismo con
 * pisos-vs-distancia.html antes de que esa página se fusionara en esta.
 *
 *   node test-capas.mjs
 */
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../pages/transporte-publico.html", import.meta.url), "utf8");
const js = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));

/** Recorta desde una marca hasta la siguiente aparición de otra (no la primera
 *  del fichero), para evaluar solo lo que no toca el DOM. */
function between(a, b) {
  const i = js.indexOf(a);
  if (i < 0) throw new Error(`no encuentro la marca de inicio: ${a}`);
  const j = js.indexOf(b, i + a.length);
  if (j < 0) throw new Error(`no encuentro la marca de fin: ${b}`);
  return js.slice(i, j);
}

const SEC = (n) => `/* ===========================================================================\n   ${n}`;

const puro = between("const R_EARTH", SEC("2. ESTADO"))       // utilidades y formato
           + between("const pct1 =", SEC("3. CARGA"))         // HIP, cuota, CAPES, capa()
           + between("/** Mínimos cuadrados", SEC("6. RENDER")); // ols, niceTicks

const { CAPES, CAPA_DE, ols, niceTicks, cuota, HIP, fmtMin } = new Function(`
  const getComputedStyle = () => ({ getPropertyValue: () => "#000" });
  const document = { documentElement: {} };
  const S = { capa: "compra_m2" };
  let ROWS = [], DATA = null, RANGS = new Map(), TREND = null;
  ${puro}
  return { CAPES, CAPA_DE, ols, niceTicks, cuota, HIP, fmtMin };
`)();

const Z = JSON.parse(readFileSync(new URL("../pages/data/zonas.json", import.meta.url), "utf8"));
const zones = Z.zones;

/* -------------------------------------------------------------------------- */

let pasan = 0, fallan = 0;
const ok = (cond, texto, detalle = "") => {
  console.log(`  ${cond ? "✓" : "✗"} ${texto}${detalle ? "  " + detalle : ""}`);
  cond ? pasan++ : fallan++;
};
const n1 = (v) => v.toFixed(1);

console.log("\n══ las capas del desplegable ═══════════════════");
console.log(`  ${CAPES.length} capas · ${zones.length} zonas\n`);

/* Cada zona necesita `valor` (el tiempo de viaje) para la capa «temps» y para
   el eje horizontal del gráfico. Aquí se simula el caso más común: un solo
   destino marcado, Plaça de Catalunya. */
const DEST = "pl-catalunya";
const filas = zones.map(m => ({ ...m, valor: m.destins?.[DEST]?.min ?? null }));

console.log("     capa                      con dato   mín          máx");
let sinDato = [], conNaN = [], fmtMal = [];
for (const c of CAPES) {
  const vs = filas.map(m => c.get(m)).filter(v => v !== null && v !== undefined);
  const nums = vs.filter(v => typeof v === "number" && Number.isFinite(v));
  if (nums.length !== vs.length) conNaN.push(c.id);
  if (!nums.length) { sinDato.push(c.id); continue; }
  const lo = Math.min(...nums), hi = Math.max(...nums);
  // El formateador tiene que sobrevivir a los dos extremos y devolver texto.
  for (const v of [lo, hi]) {
    const t = c.fmt(v);
    if (typeof t !== "string" || !t.length || /NaN|Infinity|undefined/.test(t)) {
      fmtMal.push(`${c.id}→${t}`);
    }
  }
  console.log("     " + c.id.padEnd(24)
    + String(nums.length).padStart(7) + "/" + zones.length
    + "   " + String(c.fmt(lo)).padStart(11)
    + "  " + String(c.fmt(hi)).padStart(11)
    + (c.muni ? "   solo municipal" : ""));
}
console.log("");

ok(sinDato.length === 0, "todas las capas tienen dato en alguna zona",
   sinDato.length ? `(vacías: ${sinDato.join(", ")})` : "");
ok(conNaN.length === 0, "ninguna capa produce NaN ni Infinity",
   conNaN.length ? `(${conNaN.join(", ")})` : "");
ok(fmtMal.length === 0, "todos los formateadores devuelven texto legible en los extremos",
   fmtMal.length ? `(${fmtMal.join(", ")})` : "");

/* Las capas marcadas `muni` no deben tener ni un valor en los barrios, y las
   que no lo están deben llegar a los 73. Si esto se cruza, la leyenda miente. */
let cobMal = [];
for (const c of CAPES) {
  if (c.viu) continue;                       // el tiempo no es un indicador
  const bar = zones.filter(m => m.tipus === "barri" && c.get(m) != null).length;
  if (c.muni && bar > 0) cobMal.push(`${c.id} dice municipal y tiene ${bar} barrios`);
  if (!c.muni && bar === 0) cobMal.push(`${c.id} no dice municipal y no tiene ningún barrio`);
}
ok(cobMal.length === 0, "la marca «solo municipal» coincide con los datos",
   cobMal.length ? `(${cobMal.join("; ")})` : "");

/* Los identificadores son la clave del desplegable, del estado y de la columna
   de la tabla: repetir uno rompería las tres cosas a la vez. */
const ids = CAPES.map(c => c.id);
ok(new Set(ids).size === ids.length, "los identificadores de capa son únicos");
ok(CAPES.every(c => c.nom && c.eix && c.nota && typeof c.get === "function"
                 && typeof c.fmt === "function"),
   "cada capa lleva nombre, unidad, nota y sus dos funciones");
ok(CAPA_DE.get("compra_m2") !== undefined,
   "la capa por defecto del estado inicial existe");

/* -------- la hipoteca -------- */
console.log("\n══ la cuota de hipoteca ════════════════════════");
const PRECIO = 300000;
const c300 = cuota(PRECIO);
// Comprobación independiente de la fórmula francesa, escrita aparte a
// propósito: si las dos coinciden, el error tendría que estar en las dos.
const cap = PRECIO * (1 - HIP.entrada), i = HIP.tin / 12, n = HIP.anys * 12;
const esperada = cap * i / (1 - Math.pow(1 + i, -n));
ok(Math.abs(c300 - esperada) < 0.01,
   `un piso de ${PRECIO} € sale a ${n1(c300)} €/mes`,
   `(${HIP.entrada * 100} % de entrada, ${HIP.anys} años, ${HIP.tin * 100} % TIN)`);
ok(c300 > 0 && c300 < PRECIO / 12, "la cuota es positiva y menor que el precio anualizado");
ok(cuota(2 * PRECIO) > cuota(PRECIO), "a más precio, más cuota");

/* -------- la recta del gráfico -------- */
console.log("\n══ la recta de precio contra tiempo ════════════");
const pts = filas
  .filter(m => m.valor != null && m.compra_eur_m2 != null)
  .map(m => [m.valor, m.compra_eur_m2]);
const t = ols(pts);
ok(t != null, `hay recta con los ${pts.length} pares de ${DEST}`);
if (t) {
  console.log(`     precio = ${n1(t.a)} − ${n1(-t.b)} €/m² por minuto · R² = ${n1(t.r2 * 100)} %`);
  // El signo es la afirmación de la página: cuanto más lejos, más barato. Si
  // algún día sale al revés, la frase del gráfico estaría mintiendo.
  ok(t.b < 0, "cuanto más lejos, más barato: la pendiente es negativa",
     `(${n1(t.b)} €/m² por minuto)`);
  ok(t.r2 >= 0 && t.r2 <= 1, `el R² cae entre 0 y 1`, `(${n1(t.r2 * 100)} %)`);
  ok(Number.isFinite(t.a) && Number.isFinite(t.b), "la recta no tiene coeficientes rotos");
}
ok(ols([[1, 1], [2, 2]]) === null, "con menos de tres puntos no se dibuja recta");
ok(ols([[1, 5], [1, 7], [1, 9]]) === null, "con todas las x iguales tampoco");

/* -------- las marcas de los ejes -------- */
console.log("\n══ las marcas de los ejes ══════════════════════");
let ticksMal = [];
for (const [lo, hi] of [[0, 1], [0, 143], [1200, 8300], [0.0, 0.7], [-5, 5], [10, 10]]) {
  const ts = niceTicks(lo, hi, 5);
  if (!ts.length) { ticksMal.push(`${lo}..${hi} sin marcas`); continue; }
  if (ts.some(v => !Number.isFinite(v))) ticksMal.push(`${lo}..${hi} con marcas rotas`);
  if (ts.some(v => v < lo - 1e-9 || v > hi + 1e-9)) ticksMal.push(`${lo}..${hi} se sale`);
}
ok(ticksMal.length === 0, "las marcas caen dentro del rango y son finitas",
   ticksMal.length ? `(${ticksMal.join("; ")})` : "");

/* -------- el formato de minutos -------- */
ok(fmtMin(45) === "45 min" && fmtMin(85) === "1 h 25" && fmtMin(null) === "—",
   "los minutos se leen como «45 min», «1 h 25» y «—»");

console.log(`\n${pasan}/${pasan + fallan} comprobaciones pasan`);
if (fallan) process.exit(1);
