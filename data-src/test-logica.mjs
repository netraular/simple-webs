/**
 * Prueba de la lógica de la página contra los datos reales, sin navegador.
 *
 * Extrae del HTML los bloques puros (utilidades y definición de métricas), los
 * evalúa en Node y comprueba que cada métrica produce números con sentido sobre
 * pisos-bcn.json: rangos plausibles, nulos donde debe haberlos, y la regresión
 * distancia→precio con el signo esperado.
 */
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../pages/pisos-vs-distancia.html", import.meta.url), "utf8");
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

const puro = between("const R_EARTH", "/* ======") // utilidades
           + between("const MORTGAGE", "/* ===========================================================================\n   3. ESTADO");

const sandbox = `
  const $ = () => ({});
  const getComputedStyle = () => ({ getPropertyValue: () => "#000" });
  const document = { documentElement: {} };
  ${puro}
  return { METRICS, haversine, ols, cuota, median, niceTicks };
`;
const { METRICS, haversine, ols, cuota, median, niceTicks } = new Function(sandbox)();

const data = JSON.parse(readFileSync(new URL("../pages/data/pisos-bcn.json", import.meta.url), "utf8"));
const S = { m2: 80 };

let fallos = 0;
const check = (ok, msg) => { console.log((ok ? "  ✓ " : "  ✗ ") + msg); if (!ok) fallos++; };

// Métricas que pueden valer cero legítimamente: un municipio sin estación ni
// bus útil tiene cero salidas en hora punta, y eso es el dato, no un fallo.
const ZERO_OK = new Set(["transit_freq"]);

console.log("── métricas sobre los 92 municipios ────────────");
for (const M of METRICS) {
  const vals = data.municipis.map(m => M.get(m, S)).filter(v => v != null);
  const disponible = M.needs.every(f => data.municipis.some(m => m[f] != null));
  if (!disponible) { console.log(`  — ${M.label}: sin datos de origen, la página la oculta`); continue; }
  const lo = Math.min(...vals), hi = Math.max(...vals);
  console.log(`  ${M.label}`);
  console.log(`      n=${vals.length}  min=${M.fmt(lo)}  mediana=${M.fmt(median(vals))}  max=${M.fmt(hi)}`);
  check(vals.length > 50, `    cobertura suficiente (${vals.length})`);
  const suelo = ZERO_OK.has(M.id) ? 0 : Number.MIN_VALUE;
  check(vals.every(v => Number.isFinite(v) && v >= suelo), "    todos los valores finitos y no negativos");
}

console.log("\n── rangos esperados ────────────────────────────");
const bcn = data.municipis.find(m => m.nom === "Barcelona");
const ter = data.municipis.find(m => m.nom === "Terrassa");
check(bcn.compra_eur_m2 > 4000 && bcn.compra_eur_m2 < 5200, `Barcelona compra ${bcn.compra_eur_m2} €/m² en rango 4000-5200`);
check(ter.compra_eur_m2 > 1800 && ter.compra_eur_m2 < 2700, `Terrassa compra ${ter.compra_eur_m2} €/m² en rango 1800-2700`);
check(bcn.lloguer_eur_mes > 900 && bcn.lloguer_eur_mes < 1500, `Barcelona alquiler ${bcn.lloguer_eur_mes} €/mes en rango 900-1500`);

const rend = METRICS.find(M => M.id === "rendibilitat");
const rs = data.municipis.map(m => rend.get(m, S)).filter(v => v != null);
check(rs.every(v => v > 1 && v < 12), `rentabilidades entre 1 % y 12 % (min ${Math.min(...rs).toFixed(1)}, max ${Math.max(...rs).toFixed(1)})`);

console.log("\n── hipoteca ────────────────────────────────────");
// 200.000 € a 30 años al 3 % → ~843 €/mes (comprobable con cualquier simulador)
const c = cuota(200000, 0.03, 30);
check(Math.abs(c - 843.21) < 1, `cuota de 200.000 € al 3 % a 30 años = ${c.toFixed(2)} €/mes (esperado ≈843,21)`);

console.log("\n── geometría y distancias ──────────────────────");
/** Por id, nunca por posición: el orden de pois.json cambia cuando se añade un
 *  punto y un test que dependa de él miente sin fallar. */
const poi = (id) => {
  const p = data.pois.find(x => x.id === id);
  if (!p) throw new Error(`no existe el punto de referencia ${id}`);
  return p;
};
const cat = poi("pl-catalunya");
check(Math.abs(haversine(41.3870, 2.1701, 41.3870, 2.1701)) < 1e-9, "distancia de un punto a sí mismo = 0");
// Barcelona–Mataró en línea recta son ~28 km
const mat = data.municipis.find(m => m.nom === "Mataró");
const d = haversine(cat.lat, cat.lon, mat.lat, mat.lon);
check(d > 26 && d < 31, `Plaça Catalunya → Mataró = ${d.toFixed(1)} km (esperado 26-31)`);
// Castelldefels es el punto de partida contra el que compara la página.
check(data.meta.casa && data.municipis.some(m => m.ine === data.meta.casa),
  `meta.casa (${data.meta.casa}) apunta a un municipio que existe`);
check(poi("roche-sant-cugat") != null, "el punto de Roche Sant Cugat está publicado");

console.log("\n── tendencia precio vs distancia ───────────────");
// Solo los puntos del centro de Barcelona tienen gradiente de precio: es la
// ciudad la que lo genera, no un punto cualquiera del mapa.
for (const p of ["pl-catalunya", "sants", "diagonal-zu"].map(poi)) {
  const pts = data.municipis
    .filter(m => m.compra_eur_m2 != null)
    .map(m => [haversine(p.lat, p.lon, m.lat, m.lon), m.compra_eur_m2]);
  const t = ols(pts);
  console.log(`  ${p.nom.padEnd(34)} pendiente ${t.b.toFixed(1)} €/m² por km · R²=${t.r2.toFixed(2)}`);
  check(t.b < 0, `    el precio baja al alejarse de ${p.nom}`);
}
// Roche no lo tiene, y es un resultado, no un fallo: alejarse de Sant Cugat
// lleva tanto al Vallès barato como a Barcelona cara, así que la recta se
// queda plana. La página lo avisa sola cuando R² < 0,25.
{
  const p = poi("roche-sant-cugat");
  const t = ols(data.municipis.filter(m => m.compra_eur_m2 != null)
    .map(m => [haversine(p.lat, p.lon, m.lat, m.lon), m.compra_eur_m2]));
  console.log(`  ${p.nom.padEnd(34)} pendiente ${t.b.toFixed(1)} €/m² por km · R²=${t.r2.toFixed(2)}`);
  check(t.r2 < 0.25, `    sin gradiente de precio por distancia (R²=${t.r2.toFixed(2)}), la página lo avisa`);
}

console.log("\n── tendencia precio vs transporte público ──────");
for (const id of ["roche-sant-cugat", "pl-catalunya"]) {
  const p = poi(id);
  const pts = data.municipis
    .filter(m => m.compra_eur_m2 != null && m.transit?.[id]?.min != null)
    .map(m => [m.transit[id].min, m.compra_eur_m2]);
  if (pts.length < 20) { console.log(`  ${p.nom.padEnd(34)} solo ${pts.length} rutas, aún encaminando`); continue; }
  const t = ols(pts);
  console.log(`  ${p.nom.padEnd(34)} pendiente ${t.b.toFixed(1)} €/m² por min · R²=${t.r2.toFixed(2)} · n=${pts.length}`);
  check(t.b < 0, `    el precio baja cuanto peor comunicado está con ${p.nom}`);
}

console.log("\n── tiempos en coche ────────────────────────────");
const conTemps = data.municipis.filter(m => m.temps);
check(conTemps.length === data.municipis.length, `los ${conTemps.length} municipios tienen matriz de tiempos`);
const todos = conTemps.flatMap(m => data.pois.map(p => m.temps[p.id]?.min)).filter(v => v != null);
check(todos.every(v => v > 0 && v < 120), `todos los tiempos entre 0 y 120 min (max ${Math.max(...todos)})`);

console.log("\n── ejes y ticks ────────────────────────────────");
check(niceTicks(0, 30, 6).length >= 4, "el eje de distancia produce ticks");
check(niceTicks(1500, 5400, 5).every(t => Number.isFinite(t)), "el eje de precio produce ticks finitos");

console.log(`\n${fallos === 0 ? "✓ TODO CORRECTO" : `✗ ${fallos} COMPROBACIONES FALLIDAS`}`);
process.exit(fallos ? 1 : 0);
