import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const api = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/';
const minimumPeriod = '2026-S2';
const earningsYear = '2022';
const countries = 'AD AL AM AT AZ BA BE BG BY CH CY CZ DE DK EE ES FI FR GB GE GR HR HU IE IS IT KZ LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SK SM TR UA VA XK'.split(' ');
const noNationalMinimum = new Set(['AT', 'BA', 'CH', 'DK', 'FI', 'IS', 'IT', 'LI', 'NO', 'SE']);
const quantileCodes = [[10, 'P10'], [50, 'MED'], [90, 'P90']];
const ukHourly = 12.71;
const ukHours = 37.5;
const ukJulyRate = 0.85973;
const ukAnnualRate = 0.8527608560311;
const ukPercentiles = [[10, 19381], [20, 22710], [25, 24287], [30, 25922], [40, 29267], [50, 33061], [60, 37405], [70, 42439], [75, 45584], [80, 49441], [90, 62892]];

function eurostat(table, filters) {
  const url = `${api}${table}?${new URLSearchParams({ lang: 'en', ...filters })}`;
  const data = JSON.parse(execFileSync('curl', ['-fsSL', '--retry', '2', '--max-time', '45', url], { encoding: 'utf8' }));
  if (!data.value || !data.id || !data.size) throw new Error(`Respuesta de Eurostat sin datos: ${table}`);
  return data;
}

function valueAt(data, coordinates) {
  let offset = 0;
  for (const [position, id] of data.id.entries()) {
    const categories = data.dimension[id].category.index;
    const index = coordinates[id] === undefined && data.size[position] === 1 ? 0 : categories[coordinates[id]];
    if (index === undefined) return null;
    offset = offset * data.size[position] + index;
  }
  const value = data.value[offset];
  return Number.isFinite(value) && value > 0 ? value : null;
}

const minimum = eurostat('earn_mw_cur', { time: minimumPeriod, currency: 'EUR' });
const earnings = eurostat('earn_ses22_adeci', { time: earningsYear, unit: 'EUR', worktime: 'FT' });
const data = countries.map(code => {
  if (code === 'GB') {
    return { code, monthly: Math.round(ukHourly * ukHours * 52 / 12 / ukJulyRate), noNationalMinimum: false,
      percentiles: ukPercentiles.map(([rank, pounds]) => [rank, Math.round(pounds / ukAnnualRate)]) };
  }
  const geo = code === 'GR' ? 'EL' : code;
  const monthly = valueAt(minimum, { geo });
  const points = quantileCodes.map(([rank, quant_inc]) => [rank, valueAt(earnings, { geo, quant_inc })]);
  const complete = points.every(([, value], index) => value !== null && (index === 0 || value > points[index - 1][1]));
  return { code, monthly, noNationalMinimum: monthly === null && noNationalMinimum.has(code), percentiles: complete ? points : null };
});

if (!data.some(country => country.code === 'ES' && country.monthly !== null && country.percentiles !== null)) {
  throw new Error('Faltan datos de referencia en las series de Eurostat.');
}

const snapshot = { minimumPeriod, earningsYear, countries: data };
const output = `window.SALARIOS_EUROPA = ${JSON.stringify(snapshot)};\n`;
writeFileSync(new URL('../../pages/data/salarios-europa.js', import.meta.url), output);
console.log(`${data.length} países: ${data.filter(country => country.monthly !== null).length} mínimos y ${data.filter(country => country.percentiles !== null).length} distribuciones.`);