/**
 * Monta los datos de pages/transporte-publico.html.
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
 * el presupuesto (600 kB, lo comprueba test-transport.mjs); el itinerario
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

if (!segur) avisos.push("falta seguretat.json: sin delitos ni zona verde (python3 build_seguretat.py)");

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

  return {
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
    sortides: t?.sortides_hora_punta ?? m.sortides ?? null,
    // Los barrios no reciben nada de seguretat.json: ninguna de sus fuentes
    // baja del municipio, y repartir el dato de Barcelona entre sus 73 barrios
    // pintaría 73 zonas iguales fingiendo un detalle que no existe.
    ind: tipus === "barri" ? indicadors(m.ind)
                           : seguretat(indicadors(m.ind), id, m.poblacio),
    destins: dst,
  };
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
            ...SEGURETAT.map(s => s.camp)].map(camp => ({
      camp,
      municipis: zones.filter(z => z.tipus === "municipi" && z.ind[camp] != null).length,
      barris: zones.filter(z => z.tipus === "barri" && z.ind[camp] != null).length,
    })),
    nota_estrangera: "«Población extranjera» es 100 menos el porcentaje de "
      + "población con nacionalidad española que publica el INE. Es "
      + "nacionalidad, no lugar de nacimiento: quien se ha nacionalizado "
      + "cuenta como español.",
    nota_barris: "Gini, paro, estudios superiores, vivienda en alquiler, "
      + "coches por habitante e índice socioeconómico existen solo por "
      + "municipio. Al colorear por uno de ellos, los 73 barrios de Barcelona "
      + "se quedan en gris: el dato no se publica por debajo del municipio y "
      + "repartir el de la ciudad entre sus barrios sería inventárselo.",
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
const inicial = INICIAL.reduce((a, f) => a + mida(f), 0) / 1024;
console.log(`    ${"carga inicial".padEnd(20)} ${(inicial.toFixed(0) + " KB").padStart(8)}`
          + `   (presupuesto 600 KB)`);
if (inicial > 600) avisos.push(`la carga inicial son ${inicial.toFixed(0)} KB, por encima `
                             + "del presupuesto de 600 KB");
if (esborrats.length) console.log(`  borrados (escalas viejas): ${esborrats.join(", ")}`);
for (const a of avisos) console.warn(`  ⚠ ${a}`);
