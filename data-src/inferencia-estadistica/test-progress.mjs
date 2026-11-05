import test from 'node:test';
import assert from 'node:assert/strict';
import {COURSE} from '../../pages/inferencia/course.js';
import {STORAGE_KEY, freshProgress, parseProgress, loadProgress, saveProgress, recordAnswer, recordAssistance, progressSummary} from '../../pages/inferencia/progress.js';

test('Progreso inicial y copia con las lecciones reales', () => {
  const progress = freshProgress(COURSE);
  assert.equal(progress.lastLesson, 'proporciones');
  assert.deepEqual(parseProgress(JSON.stringify(progress), COURSE), progress);
  progress.studied = ['proporciones', 'proporciones'];
  assert.deepEqual(parseProgress(JSON.stringify(progress), COURSE).studied, ['proporciones']);
});

test('El historial no confunde intentos, solución y ayuda', () => {
  const progress = freshProgress(COURSE);
  recordAnswer(progress, 'events-1/union', false);
  recordAnswer(progress, 'events-1/union', true);
  recordAnswer(progress, 'events-1/union', true);
  recordAssistance(progress, 'bayes-2/posterior');
  recordAnswer(progress, 'bayes-2/posterior', true);
  assert.deepEqual(progressSummary(progress), {studied:0, checks:0, attempts:4, solved:2, independent:1, assisted:1});
  assert.deepEqual(parseProgress(JSON.stringify(progress), COURSE), progress);
});

test('Una respuesta posterior incorrecta no borra una solución previa', () => {
  const progress = freshProgress(COURSE);
  recordAnswer(progress, 'events-1/union', true);
  recordAnswer(progress, 'events-1/union', false);
  assert.equal(progress.attempts['events-1/union'].solved, true);
});

test('Almacenamiento bloqueado no detiene el estudio', () => {
  const blocked = {getItem(){throw new Error('Blocked');}, setItem(){throw new Error('Quota');}};
  const loaded = loadProgress(blocked, COURSE);
  assert.ok(loaded.warning);
  assert.equal(saveProgress(blocked, loaded.progress), false);
  assert.equal(saveProgress(null, loaded.progress), false);
});

test('Carga y guardado usan una clave propia y no alteran otras webs', () => {
  const storage = new Map([['other-web', 'keep']]);
  const adapter = {getItem:key => storage.get(key), setItem:(key, value) => storage.set(key, value)};
  const progress = freshProgress(COURSE);
  progress.studied = ['proporciones'];
  assert.equal(saveProgress(adapter, progress), true);
  assert.ok(storage.has(STORAGE_KEY));
  assert.deepEqual(loadProgress(adapter, COURSE).progress.studied, ['proporciones']);
  assert.equal(storage.get('other-web'), 'keep');
});

test('Copias inválidas, curso distinto y tamaño excesivo se rechazan', () => {
  const raw = freshProgress(COURSE);
  for (const changed of [{...raw, version:2}, {...raw, courseId:'otro'}, {...raw, studied:['unknown']}, {...raw, checks:{unknown:true}}, {...raw, attempts:[]}, {...raw, attempts:{'__proto__':true, 'invalid':{count:1,solved:true,assisted:false}}}]) {
    assert.throws(() => parseProgress(JSON.stringify(changed), COURSE));
  }
  assert.throws(() => parseProgress('not json', COURSE));
  assert.throws(() => parseProgress(' '.repeat(2000001), COURSE));
  assert.throws(() => parseProgress(null, COURSE));
});

test('Campos ajenos no se incorporan y última lección desconocida vuelve al inicio', () => {
  const data = {...freshProgress(COURSE), lastLesson:'unknown', injected:'<script>alert(1)</script>'};
  const parsed = parseProgress(JSON.stringify(data), COURSE);
  assert.equal(parsed.lastLesson, 'proporciones');
  assert.equal(parsed.injected, undefined);
});