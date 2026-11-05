import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {parseHTML} from 'linkedom';
import {COURSE} from '../../pages/inferencia/course.js';
import {generateExercise} from '../../pages/inferencia/exercises.js';
import {createLessonAnimation, animationDuration, buildVtt} from '../../pages/inferencia/animations.js';

export function exportLectures(output = fileURLToPath(new URL('./_work/lecturas/', import.meta.url))) {
  const destination = resolve(output);
  mkdirSync(destination, {recursive:true});
  globalThis.jStat ??= createRequire(import.meta.url)('../../pages/inferencia/vendor/jstat.min.js').jStat;
  const paragraphs = html => [...parseHTML(`<div>${html}</div>`).document.querySelectorAll('p')].map(node=>node.textContent);
  const manifest = COURSE.units.flatMap(unit=>unit.lessons).map(lesson => {
    const animation = createLessonAnimation(lesson,generateExercise,paragraphs);
    const transcript = animation.steps.map(step => step.caption).join('\n\n');
    writeFileSync(join(destination, `${animation.id}.vtt`), buildVtt(animation), 'utf8');
    writeFileSync(join(destination, `${animation.id}.txt`), transcript, 'utf8');
    let start = 0;
    return {id:animation.id, title:animation.title, source:lesson.source, duration:animationDuration(animation), timing:'Estimated narration; retime cues after generating TTS audio.', subtitles:`${animation.id}.vtt`, transcript:`${animation.id}.txt`, scenes:animation.steps.map(step => {
      const scene = {title:step.title, caption:step.caption, start, duration:step.duration, kind:step.kind, chapter:step.data.chapter, cues:step.cues.map(cue=>({...cue,start:start+cue.start,end:start+cue.end})), ...(step.tex ? {tex:step.tex} : {})};
      start+=step.duration;
      return scene;
    })};
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