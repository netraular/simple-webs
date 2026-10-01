/**
 * Alquiler: acumulado ANUAL en vez del último trimestre.
 *
 * El dataset del Incasòl publica tanto trimestres sueltos como acumulados. El
 * trimestre más reciente (2026T1) es más actual, pero su muestra es pequeña:
 * 27 de los municipios del área tienen menos de 20 contratos en un trimestre, y
 * con eso la renta media salta de un periodo a otro sin que haya pasado nada en
 * el mercado. El acumulado enero-diciembre de 2025 multiplica por cuatro la
 * muestra y, además, cae en el mismo periodo que los datos de compraventa, que
 * son del año 2025 completo — así la rentabilidad no cruza dos momentos
 * distintos.
 *
 * Se guarda también la renta del último trimestre como dato secundario, para
 * poder enseñar hacia dónde se mueve.
 *
 * Salida: lloguer-anual.json
 */
import { readFileSync, writeFileSync } from "node:fs";

const BASE = "https://analisi.transparenciacatalunya.cat/resource/qww9-bvhh.json";
const ANUAL  = { any: "2025", periode: "gener-desembre", etiqueta: "2025 (any complet)" };
const TRIM   = { any: "2026", periode: "gener-març",     etiqueta: "2026T1" };

const municipis = JSON.parse(readFileSync(new URL("./municipis.json", import.meta.url), "utf8"));
const universo = new Map(municipis.map(m => [m.codi_ine, m]));

async function fetchPeriode({ any, periode }) {
  const url = `${BASE}?$limit=6000&$where=${encodeURIComponent(
    `ambit_territorial='Municipi' AND any='${any}' AND periode='${periode}'`)}`;
  const res = await fetch(url, { headers: { "User-Agent": "simple-webs/pisos-vs-distancia" } });
  if (!res.ok) throw new Error(`Socrata ${res.status} para ${any} ${periode}`);
  const rows = await res.json();
  const m = new Map();
  for (const r of rows) {
    const ine = String(r.codi_territorial).padStart(5, "0");
    if (!universo.has(ine)) continue;
    const renda = parseFloat(r.renda);
    const n = parseInt(r.habitatges, 10);
    if (!Number.isFinite(renda)) continue;
    m.set(ine, { renda: +renda.toFixed(2), contractes: Number.isFinite(n) ? n : null });
  }
  console.error(`  ${any} ${periode}: ${m.size} de ${universo.size} municipios del área`);
  return m;
}

console.error("→ Incasòl, dataset qww9-bvhh");
const anual = await fetchPeriode(ANUAL);
const trim  = await fetchPeriode(TRIM);

const sense = [];
const out = [];
for (const m of municipis) {
  const a = anual.get(m.codi_ine);
  if (!a) { sense.push(m.nom); continue; }
  const t = trim.get(m.codi_ine);
  out.push({
    codi_ine: m.codi_ine,
    nom: m.nom,
    lloguer_mitja_eur_mes: a.renda,
    lloguer_eur_m2_mes: null,          // la fuente no publica superficie; no se inventa
    nombre_contractes: a.contractes,
    periode: ANUAL.etiqueta,
    any: +ANUAL.any,
    lloguer_darrer_trimestre_eur_mes: t ? t.renda : null,
    periode_darrer_trimestre: t ? TRIM.etiqueta : null,
  });
}

const payload = {
  meta: {
    font_principal: "Incasòl — Institut Català del Sòl",
    metrica_principal:
      "Renta media mensual de los contratos de alquiler con fianza depositada en el Incasòl, acumulado del año completo",
    periode: ANUAL.etiqueta,
    any: +ANUAL.any,
    font_principal_url: "https://analisi.transparenciacatalunya.cat/d/qww9-bvhh",
    nota_mostra:
      "El acumulado anual se elige frente al último trimestre porque cuadruplica la muestra " +
      "y coincide con el periodo de los datos de compraventa. Aun así, en los municipios " +
      "pequeños la media se calcula sobre pocos contratos: mira nombre_contractes.",
    sense_dada: sense,
  },
  municipis: out,
};

writeFileSync(new URL("./lloguer-anual.json", import.meta.url), JSON.stringify(payload, null, 1));

const pocs = out.filter(r => (r.nombre_contractes ?? 0) < 50).length;
console.error(`✓ lloguer-anual.json · ${out.length} municipios con dato, ${sense.length} sin`);
console.error(`  con menos de 50 contratos al año: ${pocs}`);
for (const n of ["Barcelona", "Sant Cugat del Vallès", "Terrassa", "Mataró", "Badia del Vallès"]) {
  const r = out.find(x => x.nom === n);
  console.error(`  ${n.padEnd(24)} ${r ? `${r.lloguer_mitja_eur_mes} €/mes (${r.nombre_contractes} contratos) · trimestre ${r.lloguer_darrer_trimestre_eur_mes ?? "—"}` : "sin dato"}`);
}
