/**
 * Prueba de contrato entre la página y sus dos juegos de datos.
 *
 * No abre un navegador: extrae del HTML las funciones que no tocan el DOM
 * (métricas, proyección, troceado de anillos, regresión) y las ejecuta contra
 * pisos-bcn.json y bcn-barris.json, en todas las combinaciones de métrica,
 * punto de referencia y modo de eje. Lo que se busca es que ninguna combinación
 * reviente ni produzca NaN, y que los dos ficheros cumplan la misma forma.
 */
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../pages/pisos-vs-distancia.html", import.meta.url), "utf8");
const js = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
function between(a, b) {
  const i = js.indexOf(a);
  const j = js.indexOf(b, i + a.length);
  if (i < 0 || j < 0) throw new Error(`no encuentro el bloque ${a} … ${b}`);
  return js.slice(i, j);
}

const puro = between("const R_EARTH", "/* ======")
           + between("const MORTGAGE", "/* ===========================================================================\n   3. ESTADO")
           + between("function eachRing", "/* ======");

const { METRICS, haversine, ols, eachRing } = new Function(`
  const getComputedStyle = () => ({ getPropertyValue: () => "#000" });
  const document = { documentElement: {} };
  ${puro}
  return { METRICS, haversine, ols, eachRing };
`)();

const load = (f) => JSON.parse(readFileSync(new URL("../pages/data/" + f, import.meta.url), "utf8"));

const VISTAS = [
  { id: "municipis", data: "pisos-bcn.json", geo: "municipis-geo.json", n: 92 },
  { id: "barris",    data: "bcn-barris.json", geo: "bcn-barris-geo.json", n: 73 },
];

const CLAUS = ["ine", "nom", "comarca", "lat", "lon", "dist_bcn_km", "poblacio",
               "compra_eur_m2", "compra_eur_total", "lloguer_eur_mes", "temps"];

let fallos = 0;
const check = (ok, msg) => { console.log((ok ? "  ✓ " : "  ✗ ") + msg); if (!ok) fallos++; };

for (const V of VISTAS) {
  console.log(`\n══ vista «${V.id}» ═══════════════════════════════`);
  const D = load(V.data);
  const G = load(V.geo);

  // --- forma del fichero ---
  check(D.municipis.length === V.n, `${D.municipis.length} unidades (esperadas ${V.n})`);
  check(Array.isArray(D.pois) && D.pois.length > 0, `${D.pois?.length} puntos de referencia`);
  check(!!D.meta?.radi_km && !!D.meta?.periodes && Array.isArray(D.meta?.fonts),
        "meta completo (radi_km, periodes, fonts)");
  const faltaClau = CLAUS.filter(k => !(k in D.municipis[0]));
  check(faltaClau.length === 0, `todas las claves del contrato${faltaClau.length ? ": faltan " + faltaClau : ""}`);

  // --- cada unidad tiene contorno, y al revés ---
  const enGeo = new Set(G.features.map(f => f.properties.codi_ine));
  const sinGeo = D.municipis.filter(m => !enGeo.has(m.ine));
  check(sinGeo.length === 0, `todas las unidades tienen contorno${sinGeo.length ? ": " + sinGeo.map(m => m.nom).join(", ") : ""}`);
  check(enGeo.size === D.municipis.length, `${enGeo.size} contornos para ${D.municipis.length} unidades, sin sobrantes`);

  // --- coordenadas dentro de Catalunya, no UTM sin reproyectar ---
  let fuera = 0, ptos = 0;
  for (const f of G.features) eachRing(f.geometry, (ring) => {
    for (const [lon, lat] of ring) { ptos++; if (lon < 0.5 || lon > 3.5 || lat < 40 || lat > 43) fuera++; }
  });
  check(fuera === 0, `${ptos.toLocaleString("es-ES")} vértices, todos en coordenadas geográficas plausibles`);

  // --- centroides dentro de su propio contorno (detecta cruces mal hechos) ---
  const dentro = D.municipis.filter(m => {
    const f = G.features.find(x => x.properties.codi_ine === m.ine);
    let ok = false;
    eachRing(f.geometry, (ring) => {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j];
        if ((yi > m.lat) !== (yj > m.lat) && m.lon < ((xj - xi) * (m.lat - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) ok = true;
    });
    return ok;
  }).length;
  // En la vista municipal el punto es el cap de municipi, que siempre cae dentro;
  // en barrios es el centroide de área, que en un barrio cóncavo puede salirse.
  check(dentro / D.municipis.length > 0.9,
        `${dentro} de ${D.municipis.length} puntos caen dentro de su propio contorno`);

  // --- todas las combinaciones de métrica × punto × eje ---
  const disponibles = METRICS.filter(M => M.needs.every(f => D.municipis.some(m => m[f] != null)));
  console.log(`  métricas disponibles: ${disponibles.map(M => M.short).join(", ")}`);
  let combos = 0, malos = 0;
  for (const M of disponibles) {
    for (const S of [{ m2: 40 }, { m2: 80 }, { m2: 200 }]) {
      for (const poi of D.pois) {
        for (const modo of ["dist", "temps"]) {
          combos++;
          const pts = [];
          for (const m of D.municipis) {
            const v = M.get(m, S);
            if (v != null && !Number.isFinite(v)) { malos++; continue; }
            const x = modo === "dist"
              ? haversine(poi.lat, poi.lon, m.lat, m.lon)
              : m.temps?.[poi.id]?.min;
            if (v != null && x != null) pts.push([x, v]);
          }
          const t = ols(pts);
          if (t && (!Number.isFinite(t.a) || !Number.isFinite(t.b) || !Number.isFinite(t.r2))) malos++;
          // El formateador no debe reventar con el mínimo, la mediana y el máximo.
          const vs = pts.map(p => p[1]);
          if (vs.length) { M.fmt(Math.min(...vs)); M.fmt(Math.max(...vs)); }
        }
      }
    }
  }
  check(malos === 0, `${combos} combinaciones de métrica × tamaño × punto × eje, ${malos} con valores no finitos`);

  // --- la matriz de tiempos cubre todos los puntos ---
  const huecos = D.municipis.filter(m => D.pois.some(p => m.temps?.[p.id]?.min == null)).length;
  check(huecos === 0, `matriz de tiempos completa para los ${D.pois.length} puntos`);
}

console.log(`\n${fallos === 0 ? "✓ TODO CORRECTO" : `✗ ${fallos} COMPROBACIONES FALLIDAS`}`);
process.exit(fallos ? 1 : 0);
