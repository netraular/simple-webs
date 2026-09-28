/**
 * Prueba las capas de donde-vivir-barcelona.html contra los datos reales, sin
 * navegador.
 *
 * Extrae del HTML los bloques que no tocan el DOM —las utilidades de formato,
 * la tabla `CAPES` y la regresión— y los ejecuta contra `zonas.json`. Lo que se
 * busca es que ninguna de las capas que ofrece el desplegable reviente, dé NaN,
 * o prometa un mapa que saldría entero gris, y que la recta de tendencia del
 * gráfico tenga el signo que dice la página.
 *
 * Sustituye a test-logica.mjs y test-vistas.mjs, que hacían lo mismo con
 * pisos-vs-distancia.html antes de que esa página se fusionara en esta.
 *
 *   node test-capas.mjs
 */
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../pages/donde-vivir-barcelona.html", import.meta.url), "utf8");
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

const SEC = (n) => `/* ===========================================================================\n   ${n}`;

const puro = between("const R_EARTH", SEC("2. ESTADO"))       // utilidades y formato
           + between("const pct1 =", SEC("3. CARGA"))         // HIP, cuota, CAPES, capa()
           + between("/** Mínimos cuadrados", SEC("6. RENDER")); // ols, niceTicks

const {
  CAPES, CAPA_DE, ols, niceTicks, cuota, HIP, fmtMin,
  cobertura, avisCobertura, percentil, valorsOrdenats, extrem,
  passaRang, passaCats, xarxesDe, frase,
} = new Function(`
  const getComputedStyle = () => ({ getPropertyValue: () => "#000" });
  const document = { documentElement: {} };
  const S = { capa: "compra_m2", filtres: [], cats: { tipus: [], comarca: [], districte: [], xarxa: [] } };
  let ROWS = [], DATA = null, RANGS = new Map(), TREND = null;
  ${puro}
  return { CAPES, CAPA_DE, ols, niceTicks, cuota, HIP, fmtMin,
           cobertura, avisCobertura, percentil, valorsOrdenats, extrem,
           passaRang, passaCats, xarxesDe, frase };
`)();

const Z = JSON.parse(readFileSync(new URL("../pages/data/zonas.json", import.meta.url), "utf8"));
const zones = Z.zones;

/* -------------------------------------------------------------------------- */

let pasan = 0, fallan = 0;
const ok = (cond, texto, detalle = "") => {
  console.log(`  ${cond ? "✓" : "✗"} ${texto}${detalle ? "  " + detalle : ""}`);
  cond ? pasan++ : fallan++;
};
const n1 = (v) => v.toFixed(1);

console.log("\n══ las capas del desplegable ═══════════════════");
console.log(`  ${CAPES.length} capas · ${zones.length} zonas\n`);

/* Cada zona necesita `valor` (el tiempo de viaje) para la capa «temps» y para
   el eje horizontal del gráfico. Aquí se simula el caso más común: un solo
   destino marcado, Plaça de Catalunya. */
const DEST = "pl-catalunya";
const filas = zones.map(m => ({ ...m, valor: m.destins?.[DEST]?.min ?? null }));

console.log("     capa                      con dato   mín          máx");
let sinDato = [], conNaN = [], fmtMal = [];
for (const c of CAPES) {
  const vs = filas.map(m => c.get(m)).filter(v => v !== null && v !== undefined);
  const nums = vs.filter(v => typeof v === "number" && Number.isFinite(v));
  if (nums.length !== vs.length) conNaN.push(c.id);
  if (!nums.length) { sinDato.push(c.id); continue; }
  const lo = Math.min(...nums), hi = Math.max(...nums);
  // El formateador tiene que sobrevivir a los dos extremos y devolver texto.
  for (const v of [lo, hi]) {
    const t = c.fmt(v);
    if (typeof t !== "string" || !t.length || /NaN|Infinity|undefined/.test(t)) {
      fmtMal.push(`${c.id}→${t}`);
    }
  }
  console.log("     " + c.id.padEnd(24)
    + String(nums.length).padStart(7) + "/" + zones.length
    + "   " + String(c.fmt(lo)).padStart(13)
    + "  " + String(c.fmt(hi)).padStart(13)
    + (c.viu ? "" : "   " + (avisCobertura(c, zones) || "todas")));
}
console.log("");

ok(sinDato.length === 0, "todas las capas tienen dato en alguna zona",
   sinDato.length ? `(vacías: ${sinDato.join(", ")})` : "");
ok(conNaN.length === 0, "ninguna capa produce NaN ni Infinity",
   conNaN.length ? `(${conNaN.join(", ")})` : "");
ok(fmtMal.length === 0, "todos los formateadores devuelven texto legible en los extremos",
   fmtMal.length ? `(${fmtMal.join(", ")})` : "");

/* La cobertura ya no se declara a mano en cada capa: se cuenta de los datos.
   Lo que hay que comprobar, entonces, no es que la bandera coincida, sino que
   la cuenta que hace la página coincida con la que declara el fichero en
   `meta.indicadors.camps`. Es lo mismo que se vigilaba antes —que la leyenda
   no prometa un mapa que no va a salir— pero sin banderas que mantener. */
const nMuni = zones.filter(m => m.tipus !== "barri").length;
const nBarri = zones.filter(m => m.tipus === "barri").length;
const declarat = new Map((Z.meta?.indicadors?.camps || []).map(c => [c.camp, c]));
let cobMal = [], cobComprovades = 0;
for (const c of CAPES) {
  if (c.viu) continue;                       // el tiempo no es un indicador
  const k = cobertura(c, zones);
  const real = { muni: zones.filter(m => m.tipus !== "barri" && c.get(m) != null).length,
                 barri: zones.filter(m => m.tipus === "barri" && c.get(m) != null).length };
  // 1. la cuenta cacheada de la página es la cuenta de verdad
  if (k.muni !== real.muni || k.barri !== real.barri) {
    cobMal.push(`${c.id} cuenta ${k.muni}/${k.barri} y de verdad son ${real.muni}/${real.barri}`);
  }
  if (k.nMuni !== nMuni || k.nBarri !== nBarri) {
    cobMal.push(`${c.id} cree que hay ${k.nMuni}+${k.nBarri} zonas`);
  }
  // 2. y coincide con lo que declara el fichero, para las capas que son un
  //    campo de `ind` tal cual (las derivadas —hipoteca, esfuerzo— no lo son)
  const d = declarat.get(c.id);
  if (d) {
    cobComprovades++;
    if (d.municipis !== real.muni || d.barris !== real.barri) {
      cobMal.push(`${c.id}: el fichero declara ${d.municipis}/${d.barris} y la capa lee ${real.muni}/${real.barri}`);
    }
  }
}
ok(cobMal.length === 0,
   `la cobertura calculada cuadra con los datos y con meta.indicadors.camps`,
   cobMal.length ? `(${cobMal.join("; ")})` : `(${cobComprovades} capas contrastadas con el fichero)`);

/* El aviso que la página escribe al lado del nombre de la capa tiene que
   decir la verdad: si dice «solo municipios» no puede haber ni un barrio con
   dato, y si no dice nada es que llegan a las 164. */
let avisMal = [];
for (const c of CAPES) {
  if (c.viu) continue;
  const k = cobertura(c, zones), a = avisCobertura(c, zones);
  if (!a && k.total !== k.n) avisMal.push(`${c.id} no avisa y le faltan ${k.n - k.total}`);
  if (a && k.total === k.n) avisMal.push(`${c.id} avisa «${a}» y las cubre todas`);
  if (/solo municipios/.test(a) && k.barri > 0) avisMal.push(`${c.id} dice municipios y tiene ${k.barri} barrios`);
  if (/solo barrios/.test(a) && k.muni > 0) avisMal.push(`${c.id} dice barrios y tiene ${k.muni} municipios`);
}
ok(avisMal.length === 0, "el aviso de cobertura de cada capa dice la verdad",
   avisMal.length ? `(${avisMal.join("; ")})` : "");

/* Las tasas del Ministerio se calculan en build-transport.mjs a partir de
   recuentos y del padrón. Un error de denominador daría cifras absurdas sin
   romper nada, así que se acotan contra el rango que tiene sentido.

   El techo de `delictes_1000` era 250 mientras el dato solo llegaba a nivel de
   municipio. Con el reparto por distrito dentro de Barcelona, Ciutat Vella sale
   a 330 y es cierto: son 38.246 hechos sobre 115.000 vecinos, y dos tercios del
   total de la ciudad son hurtos concentrados en el casco viejo y la playa. Se
   sube a 400, que sigue dejando fuera cualquier error de denominador —el
   siguiente distrito está en 150— pero no llama falso a un dato que no lo es. */
const TASES = { delictes_1000: [5, 400], robatoris_violencia_1000: [0, 40],
                robatoris_domicili_1000: [0, 20], zona_verda_m2_hab: [0.5, 400] };
let tasaMal = [];
for (const [camp, [lo, hi]] of Object.entries(TASES)) {
  const vs = zones.map(m => m.ind?.[camp]).filter(v => v != null);
  if (!vs.length) { tasaMal.push(`${camp} sin ningún valor`); continue; }
  const fuera = vs.filter(v => v < lo || v > hi);
  if (fuera.length) tasaMal.push(`${camp}: ${fuera.length} fuera de ${lo}–${hi}`);
}
ok(tasaMal.length === 0, "las tasas de seguridad y entorno caen en rangos plausibles",
   tasaMal.length ? `(${tasaMal.join("; ")})` : "");

/* Los robos de las dos clases son un subconjunto del total: si alguno lo
   superara, el cruce por código INE estaría mezclando municipios. */
const subMal = zones.filter(m => m.ind?.delictes_1000 != null
  && (m.ind.robatoris_violencia_1000 > m.ind.delictes_1000
   || m.ind.robatoris_domicili_1000  > m.ind.delictes_1000)).map(m => m.nom);
ok(subMal.length === 0, "ningún tipo de robo supera el total de delitos de su zona",
   subMal.length ? `(${subMal.join(", ")})` : "");

/* Los identificadores son la clave del desplegable, del estado y de la columna
   de la tabla: repetir uno rompería las tres cosas a la vez. */
const ids = CAPES.map(c => c.id);
ok(new Set(ids).size === ids.length, "los identificadores de capa son únicos");
ok(CAPES.every(c => c.nom && c.eix && c.nota && typeof c.get === "function"
                 && typeof c.fmt === "function"),
   "cada capa lleva nombre, unidad, nota y sus dos funciones");
ok(CAPA_DE.get("compra_m2") !== undefined,
   "la capa por defecto del estado inicial existe");

/* -------- percentiles -------- */
/* De ellos salen las barras de la ficha, las de la comparación y la frase. Si
   se salen de 0-100, o si la zona más barata no sale abajo del todo, las tres
   cosas mienten a la vez. */
console.log("\n══ los percentiles ═════════════════════════════");
let pctMal = [], pctN = 0;
for (const c of CAPES) {
  if (c.viu) continue;
  const vs = valorsOrdenats(c, zones);
  if (vs.length < 4) continue;
  pctN++;
  for (const m of zones) {
    const v = c.get(m);
    if (v == null) continue;
    const p = percentil(c, v, zones);
    if (p == null || !Number.isFinite(p) || p < 0 || p > 100) {
      pctMal.push(`${c.id} da ${p} para ${m.nom}`);
      break;
    }
  }
  // El extremo de abajo tiene que salir abajo y el de arriba, arriba.
  const pLo = percentil(c, vs[0], zones), pHi = percentil(c, vs[vs.length - 1], zones);
  if (!(pLo < 50)) pctMal.push(`${c.id}: el mínimo sale en el percentil ${pLo}`);
  if (!(pHi > 50)) pctMal.push(`${c.id}: el máximo sale en el percentil ${pHi}`);
}
ok(pctMal.length === 0, `los percentiles de las ${pctN} capas caen entre 0 y 100 y respetan el orden`,
   pctMal.length ? `(${pctMal.slice(0, 4).join("; ")})` : "");

/* Un superlativo empatado no es un superlativo: `extrem` solo puede decir
   «max» si nadie más iguala ese valor, porque la frase lo afirma en serio. */
const cDen = CAPA_DE.get("densitat_hab_km2");
const den = valorsOrdenats(cDen, zones);
ok(extrem(cDen, den[den.length - 1], zones) === "max"
   && extrem(cDen, den[0], zones) === "min"
   && extrem(cDen, den[Math.floor(den.length / 2)], zones) === null,
   "el extremo solo se afirma en el máximo y el mínimo de verdad");

/* -------- el motor de filtros -------- */
console.log("\n══ el motor de filtros ═════════════════════════");
const cCompra = CAPA_DE.get("compra_m2");
const preus = valorsOrdenats(cCompra, zones);
const medPreu = preus[Math.floor(preus.length / 2)];
const fBarat = { capa: "compra_m2", lo: preus[0], hi: medPreu, sense: false };
const dins = zones.filter(m => passaRang(m, fBarat));
const sensePreu = zones.filter(m => m.compra_eur_m2 == null);
ok(dins.every(m => m.compra_eur_m2 != null && m.compra_eur_m2 <= medPreu),
   `un filtro de rango deja pasar solo lo que cae dentro`, `(${dins.length} zonas)`);
ok(dins.length > 0 && dins.length < zones.length, "y filtra algo, pero no todo");
ok(sensePreu.every(m => !passaRang(m, fBarat)),
   `las ${sensePreu.length} zonas sin dato quedan fuera por defecto`);
ok(sensePreu.every(m => passaRang(m, { ...fBarat, sense: true })),
   "…y entran si se pide expresamente incluirlas");
ok(zones.every(m => passaRang(m, { capa: "compra_m2", lo: preus[0], hi: preus.at(-1), sense: true })),
   "un filtro con el rango entero y las zonas sin dato no descarta a nadie");

const nBarris = zones.filter(m => m.tipus === "barri").length;
ok(zones.filter(m => passaCats(m, { tipus: ["barri"] })).length === nBarris,
   `el filtro de tipo deja los ${nBarris} barrios`);
ok(zones.every(m => passaCats(m, {})) && zones.every(m => passaCats(m, null)),
   "sin categorías marcadas no se descarta nada");
const ambMetro = zones.filter(m => passaCats(m, { xarxa: ["Metro"] }));
ok(ambMetro.length > 0 && ambMetro.every(m => xarxesDe(m).includes("Metro")),
   `el filtro de red deja solo las ${ambMetro.length} zonas con metro`);
const senseTren = zones.filter(m => passaCats(m, { xarxa: ["cap"] }));
ok(senseTren.length > 0 && senseTren.every(m => xarxesDe(m).length === 0),
   `y «sin tren ni metro» deja las ${senseTren.length} que no tienen ninguna`);
// Y entre categorías se exigen todas: barrio Y del Eixample.
const eix = zones.filter(m => passaCats(m, { tipus: ["barri"], districte: ["Eixample"] }));
ok(eix.length > 0 && eix.every(m => m.tipus === "barri" && m.districte === "Eixample"),
   `dos categorías a la vez se exigen las dos`, `(${eix.length} barrios del Eixample)`);

/* -------- la frase de cada zona -------- */
/* Se genera desde los datos, así que cualquier hueco sale como `undefined` o
   como «NaN €» en mitad de una frase que alguien va a leer. Se comprueban las
   164, no una muestra. */
console.log("\n══ la frase de cada zona ═══════════════════════");
let fraseMal = [], llarg = 0, ambRasgo = 0;
for (const m of zones) {
  const f = frase(m, zones);
  if (typeof f !== "string" || f.length < 20) { fraseMal.push(`${m.nom}: «${f}»`); continue; }
  if (/undefined|NaN|Infinity|null/.test(f)) fraseMal.push(`${m.nom}: ${f}`);
  if (!/\.$/.test(f)) fraseMal.push(`${m.nom}: no acaba en punto`);
  if (/\s{2,}/.test(f)) fraseMal.push(`${m.nom}: espacios dobles`);
  llarg = Math.max(llarg, f.length);
  if (/Destaca por/.test(f)) ambRasgo++;
}
ok(fraseMal.length === 0, `las ${zones.length} zonas producen una frase legible`,
   fraseMal.length ? `(${fraseMal.slice(0, 3).join(" · ")})` : `(la más larga, ${llarg} caracteres)`);
ok(ambRasgo >= zones.length * 0.5,
   "más de la mitad de las zonas tienen un rasgo que destacar",
   `(${ambRasgo}/${zones.length})`);
// Una zona a la que le falta todo tiene que seguir dando una frase, no un hueco.
const pelada = { id: "X", tipus: "municipi", nom: "Nada", nom_llarg: "Nada",
                 comarca: "Maresme", destins: {}, ind: {} };
const fp = frase(pelada, zones);
ok(typeof fp === "string" && fp.length > 10 && !/undefined|NaN/.test(fp),
   "una zona sin ningún dato sigue dando una frase", `«${fp}»`);
console.log(`\n     ejemplo · ${zones.find(m => m.id === "B01")?.nom_llarg}`);
console.log(`     ${frase(zones.find(m => m.id === "B01"), zones)}`);
const sample = zones.find(m => m.tipus !== "barri" && m.ind?.zones_a_bcn > 2);
if (sample) {
  console.log(`\n     ejemplo · ${sample.nom_llarg}`);
  console.log(`     ${frase(sample, zones)}`);
}

/* -------- la hipoteca -------- */
console.log("\n══ la cuota de hipoteca ════════════════════════");
const PRECIO = 300000;
const c300 = cuota(PRECIO);
// Comprobación independiente de la fórmula francesa, escrita aparte a
// propósito: si las dos coinciden, el error tendría que estar en las dos.
const cap = PRECIO * (1 - HIP.entrada), i = HIP.tin / 12, n = HIP.anys * 12;
const esperada = cap * i / (1 - Math.pow(1 + i, -n));
ok(Math.abs(c300 - esperada) < 0.01,
   `un piso de ${PRECIO} € sale a ${n1(c300)} €/mes`,
   `(${HIP.entrada * 100} % de entrada, ${HIP.anys} años, ${HIP.tin * 100} % TIN)`);
ok(c300 > 0 && c300 < PRECIO / 12, "la cuota es positiva y menor que el precio anualizado");
ok(cuota(2 * PRECIO) > cuota(PRECIO), "a más precio, más cuota");

/* -------- la recta del gráfico -------- */
console.log("\n══ la recta de precio contra tiempo ════════════");
const pts = filas
  .filter(m => m.valor != null && m.compra_eur_m2 != null)
  .map(m => [m.valor, m.compra_eur_m2]);
const t = ols(pts);
ok(t != null, `hay recta con los ${pts.length} pares de ${DEST}`);
if (t) {
  console.log(`     precio = ${n1(t.a)} − ${n1(-t.b)} €/m² por minuto · R² = ${n1(t.r2 * 100)} %`);
  // El signo es la afirmación de la página: cuanto más lejos, más barato. Si
  // algún día sale al revés, la frase del gráfico estaría mintiendo.
  ok(t.b < 0, "cuanto más lejos, más barato: la pendiente es negativa",
     `(${n1(t.b)} €/m² por minuto)`);
  ok(t.r2 >= 0 && t.r2 <= 1, `el R² cae entre 0 y 1`, `(${n1(t.r2 * 100)} %)`);
  ok(Number.isFinite(t.a) && Number.isFinite(t.b), "la recta no tiene coeficientes rotos");
}
ok(ols([[1, 1], [2, 2]]) === null, "con menos de tres puntos no se dibuja recta");
ok(ols([[1, 5], [1, 7], [1, 9]]) === null, "con todas las x iguales tampoco");

/* -------- las marcas de los ejes -------- */
console.log("\n══ las marcas de los ejes ══════════════════════");
let ticksMal = [];
for (const [lo, hi] of [[0, 1], [0, 143], [1200, 8300], [0.0, 0.7], [-5, 5], [10, 10]]) {
  const ts = niceTicks(lo, hi, 5);
  if (!ts.length) { ticksMal.push(`${lo}..${hi} sin marcas`); continue; }
  if (ts.some(v => !Number.isFinite(v))) ticksMal.push(`${lo}..${hi} con marcas rotas`);
  if (ts.some(v => v < lo - 1e-9 || v > hi + 1e-9)) ticksMal.push(`${lo}..${hi} se sale`);
}
ok(ticksMal.length === 0, "las marcas caen dentro del rango y son finitas",
   ticksMal.length ? `(${ticksMal.join("; ")})` : "");

/* -------- el formato de minutos -------- */
ok(fmtMin(45) === "45 min" && fmtMin(85) === "1 h 25" && fmtMin(null) === "—",
   "los minutos se leen como «45 min», «1 h 25» y «—»");

console.log(`\n${pasan}/${pasan + fallan} comprobaciones pasan`);
if (fallan) process.exit(1);
