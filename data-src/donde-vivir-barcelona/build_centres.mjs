/**
 * Centros educativos por zona → data-src/donde-vivir-barcelona/centres.json
 *
 * El «Directori de centres docents» del Departament d'Educació lista todos los
 * centros de Cataluña con su código de municipio INE y sus coordenadas. De ahí
 * salen dos cosas que la página no tenía:
 *
 *   · **Centros por cada 1.000 habitantes.** Cuántas escuelas, institutos y
 *     guarderías hay realmente donde vivirías.
 *   · **Qué proporción son públicos**, que es la pregunta siguiente y la que
 *     decide si «hay centros» significa algo para ti.
 *
 * Es de los pocos indicadores que **baja al barrio sin inventar nada**: los
 * centros de Barcelona traen coordenadas, así que se asignan por punto dentro
 * del polígono del barrio. Eso es geometría, no una estimación.
 *
 * Dos cautelas escritas en el propio fichero:
 *
 *   · La tasa por mil habitantes es **ruido en los municipios pequeños**: con
 *     dos centros y 900 vecinos sale un número altísimo que no dice nada. Se
 *     publica igual, porque el dato es cierto, pero la página avisa.
 *   · El porcentaje de públicos **solo se publica con 5 centros o más**. Con
 *     tres, los únicos valores posibles son 0, 33, 67 y 100: un porcentaje que
 *     solo puede dar cuatro respuestas no es un porcentaje.
 *
 * «Privat» aquí incluye el concertado: el directorio no distingue el concierto
 * (va en otro conjunto, `8spq-9nx7`), así que no se afirma que lo haga.
 *
 *     node build_centres.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const SOCRATA = "https://analisi.transparenciacatalunya.cat/resource/kvmv-ahh4.json";
const PROVINCIA = "08";
const MIN_PER_PCT = 5;        // por debajo, el % de públicos no se publica

const aqui = (n) => new URL(`./${n}`, import.meta.url);
const llegeix = (n) => JSON.parse(readFileSync(aqui(n), "utf8"));

const municipis = llegeix("municipis.json");
const BCN_INE = "08019";
const geoBarris = llegeix("bcn-barris.geojson");

/* --- punto en polígono ----------------------------------------------------
   Ray casting sobre el anillo exterior, descartando los huecos. Los barrios de
   Barcelona son polígonos simples y pequeños: no hace falta ningún índice
   espacial para 943 puntos × 73 polígonos. */
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
async function soqlJSON(params) {
  const url = `${SOCRATA}?${params}`;
  const r = await fetch(url, { headers: { "User-Agent": "simple-webs/1.0 (+https://webs.raular.com)" } });
  if (!r.ok) throw new Error(`Socrata ${r.status} · ${url}`);
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("json")) throw new Error(`Socrata ha devuelto ${ct} en vez de JSON`);
  return r.json();
}

/** El curso más reciente que publique el directorio. Cambia cada septiembre y
    escribirlo a mano lo dejaría desfasado sin avisar. */
async function darrerCurs() {
  const files = await soqlJSON(
    "$select=curs&$group=curs&$order=curs%20DESC&$limit=1");
  if (!files.length) throw new Error("el directorio no devuelve ningún curso");
  return files[0].curs;
}

const curs = await darrerCurs();
console.error(`→ Directori de centres docents · curso ${curs}`);

const on = encodeURIComponent(
  `curs='${curs}' AND starts_with(codi_municipi,'${PROVINCIA}')`);
const centres = await soqlJSON(`$where=${on}&$limit=20000`);
console.error(`  ${centres.length} centros en la provincia ${PROVINCIA}`);

/* --- reparto --------------------------------------------------------------- */
const compta = () => ({ total: 0, publics: 0 });
const perMuni = new Map();
const perBarri = new Map();
let bcnTotal = 0, bcnSenseCoord = 0, bcnForaPoligon = 0;

for (const c of centres) {
  const ine = String(c.codi_municipi || "").padStart(5, "0");
  if (!ine.startsWith(PROVINCIA)) continue;
  const public_ = c.nom_naturalesa === "Públic";

  if (!perMuni.has(ine)) perMuni.set(ine, compta());
  const m = perMuni.get(ine);
  m.total++; if (public_) m.publics++;

  if (ine !== BCN_INE) continue;
  bcnTotal++;
  const lon = parseFloat(c.coordenades_geo_x), lat = parseFloat(c.coordenades_geo_y);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) { bcnSenseCoord++; continue; }
  const cb = barriDe(lon, lat);
  if (!cb) { bcnForaPoligon++; continue; }
  if (!perBarri.has(cb)) perBarri.set(cb, compta());
  const b = perBarri.get(cb);
  b.total++; if (public_) b.publics++;
}

console.error(`  Barcelona: ${bcnTotal} centros · ${bcnSenseCoord} sin coordenadas`
            + ` · ${bcnForaPoligon} fuera de todo polígono`
            + ` · ${perBarri.size} de 73 barrios con alguno`);

/* --- tasas ----------------------------------------------------------------- */
const pobMuni = new Map(municipis.map(m => [m.codi_ine, m.poblacio]));
const pobBarri = new Map(
  llegeix("bcn-barris-poblacio.json").map(b => [String(b.codi_barri).padStart(2, "0"), b.poblacio]));

function fitxa(n, poblacio) {
  const out = { centres_educatius: n.total };
  if (poblacio) out.centres_educatius_1000 = +(n.total / poblacio * 1000).toFixed(2);
  // Con menos de cinco centros el porcentaje solo puede tomar un puñado de
  // valores y se leería como una diferencia real entre municipios. No se da.
  if (n.total >= MIN_PER_PCT) out.pct_centres_publics = Math.round(n.publics / n.total * 100);
  return out;
}

const outMuni = {};
for (const m of municipis) {
  const n = perMuni.get(m.codi_ine);
  // Sin centros es un cero de verdad, no un hueco: el directorio cubre toda
  // Cataluña y un municipio de 400 habitantes puede no tener escuela.
  outMuni[m.codi_ine] = fitxa(n || compta(), pobMuni.get(m.codi_ine));
}
const outBarris = {};
for (const f of geoBarris.features) {
  const cb = f.properties.codi_barri;
  outBarris[cb] = fitxa(perBarri.get(cb) || compta(), pobBarri.get(cb));
}

const dades = {
  generat: new Date().toISOString().slice(0, 10),
  font: "Departament d'Educació · Directori de centres docents (Socrata kvmv-ahh4)",
  url: `${SOCRATA}?$where=${on}&$limit=20000`,
  curs,
  min_centres_per_percentatge: MIN_PER_PCT,
  nota: "Todos los centros del directorio: guarderías, escuelas, institutos y centros "
      + "de adultos. «Privat» incluye el concertado — el directorio no marca el "
      + "concierto, así que no se afirma que lo haga. Los centros de Barcelona se "
      + "asignan a barrio por sus coordenadas, dentro del polígono del barrio: es "
      + "geometría, no una estimación. La tasa por mil habitantes se dispara en los "
      + "municipios pequeños, donde dos centros sobre pocos vecinos dan un número "
      + `altísimo. El porcentaje de públicos solo se publica con ${MIN_PER_PCT} `
      + "centros o más.",
  cobertura: {
    municipis: Object.values(outMuni).filter(v => v.centres_educatius > 0).length,
    municipis_total: municipis.length,
    barris: Object.values(outBarris).filter(v => v.centres_educatius > 0).length,
    barris_total: geoBarris.features.length,
  },
  municipis: outMuni,
  barris: outBarris,
};

writeFileSync(aqui("centres.json"), JSON.stringify(dades, null, 1) + "\n");
console.error(`✓ centres.json · ${dades.cobertura.municipis}/${dades.cobertura.municipis_total} municipios`
            + ` · ${dades.cobertura.barris}/${dades.cobertura.barris_total} barrios`);
for (const [nom, ine] of [["Barcelona", "08019"], ["Terrassa", "08279"], ["Sant Cugat del Vallès", "08205"]]) {
  const v = outMuni[ine];
  console.error(`  ${nom.padEnd(22)} ${v ? `${v.centres_educatius} centros · ${v.centres_educatius_1000}/1.000 hab. · ${v.pct_centres_publics ?? "—"} % públicos` : "sin dato"}`);
}
