# Dades de `pages/transporte-publico.html` — «on puc viure, si hi he d'anar cada dia»

La pàgina no respon «quant es triga des d'aquí», sinó la pregunta inversa:
poses condicions de viatge (quant camines, on has d'arribar, en quant de temps) i
el mapa deixa encesos els municipis o barris que les compleixen, amb la xarxa
dibuixada a sota.

Hi ha **dos models de temps** que no són intercanviables: els **sis destins
exactes**, que són itineraris reals del router, i el **punt lliure** del mapa,
que és una **estimació** a partir d'una malla d'isòcrones. L'apartat 2 els separa
i l'apartat 3 diu quant s'equivoca el segon.

---

## 1. Fitxers, scripts i com refer-ho

| Fitxer generat | El fa | Què és |
|---|---|---|
| `data-src/transit.json` | `fetch-transit.py` | temps porta a porta cap als 6 destins, amb el desglossament per tram |
| `data-src/isocrones.json` | `fetch-isocronas.py` | abast `one-to-all` de cada origen, quantitzat a una graella de 600 m |
| `data-src/linies.json` | `fetch-linies.mjs` | traçat i parades de la xarxa, des d'OpenStreetMap |
| `pages/data/transporte-muni.json` | `build-transport.mjs` | 92 municipis: atributs (preu, població, renda…) + els 6 destins |
| `pages/data/transporte-barris.json` | `build-transport.mjs` | 73 barris de Barcelona, el mateix |
| `pages/data/linies.json` | `build-transport.mjs` | còpia de `linies.json` |
| `pages/data/iso-ancores.json` | `build-transport.mjs` | la graella d'ancoratges, comuna a les dues escales |
| `pages/data/iso-muni.json`, `iso-barris.json` | `build-transport.mjs` | matriu de minuts, **1 byte per (origen, ancoratge)** |

Els tres `iso-*` van separats a propòsit: només calen si l'usuari clica un punt
propi, i la pàgina els demana en aquell moment. La càrrega inicial no els porta.

### Ordre i temps

```bash
cd data-src
python3 fetch-transit.py      # 1.155 consultes  (165 origens × 6 destins + hora punta)
python3 fetch-isocronas.py    # 165 consultes one-to-all
node fetch-linies.mjs         # 4 consultes a Overpass (necessita transit.json fet)
node build-transport.mjs      # munta pages/data/ — segons
node test-transport.mjs       # 58 comprovacions — segons
```

- **`fetch-transit.py`** és el pas llarg: 1.155 consultes, 3 en paral·lel amb
  0,7 s de pausa entre consulta i consulta per no abusar d'un servei comunitari
  gratuït. Compteu-hi **de l'ordre d'una hora** (no està cronometrat). És
  **reprenible**: desa cada resposta a `.transit-cache.json` amb el prefix de
  versió `v2` i, si s'atura, continua on era. Les entrades `v1` (el format antic,
  sense desglossament) queden intactes i les segueix fent servir
  `pisos-vs-distancia.html`.
- **`fetch-isocronas.py`**: 165 consultes, **~30-45 min** segons la capçalera del
  script; 2 en paral·lel, 1 s de pausa, reprenible a
  `_work/.isocrones-cache.json`.
- **`fetch-linies.mjs`** fa 4 consultes a Overpass i **les desa crues a `_work/`**
  (`overpass-bus.json` sol 138 MB, `overpass-ferro.json` 17 MB). La primera
  vegada són minuts i la instància pública pot contestar 429/504 — el script
  espera 25 s i reintenta amb un segon endpoint; a partir d'aleshores va de la
  caché i triga segons. `--fresh` força tornar a baixar.
- **`fetch-linies.mjs` va després de `fetch-transit.py`**, perquè decideix quins
  busos dibuixa llegint els itineraris de `transit.json`.

Per canviar la data cal tocar `DIA` (i les hores derivades) al capdamunt dels dos
scripts de Python, i **invalidar la caché** corresponent.

---

## 2. Els dos models de temps

### 2.1 Els sis destins exactes — itinerari real

| id | punt | coordenades |
|---|---|---|
| `roche-sant-cugat` | Complex Farmacèutic Roche, av. de la Generalitat 171-173 | 41.492364, 2.058228 |
| `pl-catalunya` | Plaça de Catalunya, Barcelona | 41.3870, 2.1701 |
| `sants` | Estació de Barcelona-Sants | 41.3792, 2.1400 |
| `aeroport` | Terminal 1 del Prat (centroide de l'edifici a OSM) | 41.28867, 2.07341 |
| `castelldefels` | Estació de Rodalies de Castelldefels | 41.2800, 1.9757 |
| `sant-cugat-estacio` | Estació d'FGC de Sant Cugat (centre) | 41.46791, 2.07820 |

Router: **MOTIS** a la instància pública de **Transitous**
(`https://api.transitous.org/api/v1/plan`), que encamina els GTFS oficials de
Rodalies/Renfe, FGC, TMB (metro i bus), TRAM i els busos interurbans sobre la
xarxa de carrers d'OpenStreetMap. Paràmetres: només a peu als extrems
(`preTransitModes = postTransitModes = directModes = WALK`), fins a 30 min de
camí abans de la primera parada i després de l'última, a 4,5 km/h
(`pedestrianSpeed = 1.25` m/s).

**Hora de referència: arribada a les 09:00 de dimarts 29 de setembre de 2026**
(`arriveBy=true`, `timetableView=false`, `2026-09-29T07:00:00Z`; local = UTC+2).
Dels trajectes que hi arriben a temps es tria el més curt, descartant els que
surten de casa abans de les **05:30** o duren més de **240 min**. Sense aquests
dos filtres el router «resol» els pobles sense servei matinal amb un bus del
vespre anterior i una nit d'espera pel mig. Els que no hi arriben a les 09:00 es
tornen a demanar amb límit a les **10:00** i queden marcats `arriba_tard`, amb
`arribada_local`; **no són comparables amb la resta** i s'han de filtrar o
marcar (vegeu l'apartat 6).

#### El desglossament

Cada destí no porta només el total, sinó el trajecte partit en les parts que es
viuen diferent (caminar no és estar assegut al tren, i esperar en una andana no
és cap de les dues coses):

| camp | què és |
|---|---|
| `a_peu_acces` | portal → primera parada |
| `a_peu_transbord` | caminar entre parades en un transbord |
| `a_peu_final` | última parada → destí |
| `a_peu` | la suma dels tres — **és el que filtra la pàgina** |
| `en_vehicle` | temps dins d'un vehicle |
| `espera` | durada total menys la suma dels trams: el temps mort |
| `linies` | els trams de transport públic en ordre, amb codi de línia i les parades (i coordenades) on puges i baixes |

`min = a_peu + en_vehicle + espera`. El test ho comprova amb un marge de ±2 min
d'arrodoniment sobre els 546 trajectes municipals i els 438 de barri amb dada:
**0 incompliments**.

> **El matís important d'`a_peu`:** és el que camines **a la ruta més ràpida**,
> no el mínim possible. Pot existir una alternativa més lenta i amb menys camí
> que el router ha descartat perquè optimitza el temps total. Quan la pàgina
> descarta un municipi per «camino massa», el que diu de debò és «la ruta més
> ràpida des d'aquí camina massa».

### 2.2 El punt lliure — estimació sobre una graella

Per deixar clicar **qualsevol** punt del mapa no serveix demanar un itinerari per
parell origen-destí (serien milers de consultes per punt). S'usa l'endpoint
`one-to-all` de MOTIS: **una consulta per origen** (165 en total) torna el temps
fins a **totes** les parades a l'abast dins d'un límit de **105 min**.

Aquestes ~18.000 parades per origen no es guarden una per una: es **quantitzen a
una graella de 600 m** (bbox `41.18, 1.63, 41.77, 2.58`; `dlat 0.00538987`,
`dlon 0.00719096`, 134 columnes) i de cada cel·la es guarda el **mínim**. Les
cel·les que algun origen assoleix són els **ancoratges**: n'hi ha **2.082**. La
matriu és 1 byte per parella, amb **255 = inabastable**: 92 × 2.082 = 191.544
bytes per als municipis i 73 × 2.082 = 151.986 per als barris.

El temps estimat d'un origen M fins a un punt P és

```
t(M → P) = min      [ t(M → A) + caminar(A → P) ]
         A a ≤ 2,5 km de P
```

amb `caminar` en **línia recta × 1,3 de factor de rodeig, a 4,5 km/h**. L'únic
tram estimat és aquesta última caminada, que és exactament el que fa qualsevol
eina d'isòcrones: **no hi ha cap model de pivots ni suma de trajectes
independents**. Si el punt cau al mateix poble, també es considera anar-hi
caminant directament, amb un topall de 60 min (sense el topall, un municipi sense
cap parada assolible «resolia» el viatge caminant 50 km).

Per què **600 m**: vol dir com a molt 424 m d'error de posició de la parada,
~5 min a peu. A 300 m l'error baixaria a 3 min però la matriu es quadruplicaria i
la pàgina passaria d'uns centenars de kB a uns quants MB. No compensa afinar la
posició de la parada quan la resta del model (origen = un sol punt per municipi,
horari teòric) ja té un marge molt més gran.

#### Per què l'hora NO és la mateixa que als destins exactes

Els destins exactes són «arribar a les 09:00». Aquí **no es pot fer igual**:
`one-to-all` amb `arriveBy=true` donaria els temps **cap a** l'origen, que és la
direcció contrària de la que interessa. Per tant és una **sortida fixa a les
07:15 locals** del mateix dimarts 2026-09-29.

Això introdueix un **biaix**, i és deliberat no amagar-lo: un poble amb un únic
bus a les 07:05 en surt mal parat encara que el seu *commute* real sigui viable,
perquè el model el fa esperar fins al següent. És una de les causes de
l'apartat 3.

A més, el punt lliure **no té desglossament**: no hi ha `a_peu` ni `transbords`,
i per tant els filtres de caminada i de transbords **no s'hi apliquen** (la
pàgina ho diu al tooltip).

---

## 3. Quant s'equivoca l'estimador

`test-transport.mjs` reprodueix l'estimador de la pàgina exactament (mateix radi
de 2,5 km, mateix rodeig de 1,3, mateixa velocitat) i el compara contra la
**veritat de camp**, que són els temps exactes porta a porta dels sis destins.

```
n = 505 parells (de 542 possibles; 4 trivials descartats, 37 sense estimació)
error = estimat − exacte, en minuts

   mesura              valor
   mediana              +5,2
   mitjana              +5,7
   p10                  −4,8
   p90                 +18,9
   mediana |error|       6,5
   pitjor cas          +44,1   Castellví de Rosanes → sants (estimat 111,1, exacte 67)

   biaix per destí         n   mediana   mitjana      p10      p90
   roche-sant-cugat       84      +6,3      +6,5     −5,8    +22,9
   pl-catalunya           87      +5,2      +6,4     −2,2    +19,4
   sants                  88      +6,7      +7,5     −0,8    +18,2
   aeroport               83      +2,9      +3,7     −4,9    +17,1
   castelldefels          77      +5,5      +5,9     −1,5    +15,5
   sant-cugat-estacio     86      +3,2      +4,3     −7,8    +19,8
```

**El biaix és positiu a tots els destins: l'estimació sobreestima**, entre 3 i
7 min de mediana. Té dues causes que empenyen en la mateixa direcció: el model
t'obliga a baixar en un ancoratge de la graella (desplaçat fins a 424 m de la
parada real) i després caminar en línia recta × 1,3, mentre que el router exacte
et deixa a la porta pel carrer; i la sortida fixa de les 07:15 et fa esperar el
servei següent en comptes d'optimitzar l'hora de sortida. El **pitjor cas ho
il·lustra**: Castellví de Rosanes és un municipi amb servei escassíssim, i a les
07:15 la graella només li ofereix combinacions dolentes (111 min) quan el
trajecte exacte, triant l'hora, en fa 67.

**Llegiu el punt lliure com un ordre de magnitud, no com un horari.** La mediana
de l'error absolut és de 6,5 min i el p90 de +19: un llindar de «menys de 45 min»
sobre el punt lliure inclou pobles que hi són just i n'exclou alguns que hi
cabrien.

---

## 4. Tres decisions sobre els destins

**`sant-cugat-estacio` va separat de `roche-sant-cugat`.** El punt de Roche queda
a ~1,5 km de la xarxa d'FGC (l'estació més propera, Sant Joan, és a 1.539 m en
línia recta) i l'últim tram el resol un **bus llançadora** de freqüència
limitada, que suma 10-12 min a **tots** els temps cap a Roche, visquis on
visquis. «Arribar a Sant Cugat» i «arribar a Roche» són preguntes diferents i
mereixen columnes diferents. El test ho quantifica: dels **91 municipis que tenen
els dos temps, en 76 (83,5 %) l'estació surt millor**, i la **mediana de l'estalvi
és de 12,0 min**.

**La coordenada de l'aeroport es va corregir.** La que hi havia a `pois.json`
(41.2874, 2.0830) **cau sobre la plataforma d'aeronaus**, sense cap carrer a
prop: el router no hi arribava des d'enlloc i **tota la columna sortia `null`**.
Ara és el centroide de l'edifici de la T1 a OSM (41.28867, 2.07341). La T2 té
estació de Rodalies pròpia i aniria ~10 min millor; s'ha triat la T1 perquè és on
va la gent.

**La data va passar de 2026-09-22 a 2026-09-29.** Simplement, la del dataset
anterior ja havia passat. Els dos dimarts són dies feiners equivalents i
Catalunya segueix en horari d'estiu (CEST, UTC+2) fins al 25 d'octubre, de manera
que la conversió a UTC no canvia.

Un quart apunt menor: `castelldefels` és **l'estació de Rodalies, no la platja**.
Qui hi va cada dia hi va al poble; la platja ja és un POI a part.

---

## 5. La xarxa dibuixada (`linies.json`)

Traçat i parades des d'**OpenStreetMap** via Overpass, dins del mateix marc
`41.18, 1.63, 41.77, 2.58`. L'estat actual del fitxer:

| xarxa | línies |
|---|---|
| Bus | 107 |
| Rodalies | 16 |
| Metro | 15 |
| FGC | 11 |
| Tram | 6 |
| **total** | **155 línies**, 442 parades |

**Què hi entra.** La capa ferroviària es dibuixa sencera: metro, FGC, Rodalies i
tramvia. Els **funiculars no són una xarxa a part** per a qui els fa servir: es
classifiquen **per operador**, segons les etiquetes d'OSM — el de Vallvidrera
(FV) va amb FGC i el de Montjuïc (FM) amb Metro, que és on el posa TMB i on surt
al plànol. L'FM, a més, apareix en itineraris òptims reals.

**Què en queda fora.** La **llarga distància** (AVE, Ouigo, Iryo, Alvia, Euromed,
SNCF…): comparteix via amb Rodalies però no és rodalia i embruta el mapa. També
els trens amb un operador que no es pot reconèixer per les etiquetes. I el
**funicular del Tibidabo (FT)**, que opera Barcelona de Serveis Municipals i puja
a un parc d'atraccions: no és transport de rodalia, pel mateix criteri que la
llarga distància. Cap itinerari òptim no el fa servir.

**El criteri del bus.** Al marc hi ha 1.312 relacions de ruta de bus (670 parells
operador+línia diferents): dibuixar-les seria una taca il·legible de diversos MB.
Només es dibuixen les que **surten en algun itinerari òptim de `transit.json`**,
és a dir les que formen part d'un trajecte que algú faria de debò. Als itineraris
hi surten **193 refs de bus diferents i se'n dibuixen 107 (55,4 %)**; **la resta
no estan etiquetades amb aquest codi a OSM** i no hi ha manera honesta
d'emparellar-les (el codi oficial porta zeros de farciment, `L0077`, i OSM sovint
no, `L77` — es comparen les dues formes, però això només en recupera unes
quantes). **Dels busos no es guarden parades**: són ~4.500 punts que pesen més
que tots els traçats junts i que, dibuixats, són un núvol il·legible; d'un bus
interessa per on passa. De les 32 línies ferroviàries que apareixen en itineraris
òptims, **totes 32 estan dibuixades**.

**Geometria.** Els *ways* de cada relació s'encadenen en polilínies; quan hi ha
un salt (relacions mal mantingudes) **s'obre un segment nou en comptes de
dibuixar una recta fantasma**: el forat es veu, que és l'honest. De cada línia es
tria la variant de traçat més llarga (les curtes són reforços). Simplificació
**Douglas-Peucker amb tolerància mètrica: 25 m la ferroviària i 60 m el bus**
(més simplificat perquè és context, i la carretera ja té forma reconeixible), i
coordenades a 5 decimals. El traçat es **retalla al marc interpolant el punt
exacte de tall** amb la vora, no quedant-se amb el vèrtex de fora, que podia
sobresortir més de 150 m.

Cada línia porta el `color` d'OSM, que la pàgina **no** fa servir: els colors
surten de la paleta pròpia i distingeixen **xarxes**, no línies: són cinc xarxes,
no quaranta línies, i els colors oficials no es distingeixen entre si amb
daltonisme. El codi de la línia va escrit a l'itinerari, que és el que de debò
la identifica.

---

## 6. Cobertura

**Municipis** (92), cada destí:

| destí | amb dada | cobertura | `arriba_tard` | trivial |
|---|---|---|---|---|
| `roche-sant-cugat` | 91/92 | 98,9 % | 2 | 1 |
| `pl-catalunya` | 91/92 | 98,9 % | 1 | 1 |
| `sants` | 91/92 | 98,9 % | 1 | 0 |
| `aeroport` | 91/92 | 98,9 % | 2 | 0 |
| `castelldefels` | 91/92 | 98,9 % | 2 | 1 |
| `sant-cugat-estacio` | 91/92 | 98,9 % | 2 | 1 |

**Barris de Barcelona** (73): **100 % als sis destins**, cap `arriba_tard`. Sí que
hi ha molts **trivials**: 21 barris amb plaça de Catalunya i 17 amb Sants.

- **L'únic `null` és Olivella**, i ho és als sis destins. `sortides_hora_punta: 0`.
  No és un forat de dades: Olivella és un disseminat sense estació i amb un servei
  de bus testimonial; no hi ha cap combinació que surti després de les 05:30 i
  arribi abans de les 10:00. El `null` és la resposta honesta.
- **`arriba_tard`:** Castellví de Rosanes als sis destins (de 09:19 a 10:00 segons
  el destí) i Òrrius a quatre (~09:48-09:55).
- **`trivial`** marca el destí que cau dins del mateix municipi o a menys de 3 km:
  Barcelona → pl. Catalunya, Castelldefels → estació de Castelldefels, Sant Cugat
  → estació de Sant Cugat, Rubí → Roche. Són certs però no informen de res i es
  mengen l'escala dels gràfics i dels filtres; per això van marcats.

**Pes del que carrega la pàgina** (el test ho vigila contra un límit tou d'1,2 MB):

```
transporte-muni.json      296,9 kB       iso-ancores.json    11,4 kB
transporte-barris.json    219,4 kB       iso-muni.json      250,1 kB
linies.json               171,4 kB       iso-barris.json    198,3 kB
                                         TOTAL            1.147,5 kB  (97,9 %)
```

`node test-transport.mjs` passa **58/58 comprovacions**.

---

## 7. Quan no fiar-se'n

Llegiu-ho abans de prendre cap decisió amb aquests números.

1. **L'origen és un sol punt per municipi.** És la coordenada de referència de
   `municipis.json` (nucli urbà), no on viuries. En municipis grans o disseminats
   (Terrassa, Sant Cugat, Cerdanyola, Sant Boi…) el temps pot variar força segons
   el barri. **Com més gran o més disseminat el municipi, menys informatiu és el
   número.** Als barris de Barcelona el punt és el centroide, que en barris de
   muntanya (Vallvidrera, Torre Baró) pot quedar lluny d'on hi ha gent.
2. **Horari teòric.** Ni retards, ni avaries, ni obres, ni afectacions de
   Rodalies. A la pràctica R1, R2 i R4 acumulen incidències amb regularitat.
3. **Un únic dia i una única hora** — i de fet **dues hores diferents**: dimarts
   2026-09-29, arribada a les 09:00 per als destins exactes i sortida a les 07:15
   per al punt lliure (apartat 2.2). Un altre dia o una altra hora donen altres
   números, sobretot allà on el servei és escàs.
4. **Depèn de la cobertura GTFS de Transitous.** Si un operador comarcal no
   publica GTFS o Transitous no l'ha incorporat, el seu servei **no existeix** per
   al router. Un `null` o un `sortides_hora_punta` baix pot voler dir «no hi ha
   servei» o «el servei no és al feed». Els municipis petits del Garraf, l'Alt
   Penedès i el Baix Llobregat interior són els més exposats.
5. **Tot el que va cap a Roche depèn d'un bus llançadora** de freqüència limitada
   (apartat 4). Són els temps menys robustos del conjunt: si aquell bus no et
   quadra, l'alternativa real és caminar ~20 min des de Sant Joan. Si el que
   vols és mesurar «arribar a Sant Cugat», fes servir `sant-cugat-estacio`.
6. **Destins trivials.** Filtrar per «arribar a Castelldefels en menys de 20 min»
   deixa encès Castelldefels amb 2 min a peu. És cert i no diu res; per això van
   marcats `trivial` i s'han de tractar a part.
7. **El punt lliure és una estimació amb error de graella.** 600 m de cel·la →
   fins a 424 m d'error de posició de la parada, més la caminada en línia recta
   × 1,3, més la sortida fixa de les 07:15: **mediana d'error absolut 6,5 min,
   p90 +19, sobreestima gairebé sempre** (apartat 3). I sobre el punt lliure **no
   es poden aplicar els filtres de caminada ni de transbords**, perquè no hi ha
   desglossament.
8. **`a_peu` és el camí de la ruta més ràpida, no el mínim possible** (apartat
   2.1). El filtre de caminada descarta rutes, no municipis.
9. **`arriba_tard` respon una altra pregunta.** Aquests temps són «el millor que
   hi arriba abans de les 10:00», no «abans de les 09:00»: no es poden comparar
   amb la resta sense dir-ho.

---

## 8. Llicència de les dades

- **Horaris:** GTFS oficials dels operadors (Renfe/Rodalies, FGC, TMB, TRAM,
  busos interurbans de la Generalitat), agregats i encaminats per **Transitous**
  (<https://transitous.org>), un servei comunitari sense ànim de lucre, amb el
  motor **MOTIS** (<https://github.com/motis-project/motis>).
- **Traçat de la xarxa, parades i geocodificació:** © col·laboradors
  d'**OpenStreetMap**, **ODbL** — <https://www.openstreetmap.org/copyright>.
