# Salarios en Europa

Desde la raíz, `node data-src/salarios-europa/build-salarios.mjs` (Node.js y
`curl`) regenera `pages/data/salarios-europa.js`. La página no llama a las API
en tiempo de ejecución y se puede abrir directamente como archivo local.

## Mapa

`node data-src/salarios-europa/build-mapa.mjs` (Node.js, `curl` y `npx`)
regenera el SVG local en `pages/data/salarios-europa-mapa.js` con fronteras
[Natural Earth 1:50m](https://www.naturalearthdata.com/about/terms-of-use/)
v5.1.2, de dominio público, y Mapshaper. La vista usa una proyección
azimutal equivalente de Lambert centrada en Europa y marcadores para los
países demasiado pequeños para seleccionar su área a esta escala.

## Salario mínimo

- [Eurostat, `earn_mw_cur`](https://ec.europa.eu/eurostat/databrowser/view/earn_mw_cur/default/table): salario mínimo nacional bruto mensual en euros, foto del 1 de julio de 2026. La [metodología de Eurostat](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Minimum_wage_statistics) ajusta las pagas extra a 12 mensualidades y explica las ausencias de mínimo nacional. El equivalente anual de la web es 12 veces el mensual, no la suma de mínimos vigentes durante el año.
- Reino Unido: [Low Pay Commission](https://www.gov.uk/government/publications/the-national-minimum-wage-in-2026/the-national-minimum-wage-in-2026), 12,71 GBP/h desde abril de 2026 para edades de 21 años o más. Equivalencia mensual de 37,5 h/semana durante 52 semanas divididas entre 12, con [tipo BCE de 0,85973 GBP/EUR el 1 de julio de 2026](https://data.ecb.europa.eu/data/datasets/EXR/EXR.D.GBP.EUR.SP00.A).
- Un dato ausente no equivale a un mínimo de cero. Sin mínimo nacional pueden existir mínimos por sector o territorio.

## Distribución salarial

- [Eurostat, `earn_ses22_adeci`](https://ec.europa.eu/eurostat/databrowser/view/earn_ses22_adeci/default/table): P10, P50 (mediana) y P90 de salario bruto anual, EUR, jornada completa, 2022. La [encuesta SES](https://ec.europa.eu/eurostat/web/microdata/collections-research/structure-of-earnings-survey) cubre los sectores B–S salvo O (excluye agricultura y administración pública) y, en general, empresas de al menos 10 empleados. No se usa el campo `S2`: contiene dos tercios de la mediana, no un percentil observado.
- Reino Unido: [ONS ASHE 2022 revisada](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/allemployeesashetable1), tabla 1.7a, hoja `Full-Time`, fila `All Employees`. Son puestos de trabajo a jornada completa sobre los que aplica la encuesta, no toda la población. Se usan todos los percentiles publicados de P10 a P90 y el [cambio medio BCE de 2022](https://data.ecb.europa.eu/data/datasets/EXR/EXR.A.GBP.EUR.SP00.A), 0,8527608560311 GBP/EUR.
- La proporción de cada tramo se calcula restando los porcentajes acumulados de sus dos límites. Entre dos cuantiles se interpola linealmente en euros. Por debajo de P10 se extrapola con una ley de potencia anclada en cero, ajustada a los dos primeros cortes; por encima de P90 se usa una cola de Pareto ajustada a los dos últimos cortes. Esto da una estimación puntual comparable, con más incertidumbre en los extremos. Los tramos suman el 100 % antes del redondeo.

## Coste de vida y poder adquisitivo

- [Eurostat, `prc_ppp_ind_1`](https://ec.europa.eu/eurostat/databrowser/view/prc_ppp_ind_1/default/table), categoría `E011` (consumo final de los hogares), indicador `PLI_EU27_2020`. Un índice de 120 en 2025 significa que la misma cesta cuesta aproximadamente un 20 % más que la referencia UE-27. No mide la inflación ni estima gastos por ciudad o tipo de hogar.
- La mediana ajustada se expresa en estándares de poder adquisitivo (EPA): mediana bruta de 2022 dividida por el índice de precios de 2022 y multiplicada por 100. No se descuentan impuestos. Si falta uno de los dos datos no se estima el resultado.