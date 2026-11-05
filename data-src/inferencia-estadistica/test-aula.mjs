import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {parseHTML} from 'linkedom';
import * as cssTree from 'css-tree';
import {COURSE} from '../../pages/inferencia/course.mjs';
import {ANIMATIONS} from '../../pages/inferencia/animations.mjs';
import {LAB_IDS} from '../../pages/inferencia/labs.mjs';
import {EXERCISE_TYPES} from '../../pages/inferencia/exercises.mjs';
import {LESSONS, VIEWS, LESSON_LAB_PRESETS, parseRoute, escapeHtml, mountAula} from '../../pages/inferencia/app.mjs';
import {STORAGE_KEY, freshProgress, progressSummary} from '../../pages/inferencia/progress.mjs';

const require = createRequire(import.meta.url);
const katex = require('../../pages/inferencia/vendor/katex/katex.min.js');
globalThis.jStat = require('../../pages/inferencia/vendor/jstat.min.js').jStat;
const html = readFileSync(new URL('../../pages/inferencia-estadistica.html', import.meta.url), 'utf8');

function harness(raw) {
  const {document, window} = parseHTML(html);
  Object.defineProperty(window.HTMLSelectElement.prototype, 'value', {
    configurable:true,
    get(){return this.querySelector('option[selected]')?.value || this.querySelector('option')?.value || '';},
    set(value){for (const option of this.querySelectorAll('option')) { if (option.value === String(value)) option.setAttribute('selected', ''); else option.removeAttribute('selected'); }}
  });
  window.HTMLCanvasElement.prototype.getContext = () => null;
  window.HTMLElement.prototype.focus = function(){};
  window.HTMLElement.prototype.getBoundingClientRect = () => ({width:640, height:360});
  window.katex = katex;
  window.lucide = {createIcons(){}};
  window.matchMedia = () => ({matches:false});
  const saved = new Map(raw ? [[STORAGE_KEY, raw]] : []);
  const storage = {getItem:key => saved.get(key), setItem:(key, value) => saved.set(key, value)};
  const location = {hash:''};
  const history = {replaceState(state, title, hash){location.hash = hash;}};
  const aula = mountAula(document, {storage, location, history});
  const click = target => target.dispatchEvent(new window.Event('click', {bubbles:true}));
  const change = target => target.dispatchEvent(new window.Event('change', {bubbles:true}));
  const submit = target => target.dispatchEvent(new window.Event('submit', {bubbles:true,cancelable:true}));
  return {document, window, aula, saved, click, change, submit};
}

test('Currículo completo, IDs y asociaciones de cada lección', () => {
  assert.equal(COURSE.units.length, 5);
  assert.equal(LESSONS.length, 36);
  assert.equal(new Set(LESSONS.map(item => item.id)).size, LESSONS.length);
  assert.deepEqual(COURSE.units.map(unit => unit.number), [0,1,2,3,4]);
  const types = new Set(EXERCISE_TYPES.map(item => item.id));
  const animations = new Set(ANIMATIONS.map(item => item.id));
  for (const lesson of LESSONS) {
    assert.match(lesson.id, /^[a-z][a-z0-9-]*$/);
    assert.ok(lesson.sections.length >= 2);
    assert.ok(lesson.sections.every(section => section.body.length > 200));
    assert.ok(lesson.formulas.length > 0);
    assert.ok(lesson.check.answer >= 0 && lesson.check.answer < lesson.check.options.length);
    assert.ok(LAB_IDS.includes(lesson.visual), lesson.id);
    assert.ok(animations.has(lesson.animation), lesson.id);
    assert.ok(lesson.exerciseTypes.length > 0 && lesson.exerciseTypes.every(type => types.has(type)), lesson.id);
    assert.ok(lesson.source.document && lesson.source.section);
    for (const section of lesson.sections) assert.doesNotMatch(section.body, /<script|on\w+\s*=|javascript:/i);
  }
});

test('KaTeX representa todas las fórmulas del temario y las escenas', () => {
  const formulas = [...LESSONS.flatMap(lesson => lesson.formulas.map(formula => formula.tex)), ...ANIMATIONS.flatMap(animation => animation.steps.filter(step => step.tex).map(step => step.tex))];
  for (const tex of formulas) assert.doesNotThrow(() => katex.renderToString(tex, {throwOnError:true, trust:false, strict:'ignore'}), tex);
});

test('CSS válido y recursos locales existentes, sin PDF ni dependencias remotas', () => {
  const css = readFileSync(new URL('../../pages/inferencia/aula.css', import.meta.url), 'utf8');
  const errors = [];
  cssTree.parse(css, {onParseError:error => errors.push(error.message)});
  assert.deepEqual(errors, []);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /max-width:480px/);
  assert.match(css, /\[hidden\]/);
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const path = match[1];
    if (path.startsWith('#') || path === '../') continue;
    assert.doesNotMatch(path, /https?:|\.pdf$/i);
    assert.ok(existsSync(new URL(`../../pages/${path}`, import.meta.url)), path);
  }
  for (const match of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) assert.ok(existsSync(new URL(`../../pages/inferencia/${match[1]}`, import.meta.url)), match[1]);
  const katexCss = readFileSync(new URL('../../pages/inferencia/vendor/katex/katex.min.css', import.meta.url), 'utf8');
  for (const match of katexCss.matchAll(/url\(([^)]+)\)/g)) assert.ok(existsSync(new URL(`../../pages/inferencia/vendor/katex/${match[1]}`, import.meta.url)), match[1]);
  for (const file of ['jstat.LICENSE','lucide.LICENSE','atkinson.LICENSE','katex/LICENSE']) assert.ok(existsSync(new URL(`../../pages/inferencia/vendor/${file}`, import.meta.url)), file);
});

test('Las rutas y el texto externo se validan', () => {
  assert.deepEqual(parseRoute('#bayes-diagnostico/practice'), {lessonId:'bayes-diagnostico',view:'practice'});
  assert.deepEqual(parseRoute('#unknown/invalid'), {lessonId:'proporciones',view:'theory'});
  assert.equal(escapeHtml('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
});

test('Cada lección monta sus cuatro vistas y limpia los gráficos anteriores', () => {
  const {document, aula} = harness();
  try {
    for (const lesson of LESSONS) {
      for (const view of VIEWS) {
        assert.equal(aula.navigate(lesson.id, view, false), true);
        assert.equal(document.getElementById('lessonTitle').textContent, lesson.title);
        assert.equal(document.querySelectorAll('.lesson-panel:not([hidden])').length, 1);
        assert.equal(document.querySelectorAll('canvas').length, view === 'practice' ? 0 : 1);
        assert.equal(document.getElementById(`tab-${view}`).getAttribute('aria-selected'), 'true');
        const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
        assert.equal(new Set(ids).size, ids.length, `${lesson.id}/${view}`);
      }
    }
  } finally { aula.dispose(); }
  assert.equal(document.querySelectorAll('canvas').length, 0);
});

test('Navegación siguiente/anterior y progreso explícito restaurable', () => {
  const {document, aula, saved, click, change} = harness();
  try {
    assert.equal(document.getElementById('previousLesson').disabled, true);
    assert.equal(aula.progress.studied.length, 0);
    const studied = document.getElementById('lessonStudied');
    studied.checked = true;
    change(studied);
    assert.deepEqual(aula.progress.studied, ['proporciones']);
    click(document.getElementById('nextLesson'));
    assert.equal(aula.route.lessonId, 'algebra');
    assert.equal(document.getElementById('lessonStudied').checked, false);
    click(document.getElementById('previousLesson'));
    assert.equal(aula.route.lessonId, 'proporciones');
    assert.equal(document.getElementById('lessonStudied').checked, true);
    const restored = harness(saved.get(STORAGE_KEY));
    assert.equal(restored.aula.progress.studied.length, 1);
    restored.aula.dispose();
  } finally { aula.dispose(); }
});

test('Búsqueda sin acentos y comprobación conceptual', () => {
  const {document, window, aula, submit} = harness();
  try {
    const search = document.getElementById('courseSearch');
    search.value = 'distribucion';
    search.dispatchEvent(new window.Event('input'));
    assert.ok(document.querySelectorAll('.lesson-link').length > 0);
    search.value = 'xxxxxxxxxxx';
    search.dispatchEvent(new window.Event('input'));
    assert.equal(document.querySelectorAll('.lesson-link').length, 0);
    const correct = document.querySelector('#knowledgeForm input[value="1"]');
    correct.checked = true;
    correct.setAttribute('checked', '');
    submit(document.getElementById('knowledgeForm'));
    assert.equal(aula.progress.checks.proporciones, true);
    assert.match(document.getElementById('knowledgeFeedback').textContent, /Correcto/);
    assert.equal(aula.progress.studied.length, 0);
  } finally { aula.dispose(); }
});

test('Práctica acepta fracciones, registra ayuda y no puntúa entradas inválidas', () => {
  const {document, aula, click, submit} = harness();
  try {
    aula.navigate('sucesos', 'practice');
    const question = aula.exercise.questions[0];
    const input = document.getElementById(`answer-${question.id}`);
    const form = document.querySelector(`[data-grade-form="${question.id}"]`);
    input.value = 'not-a-number';
    submit(form);
    assert.equal(progressSummary(aula.progress).attempts, 0);
    click(document.querySelector(`[data-hint="${question.id}"]`));
    assert.equal(document.getElementById(`hint-${question.id}`).hidden, false);
    input.value = `${question.answer * 100}%`;
    submit(form);
    assert.equal(progressSummary(aula.progress).assisted, 1);
    assert.match(document.getElementById(`feedback-${question.id}`).textContent, /Correcto/);
    const second = aula.exercise.questions[1];
    document.getElementById(`answer-${second.id}`).value = String(second.answer);
    submit(document.querySelector(`[data-grade-form="${second.id}"]`));
    assert.equal(progressSummary(aula.progress).independent, 1);
    const oldId = aula.exercise.id;
    click(document.getElementById('newExercise'));
    assert.notEqual(aula.exercise.id, oldId);
  } finally { aula.dispose(); }
});

test('Banco completo, modo guiado y preferencias funcionan', () => {
  const {document, aula, click, change} = harness();
  try {
    aula.setView('practice');
    document.getElementById('entireBank').checked = true;
    change(document.getElementById('entireBank'));
    assert.equal(document.querySelectorAll('#exerciseType option').length, EXERCISE_TYPES.length);
    document.getElementById('exerciseType').value = 'gamma';
    change(document.getElementById('exerciseType'));
    assert.equal(aula.exercise.type, 'gamma');
    document.getElementById('practiceMode').value = 'guided';
    change(document.getElementById('practiceMode'));
    assert.equal(document.querySelectorAll('.solution[open]').length, aula.exercise.questions.length);
    click(document.getElementById('settingsToggle'));
    assert.match(document.getElementById('dialogContent').textContent, /este navegador/);
    click(document.querySelector('[data-action="reset"]'));
    assert.equal(document.getElementById('resetConfirm').hidden, false);
    click(document.querySelector('[data-action="confirm-reset"]'));
    assert.equal(progressSummary(aula.progress).attempts, 0);
    assert.equal(aula.route.lessonId, 'proporciones');
    assert.equal(aula.route.view, 'theory');
    click(document.getElementById('dialogClose'));
    assert.equal(document.getElementById('utilityDialog').hasAttribute('open'), false);
  } finally { aula.dispose(); }
});

test('Copias ajenas y almacenamiento bloqueado no rompen el aula', () => {
  const data = {...freshProgress(COURSE), courseId:'otro'};
  const {document, aula} = harness(JSON.stringify(data));
  try {
    assert.ok(document.querySelector('canvas'));
    assert.match(document.getElementById('appStatus').textContent, /recuperar/);
    assert.deepEqual(aula.progress.studied, []);
  } finally { aula.dispose(); }
});

test('Los modelos iniciales corresponden al tema y no al laboratorio genérico', () => {
  const {document, aula} = harness();
  try {
    for (const id of ['hipergeometrica','geometrica-negativa','exponencial','gamma','cauchy-weibull','familia-exponencial']) {
      aula.navigate(id, 'lab');
      assert.equal(document.querySelector('#lessonLab select').value, LESSON_LAB_PRESETS[id].family);
    }
  } finally { aula.dispose(); }
});

test('Consultar la solución justo antes de responder cuenta como ayuda', () => {
  const {document, aula, submit} = harness();
  try {
    aula.navigate('sucesos', 'practice');
    const question = aula.exercise.questions[0];
    document.querySelector(`[data-solution="${question.id}"]`).open = true;
    document.getElementById(`answer-${question.id}`).value = String(question.answer);
    submit(document.querySelector(`[data-grade-form="${question.id}"]`));
    assert.equal(progressSummary(aula.progress).assisted, 1);
    assert.equal(progressSummary(aula.progress).independent, 0);
  } finally { aula.dispose(); }
});