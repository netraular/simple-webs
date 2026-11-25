import { readFileSync, writeFileSync } from 'node:fs';

const template = new URL('./plantilla.html', import.meta.url);

function escapeText(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function writeDraw(assignments, output) {
  const rows = assignments.map(({ regala, recibe, fija }) => {
    const label = fija ? ' <span class="fixed">Fija</span>' : '';
    return `      <tr><th scope="row">${escapeText(regala)}</th><td>${escapeText(recibe)}${label}</td></tr>`;
  }).join('\n');
  const html = readFileSync(template, 'utf8')
    .replace('{{participantes}}', String(assignments.length))
    .replace('{{filas}}', () => rows);
  writeFileSync(output, html, { flag: 'wx', mode: 0o600 });
}