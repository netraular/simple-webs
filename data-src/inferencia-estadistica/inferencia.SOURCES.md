# Inferencia estadística: fuentes y alcance

Fecha de revisión: 2026-11-05.

El módulo `pages/inferencia/course.mjs` contiene material didáctico original en español para una persona graduada en biología: **36 lecciones, cinco unidades y 40 entradas de glosario**. Las explicaciones, ejemplos y comprobaciones se han redactado para este curso; no son transcripciones de los documentos.

## Privacidad y método

Los ocho PDF originales se encuentran únicamente en la carpeta local privada `Inferencia estadística`. Son archivos no rastreados. No se añaden, copian, enlazan para descarga ni publican. Los nombres siguientes identifican procedencia, no archivos distribuidos con el curso. No se reproducen fragmentos extensos ni figuras originales.

Se utilizó `pypdf` con Python 3 para recorrer todas las páginas de los cuatro documentos teóricos y extraer sus encabezados; se contrastaron además definiciones, convenciones y secciones avanzadas. Se revisaron los tres juegos de ejercicios para asociar métodos y el enunciado de la PEC para identificar competencias, no para resolver la evaluación. No se generaron extracciones ni cachés en el repositorio. Las páginas que se mencionan son posiciones dentro del PDF, no la numeración impresa del manual.

La fuente de cada lección queda registrada en su objeto `source`. El bloque `coverage` permite consultar el alcance por documento. Las claves de visualización y animación se limitan al contrato del aula: no implican que este módulo implemente motores gráficos nuevos. Del mismo modo, `exerciseTypes` asocia competencias a los tipos admitidos, no transcribe los enunciados privados ni garantiza un generador específico para cada familia avanzada.

## Teoría revisada

| Documento privado | Extensión | Cobertura original en el curso |
| --- | --- | --- |
| `FundamentosInferencia_Tema1.pdf` | 13 páginas, encabezados revisados en todo el documento | Experimentos, sucesos, conjuntos observables, función de probabilidad y axiomas; propiedades, condicionamiento, independencia e incompatibilidad; producto, probabilidad total, Bayes; experimentos múltiples; permutaciones, variaciones, variaciones con repetición, combinaciones y permutaciones con repetición; frecuencia relativa y simulación; eficacia diagnóstica. |
| `FundamentosInferencia_Tema2.pdf` | 24 páginas, encabezados revisados en todo el documento | Representación numérica, variable y definición formal; CDF y propiedades; clasificación; indicadores y masas; densidades y probabilidades de intervalos; parámetros, esperanzas, linealidad y producto; varianza; momentos y existencia. Los métodos del caso de dados se reformulan con ejemplos distintos. |
| `FundamentosInferencia_Tema3.pdf` | 22 páginas, encabezados revisados en todo el documento | Bernoulli, binomial, Poisson, uniforme discreta, hipergeométrica, geométrica/Pascal y binomial negativa; uniforme continua y Montecarlo por cuantiles; exponencial, normal y CDF, gamma, Cauchy, Weibull; tablas y operaciones en R/Python; familia exponencial, ejemplos Poisson/binomial y dos normales uniparamétricas; introducción a GLM y estimación. |
| `FundamentosInferencia_Tema4.pdf` | 19 páginas, encabezados revisados en todo el documento | Vectores, CDF y masas conjuntas; multinomial y trinomial; marginales y condicionales discretas; densidades conjuntas, marginales y condicionales; normal bivariante; independencia; vector de medias, covarianza, correlación y matrices; producto de esperanzas, combinaciones lineales, momentos multinomiales e incorrelación. |

Además del recorrido de encabezados, se contrastaron especialmente: Tema 1, páginas 3, 6 y 9; Tema 2, páginas 4, 14, 15 y 23; Tema 3, páginas 10, 13, 14 y 17 a 22; Tema 4, páginas 10, 12, 17 y 19. Esto permite distinguir contenidos suministrados de extensiones pedagógicas sin afirmar que todos los ejemplos originales se hayan auditado numéricamente.

## Mapa de las 36 lecciones

Los identificadores son ASCII y únicos. La numeración de unidades empieza en cero para el puente y respeta los cuatro temas teóricos.

| Unidad | Lección | Secciones de referencia o condición de apoyo |
| --- | --- | --- |
| Puente | `proporciones` | Original: proporciones, porcentajes, tasas, unidades y magnitudes. |
| Puente | `algebra` | Original: despejes, normalización, raíces y logaritmos. |
| Puente | `funciones` | Original: funciones, tramos, soporte, intervalos y sumatorios. |
| Puente | `calculo` | Original: derivadas, primitivas e integrales, apoyo a 2.7. |
| Puente | `regiones-matrices` | Original: integrales dobles, vectores y matrices, apoyo a 4.6 y 4.8. |
| Tema 1 | `sucesos` | 1.1, 1.2 y 1.4. |
| Tema 1 | `axiomas` | 1.2 a 1.5 y 1.10, incluida simulación y frecuencia. |
| Tema 1 | `combinatoria` | 1.8 y 1.9, incluidas las cinco reglas de recuento. |
| Tema 1 | `condicionada` | 1.6, 1.6.1 y regla del producto de 1.7. |
| Tema 1 | `independencia-sucesos` | 1.6.2 y 1.6.3; independencia mutua como ampliación explícita. |
| Tema 1 | `bayes-diagnostico` | 1.7.1, 1.7.2 y 1.11. |
| Tema 2 | `variable-cdf` | 2.1 a 2.5 y 2.14, incluida observabilidad y clasificación. |
| Tema 2 | `masa` | 2.6 a 2.6.3; método de 2.15 con ejemplos nuevos. |
| Tema 2 | `densidad` | 2.7 a 2.7.2.1. |
| Tema 2 | `esperanza` | 2.8 a 2.11.2 y 2.15.8 a 2.15.11, incluidas esperanzas no finitas. |
| Tema 2 | `varianza` | 2.12, 2.12.1 y 2.15.12. |
| Tema 2 | `momentos-transformaciones` | 2.13; estandarización y cambio de variable como ampliación explícita. |
| Tema 3 | `bernoulli-binomial` | 3.1.1 y 3.1.2. |
| Tema 3 | `poisson` | 3.1.3; comparación binomial/Poisson de la práctica 2.6. |
| Tema 3 | `hipergeometrica` | 3.1.5. |
| Tema 3 | `geometrica-negativa` | 3.1.6 y 3.1.7. |
| Tema 3 | `uniforme-montecarlo` | 3.1.4 y 3.2.1, incluida generación binomial por inversión. |
| Tema 3 | `exponencial` | 3.2.2. |
| Tema 3 | `normal` | 3.2.3 y 3.2.4. |
| Tema 3 | `gamma` | 3.2.5. |
| Tema 3 | `cauchy-weibull` | 3.2.6 y 3.2.7; interpretación del riesgo como ampliación explícita. |
| Tema 3 | `calculo-modelos` | Tablas 3.1.8 y 3.2.8 y operaciones de 3.3. |
| Tema 3 | `familia-exponencial` | 3.4 a 3.4.5, incluidos GLM y estimación introductoria realmente suministrados. |
| Tema 4 | `conjunta-discreta` | 4.1 y 4.2. |
| Tema 4 | `multinomial` | 4.3 y 4.8.8. |
| Tema 4 | `marginales` | 4.4 y 4.6.2. |
| Tema 4 | `conjunta-condicional` | 4.5 y 4.6 a 4.6.3. |
| Tema 4 | `normal-bivariante` | 4.6.4 y 4.6.5. |
| Tema 4 | `independencia-variables` | 4.7 a 4.7.3 y 4.8.6. |
| Tema 4 | `covarianza-matrices` | 4.8 a 4.8.5.1. |
| Tema 4 | `combinaciones-incorrelacion` | 4.8.6 a 4.8.9. |

## Asociaciones de práctica

### Unidad 1: probabilidad

`Ejercicios_Unidad_1-Soluciones.pdf`, 7 páginas: sus problemas permiten practicar operaciones con sucesos, solapamientos, condicionamiento y valores predictivos con distintas prevalencias. Las lecciones `sucesos`, `axiomas`, `condicionada` y `bayes-diagnostico` preparan esas competencias. Las cifras y situaciones del curso son nuevas. Las soluciones originales no se exportan.

### Unidad 2: variables y distribuciones

`Ejercicios_Unidad_2-Soluciones.pdf`, 25 páginas:

| Ejercicios | Competencias | Lecciones relacionadas |
| --- | --- | --- |
| 2.1 y 2.2 | Agrupar resultados, construir/normalizar masas, esperanza y varianza. | `variable-cdf`, `masa`, `esperanza`, `varianza`. |
| 2.3 | Densidad válida, acumulada, intervalos y resúmenes continuos. | `calculo`, `densidad`, `esperanza`, `exponencial`. |
| 2.4 | Recuento binomial y sus colas. | `bernoulli-binomial`, `calculo-modelos`. |
| 2.5 y 2.6 | Poisson, exposición y comparación exacta/aproximada con binomial. | `poisson`, `bernoulli-binomial`. |
| 2.7 | Tipificación y cuantiles normales. | `normal`. |
| 2.8 | Umbrales normales, condicionamiento y Bayes. | `normal`, `bayes-diagnostico`. |
| 2.9 | Selección sin reemplazo. | `hipergeometrica`, `combinatoria`. |

### U3: multivariantes, correspondiente al Tema 4

`Ejercicios_U3-Distribuciones_multivariantes-SOLUCIONES.pdf`, 18 páginas. **U3 no se asocia al Tema 3 de distribuciones notables.**

| Ejercicios | Competencias | Lecciones relacionadas |
| --- | --- | --- |
| 1 y 2 | Masa y acumulada conjunta sobre pares discretos. | `conjunta-discreta`, `multinomial`. |
| 3 | Marginal y comparación con binomial. | `marginales`, `multinomial`. |
| 4 y 5 | Regiones, normalización continua, marginales y condicionales. | `regiones-matrices`, `marginales`, `conjunta-condicional`. |
| 6 y 7 | Covarianza, interpretación e identidades de combinaciones. | `covarianza-matrices`, `combinaciones-incorrelacion`. |
| 8 | Multinomial y momentos para varias categorías. | `multinomial`, `combinaciones-incorrelacion`. |

### PEC actual: límite de uso

`UOC-MU-IE-2026-27-S1-PEC1-enunciado-1.pdf`, 2 páginas, es trabajo evaluado vigente. Se consultó únicamente para reconocer competencias de sucesos/condicionamiento, probabilidad total/Bayes con recuentos y normal bivariante. El curso no contiene su enunciado, sus parámetros, resultados numéricos, respuestas por apartado ni solución directa. Se utilizan analogías nuevas de semillas, señales, recursos y medidas ficticias. El objetivo es preparar razonamiento transferible, no entregar respuestas evaluables.

## Convenciones y límites didácticos

- La normal se escribe con media y **varianza**; la tipificación y los argumentos habituales de software usan **desviación típica**.
- La geométrica del temario cuenta **fracasos antes del primer éxito**, con soporte desde cero. El laboratorio arranca con binomial negativa de un éxito, equivalente a esa convención. El ejercicio llamado geométrica y la opción de laboratorio geométrica cuentan **ensayos**, desde uno, y lo indican explícitamente; el generador binomial negativa cuenta fracasos. El texto explica la traslación de una unidad.
- La exponencial y la gamma del temario usan **escala** positiva; la tasa exponencial es su inversa. Los controles y ejercicios exponenciales pueden usar tasa, indicada explícitamente; gamma usa forma y escala. La forma gamma se escribe `k` en el curso para no confundir el `p` del documento con una probabilidad.
- La Weibull usa escala `α` y forma `β`. Cauchy no recibe una esperanza ficticia por simetría.
- Una densidad no es una probabilidad puntual; condicionar en un valor continuo se define por densidades donde la marginal es positiva.
- Se distinguen independencia, incompatibilidad e incorrelación; se menciona la excepción de normalidad **conjunta**, no solo marginal.
- El puente, la estandarización de momentos, el cambio de variable, la independencia mutua y la interpretación del riesgo se identifican como apoyos o ampliaciones, no como encabezados adicionales de los PDF.
- La introducción a familia exponencial, GLM y estimación sí está en 3.4. No se atribuyen al material un curso de contrastes, intervalos de confianza, teorema central del límite ni distribuciones chi-cuadrado, Student o Fisher.
- Todos los contextos y números biológicos son ilustrativos, no parámetros empíricos ni recomendaciones clínicas. Las duraciones son estimaciones de lectura y trabajo.

## Comprobación del artefacto

Se ejecutaron `node --check` y una importación con aserciones en Node: esquema completo, 36 identificadores de lección únicos, respuestas en rango, tipos de ejercicios y claves visuales permitidas, contenido sustancial y referencias de procedencia. Una segunda comprobación verificó HTML equilibrado y restringido a etiquetas de texto, la correspondencia de las 36 lecciones con este mapa, cálculos numéricos seleccionados y ausencia de enlaces de publicación de PDF. El editor no informó de errores en los dos archivos.

El módulo contiene 144 párrafos explicativos, además de los 36 ejemplos; explicaciones y ejemplos suman 9.274 palabras. Las duraciones orientativas suman 1.095 minutos. La integración añade 29 tipos de ejercicios, 28 lecturas animadas y 14 laboratorios con un explorador de 16 distribuciones. Se han verificado las fórmulas con KaTeX real, cálculos con jStat, el montaje de todas las vistas con DOM simulado, progreso, recursos y exportación de guiones. No se publicaron documentos ni se abrieron navegadores o servidores; el diseño visual en navegador sigue sin verificar. Las pruebas se ejecutan con `npm test` en este directorio.
