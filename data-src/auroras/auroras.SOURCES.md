# `auroras.json` — fuentes de datos

Generado con `build-auroras.mjs` (en este mismo directorio). Lo consume
`pages/auroras.html`. Comprobaciones: `node test-auroras.mjs`.

**Ningún valor está inventado ni interpolado** salvo dos cosas, las dos marcadas
como tales en la página: la latitud AACGM de un punto cualquiera (interpolada en
una rejilla oficial, error < 0,2° en las ciudades de la lista) y los supuestos
del ciclo 26, que aún no ha empezado.

---

## Resumen

| Campo | Qué es | Fuente | Desde |
|---|---|---|---|
| `kp` | Kp de cada 3 h, en tercios (`48 + tercios` por carácter, 8 por día) | GFZ Potsdam | 1932-01-01 |
| `dst` | Dst mínimo horario del día, **solo días ≤ −100 nT** | WDC Kyoto | 1957-01-01 |
| `sn`, `snSuave` | Número de manchas mensual y suavizado a 13 meses (v2.0) | SILSO | 1932-01 |
| `ciclos` | Mínimo, máximo y fin de cada ciclo con Kp (16–25) | calculado de `snSuave` | — |
| `prediccion` | Previsión mensual del ciclo 25 con su margen | NOAA SWPC | 2026-03 |
| `ciclo26` | Supuestos del ciclo 26 (fechas y fuerza) | puestos a mano, ver abajo | — |
| `aacgm` | Rejilla mundial 5° × 10° de latitud AACGM-v2 a 110 km | Dartmouth | — |

---

## Kp — GFZ Potsdam

`https://kp.gfz.de/app/files/Kp_ap_Ap_SN_F107_since_1932.txt` (CC BY 4.0).
Índice planetario definitivo desde 1932; los últimos ~30 días son *quick-look*
(columna D = 0) y el GFZ los sustituye al publicar el definitivo. El script
aborta si falta un día o si un valor no es un tercio exacto.

La página recalcula el **ap** de cada tramo con la tabla fija de Bartels y de ahí
el **Ap** diario. `test-auroras.mjs` lo contrasta con la columna Ap del propio
fichero: coincide en todos los días con un margen de ±1 por redondeo.

## Dst — World Data Center for Geomagnetism, Kyoto

`https://wdc.kugi.kyoto-u.ac.jp/dst_{final,provisional,realtime}/YYYYMM/index.html`.
Una página por mes. Cada mes está publicado en una sola de las tres carpetas:
definitivo hasta 2020, provisional de 2021 a julio de 2026 y tiempo real desde agosto de 2026. El
script prueba las tres en ese orden. El formato es de **ancho fijo** (4
caracteres por hora, sin separador entre valores como `-412-405`) y así se lee.

Solo viajan los días con Dst ≤ −100 nT, el umbral clásico de tormenta intensa
(Gonzalez et al. 1994). La página usa el Dst para dos cosas: ordenar las tormentas
en las que el Kp ya está saturado en 9 y fijar el umbral de los lugares de
latitud baja (ver más abajo).

Contrastes en el test: −589 nT el 14-mar-1989 y −422 nT el 20-nov-2003, las
cifras publicadas por Kyoto. Mayo de 2024 sale a −406 (provisional; la cifra
redondeada que circula es −412). El valor de −518 que también se cita para esa
tormenta es SYM-H, no Dst.

## Manchas solares — SILSO, Observatorio Real de Bélgica

`https://www.sidc.be/SILSO/DATA/SN_m_tot_V2.0.txt` y `SN_ms_tot_V2.0.txt`.
Los mínimos y máximos de ciclo son los extremos del suavizado a 13 meses que lo
son en ±48 meses. Coinciden con la tabla oficial de SILSO
(<https://www.sidc.be/SILSO/cyclesminmax>) para los máximos de los ciclos 19 a
25, y el test lo comprueba. **Máximo del ciclo 25: octubre de 2024, 160,9**
(SILSO, <https://www.sidc.be/article/solar-cycle-25-reached-its-maximum-october-2024>).

## Previsión del ciclo 25 — NOAA SWPC

`https://services.swpc.noaa.gov/json/solar-cycle/predicted-solar-cycle.json`.
Mensual hasta 2030-12, cuando la curva baja a 8 manchas. Se guarda el valor
central y el margen (`low_ssn`, `high_ssn`).

## Ciclo 26 — supuestos

NOAA aún no publica previsión del ciclo 26. Solo dice que empezará "entre enero
de 2029 y diciembre de 2032"
(<https://www.swpc.noaa.gov/products/solar-cycle-progression>). Previsiones
publicadas:

| Fuente | Previsión |
|---|---|
| Rodríguez et al. 2024, *Solar Physics* (doi:10.1007/s11207-024-02361-4) | máximo 121 en sep-2034 |
| Luo & Tan 2024 (arXiv 2402.13173) | empieza ~2030, máximo 2035–36, ~133 |
| Javaraiah 2019 (arXiv 1904.11500) | mínimo oct-2031, máximo mar-2036 |
| Wu & Qin 2021 (arXiv 2102.06001) | máximo 107 |
| Asikainen & Mantere 2023 (arXiv 2309.04208) | el 25 acaba en sep-2029 ± 1,9 años; el 26 "probablemente más fuerte" que el 25 |
| Edmonds & Killen 2025 (arXiv 2510.14355) | atípica: ~50, inicio de un gran mínimo |

Se toma el **mínimo en 2030-12** (el fondo de la curva de NOAA), el **máximo en
2035-06 ± 1,5 años**, que cubre de sep-2034 a mar-2036, y **120 manchas, con
rango de 107 a 161**: de la previsión más baja de las habituales a repetir el
ciclo 25. La previsión de ~50 queda fuera del rango y la página la menciona.

### Fuerza del ciclo

Los días con Kp ≥ 7 por año de cada ciclo completo (17–24) siguen a su máximo de
manchas con **r = 0,92**. El ciclo 24, con 116 manchas, tuvo 18 días; los demás
ciclos completos, entre 79 y 140. La página ajusta esa recta en el navegador y
corrige la probabilidad de cada mes futuro: si el ciclo previsto trae k veces las
tormentas de la media de sus análogos, P(al menos una noche) = 1 − (1 − p)^k.
Para el ciclo 25 se usa su máximo real (161) y para el 26 el supuesto, con su
rango.

---

## Latitud geomagnética — AACGM-v2

Las reglas que relacionan el Kp con hasta dónde baja la aurora están en latitud
geomagnética corregida. Un dipolo centrado se equivoca hasta en 10° en Europa:
Madrid sale a 43° de dipolo frente a 33,4° AACGM. La página no puede calcular
AACGM, que son armónicos esféricos de orden 10 sobre el IGRF, así que el script
pide a la calculadora oficial
(<https://sdnet.thayer.dartmouth.edu/aacgm/aacgm_calc.php>, Shepherd 2014,
doi:10.1002/2014JA020264) una rejilla de 33 × 36 nodos para el 2026-01-01 a
110 km. Son 12 peticiones de 100 puntos cada una.

Dos manías de la calculadora que el script tiene en cuenta:

- **Un punto sin definir anula la petición entera** (no devuelve nada). Junto al
  ecuador magnético AACGM no existe. El script parte esas peticiones por la mitad
  hasta aislar el punto, que queda a `null` (38 nodos, todos tropicales).
- Un punto sin definir dentro de una respuesta válida sale **con menos columnas**,
  así que la tabla no se lee de cinco en cinco: se busca cada pareja lat/lon pedida.

Las ciudades de la lista de la página se piden también exactas
(`aacgm.ciudades`). El test mide el error de interpolar la rejilla: < 0,2°.

La hora de la medianoche magnética se calcula con el dipolo centrado (polo IGRF
de 2025, 80,8° N 72,7° O). Para eso basta, porque el error es de minutos.

## De la latitud al umbral de Kp

Reglas de NOAA SWPC, en latitud geomagnética:

- **Borde del óvalo**, aurora en lo alto del cielo: 66° con Kp 0, unos 2° más al
  ecuador por cada punto de Kp, hasta 48° con Kp 9
  (<https://www.swpc.noaa.gov/content/tips-viewing-aurora>).
- **Línea de visión**, aurora asomando por el horizonte: hasta Kp 7, 2° más allá
  del borde. A partir de ahí, la escala G de NOAA dice que la aurora "se ha visto
  hasta" ~45° con G4 (Kp 8) y ~40° con G5 (Kp 9)
  (<https://www.swpc.noaa.gov/noaa-scales-explanation>).

Con esas reglas salen, por ejemplo, Kp 3–4 para Oslo, 5–6 para Edimburgo, 7–8
para Londres y 8–9− para París.

### Más allá de Kp 9: el Dst

El Kp se queda en 9, así que una tormenta de Dst −220 y otra de −589 valen lo
mismo, aunque la segunda lleve la aurora 10° más al sur. Para los lugares que
necesitan más de lo que da un Kp 9− (España, Italia, el sur de EE. UU.), el
criterio pasa a ser **Kp ≥ 9− y además un Dst lo bastante negativo**.

El borde del óvalo según el Dst sale de **Yokoyama et al. 1998** (*Ann. Geophys.*
16, 566; <https://angeo.copernicus.org/articles/16/566/1998/>). Es un ajuste
sobre el límite de la precipitación difusa medido por DMSP en 423 tormentas, en
latitud geomagnética corregida. Combinando sus ecuaciones:

```
−Dst ≈ 2200 · cos⁶Λ − 11,75      →      Λ = arccos(((11,75 − Dst) / 2200)^(1/6))
```

Da 52,5° con −100 nT, 43,8° con −300 y 36,1° con −600. Solo tres de las
tormentas de Yokoyama bajan de −300, así que en el extremo es una extrapolación.

La aurora roja de las grandes tormentas está a 300–500 km de altura y se ve
desde mucho más al sur que su borde. El margen entre borde y línea de visión,
**9°**, se ha calibrado con los avistamientos documentados en España:

| Tormenta | Dst | Borde (Yokoyama) | Línea de visión (−9°) | Dónde se vio en España |
|---|---|---|---|---|
| 19–20 ene 2026 | −236 | 46,0° | 37,0° | "también en España" ([spaceweather.com](https://spaceweather.com/archive.php?view=1&day=20&month=01&year=2026)); el norte peninsular está a ~37,3° (Bilbao) |
| 10–11 oct 2024 | −333 | 42,8° | 33,8° | Pirineo aragonés, 36,4° ([Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Circumpolar_con_Aurora_(54075379915).jpg)); Gran Canaria |
| 10–11 may 2024 | −406 | 40,7° | 31,7° | toda la península y Gran Canaria ([Canarian Weekly](https://canarianweekly.com/posts/Canary-Islands-witness-the-spectacle-of-the-Northern-Lights)) |

Es una calibración **conservadora**: en Gran Canaria se fotografió la aurora en
2024 y el criterio no llega tan al sur. Esos avistamientos son resplandores rojos
en el horizonte, captados con cámara. Con ella, Barcelona (34,9°) necesita Dst
≤ −300, Madrid (33,4°) ≤ −350 y Bilbao (37,3°) ≤ −230. Como el Dst solo existe
desde 1957, para esos lugares las cuentas de la página empiezan ahí, y lo dice.

---

## Tormentas documentadas (notas de la tabla)

| Episodio | Dónde se vio | Fuente |
|---|---|---|
| 25–26 ene 1938 | En toda España (Guerra Civil), Sicilia, Gibraltar, Portugal | arXiv 2010.15762; [El País](https://elpais.com/elpais/2019/08/07/ciencia/1565199642_773311.html) |
| 13–14 mar 1989 | Texas y Florida | [Wikipedia](https://en.wikipedia.org/wiki/March_1989_geomagnetic_storm) |
| 29–31 oct 2003 | Texas y países del Mediterráneo | [Wikipedia](https://en.wikipedia.org/wiki/2003_Halloween_solar_storms) |
| 10–11 may 2024 | Península, Gran Canaria; Yucatán, Jamaica | arXiv 2407.07665; Canarian Weekly |
| 10–11 oct 2024 | Gran Canaria, Pirineo aragonés; Puerto Rico | [spaceweather.com](https://spaceweather.com/archive.php?view=1&day=11&month=10&year=2024) |
| 11–13 nov 2025 | Centro de México | [spaceweather.com](https://spaceweather.com/archive.php?view=1&day=12&month=11&year=2025) |
| 19–21 ene 2026 | También en España; Alabama, Arizona, California | [spaceweather.com](https://spaceweather.com/archive.php?view=1&day=20&month=01&year=2026) |

Antes de 1932 (sin Kp, citadas en la página): Carrington, 1–2 sep 1859 (Dst ≈
−949 ± 31, Hayakawa et al. 2022; visible hasta 17° de latitud magnética, con
testimonios en España, Farrona et al. 2011); 4 feb 1872 (≤ −834); 25 sep 1909
(−595, doi:10.1029/2018SW002079); 13–16 may 1921 (−907 ± 132, Samoa;
doi:10.1029/2019SW002250). Resumen en arXiv 2501.00176.

---

## Lo que la página calcula encima

- **Noche con aurora posible**: algún tramo de 3 h con el Sol a más de 12° bajo el
  horizonte (en 2 de 3 muestras del tramo) y Kp ≥ umbral, más el Dst si el lugar
  lo necesita. La noche va de mediodía local a mediodía local.
- **Probabilidad futura de un mes**: fracción de meses análogos del pasado
  (misma fase del ciclo ±1 año, mismo mes ±1) que habrían tenido al menos una
  noche así. Se aplican las horas de oscuridad del mes futuro, no las del análogo
  (en Tromsø abril y mayo no se parecen nada). Después se corrige por la fuerza
  del ciclo. La página dice de cuántos ciclos distintos salen los análogos,
  porque meses de un mismo ciclo no son independientes.
- **Recurrencia de 27 días**: P(noche buena 26–28 días después de otra) frente a
  la base local, que son los desfases de 10–17 y 37–44 días, con la misma fase y
  estación pero sin la rotación solar. Con umbrales bajos o pocos casos se mide
  con Kp ≥ 6.
- **Ciclo de Hale** (qué equinoccio domina según la polaridad solar): Mursula et
  al. 2011 (doi:10.1029/2011GL046751) ven máximos en marzo con qA > 0 y en
  septiembre con qA < 0. Desde 2023–24 estamos en qA < 0 (polos de WSO,
  <http://wso.stanford.edu/Polar.html>). En los datos desde 1932 la alternancia no
  se repite con regularidad, y Svalgaard 2011 discute que sea sistemática. **No
  se usa**: la página enseña los números y trata igual los dos equinoccios.
- **Previsión de 27 días**: `https://services.swpc.noaa.gov/text/27-day-outlook.txt`,
  pedida desde el navegador (NOAA responde con `Access-Control-Allow-Origin: *`).

Física de fondo: Russell & McPherron 1973 (doi:10.1029/JA078i001p00092) para los
equinoccios; Watari 2024 (doi:10.1186/s40623-024-02087-4) y Chapman et al. 2020
(doi:10.1029/2020GL087795) para que las tormentas intensas abunden en la primera
mitad del descenso del ciclo y apenas lleguen cerca del mínimo.

## Presentación centrada en Abisko

La página fija Abisko y Kp ≥ 7 como **referencia conservadora de actividad
geomagnética elevada**, no como requisito para ver auroras ni como medida del
brillo local. NOAA explica que bajo el óvalo pueden verse buenas auroras con
Kp bajo: <https://www.spaceweather.gov/content/tips-viewing-aurora>.

Las ventanas destacadas son pares de meses completos consecutivos dentro de
los próximos 36 meses del ciclo 25, disponibles en el detalle de oportunidades
del descenso actual, no como anuncio de un nuevo máximo solar. Cada mes necesita al menos 10 análogos de
3 ciclos. Se ordenan por la media de las dos estimaciones mensuales y se eligen
hasta tres alternativas cuyos inicios estén separados más de 120 días. Es un
criterio de comparación, **no una probabilidad de éxito de un viaje**. Los meses
ya empezados se omiten, porque el modelo estima meses completos.

El calendario usa niveles relativos al mejor mes futuro del horizonte completo,
incluidos los supuestos del ciclo 26. La escala se mantiene al ocultar el escenario:
sin coincidencias, <30 %, 30–60 %, 60–80 % y ≥80 % de su señal. Los porcentajes
absolutos y la muestra siguen disponibles en la tabla de detalle. No incluye
nubes ni intensidad local y no está calibrado como pronóstico de visibilidad.
Los análogos de un mismo ciclo no son observaciones independientes.

El ciclo 26 aparece por defecto, junto a su aviso de incertidumbre, y puede ocultarse.
El rango muestra sensibilidad
a los supuestos, no un intervalo de confianza. NOAA confirma que todavía no
lo pronostica y sitúa su posible inicio entre 2029 y 2032:
<https://www.spaceweather.gov/products/solar-cycle-progression> (consultado
el 1 de octubre de 2026). El mínimo en 2030-12 del modelo no es una fecha oficial.

La cabecera distingue el **siguiente entorno de máximo solar** de las ventanas
de viaje cercanas. La referencia «hacia 2035–2036» toma el año del máximo
registrado (2024), suma 11 y muestra ese año y el siguiente. Es una orientación
amplia basada en la duración típica, no una previsión oficial ni un intervalo
de confianza: el ciclo puede adelantarse o retrasarse varios años. NOAA explica
esa periodicidad aproximada en
<https://www.spaceweather.gov/phenomena/sunspotssolar-cycle>.

El máximo de manchas solares no equivale necesariamente al pico de tormentas
geomagnéticas, mucho menos al de auroras visibles desde Abisko. El descenso
del ciclo 25 todavía puede ofrecer episodios intensos y el ciclo 26 no tiene
por qué ser más fuerte. El calendario mensual conserva los cálculos por análogos:
no se desplazan ni se fuerzan sus valores para producir un pico en 2035.

### Fotografía

`pages/data/abisko-aurora.jpg`: **Northern Lights in Abisko**, Lawrence Hislop /
GRID-Arendal, publicada por US Embassy Sweden. Wikimedia Commons verifica la
licencia **CC BY 2.0**. La página acredita autor, publicación, fuente, licencia
y encuadre adaptado. Copia local del JPEG original (1920 × 1116):

- Archivo y licencia: <https://commons.wikimedia.org/wiki/File:Northern_Lights_in_Abisko_(10739428626).jpg>
- Original: <https://upload.wikimedia.org/wikipedia/commons/9/94/Northern_Lights_in_Abisko_%2810739428626%29.jpg>
- Licencia: <https://creativecommons.org/licenses/by/2.0/>
