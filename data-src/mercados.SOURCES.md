# `mercados.json` — fuentes de datos

Generado el **2026-09-24** con `build-mercados.mjs` (en este mismo directorio).
Series **mensuales** de rentabilidad a largo plazo del S&P 500 y de los activos
con los que se le compara, desde **enero de 1871 hasta agosto de 2026** (1.868
meses). Lo consume `pages/sp500-rendimientos.html`.

> Doc en castellano, como el script que documenta y como la página; el resto de
> `*.SOURCES.md` del repo van en catalán porque describen datos catalanes.

**Ningún valor está inventado ni interpolado.** Donde la fuente no publica, el
mes queda a `null` y la página recorta el rango. Las **dos únicas series
calculadas** son la rentabilidad total del S&P 500 antes de 1988 y la del bono a
10 años; ambas llevan su fórmula escrita más abajo y su comprobación numérica.

---

## Resumen

| Serie | Qué es | Fuente | Desde | Nominal %/año |
|---|---|---|---|---|
| `sp500_tr` | S&P 500 con dividendos reinvertidos | Shiller + S&P 500 TR | 1871-01 | 9,38 |
| `sp500_px` | S&P 500 solo precio | Shiller (Yale) | 1871-01 | 4,91 |
| `bonos10` | Bono del Tesoro EE. UU. 10 años, vencimiento constante | Shiller / FRED `GS10` | 1871-01 | 4,46 |
| `letras3m` | Letras del Tesoro EE. UU. 3 meses ("efectivo") | FRED `TB3MS` | 1934-01 | 3,47 |
| `oro` | Oro, dólares por onza troy | LBMA / precio oficial | 1871-01 | 3,57 |
| `vivienda_us` | Vivienda en EE. UU., Case-Shiller nacional | FRED `CSUSHPINSA` | 1987-01 | 4,31 |
| `mundo_exus` | Desarrollados sin EE. UU., con dividendos (ETF MSCI EAFE) | Yahoo `EFA` | 2001-08 | 6,70 |
| `nikkei` | Nikkei 225, solo precio | Yahoo `^N225` | 1985-01 | 4,20 |
| `ibex` | IBEX 35, solo precio | Yahoo `^IBEX` | 1993-07 | 5,92 |
| `bitcoin` | Bitcoin en dólares | Yahoo `BTC-USD` | 2014-09 | 56,18 |
| `ipc` | IPC de EE. UU. (CPI-U, sin desestacionalizar) | Shiller / FRED `CPIAUCNS` | 1871-01 | 2,14 |
| `ipc_es` | IPC armonizado de España | FRED/Eurostat `CP0000ESM086NEST` | 1996-01 | — |
| `eurusd` | Dólares por euro | FRED `DEXUSEU` | 1999-01 | — |

Los índices salen en **base 100 en su primer mes con dato**; lo único que
significan es la variación relativa, no un nivel comparable entre series.

---

## A) Núcleo histórico — Robert Shiller (Yale)

`https://raw.githubusercontent.com/datasets/s-and-p-500/main/data/data.csv`

Copia en CSV, mantenida por el proyecto *datasets/s-and-p-500*, de la hoja
`ie_data.xls` que Robert Shiller publica junto a *Irrational Exuberance*
(<https://shillerdata.com/>). De ahí salen cuatro columnas:

- **Precio del S&P 500**: media mensual de los cierres diarios (no el cierre de
  fin de mes). Antes de 1957 es la reconstrucción histórica de Cowles enlazada
  con el índice actual. Cubre hasta 2026-08.
- **Dividendo**: dividendo anualizado por unidad de índice, interpolado a mes
  desde el dato trimestral del S&P. **La copia solo llega a 2023-06** (ver el
  empalme más abajo).
- **IPC** y **tipo del bono a largo plazo**: la copia solo llega a 2023-09 y sus
  últimos meses son provisionales, así que se sustituyen por las series
  oficiales de FRED donde existen.

### Empalmes y su comprobación

El script (`comprueba()`) verifica que las columnas de Shiller y las series de
FRED **coinciden** en todo el solapamiento antes de empalmarlas. Al cierre de
esta generación:

- IPC: 1.326 meses solapados, desviación máxima **0,17** (2023-03) — un único
  mes por encima de 0,05.
- Bono a 10 años: 843 meses solapados, desviación máxima **0,43** (2019-07: la
  copia dice 1,63 y FRED 2,06, errata de la copia).

En ambos casos, donde hay dato de FRED manda FRED. Si en una regeneración futura
aparecieran más discrepancias, el script **aborta** en vez de publicar.

---

## B) Series calculadas

### 1. `sp500_tr` — rentabilidad total del S&P 500

Cada mes se cobra 1/12 del dividendo anualizado del mes anterior y se reinvierte
al precio del mes:

```
TR_t = TR_{t-1} × (P_t + D_{t-1}/12) / P_{t-1}
```

Es el método estándar sobre los datos de Shiller, el mismo que usa su propia
hoja para la *real total return price*. Se aplica **hasta 2023-06**, último mes
con dividendo publicado en la copia; a partir de **2023-07** se encadena la
variación mensual del **índice oficial S&P 500 Total Return** (`^SP500TR`, vía
Yahoo Finance), que ya lleva los dividendos dentro.

**Contraste del método**: en el tramo 1988-01 → 2023-06, donde conviven las dos
fuentes, el cálculo sobre datos de Shiller da **10,67 %/año** y el índice oficial
**10,74 %/año**: 0,07 puntos de diferencia en 35 años. El script lo recalcula e
imprime en cada ejecución.

Dos avisos que la página repite:

- El precio de Shiller es **media mensual**, no cierre de fin de mes; el índice
  oficial que se encadena desde 2023-07 sí es cierre. Suaviza algo los mínimos y
  máximos mensuales, y es irrelevante para horizontes de años.
- La serie es **bruta**: sin comisiones, sin impuestos y sin retención en origen
  sobre los dividendos. La página deja restar un coste anual con un control.

### 2. `bonos10` — bono del Tesoro a 10 años

Cartera de **vencimiento constante**: cada mes se compra a la par un bono nuevo
con cupón igual a la TIR de mercado `y₀` y un mes después se vende, ya con 9 años
y 11 meses de vida, descontando sus flujos a la TIR nueva `y₁`:

```
valor = Σ(i=1..10) y₀ / (1+y₁)^(i − 1/12) + 1 / (1+y₁)^(10 − 1/12)
retorno del mes = valor − 1
```

Es el mismo criterio que usa Damodaran (NYU Stern) para su serie de *T.Bonds*.
Recoge el cupón **y** la pérdida o ganancia de precio cuando se mueven los tipos,
que es justo lo que no se ve si uno mira solo la TIR. El tipo de referencia es
`GS10` desde 1953-04 y, antes, la recopilación de Shiller de tipos de la deuda
pública a largo plazo (más aproximada: no es exactamente un 10 años).

### 3. `letras3m` — efectivo

Tipo anual de la letra a 3 meses (`TB3MS`) devengado mes a mes (`/12`). Es la
referencia de "dejarlo en el banco" — la que suele desaparecer de estas
comparaciones.

---

## C) Resto de activos

| Serie | URL | Notas |
|---|---|---|
| `oro` | `https://raw.githubusercontent.com/datasets/gold-prices/main/data/monthly.csv` | Precio en USD/onza troy. **Hasta 1968 no es un mercado libre**: es el precio fijado por el patrón oro (20,67 $ y 35 $ desde 1934). Leerlo como rentabilidad de mercado en ese tramo no tiene sentido y la página lo advierte. |
| `vivienda_us` | FRED `CSUSHPINSA` | Case-Shiller nacional, ventas repetidas, sin desestacionalizar. Es **solo precio**: no incluye alquileres cobrados ni descuenta IBI, reformas, seguros ni derramas. No es comparable con un índice con dividendos. |
| `mundo_exus` | Yahoo `EFA` | ETF iShares MSCI EAFE (Europa, Australasia y Extremo Oriente) en dólares, **cierre ajustado**, o sea con dividendos reinvertidos y **neto de un 0,33 % anual de comisión** del propio fondo. Empieza en 2001-08. Se usa como contrapeso a "la bolsa sube": es la bolsa desarrollada que no es EE. UU. |
| `nikkei` | Yahoo `^N225` | **Solo precio, sin dividendos**, en yenes. Está para el caso que rompe la regla: el máximo de diciembre de 1989 no se recuperó hasta 2024. |
| `ibex` | Yahoo `^IBEX` | **Solo precio, sin dividendos**, en euros, desde 1993-07. Comparar el IBEX 35 con un S&P 500 *con* dividendos es tramposo: la página lo enfrenta al S&P 500 sin dividendos y lo dice. El IBEX con dividendos (IBEX 35 TR) no está disponible en fuentes abiertas. |
| `bitcoin` | Yahoo `BTC-USD` | Desde 2014-09, que es donde empieza la serie de Yahoo. Doce años no dicen nada sobre el largo plazo, y así se presenta. |
| `eurusd` | FRED `DEXUSEU` | Dólares por euro, último día hábil de cada mes. Permite ver el S&P 500 **en euros**, que es lo que le pasa de verdad a alguien que invierte desde España. No hay euro antes de 1999. |
| `ipc_es` | FRED/Eurostat `CP0000ESM086NEST` | IPC armonizado de España, mensual desde 1996. Para el poder adquisitivo real en euros. |

Todas las series de Yahoo se piden a
`https://query1.finance.yahoo.com/v8/finance/chart/<símbolo>?period1=0&period2=<ahora>&interval=1mo`.
Dos trampas de esa API, las dos resueltas en el script:

1. Sin `period1/period2` explícitos devuelve datos **trimestrales** aunque se pida
   `interval=1mo`.
2. La marca de tiempo de cada vela es el **inicio del mes en la hora local del
   mercado**, no en UTC: el 1 de diciembre de 1989 en Tokio es el 30 de noviembre
   a las 15:00 UTC. Leer el mes directamente con `toISOString()` desplazaba el
   Nikkei y el IBEX un mes hacia atrás — el máximo japonés de diciembre de 1989
   caía en noviembre. El script suma 14 horas antes de mirar el mes, que deja
   bien cualquier huso entre UTC−11 y UTC+14.

---

## D) Contraste con fuentes independientes

Las series calculadas se han comparado con dos referencias que no comparten
código con este repositorio. Lo que sigue son las cifras de esta generación.

### Damodaran (NYU Stern), *Annual Returns on Stock, T.Bonds and T.Bills*

Media geométrica nominal, **1928–2025** (aquí, de diciembre de 1927 a diciembre
de 2025):

| Serie | Este repositorio | Damodaran | Diferencia |
|---|---|---|---|
| S&P 500 con dividendos | 10,14 % | 10,02 % | +0,12 pp |
| Bono a 10 años | 4,64 % | 4,54 % | +0,10 pp |
| Oro | 5,60 % | 5,61 % | −0,01 pp |
| S&P 500 **real** | 6,90 % | 6,78 % | +0,12 pp |
| Bono a 10 años **real** | 1,56 % | 1,46 % | +0,10 pp |
| Oro **real** | 2,49 % | 2,50 % | −0,01 pp |

Las letras a 3 meses no son comparables en este cuadro porque aquí la serie
empieza en 1934 (3,47 % hasta 2025) y la suya en 1928 (3,37 %).

La diferencia sistemática de una décima en las series ligadas al S&P y al bono
tiene explicación conocida: Damodaran encadena **rentabilidades de año natural
sobre cierres de fin de año**, mientras que aquí el nivel del índice es la
**media mensual** de Shiller, y las series de dividendos y de IPC que usa cada
uno no son idénticas. Una décima en 98 años es ruido de convención, no un error
de método; lo que importa es que ninguna serie se desvía en el orden de
magnitud.

### Recálculo independiente sobre la hoja original de Shiller

Ventanas móviles mensuales de rentabilidad **real** total del S&P 500,
1871 → 2026, calculadas por separado a partir de `ie_data.xls` (la hoja de
Shiller, no la copia en CSV que usa este script):

| Plazo | Ventanas | % en positivo | Peor (inicio) | Mediana |
|---|---|---|---|---|
| 10 años | 1.747 | 88,95 % | −5,93 % (1999-03) | +7,04 % |
| 15 años | 1.687 | 95,61 % | −2,14 % (1905-12) | +6,91 % |
| 20 años | 1.627 | 99,94 % | −0,22 % (1901-06) | +6,82 % |
| 30 años | 1.507 | 100,00 % | +1,89 % (1902-06) | +6,76 % |

El recálculo independiente da −5,92 %, −2,13 %, −0,22 % y +1,89 % para esos
mismos peores casos, con los mismos meses de inicio: dos implementaciones
distintas coinciden hasta la centésima.

Dato que la página usa en varios sitios: de las 1.627 ventanas de veinte años
que caben en la serie, **una sola** acabó en pérdidas reales, y por −0,22 %
anual. Con treinta años no queda ninguna. Eso es cierto **de este mercado y de
este siglo y medio**, que es exactamente la advertencia de la última sección.

---

## Lo que estos datos NO son

1. **Bruto de costes.** Ninguna serie descuenta comisiones, custodia, cambio de
   divisa ni impuestos (en España, 19-30 % sobre plusvalías y dividendos al
   materializar). La página permite restar un coste anual, pero el punto de
   partida es bruto.
2. **Un índice no es un producto.** Nadie compró el S&P 500 en 1871: el primer
   fondo indexado es de 1976. Los rendimientos de antes de esa fecha son lo que
   habría dado el índice, no lo que nadie obtuvo.
3. **Sesgo de supervivencia.** EE. UU. es el mercado que mejor salió del siglo XX.
   `nikkei` y `mundo_exus` están ahí precisamente para no olvidarlo.
4. **Precio ≠ rentabilidad total.** Las series marcadas `dividendos: false`
   (`sp500_px`, `nikkei`, `ibex`, `oro`, `vivienda_us`, `bitcoin`) se quedan
   cortas respecto a lo que habría cobrado el inversor. En el JSON cada serie
   lleva su bandera `dividendos` y la página no mezcla unas con otras sin avisar.

---

## Regenerar

```sh
cd data-src
node build-mercados.mjs          # usa la caché de _work/
node build-mercados.mjs --fresh  # fuerza la redescarga de todas las fuentes
```

Escribe `pages/data/mercados.json` (~170 KB) e imprime las comprobaciones de
empalme y el CAGR nominal de cada serie. Si un empalme no cuadra, aborta.
