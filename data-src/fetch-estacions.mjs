/**
 * Estaciones de tren, metro y FGC del entorno de Barcelona, desde OpenStreetMap
 * vía Overpass. Guarda los nodos crudos con sus coordenadas; la asignación a
 * municipio se hace después, por point-in-polygon contra municipis.geojson
 * (ver build-data.mjs), que es más fiable que asignar al núcleo más cercano.
 *
 * Salida: estacions.json → [{ nom, lat, lon, tipus, xarxa }]
 */
import { writeFileSync } from "node:fs";

const QL = `
[out:json][timeout:180];
(
  node["railway"="station"](41.05,1.60,41.85,2.70);
  node["railway"="halt"](41.05,1.60,41.85,2.70);
);
out body;`;

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// Overpass devuelve 406 a un POST sin User-Agent reconocible; con GET y UA
// propio va bien. Si un endpoint da 429, se prueba el siguiente tras una pausa.
let json = null;
for (const ep of ENDPOINTS) {
  for (let intent = 1; intent <= 3 && !json; intent++) {
    try {
      console.error(`→ ${ep} (intento ${intent})`);
      const res = await fetch(`${ep}?data=${encodeURIComponent(QL)}`, {
        headers: { "User-Agent": "simple-webs/pisos-vs-distancia (github.com/netraular/simple-webs)" },
      });
      if (res.status === 429 || res.status === 504) {
        console.error("  ocupado, espero 20 s");
        await new Promise(r => setTimeout(r, 20000));
        continue;
      }
      if (!res.ok) { console.error(`  ${res.status}, siguiente endpoint`); break; }
      json = await res.json();
    } catch (e) { console.error(`  ${e.message}`); }
  }
  if (json) break;
}
if (!json) throw new Error("ningún endpoint de Overpass respondió");

/** Clasifica la estación en una red legible. Devuelve null si no es de las nuestras. */
function xarxa(t) {
  const blob = [t.network, t.operator, t["network:wikidata"], t.name].filter(Boolean).join(" ").toLowerCase();
  if (t.station === "subway" || /metro de barcelona|tmb/.test(blob)) return "Metro";
  if (/fgc|ferrocarrils de la generalitat/.test(blob)) return "FGC";
  if (/rodalies|renfe|cercan/.test(blob)) return "Rodalies";
  if (t.train === "yes" || t.railway === "station") return "Tren";
  return null;
}

const out = [];
for (const el of json.elements) {
  const t = el.tags || {};
  if (t.disused === "yes" || t["railway:preserved"] === "yes" || t.abandoned) continue;
  const x = xarxa(t);
  if (!x) continue;
  out.push({ nom: t.name || "(sense nom)", lat: el.lat, lon: el.lon, tipus: t.station || t.railway, xarxa: x });
}

writeFileSync(new URL("./estacions.json", import.meta.url), JSON.stringify(out, null, 0));
const byNet = out.reduce((a, s) => (a[s.xarxa] = (a[s.xarxa] || 0) + 1, a), {});
console.error(`✓ estacions.json · ${out.length} estaciones`, byNet);
