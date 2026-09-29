/**
 * Servicios de barrio del entorno de Barcelona, desde OpenStreetMap vía
 * Overpass: tiendas de alimentación, farmacias, centros de salud, escuelas y
 * paradas de autobús.
 *
 * Guarda los puntos crudos con sus coordenadas; el reparto a las 164 zonas se
 * hace después, por point-in-polygon contra `municipis.geojson` y
 * `bcn-barris.geojson` (ver `build-transport.mjs`). Mismo criterio que con las
 * estaciones: asignar al núcleo más cercano se equivoca en la costa y en el
 * Vallès, donde los pueblos están a dos kilómetros unos de otros.
 *
 * **Por qué OpenStreetMap y no un registro oficial.** Para esto no hay
 * registro oficial que valga a la vez para los 91 municipios y los 73 barrios:
 * el censo comercial solo existe dentro de Barcelona, y el de centros
 * sanitarios de CatSalut tiene el defecto que ya hizo descartarlo una vez —su
 * cero significa «no registrado», no «no hay»—. OSM tiene el defecto contrario
 * y más llevadero: no se inventa nada, solo puede faltarle. Aquí eso se mide
 * en vez de suponerse, con tres cosas:
 *
 *   1. las **distancias** se calculan contra todos los puntos del rectángulo,
 *      así que un municipio al que no le hayan mapeado nada dentro sigue
 *      teniendo un número honesto —el del pueblo de al lado—;
 *   2. las **densidades** no se publican por debajo de 2.000 habitantes,
 *      donde un punto arriba o abajo cambia la cifra de sitio;
 *   3. las escuelas se **contrastan con el directorio oficial** del Departament
 *      d'Educació, que ya está en `centres.json`. Si OSM se queda muy corto
 *      ahí, es que está incompleto en general y `build-transport.mjs` se planta.
 *
 * Salida: serveis.json → { generat, bbox, font, punts: [{ lat, lon, t }] }
 * donde `t` es comerc | farmacia | salut | escola | bus.
 *
 *     node fetch-serveis.mjs [--fresh]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const BBOX = [41.05, 1.60, 41.85, 2.70];          // el mismo que las estaciones
const CAU = new URL("./_work/overpass-serveis.json", import.meta.url);

/* Qué se considera cada cosa. Están escritas como una tabla y no repartidas
   por el código porque son la decisión editorial de este fichero: cambiarla es
   cambiar qué mide el indicador, y tiene que verse de un vistazo. */
const QL = `
[out:json][timeout:300];
(
  nwr["shop"~"^(supermarket|convenience|greengrocer|butcher|bakery)$"](${BBOX});
  nwr["amenity"="pharmacy"](${BBOX});
  nwr["amenity"~"^(clinic|doctors|hospital)$"](${BBOX});
  nwr["healthcare"~"^(centre|doctor)$"](${BBOX});
  nwr["amenity"~"^(school|kindergarten)$"](${BBOX});
  node["highway"="bus_stop"](${BBOX});
);
out center;`;

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

/** Clasifica un elemento. El orden importa: un hospital con farmacia dentro es
    un hospital, y una escuela infantil dentro de un colegio no es una tienda.
    Lo primero que case, manda. */
function tipus(t) {
  if (t.highway === "bus_stop") return "bus";
  if (/^(clinic|doctors|hospital)$/.test(t.amenity || "")) return "salut";
  if (/^(centre|doctor)$/.test(t.healthcare || "")) return "salut";
  if (t.amenity === "pharmacy") return "farmacia";
  if (/^(school|kindergarten)$/.test(t.amenity || "")) return "escola";
  if (/^(supermarket|convenience|greengrocer|butcher|bakery)$/.test(t.shop || "")) return "comerc";
  return null;
}

/* Lo que está cerrado o no ha abierto no cuenta: un supermercado en obras no
   te da de comer, y OSM etiqueta unos cuantos así. */
const MORT = (t) =>
  t.disused === "yes" || t.abandoned || t["disused:shop"] || t["disused:amenity"]
  || t.construction || t.proposed || t.was || t.demolished;

async function baixa() {
  for (const ep of ENDPOINTS) {
    for (let intent = 1; intent <= 3; intent++) {
      try {
        console.error(`→ ${ep} (intento ${intent})`);
        const res = await fetch(`${ep}?data=${encodeURIComponent(QL)}`, {
          headers: { "User-Agent": "simple-webs/donde-vivir (github.com/netraular/simple-webs)" },
        });
        // Overpass contesta 429 cuando hay cola y 504 cuando la consulta tarda
        // más que su propio tope. Las dos se arreglan esperando.
        if (res.status === 429 || res.status === 504) {
          console.error("  ocupado, espero 25 s");
          await new Promise(r => setTimeout(r, 25000));
          continue;
        }
        if (!res.ok) { console.error(`  ${res.status}, siguiente endpoint`); break; }
        return await res.json();
      } catch (e) { console.error(`  ${e.message}`); }
    }
  }
  throw new Error("ningún endpoint de Overpass respondió");
}

const fresh = process.argv.includes("--fresh");
let json;
if (existsSync(CAU) && !fresh) {
  console.error("· usando la descarga cacheada (--fresh para repetirla)");
  json = JSON.parse(readFileSync(CAU, "utf8"));
} else {
  json = await baixa();
  mkdirSync(new URL("./_work/", import.meta.url), { recursive: true });
  writeFileSync(CAU, JSON.stringify(json));
}

const punts = [];
const compte = {};
let sensePunt = 0, morts = 0;
for (const el of json.elements || []) {
  const t = el.tags || {};
  if (MORT(t)) { morts++; continue; }
  const cat = tipus(t);
  if (!cat) continue;
  // Los ways y las relations vienen con `center` porque la consulta pide
  // `out center`: un colegio es un recinto, no un punto, y su centroide es lo
  // más cerca que se puede estar de «dónde está» sin complicarlo.
  const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) { sensePunt++; continue; }
  punts.push({ lat: +lat.toFixed(5), lon: +lon.toFixed(5), t: cat });
  compte[cat] = (compte[cat] || 0) + 1;
}

const MINIMS = { comerc: 3000, farmacia: 1200, salut: 400, escola: 900, bus: 6000 };
for (const [cat, min] of Object.entries(MINIMS)) {
  const n = compte[cat] || 0;
  if (n < min) {
    throw new Error(`solo ${n} de tipo «${cat}» (esperaba ${min}+): la consulta ha vuelto `
      + `recortada o han cambiado las etiquetas. No se publica un recuento a medias.`);
  }
}

writeFileSync(new URL("./serveis.json", import.meta.url), JSON.stringify({
  generat: new Date().toISOString().slice(0, 10),
  bbox: BBOX,
  font: "© colaboradores de OpenStreetMap, ODbL · vía Overpass",
  nota: "Puntos crudos. El reparto a las 164 zonas y las densidades y distancias "
      + "se calculan en build-transport.mjs.",
  compte,
  punts,
}));

console.error(`✓ serveis.json · ${punts.length} puntos`, compte);
if (morts) console.error(`  ${morts} descartados por estar cerrados, en obras o en desuso`);
if (sensePunt) console.error(`  ${sensePunt} sin coordenada ni centroide`);
