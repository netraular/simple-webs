/**
 * Espacios deportivos por zona → data-src/esport.json
 *
 * El «Cens d'equipaments esportius» del Consell Català de l'Esport lista cada
 * pista, sala, piscina y campo de Cataluña con sus coordenadas. Es una de las
 * poquísimas fuentes que **llega a las 164 zonas**: por código INE en los 91
 * municipios y por punto dentro del polígono en los barrios de Barcelona.
 *
 * Idescat publica lo mismo resumido (EMEX `f300`), pero **solo por municipio**.
 * Se usa la fuente original en vez del resumen porque cubre 163 zonas en vez de
 * 91 — y el resumen sirve entonces para otra cosa: **validar el recuento**. El
 * script se planta si su número para Barcelona se separa más de un 2 % del que
 * publica Idescat, que es como se sabe que el filtro de clasificaciones sigue
 * siendo el bueno.
 *
 * **Qué se cuenta.** Espacios deportivos, no instalaciones: un polideportivo con
 * tres pistas son tres. Se descartan las clasificaciones que son *complementos*
 * y no sitios donde se hace deporte —vestuarios, almacenes, servicios, gradas,
 * comercio, portería—, que es exactamente el corte con el que el recuento cuadra
 * con Idescat. Ninguna de ellas tiene superficie declarada, lo que confirma que
 * el censo las trata igual.
 *
 * **Por qué un recuento y no metros cuadrados.** El censo trae `superf_cie` y
 * sería más informativo en principio, pero 16,3 de los 34 millones de m² de
 * Cataluña son **campos de golf** y 9,6 más son espacios naturales: un municipio
 * con un golf saldría disparado y el indicador diría «aquí se puede hacer
 * deporte» cuando dice «aquí hay un club de golf». Contando espacios, el golf
 * cuenta uno.
 *
 * **Cautela, la misma que en los centros educativos:** la tasa por mil
 * habitantes es ruido en los municipios pequeños. Se publica porque el dato es
 * cierto, y la página avisa.
 *
 *     node build_esport.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { get as httpsGet } from "node:https";

const SOCRATA = "https://analisi.transparenciacatalunya.cat/resource/edxn-ww2s.json";
// El código de Idescat lleva el dígito de control: 08019 → 080193.
const EMEX = "https://api.idescat.cat/emex/v1/dades.json?i=f300&id=080193";
const PROVINCIA = "08";
const BCN_INE = "08019";

/** Clasificaciones que no son un sitio donde se hace deporte, sino su
    acompañamiento. Ninguna declara superficie en el censo, y quitarlas es lo que
    hace que el recuento cuadre con el de Idescat. */
const COMPLEMENTS = new Set(["VES", "MAG", "SER", "GRA", "COM", "POR"]);

/** Cuánto se le tolera al recuento de Barcelona frente a Idescat antes de parar. */
const TOL_IDESCAT = 0.02;

const aqui = (n) => new URL(`./${n}`, import.meta.url);
const llegeix = (n) => JSON.parse(readFileSync(aqui(n), "utf8"));

const municipis = llegeix("municipis.json");
const geoBarris = llegeix("bcn-barris.geojson");

/* --- punto en polígono ----------------------------------------------------
   El mismo ray casting que build_centres.mjs: anillo exterior, huecos fuera.
   Son 7.700 puntos × 73 polígonos simples; no hace falta índice espacial. */
function dinsAnell(lon, lat, anell) {
  let dins = false;
  for (let i = 0, j = anell.length - 1; i < anell.length; j = i++) {
    const [x1, y1] = anell[j], [x2, y2] = anell[i];
    if ((y2 > lat) !== (y1 > lat)) {
      const tall = x2 + (lat - y2) * (x1 - x2) / (y1 - y2);
      if (lon < tall) dins = !dins;
    }
  }
  return dins;
}
function dinsGeometria(lon, lat, geom) {
  const pols = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
  for (const pol of pols) {
    if (!pol.length || !dinsAnell(lon, lat, pol[0])) continue;
    if (pol.slice(1).some(forat => dinsAnell(lon, lat, forat))) continue;
    return true;
  }
  return false;
}
function barriDe(lon, lat) {
  for (const f of geoBarris.features) {
    if (dinsGeometria(lon, lat, f.geometry)) return f.properties.codi_barri;
  }
  return null;
}

/* --- descarga -------------------------------------------------------------- */
async function jsonDe(url) {
  const r = await fetch(url, { headers: { "User-Agent": "simple-webs/1.0 (+https://webs.raular.com)" } });
  if (!r.ok) throw new Error(`${r.status} · ${url}`);
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("json")) throw new Error(`han devuelto ${ct} en vez de JSON · ${url}`);
  return r.json();
}

/** Lo mismo pero con el módulo `https` de toda la vida, para `api.idescat.cat`.
    Ese host **cuelga el `fetch` de Node** —«Connect Timeout» a los 10 s, cada
    vez— mientras que `node:https` y curl entran sin problema. Es el reverso del
    caso ya documentado del portal de Barcelona, que mata el TLS de Node entero.
    Comprobado el 2026-09-28. */
function jsonPerHttps(url) {
  return new Promise((resolve, reject) => {
    const req = httpsGet(url, { headers: { "User-Agent": "simple-webs/1.0" }, timeout: 30000 }, (r) => {
      let cos = "";
      r.on("data", (c) => cos += c);
      r.on("end", () => {
        try { resolve(JSON.parse(cos)); } catch { reject(new Error("respuesta no JSON")); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(new Error("timeout")); });
  });
}

const camps = "ine,latitud,longitud,classificaci";
const on = encodeURIComponent(`starts_with(ine,'${PROVINCIA}')`);
const url = `${SOCRATA}?$select=${camps}&$where=${on}&$limit=50000`;
console.error("→ Cens d'equipaments esportius (CEEC, Socrata edxn-ww2s)");
const espais = await jsonDe(url);
console.error(`  ${espais.length} espacios en la provincia ${PROVINCIA}`);
if (espais.length < 5000) throw new Error("demasiados pocos espacios: el censo viene truncado");

/* --- reparto --------------------------------------------------------------- */
const perMuni = new Map();
const perBarri = new Map();
let bcnTotal = 0, bcnSenseCoord = 0, bcnForaPoligon = 0, complements = 0;

for (const e of espais) {
  if (COMPLEMENTS.has(e.classificaci)) { complements++; continue; }
  // El censo trae el INE con dígito de control: 080193 → 08019.
  const ine = String(e.ine || "").padStart(6, "0").slice(0, 5);
  if (!ine.startsWith(PROVINCIA)) continue;
  perMuni.set(ine, (perMuni.get(ine) || 0) + 1);

  if (ine !== BCN_INE) continue;
  bcnTotal++;
  const lon = parseFloat(e.longitud), lat = parseFloat(e.latitud);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) { bcnSenseCoord++; continue; }
  const cb = barriDe(lon, lat);
  if (!cb) { bcnForaPoligon++; continue; }
  perBarri.set(cb, (perBarri.get(cb) || 0) + 1);
}

console.error(`  ${complements} complementos descartados (${[...COMPLEMENTS].join(", ")})`);
console.error(`  Barcelona: ${bcnTotal} espacios · ${bcnSenseCoord} sin coordenadas`
            + ` · ${bcnForaPoligon} fuera de todo polígono`
            + ` · ${perBarri.size} de 73 barrios con alguno`);

/* --- el control contra Idescat ---------------------------------------------
   Si el filtro de clasificaciones dejara de ser el bueno —porque el censo
   cambie de códigos, o porque a alguien le parezca que las gradas cuentan— el
   recuento se movería en silencio. Esto lo pilla. */
let idescat = null;
try {
  const e = await jsonPerHttps(EMEX);
  // EMEX contesta HTTP 200 con un `error` dentro cuando se atraganta: hay que
  // mirar el cuerpo, no el código.
  if (e?.emex?.error) throw new Error(`EMEX error ${e.emex.error}`);
  // `i` es un objeto si se pide un indicador y un array si se piden varios.
  // `v` son tres cifras separadas por comas: municipio, comarca, Cataluña.
  const i = e?.fitxes?.indicadors?.i;
  const v = (Array.isArray(i) ? i[0] : i)?.v;
  idescat = v ? parseInt(String(v).split(",")[0], 10) : null;
  if (!idescat) throw new Error("no encuentro el valor de f300 en la respuesta");
} catch (err) {
  console.error(`  ⚠ no he podido leer Idescat f300 (${err.message}): sin control`);
}
if (idescat) {
  const desviacio = Math.abs(bcnTotal - idescat) / idescat;
  console.error(`  control Idescat f300: ${idescat} · aquí ${bcnTotal}`
              + ` · ${(desviacio * 100).toFixed(2)} % de diferencia`);
  if (desviacio > TOL_IDESCAT) {
    throw new Error(`el recuento de Barcelona (${bcnTotal}) se separa un `
      + `${(desviacio * 100).toFixed(1)} % del de Idescat (${idescat}): el filtro de `
      + `clasificaciones ha dejado de ser el bueno, míralo antes de publicar nada`);
  }
}

/* --- tasas ----------------------------------------------------------------- */
const pobMuni = new Map(municipis.map(m => [m.codi_ine, m.poblacio]));
const pobBarri = new Map(
  llegeix("bcn-barris-poblacio.json").map(b => [String(b.codi_barri).padStart(2, "0"), b.poblacio]));

function fitxa(n, poblacio) {
  const out = { espais_esportius: n };
  if (poblacio) out.esport_1000 = +(n / poblacio * 1000).toFixed(2);
  return out;
}

const outMuni = {};
for (const m of municipis) {
  // Sin espacios es un cero de verdad: el censo cubre toda Cataluña y un
  // municipio de 400 vecinos puede no tener ni una pista.
  outMuni[m.codi_ine] = fitxa(perMuni.get(m.codi_ine) || 0, pobMuni.get(m.codi_ine));
}
const outBarris = {};
for (const f of geoBarris.features) {
  const cb = f.properties.codi_barri;
  outBarris[cb] = fitxa(perBarri.get(cb) || 0, pobBarri.get(cb));
}

const dades = {
  generat: new Date().toISOString().slice(0, 10),
  font: "Consell Català de l'Esport · Cens d'equipaments esportius (Socrata edxn-ww2s)",
  url,
  control_idescat: idescat ? { f300_barcelona: idescat, aqui: bcnTotal } : null,
  complements_exclosos: [...COMPLEMENTS],
  nota: "Espacios deportivos, no instalaciones: un polideportivo con tres pistas "
      + "son tres. Se descartan vestuarios, almacenes, servicios, gradas, comercio "
      + "y portería, que acompañan al deporte pero no son donde se hace; con ese "
      + "corte el recuento cuadra con el que publica Idescat (EMEX f300). Es un "
      + "recuento y no metros cuadrados a propósito: la mitad de los m² de Cataluña "
      + "son campos de golf y espacios naturales, y por superficie un municipio con "
      + "un golf saldría disparado. Los de Barcelona se asignan a barrio por sus "
      + "coordenadas dentro del polígono: es geometría, no una estimación. La tasa "
      + "por mil habitantes es ruido en los municipios pequeños.",
  cobertura: {
    municipis: Object.values(outMuni).filter(v => v.espais_esportius > 0).length,
    municipis_total: municipis.length,
    barris: Object.values(outBarris).filter(v => v.espais_esportius > 0).length,
    barris_total: geoBarris.features.length,
  },
  municipis: outMuni,
  barris: outBarris,
};

writeFileSync(aqui("esport.json"), JSON.stringify(dades, null, 1) + "\n");
console.error(`✓ esport.json · ${dades.cobertura.municipis}/${dades.cobertura.municipis_total} municipios`
            + ` · ${dades.cobertura.barris}/${dades.cobertura.barris_total} barrios`);
for (const [nom, ine] of [["Barcelona", "08019"], ["Terrassa", "08279"], ["Sant Cugat del Vallès", "08205"]]) {
  const v = outMuni[ine];
  console.error(`  ${nom.padEnd(22)} ${v.espais_esportius} espacios · ${v.esport_1000}/1.000 hab.`);
}
