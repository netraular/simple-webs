/**
 * Matriz de tiempos en coche: cada municipio → cada punto de referencia.
 *
 * Usa el servicio `table` del OSRM público (perfil "driving", red de
 * OpenStreetMap). Son tiempos en flujo libre: OSRM no modela tráfico, así que
 * en hora punta hacia Barcelona la cifra real es bastante peor. Eso queda
 * dicho en la página, no se maquilla aquí.
 *
 * Salida: temps.json  → { "<codi_ine>": { "<poi_id>": { min, km } } }
 */
import { writeFileSync, readFileSync } from "node:fs";

const munis = JSON.parse(readFileSync(new URL("./municipis.json", import.meta.url)));
const pois  = JSON.parse(readFileSync(new URL("./pois.json", import.meta.url)));

const coords = [
  ...munis.map(m => `${m.lon},${m.lat}`),
  ...pois.map(p => `${p.lon},${p.lat}`),
].join(";");

const sources = munis.map((_, i) => i).join(";");
const dests   = pois.map((_, i) => munis.length + i).join(";");
const url = `https://router.project-osrm.org/table/v1/driving/${coords}`
          + `?sources=${sources}&destinations=${dests}&annotations=duration,distance`;

console.error(`→ OSRM table: ${munis.length} orígenes × ${pois.length} destinos`);

const res = await fetch(url, { headers: { "User-Agent": "simple-webs/pisos-vs-distancia" } });
if (!res.ok) throw new Error(`OSRM ${res.status}: ${(await res.text()).slice(0, 200)}`);
const json = await res.json();
if (json.code !== "Ok") throw new Error(`OSRM code ${json.code}: ${json.message}`);

const out = {};
let missing = 0;
munis.forEach((m, i) => {
  const row = {};
  pois.forEach((p, j) => {
    const dur = json.durations?.[i]?.[j];
    const dis = json.distances?.[i]?.[j];
    if (dur == null || dis == null) { missing++; row[p.id] = null; return; }
    row[p.id] = { min: +(dur / 60).toFixed(1), km: +(dis / 1000).toFixed(1) };
  });
  out[m.codi_ine] = row;
});

writeFileSync(new URL("./temps.json", import.meta.url), JSON.stringify(out, null, 0));

// --- comprobación de cordura -------------------------------------------------
const show = (nom, poi) => {
  const m = munis.find(x => x.nom === nom);
  const v = out[m.codi_ine][poi];
  console.error(`  ${nom.padEnd(26)} → ${poi.padEnd(14)} ${v ? `${v.min} min / ${v.km} km` : "SIN RUTA"}`);
};
console.error(`✓ temps.json escrito · celdas sin ruta: ${missing}`);
show("Barcelona", "pl-catalunya");
show("Sant Cugat del Vallès", "pl-catalunya");
show("Terrassa", "pl-catalunya");
show("Mataró", "pl-catalunya");
show("Castelldefels", "aeroport");
show("Granollers", "sabadell");
