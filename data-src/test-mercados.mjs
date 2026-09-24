/**
 * Comprobaciones sobre `pages/data/mercados.json` ya generado.
 *
 * Dos clases de prueba:
 *   1. Estructura: meses correlativos, sin NaN, cada serie dentro de su rango
 *      declarado, nada de ceros disfrazados de dato.
 *   2. Contraste con cifras publicadas por terceros (Damodaran, y un recálculo
 *      independiente sobre la hoja original de Shiller). Las tolerancias están
 *      puestas a mano y explicadas: no son "lo que salía hoy", son el margen
 *      que justifica la diferencia de convención documentada en
 *      `mercados.SOURCES.md`.
 *
 * Uso:  node test-mercados.mjs
 */
import { readFileSync } from "node:fs";

const D = JSON.parse(readFileSync(new URL("../pages/data/mercados.json", import.meta.url), "utf8"));
const M = D.meses;
const I = new Map(M.map((m, i) => [m, i]));
const mesNum = (k) => Number(k.slice(0, 4)) * 12 + Number(k.slice(5, 7)) - 1;

let fallos = 0, hechas = 0;
const ok = (cond, texto, detalle = "") => {
  hechas++;
  if (!cond) fallos++;
  console.log(`  ${cond ? "✓" : "✗"} ${texto}${detalle ? `  ${detalle}` : ""}`);
};
const cerca = (a, b, tol, texto) =>
  ok(Math.abs(a - b) <= tol, texto, `→ ${a.toFixed(2)} vs ${b.toFixed(2)} (tolerancia ${tol})`);

/* ------------------------------------------------------------- estructura */

console.log("Estructura");
ok(M.length === D.meta.n_meses, "el número de meses coincide con meta.n_meses");
ok(M[0] === "1871-01", "empieza en 1871-01");
ok(M.every((m, i) => i === 0 || mesNum(m) === mesNum(M[i - 1]) + 1), "los meses son correlativos, sin huecos");

for (const [id, s] of Object.entries(D.series)) {
  const v = s.v;
  const malos = v.filter((x) => x !== null && (!Number.isFinite(x) || x <= 0)).length;
  ok(malos === 0, `${id}: sin NaN, infinitos ni valores ≤ 0`, malos ? `(${malos} malos)` : "");
  const i0 = v.findIndex((x) => x !== null);
  let i1 = v.length - 1;
  while (i1 > 0 && v[i1] === null) i1--;
  ok(M[i0] === s.desde && M[i1] === s.hasta, `${id}: el rango declarado (${s.desde}→${s.hasta}) es el real`);
  const huecos = v.slice(i0, i1 + 1).filter((x) => x === null).length;
  ok(huecos === 0, `${id}: sin huecos dentro de su rango`, huecos ? `(${huecos} meses)` : "");
  ok(typeof s.dividendos === "boolean" && s.moneda && s.nombre, `${id}: lleva moneda, nombre y bandera de dividendos`);
}
for (const campo of ["ipc", "ipc_es", "eurusd"]) {
  ok(Array.isArray(D[campo]) && D[campo].length === M.length, `${campo}: alineado con el eje de meses`);
}

/* --------------------------------------------------------------- cálculos */

/** Media geométrica anual entre dos posiciones; NaN si falta algún extremo. */
const cagr = (v, a, b) =>
  v[a] == null || v[b] == null ? NaN : (Math.pow(v[b] / v[a], 12 / (b - a)) - 1) * 100;
const real = (v) => v.map((x, j) => (x == null || D.ipc[j] == null ? null : x / D.ipc[j]));
const tr = D.series.sp500_tr.v;
const trReal = real(tr);

console.log("\nCifras de largo plazo (recálculo independiente sobre la hoja de Shiller)");
const fin = I.get(D.meta.mes_final);
cerca(cagr(tr, 0, fin), 9.39, 0.05, "S&P 500 nominal 1871 → hoy ≈ 9,4 %/año");
cerca(cagr(trReal, 0, fin), 7.08, 0.05, "S&P 500 real 1871 → hoy ≈ 7,1 %/año");
cerca(cagr(D.ipc, 0, fin), 2.14, 0.05, "inflación de EE. UU. 1871 → hoy ≈ 2,1 %/año");

console.log("\nContraste con Damodaran (NYU), 1928–2025, geométrico nominal");
const a28 = I.get("1927-12"), b25 = I.get("2025-12");
// Tolerancia 0,25 pp: Damodaran encadena años naturales sobre cierres de fin de
// año y aquí el nivel es la media mensual de Shiller (ver mercados.SOURCES.md).
cerca(cagr(tr, a28, b25), 10.02, 0.25, "S&P 500 con dividendos");
cerca(cagr(D.series.bonos10.v, a28, b25), 4.54, 0.25, "bono del Tesoro a 10 años");
cerca(cagr(D.series.oro.v, a28, b25), 5.61, 0.25, "oro");
cerca(cagr(real(tr), a28, b25), 6.78, 0.25, "S&P 500 real");
cerca(cagr(real(D.series.bonos10.v), a28, b25), 1.46, 0.25, "bono a 10 años real");

console.log("\nVentanas móviles reales del S&P 500 (peor caso y reparto)");
const ventanas = (v, meses) => {
  const out = [];
  for (let i = 0; i + meses < v.length; i++) {
    if (v[i] == null || v[i + meses] == null) continue;
    out.push({ i, r: (Math.pow(v[i + meses] / v[i], 12 / meses) - 1) * 100 });
  }
  return out;
};
for (const [años, peorEsperado, mesEsperado, pctPositivo] of [
  [10, -5.92, "1999-03", 88.9],
  [15, -2.13, "1905-12", 95.6],
  [20, -0.22, "1901-06", 99.9],
  [30, 1.89, "1902-06", 100],
]) {
  const w = ventanas(trReal, años * 12);
  const peor = w.reduce((p, c) => (c.r < p.r ? c : p));
  const pos = (w.filter((d) => d.r >= 0).length / w.length) * 100;
  cerca(peor.r, peorEsperado, 0.05, `${años} años: la peor ventana real`);
  ok(M[peor.i] === mesEsperado, `${años} años: la peor ventana empieza en ${mesEsperado}`, `→ ${M[peor.i]}`);
  cerca(pos, pctPositivo, 0.1, `${años} años: % de ventanas en positivo`);
}

console.log("\nHechos comprobables de las series secundarias");
{
  const nk = D.series.nikkei.v, pico = I.get("1989-12");
  let rec = null;
  for (let j = pico + 1; j < M.length; j++) if (nk[j] != null && nk[j] >= nk[pico]) { rec = M[j]; break; }
  ok(rec === "2024-02", "el Nikkei 225 recupera su cierre de diciembre de 1989 en febrero de 2024", `→ ${rec}`);
  const maxPrevio = Math.max(...nk.slice(0, pico).filter((x) => x != null));
  ok(nk[pico] > maxPrevio, "diciembre de 1989 es el máximo del Nikkei hasta esa fecha (alineación de meses correcta)");
}
{
  const btc = D.series.bitcoin.v;
  ok(D.series.bitcoin.desde === "2014-09", "bitcoin empieza en 2014-09", `→ ${D.series.bitcoin.desde}`);
  ok(btc[I.get("2014-08")] === null, "bitcoin no tiene dato antes de su primer mes publicado");
}
{
  const e = D.eurusd;
  const primeros = e.slice(0, I.get("1999-01")).filter((x) => x !== null).length;
  ok(primeros === 0, "no hay tipo de cambio del euro antes de 1999");
  const v = e[I.get("1999-01")];
  ok(v > 1.1 && v < 1.2, "el euro arranca en 1,14 dólares (cierre de enero de 1999)", `→ ${v}`);
}

console.log(`\n${hechas - fallos}/${hechas} comprobaciones pasan`);
if (fallos) {
  console.error(`${fallos} FALLOS: no publiques este mercados.json sin mirarlos.`);
  process.exit(1);
}
