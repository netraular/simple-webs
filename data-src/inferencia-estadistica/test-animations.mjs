import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync, readFileSync, readdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {parseHTML} from 'linkedom';
import {COURSE} from '../../pages/inferencia/course.js';
import {generateExercise} from '../../pages/inferencia/exercises.js';
import * as api from '../../pages/inferencia/animations.js';
import {exportLectures} from './export-lecturas.mjs';

const {ANIMATIONS, animationDuration, buildVtt, createLessonAnimation, mountAnimation} = api;
const require = createRequire(import.meta.url);
globalThis.jStat = require('../../pages/inferencia/vendor/jstat.min.js').jStat;
const katex = require('../../pages/inferencia/vendor/katex/katex.min.js');
const paragraphs = html => [...parseHTML(`<div>${html}</div>`).document.querySelectorAll('p')].map(node=>node.textContent);
const fullLectures = () => COURSE.units.flatMap(unit=>unit.lessons).map(current=>createLessonAnimation(current,generateExercise,paragraphs));

test('36 clases contienen toda la teoría, métodos, fórmulas, ejemplos y soluciones sin resumir el guion', () => {
  const lessons = COURSE.units.flatMap(unit=>unit.lessons);
  for (const [index,lecture] of fullLectures().entries()) {
    const current = lessons[index];
    const script = lecture.steps.map(step=>step.caption).join('\n');
    assert.equal(lecture.id,current.id);
    assert.ok(lecture.steps.length>20,current.id);
    assert.doesNotMatch(script,/undefined|\[object Object\]/);
    for (const text of [...current.sections.flatMap(section=>paragraphs(section.body)),...current.method,...paragraphs(current.example.body),...current.formulas.map(formula=>formula.meaning),...current.pitfalls]) assert.ok(script.includes(text),`${current.id}: ${text}`);
    const worked = generateExercise(current.exerciseTypes[0],1);
    for (const question of worked.questions) for (const step of question.steps) assert.ok(script.includes(step.explanation),current.id);
    let end = 0;
    for (const step of lecture.steps) {
      assert.equal(step.cues.map(cue=>cue.text).join(' ').replace(/\s+/g,' '),step.caption.replace(/\s+/g,' '));
      close(step.cues[0].start,0);
      close(step.cues.at(-1).end,step.duration);
      for (const [cueIndex,cue] of step.cues.entries()) {
        assert.ok(cue.text.split(/\s+/).length<=26);
        assert.ok(cue.end>cue.start);
        if (cueIndex) close(cue.start,step.cues[cueIndex-1].end);
      }
      if (step.tex) assert.doesNotThrow(()=>katex.renderToString(step.tex,{throwOnError:true}));
      end += step.duration;
    }
    close(end,animationDuration(lecture));
    const cues = buildVtt(lecture).trimEnd().split('\n\n').slice(1);
    assert.equal(cues.length,sum(lecture.steps.map(step=>step.cues.length)));
    let previous = 0;
    const expected = lecture.steps.flatMap(step=>step.cues);
    cues.forEach((cue,cueIndex)=>{
      const [identifier,timing,text] = cue.split('\n');
      const [start,finish] = timing.split(' --> ').map(parseTime);
      assert.equal(identifier,String(cueIndex+1));
      close(start,previous,0.001);
      assert.equal(decodeCaption(text),expected[cueIndex].text);
      previous=finish;
    });
    close(previous,end,0.001);
  }
});

test('Exportación offline: todos los subtítulos y guiones, sin audio ni vídeo', () => {
  const directory = mkdtempSync(join(tmpdir(), 'inferencia-lecturas-'));
  try {
    const exported = exportLectures(directory);
    const lectures = fullLectures();
    assert.equal(exported.lectures, 36);
    assert.equal(exported.scenes, sum(lectures.map(lecture=>lecture.steps.length)));
    assert.equal(readdirSync(directory).length, 73);
    const manifest = JSON.parse(readFileSync(join(directory, 'lecturas.json'), 'utf8'));
    for (const animation of lectures) {
      assert.equal(readFileSync(join(directory, `${animation.id}.vtt`), 'utf8'), buildVtt(animation));
      assert.equal(readFileSync(join(directory, `${animation.id}.txt`), 'utf8'), animation.steps.map(step => step.caption).join('\n\n'));
      const item = manifest.find(item => item.id === animation.id);
      assert.equal(item.duration, animationDuration(animation));
      assert.ok(item.scenes.every(scene=>scene.cues.length>0));
      close(item.scenes.at(-1).cues.at(-1).end,item.duration);
    }
    assert.equal(readdirSync(directory).some(file => /\.(mp4|webm|wav|mp3)$/.test(file)), false);
  } finally { rmSync(directory, {recursive:true,force:true}); }
});
const expectedIds = ['math', 'events', 'bayes', 'variable', 'density', 'expectation', 'binomial', 'poisson', 'normal', 'joint', 'independence', 'covariance', 'sampling', 'models'];
const newIds = ['algebra', 'calculus', 'combinatorics', 'cdf', 'moments', 'hypergeometric', 'geometric-negative', 'exponential', 'gamma', 'cauchy-weibull', 'multinomial', 'continuous-joint', 'bivariate-normal', 'exponential-family'];
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const lesson = id => ANIMATIONS.find(animation => animation.id === id);
const data = (id, index) => lesson(id).steps[index].data;
const sum = values => values.reduce((total, value) => total + value, 0);
const integrate = (fn, lower, upper) => {
  const count = 20000;
  const spacing = (upper - lower) / count;
  let result = fn(lower) + fn(upper);
  for (let index = 1; index < count; index++) result += (index % 2 ? 4 : 2) * fn(lower + index * spacing);
  return result * spacing / 3;
};
const clockText = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const decodeCaption = value => value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const parseTime = value => {
  assert.match(value, /^\d{2,}:\d{2}:\d{2}\.\d{3}$/);
  const [hours, minutes, seconds] = value.split(':').map(Number);
  assert.ok(minutes < 60 && seconds < 60);
  return hours * 3600 + minutes * 60 + seconds;
};

test('exact public API, original lessons and additional substantive visual scenes', () => {
  assert.deepEqual(Object.keys(api).sort(), ['ANIMATIONS', 'animationDuration', 'buildVtt', 'createLessonAnimation', 'mountAnimation'].sort());
  assert.deepEqual(ANIMATIONS.map(animation => animation.id), [...expectedIds, ...newIds]);
  assert.equal(ANIMATIONS.length, 28);
  assert.equal(sum(ANIMATIONS.slice(0, 14).map(animation => animation.steps.length)), 71);
  assert.equal(sum(ANIMATIONS.slice(14).map(animation => animation.steps.length)), newIds.length * 5);
  const kinds = new Set(['bars', 'curve', 'dots', 'matrix', 'scatter']);
  for (const animation of ANIMATIONS) {
    assert.ok(animation.title.length > 10);
    assert.ok(animation.steps.length >= 5 && animation.steps.length <= 8);
    assert.equal(new Set(animation.steps.map(step => step.title)).size, animation.steps.length);
    for (const step of animation.steps) {
      assert.equal(typeof step.title, 'string');
      assert.ok(step.caption.length > 100);
      assert.match(step.caption, /\d/);
      assert.ok(Number.isFinite(step.duration) && step.duration >= 5);
      assert.ok(step.caption.split(/\s+/).length / step.duration <= 2.5);
      if (newIds.includes(animation.id)) assert.equal(step.duration, Math.max(10, Math.ceil(step.caption.split(/\s+/).length / 2.5)));
      assert.ok(kinds.has(step.kind));
      assert.equal(typeof step.data, 'object');
      assert.ok(step.data && !Array.isArray(step.data));
      if (step.tex !== undefined) {
        assert.equal(typeof step.tex, 'string');
        assert.doesNotMatch(step.tex, /[\u0000-\u001f]/);
      }
      if (step.kind === 'bars') {
        assert.equal(step.data.labels.length, step.data.values.length);
        assert.ok(step.data.values.every(value => Number.isFinite(value) && value >= 0));
      }
    }
    assert.equal(animationDuration(animation.id), sum(animation.steps.map(step => step.duration)));
    assert.ok(new Set(animation.steps.map(step => JSON.stringify(step.data))).size >= 4);
  }
});

test('WebVTT cues preserve the narration captions and contiguous scene timing', () => {
  for (const animation of ANIMATIONS) {
    const vtt = buildVtt(animation.id);
    assert.ok(vtt.startsWith('WEBVTT\n\n'));
    const cues = vtt.trimEnd().split('\n\n').slice(1);
    assert.equal(cues.length, animation.steps.length);
    let previousEnd = 0;
    cues.forEach((cue, index) => {
      const [identifier, timing, ...lines] = cue.split('\n');
      assert.equal(identifier, String(index + 1));
      const [start, end] = timing.split(' --> ').map(parseTime);
      close(start, previousEnd);
      close(end - start, animation.steps[index].duration);
      assert.ok(end > start);
      assert.equal(decodeCaption(lines.join('\n')), animation.steps[index].caption);
      previousEnd = end;
    });
    close(previousEnd, animationDuration(animation.id));
  }
  const step = lesson('math').steps[0];
  const original = step.caption;
  try {
    step.caption = 'Texto <literal> & una flecha --> sin etiquetas';
    assert.ok(!buildVtt('math').split('\n')[4].includes('<literal>'));
    assert.equal(decodeCaption(buildVtt('math').split('\n')[4]), step.caption);
  } finally { step.caption = original; }
});

test('malformed identifiers fail consistently without requiring a DOM', () => {
  for (const id of ['', 'unknown', 'Math', ' math', 'constructor', '__proto__', null, undefined, 1, {}, ['math']]) {
    assert.throws(() => animationDuration(id), RangeError);
    assert.throws(() => buildVtt(id), RangeError);
    assert.throws(() => mountAnimation(null, id), RangeError);
  }
  assert.throws(() => mountAnimation(null, 'math'), TypeError);
});

test('module initialization and VTT generation do not access a runtime jStat global', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'jStat');
  try {
    Object.defineProperty(globalThis, 'jStat', {configurable: true, get() { throw new Error('jStat unavailable during import'); }});
    const isolated = await import('../../pages/inferencia/animations.js?without-jstat');
    assert.deepEqual(isolated.ANIMATIONS.map(animation => animation.id), [...expectedIds, ...newIds]);
    for (const id of newIds) assert.equal(isolated.buildVtt(id), buildVtt(id));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'jStat', descriptor);
    else delete globalThis.jStat;
  }
});

test('arithmetic, events, Bayes and discrete variables match their worked captions', () => {
  close(sum(data('math', 0).values), 60);
  close(sum(data('math', 1).values), 1);
  assert.deepEqual(data('math', 2).values, [10, 20, 40, 80]);
  close(Math.log2(data('math', 3).values.at(-1)), data('math', 3).solution);
  close(sum(data('math', 4).values) / 3, data('math', 4).mean);
  lesson('events').steps.forEach(step => close(sum(step.data.groups.map(group => group.count)), 100));
  const selectedCount = step => sum(step.data.groups.filter(group => group.selected).map(group => group.count));
  close(selectedCount(lesson('events').steps[1]) / 100, 0.4);
  close(selectedCount(lesson('events').steps[2]) / 100, 0.1);
  close(selectedCount(lesson('events').steps[3]) / 100, 0.6);
  close(data('events', 4).numerator / data('events', 4).denominator, 0.25);
  const groups = data('bayes', 0).groups.map(group => group.count);
  assert.deepEqual(groups, [90, 10, 45, 855]);
  close(sum(groups), 1000);
  close(groups[0] / (groups[0] + groups[1]), data('bayes', 1).sensitivity);
  close(groups[3] / (groups[2] + groups[3]), data('bayes', 2).specificity);
  close((groups[0] + groups[2]) / 1000, data('bayes', 3).probability);
  close(groups[0] / (groups[0] + groups[2]), data('bayes', 4).posterior);
  close(data('bayes', 5).posterior, 2 / 13);
  close(data('bayes', 5).values[0], 1000 * 0.01 * 0.9);
  close(data('bayes', 5).values[1], 1000 * 0.99 * 0.05);
  close(sum(data('variable', 0).values), 1);
  assert.deepEqual(data('variable', 1).values, data('variable', 1).labels.map(label => sum([...label].map(Number))));
  assert.deepEqual(data('variable', 2).values, [0.125, 0.375, 0.375, 0.125]);
  close(sum(data('variable', 2).values.slice(2)), data('variable', 3).probability);
  data('variable', 4).values.forEach((value, index) => close(value, sum(data('variable', 2).values.slice(0, index + 1))));
});

test('densities, moments and distribution probabilities are quantitatively coherent', () => {
  close(data('density', 0).height * 10, 1);
  for (const index of [1, 2]) {
    const uniform = data('density', index);
    close((uniform.interval[1] - uniform.interval[0]) / 10, uniform.probability);
  }
  close(data('density', 3).probability, 0);
  close(data('density', 4).marker / 10, data('density', 4).probability);
  const probabilities = data('expectation', 0).values;
  close(sum(probabilities), 1);
  close(sum(probabilities.map((value, index) => value * index)), data('expectation', 1).expectation);
  close(sum(probabilities.map((value, index) => value * index ** 2)), data('expectation', 2).secondMoment);
  close(sum(data('expectation', 3).values), data('expectation', 3).variance);
  close(data('expectation', 3).sd ** 2, 0.5);
  close(sum(probabilities.map((value, index) => value * [3, 5, 7][index])), data('expectation', 4).expectation);
  const binomial = data('binomial', 1);
  close(sum(binomial.values), 1);
  close(binomial.values[2], 0.324135);
  close(sum(binomial.values.slice(1)), data('binomial', 3).probability);
  close(sum(binomial.values.map((value, index) => value * index)), 1.8);
  close(sum(binomial.values.map((value, index) => value * (index - 1.8) ** 2)), 1.26);
  for (const step of lesson('poisson').steps) {
    close(step.data.values[0], Math.exp(-step.data.rate));
    step.data.values.slice(1).forEach((value, index) => close(value, step.data.values[index] * step.data.rate / (index + 1)));
    assert.ok(sum(step.data.values) < 1);
    if (step.data.tail !== undefined) close(sum(step.data.values) + step.data.tail, 1);
  }
  close(data('poisson', 2).probability, 2 * Math.exp(-2));
  close(data('poisson', 3).rate, data('poisson', 3).volume * data('poisson', 3).intensity);
  close(data('normal', 0).sd ** 2, data('normal', 0).variance);
  close(data('normal', 1).probability, 0.6826894921370859);
  close(data('normal', 2).probability, 0.9772498680518208);
  close(data('normal', 3).probability, data('normal', 1).probability);
  close(data('normal', 4).probability, 0.9544997361036416);
  const normalIntegral = (mean, sd, lower, upper) => {
    const intervals = 20000;
    const spacing = (upper - lower) / intervals;
    const density = value => Math.exp(-0.5 * ((value - mean) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
    let weighted = density(lower) + density(upper);
    for (let index = 1; index < intervals; index++) weighted += (index % 2 ? 4 : 2) * density(lower + index * spacing);
    return weighted * spacing / 3;
  };
  for (const index of [1, 2, 3, 4]) {
    const curve = data('normal', index);
    const lower = index === 2 ? curve.mean - 10 * curve.sd : curve.interval[0];
    close(normalIntegral(curve.mean, curve.sd, lower, curve.interval[1]), curve.probability, 1e-8);
  }
  const prediction = data('models', 3);
  close(normalIntegral(prediction.mean, prediction.sd, ...prediction.interval), prediction.probability, 1e-8);
});

test('joint probabilities, independence and nonlinear zero covariance', () => {
  for (const id of ['joint', 'independence']) {
    for (const step of lesson(id).steps) close(sum(step.data.values.flat()), 1);
  }
  assert.deepEqual(data('joint', 0).values.map(sum), [0.5, 0.5]);
  close(sum(data('joint', 0).values.map(row => row[1])), 0.6);
  close(data('joint', 4).values[0][1], 0.4 / data('joint', 4).denominator);
  const independent = data('independence', 0).values;
  independent.forEach(row => row.forEach((value, column) => close(value, sum(row) * sum(independent.map(other => other[column])))));
  close(data('independence', 2).values[0][1], 0.6);
  assert.notEqual(data('independence', 3).conditionalProbability, data('independence', 3).marginalProbability);
  const positive = data('covariance', 0);
  close(positive.meanX, 2);
  close(positive.meanY, 4);
  close(positive.covariance, 4 / 3);
  close(data('covariance', 1).covariance, positive.covariance);
  close(data('covariance', 2).covariance, -4 / 3);
  close(data('covariance', 2).correlation, -1);
  close(data('covariance', 3).covariance, 40 / 3);
  close(data('covariance', 3).correlation, 1);
  close(data('covariance', 4).covariance, 0);
  data('covariance', 4).points.forEach(point => close(point[1], point[0] ** 2));
});

test('sampling enumeration and normal maximum likelihood are correct', () => {
  const twoMeans = data('sampling', 1).values.flat();
  const population = [8, 10, 12];
  assert.deepEqual(twoMeans, population.flatMap(first => population.map(second => (first + second) / 2)));
  const fourMeans = population.flatMap(first => population.flatMap(second => population.flatMap(third => population.map(fourth => (first + second + third + fourth) / 4))));
  for (const [index, enumerated] of [[2, twoMeans], [3, fourMeans]]) {
    const distribution = data('sampling', index);
    close(sum(distribution.values), 1);
    distribution.xValues.forEach((value, position) => close(distribution.values[position], enumerated.filter(mean => mean === value).length / enumerated.length));
    close(sum(distribution.values.map((value, position) => value * distribution.xValues[position])), 10);
    close(sum(distribution.values.map((value, position) => value * (distribution.xValues[position] - 10) ** 2)), distribution.variance);
    close(distribution.standardError ** 2, (8 / 3) / distribution.sampleSize);
  }
  const clt = data('sampling', 4);
  assert.equal(clt.approximate, true);
  close(clt.sd ** 2, (8 / 3) / 36);
  close(clt.interval[1] - 10, 1.96 * clt.standardError);
  const observations = data('models', 0).sample;
  close(sum(observations) / observations.length, data('models', 2).mean);
  close(sum(observations.map(value => (value - 10) ** 2)), data('models', 2).sumSquares);
  close(data('models', 2).variance, 2);
  close(data('models', 2).unbiasedVariance, 2.5);
  close(data('models', 1).ratioAt9, Math.exp(-5 / 4));
  const changed = data('models', 4);
  close(sum(changed.sample) / changed.sample.length, changed.mean);
  close(sum(changed.sample.map(value => (value - changed.mean) ** 2)) / changed.sample.length, changed.variance);
});

test('new algebra, calculus, CDF and transformed moments match exact references', () => {
  close(sum(data('algebra', 0).values), 12);
  close(sum(data('algebra', 1).values), 1);
  data('algebra', 1).values.forEach((value, index) => close(value, data('algebra', 0).values[index] / 12));
  data('algebra', 3).values.forEach((value, index) => close(value, -Math.log(data('algebra', 2).values[index])));
  data('algebra', 4).values.forEach((value, index) => close(Math.exp(-value / 4), data('algebra', 4).survivals[index]));
  for (const index of [0, 1, 2]) {
    const current = data('calculus', index);
    const {lower, upper, count} = current.rectangles;
    const spacing = (upper - lower) / count;
    close(sum(Array.from({length: count}, (_, position) => (lower + position * spacing) / 2 * spacing)), current.approximation);
    close(current.approximation, (count - 1) / (4 * count));
  }
  close(data('calculus', 3).probability, 1 / 4);
  close(data('calculus', 4).probability, data('calculus', 4).marker ** 2 / 4);
  close(data('calculus', 4).density, data('calculus', 4).marker / 2);
  const distribution = data('cdf', 1);
  const cdf = value => sum(data('cdf', 0).values.filter((_, index) => distribution.support[index] <= value));
  distribution.cumulative.forEach((value, index) => close(value, cdf(distribution.support[index])));
  for (const index of [1, 2, 3, 4]) close(data('cdf', index).probability, cdf(data('cdf', index).marker));
  close(data('cdf', 2).jump, cdf(2) - cdf(2 - 1e-6));
  close(data('cdf', 3).intervalProbability, cdf(4) - cdf(0));
  assert.equal(data('cdf', 4).quantile, distribution.support.find(value => cdf(value) >= 0.8));
  close(sum(data('moments', 1).values), 2);
  close(sum(data('moments', 2).values), 5);
  close(data('moments', 2).variance, 1);
  close(data('moments', 3).expectation, 3 * 2 + 2);
  close(data('moments', 3).variance, 3 ** 2);
  close(data('moments', 4).expectation, 5);
  close(data('moments', 4).fourthMoment, (1 ** 4 + 3 ** 4) / 2);
  close(data('moments', 4).variance, 41 - 5 ** 2);
});

test('combinatorial routes and hypergeometric PMFs enumerate real integer subsets', () => {
  for (const index of [0, 1, 2]) close(sum(data('combinatorics', index).values.flat()), [16, 12, 6][index]);
  assert.deepEqual(data('combinatorics', 3).labels, ['AABB', 'ABAB', 'ABBA', 'BAAB', 'BABA', 'BBAA']);
  close(data('combinatorics', 4).probabilityValue, 1 / 6);
  for (const [index, size] of [[2, 4], [4, 6]]) {
    const distribution = data('hypergeometric', index);
    const samples = Array.from({length: 256}, (_, mask) => Array.from({length: 8}, (_, position) => position).filter(position => mask & (1 << position))).filter(sample => sample.length === size);
    assert.equal(samples.length, size === 4 ? 70 : 28);
    const counts = distribution.support.map(value => samples.filter(sample => sample.filter(position => position < 3).length === value).length);
    assert.ok(counts.every(Number.isInteger));
    assert.deepEqual(counts, size === 4 ? [5, 30, 30, 5] : [3, 15, 10]);
    counts.forEach((count, position) => close(distribution.values[position], count / samples.length));
    close(sum(distribution.values), 1);
    const mean = sum(distribution.values.map((value, position) => value * distribution.support[position]));
    const variance = sum(distribution.values.map((value, position) => value * (distribution.support[position] - mean) ** 2));
    close(mean, size === 4 ? data('hypergeometric', 3).expectation : distribution.expectation);
    close(variance, size === 4 ? data('hypergeometric', 3).variance : distribution.variance);
  }
  assert.deepEqual(data('hypergeometric', 1).values, [5, 30, 30, 5]);
  close(data('hypergeometric', 3).variance / data('hypergeometric', 3).binomialVariance, 4 / 7);
});

test('geometric conventions, negative-binomial enumeration and omitted tails are exact', () => {
  const geometric = data('geometric-negative', 0);
  geometric.values.forEach((value, count) => close(value, 2 ** -(count + 1)));
  close(sum(geometric.values) + geometric.tail, 1);
  close(data('geometric-negative', 1).probability, geometric.values[2]);
  assert.deepEqual(data('geometric-negative', 2).labels, ['1', '2', '3', '4', '5', '6', '7', '8']);
  close(data('geometric-negative', 2).conditionalSurvival, 0.5 ** 4 / 0.5 ** 2);
  const negative = data('geometric-negative', 3);
  negative.values.forEach((value, count) => {
    const length = count + 2;
    const prefixes = Array.from({length: 2 ** (length - 1)}, (_, bits) => bits).filter(bits => bits.toString(2).replace(/0/g, '').length === 1);
    close(value, prefixes.length / 2 ** length);
  });
  close(sum(negative.values) + negative.tail, 1);
  close(negative.probability, 3 / 16);
  assert.deepEqual(data('geometric-negative', 4).values, [1, 2, 2, 4]);
});

test('exponential, Erlang and Weibull density areas agree with analytic references', () => {
  for (const index of [0, 4]) {
    const current = data('exponential', index);
    close(current.scale, 1 / current.rate);
    close(current.expectation, current.scale);
    close(current.variance, current.scale ** 2);
    close(integrate(value => current.rate * Math.exp(-current.rate * value), ...current.domain) + current.tail, 1, 1e-8);
  }
  for (const index of [1, 2, 3]) {
    const current = data('exponential', index);
    const [lower, upper] = current.interval;
    close(integrate(value => current.rate * Math.exp(-current.rate * value), lower, upper) + (current.tail || 0), current.probability, 1e-8);
  }
  close(data('exponential', 3).probability, Math.exp(-0.4 * 7.5) / Math.exp(-0.4 * 5));
  for (const index of [1, 2, 3, 4]) {
    const current = data('gamma', index);
    assert.equal(current.shape, 2);
    close(current.scale, 1 / current.rate);
    const pdf = value => current.rate ** 2 * value * Math.exp(-current.rate * value);
    const cdf = value => 1 - Math.exp(-current.rate * value) * (1 + current.rate * value);
    if (current.expectation !== undefined) {
      close(current.expectation, 2 * current.scale);
      close(current.variance, 2 * current.scale ** 2);
      close(current.mode, current.scale);
    }
    if (current.interval) {
      close(integrate(pdf, ...current.interval) + (current.tail || 0), current.probability, 1e-8);
      close(current.probability, index === 2 ? cdf(4) : 1 - cdf(6));
    } else close(integrate(pdf, ...current.domain) + current.tail, 1, 1e-8);
  }
  for (const index of [3, 4]) {
    const current = data('cauchy-weibull', index);
    const pdf = value => current.shape / current.scale * (value / current.scale) ** (current.shape - 1) * Math.exp(-((value / current.scale) ** current.shape));
    close(integrate(pdf, ...current.domain) + current.tail, 1, 1e-8);
    close(current.survival, Math.exp(-((3 / current.scale) ** current.shape)));
    if (current.hazardTimes) current.hazard.forEach((value, position) => close(value, 2 * current.hazardTimes[position] / 9));
  }
});

test('Cauchy central mass and unnormalized truncated absolute moments are not a finite mean', () => {
  const pdf = value => 1 / (Math.PI * (1 + value ** 2));
  close(integrate(pdf, ...data('cauchy-weibull', 0).domain) + data('cauchy-weibull', 0).tail, 1, 1e-8);
  close(integrate(pdf, ...data('cauchy-weibull', 1).interval), 0.5, 1e-8);
  const truncated = data('cauchy-weibull', 2);
  truncated.bounds.forEach((bound, index) => close(2 * integrate(value => value * pdf(value), 0, bound), truncated.values[index], 1e-8));
  assert.ok(truncated.values.every((value, index) => index === 0 || value > truncated.values[index - 1]));
  assert.ok(data('cauchy-weibull', 0).expectation === undefined);
});

test('trinomial sequence enumeration, binomial marginal and covariance respect a fixed total', () => {
  const probabilities = data('multinomial', 0).values;
  const joint = data('multinomial', 1).values;
  const outcomes = [0, 1, 2].flatMap(first => [0, 1, 2].flatMap(second => [0, 1, 2].map(third => {
    const sequence = [first, second, third];
    return {counts: probabilities.map((_, category) => sequence.filter(value => value === category).length), mass: probabilities[first] * probabilities[second] * probabilities[third]};
  })));
  assert.equal(outcomes.length, 27);
  close(sum(outcomes.map(outcome => outcome.mass)), 1);
  joint.forEach((row, resting) => row.forEach((mass, active) => {
    close(mass, sum(outcomes.filter(outcome => outcome.counts[0] === resting && outcome.counts[1] === active).map(outcome => outcome.mass)));
    if (resting + active > 3) close(mass, 0);
  }));
  close(sum(joint.flat()), 1);
  close(joint[1][1], data('multinomial', 2).probabilityValue);
  assert.equal(outcomes.filter(outcome => outcome.counts.every(value => value === 1)).length, data('multinomial', 2).coefficient);
  data('multinomial', 3).values.forEach((mass, active) => close(mass, sum(joint.map(row => row[active]))));
  const covariance = data('multinomial', 4);
  covariance.means.forEach((mean, category) => close(mean, sum(outcomes.map(outcome => outcome.counts[category] * outcome.mass))));
  covariance.values.forEach((row, first) => row.forEach((value, second) => {
    close(value, sum(outcomes.map(outcome => (outcome.counts[first] - covariance.means[first]) * (outcome.counts[second] - covariance.means[second]) * outcome.mass)));
    close(value, first === second ? 3 * probabilities[first] * (1 - probabilities[first]) : -3 * probabilities[first] * probabilities[second]);
  }));
  covariance.values.forEach(row => close(sum(row), 0));
});

test('continuous triangular regions and normalized conditional cuts have correct areas', () => {
  const area = points => Math.abs(sum(points.map((point, index) => point[0] * points[(index + 1) % points.length][1] - point[1] * points[(index + 1) % points.length][0]))) / 2;
  close(area(data('continuous-joint', 0).points), 2);
  close(data('continuous-joint', 0).density * area(data('continuous-joint', 0).points), 1);
  const subset = data('continuous-joint', 1);
  close(area(subset.subset), subset.subsetArea);
  close(subset.density * subset.subsetArea, subset.probability);
  close(integrate(value => (2 - value) / 2, 0, 2), data('continuous-joint', 2).probability);
  close(integrate(value => value * (2 - value) / 2, 0, 2), data('continuous-joint', 2).expectation);
  for (const index of [3, 4]) {
    const conditional = data('continuous-joint', index);
    close(conditional.support[1], 2 - conditional.knownX);
    close(conditional.marginalDensity, 0.5 * (2 - conditional.knownX));
    close(conditional.density, conditional.jointDensity / conditional.marginalDensity);
    close(conditional.density * conditional.support[1], 1);
    close(conditional.density * (conditional.interval[1] - conditional.interval[0]), conditional.probability);
    close(conditional.expectation, conditional.support[1] / 2);
  }
});

test('joint-normal conditional means, standard deviations and tail references are correct', () => {
  const covariance = data('bivariate-normal', 0);
  close(covariance.values[0][1], 0.6 * 2 * 4);
  close(data('bivariate-normal', 1).sd ** 2, 16);
  for (const index of [2, 3, 4]) {
    const conditional = data('bivariate-normal', index);
    assert.equal(conditional.jointNormal, true);
    close(conditional.mean, conditional.meanY + conditional.rho * conditional.sdY / conditional.sdX * (conditional.knownX - conditional.meanX));
    close(conditional.variance, conditional.sdY ** 2 * (1 - conditional.rho ** 2));
    close(conditional.sd ** 2, conditional.variance);
    close(conditional.sd, 3.2);
    close(conditional.comparison.mean, 30);
    close(conditional.comparison.sd, 4);
    if (conditional.threshold !== undefined) {
      close((conditional.threshold - conditional.mean) / conditional.sd, conditional.z);
      const pdf = value => Math.exp(-0.5 * ((value - conditional.mean) / conditional.sd) ** 2) / (conditional.sd * Math.sqrt(2 * Math.PI));
      close(integrate(pdf, conditional.threshold, conditional.mean + 10 * conditional.sd), conditional.probability, 1e-8);
    }
  }
  close(data('bivariate-normal', 2).mean, 32.4);
  close(data('bivariate-normal', 3).mean, 27.6);
});

test('Poisson likelihood uses fixed data, not parameter probabilities, and MLE is mean three', () => {
  const sample = data('exponential-family', 0).sample;
  assert.deepEqual(sample, [2, 4, 3]);
  close(sum(sample), 9);
  close(sum(sample) / sample.length, 3);
  data('exponential-family', 1).values.forEach((value, index) => close(Math.exp(value), data('exponential-family', 1).candidates[index]));
  const candidates = data('exponential-family', 2);
  const factorials = [2, 24, 6];
  candidates.values.forEach((value, index) => {
    const rate = candidates.candidates[index];
    const independentMasses = sample.map((count, position) => Math.exp(-rate) * rate ** count / factorials[position]);
    close(value, independentMasses.reduce((product, mass) => product * mass, 1));
  });
  assert.notEqual(sum(candidates.values), 1);
  assert.equal(candidates.candidates[candidates.values.indexOf(Math.max(...candidates.values))], 3);
  const curve = data('exponential-family', 3);
  close(curve.count, sample.length);
  close(curve.total, sum(sample));
  close(Math.exp(curve.logFactorials), 288);
  close(curve.mle, curve.total / curve.count);
  close(curve.total / curve.mle - curve.count, 0);
  assert.ok(-curve.total / curve.mle ** 2 < 0);
  const glm = data('exponential-family', 4);
  assert.equal(glm.fitted, false);
  glm.values.forEach((value, dose) => close(value, Math.exp(glm.intercept + glm.slope * dose)));
});

class FakeTarget {
  listeners = new Map();
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
  }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler); }
  dispatch(type) { for (const handler of this.listeners.get(type) || []) handler({type, target: this}); }
  listenerCount() { return sum([...this.listeners.values()].map(handlers => handlers.size)); }
}

class FakeElement extends FakeTarget {
  constructor(tagName, document) {
    super();
    this.tagName = tagName;
    this.ownerDocument = document;
    this.children = [];
    this.attributes = {};
    this.style = {};
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.hidden = false;
    this.disabled = false;
    this.width = 300;
    this.height = 150;
    this.parent = null;
  }
  append(...children) { children.forEach(child => { child.parent = this; this.children.push(child); }); }
  replaceChildren(...children) { this.children.forEach(child => { child.parent = null; }); this.children = []; this.append(...children); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getBoundingClientRect() { return {width: this.ownerDocument.stageWidth, height: this.ownerDocument.stageWidth * 9 / 16}; }
  getContext() { return this.ownerDocument.context; }
  click() {
    if (this.disabled) return;
    if (this.tagName === 'a') this.ownerDocument.downloads.push({name: this.download, url: this.href});
    this.dispatch('click');
  }
  closest() {
    let current = this;
    while (current) { if (current.hidden) return current; current = current.parent; }
    return null;
  }
}

function fakeDom({reducedMotion = false, raf = true, resizeObserver = true, canvas = true, width = 640} = {}) {
  const document = new FakeTarget();
  const view = new FakeTarget();
  let time = 0;
  let handle = 0;
  const frames = new Map();
  const timers = new Map();
  const observers = [];
  const blobs = new Map();
  const revoked = [];
  const calls = [];
  const created = [];
  const context = Object.fromEntries(['setTransform', 'clearRect', 'fillRect', 'strokeRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'fill', 'closePath', 'arc', 'fillText', 'setLineDash'].map(method => [method, (...args) => {
    for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${method} received ${value}`);
    if (method === 'arc') assert.ok(args[2] >= 0);
    calls.push([method, ...args]);
  }]));
  for (const property of ['fillStyle', 'strokeStyle', 'globalAlpha', 'lineWidth', 'font', 'textAlign', 'textBaseline']) {
    let value;
    Object.defineProperty(context, property, {
      get: () => value,
      set: assigned => { value = assigned; calls.push([property, assigned]); }
    });
  }
  context.measureText = text => ({width: String(text).length * 6});
  document.context = canvas ? context : null;
  document.stageWidth = width;
  document.hidden = false;
  document.visibilityState = 'visible';
  document.downloads = [];
  document.createElement = tag => { const node = new FakeElement(tag, document); created.push(node); return node; };
  document.defaultView = view;
  view.performance = {now: () => time};
  view.devicePixelRatio = 2;
  view.matchMedia = () => ({matches: reducedMotion});
  view.setTimeout = (callback, delay) => { const id = ++handle; timers.set(id, {callback, delay}); return id; };
  view.clearTimeout = id => timers.delete(id);
  view.Blob = Blob;
  view.URL = {createObjectURL: blob => { const url = `blob:fake-${++handle}`; blobs.set(url, blob); return url; }, revokeObjectURL: url => { revoked.push(url); blobs.delete(url); }};
  if (raf) {
    view.requestAnimationFrame = callback => { const id = ++handle; frames.set(id, callback); return id; };
    view.cancelAnimationFrame = id => frames.delete(id);
  }
  if (resizeObserver) view.ResizeObserver = class {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
    emit(newWidth) { this.callback([{contentRect: {width: newWidth}}]); }
  };
  const container = document.createElement('div');
  const byLabel = label => created.find(node => node.attributes['aria-label'] === label && node.closest() === null);
  const byTag = tag => created.find(node => node.tagName === tag);
  const advance = milliseconds => {
    time += milliseconds;
    const pending = raf ? [...frames.entries()] : [...timers.entries()].filter(([, timer]) => timer.delay === 33);
    pending.forEach(([id, entry]) => { if (raf) { frames.delete(id); entry(time); } else { timers.delete(id); entry.callback(); } });
  };
  const cleanupCheck = () => {
    assert.equal(frames.size, 0);
    assert.equal(timers.size, 0);
    assert.equal(document.listenerCount(), 0);
    assert.equal(view.listenerCount(), 0);
    assert.ok(created.every(node => node.listenerCount() === 0));
    assert.ok(observers.every(observer => observer.disconnected));
    assert.equal(blobs.size, 0);
  };
  return {document, view, container, frames, timers, observers, blobs, revoked, calls, created, byLabel, byTag, advance, cleanupCheck, setTime: value => { time = value; }};
}

test('new curve families keep analytic peaks and boundary densities inside the plot', () => {
  const original = lesson('density').steps[0].data;
  const families = [
    {family: 'exponential', rate: 2, domain: [0, 4], peakAt: 0, peak: 2, atZero: 2},
    {family: 'gamma', shape: 2, rate: 2, domain: [0, 4], peakAt: 0.5, peak: 2 / Math.E, atZero: 0},
    {family: 'weibull', shape: 1, scale: 0.5, domain: [0, 4], peakAt: 0, peak: 2, atZero: 2},
    {family: 'weibull', shape: 2, scale: 2, domain: [0, 6], peakAt: Math.SQRT2, peak: Math.exp(-0.5) / Math.SQRT2, atZero: 0},
    {family: 'cauchy', location: 0, scale: 0.5, domain: [-4, 4], peakAt: 0, peak: 2 / Math.PI, atZero: 2 / Math.PI},
    {family: 'poisson-likelihood', count: 3, total: 9, logFactorials: Math.log(288), domain: [0, 6], peakAt: 3, peak: Math.exp(-9) * 3 ** 9 / 288, atZero: 0}
  ];
  try {
    for (const width of [320, 900]) {
      for (const candidate of families) {
        lesson('density').steps[0].data = {...candidate, xTitle: 'Valor', yTitle: 'Densidad o verosimilitud'};
        const dom = fakeDom({width});
        const cleanup = mountAnimation(dom.container, 'density');
        const bottom = width * 9 / 16 - 48;
        const peakHeight = bottom - (bottom - 48) / 1.2;
        const curvePoints = dom.calls.filter(call => call[0] === 'lineTo' && call[1] >= 52 && call[1] <= width - 18 && call[2] < bottom);
        assert.ok(curvePoints.length > 10);
        assert.ok(curvePoints.every(call => call[2] >= 48 - 1e-8));
        const select = dom.byLabel('Seleccionar escena');
        dom.calls.length = 0;
        lesson('density').steps[0].data.marker = candidate.peakAt;
        select.value = '0';
        select.dispatch('input');
        const peakX = 52 + (candidate.peakAt - candidate.domain[0]) / (candidate.domain[1] - candidate.domain[0]) * (width - 70);
        assert.ok(dom.calls.some(call => call[0] === 'lineTo' && Math.abs(call[1] - peakX) < 1e-8 && Math.abs(call[2] - peakHeight) < 1e-8));
        dom.calls.length = 0;
        lesson('density').steps[0].data.marker = 0;
        select.dispatch('input');
        const zeroX = 52 + (0 - candidate.domain[0]) / (candidate.domain[1] - candidate.domain[0]) * (width - 70);
        const zeroY = bottom - candidate.atZero / (candidate.peak * 1.2) * (bottom - 48);
        assert.ok(dom.calls.some(call => call[0] === 'lineTo' && Math.abs(call[1] - zeroX) < 1e-8 && Math.abs(call[2] - zeroY) < 1e-8));
        cleanup();
        dom.cleanupCheck();
      }
    }
    lesson('density').steps[0].data = {family: 'step-cdf', support: [0, 2, 4], cumulative: [0.25, 0.75, 1], domain: [-1, 5]};
    const dom = fakeDom();
    const cleanup = mountAnimation(dom.container, 'density');
    assert.equal(dom.calls.filter(call => call[0] === 'arc').length, 7);
    assert.equal(dom.calls.filter(call => call[0] === 'lineTo').length, 11);
    cleanup();
    dom.cleanupCheck();
  } finally { lesson('density').steps[0].data = original; }
});

test('small positive likelihoods remain visibly nonzero and signed covariance keeps its sign', () => {
  const dom = fakeDom({width: 900});
  const cleanup = mountAnimation(dom.container, 'exponential-family');
  const seek = dom.byLabel('Seleccionar escena');
  seek.value = '2';
  dom.calls.length = 0;
  seek.dispatch('input');
  const smallest = data('exponential-family', 2).values[0];
  assert.ok(smallest > 0 && smallest < 0.0005);
  const label = new Intl.NumberFormat('es-ES', {maximumSignificantDigits: 3}).format(smallest);
  assert.ok(dom.calls.some(call => call[0] === 'fillText' && call[1] === label));
  cleanup();
  dom.cleanupCheck();
  const signed = fakeDom();
  const dispose = mountAnimation(signed.container, 'multinomial');
  const slider = signed.byLabel('Seleccionar escena');
  slider.value = '4';
  signed.calls.length = 0;
  slider.dispatch('input');
  assert.ok(signed.calls.some(call => call[0] === 'fillStyle' && String(call[1]).startsWith('rgba(190, 18, 60')));
  assert.ok(signed.calls.some(call => call[0] === 'fillText' && call[1] === '-0,375'));
  dispose();
  signed.cleanupCheck();
});

test('all scene kinds render changing, finite canvas geometry on desktop and mobile', () => {
  for (const width of [320, 900]) {
    for (const animation of ANIMATIONS) {
      const dom = fakeDom({width});
      const cleanup = mountAnimation(dom.container, animation.id);
      const seek = dom.byLabel('Seleccionar escena');
      const snapshots = [];
      for (let index = 0; index < animation.steps.length; index++) {
        dom.calls.length = 0;
        seek.value = String(index);
        seek.dispatch('input');
        assert.equal(dom.byTag('canvas').textContent, animation.steps[index].caption);
        snapshots.push(JSON.stringify(dom.calls.filter(call => call[0] !== 'fillText')));
        assert.ok(dom.calls.some(call => ['arc', 'lineTo', 'strokeRect'].includes(call[0])));
      }
      assert.ok(new Set(snapshots).size >= 3, `${animation.id}: figures actually change`);
      seek.value = '0';
      dom.calls.length = 0;
      seek.dispatch('input');
      const before = JSON.stringify(dom.calls);
      dom.calls.length = 0;
      dom.byLabel('Reproducir').click();
      dom.advance(animation.steps[0].duration * 500);
      assert.notEqual(JSON.stringify(dom.calls), before);
      assert.equal(dom.frames.size, 1);
      cleanup();
      dom.cleanupCheck();
    }
  }
});

test('manual play, pause, speed, seek, boundaries, reset and completion', () => {
  const dom = fakeDom();
  const cleanup = mountAnimation(dom.container, 'math');
  const durations = lesson('math').steps.map(step => step.duration);
  const total = animationDuration('math');
  const play = dom.byLabel('Reproducir');
  const pause = dom.byLabel('Pausar');
  const seek = dom.byLabel('Seleccionar escena');
  const speed = dom.byLabel('Velocidad de reproducción');
  const position = dom.byLabel('Escena actual y total');
  assert.equal(dom.frames.size, 0);
  assert.equal(pause.disabled, true);
  assert.equal(dom.byLabel('Escena anterior').disabled, true);
  assert.equal(seek.max, '4');
  play.click();
  play.click();
  assert.equal(dom.frames.size, 1);
  dom.advance(3000);
  pause.click();
  assert.equal(dom.frames.size, 0);
  dom.advance(20000);
  assert.equal(seek.value, '0');
  play.click();
  dom.advance((durations[0] - 3) * 1000);
  assert.equal(seek.value, '1');
  assert.equal(position.textContent, 'Escena 2 de 5');
  speed.value = '2';
  speed.dispatch('change');
  dom.advance(durations[1] * 500);
  assert.equal(seek.value, '2');
  seek.value = '3';
  seek.dispatch('input');
  assert.equal(dom.frames.size, 1);
  assert.equal(dom.byLabel('Tiempo de la lección').textContent, `${clockText(sum(durations.slice(0, 3)))} / ${clockText(total)}`);
  dom.advance(2500);
  pause.click();
  assert.equal(dom.byLabel('Tiempo de la lección').textContent, `${clockText(sum(durations.slice(0, 3)) + 5)} / ${clockText(total)}`);
  dom.byLabel('Escena anterior').click();
  assert.equal(seek.value, '2');
  dom.byLabel('Escena siguiente').click();
  assert.equal(seek.value, '3');
  dom.byLabel('Reiniciar').click();
  assert.equal(seek.value, '0');
  assert.equal(dom.frames.size, 0);
  play.click();
  dom.advance(total * 500);
  assert.equal(seek.value, '4');
  assert.equal(dom.byLabel('Tiempo de la lección').textContent, `${clockText(total)} / ${clockText(total)}`);
  assert.equal(dom.frames.size, 0);
  assert.equal(pause.disabled, true);
  assert.equal(dom.byLabel('Escena siguiente').disabled, true);
  play.click();
  assert.equal(seek.value, '0');
  assert.equal(dom.frames.size, 1);
  seek.value = '-1';
  seek.dispatch('input');
  assert.equal(seek.value, '0');
  speed.value = '0';
  speed.dispatch('change');
  assert.equal(speed.value, '2');
  cleanup();
  cleanup();
  play.dispatch('click');
  dom.advance(100000);
  dom.cleanupCheck();
});

test('account for elapsed time at the old speed before a speed change', () => {
  const dom = fakeDom();
  const cleanup = mountAnimation(dom.container, 'math');
  dom.byLabel('Reproducir').click();
  dom.setTime(4000);
  const speed = dom.byLabel('Velocidad de reproducción');
  speed.value = '2';
  speed.dispatch('change');
  dom.advance((lesson('math').steps[0].duration - 4) * 500);
  assert.equal(dom.byLabel('Seleccionar escena').value, '1');
  close(Number(dom.byLabel('Seleccionar escena').value), 1);
  cleanup();
  dom.cleanupCheck();
});

test('visibility pauses without resuming; reduced motion never autoplays', () => {
  const dom = fakeDom({reducedMotion: true});
  const cleanup = mountAnimation(dom.container, 'math');
  assert.equal(dom.frames.size, 0);
  dom.byLabel('Reproducir').click();
  dom.advance(1000);
  const count = dom.calls.length;
  dom.advance(1000);
  assert.equal(dom.calls.length, count, 'reduced motion does not redraw a moving tracer');
  dom.document.hidden = true;
  dom.document.visibilityState = 'hidden';
  dom.document.dispatch('visibilitychange');
  assert.equal(dom.frames.size, 0);
  dom.advance(30000);
  dom.document.hidden = false;
  dom.document.visibilityState = 'visible';
  dom.document.dispatch('visibilitychange');
  assert.equal(dom.frames.size, 0);
  assert.equal(dom.byLabel('Tiempo de la lección').textContent, `0:02 / ${clockText(animationDuration('math'))}`);
  dom.byLabel('Reproducir').click();
  const beforeTransition = dom.calls.length;
  dom.advance((lesson('math').steps[0].duration - 2) * 1000 + 400);
  assert.equal(dom.byLabel('Seleccionar escena').value, '1');
  assert.ok(dom.calls.length > beforeTransition, 'reduced motion still renders every new scene');
  dom.container.hidden = true;
  dom.advance(500);
  assert.equal(dom.frames.size, 0);
  cleanup();
  dom.cleanupCheck();
});

test('DPR sizing is stable, resize fallback and timer fallback clean up', () => {
  const dom = fakeDom();
  const cleanup = mountAnimation(dom.container, 'normal');
  const canvas = dom.byTag('canvas');
  assert.equal(canvas.width, 1280);
  assert.equal(canvas.height, 720);
  const observer = dom.observers[0];
  observer.emit(320);
  assert.equal(canvas.width, 640);
  assert.equal(canvas.height, 360);
  observer.emit(320);
  assert.equal(canvas.width, 640);
  dom.view.devicePixelRatio = 10;
  observer.emit(320);
  assert.equal(canvas.width, 960);
  cleanup();
  observer.emit(1000);
  assert.equal(canvas.width, 960);
  dom.cleanupCheck();
  const fallback = fakeDom({raf: false, resizeObserver: false});
  const fallbackCleanup = mountAnimation(fallback.container, 'density');
  assert.equal(fallback.view.listenerCount(), 2);
  fallback.byLabel('Reproducir').click();
  assert.equal(fallback.timers.size, 1);
  fallback.advance(lesson('density').steps[0].duration * 1000);
  assert.equal(fallback.byLabel('Seleccionar escena').value, '1');
  fallback.document.stageWidth = 400;
  fallback.view.dispatch('resize');
  assert.equal(fallback.byTag('canvas').width, 800);
  fallbackCleanup();
  fallback.cleanupCheck();
});

test('las clases sincronizan frases y diapositivas, también con movimiento reducido, y limpian el modo ampliado', () => {
  const lecture = fullLectures()[0];
  for (const reducedMotion of [false,true]) {
    const dom = fakeDom({reducedMotion});
    dom.view.innerWidth=320;
    const cleanup = mountAnimation(dom.container,lecture);
    const caption = dom.created.find(node=>node.className==='animation-caption');
    const board = dom.created.find(node=>node.className==='slide-board');
    assert.equal(caption.textContent,lecture.steps[0].cues[0].text);
    assert.equal(board.hidden,false);
    assert.equal(dom.byTag('canvas').style.display,'none');
    dom.byLabel('Reproducir').click();
    dom.advance(lecture.steps[0].cues[0].end*1000+10);
    assert.equal(caption.textContent,lecture.steps[0].cues[1].text);
    assert.equal(board.children[2].children[1].attributes['data-active'],'true');
    dom.byLabel('Pausar').click();
    const paused=caption.textContent;
    dom.advance(60000);
    assert.equal(caption.textContent,paused);
    assert.ok(dom.container.children[0].className.includes('is-focused'));
    for (const handler of dom.view.listeners.get('keydown')) handler({key:'Escape'});
    assert.equal(dom.container.children[0].className,'animation-player');
    dom.byLabel('Reiniciar').click();
    assert.equal(caption.textContent,lecture.steps[0].cues[0].text);
    const outline = dom.byLabel('Ir a una parte de la clase');
    outline.value='2';
    outline.dispatch('change');
    assert.equal(dom.byLabel('Seleccionar escena').value,'2');
    assert.equal(caption.textContent,lecture.steps[2].cues[0].text);
    cleanup();
    dom.cleanupCheck();
  }
});

test('transcript is exact, math fallback is text, downloads are separate and URLs revoked', async () => {
  const dom = fakeDom();
  const cleanup = mountAnimation(dom.container, 'models', {formatMath: () => { throw new Error('KaTeX unavailable'); }});
  const transcript = dom.created.find(node => node.tagName === 'ol');
  assert.deepEqual(transcript.children.map(item => item.children[1].textContent), lesson('models').steps.map(step => step.caption));
  const math = dom.created.find(node => node.className === 'animation-math');
  assert.equal(math.textContent, lesson('models').steps[0].tex);
  assert.equal(math.innerHTML, '');
  dom.byLabel('Descargar subtítulos WebVTT').click();
  dom.byLabel('Descargar guion de narración').click();
  const [vtt, txt] = dom.document.downloads;
  assert.equal(vtt.name, 'models.vtt');
  assert.equal(txt.name, 'models.txt');
  assert.equal(await dom.blobs.get(vtt.url).text(), buildVtt('models'));
  assert.equal(await dom.blobs.get(txt.url).text(), lesson('models').steps.map(step => step.caption).join('\n\n'));
  assert.equal(dom.timers.size, 2);
  cleanup();
  assert.equal(dom.revoked.length, 2);
  dom.cleanupCheck();
  const missingCanvas = fakeDom({canvas: false});
  const missingCleanup = mountAnimation(missingCanvas.container, 'bayes');
  assert.equal(missingCanvas.byTag('canvas').textContent, lesson('bayes').steps[0].caption);
  missingCanvas.byLabel('Reproducir').click();
  missingCanvas.advance(lesson('bayes').steps[0].duration * 1000);
  assert.equal(missingCanvas.byTag('canvas').textContent, lesson('bayes').steps[1].caption);
  missingCleanup();
  missingCanvas.cleanupCheck();
});

test('remounting disposes the prior lesson, and cleanup preserves unrelated replacement content', () => {
  const dom = fakeDom();
  const firstCleanup = mountAnimation(dom.container, 'math');
  dom.byLabel('Reproducir').click();
  const secondCleanup = mountAnimation(dom.container, 'events', {formatMath: tex => `<span class="katex">${tex}</span>`});
  assert.equal(dom.frames.size, 0);
  assert.equal(dom.observers[0].disconnected, true);
  assert.equal(dom.container.children.length, 1);
  const math = dom.created.filter(node => node.className === 'animation-math').at(-1);
  assert.match(math.innerHTML, /^<span class="katex">/);
  firstCleanup();
  assert.equal(dom.container.children.length, 1);
  const unrelated = dom.document.createElement('p');
  dom.container.replaceChildren(unrelated);
  secondCleanup();
  assert.deepEqual(dom.container.children, [unrelated]);
  dom.cleanupCheck();
});