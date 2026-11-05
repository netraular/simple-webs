import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {ANIMATIONS, animationDuration, buildVtt} from '../../pages/inferencia/animations.mjs';

export function exportLectures(output = fileURLToPath(new URL('./_work/lecturas/', import.meta.url))) {
  const destination = resolve(output);
  mkdirSync(destination, {recursive:true});
  const manifest = ANIMATIONS.map(animation => {
    const transcript = animation.steps.map(step => step.caption).join('\n\n');
    writeFileSync(join(destination, `${animation.id}.vtt`), buildVtt(animation.id), 'utf8');
    writeFileSync(join(destination, `${animation.id}.txt`), transcript, 'utf8');
    return {id:animation.id, title:animation.title, duration:animationDuration(animation.id), subtitles:`${animation.id}.vtt`, transcript:`${animation.id}.txt`, scenes:animation.steps.map(step => ({title:step.title, caption:step.caption, duration:step.duration, kind:step.kind, ...(step.tex ? {tex:step.tex} : {})}))};
  });
  writeFileSync(join(destination, 'lecturas.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return {destination, lectures:manifest.length, scenes:manifest.reduce((total, lecture) => total + lecture.scenes.length, 0), files:manifest.length * 2 + 1};
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--out' || !args[1])) {
    console.error('Uso: node export-lecturas.mjs [--out directorio]');
    process.exitCode = 1;
  } else {
    const result = exportLectures(args[1]);
    console.log(`${result.lectures} lecturas, ${result.scenes} escenas, ${result.files} archivos: ${result.destination}`);
  }
}