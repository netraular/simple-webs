import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const source = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson';
const markers = { AD: [1.52, 42.51], LI: [9.52, 47.14], MC: [7.42, 43.73], MT: [14.43, 35.9], SM: [12.46, 43.94], VA: [12.45, 41.9] };
const options = { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 };
const boundaries = JSON.parse(execFileSync('curl', ['-fsSL', '--retry', '2', '--max-time', '45', source], options));

for (const feature of boundaries.features) {
  const { ISO_A2_EH, ADM0_A3 } = feature.properties;
  const code = /^[A-Z]{2}$/.test(ISO_A2_EH) ? ISO_A2_EH : ADM0_A3;
  feature.properties = { code };
  if (Object.hasOwn(markers, code)) feature.geometry = { type: 'Point', coordinates: markers[code] };
}

const work = mkdtempSync(join(tmpdir(), 'salarios-mapa-'));
let svg;
try {
  const input = join(work, 'fronteras.geojson');
  const output = join(work, 'europa.svg');
  writeFileSync(input, JSON.stringify(boundaries));
  execFileSync('npx', ['--yes', 'mapshaper@0.8.9', '-i', input,
    '-clip', 'bbox=-25,33,60,72', 'target=*',
    '-proj', '+proj=laea +lat_0=53 +lon_0=15 +datum=WGS84 +units=m +no_defs',
    '-simplify', '15%', 'keep-shapes',
    '-style', 'r=3.5', 'target=*',
    '-o', output, 'target=*', 'id-field=code', 'width=980', 'margin=8', 'precision=0.1'], options);
  svg = readFileSync(output, 'utf8').replace(/^<\?xml[^?]*\?>\s*/, '').trim();
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (!svg.startsWith('<svg') || !svg.includes('id="ES"') || !svg.includes('id="AD"')) {
  throw new Error('El SVG no contiene las fronteras y los marcadores esperados.');
}
writeFileSync(new URL('../../pages/data/salarios-europa-mapa.js', import.meta.url), `window.SALARIOS_EUROPA_MAPA = ${JSON.stringify(svg)};\n`);