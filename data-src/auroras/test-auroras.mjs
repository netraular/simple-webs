/**
 * Comprobaciones sobre `pages/data/auroras.json` y sobre el cálculo de
 * `pages/auroras.html`.
 *
 *   1. Datos: estructura, y contraste con cifras publicadas (fechas de los
 *      máximos solares de SILSO, tormentas históricas, Dst de marzo de 1989) y
 *      con la columna Ap del propio GFZ, que la página recalcula desde el Kp.
 *   2. Página: se ejecuta su <script> en Node, sin DOM, y se piden los cálculos
 *      para varias ciudades. Lo que se comprueba es física, no "lo que salía
 *      hoy": más al norte hay más noches, en junio no hay noche en Tromsø, la
 *      medianoche magnética de Escandinavia cae hacia las 21–22 UT…
 *
 * Uso:  node test-auroras.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const D = JSON.parse(readFileSync(new URL("../../pages/data/auroras.json", import.meta.url), "utf8"));
const HTML = readFileSync(new URL("../../pages/auroras.html", import.meta.url), "utf8");

let fallos = 0, hechas = 0;
const ok = (cond, texto, detalle = "") => {
  hechas++;
  if (!cond) fallos++;
  console.log(`  ${cond ? "✓" : "✗"} ${texto}${detalle ? `  ${detalle}` : ""}`);
};

const DIA = 86400e3;
const diaNum = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / DIA;
const i0 = diaNum(D.meta.kp.desde);
const kpDia = (iso) => {
  const i = diaNum(iso) - i0;
  return Math.max(...[...D.kp.slice(i * 8, i * 8 + 8)].map((c) => c.charCodeAt(0) - 48));
};

/* ------------------------------------------------------------- datos */
console.log("Datos");
const nDias = diaNum(D.meta.kp.hasta) - i0 + 1;
ok(D.kp.length === nDias * 8, "8 tramos de Kp por día, sin huecos", `${nDias} días`);
ok(/^[0-K]+$/.test(D.kp), "todos los Kp entre 0 y 9o (tercios 0…27)");
ok(D.meta.kp.desde === "1932-01-01", "el Kp empieza el 1 de enero de 1932");

// Tormentas conocidas (Kp definitivo del GFZ).
ok(kpDia("1989-03-13") === 27, "13-mar-1989 llega a Kp 9o");
ok(kpDia("2003-10-29") === 27 && kpDia("2003-10-30") === 27, "29 y 30-oct-2003 (Halloween) llegan a Kp 9o");
ok(kpDia("2024-05-11") === 27, "11-may-2024 (Gannon) llega a Kp 9o");
ok(kpDia("1859-09-02".replace("1859", "1932")) < 27, "un día cualquiera de 1932 no es una tormenta extrema");
ok(D.dst["1989-03-14"] === -589, "Dst mínimo de marzo de 1989: −589 nT (Kyoto)", `→ ${D.dst["1989-03-14"]}`);
ok(D.dst["2003-11-20"] === -422, "Dst del 20-nov-2003: −422 nT", `→ ${D.dst["2003-11-20"]}`);
ok(Object.values(D.dst).every((v) => v <= D.meta.dst.umbral), `solo viajan días con Dst ≤ ${D.meta.dst.umbral}`);

// Máximos de ciclo frente a la tabla oficial de SILSO.
const SILSO = { 19: "1958-03", 20: "1968-11", 21: "1979-12", 22: "1989-11", 23: "2001-11", 24: "2014-04", 25: "2024-10" };
for (const [n, mes] of Object.entries(SILSO)) {
  const c = D.ciclos.find((x) => x.n === +n);
  ok(c && c.max === mes, `máximo del ciclo ${n} en ${mes} (SILSO)`, c ? `→ ${c.max}, ${c.snMax}` : "→ falta");
}
ok(D.ciclos.at(-1).n === 25 && D.ciclos.at(-1).fin === null, "el ciclo 25 sigue abierto");
const meses = D.prediccion.map((p) => p.mes);
ok(meses.every((m, k) => k === 0 || diaNum(`${m}-01`) > diaNum(`${meses[k - 1]}-01`)), "la previsión de NOAA va en meses crecientes");
ok(D.prediccion.every((p) => p.bajo <= p.sn && p.sn <= p.alto), "la previsión cae dentro de su propio margen");
ok(D.ciclo26.fuente && D.ciclo26.fuente !== "PENDIENTE", "los supuestos del ciclo 26 llevan fuente");

// Ap recalculado desde el Kp frente a la columna Ap del GFZ.
const crudo = new URL("_work/kp-gfz.txt", import.meta.url);
if (existsSync(crudo)) {
  const AP = [0, 2, 3, 4, 5, 6, 7, 9, 12, 15, 18, 22, 27, 32, 39, 48, 56, 67, 80, 94, 111, 132, 154, 179, 207, 236, 300, 400];
  let peor = 0, k = 0;
  for (const l of readFileSync(crudo, "utf8").split("\n")) {
    if (!l.trim() || l.startsWith("#")) continue;
    const c = l.trim().split(/\s+/);
    let s = 0;
    for (let j = 0; j < 8; j++) s += AP[D.kp.charCodeAt(k * 8 + j) - 48];
    peor = Math.max(peor, Math.abs(Math.round(s / 8) - +c[23]));
    k++;
  }
  ok(peor <= 1, "el Ap que la página calcula desde el Kp coincide con el del GFZ (±1 por redondeo)", `→ peor ${peor}`);
} else console.log("  · sin _work/kp-gfz.txt: se salta el contraste del Ap");

/* ------------------------------------------------- lógica de la página */
console.log("Página");
const script = HTML.slice(HTML.lastIndexOf("<script>") + 8, HTML.lastIndexOf("</script>"));
const arranque = script.lastIndexOf("(async () => {");
ok(arranque > 0, "el script de la página tiene su arranque al final");
const ctx = vm.createContext({
  console, Intl, Math, Date, Uint8Array, Float32Array, Map, Set, JSON,
  fetch: async () => ({ json: async () => D }),
  document: {}, getComputedStyle: () => ({ getPropertyValue: () => "" }),
});
try {
  new vm.Script(script); // sintaxis de todo el script, arranque incluido
  vm.runInContext(script.slice(0, arranque), ctx);
  ok(true, "el JavaScript de la página compila");
} catch (e) {
  ok(false, "el JavaScript de la página compila", e.message);
  process.exit(1);
}
await vm.runInContext("carga()", ctx);
const lugar = (nombre) => vm.runInContext(`LUGARES.find((l) => l.nombre.startsWith(${JSON.stringify(nombre)}))`, ctx);
const calc = (nombre, modo = "vista") => {
  ctx.__l = lugar(nombre);
  return vm.runInContext(`S.lugar = __l; S.modo = ${JSON.stringify(modo)}; calcula()`, ctx);
};

const def = vm.runInContext("({ lugar: S.lugar.nombre, modo: S.modo })", ctx);
ok(def.lugar.startsWith("Abisko") && def.modo === "fuerte", "abre en Abisko con tormentas fuertes", `→ ${def.lugar}, ${def.modo}`);
ok(vm.runInContext("S.escenario === true", ctx), "el siguiente ciclo se muestra por defecto como escenario");
const horizonteSolar = vm.runInContext("horizonteSolar()", ctx);
ok(horizonteSolar.añoOrientativo === 2035 && horizonteSolar.rango === "2035–2036", "el horizonte del próximo máximo parte de 2024 más unos 11 años");
// La rejilla AACGM interpolada frente a los valores exactos de la calculadora de Dartmouth.
let peorAacgm = 0, peorCiudad = "";
for (const [n, c] of Object.entries(D.aacgm.ciudades)) {
  const e = Math.abs(vm.runInContext(`latAacgm(${c.lat}, ${c.lon})`, ctx) - c.mlat);
  if (e > peorAacgm) { peorAacgm = e; peorCiudad = n; }
}
ok(peorAacgm < 0.5, "la rejilla AACGM interpolada se separa < 0,5° del valor exacto", `→ peor ${peorAacgm.toFixed(2)}° (${peorCiudad})`);
const mlatBcn = vm.runInContext("latAacgm(41.39, 2.17)", ctx);
ok(Math.abs(mlatBcn - 34.9) < 0.5, "Barcelona está a ~35° de latitud AACGM", `→ ${mlatBcn.toFixed(1)}°`);

const bcn = calc("Barcelona"), bil = calc("Bilbao"), osl = calc("Oslo"), edi = calc("Edimburgo"), par = calc("París"), tro = calc("Tromsø");
ok(bcn.uVista.t === 26 && bcn.uVista.dst <= -250 && bcn.uVista.dst >= -350,
  "desde Barcelona hace falta Kp 9− y un Dst de unos −300 nT", `→ ${JSON.stringify(bcn.uVista)}`);
ok(bcn.uAlta.t === null, "desde Barcelona no llega a lo alto del cielo ni en las mayores tormentas medidas");
ok(tro.uVista.t === 0, "en Tromsø basta cualquier Kp");
ok(osl.uVista.t >= 9 && osl.uVista.t <= 12 && osl.uVista.dst === null, "en Oslo basta Kp 3–4", `→ tercios ${osl.uVista.t}`);
ok(edi.uVista.t >= 15 && edi.uVista.t <= 18, "en Edimburgo hace falta Kp 5–6", `→ tercios ${edi.uVista.t}`);
ok(par.uVista.t >= 24 && par.uVista.t <= 26, "en París hace falta Kp 8–9−", `→ tercios ${par.uVista.t}`);
ok(tro.total > osl.total && osl.total > edi.total && edi.total > par.total && par.total > bcn.total,
  "más al norte, más noches con aurora posible",
  `→ Tromsø ${tro.total}, Oslo ${osl.total}, Edimburgo ${edi.total}, París ${par.total}, Barcelona ${bcn.total}`);
const nocheDe = (r, iso) => r.opp[diaNum(iso) - i0] === 1;
ok(nocheDe(bcn, "2024-05-10") || nocheDe(bcn, "2024-05-11"), "Barcelona: la noche del 10-11 de mayo de 2024 cuenta");
ok(nocheDe(bcn, "1989-03-13"), "Barcelona: la noche del 13 de marzo de 1989 cuenta");
ok(!nocheDe(bcn, "2024-06-15"), "Barcelona: una noche tranquila no cuenta");
ok(nocheDe(bil, "2026-01-19") || nocheDe(bil, "2026-01-20"), "Bilbao: enero de 2026 (Dst −236) cuenta, como se vio en el norte de España");
ok(!nocheDe(bcn, "2026-01-19") && !nocheDe(bcn, "2026-01-20"), "Barcelona: enero de 2026 no llega (Dst −236 se queda corto)");
ok(bcn.desde === diaNum("1957-01-01") - i0 && bcn.años.filter((a) => a.sinDato).length === 25, "Barcelona: sin Dst antes de 1957, esos 25 años salen sin dato");
ok(tro.mes[5].noches === 0, "Tromsø: en junio no hay noche cerrada, ninguna noche cuenta", `→ ${tro.mes[5].noches}`);
ok(tro.mes[11].noches > 20, "Tromsø: en diciembre casi todas las noches cuentan", `→ ${tro.mes[11].noches.toFixed(1)}`);

// Patrones geomagnéticos: con un umbral fijo de Kp 6, que la oscuridad no domine.
ctx.__l = lugar("Oslo");
const o6 = vm.runInContext("S.lugar = __l; S.modo = 'manual'; S.kpManual = 18; calcula()", ctx);
// Fase: el mejor tramo está a partir del máximo, no en el mínimo.
const mejorFase = [...o6.fase].sort((a, b) => b.porAño - a.porAño)[0].b;
ok(mejorFase >= -1 && mejorFase <= 3, "Oslo, Kp ≥ 6: el mejor tramo del ciclo está entre el máximo y 3 años después", `→ ${mejorFase}`);
const mes = (r, m) => r.mes[m].kp;
ok((mes(o6, 2) + mes(o6, 8)) / 2 > 1.3 * (mes(o6, 5) + mes(o6, 11)) / 2, "equinoccios con más tormentas que solsticios");
ok(o6.rec.lift > 1.2, "recurrencia de 27 días por encima de la base local", `→ ×${o6.rec.lift.toFixed(2)}`);

// Futuro.
const F = o6.futuro;
ok(F.length > 100 && F.every((o) => o.p >= 0 && o.p <= 1 && o.n >= 10), "Oslo, Kp ≥ 6: meses futuros con probabilidad válida y ≥10 análogos", `→ ${F.length} meses, mín. ${Math.min(...F.map((o) => o.n))} análogos`);
const media = (a, b) => { const s = F.filter((o) => o.y * 12 + o.m >= a && o.y * 12 + o.m <= b); return s.reduce((x, o) => x + o.p, 0) / s.length; };
const pronto = media(2026 * 12 + 9, 2028 * 12 + 2), minimo = media(2030 * 12, 2032 * 12 + 11);
ok(pronto > 1.5 * minimo, "Oslo, Kp ≥ 6: 2026–2028 más probable que el mínimo de 2030–2032", `→ ${pronto.toFixed(2)} vs ${minimo.toFixed(2)}`);
ok(F.filter((o) => o.enC26).every((o) => o.lo <= o.p && o.p <= o.hi), "el rango del ciclo 26 contiene la estimación central");
ok(tro.futuro.filter((o) => o.m === 5).every((o) => o.p === 0), "Tromsø: ningún junio futuro tiene aurora posible (sol de medianoche)");
ok(bcn.año && bcn.año.p < osl.año.p, "próximo año: Barcelona menos probable que Oslo", `→ ${bcn.año.p.toFixed(2)} vs ${osl.año.p.toFixed(2)}`);

const abisko = calc("Abisko", "fuerte");
ok(abisko.futuro.filter((mes) => [5, 6].includes(mes.m)).every((mes) => mes.p === 0), "Abisko: junio y julio no ofrecen oscuridad suficiente");
const mesViaje = (año, mes, señal, extra = {}) => ({ y: año, m: mes, ini: Date.UTC(año, mes, 1) / DIA, p: señal, n: 30, ciclos: 5, enC26: false, ...extra });
ctx.__mesesViaje = [
  mesViaje(2026, 8, 1), mesViaje(2026, 9, 0.65), mesViaje(2026, 10, 0.7), mesViaje(2026, 11, 0),
  mesViaje(2027, 1, 0.68), mesViaje(2027, 2, 0.75), mesViaje(2027, 3, 0),
  mesViaje(2027, 8, 0.99), mesViaje(2027, 9, 1),
  mesViaje(2028, 1, 1, { n: 9 }), mesViaje(2028, 2, 1, { ciclos: 2 }),
  mesViaje(2029, 9, 1), mesViaje(2029, 10, 1),
  mesViaje(2035, 8, 1, { enC26: true }), mesViaje(2035, 9, 1, { enC26: true }),
];
const hoyViaje = diaNum("2026-10-01");
const viajesPrueba = vm.runInContext(`ventanasViaje(__mesesViaje, ${hoyViaje})`, ctx);
ok(viajesPrueba.length === 3 && viajesPrueba[0].meses[0].y === 2027 && viajesPrueba[0].meses[0].m === 8, "las ventanas se ordenan por señal, sin escoger escenarios lejanos");
ok(viajesPrueba.every((ventana) => ventana.meses.length === 2 && ventana.meses[1].y * 12 + ventana.meses[1].m === ventana.meses[0].y * 12 + ventana.meses[0].m + 1), "cada ventana contiene dos meses consecutivos");
ok(viajesPrueba.every((ventana) => ventana.meses.every((mes) => mes.ini >= hoyViaje && mes.y * 12 + mes.m < 2029 * 12 + 9 && mes.n >= 10 && mes.ciclos >= 3 && !mes.enC26)), "sin meses pasados, muestras insuficientes ni meses fuera de los 36 próximos");
ok(viajesPrueba.every((ventana, indice) => viajesPrueba.slice(indice + 1).every((otra) => Math.abs(ventana.meses[0].ini - otra.meses[0].ini) > 120)), "las alternativas representan temporadas separadas");
const viajesMesEmpezado = vm.runInContext(`ventanasViaje(__mesesViaje, ${diaNum("2026-10-15")})`, ctx);
ok(viajesMesEmpezado.every((ventana) => ventana.meses.every((mes) => mes.ini >= diaNum("2026-10-15"))), "se excluye un mes ya empezado, no se trata como un mes completo futuro");
ok(vm.runInContext("ventanasViaje([]).length === 0", ctx), "sin meses comparables no se inventa una ventana");
ctx.__mesesAislados = [mesViaje(2027, 1, 0.9), mesViaje(2027, 2, 0)];
ok(vm.runInContext(`ventanasViaje(__mesesAislados, ${hoyViaje}).length === 0`, ctx), "un pico aislado junto a un mes sin señal no se presenta como rango favorable");

// Medianoche magnética de Tromsø: ~21:30 UT.
const um = vm.runInContext(`(() => { const g = geomag(69.65, 18.96); let b = null;
  for (let k = 0; k < 144; k++) { const t = Date.UTC(2026, 9, 15) + k * 600e3, v = mlt(t, g.mlon), d = Math.min(v, 24 - v); if (!b || d < b.d) b = { d, h: k / 6 }; }
  return b.h; })()`, ctx);
ok(um > 20.5 && um < 22.5, "medianoche magnética de Tromsø hacia las 21–22 UT", `→ ${um.toFixed(2)} UT`);

const lunas = vm.runInContext("lunasNuevas(Date.UTC(2024, 3, 1), Date.UTC(2024, 3, 30)).map((t) => new Date(t).toISOString())", ctx);
ok(lunas.length === 1 && lunas[0].startsWith("2024-04-08"), "luna nueva del 8-abr-2024 (el eclipse total)", `→ ${lunas[0]}`);

/* ------------------------------------------- pintado con un DOM simulado */
// No es un navegador: solo un DOM mínimo para que cualquier excepción del código
// de pintado (variable mal escrita, dato que falta) salte aquí y no en la página.
console.log("Pintado (DOM simulado)");
const idsHtml = [...HTML.matchAll(/\bid="([^"]+)"/g)].map((coincidencia) => coincidencia[1]);
const ids = new Set(idsHtml);
ok(ids.size === idsHtml.length, "el HTML no tiene identificadores duplicados");
ok(!ids.has("lugar") && !ids.has("geo") && !ids.has("modo"), "Abisko es el destino fijo, sin mandos de otras ciudades");
ok(/<details class="detalle" id="detalle">/.test(HTML), "la evidencia ampliada empieza plegada");
const fotoUrl = new URL("../../pages/data/abisko-aurora.jpg", import.meta.url);
const foto = existsSync(fotoUrl) ? readFileSync(fotoUrl) : null;
ok(foto && foto.length > 1000 && foto[0] === 0xff && foto[1] === 0xd8 && foto.at(-2) === 0xff && foto.at(-1) === 0xd9, "la foto local existe y es un JPEG, no una página de error");
const nodo = () => {
  const n = {
    children: [], style: {}, dataset: {}, attrs: {}, eventos: {}, _html: "", textContent: "", value: "", clientWidth: 900, offsetWidth: 160,
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k]; },
    appendChild(c) { this.children.push(c); return c; }, prepend(c) { this.children.unshift(c); },
    addEventListener(tipo, manejador) { this.eventos[tipo] = manejador; }, insertAdjacentHTML(_, h) { this._html += h; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 300 }),
  };
  Object.defineProperty(n, "innerHTML", {
    get() { return this._html; },
    set(h) { if (/undefined|NaN/.test(h)) throw new Error(`HTML con undefined/NaN: ${h.match(/.{0,60}(undefined|NaN).{0,40}/)[0]}`); this._html = h; },
  });
  return n;
};
const nodos = new Map();
const pestañas = ["historia", "porque", "pronto", "metodo"].map((k) => { const n = nodo(); n.id = `tab-${k}`; n.attrs["aria-controls"] = `p-${k}`; n.focus = () => {}; return n; });
ctx.document = {
  getElementById: (id) => {
    if (!ids.has(id)) throw new Error(`Elemento ausente del HTML real: ${id}`);
    return (nodos.has(id) || nodos.set(id, nodo()), nodos.get(id));
  },
  createElementNS: nodo, createElement: nodo, documentElement: {},
  querySelectorAll: (sel) => (sel.includes("tab") ? pestañas : []),
};
ctx.getComputedStyle = () => ({ getPropertyValue: () => "#123456" });
ctx.navigator = {};
const salida27 = ["2026 Sep 28      98           5          2", "2026 Sep 29     100          18          5", "2026 Sep 30     105          45          7"].join("\n");
vm.runInContext(`PRONTO = { filas: [], emitido: "prueba" };
  for (const l of ${JSON.stringify(salida27)}.split("\\n")) { const m = l.match(/^(\\d{4}) (\\w{3}) (\\d{2})\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)/); PRONTO.filas.push({ d: Date.UTC(+m[1], 8, +m[3]) / DIA, ap: +m[5], kp: +m[6] }); }`, ctx);
for (const [nombre, modo] of [["Abisko", "fuerte"], ["Barcelona", "vista"], ["Madrid", "alta"], ["Londres", "vista"], ["Tromsø", "vista"], ["Tromsø", "fuerte"], ["Oslo", "fuerte"], ["Ushuaia", "vista"], ["Hobart", "alta"]]) {
  ctx.__l = lugar(nombre);
  try {
    // Todas las pestañas, una tras otra: cada una solo pinta lo suyo.
    vm.runInContext(`S.lugar = __l; S.modo = ${JSON.stringify(modo)}; S.kpManual = 21; mandos();
      for (const t of ["historia", "porque", "pronto", "metodo"]) { S.tab = t; pinta(); }`, ctx);
    const txt = nodos.get("stats").innerHTML + nodos.get("h-sub").innerHTML + nodos.get("metodo").innerHTML;
    const titular = `${nodos.get("h-cap").textContent}: ${nodos.get("h-big").textContent} — ${nodos.get("h-sub").innerHTML.replace(/<[^>]+>/g, "")}`;
    ok(txt.length > 100, `${nombre} (${modo}): se pinta sin errores`, `→ «${titular.slice(0, 120)}»`);
  } catch (e) {
    ok(false, `${nombre} (${modo}): se pinta sin errores`, e.stack.split("\n").slice(0, 3).join(" | "));
  }
}

ctx.__l = lugar("Abisko");
vm.runInContext("S.lugar = __l; S.modo = 'fuerte'; S.tab = 'historia'; S.escenario = true; pinta()", ctx);
ok((nodos.get("ventanas").innerHTML.match(/<article /g) || []).length > 0 && !/\d+ %/.test(nodos.get("h-sub").innerHTML), "Abisko muestra rangos y no promete un porcentaje de éxito del viaje", `→ ${nodos.get("h-big").textContent}`);
ok(nodos.get("h-big").textContent === "Hacia 2035–2036" && !nodos.get("h-big").textContent.includes("2027"), "la cabecera destaca el próximo entorno de máximo, no una oportunidad de 2027");
ok(nodos.get("h-sub").innerHTML.includes("No es una fecha confirmada") && nodos.get("h-chip").textContent.includes("sin previsión oficial"), "el próximo máximo no se presenta como una predicción confirmada");
ok((nodos.get("horizonte").innerHTML.match(/<article /g) || []).length === 3 && nodos.get("horizonte").innerHTML.includes("2029–2032"), "la vista principal distingue máximo reciente, transición y próximo máximo");
ok(nodos.get("tb-mapa").innerHTML.includes("2035") && !nodos.get("n-escenario").hidden, "el calendario inicial muestra el siguiente ciclo junto a su incertidumbre");
nodos.get("escenario").eventos.change({ target: { checked: false } });
ok(!nodos.get("tb-mapa").innerHTML.includes("2035") && nodos.get("n-escenario").hidden, "desactivar el escenario vuelve al ciclo actual y oculta su aviso");
nodos.get("escenario").eventos.change({ target: { checked: true } });
ok(nodos.get("tb-mapa").innerHTML.includes("2035") && !nodos.get("n-escenario").hidden, "el selector del ciclo 26 amplía el calendario y muestra el aviso");
ok((nodos.get("temporadas").innerHTML.match(/<li /g) || []).length === 12, "la vista estacional tiene doce meses");
ok(nodos.get("tb-tormentas").innerHTML.includes("Señal + oscuridad") && !nodos.get("tb-tormentas").innerHTML.includes("Dónde se vio"), "las tormentas no se presentan como avistamientos confirmados en Abisko");
ok(nodos.get("tb-anos").innerHTML.includes("Kp nocturno") && !nodos.get("tb-anos").innerHTML.includes("Mejor noche"), "el historial usa el Kp nocturno, no promete el brillo de una noche");
ctx.__tipMovil = { w: 300, svg: { getBoundingClientRect: () => ({ width: 280 }) }, tip: { innerHTML: "", classList: { add() {} }, offsetWidth: 280, style: {} } };
vm.runInContext("ponTip(__tipMovil, 'señal histórica', 280, 30)", ctx);
ok(ctx.__tipMovil.tip.style.left === "0px", "un tooltip de ancho completo no rebasa el borde móvil");

const peticiones = [];
const arranqueCtx = vm.createContext({
  console, Intl, Math, Date, Uint8Array, Float32Array, Int16Array, Map, Set, JSON,
  document: ctx.document, getComputedStyle: ctx.getComputedStyle,
  innerWidth: 900, addEventListener() {}, window: {},
  fetch: async (url) => { peticiones.push(url); return { json: async () => D }; },
});
try {
  await vm.runInContext(script, arranqueCtx);
  ok(vm.runInContext("C.L.nombre.startsWith('Abisko') && C.T === 21", arranqueCtx), "el arranque completo calcula Abisko con Kp ≥ 7");
  ok(peticiones.length === 1 && peticiones[0] === "data/auroras.json", "NOAA no se consulta antes de abrir el corto plazo");
  arranqueCtx.fetch = async () => { throw new Error("sin conexión"); };
  await vm.runInContext("cargaPronto()", arranqueCtx);
  vm.runInContext("S.tab = 'pronto'; graficoPronto(C)", arranqueCtx);
  ok(nodos.get("g-pronto").innerHTML.includes("No se ha podido cargar"), "un fallo de NOAA conserva la orientación histórica y ofrece su enlace");
} catch (error) {
  ok(false, "el arranque completo y el error de NOAA se gestionan", error.stack);
}
const errorCtx = vm.createContext({
  ...arranqueCtx,
  console: { ...console, error() {} },
  fetch: async () => { throw new Error("datos no disponibles"); },
});
try {
  await vm.runInContext(script, errorCtx);
  ok(nodos.get("h-big").textContent === "Orientación estacional" && nodos.get("ventanas").innerHTML.includes("no están disponibles"), "si falla la carga no quedan recomendaciones ni estados de carga falsos");
} catch (error) {
  ok(false, "la carga fallida se gestiona sin excepción", error.message);
}

console.log(`\n${hechas - fallos}/${hechas} comprobaciones superadas`);
process.exit(fallos ? 1 : 0);
