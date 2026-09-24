/**
 * Genera `pages/data/mercados.json`: series mensuales de rentabilidad a largo
 * plazo del S&P 500 y de los activos con los que se le suele comparar.
 *
 * La página `pages/sp500-rendimientos.html` lo consume entero y calcula encima
 * (ventanas móviles, CAGR, inflación descontada). Aquí solo se descarga, se
 * alinea por mes y se documenta de dónde sale cada número.
 *
 * Principio rector, el mismo del resto del repo: ningún valor se inventa ni se
 * interpola. Un mes sin dato publicado queda a `null` y la página lo dice. Las
 * dos únicas series *calculadas* (rentabilidad total del S&P 500 y del bono a
 * 10 años) se construyen con fórmulas explícitas que están documentadas en
 * `mercados.SOURCES.md` y en los comentarios de abajo.
 *
 * Las descargas crudas se cachean en `_work/` (ignorado por git) para que
 * reejecutar no vuelva a pegarle a las APIs: `node build-mercados.mjs --fresh`
 * fuerza la redescarga.
 *
 * Uso:  node build-mercados.mjs [--fresh]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";

const WORK = new URL("_work/", import.meta.url);
const OUT = new URL("../pages/data/mercados.json", import.meta.url);
const FRESH = process.argv.includes("--fresh");
mkdirSync(WORK, { recursive: true });

const UA = "Mozilla/5.0 (simple-webs build-mercados.mjs)";

/* ---------------------------------------------------------------- descargas */

async function get(url, cacheName, { json = false } = {}) {
  const file = new URL(cacheName, WORK);
  if (!FRESH && existsSync(file)) {
    const txt = readFileSync(file, "utf8");
    return json ? JSON.parse(txt) : txt;
  }
  let last;
  for (let intento = 1; intento <= 4; intento++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(90_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const txt = await r.text();
      if (txt.length < 100) throw new Error(`respuesta sospechosamente corta (${txt.length} B)`);
      writeFileSync(file, txt);
      console.log(`  ↓ ${cacheName.padEnd(22)} ${(txt.length / 1024).toFixed(0)} KB`);
      return json ? JSON.parse(txt) : txt;
    } catch (e) {
      last = e;
      await new Promise((ok) => setTimeout(ok, 1500 * intento));
    }
  }
  throw new Error(`no se pudo descargar ${url}: ${last.message}`);
}

const fred = (id) => get(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, `fred-${id}.csv`);

const yahoo = (symbol, cache) =>
  get(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?period1=0&period2=${Math.floor(Date.now() / 1000)}&interval=1mo`,
    cache,
    { json: true },
  );

/* ------------------------------------------------------------ utilidades de mes */

const mesKey = (d) => d.slice(0, 7);
const mesNum = (k) => Number(k.slice(0, 4)) * 12 + Number(k.slice(5, 7)) - 1;
const numMes = (n) => `${String(Math.floor(n / 12)).padStart(4, "0")}-${String((n % 12) + 1).padStart(2, "0")}`;

/** CSV de FRED -> Map "YYYY-MM" -> número. Los huecos vienen como "." */
function fredMap(csv) {
  const m = new Map();
  const filas = csv.trim().split("\n").slice(1);
  for (const fila of filas) {
    const [fecha, valor] = fila.split(",");
    const v = Number(valor);
    if (!fecha || !valor || valor.trim() === "." || !Number.isFinite(v)) continue;
    m.set(mesKey(fecha), v); // series diarias: se queda el último día del mes
  }
  return m;
}

/** Chart de Yahoo -> Map "YYYY-MM" -> cierre (ajustado si lo hay). */
function yahooMap(chart, { ajustado = false } = {}) {
  const r = chart?.chart?.result?.[0];
  if (!r) throw new Error("respuesta de Yahoo sin resultado");
  const cierres = ajustado
    ? r.indicators?.adjclose?.[0]?.adjclose ?? r.indicators.quote[0].close
    : r.indicators.quote[0].close;
  const m = new Map();
  r.timestamp.forEach((t, i) => {
    const v = cierres[i];
    if (Number.isFinite(v)) m.set(new Date(t * 1000).toISOString().slice(0, 7), v);
  });
  return m;
}

/* ------------------------------------------------------------------ descarga */

console.log("Descargando fuentes…");
const [shillerCsv, cpiCsv, cpiEsCsv, gs10Csv, tb3Csv, casaCsv, eurusdCsv, oroCsv, sptr, n225, ibex, eafe, btc] =
  await Promise.all([
    // Serie de Robert Shiller (Yale), mantenida en CSV por el proyecto
    // `datasets/s-and-p-500`: precio medio mensual del S&P 500 desde 1871-01,
    // dividendo anualizado, IPC de EE. UU. y tipo del bono largo.
    get("https://raw.githubusercontent.com/datasets/s-and-p-500/main/data/data.csv", "shiller.csv"),
    fred("CPIAUCNS"), // IPC EE. UU., todos los artículos, sin desestacionalizar (el mismo que usa Shiller)
    fred("CP0000ESM086NEST"), // IPC armonizado de España (Eurostat), mensual desde 1996
    fred("GS10"), // bono del Tesoro a 10 años, tipo medio mensual
    fred("TB3MS"), // letra del Tesoro a 3 meses, mercado secundario, media mensual
    fred("CSUSHPINSA"), // Case-Shiller nacional de vivienda, sin desestacionalizar
    fred("DEXUSEU"), // dólares por euro, diario
    get("https://raw.githubusercontent.com/datasets/gold-prices/main/data/monthly.csv", "oro.csv"),
    yahoo("^SP500TR", "yahoo-sp500tr.json"), // S&P 500 Total Return oficial, mensual desde 1988
    yahoo("^N225", "yahoo-n225.json"), // Nikkei 225 (precio, sin dividendos)
    yahoo("^IBEX", "yahoo-ibex.json"), // IBEX 35 (precio, sin dividendos)
    yahoo("EFA", "yahoo-efa.json"), // iShares MSCI EAFE: desarrollados sin EE. UU., con dividendos
    yahoo("BTC-USD", "yahoo-btc.json"),
  ]);

/* --------------------------------------------------- Shiller: precio, dividendo */

/**
 * Columnas: Date, SP500, Dividend, Earnings, CPI, Long Interest Rate, …
 * El CSV publica 0.0 donde no hay dato (las columnas derivadas van más
 * retrasadas que el precio), así que 0 se trata como hueco.
 */
const precio = new Map(); // "YYYY-MM" -> precio medio mensual del S&P 500
const dividendo = new Map(); // dividendo ANUALIZADO por unidad de índice
const cpiShiller = new Map();
const tipoShiller = new Map();
for (const fila of shillerCsv.trim().split("\n").slice(1)) {
  const c = fila.split(",");
  const k = mesKey(c[0]);
  const num = (s) => (Number(s) > 0 ? Number(s) : null);
  if (num(c[1])) precio.set(k, num(c[1]));
  if (num(c[2])) dividendo.set(k, num(c[2]));
  if (num(c[4])) cpiShiller.set(k, num(c[4]));
  if (num(c[5])) tipoShiller.set(k, num(c[5]));
}

const cpiFred = fredMap(cpiCsv);
const gs10 = fredMap(gs10Csv);

/**
 * Control de calidad: el IPC y el tipo del bono del CSV de Shiller tienen que
 * coincidir con las series de FRED en el solapamiento, porque son literalmente
 * las mismas (CPI-U sin desestacionalizar y GS10). Si no coincidieran, el
 * empalme no valdría.
 *
 * Se descartan los tres últimos meses de la copia de Shiller: ahí sus valores
 * son provisionales (los extrapola antes de que se publique el dato) y se
 * separan hasta 1,7 puntos del definitivo. Fuera de eso se tolera algún mes
 * suelto con una errata en la copia; donde haya dato de FRED, manda FRED.
 */
function comprueba(nombre, a, b, tol, maxOutliers) {
  const corte = mesNum([...a.keys()].sort().at(-1)) - 2; // provisionales al final
  let n = 0, peor = 0, mesPeor = null;
  const fuera = [];
  for (const [k, v] of a) {
    if (!b.has(k) || mesNum(k) >= corte) continue;
    n++;
    const d = Math.abs(v - b.get(k));
    if (d > tol) fuera.push(`${k} (${v} vs ${b.get(k)})`);
    if (d > peor) { peor = d; mesPeor = k; }
  }
  const ok = fuera.length <= maxOutliers;
  console.log(
    `  ${ok ? "✓" : "✗"} ${nombre}: ${n} meses solapados, desviación máx ${peor.toFixed(4)} (${mesPeor})` +
      (fuera.length ? `, ${fuera.length} sobre tolerancia: ${fuera.join(", ")}` : ""),
  );
  if (!ok) throw new Error(`${nombre}: las dos fuentes no coinciden, revisa el empalme`);
}
console.log("Validando empalmes…");
comprueba("IPC EE. UU. (Shiller vs FRED CPIAUCNS)", cpiShiller, cpiFred, 0.05, 1);
comprueba("Bono 10a (Shiller vs FRED GS10)", tipoShiller, gs10, 0.05, 1);

// IPC: Shiller para 1871-1912 (enlaza el índice de Warren-Pearson con el CPI-U)
// y CPIAUCNS a partir de 1913, que es el dato oficial y está al día.
const cpi = new Map([...cpiShiller, ...cpiFred]);
// Tipo del bono largo: Shiller para 1871-1953 (tipos de bonos del Estado a
// largo plazo recopilados por él) y GS10 oficial desde 1953-04.
const tipoLargo = new Map([...tipoShiller, ...gs10]);

/* ------------------------------------------- rentabilidad total del S&P 500 */

const M0 = "1871-01";
const ultimoMes = [...precio.keys()].sort().at(-1);
const N = mesNum(ultimoMes) - mesNum(M0) + 1;
const meses = Array.from({ length: N }, (_, i) => numMes(mesNum(M0) + i));

/**
 * Índice de rentabilidad total: cada mes se cobra 1/12 del dividendo anualizado
 * y se reinvierte al precio de cierre del mes. Es el método estándar sobre los
 * datos de Shiller (el mismo que usa su propia hoja para la "real total return
 * price"). Vale hasta donde llega la columna de dividendos; a partir de ahí se
 * encadena la variación mensual del índice oficial S&P 500 Total Return.
 */
const ultimoDiv = [...dividendo.keys()].sort().at(-1);
const sp500tr = yahooMap(sptr);

const trIdx = new Map();
let acumulado = 100;
trIdx.set(M0, acumulado);
let mesEmpalme = null;
for (let i = 1; i < N; i++) {
  const k = meses[i], p = meses[i - 1];
  const p0 = precio.get(p), p1 = precio.get(k);
  let r = null;
  if (mesNum(k) <= mesNum(ultimoDiv) && p0 && p1 && dividendo.has(p)) {
    r = (p1 + dividendo.get(p) / 12) / p0 - 1; // dividendo devengado del mes anterior
  } else if (sp500tr.has(k) && sp500tr.has(p)) {
    r = sp500tr.get(k) / sp500tr.get(p) - 1; // índice oficial, ya con dividendos
    if (!mesEmpalme) mesEmpalme = k;
  }
  if (r === null) break;
  acumulado *= 1 + r;
  trIdx.set(k, acumulado);
}
console.log(`  S&P 500 TR: Shiller hasta ${ultimoDiv}, índice oficial desde ${mesEmpalme}`);

// Control: sobre el tramo en que conviven las dos fuentes (1988-2023), el
// método de Shiller y el índice oficial deberían dar casi lo mismo.
{
  const desde = "1988-01", hasta = ultimoDiv;
  const años = (mesNum(hasta) - mesNum(desde)) / 12;
  const mio = trIdx.get(hasta) / trIdx.get(desde);
  const oficial = sp500tr.get(hasta) / sp500tr.get(desde);
  const cagr = (x) => (Math.pow(x, 1 / años) - 1) * 100;
  console.log(
    `  ✓ contraste ${desde}→${hasta}: método Shiller ${cagr(mio).toFixed(2)} %/año ` +
      `vs índice oficial ${cagr(oficial).toFixed(2)} %/año ` +
      `(diferencia ${(cagr(mio) - cagr(oficial)).toFixed(2)} pp)`,
  );
}

/* --------------------------------------------- rentabilidad total de la renta fija */

/**
 * Bono del Estado a 10 años, cartera de vencimiento constante: cada mes se
 * compra a la par un bono nuevo con cupón igual a la TIR de mercado y un mes
 * después se vende, ya con 9 años y 11 meses de vida, descontado a la TIR
 * nueva. La rentabilidad del mes es cupón devengado + variación de precio.
 * Es el mismo criterio que usa Damodaran (NYU) para su serie de T.Bonds.
 */
function retornoBono(y0, y1) {
  const c = y0 / 100, y = y1 / 100, m = 1 / 12;
  let pv = 0;
  for (let i = 1; i <= 10; i++) pv += c / Math.pow(1 + y, i - m);
  pv += 1 / Math.pow(1 + y, 10 - m);
  return pv - 1;
}

const bonoIdx = new Map();
{
  let acc = 100, previo = null;
  for (const k of meses) {
    const y = tipoLargo.get(k);
    if (!Number.isFinite(y)) { previo = null; continue; }
    if (previo === null) { bonoIdx.set(k, acc); previo = y; continue; }
    acc *= 1 + retornoBono(previo, y);
    bonoIdx.set(k, acc);
    previo = y;
  }
}

// Letras a 3 meses: el tipo publicado es anual, se devenga mes a mes.
const letrasIdx = new Map();
{
  const tb3 = fredMap(tb3Csv);
  let acc = 100;
  for (const k of meses) {
    if (!tb3.has(k)) continue;
    if (letrasIdx.size) acc *= 1 + tb3.get(k) / 100 / 12;
    letrasIdx.set(k, acc);
  }
}

/* --------------------------------------------------------- resto de activos */

// Oro: precio oficial/LBMA en dólares por onza troy. Hasta 1968 no es un
// mercado libre sino el precio fijado por el patrón oro (20,67 $ y 35 $ tras
// 1934), y así hay que leerlo.
const oro = new Map();
for (const fila of oroCsv.trim().split("\n").slice(1)) {
  const [fecha, precioOnza] = fila.split(",");
  const v = Number(precioOnza);
  if (fecha && Number.isFinite(v) && v > 0) oro.set(fecha.slice(0, 7), v);
}

const vivienda = fredMap(casaCsv); // Case-Shiller nacional, base 2000=100
const cpiEs = fredMap(cpiEsCsv); // IPC armonizado de España, para el poder adquisitivo en euros
const eurusd = fredMap(eurusdCsv); // dólares por euro, último día hábil del mes

/* ------------------------------------------------- serialización alineada */

/** Map -> array alineado con `meses`, redondeado y con null donde no hay dato. */
function alinea(map, { base = null, decimales = 6 } = {}) {
  const ref = base ? map.get(base) : null;
  return meses.map((k) => {
    const v = map.get(k);
    if (!Number.isFinite(v)) return null;
    const x = ref ? (v / ref) * 100 : v;
    return Number(x.toPrecision(decimales));
  });
}

/** Reescala un Map a base 100 en su primer mes con dato. */
function base100(map) {
  const primero = meses.find((k) => Number.isFinite(map.get(k)));
  return alinea(map, { base: primero });
}

const series = {
  sp500_tr: {
    nombre: "S&P 500 (con dividendos)",
    corto: "S&P 500",
    clase: "bolsa",
    moneda: "USD",
    dividendos: true,
    v: alinea(trIdx),
  },
  sp500_px: {
    nombre: "S&P 500 (solo precio, sin dividendos)",
    corto: "S&P 500 sin dividendos",
    clase: "bolsa",
    moneda: "USD",
    dividendos: false,
    v: base100(precio),
  },
  bonos10: {
    nombre: "Bono del Tesoro de EE. UU. a 10 años",
    corto: "Bonos 10a EE. UU.",
    clase: "renta_fija",
    moneda: "USD",
    dividendos: true,
    v: alinea(bonoIdx),
  },
  letras3m: {
    nombre: "Letras del Tesoro de EE. UU. a 3 meses",
    corto: "Letras 3m (efectivo)",
    clase: "monetario",
    moneda: "USD",
    dividendos: true,
    v: alinea(letrasIdx),
  },
  oro: {
    nombre: "Oro (dólares por onza troy)",
    corto: "Oro",
    clase: "materia_prima",
    moneda: "USD",
    dividendos: false,
    v: base100(oro),
  },
  vivienda_us: {
    nombre: "Vivienda en EE. UU. (Case-Shiller nacional)",
    corto: "Vivienda EE. UU.",
    clase: "inmobiliario",
    moneda: "USD",
    dividendos: false,
    v: base100(vivienda),
  },
  mundo_exus: {
    nombre: "Desarrollados sin EE. UU. (MSCI EAFE, con dividendos)",
    corto: "Mundo sin EE. UU.",
    clase: "bolsa",
    moneda: "USD",
    dividendos: true,
    v: base100(yahooMap(eafe, { ajustado: true })),
  },
  nikkei: {
    nombre: "Nikkei 225 (solo precio, sin dividendos)",
    corto: "Nikkei 225",
    clase: "bolsa",
    moneda: "JPY",
    dividendos: false,
    v: base100(yahooMap(n225)),
  },
  ibex: {
    nombre: "IBEX 35 (solo precio, sin dividendos)",
    corto: "IBEX 35",
    clase: "bolsa",
    moneda: "EUR",
    dividendos: false,
    v: base100(yahooMap(ibex)),
  },
  bitcoin: {
    nombre: "Bitcoin",
    corto: "Bitcoin",
    clase: "cripto",
    moneda: "USD",
    dividendos: false,
    v: base100(yahooMap(btc)),
  },
};

// Añade a cada serie el primer y último mes con dato, que la página usa para
// no ofrecer comparaciones fuera del rango publicado.
for (const s of Object.values(series)) {
  const i0 = s.v.findIndex((x) => x !== null);
  let i1 = s.v.length - 1;
  while (i1 > 0 && s.v[i1] === null) i1--;
  s.desde = meses[i0];
  s.hasta = meses[i1];
}

const salida = {
  meta: {
    generado: new Date().toISOString().slice(0, 10),
    script: "data-src/build-mercados.mjs",
    documentacion: "data-src/mercados.SOURCES.md",
    mes_inicial: M0,
    mes_final: ultimoMes,
    n_meses: N,
    empalme_sp500: { shiller_hasta: ultimoDiv, indice_oficial_desde: mesEmpalme },
    nota:
      "Índices en base 100 en su primer mes con dato. `ipc` es el IPC de EE. UU. " +
      "(CPI-U, sin desestacionalizar) y sirve para pasar cualquier serie en dólares " +
      "a términos reales. Las series marcadas dividendos:false son solo precio.",
  },
  meses,
  ipc: alinea(cpi),
  ipc_es: alinea(cpiEs),
  eurusd: alinea(eurusd),
  series,
};

writeFileSync(OUT, JSON.stringify(salida));
const kb = (statSync(OUT).size / 1024).toFixed(0);
console.log(`\n✓ pages/data/mercados.json  ${kb} KB  ${N} meses (${M0} → ${ultimoMes})`);
for (const [id, s] of Object.entries(series)) {
  const años = (mesNum(s.hasta) - mesNum(s.desde)) / 12;
  const cagr = (Math.pow(s.v[meses.indexOf(s.hasta)] / s.v[meses.indexOf(s.desde)], 1 / años) - 1) * 100;
  console.log(`   ${id.padEnd(12)} ${s.desde} → ${s.hasta}  ${cagr.toFixed(2)} %/año nominal`);
}
