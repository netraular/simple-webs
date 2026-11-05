export const LAB_IDS = Object.freeze(['math', 'events', 'bayes', 'variable', 'density', 'expectation', 'binomial', 'poisson', 'normal', 'joint', 'independence', 'covariance', 'sampling', 'models', 'multinomial', 'continuous-joint', 'bivariate-normal']);

export const LAB_GUIDES = {
  math: ['Relacionar altura, anchura e integral antes de trabajar con densidades.', 'Elige la función constante, fija un intervalo y duplica la altura.', 'Ambas áreas se duplican, pero su cociente no cambia. Una anchura cero aporta área cero.', 'El eje horizontal representa x y el vertical la función; la sombra acumula área.', 'Una función positiva no es una densidad hasta normalizarla. El área puede superar uno.'],
  events: ['Traducir conjuntos y condicionamiento a regiones de un experimento.', 'Selecciona B y cambia el grupo de referencia de todo el espacio a dado A.', 'Con los pesos iniciales, el numerador es 0,10 y el denominador 0,40: la condicional vale 0,25.', 'Los puntos más tenues quedan fuera de la condición; los resaltados cumplen también el suceso.', 'Los puntos redondean proporciones, no son observaciones; las métricas conservan las probabilidades exactas.'],
  bayes: ['Ver por qué sensibilidad y valor predictivo responden a preguntas distintas.', 'Mantén sensibilidad 0,90 y especificidad 0,95; reduce prevalencia de 0,10 a 0,01.', 'VPP baja de 2/3 a aproximadamente 0,154: el grupo sano aporta más falsos positivos.', 'VPP divide enfermos positivos entre todos los positivos, no entre todos los enfermos.', 'Los recuentos son esperados y pueden ser fraccionarios. Aumentar la cohorte no cambia VPP.'],
  variable: ['Distinguir masa puntual de acumulación hasta un umbral.', 'Conserva los pesos y alterna masa y acumulada; después cambia solo el umbral.', 'Las masas suman uno. La acumulada incorpora cada masa al cruzar su valor, pero sus alturas no se suman.', 'Barras: P(X=x). Escalones: P(X≤x), incluido el umbral.', 'Los resultados posibles son 0, 1, 2 y 3. Entre ellos no hay masas que interpolar.'],
  density: ['Entender probabilidades continuas como áreas y no alturas.', 'Estrecha el soporte y después iguala los dos límites del intervalo.', 'La altura sube para conservar área uno. Un intervalo sin anchura tiene probabilidad cero.', 'La sombra es probabilidad; la línea es densidad con unidades inversas a X.', 'Uniforme y triangular simétrica aíslan el concepto; no son curvas ajustadas a datos reales.'],
  expectation: ['Interpretar centro y dispersión como ponderaciones por probabilidad.', 'Suma la misma cantidad a todos los resultados y conserva los pesos.', 'La media se desplaza; la varianza no cambia. Duplicar todos los resultados cuadruplica la varianza.', 'La línea señala la media. Los valores repetidos se agrupan sin perder sus masas.', 'La media puede no ser un resultado posible. Varianza y desviación tienen unidades diferentes.'],
  binomial: ['Relacionar n fijo y p constante con un recuento de éxitos.', 'Conserva p y duplica n; compara media, varianza y soporte.', 'La media np y la varianza np(1-p) se duplican. El área de un intervalo fijo no tiene por qué hacerlo.', 'Cada barra es una masa entera; el intervalo seleccionado incluye sus extremos.', 'La binomial requiere ensayos independientes y p común. Cambiar familia cambia el mecanismo.'],
  poisson: ['Separar tasa por exposición de probabilidad de un suceso.', 'Duplica lambda como al duplicar exposición con tasa constante.', 'Media y varianza se duplican. La masa en cero disminuye, porque vale exp(-lambda).', 'Las barras son masas; la cola omitida se cuantifica y se incluye en los cálculos.', 'Agrupamientos o cambios de tasa pueden invalidar el mecanismo Poisson.'],
  normal: ['Traducir mediciones a áreas bajo una curva normal.', 'Fija un intervalo central y aumenta sigma; luego desplaza juntos media e intervalo.', 'Aumentar sigma reduce el área central fija; trasladar juntos media y límites conserva el área.', 'Sigma significa desviación típica, no varianza. La sombra representa probabilidad.', 'Las colas fuera del marco están incluidas en los cálculos. La normalidad es un supuesto.'],
  joint: ['Distinguir celda conjunta, totales marginales y fila condicionada.', 'Selecciona una fila y divide cada celda por el total de esa fila.', 'Una fila positiva produce condicionales que suman uno; el denominador no es toda la tabla.', 'Los totales laterales e inferiores son marginales. El borde señala la celda de interés.', 'Una fila vacía no define condicionales. Esta tabla es discreta, no una superficie continua.'],
  independence: ['Comprobar factorización conservando ambas marginales.', 'Fija marginales y mueve asociación desde cero hacia un extremo.', 'En cero cada celda coincide con su producto marginal; fuera de cero aparecen discrepancias.', 'Cada celda compara conjunta y producto. La métrica recoge la máxima diferencia.', 'Una discrepancia refuta independencia; una coincidencia aislada no la demuestra.'],
  covariance: ['Explorar asociación lineal en una nube de pares.', 'Cambia el signo de rho objetivo y después cambia solo la semilla.', 'La orientación suele invertirse; la correlación empírica fluctúa entre realizaciones.', 'Las líneas cruzan las medias y la recta resume dirección lineal, no causalidad.', 'Las métricas son descriptivas con divisor m. La nube no certifica normalidad conjunta ni independencia.'],
  sampling: ['Apoyo adicional: distinguir variación individual y variación entre medias.', 'Mantén sigma y multiplica por cuatro el tamaño de muestra.', 'La varianza de la media se divide por cuatro y su error estándar por dos.', 'Cada elemento del histograma es una media. La línea es exacta bajo población normal.', 'Es una ampliación de muestreo, no una demostración del TCL para cualquier población.'],
  models: ['Elegir una familia por su soporte y mecanismo, no por su aspecto.', 'Cambia un parámetro y anticipa el efecto sobre centro, dispersión e intervalo.', 'Una tasa exponencial mayor acorta tiempos; una escala gamma mayor los alarga.', 'Barras: masas. Líneas: densidades. Los parámetros declaran sus convenciones.', 'La condicional se calcula por un cociente, sin renormalizar las alturas. Student, Fisher y chi-cuadrado son ampliaciones.'],
  multinomial: ['Entender tres recuentos que comparten un total fijo.', 'Conserva n y cambia un peso de categoría; observa la tabla y sus marginales.', 'Las masas suman uno; X+Y>n es imposible y la tercera categoría vale n-X-Y.', 'Filas: primer recuento. Columnas: segundo. Los totales son marginales binomiales.', 'Ensayos independientes no implican recuentos independientes: su covarianza es negativa.'],
  'continuous-joint': ['Distinguir soporte triangular, marginal y corte condicionado.', 'Mantén el umbral Y y aumenta el X conocido dentro del soporte.', 'El máximo de Y baja a L-x. Su densidad condicionada sube a 1/(L-x) y la cola se reduce.', 'El triángulo es soporte; la línea verde es el corte y su tramo oscuro supera el umbral.', 'El corte se normaliza por densidades. En x=L la marginal vale cero y no define esta condicional.'],
  'bivariate-normal': ['Convertir una medida conocida en la distribución condicional de la otra.', 'Compara rho cero y positivo; desplaza X conocido por encima de su media.', 'Con rho cero se conserva la marginal. Con rho positivo y X alto sube la media condicional y baja la varianza.', 'Azul: Y dado X=x. Rosa: marginal Y. La sombra es cola condicional.', 'Se supone normalidad conjunta. Rho igual a uno o menos uno es degenerado; los cálculos incluyen colas fuera del marco.']
};

const COLORS = ['#0369a1', '#15803d', '#be123c', '#b45309'];
const sum = values => values.reduce((total, value) => total + value, 0);
const metric = (label, value, unit) => ({label, value, ...(unit ? {unit} : {})});
const result = (title, explanation, metrics, visual) => ({title, explanation, metrics, visual});
const clampProbability = value => {
  if (!Number.isFinite(value) || value < -1e-7 || value > 1 + 1e-7) throw new RangeError('El motor numérico no pudo calcular esta probabilidad.');
  return Math.max(0, Math.min(1, value));
};
const ratio = (numerator, denominator) => denominator > 0 ? numerator / denominator : null;
const numberText = value => value === null ? 'No definida' : new Intl.NumberFormat('es', {maximumSignificantDigits: 5}).format(value);

function library() {
  const stats = globalThis.jStat;
  if (!stats?.normal?.inv || !stats?.binomial?.pdf) throw new Error('Falta jStat: carga vendor/jstat.min.js como script clásico antes del módulo.');
  return stats;
}

function parameters(raw, defaults) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || ![Object.prototype, null].includes(Object.getPrototypeOf(raw))) throw new TypeError('Los parámetros deben ser un objeto.');
  for (const key of Object.keys(raw)) if (!Object.hasOwn(defaults, key)) throw new RangeError(`Parámetro desconocido: ${key}`);
  return {...defaults, ...raw};
}

function numeric(value, name, minimum, maximum, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum || (integer && !Number.isInteger(value))) throw new RangeError(`${name}: número ${integer ? 'entero ' : ''}entre ${minimum} y ${maximum}.`);
  return value;
}

function choice(value, name, choices) {
  if (!choices.includes(value)) throw new RangeError(`${name}: opción desconocida.`);
  return value;
}

function boolean(value, name) {
  if (typeof value !== 'boolean') throw new TypeError(`${name}: se requiere un booleano.`);
}

function vector(values, name, length, minimum = 0, maximum = 100) {
  if (!Array.isArray(values) || values.length !== length) throw new RangeError(`${name}: se requieren ${length} números.`);
  return Array.from(values, value => numeric(value, name, minimum, maximum));
}

function normalize(values) {
  const total = sum(values);
  if (!(total > 0)) throw new RangeError('Al menos un peso debe ser positivo.');
  return values.map(value => value / total);
}

function allocateDots(probabilities) {
  const expected = probabilities.map(value => value * 400);
  const allocated = expected.map(Math.floor);
  const order = expected.map((value, index) => ({index, remainder: value - allocated[index]})).sort((first, second) => second.remainder - first.remainder);
  const remaining = 400 - sum(allocated);
  for (let index = 0; index < remaining; index++) allocated[order[index].index]++;
  return allocated;
}

function interval(lower, upper, minimum = -10000, maximum = 10000) {
  numeric(lower, 'Límite inferior', minimum, maximum);
  numeric(upper, 'Límite superior', minimum, maximum);
  if (lower > upper) throw new RangeError('El límite inferior no puede superar el superior.');
  return [lower, upper];
}

function moments(values, probabilities) {
  const mean = sum(values.map((value, index) => value * probabilities[index]));
  const variance = sum(values.map((value, index) => (value - mean) ** 2 * probabilities[index]));
  return {mean, variance};
}

function generator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296 + 0.5 / 4294967296;
  };
}

const curvePoints = (domain, density, count = 240) => Array.from({length: count + 1}, (_, index) => {
  const value = domain[0] + (domain[1] - domain[0]) * index / count;
  return [value, density(value)];
});
const plot = (kind, domain, xTitle, yTitle, legend, data) => ({kind, domain, xTitle, yTitle, legend, ...data});
const bars = (values, probabilities, extra = {}) => plot('bars', [Math.min(...values) - 0.5, Math.max(...values) + 0.5], 'Valor de X', 'Probabilidad', 'Masa de probabilidad', {values, heights: probabilities, probabilities, ...extra});

const DEFAULTS = {
  math: {function: 'linear', height: 1, lower: 2, upper: 5},
  events: {weights: [30, 20, 10, 40], operation: 'union', condition: 'all'},
  bayes: {prevalence: 0.1, sensitivity: 0.9, specificity: 0.95, cohort: 1000},
  variable: {weights: [1, 3, 3, 1], display: 'pmf', threshold: 1},
  density: {family: 'uniform', a: 0, b: 10, lower: 2, upper: 5},
  expectation: {values: [0, 1, 2], weights: [1, 2, 1]},
  joint: {weights: [3, 2, 1, 4], row: 1, column: 1},
  independence: {pA: 0.5, pB: 0.6, association: 0},
  covariance: {rho: 0.6, count: 60, seed: 17},
  sampling: {n: 10, repetitions: 500, mu: 10, sigma: 2, seed: 42},
  multinomial: {n:3, weights:[2,1,1]},
  'continuous-joint': {limit:2, knownX:0.5, threshold:0.8},
  'bivariate-normal': {muX:12, muY:30, sigmaX:2, sigmaY:4, rho:0.6, knownX:14, threshold:35}
};

const FAMILIES = [
  ['bernoulli', 'Bernoulli', {p: 0.3}, [0, 1]],
  ['binomial', 'Binomial', {n: 6, p: 0.3}, [1, 3]],
  ['geometric', 'Geométrica (ensayos)', {p: 0.3}, [1, 3]],
  ['negative-binomial', 'Binomial negativa (fracasos)', {r: 3, p: 0.5}, [0, 4]],
  ['hypergeometric', 'Hipergeométrica', {N: 40, K: 12, draws: 6}, [1, 3]],
  ['poisson', 'Poisson', {lambda: 2}, [0, 3]],
  ['discrete-uniform', 'Uniforme discreta', {a: 1, b: 6}, [2, 4]],
  ['uniform', 'Uniforme continua', {a: 0, b: 10}, [2, 5]],
  ['exponential', 'Exponencial (tasa)', {rate: 0.5}, [0, 2]],
  ['gamma', 'Gamma (forma y escala)', {shape: 2, scale: 2}, [1, 5]],
  ['normal', 'Normal', {mu: 0, sigma: 1}, [-1, 1]],
  ['chi-square', 'Chi-cuadrado', {df: 4}, [1, 5]],
  ['student', 'Student', {df: 8}, [-1, 1]],
  ['fisher', 'Fisher F', {df1: 5, df2: 10}, [0.5, 2]],
  ['cauchy', 'Cauchy', {mu: 0, scale: 1}, [-1, 1]],
  ['weibull', 'Weibull', {shape: 2, scale: 2}, [1, 3]]
];

function familyDefinition(id) {
  const definition = FAMILIES.find(item => item[0] === id);
  if (!definition) throw new RangeError('Familia de distribución desconocida.');
  return definition;
}

function modelDefaults(family) {
  const [, , defaults, limits] = familyDefinition(family);
  return {family, ...defaults, lower: limits[0], upper: limits[1], conditioned: false, givenLower: limits[0], givenUpper: limits[1]};
}

function modelEngine(params) {
  const stats = library();
  const {family, n, p, r, N, K, draws, lambda, a, b, rate, shape, scale, mu, sigma, df, df1, df2} = params;
  if ('p' in params) numeric(p, 'p', family === 'geometric' || family === 'negative-binomial' ? 0.02 : 0, 1);
  if ('n' in params) numeric(n, 'n', 0, 200, true);
  if ('r' in params) numeric(r, 'Éxitos r', 1, 30, true);
  if ('N' in params) {
    numeric(N, 'Población N', 1, 200, true);
    numeric(K, 'Éxitos K', 0, N, true);
    numeric(draws, 'Extracciones', 0, N, true);
  }
  if ('lambda' in params) numeric(lambda, 'Lambda', 0, 80);
  if ('a' in params) {
    numeric(a, 'a', -100, 100, family === 'discrete-uniform');
    numeric(b, 'b', -100, 100, family === 'discrete-uniform');
    if (family === 'discrete-uniform' ? a > b : b - a < 0.01) throw new RangeError('Soporte inválido: b debe ser mayor que a (ancho mínimo 0,01 en continuo).');
  }
  if ('rate' in params) numeric(rate, 'Tasa', 0.05, 10);
  if ('shape' in params) numeric(shape, 'Forma', 0.2, 20);
  if ('scale' in params) numeric(scale, 'Escala', 0.05, 20);
  if ('mu' in params) numeric(mu, 'Media / localización', -100, 100);
  if ('sigma' in params) numeric(sigma, 'Desviación típica', 0.05, 20);
  for (const key of ['df', 'df1', 'df2']) if (key in params) numeric(params[key], key, 1, 100, true);
  let discrete = false;
  let support = [0, Infinity];
  let pdf;
  let cdf;
  let inv;
  let mean;
  let variance;
  let convention = '';
  switch (family) {
    case 'bernoulli':
    case 'binomial': {
      const trials = family === 'bernoulli' ? 1 : n;
      discrete = true;
      support = [0, trials];
      const atom = p === 0 || trials === 0 ? 0 : p === 1 ? trials : null;
      pdf = value => atom === null ? stats.binomial.pdf(value, trials, p) : Number(value === atom);
      cdf = value => atom === null ? stats.binomial.cdf(value, trials, p) : Number(value >= atom);
      mean = trials * p;
      variance = trials * p * (1 - p);
      convention = 'Cuenta éxitos en ensayos independientes con la misma p.';
      break;
    }
    case 'geometric':
    case 'negative-binomial': {
      const successes = family === 'geometric' ? 1 : r;
      const shift = family === 'geometric' ? 1 : 0;
      discrete = true;
      support = [shift, Infinity];
      pdf = value => p === 1 ? Number(value === shift) : Math.exp(stats.gammaln(value - shift + successes) - stats.gammaln(successes) - stats.gammaln(value - shift + 1) + successes * Math.log(p) + (value - shift) * Math.log1p(-p));
      cdf = value => p === 1 ? Number(value >= shift) : stats.ibeta(p, successes, value - shift + 1);
      mean = successes * (1 - p) / p + shift;
      variance = successes * (1 - p) / (p * p);
      convention = shift ? 'X cuenta ensayos hasta el primer éxito: soporte 1, 2, …; es uno más que el número de fracasos.' : 'X cuenta fracasos antes de r éxitos: soporte 0, 1, …; no cuenta ensayos totales.';
      break;
    }
    case 'hypergeometric':
      discrete = true;
      support = [Math.max(0, draws - (N - K)), Math.min(draws, K)];
      pdf = value => support[0] === support[1] ? Number(value === support[0]) : stats.hypgeom.pdf(value, N, K, draws);
      cdf = value => support[0] === support[1] ? Number(value >= support[0]) : stats.hypgeom.cdf(value, N, K, draws);
      mean = draws * K / N;
      variance = N === 1 ? 0 : draws * K / N * (1 - K / N) * (N - draws) / (N - 1);
      convention = 'Cuenta éxitos al extraer sin reemplazo de una población finita.';
      break;
    case 'poisson':
      discrete = true;
      pdf = value => lambda === 0 ? Number(value === 0) : stats.poisson.pdf(value, lambda);
      cdf = value => lambda === 0 ? 1 : value <= 150 ? stats.poisson.cdf(value, lambda) : 1 - stats.lowRegGamma(value + 1, lambda);
      mean = variance = lambda;
      convention = 'Cuenta eventos con tasa constante e incrementos independientes; lambda es tasa por exposición.';
      break;
    case 'discrete-uniform':
      discrete = true;
      support = [a, b];
      pdf = () => 1 / (b - a + 1);
      cdf = value => (value - a + 1) / (b - a + 1);
      mean = (a + b) / 2;
      variance = ((b - a + 1) ** 2 - 1) / 12;
      convention = 'Todos los enteros del soporte tienen la misma masa.';
      break;
    case 'uniform':
      support = [a, b];
      pdf = value => stats.uniform.pdf(value, a, b);
      cdf = value => stats.uniform.cdf(value, a, b);
      inv = probability => stats.uniform.inv(probability, a, b);
      mean = stats.uniform.mean(a, b);
      variance = stats.uniform.variance(a, b);
      break;
    case 'exponential':
      pdf = value => stats.exponential.pdf(value, rate);
      cdf = value => stats.exponential.cdf(value, rate);
      inv = probability => stats.exponential.inv(probability, rate);
      mean = stats.exponential.mean(rate);
      variance = stats.exponential.variance(rate);
      convention = `La tasa es ${numberText(rate)}; la escala (tiempo medio) es su inversa.`;
      break;
    case 'gamma':
      pdf = value => stats.gamma.pdf(value, shape, scale);
      cdf = value => stats.gamma.cdf(value, shape, scale);
      inv = probability => stats.gamma.inv(probability, shape, scale);
      mean = stats.gamma.mean(shape, scale);
      variance = stats.gamma.variance(shape, scale);
      convention = 'Gamma usa forma y escala; la escala no es una tasa.';
      break;
    case 'normal':
      support = [-Infinity, Infinity];
      pdf = value => stats.normal.pdf(value, mu, sigma);
      cdf = value => stats.normal.cdf(value, mu, sigma);
      inv = probability => stats.normal.inv(probability, mu, sigma);
      mean = mu;
      variance = sigma * sigma;
      convention = 'El control de escala es la desviación típica sigma, no la varianza.';
      break;
    case 'chi-square':
      pdf = value => stats.chisquare.pdf(value, df);
      cdf = value => stats.chisquare.cdf(value, df);
      inv = probability => stats.chisquare.inv(probability, df);
      mean = stats.chisquare.mean(df);
      variance = stats.chisquare.variance(df);
      break;
    case 'student':
      support = [-Infinity, Infinity];
      pdf = value => stats.studentt.pdf(value, df);
      cdf = value => stats.studentt.cdf(value, df);
      inv = probability => stats.studentt.inv(probability, df);
      mean = df > 1 ? 0 : null;
      variance = df > 2 ? df / (df - 2) : null;
      convention = 'Student está centrada por simetría; la media solo existe con df > 1 y la varianza finita con df > 2.';
      break;
    case 'fisher':
      pdf = value => stats.centralF.pdf(value, df1, df2);
      cdf = value => stats.centralF.cdf(value, df1, df2);
      inv = probability => stats.centralF.inv(probability, df1, df2);
      mean = df2 > 2 ? df2 / (df2 - 2) : null;
      variance = df2 > 4 ? 2 * df2 * df2 * (df1 + df2 - 2) / (df1 * (df2 - 2) ** 2 * (df2 - 4)) : null;
      convention = 'Fisher usa dos grados de libertad; la media existe con df2 > 2 y la varianza finita con df2 > 4.';
      break;
    case 'cauchy':
      support = [-Infinity, Infinity];
      pdf = value => stats.cauchy.pdf(value, mu, scale);
      cdf = value => stats.cauchy.cdf(value, mu, scale);
      inv = probability => stats.cauchy.inv(probability, mu, scale);
      mean = variance = null;
      convention = 'La localización es una mediana, no una esperanza: Cauchy no tiene media ni varianza finitas.';
      break;
    case 'weibull':
      pdf = value => stats.weibull.pdf(value, scale, shape);
      cdf = value => stats.weibull.cdf(value, scale, shape);
      inv = probability => stats.weibull.inv(probability, scale, shape);
      mean = stats.weibull.mean(scale, shape);
      variance = stats.weibull.variance(scale, shape);
      convention = 'Weibull usa escala y forma positivas.';
      break;
  }
  const distribution = value => {
    if (value < support[0]) return 0;
    if (value >= support[1]) return 1;
    return clampProbability(cdf(discrete ? Math.floor(value) : value));
  };
  const density = value => {
    if (value < support[0] || value > support[1] || (discrete && !Number.isInteger(value))) return 0;
    const height = pdf(value);
    if (discrete) return clampProbability(height);
    if (Number.isNaN(height) || height < 0) throw new RangeError('Densidad numéricamente inválida.');
    return height;
  };
  const probability = (lower, upper) => {
    if (lower > upper) return 0;
    return clampProbability(distribution(upper) - distribution(discrete ? Math.ceil(lower) - 1 : lower));
  };
  const quantile = probabilityValue => {
    if (!discrete) return inv(probabilityValue);
    let lower = support[0];
    let upper = Number.isFinite(support[1]) ? support[1] : Math.max(1, lower);
    while (distribution(upper) < probabilityValue && upper < 1000000) upper *= 2;
    while (lower < upper) {
      const midpoint = Math.floor((lower + upper) / 2);
      if (distribution(midpoint) < probabilityValue) lower = midpoint + 1;
      else upper = midpoint;
    }
    return lower;
  };
  return {discrete, support, density, distribution, probability, quantile, mean, variance, convention};
}

function calculateModel(labId, raw) {
  const alias = labId === 'models' ? 'binomial' : labId;
  const family = Object.hasOwn(raw ?? {}, 'family') ? raw.family : alias;
  const params = parameters(raw, modelDefaults(family));
  boolean(params.conditioned, 'Condicionamiento');
  interval(params.lower, params.upper);
  interval(params.givenLower, params.givenUpper);
  const engine = modelEngine(params);
  const {lower, upper, givenLower, givenUpper, conditioned} = params;
  const baseProbability = engine.probability(lower, upper);
  const denominator = conditioned ? engine.probability(givenLower, givenUpper) : 1;
  const numerator = conditioned ? engine.probability(Math.max(lower, givenLower), Math.min(upper, givenUpper)) : baseProbability;
  const probability = ratio(numerator, denominator);
  const selectedInterval = conditioned ? [Math.max(lower, givenLower), Math.min(upper, givenUpper)] : [lower, upper];
  let visual;
  let drawnLower;
  let drawnUpper;
  if (engine.discrete) {
    drawnLower = Number.isFinite(engine.support[1]) ? engine.support[0] : engine.quantile(0.0005);
    drawnUpper = Number.isFinite(engine.support[1]) ? engine.support[1] : engine.quantile(0.9995);
    if (drawnUpper - drawnLower > 200) {
      drawnLower = Math.max(drawnLower, engine.quantile(0.5) - 100);
      drawnUpper = drawnLower + 200;
    }
    const values = Array.from({length: drawnUpper - drawnLower + 1}, (_, index) => drawnLower + index);
    const probabilities = values.map(engine.density);
    visual = bars(values, probabilities, {selectedInterval, givenInterval: conditioned ? [givenLower, givenUpper] : null});
  } else {
    drawnLower = Number.isFinite(engine.support[0]) ? engine.support[0] : engine.quantile(0.005);
    drawnUpper = Number.isFinite(engine.support[1]) ? engine.support[1] : engine.quantile(0.995);
    if (engine.support[0] === 0 && !Number.isFinite(engine.support[1])) drawnUpper = Math.min(drawnUpper, engine.quantile(0.95) * 1.8);
    if (!Number.isFinite(drawnLower) || !Number.isFinite(drawnUpper) || !(drawnUpper > drawnLower)) throw new RangeError('No se pudo encuadrar la distribución.');
    const singularStart = !Number.isFinite(engine.density(drawnLower));
    const start = singularStart ? drawnLower + (drawnUpper - drawnLower) / 1000 : drawnLower;
    const points = curvePoints([start, drawnUpper], engine.density);
    visual = plot('curve', [drawnLower, drawnUpper], 'Valor de X', 'Densidad (1/unidad de X)', 'Área azul = probabilidad del intervalo', {points, selectedInterval, givenInterval: conditioned ? [givenLower, givenUpper] : null, singularStart});
  }
  const tailLeft = engine.distribution(engine.discrete ? drawnLower - 1 : visual.points[0][0]);
  const tailRight = clampProbability(1 - engine.distribution(drawnUpper));
  const tail = clampProbability(tailLeft + tailRight);
  visual = {...visual, family, support: engine.support, probability, baseProbability, numerator, denominator, tailLeft, tailRight, tail, mean: engine.mean, variance: engine.variance, params: {...params}};
  const conditionalText = conditioned ? ` Se calcula la intersección de ambos intervalos y se divide por P(condición) = ${numberText(denominator)}; ${denominator > 0 ? 'las alturas siguen mostrando la distribución original, no una densidad renormalizada.' : 'un denominador nulo (evento imposible o precisión numérica insuficiente) no permite calcular esta condicional.'}` : '';
  const explanation = `${engine.convention} ${engine.discrete ? 'Las barras son masas: sumamos los enteros del intervalo cerrado, incluidos los extremos.' : 'La probabilidad es un área de densidad; un punto aislado tiene probabilidad cero.'}${conditionalText} Cola no dibujada: ${numberText(tail)} (izquierda ${numberText(tailLeft)}, derecha ${numberText(tailRight)}); los cálculos del intervalo incluyen las colas aunque queden fuera del marco.${visual.singularStart ? ' La densidad diverge en el extremo cero; la curva empieza un poco después y no muestra esa altura infinita. El área inicial omitida se incluye en la cola izquierda.' : ''} Los parámetros son didácticos, no un ajuste a datos observados.`;
  return result(`Modelo ${familyDefinition(family)[1]}`, explanation, [metric(conditioned ? 'P(intervalo | condición)' : 'P(intervalo)', probability), metric('P(intervalo sin condicionar)', baseProbability), metric('P(condición)', denominator), metric('Esperanza (si existe)', engine.mean), metric('Varianza finita (si existe)', engine.variance), metric('Cola no dibujada', tail)], visual);
}

export function calculateLab(labId, raw = {}) {
  if (!LAB_IDS.includes(labId)) throw new RangeError('Identificador de laboratorio desconocido.');
  if (['models', 'binomial', 'poisson', 'normal'].includes(labId)) return calculateModel(labId, raw);
  const params = parameters(raw, DEFAULTS[labId]);
  switch (labId) {
    case 'math': {
      const power = ['constant', 'linear', 'quadratic'].indexOf(choice(params.function, 'Función', ['constant', 'linear', 'quadratic']));
      numeric(params.height, 'Altura en x=10', 0, 5);
      interval(params.lower, params.upper, 0, 10);
      const primitive = value => params.height * value ** (power + 1) / ((power + 1) * 10 ** power);
      const area = primitive(params.upper) - primitive(params.lower);
      const total = primitive(10);
      return result('Integrar es acumular área', 'En el intervalo [0,10], la integral suma áreas bajo una función no negativa: altura por anchura para la constante, o áreas variables para las otras curvas. La primitiva evaluada en el extremo superior menos el inferior da el área sombreada. No es automáticamente una probabilidad: solo lo sería tras dividir por el área total, si esta es positiva.', [metric('Área del intervalo', area, 'unidades²'), metric('Área total [0,10]', total, 'unidades²'), metric('Fracción de área', ratio(area, total))], plot('curve', [0, 10], 'x (unidades)', 'f(x) (unidades)', 'Azul: área del intervalo', {points: curvePoints([0, 10], value => params.height * (value / 10) ** power), selectedInterval: [params.lower, params.upper], area, total, tex: '\\int_a^b f(x)\\,dx=F(b)-F(a)'}));
    }
    case 'events': {
      const probabilities = normalize(vector(params.weights, 'Pesos', 4));
      choice(params.operation, 'Suceso', ['A', 'B', 'union', 'intersection', 'complement']);
      choice(params.condition, 'Condición', ['all', 'A', 'B', 'notA', 'notB']);
      const selected = {A: [0, 2], B: [1, 2], union: [0, 1, 2], intersection: [2], complement: [1, 3]}[params.operation];
      const reference = {all: [0, 1, 2, 3], A: [0, 2], B: [1, 2], notA: [1, 3], notB: [0, 3]}[params.condition];
      const numerator = sum(probabilities.filter((_, index) => selected.includes(index) && reference.includes(index)));
      const denominator = sum(probabilities.filter((_, index) => reference.includes(index)));
      const probability = ratio(numerator, denominator);
      const groups = ['Solo A', 'Solo B', 'A y B', 'Ninguno'].map((label, index) => ({label, probability: probabilities[index], selected: selected.includes(index) && reference.includes(index), reference: reference.includes(index)}));
      return result('Sucesos y denominadores', 'Los cuatro pesos describen regiones disjuntas válidas y se normalizan por su suma. Unión reúne A o B sin contar dos veces la intersección; complemento significa no A. Condicionar conserva solo el grupo de referencia: el numerador es la intersección con el suceso elegido, y el denominador es la probabilidad de la condición. Si el denominador vale cero, la condicional no está definida. Los puntos ilustran proporciones redondeadas, no observaciones; las marcas atenuadas no están seleccionadas y las más tenues quedan fuera de la condición.', [metric('P(suceso | condición)', probability), metric('Numerador: masa seleccionada', numerator), metric('Denominador: masa de referencia', denominator), metric('Suma de regiones', sum(probabilities))], plot('dots', [0, 20], 'Columna de puntos ilustrativos', 'Fila de puntos', 'Azul/verde/rojo/ocre: solo A / solo B / ambos / ninguno', {groups, probabilities, dotCounts: allocateDots(probabilities), numerator, denominator, probability}));
    }
    case 'bayes': {
      for (const key of ['prevalence', 'sensitivity', 'specificity']) numeric(params[key], key, 0, 1);
      numeric(params.cohort, 'Cohorte', 100, 10000, true);
      const {prevalence, sensitivity, specificity, cohort} = params;
      const probabilities = [prevalence * sensitivity, prevalence * (1 - sensitivity), (1 - prevalence) * (1 - specificity), (1 - prevalence) * specificity];
      const counts = probabilities.map(value => value * cohort);
      const positives = counts[0] + counts[2];
      const positiveProbability = probabilities[0] + probabilities[2];
      const posterior = ratio(probabilities[0], positiveProbability);
      const groups = ['Enfermo +', 'Enfermo -', 'Sano +', 'Sano -'].map((label, index) => ({label, probability: probabilities[index], count: counts[index], selected: index === 0 || index === 2, reference: true}));
      return result('Bayes: de positivo a infección', 'Son recuentos ESPERADOS en una cohorte hipotética, no resultados observados: pueden ser fraccionarios. Los puntos representan una asignación redondeada de 400 marcas; cada marca equivale a cohorte/400 individuos esperados y no a un paciente observado. Los negativos están atenuados. VPP divide los verdaderos positivos esperados entre TODOS los positivos esperados, incluidos los falsos positivos. Sensibilidad es la probabilidad inversa y no es VPP. Sin positivos posibles, VPP no está definido.', [metric('VPP: P(enfermedad | +)', posterior), metric('P(test positivo)', positiveProbability), metric('Positivos esperados', positives, 'individuos'), ...counts.map((count, index) => metric(`${groups[index].label}: esperado`, count, 'individuos'))], plot('dots', [0, 20], 'Columna de marcas esperadas', 'Fila de marcas', 'Azul E+ / verde E- / rojo S+ / ocre S-; reparto redondeado', {groups, probabilities, dotCounts: allocateDots(probabilities), counts, positives, posterior, positiveProbability, cohort}));
    }
    case 'variable': {
      const probabilities = normalize(vector(params.weights, 'Pesos', 4));
      choice(params.display, 'Representación', ['pmf', 'cdf']);
      numeric(params.threshold, 'Umbral', 0, 3, true);
      const cumulative = probabilities.map((_, index) => sum(probabilities.slice(0, index + 1)));
      return result('Variable discreta: masa y acumulada', 'X toma los valores 0, 1, 2 y 3; sus pesos se normalizan. La función de masa P(X=x) reparte la probabilidad entre resultados y suma uno. La acumulada F(x)=P(X≤x) suma hasta el umbral y crece hasta uno: sus alturas no se suman entre sí. En la vista acumulada, la línea escalonada permanece constante entre enteros.', [metric('F(umbral)', cumulative[params.threshold]), metric('P(X = umbral)', probabilities[params.threshold]), metric('Suma de masas', sum(probabilities))], bars([0, 1, 2, 3], probabilities, {kind: params.display === 'cdf' ? 'steps' : 'bars', heights: params.display === 'cdf' ? cumulative : probabilities, cumulative, display: params.display, selectedInterval: [0, params.threshold], yTitle: params.display === 'cdf' ? 'F(x): probabilidad acumulada' : 'P(X=x)', legend: params.display === 'cdf' ? 'Acumulada escalonada, no masa' : 'Masa de probabilidad'}));
    }
    case 'density': {
      choice(params.family, 'Densidad', ['uniform', 'triangular']);
      numeric(params.a, 'a', -10, 10);
      numeric(params.b, 'b', -10, 20);
      if (params.b - params.a < 0.1) throw new RangeError('La densidad necesita b-a ≥ 0,1.');
      interval(params.lower, params.upper, -20, 30);
      const {a, b, family} = params;
      const width = b - a;
      const center = (a + b) / 2;
      const density = value => value < a || value > b ? 0 : family === 'uniform' ? 1 / width : value <= center ? 4 * (value - a) / width ** 2 : 4 * (b - value) / width ** 2;
      const cumulative = value => value <= a ? 0 : value >= b ? 1 : family === 'uniform' ? (value - a) / width : value <= center ? 2 * ((value - a) / width) ** 2 : 1 - 2 * ((b - value) / width) ** 2;
      const probability = clampProbability(cumulative(params.upper) - cumulative(params.lower));
      return result('Densidad y probabilidad son distintas', 'La uniforme tiene altura 1/(b-a); la triangular simétrica sube hasta el punto medio y vuelve a cero. Ambas tienen área total uno. El intervalo se recorta al soporte al integrar: fuera de [a,b] la densidad es cero. Una altura de densidad puede superar uno en un soporte estrecho; no es una probabilidad. Un punto no tiene anchura y su probabilidad es cero.', [metric('P(intervalo)', probability), metric('Densidad en el punto medio', density(center), '1/unidad'), metric('P(X = punto medio)', 0), metric('Área total', 1)], plot('curve', [a, b], 'X (unidades)', 'Densidad (1/unidad)', 'Azul: área del intervalo; línea: densidad', {points: curvePoints([a, b], density), selectedInterval: [params.lower, params.upper], support: [a, b], probability, densityAtCenter: density(center), total: 1}));
    }
    case 'expectation': {
      const values = vector(params.values, 'Valores', 3, -20, 20);
      const probabilities = normalize(vector(params.weights, 'Pesos', 3));
      const {mean, variance} = moments(values, probabilities);
      const order = values.map((value, index) => ({value, probability: probabilities[index]})).sort((left, right) => left.value - right.value);
      const unique = [...new Set(order.map(item => item.value))];
      const masses = unique.map(value => sum(order.filter(item => item.value === value).map(item => item.probability)));
      return result('Esperanza: ponderar, no contar barras', 'Cada resultado contribuye x·p(x) a la media. La varianza suma p(x)·(x-media)²: mide dispersión en unidades cuadradas. Los valores repetidos se agrupan en una única barra sin perder su peso. La línea vertical señala la media, que puede no ser un resultado posible. No dividimos por el número de categorías: los pesos ya suman uno.', [metric('Esperanza', mean, 'unidades'), metric('Varianza', variance, 'unidades²'), metric('Desviación típica', Math.sqrt(variance), 'unidades')], bars(unique, masses, {mean, variance, inputValues: values, inputProbabilities: probabilities}));
    }
    case 'joint': {
      const probabilities = normalize(vector(params.weights, 'Pesos de celdas', 4));
      numeric(params.row, 'Fila', 0, 1, true);
      numeric(params.column, 'Columna', 0, 1, true);
      const rows = [probabilities[0] + probabilities[1], probabilities[2] + probabilities[3]];
      const columns = [probabilities[0] + probabilities[2], probabilities[1] + probabilities[3]];
      const cell = probabilities[2 * params.row + params.column];
      const conditional = ratio(cell, rows[params.row]);
      return result('Conjunta, marginal y condicional', 'Los cuatro pesos no negativos se dividen por el total. Una celda es una probabilidad conjunta; sumar su fila da la marginal de A, y sumar su columna da la marginal de B. Para P(B=columna | A=fila), el denominador es toda la fila, no toda la tabla. Las condicionales de una fila positiva suman uno; una fila sin masa no define condicionales.', [metric('P(A=fila, B=columna)', cell), metric('P(A=fila)', rows[params.row]), metric('P(B=columna)', columns[params.column]), metric('P(B=columna | A=fila)', conditional), metric('Suma conjunta', sum(probabilities))], plot('matrix', [0, 2], 'Columna: B', 'Fila: A', 'Color = masa conjunta; totales = marginales', {probabilities, rows, columns, selected: 2 * params.row + params.column, conditional, conditionalRow: probabilities.slice(2 * params.row, 2 * params.row + 2).map(value => ratio(value, rows[params.row]))}));
    }
    case 'multinomial': {
      numeric(params.n, 'Ensayos', 1, 6, true);
      const categoryProbabilities = normalize(vector(params.weights, 'Pesos', 3));
      const size = params.n + 1;
      const factorial = value => { let product = 1; for (let factor = 2; factor <= value; factor++) product *= factor; return product; };
      const probabilities = Array.from({length:size * size}, (_, index) => {
        const first = Math.floor(index / size);
        const second = index % size;
        const third = params.n - first - second;
        if (third < 0) return 0;
        return factorial(params.n) / (factorial(first) * factorial(second) * factorial(third)) * categoryProbabilities[0] ** first * categoryProbabilities[1] ** second * categoryProbabilities[2] ** third;
      });
      const rows = Array.from({length:size}, (_, row) => sum(probabilities.slice(row * size, (row + 1) * size)));
      const columns = Array.from({length:size}, (_, column) => sum(probabilities.filter((_, index) => index % size === column)));
      const covariance = -params.n * categoryProbabilities[0] * categoryProbabilities[1];
      return result('Trinomial: dos recuentos y un tercero determinado', 'Cada celda describe X e Y simultáneamente; Z es n-X-Y. La zona con X+Y>n tiene masa cero. Los pesos normalizados son probabilidades de categorías por ensayo, no masas de celdas. Los totales de filas y columnas son marginales binomiales. La suma conjunta es uno y la covarianza negativa refleja competencia por un total fijo, no necesariamente un mecanismo causal.', [metric('Suma conjunta', sum(probabilities)), ...categoryProbabilities.map((value, index) => metric(`Probabilidad categoría ${index + 1}`, value)), metric('E[X]', params.n * categoryProbabilities[0]), metric('E[Y]', params.n * categoryProbabilities[1]), metric('Cov(X,Y)', covariance)], plot('matrix', [0,size], 'Columnas: recuento Y', 'Filas: recuento X', 'Z=n-X-Y; totales marginales; ceros fuera del soporte', {probabilities, rows, columns, yDomain:[0,size], rowName:'X', columnName:'Y', categoryProbabilities, covariance}));
    }
    case 'continuous-joint': {
      numeric(params.limit, 'L', 0.5, 5);
      numeric(params.knownX, 'X conocido', 0, params.limit);
      numeric(params.threshold, 'Umbral Y', 0, 5);
      if (params.knownX >= params.limit) throw new RangeError('X conocido debe ser menor que L: en la frontera la marginal es cero.');
      const width = params.limit - params.knownX;
      const density = 2 / params.limit ** 2;
      const marginal = density * width;
      const probability = Math.max(0, width - params.threshold) / width;
      const baseProbability = (Math.max(0, params.limit - params.threshold) / params.limit) ** 2;
      return result('Triángulo: superficie, marginal y corte', 'El soporte es x≥0, y≥0, x+y≤L. Su área L²/2 multiplica la densidad constante 2/L² para obtener uno. La marginal fX(x) integra hasta L-x y vale 2(L-x)/L²; no es uniforme. El cociente entre densidad conjunta y marginal da una uniforme condicional de Y en [0,L-x]. El tramo oscuro del corte satisface Y>umbral. Su longitud dividida por L-x da la probabilidad condicional, distinta de integrar toda la región superior del triángulo.', [metric('Área total de probabilidad', 1), metric('Densidad conjunta', density, '1/unidades²'), metric('Marginal fX(x)', marginal, '1/unidad'), metric('Densidad de Y dado X=x', 1 / width, '1/unidad'), metric('Máximo Y dado X=x', width), metric('P(Y>umbral | X=x)', probability), metric('P(Y>umbral) marginal', baseProbability)], plot('region', [0,params.limit], 'X (unidades)', 'Y (unidades)', 'Triángulo: soporte; verde: corte; rosa: umbral', {yDomain:[0,params.limit], limit:params.limit, knownX:params.knownX, threshold:params.threshold, width, probability, density, marginal, tex:String.raw`f_{Y\mid X}(y\mid x)=\frac{1}{L-x},\quad 0<y<L-x`}));
    }
    case 'bivariate-normal': {
      for (const key of ['muX','muY','knownX','threshold']) numeric(params[key], key, -100, 100);
      for (const key of ['sigmaX','sigmaY']) numeric(params[key], key, 0.1, 20);
      numeric(params.rho, 'Rho', -0.99, 0.99);
      const stats = library();
      const mean = params.muY + params.rho * params.sigmaY / params.sigmaX * (params.knownX - params.muX);
      const variance = params.sigmaY ** 2 * (1 - params.rho ** 2);
      const sd = Math.sqrt(variance);
      const domain = [Math.min(mean - 4 * sd, params.muY - 4 * params.sigmaY), Math.max(mean + 4 * sd, params.muY + 4 * params.sigmaY)];
      const probability = clampProbability(stats.normal.cdf(-params.threshold, -mean, sd));
      return result('Normal bivariante: distribución condicional de Y', 'La normalidad conjunta permite condicionar en un X exacto mediante densidades. La media condicional se desplaza con rho por sigmaY/sigmaX por la distancia de X a su media. La varianza es sigmaY²(1-rho²); su raíz es la desviación usada para calcular la cola. La curva rosa mantiene la marginal original. Las dos curvas incluyen colas fuera del marco de al menos cuatro desviaciones; la probabilidad numérica incluye toda la cola derecha, no solo la sombra visible. Esto expresa incertidumbre de Y, no predicción exacta ni causalidad.', [metric('Media condicional', mean), metric('Varianza condicional', variance), metric('Sigma condicional', sd), metric('P(Y>umbral | X=x)', probability), metric('Media marginal Y', params.muY), metric('Sigma marginal Y', params.sigmaY)], plot('curve', domain, 'Y (unidades)', 'Densidad (1/unidad)', 'Azul: condicional; rosa: marginal; sombra: cola', {points:curvePoints(domain, value => stats.normal.pdf(value, mean, sd)), comparisonPoints:curvePoints(domain, value => stats.normal.pdf(value, params.muY, params.sigmaY)), selectedInterval:[params.threshold,domain[1]], mean, variance, sd, probability, tex:String.raw`\mu_{Y\mid x}=\mu_Y+\rho\frac{\sigma_Y}{\sigma_X}(x-\mu_X),\quad \sigma_{Y\mid x}=\sigma_Y\sqrt{1-\rho^2}`}));
    }
    case 'independence': {
      numeric(params.pA, 'P(A=1)', 0, 1);
      numeric(params.pB, 'P(B=1)', 0, 1);
      numeric(params.association, 'Asociación', -1, 1);
      const {pA, pB, association} = params;
      const product = pA * pB;
      const lower = Math.max(0, pA + pB - 1);
      const upper = Math.min(pA, pB);
      const both = product + association * (association >= 0 ? upper - product : product - lower);
      const probabilities = [1 - pA - pB + both, pB - both, pA - both, both].map(value => Math.max(0, value));
      const rows = [1 - pA, pA];
      const columns = [1 - pB, pB];
      const products = rows.flatMap(row => columns.map(column => row * column));
      const differences = probabilities.map((value, index) => value - products[index]);
      const maxDifference = Math.max(...differences.map(Math.abs));
      return result('Independencia: comprobar todas las celdas', 'El control de asociación mueve la intersección dentro de sus límites válidos, conservando las marginales. Independencia exige que cada celda coincida con el producto de su fila y su columna; asociación cero construye esa factorización. El gráfico anota conjunta / producto, no solo la celda de intersección. Si alguna marginal es cero o uno, puede no quedar margen para crear dependencia. Independencia no significa incompatibilidad ni demuestra causalidad.', [metric('P(A=1, B=1)', both), metric('Producto P(A=1)·P(B=1)', product), metric('Máxima diferencia absoluta', maxDifference), metric('Independientes (tolerancia 10⁻¹²)', maxDifference < 1e-12 ? 1 : 0)], plot('matrix', [0, 2], 'Columna: B', 'Fila: A', 'Cada celda: conjunta / producto marginal', {probabilities, products, differences, rows, columns, selected: 3, independent: maxDifference < 1e-12}));
    }
    case 'covariance': {
      numeric(params.rho, 'Rho objetivo', -1, 1);
      numeric(params.count, 'Puntos', 10, 150, true);
      numeric(params.seed, 'Semilla', 0, 4294967295, true);
      const stats = library();
      const random = generator(params.seed);
      const standardize = values => {
        const mean = sum(values) / values.length;
        const sd = Math.sqrt(sum(values.map(value => (value - mean) ** 2)) / values.length);
        return values.map(value => (value - mean) / sd);
      };
      const xValues = standardize(Array.from({length: params.count}, () => stats.normal.inv(random(), 0, 1)));
      const noise = standardize(Array.from({length: params.count}, () => stats.normal.inv(random(), 0, 1)));
      const yValues = standardize(xValues.map((value, index) => params.rho * value + Math.sqrt(1 - params.rho ** 2) * noise[index]));
      const points = xValues.map((value, index) => [value, yValues[index]]);
      const meanX = sum(xValues) / params.count;
      const meanY = sum(yValues) / params.count;
      const varianceX = sum(xValues.map(value => (value - meanX) ** 2)) / params.count;
      const varianceY = sum(yValues.map(value => (value - meanY) ** 2)) / params.count;
      const covariance = sum(points.map(([horizontal, vertical]) => (horizontal - meanX) * (vertical - meanY))) / params.count;
      const correlation = covariance / Math.sqrt(varianceX * varianceY);
      const extent = Math.max(2, ...points.flat().map(Math.abs)) * 1.12;
      return result('Covarianza en los puntos dibujados', 'Rho objetivo controla una mezcla ilustrativa de normales generadas con semilla fija. Después se estandarizan ambas coordenadas con divisor m; una nube finita no reproduce exactamente el rho objetivo. Las métricas se calculan de TODOS los puntos que ves, con divisor m, no m-1. Las líneas cruzan el centroide; la recta resume su dirección lineal. Correlación no significa causalidad, y covarianza cero no garantiza independencia.', [metric('Rho objetivo de la mezcla', params.rho), metric('Correlación descriptiva de los puntos', correlation), metric('Covarianza descriptiva (divisor m)', covariance), metric('Media X', meanX), metric('Media Y', meanY), metric('Varianza X', varianceX), metric('Varianza Y', varianceY)], plot('scatter', [-extent, extent], 'X estandarizada', 'Y estandarizada', 'Puntos; cruz verde = centroide; roja = recta descriptiva', {points, yDomain: [-extent, extent], meanX, meanY, varianceX, varianceY, covariance, correlation, targetRho: params.rho}));
    }
    case 'sampling': {
      numeric(params.n, 'Tamaño n', 1, 200, true);
      numeric(params.repetitions, 'Repeticiones', 2, 2000, true);
      numeric(params.mu, 'Media poblacional', -20, 20);
      numeric(params.sigma, 'Desviación poblacional', 0.05, 10);
      numeric(params.seed, 'Semilla', 0, 4294967295, true);
      const stats = library();
      const random = generator(params.seed);
      const means = Array.from({length: params.repetitions}, () => {
        let total = 0;
        for (let index = 0; index < params.n; index++) total += stats.normal.inv(random(), params.mu, params.sigma);
        return total / params.n;
      });
      const mean = sum(means) / means.length;
      const variance = sum(means.map(value => (value - mean) ** 2)) / (means.length - 1);
      const theoreticalVariance = params.sigma ** 2 / params.n;
      const standardError = Math.sqrt(theoreticalVariance);
      const domain = [Math.min(...means, params.mu - 4 * standardError), Math.max(...means, params.mu + 4 * standardError)];
      const width = (domain[1] - domain[0]) / 24;
      const counts = Array(24).fill(0);
      for (const value of means) counts[Math.min(23, Math.floor((value - domain[0]) / width))]++;
      const values = counts.map((_, index) => domain[0] + (index + 0.5) * width);
      return result('Repetir muestras, comparar sus medias', 'Cada repetición extrae n observaciones independientes de una población NORMAL mediante cuantiles de jStat y un generador determinista. El histograma contiene todas las medias simuladas; su área es uno. La línea es la distribución normal exacta de la media en este modelo, con varianza sigma²/n: no es una afirmación del TCL para poblaciones arbitrarias. La varianza empírica usa divisor repeticiones-1 y fluctúa alrededor de la teórica. Cambiar la semilla cambia la realización, no la teoría.', [metric('Media empírica de las medias', mean), metric('Varianza empírica (divisor R-1)', variance), metric('Varianza teórica sigma²/n', theoreticalVariance), metric('Error estándar teórico', standardError), metric('Medias simuladas', means.length)], plot('histogram', domain, 'Media muestral', 'Densidad de medias', 'Azul: simulación; roja: normal exacta de la media', {values, heights: counts.map(count => count / (means.length * width)), counts, binWidth: width, means, points: curvePoints(domain, value => stats.normal.pdf(value, params.mu, standardError)), mean: params.mu, empiricalMean: mean, empiricalVariance: variance, theoreticalVariance, standardError}));
    }
  }
}

const slider = (key, label, min, max, step = 0.01, index) => ({key, label, min, max, step, ...(index === undefined ? {} : {index})});
const select = (key, label, options) => ({key, label, options});
const weightControls = labels => labels.map((label, index) => slider('weights', `Peso: ${label}`, 0, 100, 1, index));

function controlsFor(labId, params) {
  switch (labId) {
    case 'math': return [select('function', 'Función', [['constant', 'Constante'], ['linear', 'Lineal creciente'], ['quadratic', 'Cuadrática creciente']]), slider('height', 'Altura en x=10', 0, 5), slider('lower', 'Inicio', 0, 10, 0.1), slider('upper', 'Fin', 0, 10, 0.1)];
    case 'events': return [...weightControls(['solo A', 'solo B', 'A y B', 'ninguno']), select('operation', 'Suceso seleccionado', [['A', 'A'], ['B', 'B'], ['union', 'A unión B'], ['intersection', 'A intersección B'], ['complement', 'Complemento de A']]), select('condition', 'Grupo de referencia', [['all', 'Todo el espacio'], ['A', 'Dado A'], ['B', 'Dado B'], ['notA', 'Dado no A'], ['notB', 'Dado no B']])];
    case 'bayes': return [slider('prevalence', 'Prevalencia', 0, 1, 0.001), slider('sensitivity', 'Sensibilidad', 0, 1, 0.001), slider('specificity', 'Especificidad', 0, 1, 0.001), slider('cohort', 'Cohorte hipotética', 100, 10000, 100)];
    case 'variable': return [...weightControls(['X=0', 'X=1', 'X=2', 'X=3']), select('display', 'Representación', [['pmf', 'Masa P(X=x)'], ['cdf', 'Acumulada F(x)']]), slider('threshold', 'Umbral', 0, 3, 1)];
    case 'density': return [select('family', 'Densidad', [['uniform', 'Uniforme'], ['triangular', 'Triangular simétrica']]), slider('a', 'Soporte: a', -10, 10, 0.1), slider('b', 'Soporte: b', -10, 20, 0.1), slider('lower', 'Inicio del intervalo', -20, 30, 0.1), slider('upper', 'Fin del intervalo', -20, 30, 0.1)];
    case 'expectation': return [...[0, 1, 2].map(index => slider('values', `Resultado ${index + 1}`, -20, 20, 0.5, index)), ...weightControls(['resultado 1', 'resultado 2', 'resultado 3'])];
    case 'joint': return [...weightControls(['A=0, B=0', 'A=0, B=1', 'A=1, B=0', 'A=1, B=1']), select('row', 'Condición A', [[0, 'A=0'], [1, 'A=1']]), select('column', 'Respuesta B', [[0, 'B=0'], [1, 'B=1']])];
    case 'multinomial': return [slider('n', 'Número fijo de ensayos', 1, 6, 1), ...weightControls(['categoría X','categoría Y','categoría Z'])];
    case 'continuous-joint': return [slider('limit', 'Capacidad total L', 0.5, 5, 0.1), slider('knownX', 'X conocido (menor que L)', 0, 5, 0.05), slider('threshold', 'Umbral de Y', 0, 5, 0.05)];
    case 'bivariate-normal': return [slider('muX', 'Media marginal X', -100, 100, 0.1), slider('muY', 'Media marginal Y', -100, 100, 0.1), slider('sigmaX', 'Desviación marginal X', 0.1, 20, 0.1), slider('sigmaY', 'Desviación marginal Y', 0.1, 20, 0.1), slider('rho', 'Correlación conjunta rho', -0.99, 0.99, 0.01), slider('knownX', 'Valor conocido de X', -100, 100, 0.1), slider('threshold', 'Umbral de Y', -100, 100, 0.1)];
    case 'independence': return [slider('pA', 'P(A=1)', 0, 1), slider('pB', 'P(B=1)', 0, 1), slider('association', 'Asociación dentro de límites válidos', -1, 1)];
    case 'covariance': return [slider('rho', 'Rho objetivo (no empírico)', -1, 1), slider('count', 'Puntos', 10, 150, 1), slider('seed', 'Semilla', 0, 4294967295, 1)];
    case 'sampling': return [slider('n', 'Tamaño de cada muestra', 1, 200, 1), slider('repetitions', 'Repeticiones', 2, 2000, 1), slider('mu', 'Media poblacional', -20, 20, 0.1), slider('sigma', 'Desviación poblacional', 0.05, 10, 0.05), slider('seed', 'Semilla', 0, 4294967295, 1)];
    default: {
      const fields = {
        p: slider('p', 'Probabilidad de éxito p', ['geometric', 'negative-binomial'].includes(params.family) ? 0.02 : 0, 1),
        n: slider('n', 'Número de ensayos n', 0, 200, 1), r: slider('r', 'Éxitos requeridos r', 1, 30, 1),
        N: slider('N', 'Población N', 1, 200, 1), K: slider('K', 'Éxitos en población K', 0, params.N ?? 200, 1), draws: slider('draws', 'Extracciones sin reemplazo', 0, params.N ?? 200, 1),
        lambda: slider('lambda', 'Lambda (tasa por exposición)', 0, 80, 0.1),
        a: slider('a', 'Soporte inferior a', -100, 100, params.family === 'discrete-uniform' ? 1 : 0.1), b: slider('b', 'Soporte superior b', -100, 100, params.family === 'discrete-uniform' ? 1 : 0.1),
        rate: slider('rate', 'Tasa (inversa de escala)', 0.05, 10, 0.05), shape: slider('shape', 'Forma', 0.2, 20, 0.1), scale: slider('scale', 'Escala', 0.05, 20, 0.05),
        mu: slider('mu', params.family === 'cauchy' ? 'Localización (mediana)' : 'Media mu', -100, 100, 0.1), sigma: slider('sigma', 'Desviación típica sigma', 0.05, 20, 0.05),
        df: slider('df', 'Grados de libertad', 1, 100, 1), df1: slider('df1', 'Grados de libertad del numerador', 1, 100, 1), df2: slider('df2', 'Grados de libertad del denominador', 1, 100, 1)
      };
      return [select('family', 'Distribución', FAMILIES.map(([id, title]) => [id, title])), ...Object.keys(familyDefinition(params.family)[2]).map(key => fields[key]), slider('lower', 'Inicio del intervalo cerrado', -10000, 10000, 0.1), slider('upper', 'Fin del intervalo cerrado', -10000, 10000, 0.1), {key: 'conditioned', label: 'Condicionar a otro intervalo', toggle: true}, ...(params.conditioned ? [slider('givenLower', 'Inicio de la condición', -10000, 10000, 0.1), slider('givenUpper', 'Fin de la condición', -10000, 10000, 0.1)] : [])];
    }
  }
}

function draw(canvas, visual, width, height) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const scale = canvas.width / width;
  context.setTransform(scale, 0, 0, canvas.height / height, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  const fontSize = width < 480 ? 10 : 13;
  context.font = `${fontSize}px sans-serif`;
  const left = width < 480 ? 42 : 62;
  const top = 29;
  const right = width - (visual.kind === 'matrix' ? 58 : 14);
  const bottom = height - (visual.kind === 'matrix' ? 72 : 57);
  const {domain} = visual;
  const maxHeight = Math.max(0.01, ...(visual.heights ?? []), ...(visual.points ?? []).map(point => point[1]), ...(visual.comparisonPoints ?? []).map(point => point[1]));
  const yDomain = visual.yDomain ?? (visual.kind === 'dots' ? [0, 20] : visual.kind === 'matrix' ? [0, 2] : [0, maxHeight * 1.12]);
  const x = value => left + (value - domain[0]) / (domain[1] - domain[0]) * (right - left);
  const y = value => bottom - (value - yDomain[0]) / (yDomain[1] - yDomain[0]) * (bottom - top);
  const text = (value, horizontal, vertical, maxWidth, color = '#334155', align = 'left') => {
    context.fillStyle = color;
    context.textAlign = align;
    let label = String(value);
    while (label.length > 1 && context.measureText(label).width > maxWidth) label = label.slice(0, -2) + '…';
    context.fillText(label, horizontal, vertical);
  };
  const line = (points, color, lineWidth = 1.6, dashed = false) => {
    context.beginPath();
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.setLineDash(dashed ? [4, 3] : []);
    points.forEach(([horizontal, vertical], index) => index ? context.lineTo(x(horizontal), y(vertical)) : context.moveTo(x(horizontal), y(vertical)));
    context.stroke();
    context.setLineDash([]);
  };
  text(visual.yTitle, 8, 16, width - 16);
  for (let index = 0; index <= (visual.kind === 'matrix' ? visual.rows.length - 1 : 3); index++) {
    if (visual.kind === 'matrix') {
      text(`${visual.rowName || 'A'}=${index}`, left - 5, y(index + 0.5) + 3, left - 8, '#475569', 'right');
      continue;
    }
    const value = yDomain[0] + (yDomain[1] - yDomain[0]) * index / 3;
    line([[domain[0], value], [domain[1], value]], '#e2e8f0', 1);
    text(numberText(value), left - 5, y(value) + 3, left - 8, '#475569', 'right');
  }
  line([[domain[0], yDomain[1]], [domain[0], yDomain[0]], [domain[1], yDomain[0]]], '#64748b', 1);
  const ticks = visual.kind === 'matrix' ? visual.columns.map((_, index) => index + 0.5) : visual.values && visual.values.length <= 5 ? visual.values : Array.from({length: 4}, (_, index) => domain[0] + (domain[1] - domain[0]) * index / 3);
  for (const value of ticks) text(visual.kind === 'matrix' ? `${visual.columnName || 'B'}=${value - 0.5}` : numberText(value), x(value), bottom + 15, (right - left) / Math.max(4,ticks.length), '#475569', 'center');
  if (visual.kind === 'matrix') {
    visual.rows.forEach((value, index) => text(`Σ ${numberText(value)}`, right + 5, y(index + 0.5) + 3, width - right - 8));
    visual.columns.forEach((value, index) => text(`Σ ${numberText(value)}`, x(index + 0.5), bottom + 29, (right - left) / visual.columns.length - 6, '#334155', 'center'));
  }
  text(visual.xTitle, (left + right) / 2, height - 24, right - left, '#334155', 'center');
  text(visual.legend, 8, height - 7, width - 16);
  context.save();
  context.beginPath();
  context.rect(left, top, right - left, bottom - top);
  context.clip();
  if (visual.givenInterval) {
    context.fillStyle = '#15803d18';
    context.fillRect(x(visual.givenInterval[0]), top, x(visual.givenInterval[1]) - x(visual.givenInterval[0]), bottom - top);
  }
  if (['bars', 'histogram'].includes(visual.kind)) {
    const barWidth = visual.binWidth ?? Math.min(0.8, ...visual.values.slice(1).map((value, index) => (value - visual.values[index]) * 0.8));
    visual.values.forEach((value, index) => {
      const selected = !visual.selectedInterval || value >= visual.selectedInterval[0] && value <= visual.selectedInterval[1];
      context.fillStyle = selected ? COLORS[0] : '#94a3b8';
      context.fillRect(x(value - barWidth / 2), y(visual.heights[index]), Math.max(1, x(value + barWidth / 2) - x(value - barWidth / 2) - (visual.binWidth ? 1 : 0)), bottom - y(visual.heights[index]));
    });
  }
  if (visual.kind === 'steps') {
    const points = [[domain[0], 0]];
    visual.values.forEach((value, index) => points.push([value, index ? visual.heights[index - 1] : 0], [value, visual.heights[index]]));
    points.push([domain[1], visual.heights.at(-1)]);
    line(points, COLORS[0], 2);
  }
  if (visual.kind === 'curve') {
    const selection = visual.selectedInterval;
    if (selection && selection[0] < selection[1]) {
      const interpolate = boundary => {
        const index = visual.points.findIndex(point => point[0] >= boundary);
        if (index <= 0) return [boundary, visual.points[0][1]];
        const previous = visual.points[index - 1];
        const next = visual.points[index];
        return [boundary, previous[1] + (next[1] - previous[1]) * (boundary - previous[0]) / (next[0] - previous[0])];
      };
      const start = Math.max(selection[0], visual.points[0][0]);
      const end = Math.min(selection[1], visual.points.at(-1)[0]);
      if (start < end) {
        const points = [interpolate(start), ...visual.points.filter(point => point[0] > start && point[0] < end), interpolate(end)];
        context.beginPath();
        context.moveTo(x(start), y(0));
        for (const point of points) context.lineTo(x(point[0]), y(point[1]));
        context.lineTo(x(end), y(0));
        context.closePath();
        context.fillStyle = '#0369a14d';
        context.fill();
      }
    }
    line(visual.points, COLORS[0], 2);
    if (visual.comparisonPoints) line(visual.comparisonPoints, COLORS[2], 1.6);
  }
  if (visual.kind === 'region') {
    context.beginPath();
    context.moveTo(x(0),y(0));
    context.lineTo(x(visual.limit),y(0));
    context.lineTo(x(0),y(visual.limit));
    context.closePath();
    context.fillStyle = '#dbeafe';
    context.fill();
    line([[0,visual.limit],[visual.limit,0]], COLORS[0], 2);
    line([[visual.knownX,0],[visual.knownX,visual.width]], COLORS[1], 4);
    if (visual.threshold < visual.width) line([[visual.knownX,visual.threshold],[visual.knownX,visual.width]], '#064e3b', 7);
    line([[0,visual.threshold],[visual.limit,visual.threshold]], COLORS[2], 1.6, true);
  }
  if (visual.kind === 'histogram') line(visual.points, COLORS[2], 2);
  if (visual.kind === 'scatter') {
    line([[visual.meanX, yDomain[0]], [visual.meanX, yDomain[1]]], COLORS[1], 1.5, true);
    line([[domain[0], visual.meanY], [domain[1], visual.meanY]], COLORS[1], 1.5, true);
    line(domain.map(value => [value, visual.meanY + visual.covariance / visual.varianceX * (value - visual.meanX)]), COLORS[2], 1.5);
    context.fillStyle = COLORS[0];
    for (const point of visual.points) {
      context.beginPath();
      context.arc(x(point[0]), y(point[1]), width < 480 ? 2 : 3, 0, Math.PI * 2);
      context.fill();
    }
  }
  if (visual.kind === 'dots') {
    let offset = 0;
    visual.groups.forEach((group, index) => {
      context.fillStyle = COLORS[index];
      context.globalAlpha = group.selected ? 1 : group.reference ? 0.3 : 0.12;
      for (let item = 0; item < visual.dotCounts[index]; item++) {
        const position = offset + item;
        context.beginPath();
        context.arc(x(position % 20 + 0.5), y(19.5 - Math.floor(position / 20)), Math.max(0.9, Math.min((right - left) / 50, (bottom - top) / 50)), 0, Math.PI * 2);
        context.fill();
      }
      offset += visual.dotCounts[index];
    });
    context.globalAlpha = 1;
  }
  if (visual.kind === 'matrix') {
    visual.probabilities.forEach((value, index) => {
      const row = Math.floor(index / visual.columns.length);
      const column = index % visual.columns.length;
      context.fillStyle = `rgba(3,105,161,${0.08 + value * 0.72})`;
      context.fillRect(x(column), y(row + 1), x(column + 1) - x(column), y(row) - y(row + 1));
      if (index === visual.selected) {
        context.strokeStyle = COLORS[2];
        context.lineWidth = 2;
        context.strokeRect(x(column) + 1, y(row + 1) + 1, x(column + 1) - x(column) - 2, y(row) - y(row + 1) - 2);
      }
      const label = visual.products ? `${numberText(value)} / ${numberText(visual.products[index])}` : numberText(value);
      text(label, x(column + 0.5), y(row + 0.5) + 4, (right - left) / visual.columns.length - 8, '#0f172a', 'center');
    });
  }
  if (Number.isFinite(visual.mean)) line([[visual.mean, yDomain[0]], [visual.mean, yDomain[1]]], COLORS[1], 1.5, true);
  context.restore();
}

let mountSequence = 0;

export function mountLab(container, labId, {formatMath, params: initialParams = {}} = {}) {
  if (!container?.ownerDocument || typeof container.append !== 'function') throw new TypeError('Se requiere un contenedor DOM.');
  const firstResult = calculateLab(labId, initialParams);
  const doc = container.ownerDocument;
  const view = doc.defaultView ?? globalThis;
  const instance = `lab-${++mountSequence}`;
  const model = ['models', 'binomial', 'poisson', 'normal'].includes(labId);
  const initial = Object.fromEntries(Object.entries(model ? firstResult.visual.params : parameters(initialParams, DEFAULTS[labId])).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]));
  let params = Object.fromEntries(Object.entries(initial).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]));
  let disposed = false;
  let frame = null;
  const listeners = [];
  let controlListeners = [];
  const element = (tag, className, text) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const listen = (node, event, callback, bucket = listeners) => {
    node.addEventListener(event, callback);
    bucket.push(() => node.removeEventListener(event, callback));
  };
  const root = element('section', 'lab');
  root.style.minWidth = '0';
  const heading = element('h3');
  heading.id = `${instance}-title`;
  root.setAttribute('aria-labelledby', heading.id);
  const guide = element('section', 'lab-guide');
  const [purpose, experiment, prediction, reading, limits] = LAB_GUIDES[labId];
  guide.append(element('p', '', purpose));
  const explanations = element('dl');
  for (const [title,text] of [['Explora',experiment],['Predicción razonada',prediction],['Cómo leer el resultado',reading],['Qué no demuestra',limits]]) explanations.append(element('dt','',title),element('dd','',text));
  guide.append(explanations);
  const controls = element('div', 'lab-controls');
  controls.style.display = 'grid';
  controls.style.gridTemplateColumns = 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))';
  controls.style.gap = '12px';
  const error = element('p', 'lab-caption');
  error.setAttribute('role', 'status');
  error.setAttribute('aria-live', 'polite');
  error.hidden = true;
  const figure = element('figure');
  figure.style.margin = '0';
  const stage = element('div', 'lab-stage');
  stage.style.aspectRatio = '16 / 9';
  stage.style.width = '100%';
  stage.style.minWidth = '0';
  stage.style.overflow = 'hidden';
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-describedby', `${instance}-caption`);
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.textContent = 'Gráfico del laboratorio; los valores y su interpretación aparecen en el pie y las métricas.';
  const caption = element('figcaption', 'lab-caption');
  caption.id = `${instance}-caption`;
  caption.style.overflowWrap = 'anywhere';
  const metrics = element('div', 'lab-metrics');
  metrics.style.display = 'grid';
  metrics.style.gridTemplateColumns = 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))';
  metrics.style.gap = '8px';
  const formula = element('div', 'lab-caption');
  const reset = element('button', 'text-button');
  reset.type = 'button';
  reset.setAttribute('title', 'Restablecer valores');
  const resetIcon = element('i');
  resetIcon.setAttribute('data-lucide', 'rotate-ccw');
  resetIcon.setAttribute('aria-hidden', 'true');
  reset.append(resetIcon, element('span', '', 'Restablecer valores'));
  stage.append(canvas);
  figure.append(stage, caption);
  root.append(heading, guide, controls, reset, error, figure, metrics, formula);
  container.append(root);
  let current;
  const resize = () => {
    if (disposed || !current) return;
    const width = Math.max(240, stage.getBoundingClientRect().width || 640);
    const height = width * 9 / 16;
    const pixelRatio = Math.max(1, Math.min(3, view.devicePixelRatio || 1));
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    draw(canvas, current.visual, width, height);
  };
  const schedule = () => {
    if (disposed) return;
    if (frame !== null && typeof view.cancelAnimationFrame === 'function') view.cancelAnimationFrame(frame);
    if (view.matchMedia?.('(prefers-reduced-motion: reduce)').matches || typeof view.requestAnimationFrame !== 'function') resize();
    else frame = view.requestAnimationFrame(() => { frame = null; resize(); });
  };
  const render = (calculated = calculateLab(labId, params)) => {
    current = calculated;
    heading.textContent = current.title;
    canvas.setAttribute('aria-label', current.title);
    const tableText = current.visual.kind === 'matrix' ? ` Marginal A: ${current.visual.rows.map(numberText).join(', ')}; marginal B: ${current.visual.columns.map(numberText).join(', ')}. Celdas por filas: ${current.visual.probabilities.map(numberText).join(', ')}.${current.visual.products ? ` Productos marginales: ${current.visual.products.map(numberText).join(', ')}.` : ''}` : '';
    caption.textContent = `${current.explanation}${tableText} ${current.metrics.map(item => `${item.label}: ${numberText(item.value)}${item.unit ? ` ${item.unit}` : ''}`).join('; ')}.`;
    metrics.replaceChildren(...current.metrics.map(item => {
      const field = element('div', 'metric');
      field.style.minWidth = '0';
      field.style.overflowWrap = 'anywhere';
      field.style.display = 'flex';
      field.style.flexDirection = 'column';
      field.append(element('span', '', item.label), element('strong', '', `${numberText(item.value)}${item.unit ? ` ${item.unit}` : ''}`));
      return field;
    }));
    formula.replaceChildren();
    if (current.visual.tex) {
      if (typeof formatMath === 'function') {
        try {
          const formatted = formatMath(current.visual.tex);
          if (typeof formatted === 'string') formula.innerHTML = formatted;
          else formula.textContent = current.visual.tex;
        } catch { formula.textContent = current.visual.tex; }
      } else formula.textContent = current.visual.tex;
    }
    error.hidden = true;
    schedule();
  };
  const buildControls = () => {
    controlListeners.forEach(remove => remove());
    controlListeners = [];
    controls.replaceChildren();
    for (const [index, field] of controlsFor(labId, params).entries()) {
      const wrapper = element('div', 'control-field');
      wrapper.style.minWidth = '0';
      const id = `${instance}-control-${index}`;
      const label = element('label', '', field.label);
      label.htmlFor = id;
      wrapper.append(label);
      const apply = value => {
        const previous = params;
        let candidate;
        if (model && field.key === 'family') candidate = modelDefaults(value);
        else if (field.index !== undefined) candidate = {...params, [field.key]: params[field.key].map((item, position) => position === field.index ? value : item)};
        else candidate = {...params, [field.key]: value};
        if (model && field.key === 'N') {
          candidate.K = Math.min(candidate.K, value);
          candidate.draws = Math.min(candidate.draws, value);
        }
        try {
          const calculated = calculateLab(labId, candidate);
          params = candidate;
          render(calculated);
          if (model && ['family', 'conditioned', 'N'].includes(field.key)) buildControls();
          return true;
        } catch (problem) {
          params = previous;
          error.textContent = `${problem.message} Se conserva el último gráfico válido.`;
          error.hidden = false;
          return false;
        }
      };
      const selectedValue = field.index === undefined ? params[field.key] : params[field.key][field.index];
      if (field.options) {
        const input = element('select');
        input.id = id;
        input.style.maxWidth = '100%';
        for (const [value, title] of field.options) {
          const option = element('option', '', title);
          option.value = String(value);
          input.append(option);
        }
        input.value = String(selectedValue);
        listen(input, 'change', () => {
          const previous = params[field.key];
          const value = field.options.find(option => String(option[0]) === input.value)?.[0];
          if (!apply(value)) input.value = String(previous);
        }, controlListeners);
        wrapper.append(input);
      } else if (field.toggle) {
        const input = element('input');
        input.id = id;
        input.type = 'checkbox';
        input.checked = selectedValue;
        listen(input, 'change', () => { if (!apply(input.checked)) input.checked = !input.checked; }, controlListeners);
        wrapper.append(input);
      } else {
        const range = element('input');
        range.type = 'range';
        range.id = id;
        const input = element('input');
        input.type = 'number';
        input.setAttribute('aria-label', `${field.label}: valor numérico`);
        const output = element('output', '', numberText(selectedValue));
        output.htmlFor = `${id} ${id}-number`;
        input.id = `${id}-number`;
        for (const node of [range, input]) {
          node.min = String(field.min);
          node.max = String(field.max);
          node.step = String(field.step);
          node.value = String(selectedValue);
          node.style.width = '100%';
          node.style.boxSizing = 'border-box';
          listen(node, node === range ? 'input' : 'change', () => {
            if (node.value.trim() === '') {
              error.textContent = 'Introduce un valor numérico. Se conserva el último gráfico válido.';
              error.hidden = false;
            }
            const accepted = node.value.trim() !== '' && apply(Number(node.value));
            const actual = field.index === undefined ? params[field.key] : params[field.key][field.index];
            range.value = String(actual);
            input.value = String(actual);
            output.textContent = numberText(actual);
            input.setAttribute('aria-invalid', String(!accepted));
          }, controlListeners);
        }
        wrapper.append(range, input, output);
      }
      controls.append(wrapper);
    }
  };
  listen(reset, 'click', () => {
    params = Object.fromEntries(Object.entries(initial).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]));
    render();
    buildControls();
  });
  const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(schedule) : null;
  if (observer) observer.observe(stage);
  else if (typeof view.addEventListener === 'function') listen(view, 'resize', schedule);
  try {
    buildControls();
    render(firstResult);
  } catch (problem) {
    observer?.disconnect();
    [...listeners, ...controlListeners].forEach(remove => remove());
    root.remove();
    throw problem;
  }
  return () => {
    if (disposed) return;
    disposed = true;
    if (frame !== null && typeof view.cancelAnimationFrame === 'function') view.cancelAnimationFrame(frame);
    observer?.disconnect();
    [...listeners, ...controlListeners].forEach(remove => remove());
    root.remove();
  };
}