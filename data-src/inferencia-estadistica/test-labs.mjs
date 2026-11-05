import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {LAB_IDS, LAB_GUIDES, calculateLab, mountLab} from '../../pages/inferencia/labs.js';

globalThis.jStat = createRequire(import.meta.url)('../../pages/inferencia/vendor/jstat.min.js').jStat;
const close = (actual, expected, tolerance = 1e-9) => assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}`);
const sum = values => values.reduce((total, value) => total + value, 0);
const metricValue = (lab, label) => lab.metrics.find(item => item.label === label)?.value;
const probability = (family, params = {}) => calculateLab('models', {family, ...params}).visual.probability;
const families = ['bernoulli', 'binomial', 'geometric', 'negative-binomial', 'hypergeometric', 'poisson', 'discrete-uniform', 'uniform', 'exponential', 'gamma', 'normal', 'chi-square', 'student', 'fisher', 'cauchy', 'weibull'];

test('Contrato: catorce laboratorios, resultados puros y sin mutar los parámetros', () => {
  assert.deepEqual(LAB_IDS, ['math', 'events', 'bayes', 'variable', 'density', 'expectation', 'binomial', 'poisson', 'normal', 'joint', 'independence', 'covariance', 'sampling', 'models', 'multinomial', 'continuous-joint', 'bivariate-normal']);
  assert.ok(Object.isFrozen(LAB_IDS));
  for (const id of LAB_IDS) {
    assert.ok(LAB_GUIDES[id].length === 5 && LAB_GUIDES[id].every(text => text.length > 40), id);
    const lab = calculateLab(id);
    assert.deepEqual(Object.keys(lab).sort(), ['explanation', 'metrics', 'title', 'visual']);
    assert.ok(lab.title.length > 5 && lab.explanation.length > 100, id);
    assert.ok(lab.metrics.length >= 3);
    for (const item of lab.metrics) {
      assert.ok(typeof item.label === 'string' && item.label.length > 0);
      assert.ok(item.value === null || Number.isFinite(item.value), `${id}: ${item.label}`);
    }
    assert.ok(lab.visual.domain[1] > lab.visual.domain[0]);
    assert.ok(lab.visual.xTitle && lab.visual.yTitle && lab.visual.legend);
    assert.deepEqual(calculateLab(id), lab, id);
  }
  const params = Object.freeze({weights: Object.freeze([3, 2, 1, 4]), row: 0});
  calculateLab('joint', params);
  assert.deepEqual(params.weights, [3, 2, 1, 4]);
  assert.equal(typeof mountLab, 'function');
});

test('Laboratorios específicos: multinomial, soporte triangular y normal condicional', () => {
  const multinomial = calculateLab('multinomial');
  close(sum(multinomial.visual.probabilities), 1);
  close(multinomial.visual.probabilities[5], 0.1875);
  close(multinomial.visual.covariance, -0.375);
  multinomial.visual.probabilities.forEach((mass,index) => { if (Math.floor(index/4)+index%4>3) close(mass,0); });
  const triangle = calculateLab('continuous-joint',{limit:2,knownX:0.5,threshold:0.8});
  close(triangle.visual.density,0.5);
  close(triangle.visual.marginal,0.75);
  close(triangle.visual.probability,0.7/1.5);
  assert.throws(()=>calculateLab('continuous-joint',{knownX:2}),RangeError);
  close(calculateLab('continuous-joint',{threshold:5}).visual.probability,0);
  const normal = calculateLab('bivariate-normal');
  close(normal.visual.mean,32.4);
  close(normal.visual.variance,10.24);
  close(normal.visual.sd,3.2);
  close(normal.visual.probability,globalThis.jStat.normal.cdf(-35,-32.4,3.2));
  const uncorrelated = calculateLab('bivariate-normal',{rho:0});
  close(uncorrelated.visual.mean,30);
  close(uncorrelated.visual.variance,16);
  assert.throws(()=>calculateLab('bivariate-normal',{rho:1}),RangeError);
});

test('Integral: constante, lineal, cuadrática, intervalo nulo y altura cero', () => {
  close(calculateLab('math', {function: 'constant'}).visual.area, 3);
  close(calculateLab('math').visual.area, (25 - 4) / 20);
  close(calculateLab('math', {function: 'quadratic'}).visual.area, (125 - 8) / 300);
  close(calculateLab('math', {lower: 0, upper: 10, height: 5}).visual.area, 25);
  close(calculateLab('math', {lower: 4, upper: 4}).visual.area, 0);
  const zero = calculateLab('math', {height: 0});
  assert.equal(metricValue(zero, 'Fracción de área'), null);
});

test('Sucesos: regiones normalizadas, operaciones y denominador condicionado', () => {
  const weights = [30, 20, 10, 40];
  for (const [operation, expected] of [['A', 0.4], ['B', 0.3], ['union', 0.6], ['intersection', 0.1], ['complement', 0.6]]) close(calculateLab('events', {weights, operation}).visual.probability, expected);
  const lab = calculateLab('events', {operation: 'B', condition: 'A'});
  close(lab.visual.probability, 0.25);
  close(lab.visual.denominator, 0.4);
  close(lab.visual.numerator, 0.1);
  close(calculateLab('events', {operation: 'union', condition: 'A'}).visual.probability, 1);
  close(calculateLab('events', {operation: 'intersection', condition: 'notA'}).visual.probability, 0);
  for (const condition of ['all', 'A', 'B', 'notA', 'notB']) {
    const visual = calculateLab('events', {weights: [1, 2, 3, 4], condition}).visual;
    close(sum(visual.probabilities), 1);
    assert.ok(visual.probability >= 0 && visual.probability <= 1);
  }
  assert.equal(calculateLab('events', {weights: [0, 0, 0, 100], condition: 'A'}).visual.probability, null);
});

test('Bayes: VPP conocido 2/3; positivos esperados y casos degenerados', () => {
  const visual = calculateLab('bayes', {prevalence: 0.1, sensitivity: 0.9, specificity: 0.95}).visual;
  close(visual.posterior, 2 / 3);
  close(visual.positiveProbability, 0.135);
  close(visual.positives, 135);
  for (const [actual, expected] of visual.counts.map((value, index) => [value, [90, 10, 45, 855][index]])) close(actual, expected);
  const rare = calculateLab('bayes', {prevalence: 0.01}).visual;
  close(rare.counts[2], 49.5);
  close(rare.posterior, 9 / 58.5);
  assert.equal(calculateLab('bayes', {prevalence: 0, specificity: 1}).visual.posterior, null);
  close(calculateLab('bayes', {prevalence: 1, sensitivity: 1}).visual.posterior, 1);
  close(calculateLab('bayes', {prevalence: 0, specificity: 0}).visual.posterior, 0);
  const explanation = calculateLab('bayes').explanation;
  assert.match(explanation, /ESPERADOS/);
  assert.match(explanation, /no resultados observados/);
  close(sum(visual.counts), 1000);
});

test('Variable: PMF y CDF distintas; pesos extremos', () => {
  const pmf = calculateLab('variable').visual;
  assert.deepEqual(pmf.probabilities, [0.125, 0.375, 0.375, 0.125]);
  const cdf = calculateLab('variable', {display: 'cdf'}).visual;
  assert.deepEqual(cdf.heights, [0.125, 0.5, 0.875, 1]);
  assert.equal(cdf.kind, 'steps');
  close(sum(pmf.probabilities), 1);
  assert.deepEqual(calculateLab('variable', {weights: [0, 0, 0, 100], display: 'cdf'}).visual.heights, [0, 0, 0, 1]);
});

test('Densidades: normalización, triangular simétrica, intervalos fuera del soporte', () => {
  close(calculateLab('density').visual.probability, 0.3);
  close(calculateLab('density', {family: 'triangular', lower: 0, upper: 5}).visual.probability, 0.5);
  close(calculateLab('density', {family: 'triangular', lower: 2, upper: 8}).visual.probability, 0.84);
  for (const family of ['uniform', 'triangular']) {
    close(calculateLab('density', {family, lower: -20, upper: 30}).visual.probability, 1);
    close(calculateLab('density', {family, lower: 3, upper: 3}).visual.probability, 0);
    close(calculateLab('density', {family, lower: -20, upper: -10}).visual.probability, 0);
    const narrow = calculateLab('density', {family, a: 0, b: 0.1, lower: 0, upper: 0.1}).visual;
    close(narrow.probability, 1);
    assert.ok(narrow.densityAtCenter > 1);
    const points = calculateLab('density', {family}).visual.points;
    const area = sum(points.slice(1).map(([horizontal, vertical], index) => (horizontal - points[index][0]) * (vertical + points[index][1]) / 2));
    close(area, 1);
  }
});

test('Esperanza: momentos ponderados, valores repetidos y varianza cero', () => {
  const lab = calculateLab('expectation');
  close(lab.visual.mean, 1);
  close(lab.visual.variance, 0.5);
  const repeated = calculateLab('expectation', {values: [2, -2, 2], weights: [1, 2, 1]}).visual;
  assert.deepEqual(repeated.values, [-2, 2]);
  assert.deepEqual(repeated.probabilities, [0.5, 0.5]);
  close(repeated.mean, 0);
  close(repeated.variance, 4);
  const atom = calculateLab('expectation', {values: [20, 20, 20]}).visual;
  assert.deepEqual(atom.values, [20]);
  close(atom.variance, 0);
});

test('Conjunta: total, marginales y fila condicional', () => {
  const visual = calculateLab('joint').visual;
  assert.deepEqual(visual.probabilities, [0.3, 0.2, 0.1, 0.4]);
  assert.deepEqual(visual.rows, [0.5, 0.5]);
  assert.deepEqual(visual.columns, [0.4, 0.6000000000000001]);
  close(visual.conditional, 0.8);
  close(sum(visual.conditionalRow), 1);
  const zero = calculateLab('joint', {weights: [1, 1, 0, 0]}).visual;
  assert.equal(zero.conditional, null);
  assert.deepEqual(zero.conditionalRow, [null, null]);
  for (const weights of [[0, 100, 0, 0], [100, 100, 100, 100], [0.01, 100, 0.03, 0.02]]) close(sum(calculateLab('joint', {weights}).visual.probabilities), 1);
});

test('Independencia: factorización y límites de Fréchet válidos', () => {
  const independent = calculateLab('independence').visual;
  independent.probabilities.forEach((value, index) => close(value, independent.products[index]));
  assert.equal(independent.independent, true);
  for (const pA of [0, 0.01, 0.5, 1]) for (const pB of [0, 0.2, 0.9, 1]) for (const association of [-1, 0, 1]) {
    const visual = calculateLab('independence', {pA, pB, association}).visual;
    assert.ok(visual.probabilities.every(value => value >= 0 && value <= 1));
    close(sum(visual.probabilities), 1);
    close(visual.probabilities[2] + visual.probabilities[3], pA);
    close(visual.probabilities[1] + visual.probabilities[3], pB);
  }
  assert.equal(calculateLab('independence', {association: 1}).visual.independent, false);
});

test('Covarianza: los momentos y correlación son los de los puntos dibujados', () => {
  for (const rho of [-1, -0.5, 0, 0.5, 1]) for (const count of [10, 150]) {
    const lab = calculateLab('covariance', {rho, count, seed: 4294967295});
    const visual = lab.visual;
    assert.equal(visual.points.length, count);
    const meanX = sum(visual.points.map(point => point[0])) / count;
    const meanY = sum(visual.points.map(point => point[1])) / count;
    const covariance = sum(visual.points.map(([horizontal, vertical]) => (horizontal - meanX) * (vertical - meanY))) / count;
    close(visual.meanX, meanX);
    close(visual.meanY, meanY);
    close(visual.covariance, covariance);
    close(visual.varianceX, 1);
    close(visual.varianceY, 1);
    close(visual.correlation, covariance);
    close(metricValue(lab, 'Covarianza descriptiva (divisor m)'), covariance);
    if (Math.abs(rho) === 1) close(visual.correlation, rho);
  }
  assert.notEqual(calculateLab('covariance', {rho: 0}).visual.correlation, 0);
});

test('Muestreo normal: determinismo, todas las medias y varianza R-1', () => {
  const params = {n: 20, repetitions: 2000, mu: 0, sigma: 3, seed: 123};
  const lab = calculateLab('sampling', params);
  const visual = lab.visual;
  assert.deepEqual(calculateLab('sampling', params), lab);
  assert.notDeepEqual(calculateLab('sampling', {...params, seed: 124}).visual.means, visual.means);
  const mean = sum(visual.means) / params.repetitions;
  const variance = sum(visual.means.map(value => (value - mean) ** 2)) / (params.repetitions - 1);
  close(visual.empiricalVariance, variance);
  close(visual.empiricalMean, mean);
  close(visual.theoreticalVariance, 9 / 20);
  close(visual.standardError, 3 / Math.sqrt(20));
  assert.ok(Math.abs(variance / visual.theoreticalVariance - 1) < 0.1);
  assert.equal(sum(visual.counts), params.repetitions);
  close(sum(visual.heights) * visual.binWidth, 1);
  const singleton = calculateLab('sampling', {n: 1, repetitions: 2, sigma: 0.05, seed: 0}).visual;
  close(singleton.empiricalVariance, (singleton.means[0] - singleton.means[1]) ** 2 / 2);
  close(calculateLab('sampling', {n: 200, repetitions: 2}).visual.theoreticalVariance, 4 / 200);
  assert.match(lab.explanation, /normal exacte|normal exacta/);
});

test('Aliases: binomial, Poisson y normal son el mismo motor models', () => {
  for (const family of ['binomial', 'poisson', 'normal']) assert.deepEqual(calculateLab(family), calculateLab('models', {family}));
});

for (const family of families) test(`Modelos ${family}: soporte, intervalo y cola explícita`, () => {
  const lab = calculateLab('models', {family});
  const visual = lab.visual;
  assert.ok(visual.probability >= 0 && visual.probability <= 1);
  assert.ok(visual.tail >= 0 && visual.tail <= 1);
  close(visual.tailLeft + visual.tailRight, visual.tail);
  assert.match(lab.explanation, /Cola no dibujada/);
  if (visual.probabilities) {
    close(sum(visual.probabilities) + visual.tail, 1, 2e-7);
    assert.ok(visual.values.every(Number.isInteger));
    assert.ok(visual.values.every(value => value >= visual.support[0] && value <= visual.support[1]));
  } else assert.ok(visual.points.every(point => point.every(Number.isFinite) && point[1] >= 0));
});

test('Modelos discretos: referencias conocidas, soportes y extremos', () => {
  close(probability('bernoulli', {p: 0.3, lower: 1, upper: 1}), 0.3);
  close(probability('binomial', {n: 4, p: 0.5, lower: 2, upper: 2}), 0.375);
  close(probability('binomial', {n: 200, p: 0.5, lower: 0, upper: 200}), 1);
  for (const p of [0, 1]) close(probability('binomial', {n: 200, p, lower: 200 * p, upper: 200 * p}), 1);
  close(probability('binomial', {n: 0, lower: 0, upper: 0}), 1);
  close(probability('geometric', {p: 0.5, lower: 1, upper: 3}), 0.875);
  close(probability('geometric', {p: 0.5, lower: 0, upper: 0}), 0);
  close(probability('negative-binomial', {r: 2, p: 0.5, lower: 0, upper: 0}), 0.25);
  close(probability('negative-binomial', {r: 2, p: 0.5, lower: 1, upper: 1}), 0.25);
  for (const family of ['geometric', 'negative-binomial']) {
    close(probability(family, {p: 1, lower: family === 'geometric' ? 1 : 0, upper: 1}), 1);
    const visual = calculateLab('models', {family, p: 0.02}).visual;
    close(sum(visual.probabilities) + visual.tail, 1, 1e-7);
    assert.ok(visual.tail > 0);
  }
  close(probability('hypergeometric', {N: 5, K: 2, draws: 2, lower: 1, upper: 1}), 0.6);
  close(probability('hypergeometric', {N: 1, K: 1, draws: 1, lower: 1, upper: 1}), 1);
  close(probability('hypergeometric', {N: 200, K: 200, draws: 200, lower: 200, upper: 200}), 1);
  close(probability('poisson', {lambda: 0, lower: 0, upper: 0}), 1);
  close(probability('poisson', {lambda: 2, lower: 0, upper: 0}), Math.exp(-2));
  close(probability('poisson', {lambda: 80, lower: 0, upper: 10000}), 1, 1e-7);
  close(probability('discrete-uniform', {a: -2, b: 2, lower: -1, upper: 1}), 0.6);
  close(probability('discrete-uniform', {a: 2, b: 2, lower: 2, upper: 2}), 1);
  close(probability('binomial', {n: 4, p: 0.5, lower: 1.1, upper: 2.9}), 0.375);
  close(probability('binomial', {lower: 1.1, upper: 1.9}), 0);
});

test('Modelos continuos: áreas conocidas, gamma escala y momentos no existentes', () => {
  close(probability('normal'), 0.6826894921370859);
  close(probability('normal', {mu: 100, sigma: 10, lower: 90, upper: 110}), probability('normal'));
  close(probability('uniform', {a: 0, b: 10, lower: 2, upper: 5}), 0.3);
  close(probability('exponential', {rate: 0.5, lower: 0, upper: 2}), 1 - Math.exp(-1));
  close(probability('gamma', {shape: 1, scale: 2, lower: 0, upper: 2}), probability('exponential', {rate: 0.5}));
  close(probability('chi-square', {df: 2, lower: 0, upper: 2}), 1 - Math.exp(-1));
  close(probability('student', {df: 1, lower: -1, upper: 1}), 0.5, 1e-8);
  close(probability('fisher', {df1: 2, df2: 2, lower: 0, upper: 1}), 0.5);
  close(probability('cauchy'), 0.5);
  close(probability('weibull', {shape: 1, scale: 2, lower: 0, upper: 2}), 1 - Math.exp(-1));
  for (const family of ['student', 'fisher', 'cauchy']) {
    const params = family === 'student' ? {df: 1} : family === 'fisher' ? {df1: 1, df2: 1} : {};
    const visual = calculateLab('models', {family, ...params}).visual;
    assert.equal(visual.mean, null);
    assert.equal(visual.variance, null);
  }
  for (const family of families.filter(item => !['bernoulli', 'binomial', 'geometric', 'negative-binomial', 'hypergeometric', 'poisson', 'discrete-uniform'].includes(item))) close(probability(family, {lower: 1, upper: 1}), 0);
});

test('Condicionamiento: intersección de intervalos y denominador cero', () => {
  close(probability('uniform', {lower: 2, upper: 8, conditioned: true, givenLower: 5, givenUpper: 10}), 3 / 5);
  close(probability('binomial', {n: 4, p: 0.5, lower: 2, upper: 4, conditioned: true, givenLower: 0, givenUpper: 2}), 6 / 11);
  close(probability('uniform', {lower: 0, upper: 1, conditioned: true, givenLower: 5, givenUpper: 10}), 0);
  assert.equal(probability('uniform', {conditioned: true, givenLower: 1, givenUpper: 1}), null);
  assert.equal(probability('binomial', {p: 0, conditioned: true, givenLower: 1, givenUpper: 6}), null);
  close(probability('normal', {lower: -10000, upper: 10000}), 1);
});

test('Parámetros inválidos: desconocidos, tipos, semillas, pesos y soportes', () => {
  for (const id of ['unknown', 'toString', null, 1]) assert.throws(() => calculateLab(id), RangeError);
  for (const raw of [null, [], '1', 1, true]) assert.throws(() => calculateLab('math', raw), TypeError);
  for (const id of LAB_IDS) assert.throws(() => calculateLab(id, {typo: 1}), RangeError);
  for (const value of [NaN, Infinity, -Infinity, '1', null, undefined, true]) assert.throws(() => calculateLab('bayes', {prevalence: value}), RangeError);
  for (const weights of [[0, 0, 0, 0], [-1, 1, 1, 1], [1, 1], [1, 1, NaN, 1], Array(4)]) assert.throws(() => calculateLab('events', {weights}), RangeError);
  assert.throws(() => calculateLab('joint', {row: 2}), RangeError);
  assert.throws(() => calculateLab('variable', {display: 'density'}), RangeError);
  assert.throws(() => calculateLab('events', {operation: 'xor'}), RangeError);
  assert.throws(() => calculateLab('events', {condition: 'typo'}), RangeError);
  assert.throws(() => calculateLab('density', {a: 2, b: 2}), RangeError);
  assert.throws(() => calculateLab('math', {lower: 8, upper: 2}), RangeError);
  assert.throws(() => calculateLab('models', {family: 'unknown'}), RangeError);
  assert.throws(() => calculateLab('models', {family: 'normal', p: 0.5}), RangeError);
  assert.throws(() => calculateLab('models', {family: 'geometric', p: 0}), RangeError);
  assert.throws(() => calculateLab('models', {family: 'hypergeometric', N: 4, K: 5}), RangeError);
  assert.throws(() => calculateLab('models', {family: 'hypergeometric', N: 4, draws: 5}), RangeError);
  assert.throws(() => calculateLab('models', {family: 'gamma', scale: 0}), RangeError);
  assert.throws(() => calculateLab('models', {family: 'normal', sigma: 0}), RangeError);
  assert.throws(() => calculateLab('models', {family: 'uniform', a: 5, b: 4}), RangeError);
  assert.throws(() => calculateLab('models', {conditioned: 1}), TypeError);
  for (const seed of [-1, 0.5, 4294967296, NaN]) for (const id of ['sampling', 'covariance']) assert.throws(() => calculateLab(id, {seed}), RangeError);
  assert.throws(() => calculateLab('sampling', {n: 0}), RangeError);
  assert.throws(() => calculateLab('sampling', {repetitions: 1}), RangeError);
  assert.throws(() => mountLab({}, 'math'), TypeError);
});

test('jStat real requerido solo para laboratorios numéricos; importación sin DOM', () => {
  const original = globalThis.jStat;
  try {
    delete globalThis.jStat;
    close(calculateLab('bayes').visual.posterior, 2 / 3);
    assert.throws(() => calculateLab('normal'), /Falta jStat/);
    assert.throws(() => calculateLab('sampling'), /Falta jStat/);
  } finally { globalThis.jStat = original; }
});

test('Reparto de puntos: exactamente 400 marcas y error menor que una por grupo', () => {
  for (const lab of [calculateLab('events', {weights: [1, 1, 1, 3]}), calculateLab('events', {weights: [1, 2, 3, 7]}), calculateLab('bayes', {prevalence: 0.013, sensitivity: 0.837, specificity: 0.943})]) {
    assert.equal(sum(lab.visual.dotCounts), 400);
    lab.visual.dotCounts.forEach((count, index) => assert.ok(Math.abs(count - 400 * lab.visual.probabilities[index]) < 1));
  }
});

test('Modelos: extremos de los controles y área inicial omitida por singularidad', () => {
  const cases = [
    ['binomial', {n: 200, p: 0.01}], ['negative-binomial', {r: 30, p: 0.02}],
    ['hypergeometric', {N: 200, K: 100, draws: 100}], ['uniform', {a: 0, b: 0.01}],
    ['gamma', {shape: 0.2, scale: 0.05}], ['gamma', {shape: 20, scale: 20}],
    ['normal', {mu: 100, sigma: 0.05}], ['chi-square', {df: 1}], ['chi-square', {df: 100}],
    ['student', {df: 1}], ['student', {df: 100}], ['fisher', {df1: 1, df2: 1}], ['fisher', {df1: 100, df2: 100}],
    ['weibull', {shape: 0.2, scale: 0.05}], ['weibull', {shape: 20, scale: 20}], ['cauchy', {mu: 100, scale: 0.05}]
  ];
  for (const [family, params] of cases) {
    const lab = calculateLab('models', {family, ...params});
    const visual = lab.visual;
    assert.ok((visual.points ?? []).every(point => point.every(Number.isFinite)), family);
    if (visual.probabilities) close(sum(visual.probabilities) + visual.tail, 1, 2e-7);
    if (visual.singularStart) {
      assert.ok(visual.tailLeft > 0, family);
      const drawnProbability = probability(family, {...params, lower: visual.points[0][0], upper: visual.points.at(-1)[0]});
      close(drawnProbability + visual.tail, 1, 2e-7);
      assert.match(lab.explanation, /área inicial omitida/i);
    }
  }
});

function domFixture({width = 320, reduced = true, observer = true} = {}) {
  const calls = [];
  const frames = new Map();
  const resizeListeners = new Set();
  const observers = [];
  let sequence = 0;
  const context = new Proxy({}, {get(target, key) {
    if (key === 'measureText') return value => ({width: String(value).length * 5});
    if (Object.hasOwn(target, key)) return target[key];
    return (...args) => {
      assert.ok(args.filter(value => typeof value === 'number').every(Number.isFinite), String(key));
      calls.push({key, args});
    };
  }});
  const doc = {defaultView: {
    devicePixelRatio: 2,
    matchMedia: () => ({matches: reduced}),
    requestAnimationFrame: callback => { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    addEventListener: (event, callback) => { assert.equal(event, 'resize'); resizeListeners.add(callback); },
    removeEventListener: (event, callback) => { assert.equal(event, 'resize'); resizeListeners.delete(callback); }
  }};
  if (observer) doc.defaultView.ResizeObserver = class {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe(node) { this.node = node; }
    disconnect() { this.disconnected = true; }
  };
  class Node {
    constructor(tag) { this.tag = tag; this.ownerDocument = doc; this.children = []; this.style = {}; this.attributes = new Map(); this.listeners = new Map(); this.parent = null; this.value = ''; this._text = ''; }
    set textContent(value) { this.replaceChildren(); this._text = String(value); }
    get textContent() { return this._text + this.children.map(node => node.textContent).join(''); }
    append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
    replaceChildren(...nodes) { for (const node of this.children) node.parent = null; this.children = []; this._text = ''; this.append(...nodes); }
    remove() { if (this.parent) { this.parent.children = this.parent.children.filter(node => node !== this); this.parent = null; } }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name); }
    addEventListener(event, callback) { if (!this.listeners.has(event)) this.listeners.set(event, new Set()); this.listeners.get(event).add(callback); }
    removeEventListener(event, callback) { this.listeners.get(event)?.delete(callback); }
    dispatch(event) { for (const callback of [...(this.listeners.get(event) ?? [])]) callback({target: this}); }
    getBoundingClientRect() { return {width}; }
    getContext(type) { assert.equal(type, '2d'); return context; }
  }
  doc.createElement = tag => new Node(tag);
  const container = new Node('div');
  const nodes = (parent = container) => [parent, ...parent.children.flatMap(node => nodes(node))];
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); };
  return {container, calls, frames, resizeListeners, observers, nodes, flush};
}

test('Montaje simulado: ejes, leyendas, pie accesible, 16:9 y limpieza idempotente', () => {
  for (const id of LAB_IDS) for (const width of [320, 960]) {
    const fixture = domFixture({width});
    const sibling = fixture.container.ownerDocument.createElement('p');
    fixture.container.append(sibling);
    const cleanup = mountLab(fixture.container, id);
    const owned = fixture.nodes(fixture.container.children[1]);
    const canvas = owned.find(node => node.tag === 'canvas');
    const caption = owned.find(node => node.tag === 'figcaption');
    assert.ok(caption.textContent.length > 100, id);
    assert.equal(canvas.getAttribute('aria-describedby'), caption.id);
    assert.equal(canvas.getAttribute('role'), 'img');
    assert.equal(canvas.width, width * 2);
    assert.equal(canvas.height, width * 2 * 9 / 16);
    assert.equal(canvas.parent.style.aspectRatio, '16 / 9');
    assert.ok(fixture.calls.some(call => call.key === 'fillText'), id);
    if (['bayes', 'events'].includes(id)) assert.equal(fixture.calls.filter(call => call.key === 'arc').length, 400);
    if (id === 'joint') assert.ok(fixture.calls.filter(call => call.key === 'fillText' && String(call.args[0]).startsWith('Σ ')).length === 4);
    for (const node of owned.filter(node => ['input', 'select'].includes(node.tag))) assert.ok(node.getAttribute('aria-label') || owned.some(label => label.tag === 'label' && label.htmlFor === node.id));
    cleanup();
    cleanup();
    assert.deepEqual(fixture.container.children, [sibling]);
    assert.ok(fixture.observers.every(item => item.disconnected));
    assert.ok(owned.every(node => [...node.listeners.values()].every(callbacks => callbacks.size === 0)));
  }
});

test('DOM simulado: edición, familias, condición, errores y restablecer', () => {
  const fixture = domFixture();
  const cleanup = mountLab(fixture.container, 'models');
  const family = () => fixture.nodes().find(node => node.tag === 'select');
  family().value = 'normal';
  family().dispatch('change');
  assert.match(fixture.nodes().find(node => node.tag === 'h3').textContent, /Normal/);
  const checkbox = fixture.nodes().find(node => node.type === 'checkbox');
  checkbox.checked = true;
  checkbox.dispatch('change');
  const inputFor = label => fixture.nodes().find(node => node.type === 'number' && node.getAttribute('aria-label')?.startsWith(label));
  const givenUpper = inputFor('Fin de la condición');
  givenUpper.value = '0';
  givenUpper.dispatch('change');
  assert.match(fixture.nodes().find(node => node.tag === 'figcaption').textContent, /P\(condición\): 0,34134/);
  const sigma = inputFor('Desviación típica sigma');
  sigma.value = '0';
  sigma.dispatch('change');
  assert.equal(sigma.value, '1');
  assert.equal(sigma.getAttribute('aria-invalid'), 'true');
  assert.equal(fixture.nodes().find(node => node.getAttribute('role') === 'status').hidden, false);
  fixture.nodes().find(node => node.tag === 'button').dispatch('click');
  assert.match(fixture.nodes().find(node => node.tag === 'h3').textContent, /Binomial/);
  assert.equal(fixture.nodes().find(node => node.type === 'checkbox').checked, false);
  for (const id of families) { family().value = id; family().dispatch('change'); assert.equal(family().value, id); }
  cleanup();
});

for (const [labId, preset] of [
  ['models', {family: 'hypergeometric'}],
  ['models', {family: 'negative-binomial', r: 1}],
  ['models', {family: 'gamma'}],
  ['models', {family: 'cauchy'}],
  ['models', {family: 'weibull'}],
  ['models', {family: 'exponential'}],
  ['normal', {mu: 100, sigma: 10, lower: 90, upper: 110}]
]) test(`DOM simulado: preset ${preset.family ?? labId}, controles, dibujo y restablecer`, () => {
  const fixture = domFixture();
  const expected = calculateLab(labId, preset);
  const cleanup = mountLab(fixture.container, labId, {params: Object.freeze({...preset})});
  const controls = () => fixture.nodes().filter(node => ['input', 'select', 'output'].includes(node.tag));
  const state = () => controls().map(node => [node.tag, node.type, node.value, node.checked, node.textContent]);
  const caption = () => fixture.nodes().find(node => node.tag === 'figcaption').textContent;
  const family = () => fixture.nodes().find(node => node.tag === 'select');
  const reset = fixture.nodes().find(node => node.tag === 'button');
  const initialControls = state();
  const initialCaption = caption();
  const initialDrawing = [...fixture.calls];
  const expectedNumbers = Object.entries(expected.visual.params).filter(([key, value]) => typeof value === 'number' && !['givenLower', 'givenUpper'].includes(key)).map(([, value]) => String(value));
  assert.equal(family().value, expected.visual.family);
  assert.deepEqual(controls().filter(node => node.type === 'number').map(node => node.value), expectedNumbers);
  assert.deepEqual(controls().filter(node => node.type === 'range').map(node => node.value), expectedNumbers);
  assert.equal(fixture.nodes().find(node => node.tag === 'h3').textContent, expected.title);
  assert.equal(fixture.nodes().find(node => node.tag === 'canvas').getAttribute('aria-label'), expected.title);
  assert.ok(initialCaption.startsWith(expected.explanation));
  for (const item of expected.metrics) assert.ok(initialCaption.includes(`${item.label}: ${item.value === null ? 'No definida' : new Intl.NumberFormat('es', {maximumSignificantDigits: 5}).format(item.value)}`));
  assert.ok(initialDrawing.some(call => call.key === 'fillText'));
  assert.equal(reset.textContent, 'Restablecer valores');
  assert.equal(reset.getAttribute('title'), 'Restablecer valores');
  const icon = fixture.nodes(reset).find(node => node.getAttribute('data-lucide') === 'rotate-ccw');
  assert.ok(icon);
  assert.equal(icon.getAttribute('aria-hidden'), 'true');
  if (preset.family === 'negative-binomial') {
    assert.equal(expected.visual.support[0], 0);
    close(expected.visual.probabilities[0], expected.visual.params.p);
    close(expected.visual.mean, (1 - expected.visual.params.p) / expected.visual.params.p);
    assert.match(initialCaption, /fracasos/i);
  }
  if (labId === 'normal') {
    close(expected.visual.probability, 0.6826894921370859);
    assert.deepEqual(expected.visual.selectedInterval, [90, 110]);
    const meanPosition = initialDrawing.filter(call => call.key === 'moveTo').at(-1).args;
    close(meanPosition[0], 42 + (100 - expected.visual.domain[0]) / (expected.visual.domain[1] - expected.visual.domain[0]) * (320 - 14 - 42));
    close(meanPosition[1], 320 * 9 / 16 - 57);
  }
  const numeric = controls().find(node => node.type === 'number');
  numeric.value = String(Number(numeric.value) === Number(numeric.min) ? Number(numeric.value) + Number(numeric.step) : Number(numeric.value) - Number(numeric.step));
  numeric.dispatch('change');
  assert.notEqual(caption(), initialCaption);
  family().value = 'binomial';
  family().dispatch('change');
  const checkbox = controls().find(node => node.type === 'checkbox');
  checkbox.checked = true;
  checkbox.dispatch('change');
  fixture.calls.length = 0;
  reset.dispatch('click');
  assert.deepEqual(state(), initialControls);
  assert.equal(caption(), initialCaption);
  assert.deepEqual(fixture.calls, initialDrawing);
  assert.equal(fixture.nodes().find(node => node.getAttribute('role') === 'status').hidden, true);
  fixture.calls.length = 0;
  reset.dispatch('click');
  assert.deepEqual(state(), initialControls);
  assert.deepEqual(fixture.calls, initialDrawing);
  cleanup();
});

test('DOM simulado: presets con arrays aislados del llamador, otros montajes y valores por defecto', () => {
  for (const [labId, preset, defaults] of [
    ['events', {weights: [10, 20, 30, 40], operation: 'intersection', condition: 'A'}, [30, 20, 10, 40]],
    ['variable', {weights: [4, 3, 2, 1]}, [1, 3, 3, 1, 1]],
    ['expectation', {values: [3, 4, 5], weights: [2, 3, 4]}, [0, 1, 2, 1, 2, 1]],
    ['joint', {weights: [4, 3, 2, 1], row: 0, column: 0}, [3, 2, 1, 4]]
  ]) {
    const fixture = domFixture();
    const other = domFixture();
    const cleanup = mountLab(fixture.container, labId, {params: preset});
    const cleanupOther = mountLab(other.container, labId, {params: preset});
    const values = source => source.nodes().filter(node => node.type === 'number').map(node => Number(node.value));
    const initialValues = values(fixture);
    const initialCaption = fixture.nodes().find(node => node.tag === 'figcaption').textContent;
    for (const vector of Object.values(preset).filter(Array.isArray)) vector.fill(0);
    const input = fixture.nodes().find(node => node.type === 'number');
    input.value = '5';
    input.dispatch('change');
    assert.notDeepEqual(values(fixture), initialValues);
    assert.deepEqual(values(other), initialValues);
    for (const vector of Object.values(preset).filter(Array.isArray)) assert.ok(vector.every(value => value === 0));
    fixture.nodes().find(node => node.tag === 'button').dispatch('click');
    assert.deepEqual(values(fixture), initialValues);
    assert.equal(fixture.nodes().find(node => node.tag === 'figcaption').textContent, initialCaption);
    cleanup();
    cleanupOther();
    const fresh = domFixture();
    const cleanupFresh = mountLab(fresh.container, labId);
    assert.deepEqual(values(fresh), defaults);
    cleanupFresh();
  }
});

test('DOM simulado: presets invalidos rechazados antes de DOM, listeners o dibujo', () => {
  for (const [labId, params, error] of [
    ['models', {family: 'unknown'}, RangeError],
    ['models', {family: 'gamma', p: 0.5}, RangeError],
    ['models', {family: 'hypergeometric', N: 4, K: 5}, RangeError],
    ['models', {family: 'negative-binomial', r: 0}, RangeError],
    ['models', {family: 'gamma', scale: 0}, RangeError],
    ['models', {family: 'cauchy', scale: 0}, RangeError],
    ['models', {family: 'weibull', shape: 0}, RangeError],
    ['models', {family: 'exponential', rate: 0}, RangeError],
    ['normal', {sigma: 0}, RangeError],
    ['normal', {lower: 110, upper: 90}, RangeError],
    ['events', {weights: [0, 0, 0, 0]}, RangeError],
    ['math', {typo: 1}, RangeError],
    ['math', null, TypeError],
    ['models', [], TypeError],
    ['normal', '1', TypeError]
  ]) {
    const fixture = domFixture({reduced: false});
    const sibling = fixture.container.ownerDocument.createElement('p');
    fixture.container.append(sibling);
    assert.throws(() => mountLab(fixture.container, labId, {params}), error);
    assert.deepEqual(fixture.container.children, [sibling]);
    assert.deepEqual(fixture.calls, []);
    assert.deepEqual(fixture.observers, []);
    assert.equal(fixture.frames.size, 0);
    assert.equal(fixture.resizeListeners.size, 0);
  }
});

test('DOM simulado: cancelar redibujado pendiente y retirar resize de respaldo', () => {
  for (const observer of [false, true]) {
    const fixture = domFixture({reduced: false, observer});
    const cleanup = mountLab(fixture.container, 'math', {formatMath: tex => `Fórmula: ${tex}`});
    assert.equal(fixture.frames.size, 1);
    fixture.flush();
    assert.ok(fixture.calls.length > 0);
    if (observer) fixture.observers[0].callback();
    else [...fixture.resizeListeners][0]();
    assert.equal(fixture.frames.size, 1);
    cleanup();
    assert.equal(fixture.frames.size, 0);
    assert.equal(fixture.resizeListeners.size, 0);
    assert.ok(fixture.observers.every(item => item.disconnected));
  }
});