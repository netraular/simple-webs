/**
 * Estaciones de tren, metro y FGC del entorno de Barcelona, desde OpenStreetMap
 * vía Overpass. Guarda los nodos crudos con sus coordenadas; la asignación a
 * municipio se hace después, por point-in-polygon contra municipis.geojson
 * (ver build-data.mjs), que es más fiable que asignar al núcleo más cercano.
 *
 * **Necesita `linies.json`**, así que va después de `fetch-linies.mjs`. La razón
 * está abajo, en la clasificación.
 *
 * Salida: estacions.json → [{ nom, lat, lon, tipus, xarxa }]
 */
import { readFileSync, writeFileSync } from "node:fs";

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

/* --------------------------------------------------------------------------
   Clasificación
   --------------------------------------------------------------------------

   Las etiquetas del nodo bastan para el metro y para lo que lleva operador
   escrito, pero **no para el resto**, y ahí estaba el fallo que esto arregla.
   La versión anterior acababa en un comodín —«si es una estación y no la
   reconozco, red "Tren"»— que se tragaba 17 estaciones y dejaba a seis zonas
   etiquetadas con el nombre de una red que no existe: ni el plano, ni el
   billete, ni nadie llama «Tren» a nada. Y no eran casos raros: la línea
   Llobregat-Anoia de FGC entera (Abrera, Olesa, el Palau, Colònia Güell,
   Martorell-Vila, la Beguda, Piera, la Pobla de Claramunt) va sin `operator`
   en OSM, así que caía toda ahí.

   El arreglo no es una regex más larga sino mirar dónde ya está la respuesta:
   `linies.json` lleva las 360 paradas ferroviarias con su red **ya
   clasificada por línea**, que es donde el dato es fiable —una relación de
   OSM sí trae operador— en vez de nodo a nodo. Se casa por cercanía; 13 de
   las 17 caen a menos de 80 m de su parada.

   Lo que queda sin resolver se trata así:

     · `operator=Adif` o `train=yes` → **Rodalies**. Es el caso de Aguilar de
       Segarra, en la R12 a Lleida: una estación de verdad, a 6 km de la
       siguiente, que simplemente no está en ninguna línea dibujada.
     · Los funiculares de Montserrat y Sant Joan → **fuera**, por el mismo
       criterio que ya deja fuera el del Tibidabo en fetch-linies.mjs: suben a
       una montaña, no son transporte de cercanías, y contarlos como «estación»
       de Monistrol diría algo falso de vivir allí.
     · Cualquier otra cosa → fuera, y se imprime la lista. Si algún día
       aparecen muchas, se ve. */

const TOL_M = 250;               // una estación y su parada no se alejan más
const R_TERRA = 6371;
const rad = (d) => d * Math.PI / 180;
const distKm = (a, b) => Math.hypot(
  (rad(b.lon) - rad(a.lon)) * Math.cos(rad((a.lat + b.lat) / 2)),
  rad(b.lat) - rad(a.lat)) * R_TERRA;

let parades = [];
try {
  const L = JSON.parse(readFileSync(new URL("./linies.json", import.meta.url), "utf8"));
  parades = (L.parades || []).filter(p => p.xarxes?.some(x => x !== "Bus" && x !== "Tram"));
} catch {
  throw new Error("falta linies.json — lanza antes fetch-linies.mjs");
}
if (parades.length < 200) throw new Error(`linies.json solo trae ${parades.length} paradas ferroviarias`);

/** La red de la parada más cercana, si está lo bastante cerca. */
function perProximitat(el) {
  let millor = null;
  for (const p of parades) {
    const d = distKm(el, p);
    if (!millor || d < millor.d) millor = { d, p };
  }
  if (!millor || millor.d * 1000 > TOL_M) return null;
  // Una parada puede servir a dos redes (Sants es Rodalies y Metro); se queda
  // con la primera, que es el orden en que las escribió fetch-linies.mjs.
  return millor.p.xarxes.find(x => x !== "Bus" && x !== "Tram") || null;
}

function xarxa(t, el) {
  const blob = [t.network, t.operator, t["network:wikidata"], t.name].filter(Boolean).join(" ").toLowerCase();
  if (t.station === "subway" || /metro de barcelona|tmb/.test(blob)) return "Metro";
  if (/fgc|ferrocarrils de la generalitat/.test(blob)) return "FGC";
  if (/rodalies|renfe|cercan/.test(blob)) return "Rodalies";

  const prop = perProximitat(el);
  if (prop) return prop;

  if (t.station === "funicular") return null;          // montaña, no cercanías
  if (/adif/.test(blob) || t.train === "yes") return "Rodalies";
  return null;
}

const out = [];
const fora = [];
for (const el of json.elements) {
  const t = el.tags || {};
  if (t.disused === "yes" || t["railway:preserved"] === "yes" || t.abandoned) continue;
  const x = xarxa(t, el);
  if (!x) { if (t.name) fora.push(`${t.name} (${t.station || t.railway})`); continue; }
  out.push({ nom: t.name || "(sense nom)", lat: el.lat, lon: el.lon, tipus: t.station || t.railway, xarxa: x });
}

writeFileSync(new URL("./estacions.json", import.meta.url), JSON.stringify(out, null, 0));
const byNet = out.reduce((a, s) => (a[s.xarxa] = (a[s.xarxa] || 0) + 1, a), {});
console.error(`✓ estacions.json · ${out.length} estaciones`, byNet);
if (fora.length) console.error(`  fuera (${fora.length}): ${fora.join(" · ")}`);
