import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const assetVersion = bytes => createHash('sha256').update(bytes).digest('hex').slice(0, 12);

export function versionAssets(root = fileURLToPath(new URL('../../', import.meta.url))) {
  const directory = join(root, 'pages', 'inferencia');
  const versions = {};
  const changed = [];
  const save = (file, before, after) => {
    if (before === after) return;
    writeFileSync(join(root, file), after, 'utf8');
    changed.push(file);
  };
  const appFile = 'pages/inferencia/app.js';
  const appBefore = readFileSync(join(root, appFile), 'utf8');
  let imports = 0;
  const appAfter = appBefore.replace(/from (['"])\.\/([a-z-]+\.js)(?:\?v=[a-f0-9]+)?\1/g, (match, quote, file) => {
    imports++;
    const version = assetVersion(readFileSync(join(directory, file)));
    versions[`inferencia/${file}`] = version;
    return `from ${quote}./${file}?v=${version}${quote}`;
  });
  if (imports !== 5) throw new Error('Se esperan las cinco dependencias locales del aula; revisa el grafo de módulos.');
  const htmlFile = 'pages/inferencia-estadistica.html';
  const htmlBefore = readFileSync(join(root, htmlFile), 'utf8');
  let assets = 0;
  const htmlAfter = htmlBefore.replace(/(\b(?:src|href)=")((?:inferencia\/)[^"?]+\.(?:js|css))(?:\?v=[a-f0-9]+)?(")/g, (match, before, file, after) => {
    assets++;
    const bytes = file === 'inferencia/app.js' ? Buffer.from(appAfter) : readFileSync(join(root, 'pages', file));
    const version = assetVersion(bytes);
    versions[file] = version;
    return `${before}${file}?v=${version}${after}`;
  });
  if (assets !== 6) throw new Error('Se esperan seis recursos JavaScript/CSS de entrada; revisa el HTML.');
  save(appFile, appBefore, appAfter);
  save(htmlFile, htmlBefore, htmlAfter);
  return {versions, changed};
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const result = versionAssets();
  console.log(`Recursos versionados: ${Object.keys(result.versions).length}; archivos actualizados: ${result.changed.join(', ') || 'ninguno'}.`);
}