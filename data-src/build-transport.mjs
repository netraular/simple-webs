/**
 * Monta los datos de pages/donde-vivir-barcelona.html.
 *
 * La página tuvo dos escalas separadas —92 municipios o 73 barrios, y había que
 * elegir una antes de empezar—. Ahora es **una sola**: los 91 municipios del
 * área (Barcelona fuera) más los 73 barrios en que se desglosa la ciudad, 164
 * zonas en un único mapa. Este script hace esa fusión; no descarga nada, todo
 * sale de ficheros que ya están generados y verificados.
 *
 * Solo Barcelona va desglosada, y no es una decisión de diseño: Incasòl,
 * Idescat e INE publican compra y alquiler **por municipio**, y únicamente el
 * Ayuntamiento de Barcelona publica por barrio. Para Terrassa o Sabadell no hay
 * dato sub-municipal que cruzar.
 *
 * Entra, de este mismo directorio:
 *
 *   transit.json     el desglose tramo a tramo de los 6 destinos (MOTIS)
 *   linies.json      el trazado y las paradas de la red (Overpass)
 *   isocrones.json   la matriz de minutos zona × anclaje
 *
 * y de pages/data/: pisos-bcn.json, bcn-barris.json y las dos geometrías.
 *
 * Sale, en pages/data/:
 *
 *   zonas.json        164 zonas: atributos + los 6 destinos       ┐ carga
 *   zonas-geo.json    geometría fusionada y simplificada          ├ inicial
 *   linies.json       trazado y paradas de la red                 ┘
 *   rutas.json        el itinerario tramo a tramo   → al pinchar una zona
 *   iso-ancores.json  la rejilla de anclajes        ┐ al poner un punto propio
 *   iso-zonas.json    matriz de minutos, 1 byte     ┘ en el mapa
 *
 * El reparto en tres grupos es el que manda en el peso: lo que hace falta para
 * pintar el mapa y responder la pregunta se carga al abrir y tiene que caber en
 * el presupuesto (660 kB, lo comprueba test-transport.mjs); el itinerario
 * detallado y las isócronas solo los pide quien los usa.
 */
import { readFileSync, writeFileSync, existsSync, statSync, rmSync } from "node:fs";
import { simplificaGeometria, contaVertexs } from "./geom.mjs";

const HERE = new URL("./", import.meta.url);
const src  = (f) => new URL("./" + f, HERE);
const out  = (f) => new URL("../pages/data/" + f, HERE);
const read = (u) => JSON.parse(readFileSync(u, "utf8"));
const readOpt = (f) => existsSync(src(f)) ? read(src(f)) : null;

/** Tolerancia de simplificación de los polígonos, en metros.
    El mapa es un lienzo de ~900 px para un área de ~55 km: un píxel son ~60 m,
    así que 20 m queda por debajo de lo que se puede ver al zoom por defecto y
    en ~3 px al zoom máximo (×8). Por debajo de eso solo se paga ancho de banda
    para dibujar detalle que nadie distingue. */
const TOL_GEO_M = 20;

/** Prefijo de los IDs de barrio. Los barrios vienen numerados `01`…`73` y los
    municipios con el código INE de 5 cifras: sin prefijo, `08019` y el barrio
    `08019`… no colisionan hoy, pero `01` sí se parece peligrosamente a un
    truncamiento. Con `B` delante la pertenencia es legible a simple vista y
    cualquier cruce mal hecho entre ficheros falla en vez de mentir. */
const PFX_BARRI = "B";

/** Barcelona sale de la capa municipal: sus 73 barrios la sustituyen. Dejar
    las dos cosas contaría la ciudad dos veces en el ranking y en el mapa
    pintaría el bloque entero encima de sus propios barrios. */
const BCN_INE = "08019";

const avisos = [];

const transit = readOpt("transit.json");
const linies  = readOpt("linies.json");
const iso     = readOpt("isocrones.json");
const pois    = read(src("pois.json"));
const segur   = readOpt("seguretat.json");
const delBcn  = readOpt("delictes-bcn.json");
const tarifes = readOpt("tarifes.json");
const centres = readOpt("centres.json");
const soroll  = readOpt("soroll.json");
const estac   = readOpt("estacions.json") || [];
const esport  = readOpt("esport.json");
const edatHab = readOpt("edat-habitatge.json");
const comerc  = readOpt("comerc.json");
const queixes = readOpt("queixes.json");
const serveis = readOpt("serveis.json");

if (!segur)   avisos.push("falta seguretat.json: sin delitos ni zona verde (python3 build_seguretat.py)");
if (!delBcn)  avisos.push("falta delictes-bcn.json: los 73 barrios se quedan sin delitos (python3 build_delictes_bcn.py)");
if (!tarifes) avisos.push("falta tarifes.json: sin zona tarifaria, abono ni agua (python3 build_tarifes.py)");
if (!centres) avisos.push("falta centres.json: sin centros educativos (node build_centres.mjs)");
if (!soroll)  avisos.push("falta soroll.json: sin ruido en los barrios (python3 build_soroll.py)");
if (!estac.length) avisos.push("falta estacions.json: sin distancia a la estación (node fetch-estacions.mjs)");
if (!esport)  avisos.push("falta esport.json: sin espacios deportivos (node build_esport.mjs)");
if (!edatHab) avisos.push("falta edat-habitatge.json: sin antigüedad del parque (python3 build_habitatge_edat.py)");
if (!comerc)  avisos.push("falta comerc.json: sin locales vacíos (python3 build_comerc.py)");
if (!queixes) avisos.push("falta queixes.json: sin avisos del IRIS (python3 build_queixes.py)");
if (!serveis) avisos.push("falta serveis.json: sin servicios de barrio (node fetch-serveis.mjs)");

if (!transit) throw new Error("falta transit.json — lanza antes fetch-transit.py");
if (!linies)  avisos.push("falta linies.json: la página se quedará sin la red dibujada");
if (!iso)     avisos.push("falta isocrones.json: la página se quedará sin el punto libre");

const pisos    = read(out("pisos-bcn.json"));
const barris   = read(out("bcn-barris.json"));
const geoMuni  = read(out("municipis-geo.json"));
const geoBarri = read(out("bcn-barris-geo.json"));

/* --------------------------------------------------------------------------
   Destinos
   -------------------------------------------------------------------------- */

/* Los que de verdad tienen ruta calculada. No se toman de pois.json: allí hay
   puntos (la playa, Collserola) que nunca se encaminaron, y ofrecerlos en la
   lista sería prometer un dato que no existe. */
const DESTINS = Object.keys(transit.meta?.destins || {});
const poiDe = new Map(pois.map(p => [p.id, p]));
const destins = DESTINS.map(id => {
  const p = poiDe.get(id);
  const c = transit.meta.destins[id];
  return { id, nom: p?.nom ?? id, tipus: p?.tipus ?? null, nota: p?.nota ?? null,
           lat: c.lat, lon: c.lon };
});
// Nombres para los destinos que no son POI de la página antigua.
const NOMS = {
  "castelldefels": ["Castelldefels (estació)", "estación de Rodalies"],
  "sant-cugat-estacio": ["Sant Cugat (estació FGC)", "centro de Sant Cugat"],
};
for (const d of destins) {
  if (NOMS[d.id]) { d.nom = NOMS[d.id][0]; d.tipus ||= NOMS[d.id][1]; }
}

/* --------------------------------------------------------------------------
   Indicadores de la zona
   -------------------------------------------------------------------------- */

/**
 * Los indicadores que la página ofrece para colorear el mapa, además del
 * precio y del tiempo de viaje.
 *
 * `barris` dice si el INE publica el campo también para los 73 barrios. Los que
 * no —Gini, paro, estudios, alquiler, coches, IST— existen solo por municipio:
 * la desigualdad de una unión de secciones censales no es la media de las
 * desigualdades, y el resto simplemente no se publica por debajo del municipio.
 * Se envían igualmente, con `null` en los barrios, y es la página la que avisa
 * de que ese mapa deja Barcelona en gris en vez de inventarse la cifra.
 */
const INDICADORS = [
  { camp: "renda_llar_eur",         barris: true  },
  { camp: "renda_persona_eur",      barris: true  },
  { camp: "edat_mitjana",           barris: true  },
  { camp: "pct_menors_18",          barris: true  },
  { camp: "pct_65_mes",             barris: true  },
  { camp: "mida_mitjana_llar",      barris: true  },
  { camp: "pct_llars_unipersonals", barris: true  },
  { camp: "gini",                   barris: false },
  { camp: "ist",                    barris: false },
  { camp: "atur_taxa_pct",          barris: false },
  { camp: "pct_educacio_superior",  barris: false },
  { camp: "pct_habitatge_lloguer",  barris: false },
  { camp: "turismes_per_1000_hab",  barris: false },
  { camp: "altitud_m",              barris: false },
  { camp: "pct_habitatge_principal", barris: false },
  { camp: "pressio_estacional_pct", barris: false },
  { camp: "creixement_1000",        barris: false },
];

/**
 * Pasa el bloque `ind` de la fila de origen al de la zona.
 *
 * `pct_estrangera` es el único campo derivado, y la resta es exacta: el INE
 * publica «% de población con nacionalidad española» y la nacionalidad o es
 * española o no lo es. Se da ya restado porque «% de extranjeros» es la
 * pregunta que se hace quien mira el mapa, y obligar a restar mentalmente de
 * 100 en cada tooltip es una forma tonta de equivocarse. Ojo con la lectura:
 * es **nacionalidad**, no lugar de nacimiento; un vecino nacionalizado cuenta
 * como español.
 */
/**
 * Los campos de seguretat.json, que van por municipio y por su cuenta.
 *
 * Los tres primeros llegan del Ministerio del Interior como **recuentos**, y
 * aquí se pasan a tasa por 1.000 habitantes con el mismo padrón que usa el
 * resto de la página, para no meter un segundo denominador. Interior solo
 * desglosa municipios de más de 20.000 habitantes: de los 91 nuestros cubre
 * 38, y ninguno de los 73 barrios. Van igualmente, y la página avisa.
 */
const SEGURETAT = [
  { camp: "delictes_1000",           origen: "delictes_total",       tasa: true },
  { camp: "robatoris_violencia_1000", origen: "robatoris_violencia", tasa: true },
  { camp: "robatoris_domicili_1000", origen: "robatoris_domicili",   tasa: true },
  { camp: "zona_verda_m2_hab",       origen: "zona_verda_m2_hab",    tasa: false },
];

/** Añade al bloque `ind` lo que venga de seguretat.json para este municipio. */
function seguretat(o, id, poblacio) {
  const s = segur?.municipis?.[id];
  if (!s) return o;
  for (const { camp, origen, tasa } of SEGURETAT) {
    const v = s[origen];
    if (v == null) continue;
    if (!tasa) { o[camp] = v; continue; }
    if (!poblacio) continue;                 // sin padrón no hay tasa que valga
    o[camp] = Math.round(v / poblacio * 1000 * 10) / 10;
  }
  return o;
}

/* --- delitos dentro de Barcelona -------------------------------------------
   Los 73 barrios no tienen dato propio —nadie lo publica— pero sí lo tiene su
   distrito: las Áreas Básicas Policiales de los Mossos son, dentro de la
   ciudad, exactamente los 10 distritos. Así que los barrios de un mismo
   distrito comparten número, y la página lo dice con esas palabras. Es peor
   alternativa que un dato por barrio y mucho mejor que la anterior, que era un
   único número para los 73.

   La tasa se calcula con la población del **distrito**, no la del barrio: el
   recuento es del distrito entero y dividirlo por los 50.863 vecinos del Raval
   daría una tasa siete veces inflada. */
const pobDistricte = new Map();
for (const m of barris.municipis) {
  const d = normDistr(m.comarca);
  if (d) pobDistricte.set(d, (pobDistricte.get(d) || 0) + (m.poblacio || 0));
}
const delPerDistr = new Map();
for (const d of Object.values(delBcn?.districtes || {})) {
  delPerDistr.set(normDistr(d.nom), d);
}

/** Nombres de distrito comparables: los Mossos escriben «Horta Guinardó» y el
    padrón «Horta-Guinardó», y ese guion no puede costar un indicador. */
function normDistr(s) {
  return String(s || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[-']/g, " ").replace(/\s+/g, " ").trim();
}

/** Añade al bloque `ind` de un barrio los delitos de su distrito. */
function delictesBarri(o, districte) {
  const d = delPerDistr.get(normDistr(districte));
  const pob = pobDistricte.get(normDistr(districte));
  if (!d || !pob) return o;
  for (const { camp, origen, tasa } of SEGURETAT) {
    if (!tasa || d[origen] == null) continue;
    o[camp] = Math.round(d[origen] / pob * 1000 * 10) / 10;
  }
  return o;
}

/**
 * Coste corriente y equipamiento: las fuentes que no pasan por indicadors.json.
 *
 * Cada una cubre una mitad distinta del mapa y por eso van por separado:
 *
 *   · `tarifes.json` — zona tarifaria de la ATM, abono mensual y precio del
 *     agua. **Solo municipios.** Barcelona entera es zona 1 y tiene un único
 *     precio del agua: repetir el mismo número en sus 73 barrios fingiría una
 *     diferencia que no existe.
 *   · `centres.json` — centros educativos. Es de los pocos que **llega a las
 *     164 zonas**: en Barcelona se reparten por las coordenadas del centro
 *     dentro del polígono del barrio, que es geometría y no estimación.
 *   · `soroll.json` — ruido. **Solo los 73 barrios**, el espejo exacto de los
 *     delitos. Fuera de la ciudad no hay tabla agregada que cruzar.
 */
const TARIFES = ["zones_a_bcn", "aigua_eur_m3"];
const CENTRES = ["centres_educatius_1000", "pct_centres_publics"];
const SOROLL  = ["pct_soroll_65db", "pct_soroll_nit_55db"];
const ESPORT  = ["esport_1000"];
const EDAT_HAB = ["pct_habitatge_pre1960"];
const COMERC  = ["pct_locals_buits"];
const QUEIXES = ["queixes_1000", "queixes_neteja_1000"];

const copia = (o, font, camps) => {
  for (const c of camps) if (font?.[c] != null) o[c] = font[c];
  return o;
};

/* --- plano local para medir distancias --------------------------------------
   Equirectangular centrado en el área: a esta latitud y para distancias de
   decenas de kilómetros la diferencia con la haversine está muy por debajo del
   error de los datos que se miden con él. */
const R_TERRA = 6371.0088;
const LAT0 = 41.45;
const KX = Math.cos(LAT0 * Math.PI / 180);
const GRAU_KM = Math.PI / 180 * R_TERRA;
const pla = ([lon, lat]) => [lon * KX * GRAU_KM, lat * GRAU_KM];

/**
 * Los dos campos que no vienen de ninguna fuente externa: se calculan aquí con
 * lo que ya hay. La densidad usa la superficie oficial en los municipios y la
 * del polígono en los barrios (nadie publica la de un barrio); la suma de las
 * 73 superficies calculadas queda a medio punto porcentual de los 101,35 km²
 * oficiales de Barcelona, que es todo el control que se le puede pedir.
 */
function derivats(o, z) {
  if (z.poblacio && z.superficie_km2) {
    o.densitat_hab_km2 = Math.round(z.poblacio / z.superficie_km2);
  }
  const e = distEstacioKm(z.lat, z.lon, EST_TOTES);
  if (e != null) o.dist_estacio_km = e;
  const t = distEstacioKm(z.lat, z.lon, EST_TREN);
  if (t != null) o.dist_tren_km = t;
  return o;
}

/* --- ¿hay parada, y a qué distancia? ---------------------------------------
   «¿Tiene estación?» se contesta con `tren` y `estacions`, que ya vienen de
   build-data.mjs, pero las dos son de término municipal: Sant Cugat y Rubí
   tienen estación las dos y no está igual de cerca. Esto lo mide.

   Dos números porque son dos preguntas distintas: `dist_estacio_km` cuenta
   cualquier estación —el metro también— y `dist_tren_km` solo Rodalies y FGC,
   que es lo que sirve para moverse por la provincia. En los 91 municipios sin
   metro las dos coinciden; en los 73 barrios se separan mucho.

   Ojo con la lectura, y así se documenta: es **línea recta desde el punto de
   referencia de la zona**, no andando y no desde tu portal. En un municipio
   grande describe el centro, no sus urbanizaciones. */
const EST_TOTES = estac.map(s => [s.lon, s.lat]);
const EST_TREN = estac.filter(s => s.xarxa === "Rodalies" || s.xarxa === "FGC")
                      .map(s => [s.lon, s.lat]);

function distEstacioKm(lat, lon, punts, dec = 1) {
  if (!punts.length) return null;
  const [px, py] = pla([lon, lat]);
  let millor = Infinity;
  for (const p of punts) {
    const [x, y] = pla(p);
    const d2 = (x - px) ** 2 + (y - py) ** 2;
    if (d2 < millor) millor = d2;
  }
  const f = 10 ** dec;
  return Math.round(Math.sqrt(millor) * f) / f;
}

/* --- servicios de barrio, desde OpenStreetMap -------------------------------

   Cinco categorías y, para cada una, **una sola cifra**: o la densidad o la
   distancia, la que de verdad contesta la pregunta. Publicar las dos de todas
   sería diez columnas para cinco preguntas.

     · comercios y farmacias → **por mil habitantes**. Aquí lo que importa es
       que haya varios cerca; uno solo a kilómetro y medio no resuelve la
       compra diaria.
     · salud y escuela → **distancia a la más cercana**. Necesitas una, no
       ocho, y en un municipio de mil habitantes una tasa por mil es ruido puro.
     · paradas de bus → **por kilómetro cuadrado**, que es la única de las tres
       formas que dice algo aquí. Se probaron las otras dos y se descartaron con
       los números delante, así que queda escrito para que nadie lo reintente:

         — *por mil habitantes* mide superficie despoblada del revés. Las
           paradas siguen la longitud de las calles, no a la gente, así que
           salían disparadas las zonas grandes y vacías —Vallvidrera 21,8 y la
           Marina del Prat Vermell 33,1— y el Barri Gòtic, el sitio mejor
           comunicado de la ciudad, se quedaba en 0,7.
         — *distancia a la más cercana* no distingue nada: **7 valores
           distintos en 164 zonas**, mediana 0,1 km. Es cierto —aquí todo el
           mundo tiene una parada a menos de 200 m— y por eso mismo no es un
           indicador, es una constante.
         — *por km²* da 138 valores distintos y arriba salen Ciutat Meridiana,
           el Coll y el Carmel: barrios de ladera sin metro donde el bus es de
           verdad la red que hay. Eso es lo que se quería medir.

   El cero de OSM es ambiguo —«no hay» o «nadie lo ha mapeado»—, que es lo que
   ya hizo descartar el registro de CAP y el de bibliotecas. Tres cosas lo
   acotan, y las tres están medidas abajo, no supuestas:

     1. las distancias se miden contra **todos** los puntos del rectángulo, no
        solo los de la zona, así que a un municipio sin nada mapeado dentro le
        sale la distancia real al del pueblo de al lado;
     2. las densidades **no se publican por debajo de 2.000 habitantes**, mismo
        criterio que el mínimo de locales del censo comercial;
     3. si una categoría deja demasiadas zonas a cero, el build **se planta**.

   Y el contraste que de verdad vale: las escuelas de OSM contra el directorio
   oficial del Departament d'Educació, que ya está en centres.json. Si OSM se
   queda muy corto ahí, está incompleto en general y las distancias mentirían.
*/
const SERV_DENSITAT = { comerc: "comercos_1000", farmacia: "farmacies_1000" };
const SERV_PER_KM2 = { bus: "parades_bus_km2" };
const SERV_DISTANCIA = { salut: "dist_salut_km", escola: "dist_escola_km" };
const POB_MIN_DENSITAT = 2000;
const AREA_MIN_KM2 = 0.2;
const MAX_PCT_ZERO = 15;          // por categoría, en las zonas con población suficiente
const MIN_ESCOLES_VS_OFICIAL = 0.7;

const servPunts = serveis?.punts || [];
/** Los puntos de cada categoría, ya en el plano local: se recorren 164 × N
    veces y proyectar dentro del bucle costaría 3,6 M de cosenos. */
const SERV_PLA = {};
for (const [cat] of Object.entries({ ...SERV_DENSITAT, ...SERV_PER_KM2, ...SERV_DISTANCIA })) {
  SERV_PLA[cat] = servPunts.filter(p => p.t === cat).map(p => [p.lon, p.lat]);
}

/* Recuento por zona. Un punto cae en un municipio o en un barrio de Barcelona,
   nunca en los dos: los barrios sustituyen a la ciudad en la capa municipal. */
const geoMuniCru  = read(src("municipis.geojson"));
const geoBarriCru = read(src("bcn-barris.geojson"));

function caixa(f) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const scan = (anell) => { for (const [x, y] of anell) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  } };
  const g = f.geometry;
  if (g?.type === "Polygon") g.coordinates.forEach(scan);
  else if (g?.type === "MultiPolygon") g.coordinates.forEach(pol => pol.forEach(scan));
  return [x0, y0, x1, y1];
}
function dinsAnell(anell, lon, lat) {
  let dins = false;
  for (let i = 0, j = anell.length - 1; i < anell.length; j = i++) {
    const [xi, yi] = anell[i], [xj, yj] = anell[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dins = !dins;
  }
  return dins;
}
/** Dentro del anillo exterior y fuera de todos los huecos. */
const dinsPol = (pol, lon, lat) =>
  dinsAnell(pol[0], lon, lat) && !pol.slice(1).some(f => dinsAnell(f, lon, lat));
function dinsFeat(f, lon, lat) {
  const g = f.geometry;
  if (g?.type === "Polygon") return dinsPol(g.coordinates, lon, lat);
  if (g?.type === "MultiPolygon") return g.coordinates.some(pol => dinsPol(pol, lon, lat));
  return false;
}

/** Índice de features con su caja, para descartar rápido antes del test caro. */
const indexa = (fc, clau) => fc.features.map(f => ({ f, cb: caixa(f), k: f.properties[clau] }));
const idxMuni  = indexa(geoMuniCru, "codi_ine");
const idxBarri = indexa(geoBarriCru, "codi_barri");

const servMuni = new Map();       // ine  → { cat: n }
const servBarri = new Map();      // codi → { cat: n }
let servFora = 0;
for (const p of servPunts) {
  const busca = (idx) => {
    for (const e of idx) {
      if (p.lon < e.cb[0] || p.lon > e.cb[2] || p.lat < e.cb[1] || p.lat > e.cb[3]) continue;
      if (dinsFeat(e.f, p.lon, p.lat)) return e.k;
    }
    return null;
  };
  const ine = busca(idxMuni);
  if (!ine) { servFora++; continue; }
  const [mapa, clau] = ine === BCN_INE ? [servBarri, busca(idxBarri)] : [servMuni, ine];
  if (!clau) { servFora++; continue; }
  if (!mapa.has(clau)) mapa.set(clau, {});
  const c = mapa.get(clau);
  c[p.t] = (c[p.t] || 0) + 1;
}

/** Las cifras de servicios de una zona. `clau` es el INE o el código de barrio. */
function serveisDe(o, z, mapa, clau) {
  if (!servPunts.length) return o;
  const c = mapa.get(clau) || {};
  // Dos decimales, y no uno como en las estaciones, porque aquí el rango entero
  // cabe en la primera cifra: las farmacias van de 0 a 1,3 por mil y las escuelas
  // están casi todas a menos de un kilómetro. Redondeando a décimas, 160 zonas se
  // apelotonan en doce valores distintos y el indicador deja de distinguir nada
  // —que es justo el motivo por el que se descartó la distancia a la parada de bus.
  for (const [cat, camp] of Object.entries(SERV_DENSITAT)) {
    if (!z.poblacio || z.poblacio < POB_MIN_DENSITAT) continue;
    o[camp] = Math.round((c[cat] || 0) / z.poblacio * 1000 * 100) / 100;
  }
  for (const [cat, camp] of Object.entries(SERV_PER_KM2)) {
    // Esta sí llega a 77, así que la décima ya separa: 137 valores en 162 zonas.
    if (!z.superficie_km2 || z.superficie_km2 < AREA_MIN_KM2) continue;
    o[camp] = Math.round((c[cat] || 0) / z.superficie_km2 * 10) / 10;
  }
  for (const [cat, camp] of Object.entries(SERV_DISTANCIA)) {
    const d = distEstacioKm(z.lat, z.lon, SERV_PLA[cat], 2);
    if (d != null) o[camp] = d;
  }
  return o;
}

function indicadors(ind) {
  const o = {};
  // Los campos sin dato se omiten en vez de ir a `null`: son 6 × 73 barrios, y
  // escribirlos cuesta ~11 kB de la carga inicial para no decir nada. La página
  // lee siempre con `?? null`, así que ausente y nulo le dan lo mismo.
  for (const { camp } of INDICADORS) {
    if (ind?.[camp] != null) o[camp] = ind[camp];
  }
  const esp = ind?.pct_poblacio_espanyola;
  if (esp != null) o.pct_estrangera = Math.round((100 - esp) * 10) / 10;
  return o;
}

/** ¿Este destino coincide con la propia zona? Un trayecto de 2 min andando de
    Castelldefels a la estación de Castelldefels es cierto pero no informa de
    nada, y en el ranking se come la escala. Se marca para que la página lo
    pueda decir en vez de presumir de un 2. */
const trivial = (z, d) => {
  const dx = (d.lon - z.lon) * Math.cos(41.45 * Math.PI / 180);
  const dy = d.lat - z.lat;
  return Math.hypot(dx, dy) * 111.32 < 3;        // menos de 3 km en línea recta
};

/* --------------------------------------------------------------------------
   Las 164 zonas
   -------------------------------------------------------------------------- */

const rutes = {};            // id → destí → itinerari tramo a tramo
let ambDesglos = 0;

/**
 * Convierte una fila de pisos-bcn.json / bcn-barris.json en una zona, y aparta
 * su itinerario detallado a `rutes`.
 *
 * @param m        la fila de origen
 * @param id       el ID ya definitivo (INE, o B+número de barrio)
 * @param tipus    "municipi" | "barri"
 * @param t        su bloque de transit.json, si lo hay
 */
function zona(m, id, tipus, t) {
  const dst = {};
  const rut = {};
  for (const d of destins) {
    const v = t?.destins?.[d.id];
    if (!v) { dst[d.id] = null; continue; }
    if (v.a_peu != null) ambDesglos++;

    // Lo que necesita el filtro y el ranking: se queda en zonas.json.
    dst[d.id] = {
      min: v.min,
      a_peu: v.a_peu ?? null,
      transbords: v.transbords,
      modes: v.modes,
      ...(v.arriba_tard ? { arriba_tard: true } : {}),
      ...(trivial(m, d) ? { trivial: true } : {}),
    };

    // Lo que solo hace falta al pinchar: se va a rutas.json. Es el grueso del
    // peso —las coordenadas de subida y bajada de cada tramo— y la mayoría de
    // las visitas no abre ni un itinerario.
    rut[d.id] = {
      a_peu_acces: v.a_peu_acces ?? null,
      a_peu_transbord: v.a_peu_transbord ?? null,
      a_peu_final: v.a_peu_final ?? null,
      en_vehicle: v.en_vehicle ?? null,
      espera: v.espera ?? null,
      sortida: v.sortida ?? null,
      arribada: v.arribada ?? null,
      ...(v.arriba_tard ? { arribada_local: v.arribada_local } : {}),
      linies: (v.linies || []).map(l => ({
        ref: l.ref, xarxa: l.xarxa, min: l.min,
        de: l.de?.nom ?? null, a: l.a?.nom ?? null,
        dl: l.de?.lat != null ? [l.de.lon, l.de.lat] : null,
        al: l.a?.lat  != null ? [l.a.lon,  l.a.lat]  : null,
      })),
    };
  }
  if (Object.keys(rut).length) rutes[id] = rut;

  // Código de barrio sin el prefijo: es la clave con la que vienen indexados
  // los ficheros que bajan al barrio (centros, ruido).
  const cb = tipus === "barri" ? id.slice(PFX_BARRI.length) : null;
  const tar = tipus === "barri" ? null : tarifes?.municipis?.[id];

  const z = {
    id, tipus,
    nom: m.nom,
    // Un barrio sin la ciudad delante es ambiguo fuera de Barcelona («Sant
    // Andreu» es barrio y es municipio vecino). El nombre largo es el que va en
    // las tarjetas del ranking y en el tooltip.
    nom_llarg: tipus === "barri" ? `${m.nom} (Barcelona)` : m.nom,
    comarca: tipus === "barri" ? "Barcelonès" : m.comarca,
    ...(tipus === "barri" ? { districte: m.comarca } : {}),
    lat: m.lat, lon: m.lon,
    dist_bcn_km: m.dist_bcn_km,
    poblacio: m.poblacio,
    // Oficial en los municipios (municipis.json), calculada del polígono en los
    // barrios (nadie la publica). Sostiene la densidad de población.
    superficie_km2: m.superficie_km2 ?? null,
    compra_eur_m2: m.compra_eur_m2,
    compra_eur_total: m.compra_eur_total,
    superficie_mitjana_m2: m.superficie_mitjana_m2 ?? null,
    lloguer_eur_mes: m.lloguer_eur_mes,
    // Tamaño de la muestra con la que se publicó cada precio. La página lo usa
    // para marcar los que salen de cuatro operaciones y no se deberían leer
    // como si fueran el precio del barrio.
    compra_operacions: m.compra_operacions ?? null,
    lloguer_contractes: m.lloguer_contractes ?? null,
    tren: m.tren ?? null,
    estacions: m.estacions ?? null,
    // La corona tarifaria va como texto («2C») y no como número: es la etiqueta
    // que lleva escrita el billete. Lo que se puede ordenar y filtrar —cuántas
    // zonas cruzas hasta Barcelona— va aparte, en `ind`.
    ...(tar?.zona_tarifaria ? { zona_tarifaria: tar.zona_tarifaria } : {}),
    destins: dst,
  };

  // Los barrios no reciben nada de tarifes.json: la zona tarifaria y el agua no
  // bajan del municipio, y repartir el dato de Barcelona entre sus 73 barrios
  // pintaría 73 zonas iguales fingiendo un detalle que no existe. El ruido va
  // al revés: solo barrios. Los delitos están en medio —son del distrito— y por
  // eso tienen su propio inyector.
  const ind = indicadors(m.ind);
  if (tipus === "barri") {
    copia(ind, soroll?.barris?.[cb], SOROLL);
    copia(ind, centres?.barris?.[cb], CENTRES);
    copia(ind, esport?.barris?.[cb], ESPORT);
    copia(ind, edatHab?.barris?.[cb], EDAT_HAB);
    copia(ind, comerc?.barris?.[cb], COMERC);
    copia(ind, queixes?.barris?.[cb], QUEIXES);
    delictesBarri(ind, m.comarca);
    serveisDe(ind, z, servBarri, cb);
  } else {
    seguretat(ind, id, m.poblacio);
    copia(ind, tar, TARIFES);
    copia(ind, centres?.municipis?.[id], CENTRES);
    copia(ind, esport?.municipis?.[id], ESPORT);
    serveisDe(ind, z, servMuni, id);
  }
  z.ind = derivats(ind, z);
  return z;
}

const trMuni  = new Map(Object.entries(transit.municipis || {}));
const trBarri = new Map(Object.entries(transit.barris || {}));
const busca = (mapa, id) => mapa.get(id) || mapa.get(id.padStart(5, "0"));

const zones = [];
let bcnFora = false;
for (const m of pisos.municipis) {
  const ine = String(m.ine).padStart(5, "0");
  if (ine === BCN_INE) { bcnFora = true; continue; }
  zones.push(zona(m, ine, "municipi", busca(trMuni, ine)));
}
for (const m of barris.municipis) {
  const id = PFX_BARRI + String(m.ine).padStart(2, "0");
  zones.push(zona(m, id, "barri", busca(trBarri, String(m.ine))));
}

if (!bcnFora) avisos.push(`no he encontrado Barcelona (${BCN_INE}) en la capa `
                        + "municipal: compruébalo, la ciudad puede estar contada dos veces");
const dup = zones.map(z => z.id).filter((v, i, a) => a.indexOf(v) !== i);
if (dup.length) throw new Error("IDs de zona repetidos: " + dup.join(", "));
if (ambDesglos === 0) {
  avisos.push("transit.json no trae el desglose por tramo (a_peu): el filtro de "
            + "caminata no funcionará. ¿Has relanzado fetch-transit.py?");
}

/* --------------------------------------------------------------------------
   Geometría — fusionar y aligerar
   -------------------------------------------------------------------------- */

const idsZona = new Set(zones.map(z => z.id));
let vertexAbans = 0, vertexDespres = 0;
const feats = [];
const senseGeo = [];

function afegeixGeo(fc, mapId) {
  for (const f of fc.features) {
    const id = mapId(String(f.properties.codi_ine));
    if (!idsZona.has(id)) continue;          // Barcelona como municipio cae aquí
    vertexAbans += contaVertexs(f.geometry);
    const g = simplificaGeometria(f.geometry, TOL_GEO_M);
    if (!g) { senseGeo.push(id); continue; }
    vertexDespres += contaVertexs(g);
    feats.push({ type: "Feature", properties: { id }, geometry: g });
  }
}
afegeixGeo(geoMuni,  (c) => c.padStart(5, "0"));
afegeixGeo(geoBarri, (c) => PFX_BARRI + c.padStart(2, "0"));

if (senseGeo.length) {
  avisos.push(`${senseGeo.length} zonas se han quedado sin polígono al simplificar `
            + `(${senseGeo.join(", ")}): baja TOL_GEO_M`);
}
const ambGeo = new Set(feats.map(f => f.properties.id));
const faltenGeo = zones.filter(z => !ambGeo.has(z.id)).map(z => z.id);
if (faltenGeo.length) {
  avisos.push(`sin geometría: ${faltenGeo.join(", ")} — no se podrán pintar en el mapa`);
}

/* --------------------------------------------------------------------------
   Isócronas — fusionar las dos matrices en el orden de `zones`
   -------------------------------------------------------------------------- */

/* Las dos matrices salen de la misma tanda de consultas y comparten los mismos
   anclajes, así que fusionarlas es reordenar filas: una fila por zona, en el
   mismo orden que `zones`, para que la página indexe por posición y no tenga
   que llevar un mapa de IDs en memoria. */
let isoZones = null;
if (iso) {
  const nA = iso.ancores.length;
  const files = new Map();
  const carrega = (bloc, mapId) => {
    const buf = Buffer.from(bloc.matriu, "base64");
    if (buf.length !== bloc.ids.length * nA) {
      throw new Error(`matriz de isócronas incoherente: ${buf.length} bytes para `
                    + `${bloc.ids.length} filas × ${nA} anclajes`);
    }
    bloc.ids.forEach((raw, i) => {
      files.set(mapId(String(raw)), buf.subarray(i * nA, (i + 1) * nA));
    });
  };
  carrega(iso.municipis, (c) => c.padStart(5, "0"));
  carrega(iso.barris,    (c) => PFX_BARRI + c.padStart(2, "0"));

  const fusio = Buffer.alloc(zones.length * nA, iso.inabastable);
  const senseIso = [];
  zones.forEach((z, i) => {
    const f = files.get(z.id);
    if (!f) { senseIso.push(z.id); return; }
    f.copy(fusio, i * nA);
  });
  if (senseIso.length) {
    avisos.push(`${senseIso.length} zonas sin fila de isócronas (${senseIso.join(", ")}): `
              + "para ellas el punto libre no dará tiempo");
  }
  isoZones = { ids: zones.map(z => z.id), matriu: fusio.toString("base64") };
}

/* --------------------------------------------------------------------------
   Escritura
   -------------------------------------------------------------------------- */

/** Buses que aparecen en algún itinerario óptimo, y cuántos de ellos tienen
    trazado dibujable. La diferencia no es un fallo del cálculo: el tiempo de
    viaje los cuenta todos; lo que falta es la geometría, porque el código con
    el que el horario oficial nombra la línea no coincide con el de
    OpenStreetMap y no hay forma fiable de casarlos por cadena de texto. */
function comptaBus() {
  const usats = new Set();
  for (const perDesti of Object.values(rutes))
    for (const r of Object.values(perDesti))
      for (const l of r.linies || [])
        if (l.xarxa === "Bus" && l.ref) usats.add(String(l.ref).toUpperCase());
  const dibuixats = new Set((linies?.linies || [])
    .filter(l => l.xarxa === "Bus" && l.ref).map(l => String(l.ref).toUpperCase()));
  return {
    usats: usats.size,
    dibuixats: [...usats].filter(r => dibuixats.has(r)).length,
    ferroviaries: (linies?.linies || []).filter(l => l.xarxa !== "Bus").length,
    parades: linies?.parades?.length ?? 0,
  };
}

const meta = {
  generat: new Date().toISOString().slice(0, 10),
  escala: "zones",
  zones: { municipis: zones.filter(z => z.tipus === "municipi").length,
           barris:    zones.filter(z => z.tipus === "barri").length },
  radi_km: pisos.meta?.radi_km ?? 30,
  // El porqué del grano desigual, para que la página lo pueda citar en vez de
  // dejar al lector pensando que es un descuido.
  nota_gra: "Barcelona va desglosada en sus 73 barrios; el resto del área, por "
          + "municipio. No es una elección: Incasòl, Idescat e INE publican precio "
          + "y padrón por municipio, y solo el Ayuntamiento de Barcelona publica "
          + "por barrio. Fuera de la ciudad no hay dato sub-municipal que cruzar.",
  destins,
  // Qué indicadores lleva cada zona y hasta dónde llegan. La página pinta la
  // advertencia de cobertura a partir de esto, no de una frase escrita a mano
  // que se desfasaría en cuanto el INE publicara un campo más por barrio.
  indicadors: {
    any: pisos.meta?.indicadors_any ?? null,
    camps: [...INDICADORS.map(i => i.camp), "pct_estrangera",
            ...SEGURETAT.map(s => s.camp),
            ...TARIFES, ...CENTRES, ...SOROLL,
            ...ESPORT, ...EDAT_HAB, ...COMERC, ...QUEIXES,
            ...Object.values(SERV_DENSITAT), ...Object.values(SERV_PER_KM2),
            ...Object.values(SERV_DISTANCIA),
            "densitat_hab_km2", "dist_estacio_km", "dist_tren_km"].map(camp => ({
      camp,
      municipis: zones.filter(z => z.tipus === "municipi" && z.ind[camp] != null).length,
      barris: zones.filter(z => z.tipus === "barri" && z.ind[camp] != null).length,
    })),
    nota_estrangera: "«Población extranjera» es 100 menos el porcentaje de "
      + "población con nacionalidad española que publica el INE. Es "
      + "nacionalidad, no lugar de nacimiento: quien se ha nacionalizado "
      + "cuenta como español.",
    nota_barris: "Gini, paro, estudios superiores, vivienda en alquiler, "
      + "coches por habitante, índice socioeconómico, altitud, parque de "
      + "vivienda principal, presión estacional, crecimiento de población, "
      + "zona tarifaria y precio del agua existen solo por municipio. Al "
      + "colorear por uno de ellos, los 73 barrios de Barcelona se quedan en "
      + "gris: el dato no se publica por debajo del municipio y repartir el de "
      + "la ciudad entre sus barrios sería inventárselo. El ruido va justo al "
      + "revés —solo barrios— y los delitos solo cubren la mitad de los "
      + "municipios.",
    serveis: serveis ? {
      font: "© colaboradores de OpenStreetMap, ODbL · vía Overpass",
      generat: serveis.generat,
      pob_minima_densitat: POB_MIN_DENSITAT,
      nota: "Los comercios de alimentación y las farmacias se cuentan dentro "
        + "de la zona y se dan por mil habitantes; los centros de salud y las "
        + "escuelas, como distancia en línea recta a la más cercana, que es lo "
        + "que se pregunta de ellos: necesitas una, no ocho. Las paradas de bus "
        + "van por kilómetro cuadrado y no por habitante, porque siguen la "
        + "longitud de las calles y no a la gente: por habitante premiaban a "
        + "las zonas grandes y vacías y dejaban al Barri Gòtic por los suelos. "
        + "Las densidades no "
        + `se publican por debajo de ${POB_MIN_DENSITAT} habitantes ni, en el `
        + `caso del bus, de ${AREA_MIN_KM2} km², donde un `
        + "punto arriba o abajo cambia la cifra de sitio. Sale de "
        + "OpenStreetMap, que es la única fuente que llega a la vez a los 91 "
        + "municipios y a los 73 barrios: no se inventa nada, pero puede "
        + "faltarle. Por eso las distancias se miden contra todos los puntos "
        + "del área y no solo contra los de la zona, y por eso el recuento de "
        + "escuelas se contrasta con el directorio oficial antes de publicarse.",
    } : null,
    // La seguridad va aparte porque no solo le faltan los barrios: le falta
    // media provincia. La página necesita poder decir el número exacto.
    seguretat: segur ? {
      delictes_any: segur.delictes?.any ?? null,
      llindar_habitants: segur.delictes?.llindar_habitants ?? null,
      zona_verda_any: segur.zona_verda?.any ?? null,
      // Encaja detrás de dos puntos en la metodología de la página, así que
      // empieza en minúscula y no repite el sujeto.
      nota: "el Ministerio solo desglosa los de más de 20.000 habitantes, y "
        + "los Mossos publican por Área Básica Policial —en Barcelona, 10 "
        + "distritos—. No hay cifra de delitos por barrio, ni para los "
        + "municipios pequeños.",
      nota_lloc: "Los delitos se cuentan donde ocurren, no donde vive quien "
        + "los sufre. Un municipio con aeropuerto, puerto, polígono o mucho "
        + "turismo sale alto sin que sus vecinos vivan peor: el Prat de "
        + "Llobregat encabeza la lista por el aeropuerto. Los robos en "
        + "domicilio son la única de las tres cifras que mide algo que le "
        + "pasa a quien vive allí.",
    } : null,
    // Las fuentes que entran por su cuenta. Cada una lleva su año y su aviso
    // de cobertura para que la página los pueda citar sin escribirlos a mano.
    transport: tarifes ? {
      font: tarifes.transport?.font ?? null,
      url: tarifes.transport?.url ?? null,
      consulta: tarifes.transport?.consulta ?? null,
      tusual: tarifes.transport?.tusual ?? null,
      nota: tarifes.transport?.nota ?? null,
      aigua_any: tarifes.aigua?.any ?? null,
      aigua_font: tarifes.aigua?.font ?? null,
      aigua_nota: tarifes.aigua?.nota ?? null,
    } : null,
    centres: centres ? {
      font: centres.font ?? null,
      curs: centres.curs ?? null,
      min_centres_per_percentatge: centres.min_centres_per_percentatge ?? null,
      nota: centres.nota ?? null,
    } : null,
    soroll: soroll ? {
      font: soroll.font ?? null,
      any: soroll.any ?? null,
      nota: soroll.nota ?? null,
      nota_cobertura: soroll.nota_cobertura ?? null,
    } : null,
    esport: esport ? {
      font: esport.font ?? null,
      nota: esport.nota ?? null,
      control_idescat: esport.control_idescat ?? null,
    } : null,
    edat_habitatge: edatHab ? {
      font: edatHab.font ?? null,
      any: edatHab.any ?? null,
      nota: edatHab.nota ?? null,
    } : null,
    comerc: comerc ? {
      font: comerc.font ?? null,
      any: comerc.any ?? null,
      nota: comerc.nota ?? null,
    } : null,
    queixes: queixes ? {
      font: queixes.font ?? null,
      any: queixes.any ?? null,
      nota: queixes.nota ?? null,
      arees_excloses: queixes.arees_excloses ?? null,
    } : null,
    delictes_bcn: delBcn ? {
      font: delBcn.font ?? null,
      any: delBcn.any ?? null,
      factor_prorrateig: delBcn.factor_prorrateig ?? null,
      nota: delBcn.nota ?? null,
    } : null,
    estacions: {
      font: "OpenStreetMap via Overpass · fetch-estacions.mjs",
      nota: "La distancia a la estación es en línea recta desde el punto de "
        + "referencia de la zona —el núcleo urbano del municipio o el "
        + "centroide del barrio—, no andando y no desde tu portal. En un "
        + "municipio grande describe el centro, no sus urbanizaciones. "
        + "«Al tren» cuenta solo Rodalies y FGC; la otra, también el metro.",
    },
  },
  transit: {
    hora: transit.meta?.hora_referencia ?? null,
    metode: transit.meta?.metode ?? null,
    desglos: transit.meta?.desglos ?? null,
    limitacions: transit.meta?.limitacions ?? null,
    hora_punta: transit.meta?.hora_punta ?? null,
    font: transit.meta?.font ?? null,
  },
  iso: iso ? { hora: iso.hora, metode: iso.metode, font: iso.font,
               limit_min: iso.limit_min, cella_m: iso.cella_m } : null,
  // Cuántos de los buses que salen en algún itinerario llegan a dibujarse. Se
  // cuenta aquí porque la página ya no tiene los itinerarios en la carga
  // inicial —se fueron a rutas.json— y la frase de la metodología no puede
  // quedar escrita a mano: se desfasaría en cuanto cambiara el etiquetado.
  bus: comptaBus(),
  geo: { tolerancia_m: TOL_GEO_M,
         nota: `Polígonos simplificados con Douglas-Peucker a ${TOL_GEO_M} m. `
             + "Las fronteras son las oficiales, redibujadas con menos vértices; "
             + "no uses este fichero para medir superficies ni para lindes." },
  periodes: pisos.meta?.periodes ?? null,
  casa: pisos.meta?.casa ?? null,
  fonts: pisos.meta?.fonts ?? null,
};

writeFileSync(out("zonas.json"), JSON.stringify({ meta, zones }));
writeFileSync(out("zonas-geo.json"), JSON.stringify({
  type: "FeatureCollection",
  meta: { tolerancia_m: TOL_GEO_M, nota: meta.geo.nota },
  features: feats,
}));
writeFileSync(out("rutas.json"), JSON.stringify({
  meta: { generat: meta.generat, nota: "Itinerario tramo a tramo de cada zona × destino. "
        + "Se carga solo al abrir una zona." },
  rutes,
}));

if (linies) writeFileSync(out("linies.json"), JSON.stringify(linies));

if (iso) {
  writeFileSync(out("iso-ancores.json"), JSON.stringify({
    generat: iso.generat, metode: iso.metode, font: iso.font, hora: iso.hora,
    limit_min: iso.limit_min, cella_m: iso.cella_m, bbox: iso.bbox,
    dlat: iso.dlat, dlon: iso.dlon, ncols: iso.ncols,
    inabastable: iso.inabastable, ancores: iso.ancores,
  }));
  writeFileSync(out("iso-zonas.json"), JSON.stringify(isoZones));
}

/* Los de las dos escalas viejas. Se borran aquí y no a mano porque el
   despliegue es un git-sync de la carpeta entera: si se quedan, se sirven, y
   dentro de un mes nadie sabrá si la página los sigue pidiendo. */
const OBSOLETS = ["transporte-muni.json", "transporte-barris.json",
                  "iso-muni.json", "iso-barris.json"];
const esborrats = [];
for (const f of OBSOLETS) {
  if (existsSync(out(f))) { rmSync(out(f)); esborrats.push(f); }
}

/* --------------------------------------------------------------------------
   Resumen — la misma tabla que imprimen los otros build-*, para ver de un
   vistazo si algo se ha quedado a medias.
   -------------------------------------------------------------------------- */
const mida = (f) => existsSync(out(f)) ? statSync(out(f)).size : 0;
const kb = (f) => mida(f) ? (mida(f) / 1024).toFixed(0) + " KB" : "—";
const cob = (d) => zones.filter(z => z.destins[d]).length;

console.log("── transporte ──────────────────────────────────");
console.log(`  zonas                 ${zones.length}  (${meta.zones.municipis} municipios `
          + `+ ${meta.zones.barris} barrios de Barcelona)`);
console.log(`  destinos              ${destins.length}  (${destins.map(d => d.id).join(", ")})`);
for (const d of destins) {
  const n = cob(d.id);
  console.log(`    ${d.id.padEnd(20)} ${String(n).padStart(3)}/${zones.length} `
            + `(${(100 * n / zones.length).toFixed(0)}%)`);
}
const ambPeu = zones.filter(z => Object.values(z.destins).some(d => d?.a_peu != null)).length;
console.log(`  con desglose a pie    ${ambPeu}/${zones.length}`);
console.log(`  con precio de compra  ${zones.filter(z => z.compra_eur_m2 != null).length}/${zones.length}`);
console.log("  ── indicadores ──");
for (const c of meta.indicadors.camps) {
  const tot = c.municipis + c.barris;
  console.log(`    ${c.camp.padEnd(24)} ${String(tot).padStart(3)}/${zones.length}  `
            + `(${c.municipis} mun. + ${c.barris} barrios)`
            + (c.barris === 0 ? "   ← solo municipal" : ""));
}
/* --- las guardas de los servicios ------------------------------------------
   Se comprueban aquí y no en fetch-serveis.mjs porque hasta que los puntos no
   están repartidos no se sabe si a alguna zona le falta todo. Y **paran el
   build**: un indicador con demasiados ceros no se distingue de un indicador
   que miente, y esta página se sostiene precisamente sobre no publicar eso. */
if (serveis) {
  console.log("  ── servicios (OpenStreetMap) ──");
  const errors = [];
  for (const [cat, camp] of Object.entries({ ...SERV_DENSITAT, ...SERV_PER_KM2 })) {
    const amb = zones.filter(z => z.ind[camp] != null);
    const zero = amb.filter(z => z.ind[camp] === 0);
    const pct = amb.length ? 100 * zero.length / amb.length : 100;
    console.log(`    ${camp.padEnd(24)} ${String(amb.length).padStart(3)}/${zones.length}  `
              + `· ${zero.length} a cero (${pct.toFixed(0)} %)`);
    if (pct > MAX_PCT_ZERO) {
      errors.push(`«${cat}»: ${zero.length} de ${amb.length} zonas a cero (${pct.toFixed(0)} %, `
        + `tope ${MAX_PCT_ZERO} %). O falta media provincia en OpenStreetMap o las etiquetas `
        + `han cambiado; en cualquier caso el número no dice lo que parece.`);
    }
  }
  for (const camp of Object.values(SERV_DISTANCIA)) {
    const amb = zones.filter(z => z.ind[camp] != null);
    const pitjor = Math.max(...amb.map(z => z.ind[camp]));
    console.log(`    ${camp.padEnd(24)} ${String(amb.length).padStart(3)}/${zones.length}  `
              + `· la más lejos, a ${pitjor} km`);
    if (amb.length < zones.length) {
      errors.push(`«${camp}» solo llega a ${amb.length} de ${zones.length} zonas: una distancia `
        + `se mide contra todos los puntos del área, así que debería llegar a todas.`);
    }
  }
  // El contraste que de verdad vale: OSM contra el directorio oficial. Si OSM
  // se queda corto en las escuelas, está incompleto en general.
  const osmEscoles = (serveis.compte?.escola) || 0;
  const oficials = Object.values(centres?.municipis || {})
    .reduce((a, m) => a + (m.centres_educatius || 0), 0);
  if (oficials > 0) {
    const rao = osmEscoles / oficials;
    console.log(`    escuelas OSM/oficial     ${osmEscoles}/${oficials} = ${rao.toFixed(2)}`);
    if (rao < MIN_ESCOLES_VS_OFICIAL) {
      errors.push(`OpenStreetMap solo tiene ${osmEscoles} escuelas frente a las ${oficials} del `
        + `directorio oficial (${(rao * 100).toFixed(0)} %, mínimo ${MIN_ESCOLES_VS_OFICIAL * 100} %): `
        + `está incompleto y las distancias saldrían largas.`);
    }
  }
  if (servFora) console.log(`    ${servFora} puntos fuera de todo polígono (de ${servPunts.length})`);
  if (errors.length) {
    throw new Error("los servicios no pasan sus propias comprobaciones:\n  · " + errors.join("\n  · "));
  }
}

console.log(`  geometría             ${feats.length}/${zones.length} polígonos · `
          + `${vertexAbans} → ${vertexDespres} vértices `
          + `(−${(100 * (1 - vertexDespres / vertexAbans)).toFixed(0)}% a ${TOL_GEO_M} m)`);
if (linies) {
  const perX = {};
  for (const l of linies.linies) perX[l.xarxa] = (perX[l.xarxa] || 0) + 1;
  console.log(`  líneas dibujadas      ${linies.linies.length}  ${JSON.stringify(perX)}`);
  console.log(`  paradas               ${linies.parades.length}`);
}
if (iso) console.log(`  anclajes isócrona     ${iso.ancores.length} (rejilla de ${iso.cella_m} m)`);

console.log("  ── tamaños ──");
const INICIAL = ["zonas.json", "zonas-geo.json", "linies.json"];
const DIFERIT = ["rutas.json", "iso-ancores.json", "iso-zonas.json"];
for (const f of INICIAL) console.log(`    ${f.padEnd(20)} ${kb(f).padStart(8)}   ← al abrir`);
for (const f of DIFERIT) console.log(`    ${f.padEnd(20)} ${kb(f).padStart(8)}`);
// El presupuesto de verdad lo impone test-transport.mjs; aquí solo se avisa
// pronto. Estaban descompasados —600 aquí, 660 allí— y el aviso saltaba en cada
// build sin que nada estuviera mal, que es la mejor manera de que nadie lo lea.
const PRESSUPOST_KB = 660;
const inicial = INICIAL.reduce((a, f) => a + mida(f), 0) / 1024;
console.log(`    ${"carga inicial".padEnd(20)} ${(inicial.toFixed(0) + " KB").padStart(8)}`
          + `   (presupuesto ${PRESSUPOST_KB} KB)`);
if (inicial > PRESSUPOST_KB) avisos.push(`la carga inicial son ${inicial.toFixed(0)} KB, por encima `
                             + `del presupuesto de ${PRESSUPOST_KB} KB`);
if (esborrats.length) console.log(`  borrados (escalas viejas): ${esborrats.join(", ")}`);
for (const a of avisos) console.warn(`  ⚠ ${a}`);
