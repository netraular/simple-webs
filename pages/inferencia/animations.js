const COLORS = ['#0369a1', '#15803d', '#be123c', '#b45309'];
const scene = (title, caption, kind, data, tex, duration = 10) => ({title, caption, duration: Math.max(duration, Math.ceil(caption.split(/\s+/).length / 2.5)), kind, data, ...(tex ? {tex} : {})});
const bars = (labels, values, extra = {}) => ({labels, values, xTitle: 'Resultado', yTitle: 'Probabilidad', legend: 'Probabilidad exacta', ...extra});
const matrix = (values, extra = {}) => ({values, rows: ['A=0', 'A=1'], columns: ['B=0', 'B=1'], rowTitle: 'Genotipo A', columnTitle: 'Respuesta B', probability: true, ...extra});
const normal = (mean, sd, extra = {}) => ({family: 'normal', mean, sd, domain: [mean - 4 * sd, mean + 4 * sd], xTitle: 'Diámetro (micras)', yTitle: 'Densidad (1/micra)', legend: 'Modelo normal; marco de ±4 sigma', ...extra});
const cohort = (groups, selected) => ({groups: groups.map((group, index) => ({label: group[0], count: group[1], color: COLORS[index], selected: selected.includes(index)}))});
const binomial = (trials, probability) => Array.from({length: trials + 1}, (_, successes) => {
  let combinations = 1;
  for (let factor = 1; factor <= successes; factor++) combinations *= (trials - factor + 1) / factor;
  return combinations * probability ** successes * (1 - probability) ** (trials - successes);
});
const poisson = rate => {
  const probabilities = [Math.exp(-rate)];
  for (let count = 1; count <= 12; count++) probabilities.push(probabilities[count - 1] * rate / count);
  return probabilities;
};
const integerLabels = values => values.map((_, index) => String(index));
const eventGroups = [['Solo A', 30], ['Solo B', 20], ['A y B', 10], ['Ninguno', 40]];
const diagnosticGroups = [['Enfermo +', 90], ['Enfermo -', 10], ['Sano +', 45], ['Sano -', 855]];
const germination = binomial(3, 0.5);
const sixSeeds = binomial(6, 0.3);
const poissonTwo = poisson(2);
const poissonOne = poisson(1);
const poissonFour = poisson(4);
const dependentTable = [[0.3, 0.2], [0.1, 0.4]];
const independentTable = [[0.2, 0.3], [0.2, 0.3]];
const covarianceData = (points, extra = {}) => {
  const count = points.length;
  const meanX = points.reduce((sum, point) => sum + point[0], 0) / count;
  const meanY = points.reduce((sum, point) => sum + point[1], 0) / count;
  const covariance = points.reduce((sum, point) => sum + (point[0] - meanX) * (point[1] - meanY), 0) / count;
  const varianceX = points.reduce((sum, point) => sum + (point[0] - meanX) ** 2, 0) / count;
  const varianceY = points.reduce((sum, point) => sum + (point[1] - meanY) ** 2, 0) / count;
  return {points, meanX, meanY, covariance, varianceX, varianceY, correlation: covariance / Math.sqrt(varianceX * varianceY), xTitle: 'Dosis (unidades)', yTitle: 'Respuesta (unidades)', ...extra};
};
const samplingVariance = 8 / 3;
const sampleSizes = [8, 9, 10, 11, 12];
const fittedMean = 10;
const fittedVariance = 2;

const choose = (total, selected) => {
  if (!Number.isInteger(selected) || selected < 0 || selected > total) return 0;
  let result = 1;
  for (let factor = 1; factor <= Math.min(selected, total - selected); factor++) result *= (total - factor + 1) / factor;
  return Math.round(result);
};
const hyperCounts = [0, 1, 2, 3].map(count => choose(3, count) * choose(5, 4 - count));
const forcedCounts = [1, 2, 3].map(count => choose(3, count) * choose(5, 6 - count));
const geometricMass = Array.from({length: 8}, (_, count) => 0.5 ** (count + 1));
const negativeMass = Array.from({length: 11}, (_, count) => (count + 1) * 0.5 ** (count + 2));
const trinomialTable = Array.from({length: 4}, (_, resting) => Array.from({length: 4}, (_, active) => {
  const damaged = 3 - resting - active;
  return damaged < 0 ? 0 : choose(3, resting) * choose(3 - resting, active) * 0.5 ** resting * 0.25 ** (active + damaged);
}));
const waiting = (family, extra = {}) => ({family, domain: [0, 15], xTitle: 'Espera (min)', yTitle: 'Densidad (1/min)', ...extra});
const cdfExample = extra => ({family: 'step-cdf', support: [0, 2, 5], cumulative: [0.25, 0.75, 1], domain: [-1, 6], xTitle: 'Umbral real x', yTitle: 'Probabilidad acumulada F(x)', legend: 'Escalones: extremo cerrado a la derecha del salto', ...extra});
const areaExample = extra => ({family: 'linear', support: [0, 2], domain: [0, 2], xTitle: 'Duración t (min)', yTitle: 'Densidad (1/min)', ...extra});
const jointRegion = extra => ({points: [[0, 0], [2, 0], [0, 2]], region: true, meanX: 2 / 3, meanY: 2 / 3, xTitle: 'Recurso X (unidades)', yTitle: 'Recurso Y (unidades)', legend: 'Frontera del soporte; no observaciones', density: 0.5, area: 2, ...extra});
const conditionalNormal = (knownX, extra = {}) => normal(30 + 0.6 * (4 / 2) * (knownX - 12), 3.2, {domain: [14, 46], xTitle: 'Señal Y (unidades)', yTitle: 'Densidad de Y (1/unidad)', knownX, meanX: 12, meanY: 30, sdX: 2, sdY: 4, rho: 0.6, variance: 10.24, jointNormal: true, comparison: {family: 'normal', mean: 30, sd: 4}, ...extra});
const rateCandidates = [1, 2, 3, 4, 5];
const rateLikelihoods = rateCandidates.map(rate => Math.exp(-3 * rate) * rate ** 9 / 288);

export const ANIMATIONS = [
  {id: 'math', title: 'Herramientas matemáticas en un cultivo', steps: [
    scene('Contar y sumar', 'En este ejemplo didáctico contamos 10, 20 y 30 colonias en tres placas. La suma es 60: el índice identifica la placa y el símbolo de sumatorio reúne sus recuentos.', 'bars', bars(['Placa 1', 'Placa 2', 'Placa 3'], [10, 20, 30], {xTitle: 'Placa', yTitle: 'Colonias', legend: 'Recuento observado', total: 60}), '\\sum_{i=1}^{3} n_i=10+20+30=60'),
    scene('Pasar a proporciones', 'Dividimos cada recuento entre 60. Las proporciones son 1/6, 1/3 y 1/2, y suman uno. Una proporción no tiene unidades y permite comparar placas de distinto tamaño.', 'bars', bars(['Placa 1', 'Placa 2', 'Placa 3'], [1 / 6, 1 / 3, 1 / 2], {xTitle: 'Placa', total: 1}), 'p_i=\\frac{n_i}{60},\\qquad \\sum_i p_i=1'),
    scene('Leer una función', 'Ahora suponemos otro cultivo ideal que empieza con 10 células y se duplica cada hora. La función C(t)=10 por 2 elevado a t da 10, 20, 40 y 80 células en las horas cero a tres; no es una ley universal del crecimiento biológico.', 'bars', bars(['0', '1', '2', '3'], [10, 20, 40, 80], {xTitle: 'Tiempo (horas)', yTitle: 'Células', legend: 'Crecimiento ideal', base: 10, factor: 2}), 'C(t)=10\\cdot 2^t'),
    scene('Invertir con logaritmos', 'Si el mismo modelo alcanza 80 células, dividimos entre las 10 iniciales y obtenemos un factor ocho. El logaritmo en base dos de ocho es tres: han transcurrido tres duplicaciones, es decir, tres horas.', 'bars', bars(['0', '1', '2', '3'], [1, 2, 4, 8], {xTitle: 'Duplicaciones', yTitle: 'Factor C(t)/10', legend: 'Factor multiplicativo', highlight: [3], solution: 3}), 't=\\log_2(80/10)=3'),
    scene('Promedio no es crecimiento', 'Volvemos a las tres placas originales: 60 colonias divididas entre tres placas dan una media de 20 colonias por placa. Esa media resume los recuentos 10, 20 y 30, pero no describe una duplicación temporal.', 'bars', bars(['Placa 1', 'Placa 2', 'Placa 3'], [10, 20, 30], {xTitle: 'Placa', yTitle: 'Colonias', legend: 'Recuentos; línea = media', horizontal: 20, mean: 20}), '\\bar n=\\frac{10+20+30}{3}=20')
  ]},
  {id: 'events', title: 'Sucesos en una colección de bacterias', steps: [
    scene('Definir el espacio de resultados', 'Elegimos al azar una bacteria entre 100 de una colección ficticia. Treinta tienen solo resistencia A, veinte solo B, diez ambas y cuarenta ninguna. Cada punto representa una bacteria, y las cuatro categorías forman toda la colección.', 'dots', cohort(eventGroups, [0, 1, 2, 3]), '|\\Omega|=100'),
    scene('Un suceso y su complemento', 'El suceso A reúne las 30 bacterias con solo A y las 10 con ambas resistencias. Por tanto P(A)=40/100=0,40. Las otras 60 pertenecen a su complemento, cuya probabilidad es 0,60.', 'dots', {...cohort(eventGroups, [0, 2]), probability: 0.4, complement: 0.6}, 'P(A)=0{,}40,\\quad P(A^c)=1-P(A)=0{,}60'),
    scene('Intersección', 'La intersección exige A y B a la vez: solo las diez bacterias de la categoría doble cumplen ambas condiciones. Su probabilidad es 0,10; no debemos sumar aquí las categorías que tienen únicamente una resistencia.', 'dots', {...cohort(eventGroups, [2]), probability: 0.1}, 'P(A\\cap B)=10/100=0{,}10'),
    scene('Unión sin contar dos veces', 'La unión acepta A, B o ambas. Suma 30 más 20 más 10, es decir, 60 bacterias. Si sumáramos P(A)=0,40 y P(B)=0,30, contaríamos dos veces las diez dobles; por eso restamos 0,10.', 'dots', {...cohort(eventGroups, [0, 1, 2]), probability: 0.6}, 'P(A\\cup B)=0{,}40+0{,}30-0{,}10=0{,}60'),
    scene('Condicionar cambia el denominador', 'Si ya sabemos que la bacteria tiene A, la colección relevante se reduce a 40 bacterias. Diez de ellas tienen B: P(B dado A)=10/40=0,25. No es 10/100, porque la información cambia el grupo de referencia.', 'dots', {...cohort(eventGroups, [2]), numerator: 10, denominator: 40, probability: 0.25}, 'P(B\\mid A)=\\frac{P(A\\cap B)}{P(A)}=0{,}25')
  ]},
  {id: 'bayes', title: 'Bayes: interpretar un test positivo', steps: [
    scene('La prevalencia antes del test', 'En una población hipotética de 1.000 animales, 100 tienen una infección y 900 no. La probabilidad previa de infección es 0,10. Estos recuentos son frecuencias esperadas del modelo, no resultados de un estudio clínico.', 'dots', {...cohort(diagnosticGroups, [0, 1]), prevalence: 0.1, population: 1000}, 'P(E)=100/1000=0{,}10'),
    scene('Sensibilidad entre enfermos', 'El test tiene sensibilidad 0,90: de los 100 animales infectados esperamos 90 positivos y 10 negativos. Esta probabilidad es P(positivo dado infección); todavía no responde a la pregunta inversa de si un positivo está infectado.', 'dots', {...cohort(diagnosticGroups, [0]), sensitivity: 0.9, denominator: 100}, 'P(+\\mid E)=90/100=0{,}90'),
    scene('Falsos positivos entre sanos', 'La especificidad es 0,95. Entre 900 animales sanos esperamos 855 negativos y 45 positivos: el 5 por ciento de 900. Un pequeño porcentaje puede producir muchos falsos positivos cuando el grupo sano es grande.', 'dots', {...cohort(diagnosticGroups, [2]), specificity: 0.95, falsePositives: 45, denominator: 900}, 'P(+\\mid E^c)=1-0{,}95=0{,}05'),
    scene('Reunir todos los positivos', 'El grupo positivo contiene 90 animales infectados y 45 sanos: 135 en total. La probabilidad de un positivo es 0,135, obtenida al sumar 0,90 por 0,10 y 0,05 por 0,90.', 'dots', {...cohort(diagnosticGroups, [0, 2]), positives: 135, probability: 0.135}, 'P(+)=0{,}90\\cdot0{,}10+0{,}05\\cdot0{,}90=0{,}135'),
    scene('La probabilidad posterior', 'De esos 135 positivos, 90 están infectados. Por Bayes, la probabilidad posterior es 90/135=2/3, aproximadamente 66,67 por ciento, no 90 por ciento. El denominador incorpora tanto positivos verdaderos como falsos.', 'dots', {...cohort(diagnosticGroups, [0]), numerator: 90, denominator: 135, posterior: 2 / 3}, 'P(E\\mid +)=\\frac{0{,}90\\cdot0{,}10}{0{,}135}=\\frac23', 12),
    scene('Cambiar la prevalencia', 'Con el mismo test pero prevalencia 0,01, en 1.000 animales esperamos 9 verdaderos positivos y 49,5 falsos positivos. La posterior baja a 9/58,5, aproximadamente 15,38 por ciento. Las barras admiten fracciones porque muestran expectativas, no animales observados.', 'bars', bars(['Verdaderos +', 'Falsos +'], [9, 49.5], {xTitle: 'Origen del positivo', yTitle: 'Recuento esperado', legend: 'Prevalencia del 1 %', prevalence: 0.01, sensitivity: 0.9, specificity: 0.95, posterior: 9 / 58.5}), 'P(E\\mid +)=\\frac{0{,}009}{0{,}009+0{,}0495}\\approx0{,}1538', 12)
  ]},
  {id: 'variable', title: 'De resultados a una variable aleatoria', steps: [
    scene('Resultados elementales', 'Sembramos tres semillas independientes, cada una con probabilidad de germinar 0,5. Codificamos germinación como 1 y ausencia como 0. Las ocho secuencias, desde 000 hasta 111, tienen probabilidad 1/8 bajo estas hipótesis.', 'bars', bars(['000', '001', '010', '011', '100', '101', '110', '111'], Array(8).fill(1 / 8), {xTitle: 'Secuencia de tres semillas', legend: 'Resultados equiprobables'}), 'P(001)=(0{,}5)^3=1/8'),
    scene('Asignar un número', 'La variable X cuenta semillas germinadas, no la posición de la germinación. La secuencia 001 se transforma en X=1, y 101 en X=2. Al sumar los tres indicadores, ocho resultados elementales se agrupan en cuatro valores posibles.', 'bars', bars(['000', '001', '010', '011', '100', '101', '110', '111'], [0, 1, 1, 2, 1, 2, 2, 3], {xTitle: 'Secuencia', yTitle: 'Valor de X', legend: 'Número de germinaciones'}), 'X=I_1+I_2+I_3'),
    scene('Construir la función de masa', 'Hay una secuencia con cero germinaciones, tres con una, tres con dos y una con tres. Por ello las masas de X son 1/8, 3/8, 3/8 y 1/8. Estas cuatro probabilidades suman uno.', 'bars', bars(['0', '1', '2', '3'], germination, {xTitle: 'Semillas germinadas X', total: 1}), 'p_X(k)=P(X=k)'),
    scene('Sumar un suceso de la variable', 'Al menos dos semillas germinadas significa X=2 o X=3. Sumamos las dos barras: 3/8 más 1/8 es 1/2. Una probabilidad de un conjunto de valores se obtiene acumulando las masas correspondientes.', 'bars', bars(['0', '1', '2', '3'], germination, {xTitle: 'Semillas germinadas X', highlight: [2, 3], probability: 0.5}), 'P(X\\ge2)=3/8+1/8=1/2'),
    scene('Acumular hasta un umbral', 'La función de distribución F(k)=P(X menor o igual que k) vale 0,125, 0,50, 0,875 y 1 en los valores cero a tres. Las barras ahora muestran probabilidades acumuladas, no masas; por eso no se deben sumar entre sí.', 'bars', bars(['0', '1', '2', '3'], [0.125, 0.5, 0.875, 1], {xTitle: 'Umbral k', yTitle: 'F(k)', legend: 'Distribución acumulada'}), 'F(1)=P(X\\le1)=1/8+3/8=1/2')
  ]},
  {id: 'density', title: 'Densidad: probabilidades como áreas', steps: [
    scene('Un tiempo continuo', 'Como modelo didáctico, el tiempo T de hidratación de una semilla es uniforme entre cero y diez minutos. La densidad es 0,1 por minuto en ese intervalo y cero fuera. Su altura tiene unidades inversas al tiempo: no es la probabilidad de un minuto exacto.', 'curve', {family: 'uniform', support: [0, 10], domain: [-1, 11], xTitle: 'Tiempo (min)', yTitle: 'Densidad (1/min)', legend: 'Uniforme entre 0 y 10', height: 0.1}, 'f(t)=1/10\\quad(0\\le t\\le10)'),
    scene('Todo el intervalo tiene área uno', 'El rectángulo completo tiene base diez minutos y altura 0,1 por minuto. Su área es uno: el modelo asigna toda la probabilidad al intervalo de cero a diez. Cambiar las unidades del eje cambia la altura, pero no esa probabilidad total.', 'curve', {family: 'uniform', support: [0, 10], domain: [-1, 11], interval: [0, 10], probability: 1, xTitle: 'Tiempo (min)', yTitle: 'Densidad (1/min)', legend: 'Área total = 1'}, '\\int_0^{10}f(t)\\,dt=10\\cdot0{,}1=1'),
    scene('Un intervalo de tres minutos', 'Entre dos y cinco minutos la base mide tres y la altura sigue siendo 0,1. El área sombreada es 0,30. Como T es continuo, incluir o excluir los extremos no cambia esta probabilidad.', 'curve', {family: 'uniform', support: [0, 10], domain: [-1, 11], interval: [2, 5], probability: 0.3, xTitle: 'Tiempo (min)', yTitle: 'Densidad (1/min)', legend: 'Área de 2 a 5 = 0,30'}, 'P(2\\le T\\le5)=\\int_2^5 0{,}1\\,dt=0{,}30'),
    scene('Un punto no tiene anchura', 'El marcador señala exactamente cuatro minutos. La densidad allí vale 0,1, pero la probabilidad P(T=4) es cero: una línea sin anchura no aporta área. Densidad positiva y probabilidad puntual cero son compatibles.', 'curve', {family: 'uniform', support: [0, 10], domain: [-1, 11], marker: 4, probability: 0, density: 0.1, xTitle: 'Tiempo (min)', yTitle: 'Densidad (1/min)', legend: 'Marcador sin área'}, 'f(4)=0{,}1,\\qquad P(T=4)=0'),
    scene('Acumular el área', 'La distribución acumulada F(t) crece linealmente de cero a uno entre cero y diez minutos. En cinco minutos ya se ha acumulado la mitad de la probabilidad: F(5)=0,50. Fuera del intervalo permanece en cero o en uno.', 'curve', {family: 'uniform-cdf', support: [0, 10], domain: [-1, 11], marker: 5, probability: 0.5, xTitle: 'Tiempo (min)', yTitle: 'Probabilidad acumulada F(t)', legend: 'F(5) = 0,50'}, 'F(t)=\\int_{-\\infty}^{t}f(u)\\,du')
  ]},
  {id: 'expectation', title: 'Esperanza y dispersión de un recuento', steps: [
    scene('Una distribución discreta', 'Un modelo de colonias resistentes asigna X=0, 1 o 2 con probabilidades 0,25, 0,50 y 0,25. Los valores posibles son recuentos enteros; las alturas de las barras son probabilidades, no tamaños de colonia.', 'bars', bars(['0', '1', '2'], [0.25, 0.5, 0.25], {xTitle: 'Colonias resistentes X'}), 'p(0)=1/4,\\quad p(1)=1/2,\\quad p(2)=1/4'),
    scene('Ponderar cada valor', 'Multiplicamos cada valor por su probabilidad: cero por 0,25, uno por 0,50 y dos por 0,25. Las contribuciones son 0, 0,50 y 0,50, que suman E(X)=1. La esperanza es un promedio ponderado.', 'bars', bars(['0', '1', '2'], [0, 0.5, 0.5], {xTitle: 'Valor de X', yTitle: 'x · p(x)', legend: 'Contribuciones a E(X)', expectation: 1}), 'E(X)=\\sum_x xp(x)=1'),
    scene('El segundo momento', 'Para medir dispersión necesitamos también E(X al cuadrado). Las contribuciones son cero, 0,50 y uno; suman 1,50. Elevar los valores al cuadrado antes de promediar no equivale a elevar al cuadrado la media.', 'bars', bars(['0', '1', '2'], [0, 0.5, 1], {xTitle: 'Valor de X', yTitle: 'x² · p(x)', legend: 'Contribuciones a E(X²)', secondMoment: 1.5}), 'E(X^2)=0+0{,}50+1=1{,}50'),
    scene('Restar el cuadrado de la media', 'La varianza es 1,50 menos 1 al cuadrado, es decir, 0,50. También obtenemos 0,25, cero y 0,25 al ponderar las distancias cuadradas a la media. La desviación típica es la raíz de 0,50, aproximadamente 0,707 colonias.', 'bars', bars(['0', '1', '2'], [0.25, 0, 0.25], {xTitle: 'Valor de X', yTitle: '(x - 1)² · p(x)', legend: 'Contribuciones a la varianza', variance: 0.5, sd: Math.sqrt(0.5)}), '\\operatorname{Var}(X)=E(X^2)-E(X)^2=0{,}50'),
    scene('Una esperanza puede no ser un resultado', 'Si transformamos el recuento en Y=2X+3, los valores posibles pasan a 3, 5 y 7 y la esperanza es 5. En cambio, para las tres semillas con germinación 0,5 la esperanza es 1,5 semillas, aunque ninguna observación individual pueda valer 1,5.', 'bars', bars(['3', '5', '7'], [0.25, 0.5, 0.25], {xTitle: 'Valor de Y = 2X + 3', xValues: [3, 5, 7], xMean: 5, expectation: 5, variance: 2}), 'E(2X+3)=2E(X)+3=5')
  ]},
  {id: 'binomial', title: 'Binomial: germinaciones independientes', steps: [
    scene('Un ensayo de Bernoulli', 'Una semilla germina con probabilidad 0,30 y no germina con 0,70. Su indicador solo toma cero o uno. Para extender este modelo a varias semillas debemos suponer ensayos independientes y la misma probabilidad en todos ellos.', 'bars', bars(['0', '1'], [0.7, 0.3], {xTitle: 'Germinación de una semilla', trials: 1, successProbability: 0.3}), 'I\\sim\\operatorname{Bernoulli}(0{,}30)'),
    scene('Seis ensayos', 'Contamos X, el número de germinaciones en seis semillas independientes con p=0,30. X sigue una binomial con n=6. Las barras muestran las probabilidades de cero a seis éxitos, calculadas con combinaciones y potencias.', 'bars', bars(integerLabels(sixSeeds), sixSeeds, {xTitle: 'Germinaciones X', trials: 6, successProbability: 0.3}), 'P(X=k)=\\binom6k(0{,}3)^k(0{,}7)^{6-k}'),
    scene('Exactamente dos', 'Hay 15 maneras de situar dos germinaciones entre seis semillas. Cada secuencia tiene probabilidad 0,30 al cuadrado por 0,70 a la cuarta. Su producto da P(X=2)=0,324135, aproximadamente 32,41 por ciento.', 'bars', bars(integerLabels(sixSeeds), sixSeeds, {xTitle: 'Germinaciones X', highlight: [2], combinations: 15, probability: sixSeeds[2]}), 'P(X=2)=15\\cdot0{,}3^2\\cdot0{,}7^4=0{,}324135'),
    scene('Al menos una', 'Es más corto usar el complemento: que no germine ninguna tiene probabilidad 0,70 a la sexta, igual a 0,117649. Por tanto al menos una germinación tiene probabilidad 1 menos ese valor, es decir, 0,882351.', 'bars', bars(integerLabels(sixSeeds), sixSeeds, {xTitle: 'Germinaciones X', highlight: [1, 2, 3, 4, 5, 6], probability: 1 - sixSeeds[0]}), 'P(X\\ge1)=1-P(X=0)=1-0{,}7^6=0{,}882351'),
    scene('Media y variabilidad', 'La media binomial es n por p: 6 por 0,30 da 1,8 germinaciones. La varianza es n por p por uno menos p, igual a 1,26. Si las semillas comparten condiciones que hacen sus resultados dependientes, estas fórmulas binomiales pueden dejar de describir el experimento.', 'bars', bars(integerLabels(sixSeeds), sixSeeds, {xTitle: 'Germinaciones X', xMean: 1.8, expectation: 1.8, variance: 1.26}), 'E(X)=np=1{,}8,\\quad \\operatorname{Var}(X)=np(1-p)=1{,}26', 12)
  ]},
  {id: 'poisson', title: 'Poisson: células en un volumen', steps: [
    scene('Una tasa y un volumen', 'Suponemos células dispersas al azar con tasa constante de dos por mililitro e independencia entre volúmenes disjuntos. En un mililitro el recuento X tiene modelo Poisson con lambda=2. El gráfico muestra cero a doce; queda una pequeña cola a la derecha.', 'bars', bars(integerLabels(poissonTwo), poissonTwo, {xTitle: 'Células en 1 ml', rate: 2, tail: 1 - poissonTwo.reduce((sum, value) => sum + value, 0), legend: 'Poisson; cola >12 no dibujada'}), 'X\\sim\\operatorname{Poisson}(\\lambda=2)'),
    scene('Ninguna célula', 'Con lambda=2, P(X=0) es e elevado a menos dos: aproximadamente 0,135335, un 13,53 por ciento. Tener media dos no asegura encontrar células en cada muestra; cero sigue siendo un resultado posible.', 'bars', bars(integerLabels(poissonTwo), poissonTwo, {xTitle: 'Células en 1 ml', highlight: [0], rate: 2, probability: poissonTwo[0], legend: 'Poisson; cola >12 no dibujada'}), 'P(X=0)=e^{-2}\\approx0{,}135335'),
    scene('Exactamente dos células', 'La masa Poisson es e a menos lambda por lambda elevado a k, dividido entre k factorial. Para dos células y lambda=2 obtenemos 2 por e a menos dos, aproximadamente 0,270671. En este modelo la media y la varianza valen ambas dos.', 'bars', bars(integerLabels(poissonTwo), poissonTwo, {xTitle: 'Células en 1 ml', highlight: [2], rate: 2, probability: poissonTwo[2], expectation: 2, variance: 2, legend: 'Poisson; cola >12 no dibujada'}), 'P(X=2)=e^{-2}\\frac{2^2}{2!}\\approx0{,}270671'),
    scene('Reducir el volumen', 'En medio mililitro, manteniendo la tasa de dos células por mililitro, lambda se reduce a uno. La probabilidad de cero sube a e a menos uno, aproximadamente 0,367879. Lambda depende de la exposición: aquí, tasa por volumen.', 'bars', bars(integerLabels(poissonOne), poissonOne, {xTitle: 'Células en 0,5 ml', rate: 1, volume: 0.5, intensity: 2, probability: poissonOne[0], legend: 'Poisson; cola >12 no dibujada'}), String.raw`\lambda=(2\ \text{células/ml})(0{,}5\ \text{ml})=1`),
    scene('Sumar muestras independientes', 'Si sumamos los recuentos de dos muestras independientes de un mililitro, las lambdas se suman: el total es Poisson con lambda=4. Su media y varianza son cuatro. Agregación o agrupamiento celular pueden invalidar la independencia y producir más dispersión.', 'bars', bars(integerLabels(poissonFour), poissonFour, {xTitle: 'Células en 2 ml', rate: 4, expectation: 4, variance: 4, tail: 1 - poissonFour.reduce((sum, value) => sum + value, 0), legend: 'Poisson; cola >12 no dibujada'}), 'X_1+X_2\\sim\\operatorname{Poisson}(2+2)', 12)
  ]},
  {id: 'normal', title: 'Normal: diámetro y estandarización', steps: [
    scene('Centro y escala', 'Modelamos de forma ilustrativa diámetros celulares con una normal de media 100 micras y desviación típica 10 micras. La curva es simétrica alrededor de 100. El marco solo representa desde 60 hasta 140, no toda la recta real.', 'curve', normal(100, 10, {variance: 100}), 'X\\sim N(100,10^2)'),
    scene('Una desviación a cada lado', 'Entre 90 y 110 micras estamos a una desviación típica de la media por cada lado. Bajo este modelo el área es aproximadamente 0,682689, un 68,27 por ciento. Es una probabilidad del intervalo, no la altura de la curva.', 'curve', normal(100, 10, {interval: [90, 110], probability: 0.6826894921370859, legend: 'Área entre 90 y 110 = 68,27 %'}), 'P(90\\le X\\le110)=P(-1\\le Z\\le1)\\approx0{,}682689'),
    scene('Un umbral unilateral', 'El valor 120 está dos desviaciones por encima de la media. La probabilidad de un diámetro menor o igual que 120 es aproximadamente 0,977250. El área indicada incluye también la diminuta cola izquierda anterior a 60, fuera del marco dibujado.', 'curve', normal(100, 10, {interval: [60, 120], probability: 0.9772498680518208, legend: 'P(X ≤ 120) = 97,72 %; incluye cola'}), 'P(X\\le120)=\\Phi(2)\\approx0{,}977250'),
    scene('Estandarizar', 'Restamos 100 al diámetro y dividimos entre 10. Así 90 se transforma en menos uno, 100 en cero y 110 en uno. Z tiene media cero y desviación uno; cambia la escala del eje, pero el área del intervalo sigue siendo 68,27 por ciento.', 'curve', normal(0, 1, {xTitle: 'Z = (X - 100)/10', yTitle: 'Densidad de Z', interval: [-1, 1], probability: 0.6826894921370859, legend: 'Normal estándar; mismo 68,27 %'}), 'Z=\\frac{X-100}{10}\\sim N(0,1)'),
    scene('Dos desviaciones y sus límites', 'Entre 80 y 120 micras, dos desviaciones a cada lado, el área normal es aproximadamente 0,954500. Esta regla depende del modelo: no obliga a que cualquier muestra biológica contenga exactamente el 95,45 por ciento en ese intervalo ni demuestra normalidad.', 'curve', normal(100, 10, {interval: [80, 120], probability: 0.9544997361036416, legend: 'Área entre 80 y 120 = 95,45 %'}), 'P(|X-100|\\le20)=P(|Z|\\le2)\\approx0{,}954500', 12)
  ]},
  {id: 'joint', title: 'Distribución conjunta: genotipo y respuesta', steps: [
    scene('Dos variables en una tabla', 'En un modelo ficticio clasificamos genotipo A y respuesta B como cero o uno. Las cuatro probabilidades conjuntas son 0,30, 0,20, 0,10 y 0,40, en orden por filas. Cada celda describe las dos variables simultáneamente y el total es uno.', 'matrix', matrix(dependentTable), '\\sum_a\\sum_b p_{A,B}(a,b)=1'),
    scene('Leer una celda conjunta', 'La celda A=1 y B=1 tiene probabilidad 0,40. Es la probabilidad de observar ese genotipo y esa respuesta a la vez, no una probabilidad condicionada. Sus dos índices seleccionan una fila y una columna.', 'matrix', matrix(dependentTable, {highlight: [3], probabilityValue: 0.4}), 'P(A=1,B=1)=0{,}40'),
    scene('Obtener la marginal de A', 'Para ignorar la respuesta sumamos cada fila. La primera da 0,30 más 0,20 igual a 0,50, y la segunda 0,10 más 0,40 igual a 0,50. La marginal de A conserva el genotipo y elimina B mediante una suma.', 'matrix', matrix(dependentTable, {highlight: [0, 1], marginals: true, rowSums: [0.5, 0.5]}), 'P(A=1)=\\sum_b p(1,b)=0{,}50'),
    scene('Obtener la marginal de B', 'Para ignorar el genotipo sumamos las columnas: P(B=0)=0,40 y P(B=1)=0,60. Estas marginales no bastan para reconstruir por sí solas la tabla conjunta; distintas asociaciones pueden tener los mismos totales.', 'matrix', matrix(dependentTable, {highlight: [1, 3], marginals: true, columnSums: [0.4, 0.6]}), 'P(B=1)=0{,}20+0{,}40=0{,}60'),
    scene('Normalizar dentro de una fila', 'Entre los individuos con A=1, la masa total es 0,50. Dividimos las celdas 0,10 y 0,40 entre ese total: las probabilidades condicionadas de B son 0,20 y 0,80. La fila condicionada vuelve a sumar uno.', 'matrix', matrix([[0.2, 0.8]], {rows: ['A=1'], rowTitle: 'Condición A=1', highlight: [1], conditional: true, denominator: 0.5}), 'P(B=1\\mid A=1)=0{,}40/0{,}50=0{,}80')
  ]},
  {id: 'independence', title: 'Independencia no es exclusión', steps: [
    scene('Un modelo independiente', 'Consideramos genotipo A con P(A=1)=0,50 y respuesta B con P(B=1)=0,60. Si son independientes, cada celda conjunta es el producto de sus marginales. La tabla resultante es 0,20, 0,30, 0,20 y 0,30.', 'matrix', matrix(independentTable, {marginals: true}), 'p(a,b)=p_A(a)p_B(b)'),
    scene('Comprobar un producto', 'Para A=1 y B=1, el producto 0,50 por 0,60 vale 0,30 y coincide con la celda. La independencia exige esta igualdad para todas las combinaciones, no únicamente para una celda elegida.', 'matrix', matrix(independentTable, {highlight: [3], product: 0.5 * 0.6, probabilityValue: 0.3}), 'P(A=1,B=1)=0{,}50\\cdot0{,}60=0{,}30'),
    scene('Condicionar sin cambiar la distribución', 'La fila A=1 tiene total 0,50. Dividir 0,20 y 0,30 entre 0,50 da 0,40 y 0,60, exactamente la marginal de B. En este modelo saber A no cambia las probabilidades de B.', 'matrix', matrix([[0.4, 0.6]], {rows: ['A=1'], rowTitle: 'Condición A=1', conditional: true, highlight: [1], denominator: 0.5}), 'P(B=1\\mid A=1)=0{,}60=P(B=1)'),
    scene('Mismas marginales, dependencia', 'Ahora cambiamos las celdas a 0,30, 0,20, 0,10 y 0,40, manteniendo ambas marginales. P(B=1 dado A=1) pasa a 0,80, frente a la marginal 0,60. Los totales son iguales, pero la asociación entre variables ha cambiado.', 'matrix', matrix(dependentTable, {marginals: true, highlight: [3], conditionalProbability: 0.8, marginalProbability: 0.6}), '0{,}40\\ne0{,}50\\cdot0{,}60'),
    scene('Pueden ocurrir simultáneamente', 'Regresamos al modelo independiente: A=1 y B=1 ocurren juntos con probabilidad 0,30. Independencia no significa sucesos incompatibles. Si dos sucesos de probabilidad positiva fueran excluyentes, su intersección sería cero, incompatible con un producto positivo.', 'matrix', matrix(independentTable, {highlight: [3], intersection: 0.3}), 'P(A\\cap B)=P(A)P(B)>0')
  ]},
  {id: 'covariance', title: 'Covarianza: dirección, unidades y dependencia', steps: [
    scene('Una relación creciente', 'En tres pares didácticos de dosis y respuesta observamos (1,2), (2,4) y (3,6), con peso 1/3 cada uno. Las medias son dos y cuatro. Usaremos covarianza descriptiva con divisor tres, no la estimación muestral con divisor dos.', 'scatter', covarianceData([[1, 2], [2, 4], [3, 6]], {line: {slope: 2, intercept: 0}, legend: 'Tres pares equiponderados'}), '\\operatorname{Cov}(X,Y)=\\frac13\\sum_i(x_i-2)(y_i-4)'),
    scene('Centrar y multiplicar', 'Al restar las medias obtenemos los pares (-1,-2), (0,0) y (1,2). Los productos son dos, cero y dos: la covarianza es 4/3. Ambas variables quedan del mismo lado de sus medias, por eso las contribuciones no son negativas.', 'scatter', covarianceData([[-1, -2], [0, 0], [1, 2]], {xTitle: 'Dosis - media', yTitle: 'Respuesta - media', legend: 'Productos 2, 0, 2; cov = 4/3'}), '\\operatorname{Cov}(X,Y)=(2+0+2)/3=4/3'),
    scene('Una dirección decreciente', 'Con respuestas seis, cuatro y dos a las dosis uno, dos y tres, los extremos quedan en lados opuestos de las medias. La covarianza es -4/3 y la correlación -1. El signo describe la dirección lineal, no una relación causal.', 'scatter', covarianceData([[1, 6], [2, 4], [3, 2]], {line: {slope: -2, intercept: 8}, legend: 'Cov = -4/3; correlación = -1'}), '\\rho=\\frac{\\operatorname{Cov}(X,Y)}{\\sigma_X\\sigma_Y}=-1'),
    scene('Las unidades importan', 'Si multiplicamos por diez las respuestas del primer ejemplo, obtenemos 20, 40 y 60. La covarianza también se multiplica por diez y vale 40/3. La correlación sigue siendo uno porque normaliza por las desviaciones; no tiene unidades.', 'scatter', covarianceData([[1, 20], [2, 40], [3, 60]], {line: {slope: 20, intercept: 0}, yTitle: 'Respuesta × 10', legend: 'Cov = 40/3; correlación = 1'}), '\\operatorname{Cov}(X,10Y)=10\\operatorname{Cov}(X,Y)'),
    scene('Covarianza cero no basta', 'En el modelo equiprobable X=-2,-1,0,1,2 y Y=X al cuadrado, la covarianza es cero por simetría. Sin embargo Y está determinada por X: no son independientes. Una respuesta biológica en forma de U puede escapar a una medida de asociación exclusivamente lineal.', 'scatter', covarianceData([[-2, 4], [-1, 1], [0, 0], [1, 1], [2, 4]], {parabola: true, xTitle: 'Dosis centrada X', yTitle: 'Respuesta Y = X²', legend: 'Cov = 0; dependencia no lineal'}), String.raw`\operatorname{Cov}(X,X^2)=0\ \not\Rightarrow\ X\perp X^2`, 12)
  ]},
  {id: 'sampling', title: 'Distribución de la media muestral', steps: [
    scene('Población y variación individual', 'Una población modelo de tamaños celulares toma 8, 10 y 12 micras con igual probabilidad. Su media es 10 y su varianza 8/3. Para una sola extracción, la media muestral coincide con el tamaño de esa célula y conserva toda la variación individual.', 'bars', bars(['8', '10', '12'], [1 / 3, 1 / 3, 1 / 3], {xTitle: 'Tamaño (micras)', sampleSize: 1, expectation: 10, variance: samplingVariance, xValues: [8, 10, 12], xMean: 10}), '\\mu=10,\\quad \\sigma^2=8/3'),
    scene('Dos extracciones independientes', 'Muestreamos con reemplazo para que las dos extracciones sean independientes. Hay nueve pares ordenados equiprobables. La tabla muestra sus medias: por ejemplo (8,12) y (12,8) dan 10, igual que (10,10). Cada celda tiene probabilidad 1/9.', 'matrix', matrix([[8, 9, 10], [9, 10, 11], [10, 11, 12]], {rows: ['8', '10', '12'], columns: ['8', '10', '12'], rowTitle: 'Primera célula', columnTitle: 'Segunda célula', probability: false, cellProbability: 1 / 9, highlight: [2, 4, 6]}), '\\bar X=(X_1+X_2)/2'),
    scene('Agrupar las medias', 'Las medias 8, 9, 10, 11 y 12 aparecen una, dos, tres, dos y una veces entre los nueve pares. La media sigue siendo 10, pero la varianza de la media baja a 4/3. Su error estándar es aproximadamente 1,155 micras.', 'bars', bars(['8', '9', '10', '11', '12'], [1 / 9, 2 / 9, 3 / 9, 2 / 9, 1 / 9], {xTitle: 'Media de dos células (micras)', sampleSize: 2, expectation: 10, variance: samplingVariance / 2, standardError: Math.sqrt(samplingVariance / 2), xValues: sampleSizes, xMean: 10}), '\\operatorname{Var}(\\bar X)=\\sigma^2/n=4/3'),
    scene('Cuatro células: distribución exacta', 'Con cuatro extracciones independientes hay 81 secuencias equiprobables. Las medias avanzan en pasos de media micra; sus frecuencias son 1, 4, 10, 16, 19, 16, 10, 4 y 1. La varianza baja a 2/3 y el error estándar a aproximadamente 0,816 micras.', 'bars', bars(['8', '8,5', '9', '9,5', '10', '10,5', '11', '11,5', '12'], [1, 4, 10, 16, 19, 16, 10, 4, 1].map(value => value / 81), {xTitle: 'Media de cuatro células (micras)', sampleSize: 4, expectation: 10, variance: samplingVariance / 4, standardError: Math.sqrt(samplingVariance / 4), xValues: Array.from({length: 9}, (_, index) => 8 + index / 2), xMean: 10}), '\\operatorname{SE}(\\bar X)=\\sigma/\\sqrt n'),
    scene('Aproximación para muchas extracciones', 'Para 36 células independientes, el error estándar es raíz de (8/3)/36, aproximadamente 0,272 micras. La curva es una aproximación normal por el teorema central del límite, no la distribución discreta exacta. Su zona central de ±1,96 errores estándar va de 9,467 a 10,533 y contiene aproximadamente el 95 por ciento bajo esa aproximación.', 'curve', normal(10, Math.sqrt(samplingVariance / 36), {xTitle: 'Media de 36 células (micras)', yTitle: 'Densidad aproximada (1/micra)', sampleSize: 36, variance: samplingVariance / 36, standardError: Math.sqrt(samplingVariance / 36), interval: [10 - 1.96 * Math.sqrt(samplingVariance / 36), 10 + 1.96 * Math.sqrt(samplingVariance / 36)], approximate: true, probability: 0.950004209703559, legend: 'TCL: aproximación, no masa exacta'}), '\\bar X\\approx N(10,\\sigma^2/36)', 14)
  ]},
  {id: 'models', title: 'Ajustar y cuestionar un modelo', steps: [
    scene('Separar datos y supuestos', 'Los tamaños observados de cinco células son 8, 9, 10, 11 y 12 micras. Los datos no son una distribución completa. Proponemos observaciones independientes de un modelo normal, con media y varianza desconocidas; es un supuesto que habrá que evaluar.', 'bars', bars(['1', '2', '3', '4', '5'], sampleSizes, {xTitle: 'Célula observada', yTitle: 'Tamaño (micras)', legend: 'Cinco datos ilustrativos', sample: sampleSizes}), 'X_i\\overset{\\mathrm{iid}}\\sim N(\\mu,\\sigma^2)'),
    scene('Comparar medias mediante verosimilitud', 'Para aislar la media fijamos provisionalmente la varianza en dos micras cuadradas. La verosimilitud relativa alcanza uno en media 10 y baja a e elevado a -1,25, aproximadamente 0,2865, en media 9 u 11. Es plausibilidad relativa de parámetros para estos datos, no probabilidad de la media.', 'curve', {family: 'likelihood', mean: fittedMean, variance: fittedVariance, count: 5, domain: [7, 13], marker: 10, ratioAt9: Math.exp(-1.25), xTitle: 'Media candidata (micras)', yTitle: 'Verosimilitud relativa', legend: 'Máximo = 1 en media 10'}, '\\frac{L(\\mu)}{L(10)}=\\exp\\left[-\\frac{5(\\mu-10)^2}{4}\\right]', 12),
    scene('Estimar ambos parámetros', 'La media estimada por máxima verosimilitud es 10. Las distancias cuadradas suman diez; dividir entre cinco da varianza estimada dos y desviación aproximadamente 1,414. La varianza muestral insesgada divide entre cuatro y da 2,5: son estimadores diferentes.', 'curve', normal(fittedMean, Math.sqrt(fittedVariance), {xTitle: 'Tamaño (micras)', variance: fittedVariance, unbiasedVariance: 2.5, sumSquares: 10, count: 5, legend: 'Ajuste normal: media 10, varianza 2'}), '\\hat\\mu=\\bar x=10,\\quad \\hat\\sigma^2_{ML}=\\frac{\\sum_i(x_i-\\bar x)^2}{5}=2'),
    scene('Una predicción condicionada al modelo', 'Tratando los parámetros estimados como fijos, el modelo ajustado asigna al intervalo de 9 a 11 micras una probabilidad aproximadamente 0,520500. Esta predicción omite la incertidumbre al estimar con solo cinco datos; no es una garantía de que una nueva célula caiga allí.', 'curve', normal(fittedMean, Math.sqrt(fittedVariance), {xTitle: 'Tamaño de nueva célula (micras)', interval: [9, 11], probability: 0.5204998778130465, legend: 'Predicción puntual del modelo: 52,05 %'}), 'P_{\\hat\\mu,\\hat\\sigma}(9<X<11)\\approx0{,}520500', 12),
    scene('Sensibilidad y comprobación', 'Si la última observación cambia de 12 a 22, la media estimada pasa a 12 y la varianza a 26. La curva verde muestra el nuevo ajuste y la azul el original. Esa sensibilidad pide revisar errores de medida, heterogeneidad y adecuación del modelo antes de interpretar biológicamente sus parámetros.', 'curve', normal(12, Math.sqrt(26), {domain: [4, 30], xTitle: 'Tamaño (micras)', sample: [8, 9, 10, 11, 22], variance: 26, comparison: {mean: 10, sd: Math.sqrt(2)}, legend: 'Azul: original; verde: dato 22', caveat: 'Ajustes sensibles; no prueba de normalidad'}), '\\hat\\mu=12,\\quad \\hat\\sigma^2_{ML}=26', 12)
  ]},
  {id: 'algebra', title: 'Álgebra: pesos, escala y logaritmos', steps: [
    scene('Los pesos todavía no son probabilidades', 'Tres estados de un cultivo ficticio reciben pesos 1, 4 y 7. Suman 12 y conservan una razón uno a cuatro a siete. Sus alturas no son probabilidades: buscamos una constante positiva que haga que el total valga uno, sin alterar esas razones.', 'bars', bars(['Estado A', 'Estado B', 'Estado C'], [1, 4, 7], {yTitle: 'Peso sin normalizar', legend: 'Pesos relativos; suma 12', total: 12}), String.raw`c(1+4+7)=1`),
    scene('Dividir la igualdad completa', 'Aplicamos la misma división a ambos lados: doce por c igual a uno implica c igual a 1/12. Las masas resultantes son 1/12, 1/3 y 7/12. Su suma es uno; dividir entre cada peso por separado no resolvería esta normalización.', 'bars', bars(['Estado A', 'Estado B', 'Estado C'], [1 / 12, 1 / 3, 7 / 12], {legend: 'Pesos divididos entre su suma', normalizer: 1 / 12, total: 1}), 'c=1/12'),
    scene('Un producto se convierte en suma', 'Pasamos a una espera ideal con escala cuatro horas: la supervivencia es exp(-t/4). A las horas cero, dos, cuatro y seis vale 1, exp(-0,5), exp(-1) y exp(-1,5). En cuatro horas, multiplicar dos supervivencias de dos horas reproduce exp(-1), bajo este modelo exponencial.', 'bars', bars(['0', '2', '4', '6'], [1, Math.exp(-0.5), Math.exp(-1), Math.exp(-1.5)], {xTitle: 'Tiempo (horas)', yTitle: 'Supervivencia S(t)', legend: 'Escala 4 horas; tasa 1/4 por hora', scale: 4}), String.raw`S(4)=S(2)^2=e^{-1}`),
    scene('El logaritmo deshace la exponencial', 'Representamos ahora menos el logaritmo natural de las mismas supervivencias. Los valores son cero, 0,5, uno y 1,5: una relación lineal t/4 reemplaza el producto. Solo tomamos logaritmos de valores positivos; una supervivencia redondeada a cero no permite este despeje.', 'bars', bars(['0', '2', '4', '6'], [0, 0.5, 1, 1.5], {xTitle: 'Tiempo (horas)', yTitle: '-log S(t)', legend: 'Transformación logarítmica, no probabilidad', scale: 4}), String.raw`-\log S(t)=t/4`),
    scene('Recuperar un tiempo admisible', 'Con escala cuatro horas, las supervivencias objetivo 1/2, 1/4 y 1/8 se alcanzan en 4 log(2), 4 log(4) y 4 log(8) horas. Son aproximadamente 2,773, 5,545 y 8,318. El tiempo sale positivo porque cada objetivo está entre cero y uno; no extrapolamos a supervivencias negativas.', 'bars', bars(['S = 1/2', 'S = 1/4', 'S = 1/8'], [4 * Math.log(2), 4 * Math.log(4), 4 * Math.log(8)], {xTitle: 'Supervivencia objetivo', yTitle: 'Tiempo (horas)', legend: 'Despeje con logaritmo natural', survivals: [0.5, 0.25, 0.125], scale: 4}), String.raw`t=-4\log s`)
  ]},
  {id: 'calculus', title: 'Cálculo: franjas, integral y pendiente', steps: [
    scene('Dos franjas por la izquierda', 'Una duración ficticia tiene densidad t/2 entre cero y dos minutos, con área total uno. Aproximamos el área entre cero y un minuto con dos rectángulos de anchura 0,5 y alturas cero y 0,25. Su suma es 0,125: al tomar alturas izquierdas en una curva creciente, subestimamos el área.', 'curve', areaExample({rectangles: {lower: 0, upper: 1, count: 2}, approximation: 0.125, legend: '2 rectángulos izquierdos; área aproximada 0,125'}), 'R_2=0.125'),
    scene('Cuatro franjas más estrechas', 'Dividimos el mismo intervalo en cuatro partes de anchura 0,25 minutos. Las alturas izquierdas son cero, 0,125, 0,25 y 0,375 por minuto. La suma de altura por anchura sube a 0,1875, sin cambiar la densidad ni el intervalo que queremos medir.', 'curve', areaExample({rectangles: {lower: 0, upper: 1, count: 4}, approximation: 0.1875, legend: '4 rectángulos izquierdos; área aproximada 0,1875'}), 'R_4=0.1875'),
    scene('Ocho franjas y un error menor', 'Con ocho rectángulos izquierdos, cada anchura es 1/8 y la aproximación llega a 0,21875. El error respecto al área exacta 0,25 baja a 0,03125. La animación refina una suma determinista: no está simulando duraciones ni añadiendo observaciones biológicas.', 'curve', areaExample({rectangles: {lower: 0, upper: 1, count: 8}, approximation: 0.21875, error: 0.03125, legend: '8 rectángulos; error = 0,03125'}), 'R_n=(n-1)/(4n)'),
    scene('Evaluar la primitiva en ambos límites', 'La primitiva de t/2 es t al cuadrado dividido entre cuatro. Restamos su valor en cero al de uno y obtenemos exactamente 0,25. Al integrar hasta dos obtenemos uno. La región sombreada representa probabilidad, mientras la altura de la curva representa densidad por minuto.', 'curve', areaExample({interval: [0, 1], probability: 0.25, legend: 'Integral exacta de 0 a 1 = 0,25'}), String.raw`\int_0^1(t/2)\,dt=1/4`),
    scene('La pendiente de la acumulada', 'La acumulada dentro del soporte es F(t)=t al cuadrado dividido entre cuatro. En un minuto vale 0,25 y su pendiente es 0,5 por minuto, igual a la densidad allí. El marcador señala esa acumulada, no una masa puntual: la probabilidad de una duración exactamente igual a un minuto es cero.', 'curve', areaExample({family: 'linear-cdf', marker: 1, probability: 0.25, density: 0.5, yTitle: 'Probabilidad acumulada F(t)', legend: 'F(1) = 0,25; pendiente = 0,5 por minuto'}), String.raw`F'(t)=t/2=f(t)`)
  ]},
  {id: 'combinatorics', title: 'Combinatoria: decidir orden y repetición', steps: [
    scene('Dos posiciones con repetición', 'Cuatro etiquetas de tubos, A, B, C y D, pueden ocupar dos posiciones. Con repetición hay cuatro opciones en cada posición y 16 secuencias. Cada celda marca una ruta permitida, no una probabilidad; la diagonal incluye AA, BB, CC y DD.', 'matrix', matrix(Array.from({length: 4}, () => Array(4).fill(1)), {rows: ['A', 'B', 'C', 'D'], columns: ['A', 'B', 'C', 'D'], rowTitle: 'Primera posición', columnTitle: 'Segunda posición', probability: false, legend: '1 = ruta permitida; 16 secuencias', total: 16}), '4^2=16'),
    scene('Sin repetición se elimina la diagonal', 'Si cada tubo físico solo puede usarse una vez, desaparecen las cuatro rutas diagonales. Quedan cuatro por tres igual a 12 secuencias ordenadas. AB y BA siguen siendo diferentes, porque intercambian qué tubo ocupa cada posición etiquetada.', 'matrix', matrix(Array.from({length: 4}, (_, row) => Array.from({length: 4}, (_, column) => Number(row !== column))), {rows: ['A', 'B', 'C', 'D'], columns: ['A', 'B', 'C', 'D'], rowTitle: 'Primer tubo', columnTitle: 'Segundo tubo', probability: false, legend: '0 = prohibido; 12 secuencias', total: 12}), String.raw`4\cdot3=12`),
    scene('Quitar un orden que ya no importa', 'Para analizar un par conjunto ya no distinguimos AB de BA. Conservamos solo la mitad superior de la tabla: AB, AC, AD, BC, BD y CD. Dividir las 12 secuencias entre las dos ordenaciones de cada par deja seis selecciones sin orden.', 'matrix', matrix(Array.from({length: 4}, (_, row) => Array.from({length: 4}, (_, column) => Number(row < column))), {rows: ['A', 'B', 'C', 'D'], columns: ['A', 'B', 'C', 'D'], rowTitle: 'Primera etiqueta', columnTitle: 'Segunda etiqueta', probability: false, legend: 'Un representante de cada par; 6 selecciones', total: 6}), String.raw`\binom42=12/2=6`),
    scene('Ordenar etiquetas indistinguibles', 'Ahora ordenamos cuatro etiquetas con dos A y dos B. Las seis secuencias distintas aparecen en las barras. Partir de 4 factorial y dividir entre 2 factorial por 2 factorial elimina las permutaciones internas de etiquetas iguales; no estamos eligiendo dos tubos entre cuatro.', 'bars', bars(['AABB', 'ABAB', 'ABBA', 'BAAB', 'BABA', 'BBAA'], Array(6).fill(1), {xTitle: 'Ordenación de dos A y dos B', yTitle: 'Una secuencia distinta', legend: 'Recuento, no probabilidades', total: 6}), '4!/(2!2!)=6'),
    scene('El recuento necesita un mecanismo uniforme', 'Volvemos a seleccionar dos tubos distintos sin orden y suponemos que los seis pares son equiprobables. Si solo A y B están marcados, un único par contiene dos marcados y su probabilidad es 1/6. Preferencias de selección invalidarían ese cociente aunque el número de pares siguiera siendo seis.', 'matrix', matrix(Array.from({length: 4}, (_, row) => Array.from({length: 4}, (_, column) => Number(row < column))), {rows: ['A', 'B', 'C', 'D'], columns: ['A', 'B', 'C', 'D'], rowTitle: 'Primera etiqueta', columnTitle: 'Segunda etiqueta', probability: false, legend: '6 pares equiprobables; favorable AB', highlight: [1], numerator: 1, denominator: 6, probabilityValue: 1 / 6}), 'P(AB)=1/6')
  ]},
  {id: 'cdf', title: 'CDF: saltos, intervalos y cuantiles', steps: [
    scene('La masa vive en tres puntos', 'El número de estructuras en una muestra ficticia toma valores cero, dos y cinco con masas 0,25, 0,50 y 0,25. No hay masa en uno, tres ni cuatro. Las barras representan probabilidades puntuales y su suma es uno; aún no son una acumulada.', 'bars', bars(['0', '2', '5'], [0.25, 0.5, 0.25], {xTitle: 'Recuento X', xValues: [0, 2, 5], total: 1}), String.raw`p(0)=1/4,\quad p(2)=1/2,\quad p(5)=1/4`),
    scene('Un umbral que no es un resultado', 'La acumulada incluye todos los resultados menores o iguales al umbral. En x igual a uno solo se ha incluido el cero: F(1)=0,25. El escalón permanece horizontal desde cero hasta antes de dos; no interpolamos una probabilidad creciente entre los valores posibles.', 'curve', cdfExample({marker: 1, probability: 0.25}), String.raw`F(1)=P(X\le1)=1/4`),
    scene('El salto incluye su extremo', 'En dos la acumulada salta desde 0,25 hasta 0,75. El círculo abierto señala el límite por la izquierda y el cerrado el valor F(2). La diferencia 0,50 es exactamente P(X=2); continuidad por la derecha no significa continuidad a través del salto.', 'curve', cdfExample({marker: 2, probability: 0.75, leftLimit: 0.25, jump: 0.5}), 'F(2)-F(2^-)=0.75-0.25=0.5'),
    scene('Restar acumuladas, no áreas', 'Para el intervalo cero menor que X menor o igual que cuatro, excluimos el cero y admitimos el dos. F(4) menos F(0) vale 0,75 menos 0,25 igual a 0,50. No sumamos alturas de escalones ni interpretamos el área bajo la CDF como probabilidad del intervalo.', 'curve', cdfExample({marker: 4, probability: 0.75, bounds: [0, 4], intervalProbability: 0.5}), String.raw`P(0<X\le4)=F(4)-F(0)=1/2`),
    scene('El cuantil busca el primer alcance', 'Buscamos el cuantil de nivel 0,80. Hasta antes de cinco la acumulada vale 0,75 y no alcanza ese nivel; en cinco llega a uno. Por eso el cuantil es cinco, aunque F(5) no sea exactamente 0,80. Una acumulada con saltos requiere esta inversa generalizada.', 'curve', cdfExample({marker: 5, probability: 1, quantileLevel: 0.8, quantile: 5}), String.raw`Q(0.80)=\inf\{x:F(x)\ge0.80\}=5`)
  ]},
  {id: 'moments', title: 'Momentos: transformar antes de promediar', steps: [
    scene('Dos resultados equiprobables', 'Una cantidad ficticia X vale uno o tres unidades con probabilidad 1/2 cada una. La media está en dos, entre los resultados posibles. Esta distribución pequeña permite calcular momentos exactamente y distinguir una transformación de valores de una transformación de probabilidades.', 'bars', bars(['1', '3'], [0.5, 0.5], {xTitle: 'Cantidad X (unidades)', xValues: [1, 3], xMean: 2, expectation: 2}), 'P(X=1)=P(X=3)=1/2'),
    scene('Las contribuciones a la media', 'Ponderamos cada valor por su masa: uno por 1/2 aporta 0,5 y tres por 1/2 aporta 1,5. Las barras suman E(X)=2. Estas contribuciones tienen unidades de X y no forman una nueva distribución de probabilidad: su total no tiene que valer uno.', 'bars', bars(['X = 1', 'X = 3'], [0.5, 1.5], {yTitle: 'x · p(x) (unidades)', legend: 'Contribuciones al primer momento', expectation: 2}), 'E(X)=0.5+1.5=2'),
    scene('El segundo momento no es varianza', 'Al cuadrar primero obtenemos contribuciones 0,5 y 4,5, cuya suma E(X al cuadrado) vale cinco. Restamos E(X) al cuadrado, que vale cuatro, y la varianza queda en uno. La desviación típica es una unidad; el segundo momento y la varianza tienen unidades cuadradas.', 'bars', bars(['X = 1', 'X = 3'], [0.5, 4.5], {yTitle: 'x² · p(x) (unidades²)', legend: 'Segundo momento = 5; varianza = 1', secondMoment: 5, variance: 1}), String.raw`E(X^2)=5,\quad V(X)=5-2^2=1`),
    scene('Una transformación afín conserva la regla', 'Definimos Y=3X+2. Sus resultados son cinco y once con las mismas masas, su media es ocho y su varianza nueve. El desplazamiento dos no cambia las distancias entre resultados; el factor tres multiplica esas distancias y su cuadrado multiplica la varianza.', 'bars', bars(['5', '11'], [0.5, 0.5], {xTitle: 'Y = 3X + 2 (unidades)', xValues: [5, 11], xMean: 8, expectation: 8, variance: 9}), String.raw`E(3X+2)=8,\quad V(3X+2)=9`),
    scene('La transformación no lineal exige recalcular', 'Para Z=X al cuadrado, los resultados pasan a uno y nueve. Su media es cinco, no el cuadrado de la media original, que es cuatro. El cuarto momento de X vale 41 y la varianza de Z es 41 menos 25 igual a 16. Cuadrar es una operación no lineal: no aplicamos la regla afín.', 'bars', bars(['1', '9'], [0.5, 0.5], {xTitle: 'Z = X² (unidades²)', xValues: [1, 9], xMean: 5, expectation: 5, fourthMoment: 41, variance: 16}), String.raw`E(X^2)=5\ne E(X)^2=4,\quad V(X^2)=16`)
  ]},
  {id: 'hypergeometric', title: 'Hipergeométrica: contar sin reemplazo', steps: [
    scene('La población disponible es finita', 'Un lote ficticio contiene ocho semillas identificadas: tres marcadas y cinco no marcadas. Elegimos cuatro sin reemplazo y todos los subconjuntos tienen la misma probabilidad. Hay 70 muestras posibles; X cuenta marcadas y puede tomar cero, uno, dos o tres, nunca cuatro.', 'dots', {...cohort([['Marcadas', 3], ['No marcadas', 5]], [0]), population: 8, marked: 3, sampleSize: 4, support: [0, 1, 2, 3], possible: 70}, String.raw`\binom84=70`),
    scene('Enumerar las muestras favorables', 'Para obtener k marcadas elegimos k de las tres marcadas y cuatro menos k de las cinco restantes. Los números de muestras son 5, 30, 30 y 5 para k de cero a tres; suman las 70 posibilidades. Son recuentos enteros de selecciones, todavía no probabilidades.', 'bars', bars(['0', '1', '2', '3'], hyperCounts, {xTitle: 'Marcadas k en la muestra', yTitle: 'Número de muestras posibles', legend: 'Enumeración exacta sin reemplazo', population: 8, marked: 3, sampleSize: 4, possible: 70}), String.raw`n_k=\binom3k\binom5{4-k}`),
    scene('Dividir por el total equiprobable', 'Dividimos cada recuento entre 70 y obtenemos la masa hipergeométrica. Exactamente dos marcadas tiene probabilidad 30/70=3/7, aproximadamente 0,428571. Las cuatro masas suman uno, y los huecos fuera del soporte no reciben probabilidad.', 'bars', bars(['0', '1', '2', '3'], hyperCounts.map(count => count / 70), {xTitle: 'Marcadas X', legend: 'PMF hipergeométrica exacta', population: 8, marked: 3, sampleSize: 4, support: [0, 1, 2, 3], highlight: [2], probability: 3 / 7}), 'P(X=2)=30/70=3/7'),
    scene('La corrección finita reduce dispersión', 'La media es cuatro por 3/8 igual a 1,5. La varianza exacta es 15/28, aproximadamente 0,535714; una binomial con cuatro ensayos y p=3/8 daría 15/16. La corrección 4/7 refleja que retirar semillas cambia lo disponible; la binomial no es exacta para este diseño.', 'bars', bars(['Sin reemplazo', 'Binomial'], [15 / 28, 15 / 16], {xTitle: 'Diseño de muestreo', yTitle: 'Varianza (semillas²)', legend: 'Comparación exacta; binomial hipotética', expectation: 1.5, variance: 15 / 28, binomialVariance: 15 / 16, correction: 4 / 7}), 'V(X)=(15/16)(4/7)=15/28'),
    scene('Una muestra grande obliga a incluir marcadas', 'Si ahora elegimos seis del mismo lote, las cinco no marcadas no bastan para evitar toda marcada. El soporte es uno, dos o tres. Las muestras favorables son 3, 15 y 10, sobre 28 posibles; la media sube a 2,25. Comprobar el mínimo evita dibujar masas en resultados imposibles.', 'bars', bars(['1', '2', '3'], forcedCounts.map(count => count / 28), {xTitle: 'Marcadas X en seis semillas', legend: 'Soporte obligado: 1, 2, 3', population: 8, marked: 3, sampleSize: 6, support: [1, 2, 3], counts: forcedCounts, possible: 28, expectation: 2.25, variance: 45 / 112}), String.raw`\max(0,6-5)=1\le X\le3`)
  ]},
  {id: 'geometric-negative', title: 'Geométrica y negativa: contar hasta parar', steps: [
    scene('Fracasos antes del primer éxito', 'Un ensayo ficticio detecta una señal con probabilidad 1/2, de manera independiente y estable. X cuenta fracasos antes del primer éxito, así que empieza en cero. Las masas son 1/2, 1/4, 1/8 y sucesivamente la mitad; el marco llega a siete y omite una cola de 1/256.', 'bars', bars(integerLabels(geometricMass), geometricMass, {xTitle: 'Fracasos X antes del primer éxito', legend: 'PMF geométrica; cola X > 7 = 1/256', successProbability: 0.5, tail: 1 / 256, supportStart: 0}), String.raw`P(X=k)=2^{-(k+1)},\quad k\ge0`),
    scene('El orden final está fijado', 'Dos fracasos antes de detectar corresponden a la secuencia fracaso, fracaso, éxito. Su masa es 1/8. No añadimos un coeficiente para colocar libremente el éxito: el diseño obliga a que sea el último ensayo, porque ahí terminamos de observar.', 'bars', bars(integerLabels(geometricMass), geometricMass, {xTitle: 'Fracasos X', legend: 'FFÉ: masa 1/8; cola >7 no dibujada', highlight: [2], probability: 1 / 8, tail: 1 / 256}), 'P(X=2)=(1/2)^2(1/2)=1/8'),
    scene('Ensayos y carencia de memoria', 'Si N cuenta ensayos hasta detectar, N=X+1 y el soporte empieza en uno: dos fracasos significan tres ensayos. Tras dos ensayos sin detectar, la probabilidad de necesitar más de otros dos es 1/4, igual a P(N>2). Esta carencia de memoria requiere que los intentos no cambien la probabilidad.', 'bars', bars(geometricMass.map((_, index) => String(index + 1)), geometricMass, {xTitle: 'Ensayos N = X + 1', xValues: geometricMass.map((_, index) => index + 1), xMean: 2, expectation: 2, supportStart: 1, conditionalSurvival: 1 / 4, survival: 1 / 4, legend: 'Media 2 ensayos; cola N > 8 = 1/256', tail: 1 / 256}), String.raw`P(N>4\mid N>2)=P(N>2)=1/4`),
    scene('Esperar hasta dos éxitos', 'Ahora Y cuenta fracasos antes del segundo éxito con la misma probabilidad 1/2. Para dos fracasos, el cuarto ensayo debe ser éxito y el otro éxito puede ocupar tres posiciones anteriores. La masa es 3/16. Dibujamos Y de cero a diez; la cola restante es 13/4096.', 'bars', bars(integerLabels(negativeMass), negativeMass, {xTitle: 'Fracasos Y antes del segundo éxito', legend: 'PMF binomial negativa; cola >10 = 13/4096', targetSuccesses: 2, successProbability: 0.5, highlight: [2], probability: 3 / 16, tail: 13 / 4096}), String.raw`P(Y=k)=(k+1)2^{-(k+2)}`),
    scene('Una parada distinta cambia los momentos', 'Para fracasos antes del primer éxito, la media es 1 y la varianza 2. Antes de dos éxitos, la media es 2 y la varianza 4. Las barras comparan esos valores numéricos: las medias tienen unidades de fracasos y las varianzas unidades cuadradas. El total de ensayos ya no está fijado como en una binomial.', 'bars', bars(['G: media', 'G: var.', 'BN: media', 'BN: var.'], [1, 2, 2, 4], {xTitle: 'Modelo y momento', yTitle: 'Valor del momento (unidades según tipo)', legend: 'Fracasos antes de 1 o 2 éxitos; p = 1/2', geometricMean: 1, geometricVariance: 2, negativeMean: 2, negativeVariance: 4}), String.raw`E(Y)=2E(X),\quad V(Y)=2V(X)`)
  ]},
  {id: 'exponential', title: 'Exponencial: tasa, escala y espera adicional', steps: [
    scene('Tasa no es escala', 'Una señal ficticia aparece según un mecanismo ideal de tasa constante 0,4 por minuto. La espera exponencial tiene escala y media 2,5 minutos, inversa de la tasa, y varianza 6,25. La densidad en cero vale 0,4 por minuto; no es la probabilidad de un evento exactamente en cero.', 'curve', waiting('exponential', {rate: 0.4, scale: 2.5, expectation: 2.5, variance: 6.25, marker: 0, legend: 'Tasa 0,4; escala 2,5; marco 0–15 min', tail: Math.exp(-6)}), String.raw`f(t)=0.4e^{-0.4t},\quad t\ge0`),
    scene('Que el evento ya haya ocurrido', 'Para ocurrir antes de cinco minutos, integramos la densidad desde cero hasta cinco. La acumulada es uno menos exp(-2), aproximadamente 0,864665. La altura en cinco no responde a esa pregunta: la probabilidad viene del área verde, sin unidades.', 'curve', waiting('exponential', {rate: 0.4, interval: [0, 5], probability: 1 - Math.exp(-2), legend: 'P(T ≤ 5) = 1 - exp(-2)'}), String.raw`F(5)=1-e^{-2}`),
    scene('La supervivencia es la cola complementaria', 'Esperar más de cinco minutos tiene probabilidad exp(-2), aproximadamente 0,135335. La región verde llega solo hasta quince minutos; queda fuera exp(-6), aproximadamente 0,002479. El valor anunciado incluye esa cola no dibujada y es el complemento exacto de la escena anterior.', 'curve', waiting('exponential', {rate: 0.4, interval: [5, 15], probability: Math.exp(-2), tail: Math.exp(-6), legend: 'P(T > 5) = exp(-2); incluye cola >15'}), String.raw`S(5)=e^{-2}=1-F(5)`),
    scene('La espera adicional no se acorta', 'Después de cinco minutos sin señal, llamamos U a la espera adicional. Bajo el mismo mecanismo, U vuelve a tener tasa 0,4. Esperar otros 2,5 minutos tiene probabilidad exp(-1), aproximadamente 0,367879; no restamos cinco a la media. La sombra termina en quince minutos adicionales y omite exp(-6).', 'curve', waiting('exponential', {rate: 0.4, interval: [2.5, 15], marker: 2.5, xTitle: 'Espera adicional U (min)', probability: Math.exp(-1), elapsed: 5, additional: 2.5, tail: Math.exp(-6), legend: 'P(T > 7,5 | T > 5) = exp(-1); incluye cola'}), String.raw`\frac{S(7.5)}{S(5)}=e^{-1}`),
    scene('Duplicar la tasa contrae el tiempo', 'Si la tasa sube a 0,8 por minuto, la media baja a 1,25 minutos y la varianza a 1,5625. La nueva curva verde tiene altura 0,8 en cero; la azul conserva tasa 0,4. Ninguna curva implica envejecimiento: ambas mantienen riesgo constante y sus colas siguen más allá del marco.', 'curve', waiting('exponential', {rate: 0.8, scale: 1.25, expectation: 1.25, variance: 1.5625, comparison: {family: 'exponential', rate: 0.4}, legend: 'Azul: tasa 0,4; verde: tasa 0,8', tail: Math.exp(-12)}), String.raw`E(T)=1/0.8=1.25,\quad V(T)=1/0.8^2`)
  ]},
  {id: 'gamma', title: 'Gamma Erlang: sumar dos etapas independientes', steps: [
    scene('Una etapa exponencial', 'Una reacción ficticia necesita una primera espera exponencial de tasa 0,5 por minuto y escala dos minutos. Su media es dos y su varianza cuatro. La densidad empieza en 0,5 en cero. El marco de cero a veinte minutos deja fuera exp(-10); aún no hemos sumado la segunda etapa.', 'curve', waiting('exponential', {rate: 0.5, scale: 2, domain: [0, 20], expectation: 2, variance: 4, legend: 'Una etapa: exponencial de escala 2 min', tail: Math.exp(-10)}), String.raw`T_1\sim\operatorname{Exp}(0.5)`),
    scene('Sumar dos etapas de la misma escala', 'Añadimos una segunda espera independiente con idéntica tasa. La suma T tiene gamma Erlang de forma dos y escala dos: densidad 0,25 por t por exp(-t/2). Ahora la densidad en cero es cero y el máximo está en dos minutos. La media es cuatro y la varianza ocho; igualar escalas es esencial.', 'curve', waiting('gamma', {shape: 2, rate: 0.5, scale: 2, domain: [0, 20], expectation: 4, variance: 8, mode: 2, marker: 2, legend: 'Forma 2; escala 2; máximo en 2 min', tail: 11 * Math.exp(-10)}), String.raw`f_T(t)=0.25t e^{-t/2},\quad E(T)=4`),
    scene('Acumular hasta cuatro minutos', 'Para forma dos, la acumulada se calcula sin una función gamma numérica: F(t)=1-exp(-t/2) por (1+t/2). En cuatro minutos vale 1-3 exp(-2), aproximadamente 0,593994. La probabilidad no coincide con la exponencial de una sola etapa, porque exigimos completar dos esperas.', 'curve', waiting('gamma', {shape: 2, rate: 0.5, scale: 2, domain: [0, 20], interval: [0, 4], probability: 1 - 3 * Math.exp(-2), legend: 'F(4) = 1 - 3 exp(-2)'}), String.raw`F(t)=1-e^{-0.5t}(1+0.5t)`),
    scene('No confundir media con plazo', 'Aunque la media de la suma sea cuatro minutos, superar seis tiene probabilidad 4 exp(-3), aproximadamente 0,199148. La sombra llega hasta veinte y deja fuera 11 exp(-10), aproximadamente 0,000499; la cifra incluye esa cola. Una media no fija un plazo de terminación para cada reacción.', 'curve', waiting('gamma', {shape: 2, rate: 0.5, scale: 2, domain: [0, 20], interval: [6, 20], probability: 4 * Math.exp(-3), tail: 11 * Math.exp(-10), legend: 'P(T > 6) = 4 exp(-3); incluye cola >20'}), String.raw`S(6)=e^{-3}(1+3)`),
    scene('Cambiar escala sin cambiar forma', 'Al reducir la escala común de ambas etapas a un minuto, la tasa pasa a uno. La gamma verde conserva forma dos, pero su media es 2, varianza 2 y moda 1. La azul mantiene escala dos. Estirar el tiempo por dos multiplica la media por dos y la varianza por cuatro, no por dos.', 'curve', waiting('gamma', {shape: 2, rate: 1, scale: 1, domain: [0, 20], expectation: 2, variance: 2, mode: 1, marker: 1, comparison: {family: 'gamma', shape: 2, rate: 0.5}, legend: 'Azul: escala 2; verde: escala 1', tail: 21 * Math.exp(-20)}), String.raw`E(T)=k\alpha=2,\quad V(T)=k\alpha^2=2`)
  ]},
  {id: 'cauchy-weibull', title: 'Cauchy y Weibull: centro, colas y riesgo', steps: [
    scene('Un centro simétrico sin esperanza', 'La Cauchy estándar es simétrica en cero, con mediana y moda cero, pero sin esperanza ni varianza definidas. La curva muestra de menos ocho a ocho; queda masa 1-2 arctan(8)/pi fuera del marco. Un cociente de señales puede motivar revisar colas, pero no demuestra que una señal biológica sea Cauchy.', 'curve', {family: 'cauchy', location: 0, scale: 1, domain: [-8, 8], xTitle: 'Señal estandarizada C', yTitle: 'Densidad de C', legend: 'Cauchy: mediana 0; colas fuera de ±8', tail: 1 - 2 * Math.atan(8) / Math.PI}, String.raw`f(c)=1/[\pi(1+c^2)]`),
    scene('El intervalo central sí tiene probabilidad', 'Entre menos uno y uno, la Cauchy estándar acumula exactamente la mitad de su masa. Integramos mediante arctangentes y obtenemos 0,50. Esa probabilidad central y la simetría no crean una media: los momentos dependen también de las colas lejanas.', 'curve', {family: 'cauchy', location: 0, scale: 1, domain: [-8, 8], interval: [-1, 1], probability: 0.5, xTitle: 'Señal estandarizada C', yTitle: 'Densidad de C', legend: 'Área entre -1 y 1 = 0,50'}, String.raw`P(-1<C<1)=2\arctan(1)/\pi=1/2`),
    scene('Truncar una integral no crea un momento', 'Las barras muestran la integral parcial del valor absoluto de C hasta límites uno, dos, cuatro y ocho: log(1+B al cuadrado)/pi. Cada número es finito, pero crece sin límite al ampliar B. No renormalizamos el tramo ni lo llamamos esperanza poblacional; cancelar colas simétricas tampoco define E(C).', 'bars', bars(['1', '2', '4', '8'], [1, 2, 4, 8].map(bound => Math.log1p(bound ** 2) / Math.PI), {xTitle: 'Límite simétrico B', yTitle: 'Integral parcial de |C|', legend: 'Integral sin renormalizar; diverge al ampliar B', bounds: [1, 2, 4, 8]}), String.raw`E[|C|;|C|\le B]=\log(1+B^2)/\pi`),
    scene('Weibull de forma uno: riesgo constante', 'Para una vida útil ficticia usamos Weibull de escala tres horas y forma uno. Coincide con una exponencial de tasa 1/3: densidad en cero 1/3 y supervivencia a tres horas exp(-1). El riesgo es constante; el marco acaba en doce horas y deja fuera exp(-4).', 'curve', {family: 'weibull', shape: 1, scale: 3, domain: [0, 12], marker: 0, survival: Math.exp(-1), hazard: [1 / 3, 1 / 3, 1 / 3], xTitle: 'Vida útil W (horas)', yTitle: 'Densidad (1/hora)', legend: 'Weibull forma 1: riesgo 1/3 por hora', tail: Math.exp(-4)}, String.raw`S(w)=e^{-w/3},\quad h(w)=1/3`),
    scene('Forma dos: el riesgo aumenta', 'Con la misma escala tres y forma dos, la curva verde arranca en cero y el riesgo es 2t/9: vale 1/3, 2/3 y 4/3 a las horas 1,5, tres y seis. La azul es forma uno. Ambas sobreviven a tres con exp(-1), pero no tienen igual riesgo; formas menores que uno tendrían densidad singular en cero y no se dibujan aquí.', 'curve', {family: 'weibull', shape: 2, scale: 3, domain: [0, 12], marker: 3, survival: Math.exp(-1), hazardTimes: [1.5, 3, 6], hazard: [1 / 3, 2 / 3, 4 / 3], comparison: {family: 'weibull', shape: 1, scale: 3}, xTitle: 'Vida útil W (horas)', yTitle: 'Densidad (1/hora)', legend: 'Azul: forma 1; verde: forma 2; cola >12', tail: Math.exp(-16)}, String.raw`S(w)=e^{-(w/3)^2},\quad h(w)=2w/9`)
  ]},
  {id: 'multinomial', title: 'Multinomial: tres categorías, un total fijo', steps: [
    scene('Una partición por célula', 'Clasificamos tres células ficticias independientes en reposo R, activadas A o dañadas D, con probabilidades 1/2, 1/4 y 1/4. Cada célula pertenece a una sola categoría y las categorías cubren todas las posibilidades. Las barras describen un ensayo; los recuentos finales deben sumar tres.', 'bars', bars(['Reposo R', 'Activada A', 'Dañada D'], [0.5, 0.25, 0.25], {xTitle: 'Categoría de una célula', legend: 'Probabilidades por ensayo; 3 células iid', sampleSize: 3, total: 1}), 'p_R+p_A+p_D=1'),
    scene('El soporte no es un rectángulo libre', 'La tabla da P(R=r,A=a) para r y a de cero a tres. El tercer recuento queda determinado: D=3-r-a. Las celdas con r+a mayor que tres son imposibles y valen cero. Sumamos todas las masas permitidas y obtenemos uno, no tres distribuciones independientes de recuentos.', 'matrix', matrix(trinomialTable, {rows: ['R=0', 'R=1', 'R=2', 'R=3'], columns: ['A=0', 'A=1', 'A=2', 'A=3'], rowTitle: 'Reposo R', columnTitle: 'Activadas A', legend: 'Masas conjuntas; D = 3 - R - A; total 1', sampleSize: 3, categoryProbabilities: [0.5, 0.25, 0.25]}), 'R+A+D=3'),
    scene('Una de cada categoría', 'Los recuentos uno, uno y uno pueden aparecer en seis ordenaciones de las tres células. Cada ordenación tiene masa 1/2 por 1/4 por 1/4 igual a 1/32. Al reunirlas obtenemos 6/32=3/16, aproximadamente 0,1875. La celda resaltada es una masa conjunta, no el producto de tres marginales binomiales.', 'matrix', matrix(trinomialTable, {rows: ['R=0', 'R=1', 'R=2', 'R=3'], columns: ['A=0', 'A=1', 'A=2', 'A=3'], rowTitle: 'Reposo R', columnTitle: 'Activadas A', legend: 'R = A = D = 1; masa 3/16', highlight: [5], counts: [1, 1, 1], coefficient: 6, probabilityValue: 3 / 16}), String.raw`P(1,1,1)=\frac{3!}{1!1!1!}(1/2)(1/4)^2=3/16`),
    scene('Una marginal binomial', 'Para contar solo activadas reunimos reposo y daño como no activada. A es binomial con tres ensayos y p=1/4: las masas son 27/64, 27/64, 9/64 y 1/64. La media es 0,75 y la varianza 0,5625. Ser binomial marginalmente no hace A independiente de los otros recuentos.', 'bars', bars(['0', '1', '2', '3'], binomial(3, 0.25), {xTitle: 'Activadas A', legend: 'Marginal binomial: n = 3, p = 1/4', xMean: 0.75, expectation: 0.75, variance: 9 / 16, trials: 3, successProbability: 0.25}), String.raw`A\sim\operatorname{Bin}(3,1/4)`),
    scene('Covarianza por compartir el total', 'Las medias de R, A y D son 1,5, 0,75 y 0,75, pero la dependencia no se decide por esas medias. La covarianza entre R y A es -3/8 y entre A y D es -3/16. La matriz contiene varianzas en la diagonal y covarianzas fuera: aumentar una categoría deja menos del total fijo para las demás.', 'matrix', matrix([[3 / 4, -3 / 8, -3 / 8], [-3 / 8, 9 / 16, -3 / 16], [-3 / 8, -3 / 16, 9 / 16]], {rows: ['R', 'A', 'D'], columns: ['R', 'A', 'D'], rowTitle: 'Recuento', columnTitle: 'Recuento', probability: false, signed: true, legend: 'Covarianzas: rojo negativas; azul positivas', means: [1.5, 0.75, 0.75], sampleSize: 3, categoryProbabilities: [0.5, 0.25, 0.25]}), String.raw`\operatorname{Cov}(X_i,X_j)=-3p_ip_j\ (i\ne j)`)
  ]},
  {id: 'continuous-joint', title: 'Conjunta continua: regiones, marginales y cortes', steps: [
    scene('Normalizar sobre un triángulo', 'Dos consumos ficticios X e Y son no negativos y suman como máximo dos unidades. El soporte es un triángulo de área dos, no todo el cuadrado. Una densidad conjunta constante 0,5 sobre él tiene volumen total uno. Los vértices dibujan la frontera, no una muestra de tres observaciones.', 'scatter', jointRegion({probability: 1}), String.raw`\int_0^2\int_0^{2-x}0.5\,dy\,dx=1`),
    scene('Una región de probabilidad positiva', 'Pedimos que los dos consumos juntos no superen una unidad. La región verde es un triángulo de área 1/2 dentro del soporte; multiplicar por densidad 0,5 da probabilidad 1/4. No calculamos probabilidades de puntos aislados ni añadimos las zonas exteriores al triángulo grande.', 'scatter', jointRegion({subset: [[0, 0], [1, 0], [0, 1]], subsetArea: 0.5, probability: 0.25, legend: 'Verde: X + Y ≤ 1; área 1/2; probabilidad 1/4'}), String.raw`P(X+Y\le1)=0.5\cdot0.5=0.25`),
    scene('Integrar para obtener una marginal', 'Fijado x entre cero y dos, y puede recorrer desde cero hasta dos menos x. Integrar la densidad conjunta 0,5 en ese corte da f_X(x)=(2-x)/2. La marginal desciende y tiene área uno: una conjunta constante en un triángulo no produce una marginal uniforme ni independencia.', 'curve', {family: 'linear', descending: true, support: [0, 2], domain: [0, 2], interval: [0, 2], probability: 1, expectation: 2 / 3, xTitle: 'Recurso X (unidades)', yTitle: 'Densidad marginal f_X (1/unidad)', legend: 'Marginal: longitud del corte × 0,5'}, String.raw`f_X(x)=\int_0^{2-x}0.5\,dy=(2-x)/2`),
    scene('Normalizar el corte dado X igual a 0,5', 'Cuando X vale 0,5, Y puede estar entre cero y 1,5. La marginal de X allí vale 0,75, así que dividir la densidad conjunta 0,5 entre 0,75 da densidad condicional 2/3. Su área es uno y su media 0,75. Usamos un cociente de densidades, no dividimos por P(X=0,5), que es cero.', 'curve', {family: 'uniform', support: [0, 1.5], domain: [0, 2], interval: [0, 1.5], knownX: 0.5, marginalDensity: 0.75, jointDensity: 0.5, density: 2 / 3, probability: 1, expectation: 0.75, xTitle: 'Y dado X = 0,5 (unidades)', yTitle: 'Densidad condicional (1/unidad)', legend: 'Corte normalizado: uniforme de 0 a 1,5'}, String.raw`f_{Y\mid X}(y\mid0.5)=0.5/0.75=2/3`),
    scene('Una condición mayor estrecha el soporte', 'Al fijar X=1,5 solo quedan de cero a 0,5 unidades para Y. La densidad condicional sube a dos, sin violar ninguna regla de probabilidad: altura dos por anchura 0,5 sigue dando uno. El área entre 0,25 y 0,5 es 0,50; la media condicional baja a 0,25. La información cambia soporte y distribución.', 'curve', {family: 'uniform', support: [0, 0.5], domain: [0, 2], interval: [0.25, 0.5], knownX: 1.5, marginalDensity: 0.25, jointDensity: 0.5, density: 2, probability: 0.5, expectation: 0.25, xTitle: 'Y dado X = 1,5 (unidades)', yTitle: 'Densidad condicional (1/unidad)', legend: 'Área verde: P(Y > 0,25 | X = 1,5) = 0,50'}, String.raw`f_{Y\mid X}=0.5/0.25=2`)
  ]},
  {id: 'bivariate-normal', title: 'Normal bivariante: marginal frente a condicional', steps: [
    scene('Declarar normalidad conjunta', 'Dos señales ficticias siguen conjuntamente una normal: medias 12 y 30, desviaciones dos y cuatro, y correlación 0,6. La matriz contiene varianzas cuatro y 16 y covarianza 4,8. Dos marginales normales por sí solas no justificarían este supuesto conjunto; tampoco estamos afirmando causalidad.', 'matrix', matrix([[4, 4.8], [4.8, 16]], {rows: ['X', 'Y'], columns: ['X', 'Y'], rowTitle: 'Señal', columnTitle: 'Señal', probability: false, signed: true, legend: 'Matriz de covarianzas; no probabilidades', means: [12, 30], deviations: [2, 4], rho: 0.6, jointNormal: true}), String.raw`\Sigma=\begin{pmatrix}4&4.8\\4.8&16\end{pmatrix}`),
    scene('Y sin conocer X', 'Antes de conocer X, la señal Y tiene marginal normal de media 30 y desviación cuatro. El marco representa de 14 a 46, cuatro desviaciones a cada lado, con colas fuera. La correlación 0,6 describe coordinación con X, pero no modifica por sí sola estos parámetros marginales.', 'curve', normal(30, 4, {domain: [14, 46], variance: 16, rho: 0.6, jointNormal: true, xTitle: 'Señal Y (unidades)', yTitle: 'Densidad marginal de Y (1/unidad)', legend: 'Y marginal: media 30, desviación 4; colas fuera'}), String.raw`Y\sim N(30,16)`),
    scene('Conocer X igual a 14', 'El valor 14 está una desviación de X por encima de su media 12. La media condicional de Y sube a 32,4 y la varianza baja a 16 por (1-0,6 al cuadrado), igual a 10,24. La desviación es 3,2, no 2,56: aplicamos la raíz al factor de reducción de varianza. Verde es condicional y azul marginal.', 'curve', conditionalNormal(14, {marker: 32.4, legend: 'Azul: Y marginal; verde: Y | X = 14'}), String.raw`Y\mid X=14\sim N(32.4,10.24),\quad\sigma=3.2`),
    scene('Una condición por debajo del centro', 'Si en cambio X vale diez, una desviación por debajo de 12, la media condicional de Y baja a 27,6. La varianza sigue siendo 10,24 y la desviación 3,2: dependen de la correlación, no del valor observado de X. La curva verde cambia de centro y la marginal azul permanece en 30.', 'curve', conditionalNormal(10, {marker: 27.6, legend: 'Azul: Y marginal; verde: Y | X = 10'}), String.raw`30+0.6(4/2)(10-12)=27.6`),
    scene('Tipificar con la desviación condicional', 'Regresamos a X=14 y preguntamos por Y mayor que 35,6. Restamos la media 32,4 y dividimos entre 3,2: el umbral queda en z=1. La cola normal es aproximadamente 0,158655. La sombra termina en 46 y la cifra incluye la pequeña cola posterior; usar desviación marginal cuatro daría otra probabilidad.', 'curve', conditionalNormal(14, {marker: 35.6, interval: [35.6, 46], threshold: 35.6, z: 1, probability: 0.15865525393145707, legend: 'Cola condicional ≈ 0,158655; incluye Y > 46'}), String.raw`P(Y>35.6\mid X=14)=1-\Phi(1)`)
  ]},
  {id: 'exponential-family', title: 'Familia exponencial: Poisson y verosimilitud', steps: [
    scene('Fijar los datos antes de comparar', 'Tres recuentos de colonias ficticios son 2, 4 y 3, observados en exposiciones iguales. Su suma es nueve y su media tres. Proponemos un modelo Poisson común con observaciones independientes; los datos quedan fijos mientras variamos la tasa candidata, y ese supuesto todavía necesita justificación biológica.', 'bars', bars(['Placa 1', 'Placa 2', 'Placa 3'], [2, 4, 3], {xTitle: 'Placa con exposición igual', yTitle: 'Colonias observadas', legend: 'Datos ficticios fijos: suma 9, media 3', sample: [2, 4, 3], total: 9, count: 3, mean: 3, horizontal: 3}), String.raw`\sum x_i=9,\quad\bar x=3`),
    scene('Separar estadístico y parámetro natural', 'La masa Poisson se escribe exp(x log lambda-lambda)/x factorial. En esa familia exponencial, el estadístico de una observación es x, el parámetro natural es log lambda y el normalizador es lambda. Las barras muestran logaritmos de tasas de 1 a 5; familia exponencial no significa la distribución exponencial de esperas.', 'bars', bars(rateCandidates.map(String), rateCandidates.map(rate => Math.log(rate)), {xTitle: 'Media Poisson candidata λ', yTitle: 'Parámetro natural η = log λ', legend: 'Reparametrización: η no es probabilidad', candidates: rateCandidates, normalizers: rateCandidates}), String.raw`h(x)=1/x!,\quad T(x)=x,\quad\eta=\log\lambda,\quad A(\eta)=e^\eta`),
    scene('Evaluar la verosimilitud de candidatos', 'Para los datos 2, 4 y 3, el producto de masas es L(lambda)=exp(-3 lambda) por lambda elevado a nueve dividido entre 288. Las barras evalúan candidatos uno, dos, tres, cuatro y cinco. No sumamos estas alturas como probabilidades de parámetros: son verosimilitudes para una misma muestra fija.', 'bars', bars(rateCandidates.map(String), rateLikelihoods, {xTitle: 'Media Poisson candidata λ', yTitle: 'Verosimilitud L(λ; datos)', legend: 'Verosimilitud, no distribución de λ', candidates: rateCandidates, sample: [2, 4, 3], count: 3, total: 9, logFactorials: Math.log(288), mle: 3, highlight: [2]}), String.raw`L(\lambda)=e^{-3\lambda}\lambda^9/(2!4!3!)`),
    scene('Maximizar no demuestra el modelo', 'La curva continúa la comparación para cualquier tasa positiva. La derivada del logaritmo de L es 9/lambda menos tres, y se anula en lambda=3, la media de los tres datos. Su segunda derivada es negativa: es el máximo. El marcador identifica el estimador, no una posterior ni una prueba de que las colonias sean Poisson.', 'curve', {family: 'poisson-likelihood', count: 3, total: 9, logFactorials: Math.log(288), domain: [0, 7], marker: 3, mle: 3, mean: 3, sample: [2, 4, 3], xTitle: 'Media Poisson candidata λ', yTitle: 'Verosimilitud L(λ; datos)', legend: 'Máximo en λ = 3; no probabilidad de λ'}, String.raw`\ell'(\lambda)=9/\lambda-3,\quad\hat\lambda=3`),
    scene('El enlace logarítmico mantiene medias positivas', 'Como ejemplo conceptual distinto, proponemos una media Poisson de 1,5 por dos elevado a la dosis d, para dosis cero a tres. Las medias son 1,5, tres, seis y doce y su logaritmo es lineal en d. No hemos ajustado esos coeficientes con las tres placas anteriores: el enlace ilustra un GLM, no valida independencia ni igualdad de media y varianza.', 'bars', bars(['0', '1', '2', '3'], [1.5, 3, 6, 12], {xTitle: 'Dosis d (unidades)', yTitle: 'Media Poisson μ(d) (colonias)', legend: 'GLM ilustrativo no ajustado a las placas', intercept: Math.log(1.5), slope: Math.log(2), fitted: false}), String.raw`\log\mu(d)=\log1.5+d\log2`)
  ]}
];

function findAnimation(animationId) {
  const animation = typeof animationId === 'string' && ANIMATIONS.find(item => item.id === animationId);
  if (!animation) throw new RangeError('Identificador de animación desconocido');
  return animation;
}

export function animationDuration(animationId) {
  return findAnimation(animationId).steps.reduce((total, step) => total + step.duration, 0);
}

function timestamp(seconds) {
  const milliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor(milliseconds / 60000) % 60;
  const wholeSeconds = Math.floor(milliseconds / 1000) % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(milliseconds % 1000).padStart(3, '0')}`;
}

export function buildVtt(animationId) {
  let start = 0;
  const cues = findAnimation(animationId).steps.map((step, index) => {
    const end = start + step.duration;
    const caption = step.caption.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const cue = `${index + 1}\n${timestamp(start)} --> ${timestamp(end)}\n${caption}\n`;
    start = end;
    return cue;
  });
  return `WEBVTT\n\n${cues.join('\n')}`;
}

const number = value => new Intl.NumberFormat('es-ES', value !== 0 && Math.abs(value) < 0.001 ? {maximumSignificantDigits: 3} : {maximumFractionDigits: 3}).format(value);

function shortText(context, text, xPosition, yPosition, width, align = 'left') {
  let label = String(text);
  while (label.length > 1 && context.measureText(label).width > width) label = label.slice(0, -1);
  if (label !== String(text)) label = `${label.slice(0, -1)}…`;
  context.textAlign = align;
  context.fillText(label, xPosition, yPosition);
}

function axes(context, width, height, data, xMin, xMax, yMin, yMax, categorical = false) {
  const plot = {left: 52, top: 48, right: width - 18, bottom: height - 48};
  const xPosition = value => plot.left + (value - xMin) / (xMax - xMin) * (plot.right - plot.left);
  const yPosition = value => plot.bottom - (value - yMin) / (yMax - yMin) * (plot.bottom - plot.top);
  context.font = '12px sans-serif';
  context.fillStyle = '#374151';
  shortText(context, data.yTitle || '', plot.left, 15, width - plot.left - 10);
  context.fillStyle = COLORS[0];
  shortText(context, data.legend || '', plot.left, 33, width - plot.left - 10);
  for (let tick = 0; tick <= 4; tick++) {
    const value = yMin + (yMax - yMin) * tick / 4;
    const vertical = yPosition(value);
    context.strokeStyle = '#e5e7eb';
    context.beginPath();
    context.moveTo(plot.left, vertical);
    context.lineTo(plot.right, vertical);
    context.stroke();
    context.fillStyle = '#374151';
    shortText(context, number(value), plot.left - 7, vertical + 4, 42, 'right');
    if (!categorical) shortText(context, number(xMin + (xMax - xMin) * tick / 4), xPosition(xMin + (xMax - xMin) * tick / 4), plot.bottom + 17, (plot.right - plot.left) / 4 - 3, 'center');
  }
  context.strokeStyle = '#6b7280';
  context.beginPath();
  context.moveTo(plot.left, plot.top);
  context.lineTo(plot.left, plot.bottom);
  context.lineTo(plot.right, plot.bottom);
  context.stroke();
  context.fillStyle = '#374151';
  shortText(context, data.xTitle || '', (plot.left + plot.right) / 2, height - 9, width - 30, 'center');
  return {...plot, xPosition, yPosition};
}

function drawBars(context, width, height, data, progress) {
  const maximum = Math.max(...data.values, data.horizontal || 0, 0.01);
  const yMax = data.yTitle === 'Probabilidad' || data.yTitle === 'F(k)' ? Math.max(0.5, Math.ceil(maximum * 4) / 4) : maximum * 1.15;
  const plot = axes(context, width, height, data, -0.5, data.values.length - 0.5, 0, yMax, true);
  const spacing = (plot.right - plot.left) / data.values.length;
  const active = Math.min(data.values.length - 1, Math.floor(progress * data.values.length));
  data.values.forEach((value, index) => {
    const left = plot.xPosition(index) - spacing * 0.32;
    const top = plot.yPosition(value);
    context.fillStyle = data.highlight && !data.highlight.includes(index) ? '#d1d5db' : COLORS[0];
    context.fillRect(left, top, spacing * 0.64, plot.bottom - top);
    if (index === active) {
      context.strokeStyle = COLORS[3];
      context.lineWidth = 2;
      context.strokeRect(left - 2, top - 2, spacing * 0.64 + 4, plot.bottom - top + 2);
      context.lineWidth = 1;
    }
    context.fillStyle = '#1f2937';
    if (spacing >= 42) shortText(context, number(value), plot.xPosition(index), top - 5, spacing - 4, 'center');
    shortText(context, data.labels[index], plot.xPosition(index), plot.bottom + 17, spacing - 3, 'center');
  });
  if (Number.isFinite(data.horizontal)) {
    context.strokeStyle = COLORS[2];
    context.setLineDash([5, 4]);
    context.beginPath();
    context.moveTo(plot.left, plot.yPosition(data.horizontal));
    context.lineTo(plot.right, plot.yPosition(data.horizontal));
    context.stroke();
    context.setLineDash([]);
  }
  if (Number.isFinite(data.xMean)) {
    const values = data.xValues || data.values.map((_, index) => index);
    const index = (data.xMean - values[0]) / (values.at(-1) - values[0]) * (values.length - 1);
    context.strokeStyle = COLORS[2];
    context.setLineDash([5, 4]);
    context.beginPath();
    context.moveTo(plot.xPosition(index), plot.top);
    context.lineTo(plot.xPosition(index), plot.bottom);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = COLORS[2];
    shortText(context, `Media ${number(data.xMean)}`, plot.xPosition(index), plot.top - 3, 100, 'center');
  }
}

function curveFunction(data) {
  if (data.family === 'uniform') return value => value >= data.support[0] && value <= data.support[1] ? 1 / (data.support[1] - data.support[0]) : 0;
  if (data.family === 'uniform-cdf') return value => Math.max(0, Math.min(1, (value - data.support[0]) / (data.support[1] - data.support[0])));
  if (data.family === 'likelihood') return value => Math.exp(-data.count * (value - data.mean) ** 2 / (2 * data.variance));
  if (data.family === 'step-cdf') return value => data.support.reduce((total, threshold, index) => value >= threshold ? data.cumulative[index] : total, 0);
  if (data.family === 'linear-cdf') return value => Math.max(0, Math.min(1, (value - data.support[0]) / (data.support[1] - data.support[0]))) ** 2;
  if (data.family === 'linear') return value => value < data.support[0] || value > data.support[1] ? 0 : 2 * (data.descending ? data.support[1] - value : value - data.support[0]) / (data.support[1] - data.support[0]) ** 2;
  if (data.family === 'exponential') return value => value < 0 ? 0 : data.rate * Math.exp(-data.rate * value);
  if (data.family === 'gamma') {
    if (data.shape !== 2) throw new RangeError('Esta curva gamma requiere forma entera dos');
    return value => value <= 0 ? 0 : Math.exp(2 * Math.log(data.rate) + Math.log(value) - data.rate * value);
  }
  if (data.family === 'cauchy') return value => 1 / (Math.PI * data.scale * (1 + ((value - data.location) / data.scale) ** 2));
  if (data.family === 'weibull') {
    if (data.shape < 1) throw new RangeError('Una Weibull singular en cero necesita otro marco');
    return value => value < 0 ? 0 : value === 0 ? (data.shape === 1 ? 1 / data.scale : 0) : Math.exp(Math.log(data.shape / data.scale) + (data.shape - 1) * Math.log(value / data.scale) - (value / data.scale) ** data.shape);
  }
  if (data.family === 'poisson-likelihood') return value => value < 0 ? 0 : value === 0 ? (data.total === 0 ? 1 : 0) : Math.exp(-data.count * value + data.total * Math.log(value) - data.logFactorials);
  return value => Math.exp(-0.5 * ((value - data.mean) / data.sd) ** 2) / (data.sd * Math.sqrt(2 * Math.PI));
}

function curvePeak(data) {
  const fn = curveFunction(data);
  const modes = {
    'uniform-cdf': data.domain[1], 'step-cdf': data.domain[1], 'linear-cdf': data.domain[1],
    uniform: data.support?.[0], linear: data.descending ? data.support?.[0] : data.support?.[1],
    exponential: 0, gamma: 1 / data.rate, cauchy: data.location,
    weibull: data.shape === 1 ? 0 : data.scale * ((data.shape - 1) / data.shape) ** (1 / data.shape),
    'poisson-likelihood': data.total / data.count
  };
  const mode = modes[data.family] ?? data.mean;
  const boundedMode = Math.max(data.domain[0], Math.min(data.domain[1], mode));
  return Math.max(fn(boundedMode), fn(data.domain[0]), fn(data.domain[1]));
}

function drawCurve(context, width, height, data, progress) {
  const fn = curveFunction(data);
  const comparison = data.comparison ? curveFunction({...data, ...data.comparison}) : null;
  const peak = Math.max(curvePeak(data), comparison ? curvePeak({...data, ...data.comparison}) : 0);
  const [xMin, xMax] = data.domain;
  const plot = axes(context, width, height, data, xMin, xMax, 0, peak * 1.2);
  const path = (functionValue, lower, upper) => {
    if (data.family === 'step-cdf') {
      let previous = functionValue(lower);
      context.moveTo(plot.xPosition(lower), plot.yPosition(previous));
      data.support.forEach(threshold => {
        if (threshold <= lower || threshold > upper) return;
        context.lineTo(plot.xPosition(threshold), plot.yPosition(previous));
        previous = functionValue(threshold);
        context.moveTo(plot.xPosition(threshold), plot.yPosition(previous));
      });
      context.lineTo(plot.xPosition(upper), plot.yPosition(previous));
      return;
    }
    for (let segment = 0; segment <= 240; segment++) {
      const value = lower + (upper - lower) * segment / 240;
      const horizontal = plot.xPosition(value);
      const vertical = plot.yPosition(functionValue(value));
      if (segment === 0) context.moveTo(horizontal, vertical);
      else context.lineTo(horizontal, vertical);
    }
  };
  if (data.interval) {
    const lower = Math.max(xMin, data.interval[0]);
    const upper = Math.min(xMax, data.interval[1]);
    context.fillStyle = '#d1fae5';
    context.beginPath();
    context.moveTo(plot.xPosition(lower), plot.bottom);
    context.lineTo(plot.xPosition(lower), plot.yPosition(fn(lower)));
    for (let segment = 1; segment <= 240; segment++) {
      const value = lower + (upper - lower) * segment / 240;
      context.lineTo(plot.xPosition(value), plot.yPosition(fn(value)));
    }
    context.lineTo(plot.xPosition(upper), plot.bottom);
    context.closePath();
    context.fill();
  }
  if (data.rectangles) {
    const {lower, upper, count} = data.rectangles;
    const spacing = (upper - lower) / count;
    for (let index = 0; index < count; index++) {
      const left = lower + index * spacing;
      const top = plot.yPosition(fn(left));
      context.fillStyle = '#d1fae5';
      context.fillRect(plot.xPosition(left), top, plot.xPosition(left + spacing) - plot.xPosition(left), plot.bottom - top);
      context.strokeStyle = COLORS[1];
      context.strokeRect(plot.xPosition(left), top, plot.xPosition(left + spacing) - plot.xPosition(left), plot.bottom - top);
    }
  }
  context.strokeStyle = comparison ? COLORS[1] : COLORS[0];
  context.lineWidth = 2;
  context.beginPath();
  path(fn, xMin, xMax);
  context.stroke();
  if (data.family === 'step-cdf') {
    data.support.forEach((threshold, index) => {
      const previous = index === 0 ? 0 : data.cumulative[index - 1];
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(plot.xPosition(threshold), plot.yPosition(previous), 3, 0, 2 * Math.PI);
      context.fill();
      context.stroke();
      context.fillStyle = COLORS[0];
      context.beginPath();
      context.arc(plot.xPosition(threshold), plot.yPosition(data.cumulative[index]), 3, 0, 2 * Math.PI);
      context.fill();
    });
  }
  if (comparison) {
    context.strokeStyle = COLORS[0];
    context.beginPath();
    path(comparison, xMin, xMax);
    context.stroke();
  }
  context.lineWidth = 1;
  if (Number.isFinite(data.marker)) {
    context.strokeStyle = COLORS[2];
    context.setLineDash([4, 3]);
    context.beginPath();
    context.moveTo(plot.xPosition(data.marker), plot.bottom);
    context.lineTo(plot.xPosition(data.marker), plot.yPosition(fn(data.marker)));
    context.stroke();
    context.setLineDash([]);
  }
  const tracer = xMin + progress * (xMax - xMin);
  context.fillStyle = COLORS[3];
  context.beginPath();
  context.arc(plot.xPosition(tracer), plot.yPosition(fn(tracer)), 4, 0, Math.PI * 2);
  context.fill();
}

function drawDots(context, width, height, data, progress) {
  context.font = '12px sans-serif';
  const total = data.groups.reduce((sum, group) => sum + group.count, 0);
  const top = 53;
  const bottom = height - 37;
  const columns = Math.ceil(Math.sqrt(total * (width - 24) / (bottom - top)));
  const rows = Math.ceil(total / columns);
  const cellWidth = (width - 24) / columns;
  const cellHeight = (bottom - top) / rows;
  const radius = Math.min(cellWidth, cellHeight) * 0.34;
  let offset = 0;
  data.groups.forEach((group, groupIndex) => {
    const legendX = 12 + (groupIndex % 2) * (width - 24) / 2;
    const legendY = 14 + Math.floor(groupIndex / 2) * 19;
    context.fillStyle = group.color;
    context.fillRect(legendX, legendY - 8, 8, 8);
    context.fillStyle = '#1f2937';
    shortText(context, `${group.label}: ${group.count}`, legendX + 12, legendY, (width - 24) / 2 - 16);
    context.fillStyle = group.color;
    context.globalAlpha = group.selected ? 1 : 0.2;
    for (let count = 0; count < group.count; count++) {
      const index = offset + count;
      context.beginPath();
      context.arc(12 + (index % columns + 0.5) * cellWidth, top + (Math.floor(index / columns) + 0.5) * cellHeight, radius, 0, 2 * Math.PI);
      context.fill();
    }
    offset += group.count;
  });
  context.globalAlpha = 1;
  const active = Math.min(total - 1, Math.floor(progress * total));
  context.strokeStyle = '#111827';
  context.strokeRect(12 + active % columns * cellWidth, top + Math.floor(active / columns) * cellHeight, cellWidth, cellHeight);
  context.fillStyle = '#374151';
  const selected = data.groups.filter(group => group.selected).reduce((sum, group) => sum + group.count, 0);
  const denominator = data.denominator ?? total;
  shortText(context, `Resaltados: ${selected}/${denominator} = ${number(100 * selected / denominator)} %`, width / 2, height - 21, width - 16, 'center');
  shortText(context, `Un punto = un individuo; total ${total}`, width / 2, height - 5, width - 16, 'center');
}

function drawMatrix(context, width, height, data, progress) {
  context.font = '12px sans-serif';
  context.fillStyle = '#374151';
  shortText(context, `${data.rowTitle} (filas) / ${data.columnTitle} (columnas)`, 12, 15, width - 24);
  shortText(context, data.legend || (data.probability ? 'Celdas: probabilidades; color: magnitud' : 'Celdas: medias en micras; P(celda)=1/9'), 12, 33, width - 24);
  const left = 51;
  const top = 57;
  const right = width - (data.marginals ? 54 : 14);
  const bottom = height - (data.marginals ? 38 : 17);
  const cellWidth = (right - left) / data.columns.length;
  const cellHeight = (bottom - top) / data.rows.length;
  const maximum = Math.max(...data.values.flat());
  const minimum = Math.min(...data.values.flat());
  const absoluteMaximum = Math.max(...data.values.flat().map(value => Math.abs(value)), 0.01);
  const active = Math.min(data.values.flat().length - 1, Math.floor(progress * data.values.flat().length));
  data.columns.forEach((label, index) => shortText(context, label, left + (index + 0.5) * cellWidth, top - 6, cellWidth - 4, 'center'));
  data.rows.forEach((label, row) => {
    context.fillStyle = '#374151';
    shortText(context, label, left - 7, top + (row + 0.5) * cellHeight + 4, left - 10, 'right');
    data.values[row].forEach((value, column) => {
      const index = row * data.columns.length + column;
      const horizontal = left + column * cellWidth;
      const vertical = top + row * cellHeight;
      const strength = data.signed ? Math.abs(value) / absoluteMaximum : data.probability ? value / maximum : (value - minimum) / (maximum - minimum || 1);
      context.fillStyle = data.signed && value < 0 ? `rgba(190, 18, 60, ${0.08 + 0.45 * strength})` : `rgba(3, 105, 161, ${0.08 + 0.45 * strength})`;
      context.fillRect(horizontal, vertical, cellWidth - 2, cellHeight - 2);
      if (data.highlight?.includes(index) || index === active) {
        context.strokeStyle = data.highlight?.includes(index) ? COLORS[2] : COLORS[3];
        context.lineWidth = 2;
        context.strokeRect(horizontal + 1, vertical + 1, cellWidth - 4, cellHeight - 4);
        context.lineWidth = 1;
      }
      context.fillStyle = '#111827';
      shortText(context, number(value), horizontal + cellWidth / 2, vertical + cellHeight / 2 + 4, cellWidth - 8, 'center');
    });
    if (data.marginals) {
      context.fillStyle = '#374151';
      shortText(context, number(data.values[row].reduce((sum, value) => sum + value, 0)), right + 8, top + (row + 0.5) * cellHeight + 4, 42);
    }
  });
  if (data.marginals) {
    context.fillStyle = '#374151';
    data.columns.forEach((_, column) => shortText(context, number(data.values.reduce((sum, row) => sum + row[column], 0)), left + (column + 0.5) * cellWidth, bottom + 17, cellWidth - 4, 'center'));
    shortText(context, 'Σ', right + 8, top - 6, 30);
    shortText(context, 'Σ', left - 7, bottom + 17, 30, 'right');
  }
}

function drawScatter(context, width, height, data, progress) {
  const xValues = data.points.map(point => point[0]);
  const yValues = data.points.map(point => point[1]);
  const xPadding = (Math.max(...xValues) - Math.min(...xValues)) * 0.18 || 1;
  const yPadding = (Math.max(...yValues) - Math.min(...yValues)) * 0.18 || 1;
  const xMin = Math.min(...xValues) - xPadding;
  const xMax = Math.max(...xValues) + xPadding;
  const plot = axes(context, width, height, data, xMin, xMax, Math.min(...yValues) - yPadding, Math.max(...yValues) + yPadding);
  if (data.region) {
    const polygon = (points, fill, stroke) => {
      context.beginPath();
      points.forEach((point, index) => {
        if (index === 0) context.moveTo(plot.xPosition(point[0]), plot.yPosition(point[1]));
        else context.lineTo(plot.xPosition(point[0]), plot.yPosition(point[1]));
      });
      context.closePath();
      context.fillStyle = fill;
      context.fill();
      context.strokeStyle = stroke;
      context.stroke();
    };
    polygon(data.points, '#e0f2fe', COLORS[0]);
    if (data.subset) polygon(data.subset, '#d1fae5', COLORS[1]);
    context.fillStyle = COLORS[3];
    context.beginPath();
    context.arc(plot.xPosition(2 * progress), plot.yPosition(2 * (1 - progress)), 4, 0, 2 * Math.PI);
    context.fill();
    return;
  }
  context.strokeStyle = '#6b7280';
  context.setLineDash([4, 3]);
  context.beginPath();
  context.moveTo(plot.xPosition(data.meanX), plot.top);
  context.lineTo(plot.xPosition(data.meanX), plot.bottom);
  context.moveTo(plot.left, plot.yPosition(data.meanY));
  context.lineTo(plot.right, plot.yPosition(data.meanY));
  context.stroke();
  context.setLineDash([]);
  if (data.line || data.parabola) {
    context.strokeStyle = COLORS[1];
    context.beginPath();
    for (let segment = 0; segment <= 100; segment++) {
      const value = Math.min(...xValues) + (Math.max(...xValues) - Math.min(...xValues)) * segment / 100;
      const response = data.parabola ? value ** 2 : data.line.slope * value + data.line.intercept;
      if (segment === 0) context.moveTo(plot.xPosition(value), plot.yPosition(response));
      else context.lineTo(plot.xPosition(value), plot.yPosition(response));
    }
    context.stroke();
  }
  const active = Math.min(data.points.length - 1, Math.floor(progress * data.points.length));
  data.points.forEach((point, index) => {
    context.fillStyle = index === active ? COLORS[3] : COLORS[0];
    context.beginPath();
    context.arc(plot.xPosition(point[0]), plot.yPosition(point[1]), index === active ? 6 : 4, 0, Math.PI * 2);
    context.fill();
  });
}

const renderers = {bars: drawBars, curve: drawCurve, dots: drawDots, matrix: drawMatrix, scatter: drawScatter};
const mountedPlayers = new WeakMap();

export function mountAnimation(container, animationId, {formatMath} = {}) {
  const animation = findAnimation(animationId);
  const document = container?.ownerDocument;
  if (!document?.createElement || typeof container.replaceChildren !== 'function') throw new TypeError('Se necesita un contenedor DOM');
  mountedPlayers.get(container)?.();
  const view = document.defaultView || globalThis;
  const now = () => view.performance?.now?.() ?? Date.now();
  const hasRaf = typeof view.requestAnimationFrame === 'function' && typeof view.cancelAnimationFrame === 'function';
  const requestFrame = handler => hasRaf ? view.requestAnimationFrame(handler) : view.setTimeout(() => handler(now()), 33);
  const cancelFrame = handle => hasRaf ? view.cancelAnimationFrame(handle) : view.clearTimeout(handle);
  const reducedMotion = view.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const listeners = [];
  const urls = new Set();
  const downloadTimers = new Set();
  let observer = null;
  let frame = null;
  let disposed = false;
  let running = false;
  let index = 0;
  let elapsed = 0;
  let speed = 1;
  let previousTime = null;
  let logicalWidth = 640;
  let logicalHeight = 360;
  let pixelRatio = 1;

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const listen = (target, type, handler) => {
    target.addEventListener(type, handler);
    listeners.push(() => target.removeEventListener(type, handler));
  };
  const icon = name => {
    const node = element('i');
    node.setAttribute('data-lucide', name);
    node.setAttribute('aria-hidden', 'true');
    return node;
  };
  const button = (name, label, handler, text = '') => {
    const node = element('button', text ? 'text-button' : 'icon-button');
    node.type = 'button';
    node.title = label;
    node.setAttribute('aria-label', label);
    node.append(icon(name));
    if (text) node.append(element('span', '', text));
    listen(node, 'click', handler);
    return node;
  };
  const root = element('section', 'animation-player');
  root.setAttribute('aria-label', animation.title);
  root.append(element('h3', '', animation.title));
  const heading = element('h4');
  const stage = element('div', 'animation-stage');
  stage.style.minWidth = '0';
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  canvas.style.aspectRatio = '16 / 9';
  let context = null;
  try { context = canvas.getContext('2d'); } catch { context = null; }
  stage.append(canvas);
  const math = element('div', 'animation-math');
  math.style.overflowX = 'auto';
  const caption = element('p', 'animation-caption');
  caption.setAttribute('aria-live', 'polite');
  caption.setAttribute('aria-atomic', 'true');
  const controls = element('div', 'animation-controls');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Reproducción de la lección');
  const back = button('step-back', 'Escena anterior', () => goTo(index - 1));
  const play = button('play', 'Reproducir', start);
  const pause = button('pause', 'Pausar', stop);
  const next = button('step-forward', 'Escena siguiente', () => goTo(index + 1));
  const reset = button('rotate-ccw', 'Reiniciar', () => { stop(); goTo(0); });
  const seekField = element('label', 'control-field', 'Escena');
  const seek = element('input');
  seek.type = 'range';
  seek.min = '0';
  seek.max = String(animation.steps.length - 1);
  seek.step = '1';
  seek.setAttribute('aria-label', 'Seleccionar escena');
  seekField.append(seek);
  listen(seek, 'input', () => { goTo(Number(seek.value)); syncControls(); });
  const speedField = element('label', 'control-field', 'Velocidad');
  const speedSelect = element('select');
  speedSelect.setAttribute('aria-label', 'Velocidad de reproducción');
  for (const value of [0.5, 1, 1.5, 2]) {
    const option = element('option', '', `${number(value)}×`);
    option.value = String(value);
    speedSelect.append(option);
  }
  speedSelect.value = '1';
  speedField.append(speedSelect);
  listen(speedSelect, 'change', () => {
    const requestedSpeed = Number(speedSelect.value);
    if (![0.5, 1, 1.5, 2].includes(requestedSpeed)) { speedSelect.value = String(speed); return; }
    if (running) advance(now());
    speed = requestedSpeed;
    previousTime = running ? now() : null;
    syncControls();
    draw();
  });
  const position = element('output');
  position.setAttribute('aria-label', 'Escena actual y total');
  const clock = element('output');
  clock.setAttribute('aria-label', 'Tiempo de la lección');
  controls.append(back, play, pause, next, reset, seekField, speedField, position, clock);
  const transcript = element('details', 'animation-transcript');
  transcript.append(element('summary', '', 'Transcripción completa'));
  const transcriptList = element('ol');
  animation.steps.forEach(step => {
    const item = element('li');
    item.append(element('h4', '', step.title), element('p', '', step.caption));
    transcriptList.append(item);
  });
  transcript.append(transcriptList);
  const downloads = element('div', 'animation-downloads');
  const vttDownload = button('download', 'Descargar subtítulos WebVTT', () => download(buildVtt(animationId), 'vtt', 'text/vtt;charset=utf-8'), 'Subtítulos .vtt');
  const txtDownload = button('file-text', 'Descargar guion de narración', () => download(animation.steps.map(step => step.caption).join('\n\n'), 'txt', 'text/plain;charset=utf-8'), 'Guion .txt');
  vttDownload.disabled = txtDownload.disabled = !view.URL?.createObjectURL || !view.Blob;
  downloads.append(vttDownload, txtDownload);
  root.append(heading, stage, math, caption, controls, transcript, downloads);
  container.replaceChildren(root);

  function download(text, extension, mime) {
    if (disposed || !view.URL?.createObjectURL || !view.Blob) return;
    const url = view.URL.createObjectURL(new view.Blob([text], {type: mime}));
    urls.add(url);
    const link = element('a');
    link.href = url;
    link.download = `${animationId}.${extension}`;
    link.hidden = true;
    root.append(link);
    link.click();
    link.remove();
    const timer = view.setTimeout(() => {
      view.URL.revokeObjectURL(url);
      urls.delete(url);
      downloadTimers.delete(timer);
    }, 0);
    downloadTimers.add(timer);
  }

  function syncControls() {
    back.disabled = index === 0;
    next.disabled = index === animation.steps.length - 1;
    play.disabled = running;
    pause.disabled = !running;
    seek.value = String(index);
    seek.setAttribute('aria-valuetext', `${index + 1} de ${animation.steps.length}: ${animation.steps[index].title}`);
    position.textContent = `Escena ${index + 1} de ${animation.steps.length}`;
    const totalElapsed = animation.steps.slice(0, index).reduce((sum, step) => sum + step.duration, 0) + elapsed;
    const clockText = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
    clock.textContent = `${clockText(totalElapsed)} / ${clockText(animationDuration(animationId))}`;
  }

  function syncScene() {
    const step = animation.steps[index];
    heading.textContent = step.title;
    caption.textContent = step.caption;
    canvas.textContent = step.caption;
    canvas.setAttribute('aria-label', `${step.title}. ${step.caption}`);
    math.hidden = !step.tex;
    math.textContent = step.tex || '';
    if (step.tex && typeof formatMath === 'function') {
      try {
        const html = formatMath(step.tex);
        if (typeof html === 'string') math.innerHTML = html;
      } catch { math.textContent = step.tex; }
    }
  }

  function draw() {
    if (disposed || !context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, logicalWidth, logicalHeight);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, logicalWidth, logicalHeight);
    context.textBaseline = 'alphabetic';
    context.textAlign = 'left';
    const step = animation.steps[index];
    renderers[step.kind](context, logicalWidth, logicalHeight, step.data, reducedMotion ? 0 : elapsed / step.duration);
  }

  function resize(entries) {
    if (disposed) return;
    const observedWidth = entries?.[0]?.contentRect?.width ?? stage.getBoundingClientRect().width;
    const width = Math.max(240, Math.min(1200, Math.round(observedWidth || logicalWidth)));
    const ratio = Math.max(1, Math.min(3, view.devicePixelRatio || 1));
    const height = width * 9 / 16;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    logicalWidth = width;
    logicalHeight = height;
    pixelRatio = ratio;
    draw();
  }

  function goTo(requestedIndex) {
    if (disposed || !Number.isInteger(requestedIndex) || requestedIndex < 0 || requestedIndex >= animation.steps.length) return;
    index = requestedIndex;
    elapsed = 0;
    previousTime = running ? now() : null;
    syncScene();
    syncControls();
    draw();
  }

  function advance(time) {
    if (!running) return;
    elapsed += Math.max(0, time - previousTime) / 1000 * speed;
    previousTime = time;
    const oldIndex = index;
    while (elapsed >= animation.steps[index].duration) {
      if (index === animation.steps.length - 1) {
        elapsed = animation.steps[index].duration;
        running = false;
        if (frame !== null) cancelFrame(frame);
        frame = null;
        previousTime = null;
        break;
      }
      elapsed -= animation.steps[index].duration;
      index++;
    }
    if (index !== oldIndex) syncScene();
  }

  function tick(time) {
    frame = null;
    if (disposed || !running) return;
    if (document.hidden || document.visibilityState === 'hidden' || root.closest?.('[hidden]')) { stop(); return; }
    const oldIndex = index;
    advance(time);
    syncControls();
    if (!reducedMotion || index !== oldIndex || !running) draw();
    if (running) frame = requestFrame(tick);
  }

  function start() {
    if (disposed || running || document.hidden || document.visibilityState === 'hidden' || root.closest?.('[hidden]')) return;
    if (index === animation.steps.length - 1 && elapsed >= animation.steps[index].duration) goTo(0);
    running = true;
    previousTime = now();
    syncControls();
    frame = requestFrame(tick);
  }

  function stop() {
    if (disposed) return;
    if (running && !document.hidden && document.visibilityState !== 'hidden') advance(now());
    running = false;
    previousTime = null;
    if (frame !== null) cancelFrame(frame);
    frame = null;
    syncControls();
    draw();
  }

  listen(document, 'visibilitychange', () => { if (document.hidden || document.visibilityState === 'hidden') stop(); });
  if (typeof view.ResizeObserver === 'function') {
    observer = new view.ResizeObserver(resize);
    observer.observe(stage);
  } else listen(view, 'resize', resize);
  syncScene();
  syncControls();
  resize();

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    running = false;
    if (frame !== null) cancelFrame(frame);
    frame = null;
    for (const timer of downloadTimers) view.clearTimeout(timer);
    downloadTimers.clear();
    for (const url of urls) view.URL.revokeObjectURL(url);
    urls.clear();
    observer?.disconnect();
    for (const removeListener of listeners) removeListener();
    root.remove();
    if (mountedPlayers.get(container) === cleanup) mountedPlayers.delete(container);
  };
  mountedPlayers.set(container, cleanup);
  return cleanup;
}