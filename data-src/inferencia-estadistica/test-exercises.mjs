import assert from 'node:assert/strict';
import {test} from 'node:test';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {EXERCISE_TYPES, generateExercise, gradeAnswer, parseAnswer} from '../../pages/inferencia/exercises.js';

const vendor = new URL('../../pages/inferencia/vendor/jstat.min.js', import.meta.url);
const vendorAvailable = existsSync(vendor);
if (vendorAvailable) {
  const loaded = createRequire(import.meta.url)(fileURLToPath(vendor));
  globalThis.jStat = loaded.jStat ?? loaded;
} else {
  console.warn(`BLOQUEO: falta ${fileURLToPath(vendor)}; se omiten pruebas que necesitan el vendor real, sin sustituir sus CDF.`);
}
const numericOptions = {skip:vendorAvailable ? false : 'Falta jStat vendorizado por el agente principal.'};
const arithmeticTypes = new Set(['events', 'conditional', 'bayes', 'discrete', 'joint', 'covariance', 'independence', 'transform']);
const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}`);
const answer = (result, id) => {
  const item = result.questions.find(item => item.id === id);
  assert.ok(item, `Pregunta ${result.type}/${id}`);
  return item.answer;
};

test('Parser: coma decimal, notación científica, fracciones y porcentajes explícitos', () => {
  for (const [raw, expected] of [['0,25', 0.25], ['.25', 0.25], ['-1,2e-3', -0.0012], ['1/4', 0.25], [' 25 % ', 0.25], ['1e2/4', 25], ['+2.', 2], ['1,5 / 3', 0.5], ['1/4%', 0.0025], [0, 0]]) {
    assert.equal(parseAnswer(raw), expected, String(raw));
  }
  for (const raw of ['', ' ', '\n', null, undefined, true, {}, [], NaN, Infinity, -Infinity, 'Infinity', '-Infinity', 'NaN', '1/0', '0/0', '1//2', '1/2/3', '1+2', 'Math.random()', '2**3', '1,2.3', '1 000', '25%%', '%', '0x10', '1e309', '1e309/1e309', '1/1e-309', '12 células', '1;process.exit()']) {
    assert.equal(parseAnswer(raw), null, String(raw));
  }
});

test('Corrección: límites de tolerancia, entrada inválida y cero', () => {
  const item = {answer:0.25, tolerance:0.0005, unit:'probabilidad entre 0 y 1', hint:'Revisa el denominador.'};
  for (const value of [0.25, 0.2495, 0.2505, '25%', '1/4']) assert.equal(gradeAnswer(item, value).correct, true);
  for (const value of [0.24949999, 0.25050001, '25']) assert.equal(gradeAnswer(item, value).correct, false);
  assert.deepEqual(gradeAnswer(item, ''), {correct:false, feedback:'Introduce un número, una fracción simple o un porcentaje explícito; por ejemplo 0,25, 1/4 o 25%.', value:null});
  assert.equal(gradeAnswer({...item, answer:0, tolerance:0}, '-0').correct, true);
  assert.equal(gradeAnswer({...item, answer:0, tolerance:0}, 1e-17).correct, false);
  assert.equal(gradeAnswer({...item, answer:-3, tolerance:0.01}, '-3,01').correct, true);
  assert.equal(gradeAnswer({...item, answer:-3, tolerance:0.01}, '-3,010001').correct, false);
  assert.throws(() => gradeAnswer({...item, answer:Infinity}, '1'), TypeError);
  assert.throws(() => gradeAnswer({...item, tolerance:-1}, '1'), TypeError);
  assert.throws(() => gradeAnswer({...item, tolerance:NaN}, '1'), TypeError);
  assert.throws(() => gradeAnswer(null, '1'), TypeError);
  assert.deepEqual(Object.keys(gradeAnswer(item, '0,2')).sort(), ['correct', 'feedback', 'value']);
});

test('Catálogo y validación de argumentos', () => {
  const expected = ['events','conditional','bayes','discrete','continuous','binomial','poisson','normal','uniform','exponential','geometric','hypergeometric','gamma','chi-square','student','fisher','joint','covariance','independence','transform','sample','combinatorics','negative-binomial','cauchy','weibull','multinomial','bivariate-normal','continuous-joint','exponential-family'];
  assert.deepEqual(EXERCISE_TYPES.map(item => item.id), expected);
  for (const item of EXERCISE_TYPES) assert.ok(item.title && item.description);
  for (const type of ['unknown', 'toString', null, 1]) assert.throws(() => generateExercise(type), RangeError);
  for (const seed of [-1, 0.5, 4294967296, NaN, Infinity, '1', null]) assert.throws(() => generateExercise('events', seed), RangeError);
});

test('Sucesos: referencia numérica, complemento y reproducibilidad', () => {
  for (const seed of [0, 1, 2, 10, 4294967295]) {
    const result = generateExercise('events', seed);
    const {total, countA, countB, both} = result.visual.params;
    assert.equal(result.questions[0].answer, (countA + countB - both) / total);
    assert.equal(result.questions[1].answer, 1 - result.questions[0].answer);
    assert.deepEqual(generateExercise('events', seed), result);
    assert.equal(result.id, `events-${seed}`);
  }
  assert.deepEqual(generateExercise('events'), generateExercise('events', 1));
});

function checkStructure(typeId) {
  const variants = new Set();
  for (const seed of [...Array.from({length:128}, (_, index) => index), 2147483648, 4294967295]) {
    const result = generateExercise(typeId, seed);
    assert.deepEqual(Object.keys(result).sort(), ['assumptions', 'given', 'id', 'prompt', 'questions', 'title', 'type', 'visual']);
    assert.equal(result.id, `${typeId}-${seed}`);
    assert.equal(result.type, typeId);
    assert.ok(result.title && result.prompt && !/<[a-z][^>]*>/i.test(result.prompt));
    for (const field of ['given', 'assumptions']) assert.ok(result[field].length >= 2 && result[field].every(value => typeof value === 'string' && value.length > 0));
    assert.ok(['math','events','bayes','variable','density','expectation','binomial','poisson','normal','joint','independence','covariance','sampling','models'].includes(result.visual.type));
    assert.deepEqual(Object.keys(result.visual).sort(), ['params', 'type']);
    assert.equal(typeof result.visual.params, 'object');
    assert.ok(result.visual.params && !Array.isArray(result.visual.params));
    assert.ok(result.questions.length >= 2);
    assert.equal(new Set(result.questions.map(item => item.id)).size, result.questions.length);
    for (const item of result.questions) {
      assert.deepEqual(Object.keys(item).sort(), ['answer', 'hint', 'id', 'interpretation', 'prompt', 'steps', 'tolerance', 'unit']);
      assert.ok(Number.isFinite(item.answer) && Number.isFinite(item.tolerance) && item.tolerance >= 0);
      for (const field of ['id', 'hint', 'interpretation', 'prompt', 'unit']) assert.ok(typeof item[field] === 'string' && item[field].length > 0);
      assert.ok(item.steps.length >= 3);
      assert.match(item.steps[0].title, /justificar el método/);
      assert.equal(item.steps.at(-1).title, 'Comprobar e interpretar');
      for (const explanation of item.steps) {
        assert.ok(explanation.title && explanation.explanation);
        assert.ok(Object.keys(explanation).every(key => ['title', 'explanation', 'tex'].includes(key)));
        if (explanation.tex !== undefined) assert.equal(typeof explanation.tex, 'string');
      }
      if (item.unit === 'probabilidad entre 0 y 1') {
        assert.ok(item.answer >= 0 && item.answer <= 1);
        assert.equal(item.tolerance, 0.0005);
      }
      assert.equal(gradeAnswer(item, item.answer).correct, true);
      assert.equal(gradeAnswer(item, item.answer + item.tolerance).correct, true);
      assert.equal(gradeAnswer(item, item.answer - item.tolerance).correct, true);
      assert.equal(gradeAnswer(item, item.answer + item.tolerance + 1e-7).correct, false);
      assert.equal(gradeAnswer(item, item.answer - item.tolerance - 1e-7).correct, false);
      assert.equal(gradeAnswer(item, 'Infinity').value, null);
    }
    assert.deepEqual(generateExercise(typeId, seed), result);
    variants.add(JSON.stringify({...result, id:''}));
  }
  assert.ok(variants.size >= 3, `${typeId} necesita variantes sustantivas, no solo IDs distintos`);
  assert.deepEqual(generateExercise(typeId), generateExercise(typeId, 1));
}

for (const {id} of EXERCISE_TYPES) {
  test(`Contrato exacto, respuestas finitas, corrección y 130 semillas: ${id}`, arithmeticTypes.has(id) ? {} : numericOptions, () => checkStructure(id));
}

test('Generación independiente de Math.random y del reloj', () => {
  const previousRandom = Math.random;
  const previousNow = Date.now;
  Math.random = () => {throw new Error('Math.random no debe usarse.');};
  Date.now = () => {throw new Error('Date.now no debe usarse.');};
  try {
    for (const {id} of EXERCISE_TYPES) {
      if (vendorAvailable || arithmeticTypes.has(id)) assert.deepEqual(generateExercise(id, 17), generateExercise(id, 17));
    }
  } finally {
    Math.random = previousRandom;
    Date.now = previousNow;
  }
});

test('Referencias aritméticas: condición, Bayes, momentos, tabla, covarianza y Jensen', () => {
  for (let seed = 0; seed < 32; seed++) {
    const conditional = generateExercise('conditional', seed);
    const {treated, recoveredTreated, recoveredUntreated} = conditional.visual.params;
    close(answer(conditional, 'recovery-given-treatment'), recoveredTreated / treated);
    close(answer(conditional, 'treatment-given-recovery'), recoveredTreated / (recoveredTreated + recoveredUntreated));
    const bayes = generateExercise('bayes', seed);
    const {prevalence, sensitivity, specificity} = bayes.visual.params;
    const positive = prevalence * sensitivity + (1 - prevalence) * (1 - specificity);
    close(answer(bayes, 'positive'), positive);
    close(answer(bayes, 'posterior'), prevalence * sensitivity / positive);
    const discrete = generateExercise('discrete', seed);
    const {values, probabilities} = discrete.visual.params;
    close(probabilities.reduce((sum, value) => sum + value, 0), 1);
    const mean = values.reduce((sum, value, index) => sum + value * probabilities[index], 0);
    close(answer(discrete, 'mean'), mean);
    close(answer(discrete, 'variance'), values.reduce((sum, value, index) => sum + (value - mean) ** 2 * probabilities[index], 0));
    const joint = generateExercise('joint', seed);
    const table = joint.visual.params.probabilities;
    close(answer(joint, 'marginal-y'), table[0][1] + table[1][1]);
    close(answer(joint, 'conditional-y'), table[1][1] / (table[1][0] + table[1][1]));
    const covariance = generateExercise('covariance', seed);
    const both = covariance.visual.params.probabilities[1][1];
    close(answer(covariance, 'covariance'), both - 0.25);
    close(answer(covariance, 'correlation'), 4 * both - 1);
    const independent = generateExercise('independence', seed);
    close(answer(independent, 'covariance'), 0);
    assert.ok(answer(independent, 'factorization-gap') > 0);
    const transform = generateExercise('transform', seed);
    const {center, spread} = transform.visual.params;
    close(answer(transform, 'transformed-mean'), center ** 2 + spread ** 2);
    close(answer(transform, 'jensen-gap'), spread ** 2);
  }
});

test('Sin vendor: error explícito en vez de una CDF inventada', () => {
  const previous = globalThis.jStat;
  try {
    delete globalThis.jStat;
    assert.throws(() => generateExercise('normal', 1), /globalThis\.jStat/);
    assert.ok(Number.isFinite(generateExercise('bayes', 1).questions[0].answer));
  } finally {
    if (previous === undefined) delete globalThis.jStat;
    else globalThis.jStat = previous;
  }
});

test('jStat real: referencias numéricas estándar independientes', numericOptions, () => {
  const core = globalThis.jStat;
  close(core.binomial.pdf(2, 10, 0.2), 0.301989888);
  close(core.binomial.cdf(2, 10, 0.2), 0.6777995264);
  close(core.poisson.pdf(3, 2), 0.1804470443154836);
  close(core.poisson.cdf(3, 2), 0.857123460498547);
  close(core.normal.cdf(2, 0, 1) - core.normal.cdf(-1, 0, 1), 0.8185946141203637);
  close(core.normal.inv(0.95, 0, 1), 1.6448536269514722, 1e-7);
  close(core.uniform.cdf(5, 2, 8), 0.5);
  close(core.exponential.cdf(4, 0.5), 0.8646647167633873);
  close(core.negbin.pdf(2, 1, 0.25), 0.140625);
  close(core.negbin.cdf(2, 1, 0.25), 0.578125);
  close(core.hypgeom.pdf(2, 20, 6, 4), 1365 / 4845);
  close(core.gamma.cdf(4, 2, 2), 0.5939941502901619);
  close(core.chisquare.cdf(2, 2), 0.6321205588285577);
  close(core.chisquare.inv(0.95, 2), 5.991464547107982, 1e-7);
  close(core.studentt.cdf(1, 1), 0.75, 1e-8);
  close(core.studentt.inv(0.75, 1), 1, 1e-7);
  close(core.centralF.cdf(1, 10, 10), 0.5);
  close(core.beta.cdf(0.5, 2, 1), 0.25);
  close(core.combination(6, 2), 15);
  close(core.factorial(6), 720);
  close(core.negbin.pdf(0, 3, 0.5), 0.125);
  close(core.negbin.pdf(2, 3, 0.5), 0.1875);
  close(core.negbin.cdf(2, 3, 0.5), 0.5);
  close(core.cauchy.cdf(1, 0, 1), 0.75);
  close(core.cauchy.inv(0.5, -2, 3), -2);
  close(core.weibull.cdf(12, 6, 2), 0.9816843611112658);
  close(core.weibull.inv(0.5, 6, 2), 4.995327666946186, 1e-8);
  close(core.gammaln(1), 0);
  close(Math.exp(core.gammaln(7) - core.gammaln(3) - core.gammaln(2) - core.gammaln(4)), 60, 1e-8);
  close(core.normal.cdf(108, 100, 8), 0.8413447460685429);
});

function combination(total, selected) {
  let result = 1;
  for (let index = 1; index <= selected; index++) result *= (total - selected + index) / index;
  return result;
}

test('Generadores: PMF conocidas, soporte y límites discretos inclusivos/estrictos', numericOptions, () => {
  const core = globalThis.jStat;
  for (let seed = 0; seed < 32; seed++) {
    const binomial = generateExercise('binomial', seed);
    const {n:trials, p:successProbability, k:count} = binomial.visual.params;
    close(answer(binomial, 'exact'), combination(trials, count) * successProbability ** count * (1 - successProbability) ** (trials - count));
    close(answer(binomial, 'at-most') - core.binomial.cdf(count - 1, trials, successProbability), answer(binomial, 'exact'));
    const poisson = generateExercise('poisson', seed);
    const params = poisson.visual.params;
    close(params.lambda, params.rate * params.duration);
    const factorial = Array.from({length:params.k}, (_, index) => index + 1).reduce((product, value) => product * value, 1);
    close(answer(poisson, 'exact'), Math.exp(-params.lambda) * params.lambda ** params.k / factorial);
    close(answer(poisson, 'strict-tail'), 1 - core.poisson.cdf(params.k, params.lambda));
    assert.ok(answer(poisson, 'strict-tail') < 1 - core.poisson.cdf(params.k - 1, params.lambda));
    const geometric = generateExercise('geometric', seed);
    const geo = geometric.visual.params;
    close(answer(geometric, 'first-success'), (1 - geo.p) ** (geo.trials - 1) * geo.p);
    close(answer(geometric, 'more-trials'), (1 - geo.p) ** geo.trials);
    const hyper = generateExercise('hypergeometric', seed);
    const hyp = hyper.visual.params;
    assert.ok(hyp.k >= hyp.minimum && hyp.k <= hyp.maximum);
    close(answer(hyper, 'exact'), combination(hyp.successes, hyp.k) * combination(hyp.population - hyp.successes, hyp.draws - hyp.k) / combination(hyp.population, hyp.draws));
    close(answer(hyper, 'at-least'), 1 - core.hypgeom.cdf(hyp.k - 1, hyp.population, hyp.successes, hyp.draws));
    assert.ok(answer(hyper, 'at-least') > 1 - core.hypgeom.cdf(hyp.k, hyp.population, hyp.successes, hyp.draws));
  }
});

test('Generadores: normalización continua, Gamma tasa/escala, normal y falta de memoria', numericOptions, () => {
  const erlangAtMean = {2:0.5939941502901619, 3:0.5768099188731565, 4:0.566529879633291};
  for (let seed = 0; seed < 32; seed++) {
    const continuous = generateExercise('continuous', seed);
    const density = continuous.visual.params;
    close(answer(continuous, 'normalizer') * density.upper ** 2 / 2, 1);
    close(answer(continuous, 'below'), (density.threshold / density.upper) ** 2);
    close(answer(continuous, 'point'), 0);
    const uniform = generateExercise('uniform', seed);
    close(answer(uniform, 'interval'), 0.5);
    close(answer(uniform, 'mean'), (uniform.visual.params.lower + uniform.visual.params.upper) / 2);
    const exponential = generateExercise('exponential', seed);
    const exp = exponential.visual.params;
    close(answer(exponential, 'survival'), Math.exp(-exp.rate * exp.elapsed));
    close(answer(exponential, 'memoryless'), Math.exp(-exp.rate * (exp.elapsed + exp.extra)) / Math.exp(-exp.rate * exp.elapsed));
    const gamma = generateExercise('gamma', seed);
    const gam = gamma.visual.params;
    close(gam.rate * gam.scale, 1);
    close(answer(gamma, 'mean'), gam.shape / gam.rate);
    close(answer(gamma, 'before'), erlangAtMean[gam.shape]);
    const normal = generateExercise('normal', seed);
    close(answer(normal, 'interval'), 0.8185946141203637);
    close(answer(normal, 'quantile'), normal.visual.params.mean + 1.6448536269514722 * normal.visual.params.sd, 1e-6);
  }
});

test('Generadores: pivotes de muestreo, grados de libertad y varianza iid', numericOptions, () => {
  const core = globalThis.jStat;
  for (let seed = 0; seed < 32; seed++) {
    const chi = generateExercise('chi-square', seed);
    const chiParams = chi.visual.params;
    assert.equal(chiParams.df, chiParams.n - 1);
    close(chiParams.cutoff, chiParams.df * chiParams.thresholdVariance / chiParams.populationVariance);
    close(answer(chi, 'variance-tail'), 1 - core.chisquare.cdf(chiParams.cutoff, chiParams.df));
    close(core.chisquare.cdf(answer(chi, 'critical'), chiParams.df), 0.95, 1e-7);
    const student = generateExercise('student', seed);
    const studentParams = student.visual.params;
    assert.equal(studentParams.df, studentParams.n - 1);
    close(studentParams.statistic, 1);
    close(answer(student, 'two-sided'), 2 * core.studentt.cdf(-1, studentParams.df));
    close(answer(student, 'margin'), core.studentt.inv(0.975, studentParams.df) * studentParams.sampleSd / Math.sqrt(studentParams.n));
    const fisher = generateExercise('fisher', seed);
    const fParams = fisher.visual.params;
    assert.equal(fParams.df1, fParams.n1 - 1);
    assert.equal(fParams.df2, fParams.n2 - 1);
    close(answer(fisher, 'upper-tail'), 1 - core.centralF.cdf(fParams.variance1 / fParams.variance2, fParams.df1, fParams.df2));
    close(core.centralF.cdf(answer(fisher, 'critical'), fParams.df1, fParams.df2), 0.95, 1e-7);
    const sample = generateExercise('sample', seed);
    close(answer(sample, 'mean-variance'), sample.visual.params.populationVariance / sample.visual.params.n);
    close(answer(sample, 'observed-unbiased'), 2.5);
    close(answer(sample, 'observed-divisor-n'), 2);
    assert.equal(sample.visual.params.observedSize, 5);
    assert.notEqual(answer(sample, 'observed-unbiased'), sample.visual.params.populationVariance);
  }
});

function integrate(func, lower, upper, intervals = 2048) {
  const width = (upper - lower) / intervals;
  let sum = func(lower) + func(upper);
  for (let index = 1; index < intervals; index++) sum += (index % 2 === 0 ? 2 : 4) * func(lower + index * width);
  return sum * width / 3;
}

test('Combinatoria: enumeración independiente de selecciones, posiciones y multiplicidades', numericOptions, () => {
  for (let seed = 0; seed < 32; seed++) {
    const result = generateExercise('combinatorics', seed);
    const {n:total, r:selected, multiplicities, labelTotal} = result.visual.params;
    const groups = new Set();
    let ordered = 0;
    function select(prefix) {
      if (prefix.length === selected) {
        ordered++;
        groups.add([...prefix].sort((left, right) => left - right).join(','));
        return;
      }
      for (let label = 0; label < total; label++) if (!prefix.includes(label)) select([...prefix, label]);
    }
    select([]);
    close(answer(result, 'unordered'), groups.size);
    close(answer(result, 'ordered'), ordered);
    close(answer(result, 'with-repetition'), total ** selected);
    const factorial = Array.from({length:total}, (_, index) => index + 1).reduce((product, value) => product * value, 1);
    close(answer(result, 'all-ordered'), factorial);
    let sequences = 0;
    function arrange(remaining) {
      if (remaining.every(count => count === 0)) {sequences++; return;}
      for (let index = 0; index < remaining.length; index++) {
        if (remaining[index] === 0) continue;
        const next = [...remaining];
        next[index]--;
        arrange(next);
      }
    }
    arrange(multiplicities);
    close(answer(result, 'repeated-labels'), sequences);
    assert.equal(multiplicities.reduce((sum, count) => sum + count, 0), labelTotal);
    for (const item of result.questions) assert.ok(Number.isInteger(item.answer) && item.steps.length >= 2);
  }
});

test('Binomial negativa: fallos desde cero, masas, CDF inclusiva y momentos', numericOptions, () => {
  const references = new Map([[0, 0.125], [2, 0.1875], [4, 0.1171875], [6, 0.0546875]]);
  let zeroCases = 0;
  for (let seed = 0; seed < 130; seed++) {
    const result = generateExercise('negative-binomial', seed);
    const {r:successes, p:successProbability, k:failures, minimum, counts} = result.visual.params;
    assert.equal(minimum, 0);
    assert.equal(counts, 'failures');
    assert.ok(Number.isInteger(successes) && successes > 1 && Number.isInteger(failures) && failures >= 0);
    const mass = count => combination(count + successes - 1, count) * successProbability ** successes * (1 - successProbability) ** count;
    close(answer(result, 'exact'), mass(failures));
    close(answer(result, 'at-most'), Array.from({length:failures + 1}, (_, count) => mass(count)).reduce((sum, value) => sum + value, 0));
    close(answer(result, 'mean-failures'), successes * (1 - successProbability) / successProbability);
    close(answer(result, 'variance'), answer(result, 'mean-failures') / successProbability);
    if (successes === 3 && successProbability === 0.5) close(answer(result, 'exact'), references.get(failures));
    if (failures === 0) {
      zeroCases++;
      close(answer(result, 'exact'), successProbability ** successes);
      close(answer(result, 'at-most'), answer(result, 'exact'));
    }
  }
  assert.ok(zeroCases > 0);
});

test('Cauchy: CDF arctangente, mediana y ningún momento finito inventado', numericOptions, () => {
  for (let seed = 0; seed < 32; seed++) {
    const result = generateExercise('cauchy', seed);
    const {location, scale, lower, upper} = result.visual.params;
    const cdf = value => 0.5 + Math.atan((value - location) / scale) / Math.PI;
    close(answer(result, 'interval'), cdf(upper) - cdf(lower));
    close(answer(result, 'median'), location);
    close(cdf(answer(result, 'median')), 0.5);
    assert.deepEqual(result.questions.map(item => item.id), ['interval', 'median']);
    assert.ok(result.given.some(text => text.includes('E[X] no existe')));
    assert.ok(!Object.hasOwn(result.visual.params, 'mean') && !Object.hasOwn(result.visual.params, 'variance'));
    if (upper - location === scale) close(answer(result, 'interval'), 0.5);
  }
});

test('Weibull: orden escala/forma, supervivencia y cuantil por inversión algebraica', numericOptions, () => {
  for (let seed = 0; seed < 130; seed++) {
    const result = generateExercise('weibull', seed);
    const {shape, scale, time, quantileProbability} = result.visual.params;
    close(answer(result, 'survival'), Math.exp(-((time / scale) ** shape)));
    close(answer(result, 'quantile'), scale * (-Math.log1p(-quantileProbability)) ** (1 / shape));
    close(Math.exp(-((answer(result, 'quantile') / scale) ** shape)), 1 - quantileProbability);
    if (time === scale) close(answer(result, 'survival'), 0.36787944117144233);
    if (shape === 1) close(answer(result, 'survival'), Math.exp(-time / scale));
  }
});

test('Multinomial: factoriales independientes, masa total, marginal y covarianza negativa', numericOptions, () => {
  const factorial = value => Array.from({length:value}, (_, index) => index + 1).reduce((product, count) => product * count, 1);
  for (let seed = 0; seed < 32; seed++) {
    const result = generateExercise('multinomial', seed);
    const {n:total, probabilities, counts, logCoefficient} = result.visual.params;
    assert.equal(counts.length, 3);
    assert.ok(counts.every(count => Number.isInteger(count) && count >= 0));
    assert.equal(counts.reduce((sum, count) => sum + count, 0), total);
    close(probabilities.reduce((sum, chance) => sum + chance, 0), 1);
    const mass = (first, second, third) => factorial(total) / (factorial(first) * factorial(second) * factorial(third)) * probabilities[0] ** first * probabilities[1] ** second * probabilities[2] ** third;
    close(Math.exp(logCoefficient), factorial(total) / counts.reduce((product, count) => product * factorial(count), 1), 1e-6);
    close(answer(result, 'exact'), mass(...counts));
    let marginal = 0;
    let totalMass = 0;
    let meanA = 0;
    let meanB = 0;
    let productMean = 0;
    for (let first = 0; first <= total; first++) {
      for (let second = 0; second <= total - first; second++) {
        const chance = mass(first, second, total - first - second);
        totalMass += chance;
        meanA += first * chance;
        meanB += second * chance;
        productMean += first * second * chance;
        if (first === counts[0]) marginal += chance;
      }
    }
    close(totalMass, 1);
    close(answer(result, 'marginal-a'), marginal);
    close(answer(result, 'covariance-ab'), productMean - meanA * meanB);
    assert.ok(answer(result, 'covariance-ab') < 0);
    assert.ok(answer(result, 'marginal-a') >= answer(result, 'exact') - 1e-9);
  }
});

test('Normal bivariante: complemento de Schur, raíz de 1−ρ² y cola integrada independientemente', numericOptions, () => {
  const sdFactors = new Map([[0, 1], [0.6, 0.8], [0.8, 0.6]]);
  const correlations = new Set();
  for (let seed = 0; seed < 130; seed++) {
    const result = generateExercise('bivariate-normal', seed);
    const {meanX, meanY, sdX, sdY, rho, x:observedX, threshold, conditionalMean, conditionalSd} = result.visual.params;
    correlations.add(rho);
    const covariance = rho * sdX * sdY;
    const referenceMean = meanY + covariance / sdX ** 2 * (observedX - meanX);
    const referenceVariance = sdY ** 2 - covariance ** 2 / sdX ** 2;
    close(answer(result, 'conditional-mean'), referenceMean);
    close(answer(result, 'conditional-sd') ** 2, referenceVariance);
    close(answer(result, 'conditional-sd'), sdY * sdFactors.get(Math.abs(rho)));
    close(conditionalMean, referenceMean);
    close(conditionalSd, Math.sqrt(referenceVariance));
    const standardized = (threshold - referenceMean) / Math.sqrt(referenceVariance);
    const independentTail = integrate(value => Math.exp(-(value ** 2) / 2) / Math.sqrt(2 * Math.PI), standardized, 10);
    close(answer(result, 'conditional-tail'), independentTail, 1e-8);
    assert.ok(result.assumptions[0].includes('normalidad conjunta'));
    if (rho === 0) {
      close(answer(result, 'conditional-mean'), meanY);
      close(answer(result, 'conditional-sd'), sdY);
    }
  }
  assert.deepEqual([...correlations].sort((left, right) => left - right), [-0.8, -0.6, 0, 0.6, 0.8]);
});

test('Triángulo uniforme: integral uno, marginal interior, área de evento y ancho condicional', () => {
  for (let seed = 0; seed < 130; seed++) {
    const result = generateExercise('continuous-joint', seed);
    const {a:upper, x:observedX, b:sumLimit, d:threshold, constant, width} = result.visual.params;
    assert.ok(upper > 0 && observedX > 0 && observedX < upper);
    assert.ok(sumLimit > 0 && sumLimit < upper && threshold > 0 && threshold < upper - observedX);
    close(width, upper - observedX);
    close(answer(result, 'normalizer'), 2 / upper ** 2);
    close(constant, answer(result, 'normalizer'));
    close(integrate(value => constant * (upper - value), 0, upper), 1);
    const marginal = integrate(() => constant, 0, upper - observedX);
    close(answer(result, 'marginal-density'), marginal);
    close(answer(result, 'sum-event'), integrate(value => constant * (sumLimit - value), 0, sumLimit));
    const conditionalDensity = constant / marginal;
    close(answer(result, 'conditional-density'), conditionalDensity);
    close(integrate(() => conditionalDensity, 0, width), 1);
    close(answer(result, 'conditional-tail'), integrate(() => conditionalDensity, threshold, width));
    assert.equal(result.questions.find(item => item.id === 'normalizer').unit, 'mg a la potencia -2');
    assert.equal(result.questions.find(item => item.id === 'marginal-density').unit, 'mg a la potencia -1');
    assert.equal(result.questions.find(item => item.id === 'conditional-density').unit, 'mg a la potencia -1');
    if (sumLimit === upper / 2) close(answer(result, 'sum-event'), 0.25);
  }
});

test('Familia exponencial: recuentos enteros, T suficiente, media MLE y log-verosimilitud completa', numericOptions, () => {
  const references = new Map([
    ['1,0,2,1,3', {total:7, mean:1.4, factorialProduct:12}],
    ['2,4,1,3,2', {total:12, mean:2.4, factorialProduct:576}],
    ['0,1,0,2', {total:3, mean:0.75, factorialProduct:2}],
    ['3,2,4,1,5', {total:15, mean:3, factorialProduct:34560}]
  ]);
  const observedSamples = new Set();
  for (let seed = 0; seed < 130; seed++) {
    const result = generateExercise('exponential-family', seed);
    const {values, n:sampleSize, total, candidate} = result.visual.params;
    assert.ok(values.every(count => Number.isInteger(count) && count >= 0));
    assert.equal(sampleSize, values.length);
    observedSamples.add(values.join(','));
    const reference = references.get(values.join(','));
    assert.ok(reference);
    assert.equal(total, reference.total);
    assert.equal(answer(result, 'sufficient-statistic'), reference.total);
    close(answer(result, 'mle'), reference.mean);
    const logLikelihood = rate => reference.total * Math.log(rate) - sampleSize * rate - Math.log(reference.factorialProduct);
    close(answer(result, 'log-likelihood'), logLikelihood(candidate));
    const mle = answer(result, 'mle');
    close(reference.total / mle - sampleSize, 0);
    assert.ok(logLikelihood(mle) >= logLikelihood(candidate) - 1e-9);
    assert.ok(logLikelihood(mle) > logLikelihood(mle * 0.8));
    assert.ok(logLikelihood(mle) > logLikelihood(mle * 1.2));
    assert.ok(result.questions[0].steps.some(item => item.tex?.includes('h(')));
  }
  assert.equal(observedSamples.size, references.size);
});