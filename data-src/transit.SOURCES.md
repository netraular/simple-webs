# `transit.json` — temps en transport públic

Temps **porta a porta en transport públic** (sense cotxe) des de cadascun dels 92
municipis de l'àrea de Barcelona i dels 73 barris de Barcelona cap a tres destins.

Generat per `data-src/fetch-transit.py`.

---

## 1. Mètode

### Router

S'ha fet servir **MOTIS** a través de la instància pública de **Transitous**:

- Endpoint: `https://api.transitous.org/api/v1/plan`
- Projecte: <https://transitous.org> · <https://github.com/public-transport/transitous>
- Motor: <https://github.com/motis-project/motis>

Transitous és un servei comunitari sense ànim de lucre que agrega els GTFS
oficials publicats pels operadors i els encamina juntament amb la xarxa de
carrers d'OpenStreetMap. Per a Catalunya els feeds que apareixen a les respostes
són, com a mínim:

| Operador a la resposta | Xarxa |
|---|---|
| `Renfe Cercanias` | Rodalies de Catalunya (R1, R2, R2S, R3, R4, R7, R8…) |
| `FGC` | Ferrocarrils de la Generalitat (S1, S2, S3, S4, S8, L8, R5, R6…) |
| `TMB` | Metro de Barcelona (L1–L11) i bus urbà |
| `TRAM` | Trambaix i Trambesòs |
| `Autobús interurbano de Cataluña`, `Sarbus`, `Marfina Bus`, `Avanza`… | busos interurbans de la Generalitat i concessions comarcals |

**No s'ha calculat res a mà i no s'ha interpolat ni estimat cap temps.** Tot el
que hi ha a `transit.json` surt d'un itinerari concret que el router ha trobat
en un horari publicat. El que el router no resol queda a `null`.

### Paràmetres de la consulta

```
preTransitModes  = WALK      (l'usuari no té cotxe: només a peu fins a la parada)
postTransitModes = WALK
directModes      = WALK
maxPreTransitTime  = 1800    (fins a 30 min a peu abans de la primera parada)
maxPostTransitTime = 1800    (fins a 30 min a peu després de l'última)
maxDirectTime      = 3600
pedestrianSpeed    = 1.25 m/s  ≈ 4,5 km/h
```

### Hora de referència

**Arribada a les 09:00 de dimarts 22 de setembre de 2026**, hora local (CEST,
UTC+2 — a les consultes, `2026-09-22T07:00:00Z`). És un dia feiner normal, sense
festius estatals, catalans ni locals de Barcelona (la Mercè cau el dijous 24).

La consulta és `arriveBy=true`, `timetableView=false`: es demana el conjunt de
trajectes que **arriben abans de les 09:00** i es tria el de durada mínima entre
els que, a més:

- surten de casa **a partir de les 05:30 locals** (`2026-09-22T03:30:00Z`), i
- duren **com a màxim 240 min**.

Aquests dos filtres són importants. Sense ells el router "resol" els pobles
sense servei matinal amb un bus del vespre anterior i una nit d'espera pel mig,
i retorna coses com 727 min per a Olivella. Amb els filtres, aquests casos són
`null`, que és la resposta honesta.

### Segona passada: els que no hi arriben a les 09:00

Hi ha municipis amb servei real que, simplement, **no et deixen a Barcelona
abans de les 09:00**. Castellví de Rosanes, per exemple, té autobús, però el
trajecte més matiner hi arriba a les 09:10. Marcar-los `null` seria tan fals com
inventar-se un temps.

Per a aquests casos es repeteix la consulta amb el límit a les **10:00 locals**
i el resultat es marca explícitament:

```json
"pl-catalunya": {
  "min": 108, "transbords": 1, "modes": ["Bus"],
  "arriba_tard": true,
  "arribada_local": "10:00",
  "nota": "cap trajecte no hi arriba abans de les 09:00; ..."
}
```

**Si compareu temps entre municipis, filtreu o marqueu els `arriba_tard: true`**:
no són comparables amb la resta, perquè responen a una pregunta diferent.
Afecta 3 municipis i cap barri.

### Què inclou el número `min`

És el temps **de portal a portal**: caminar fins a la parada + viatge +
**esperes als transbords** + caminar des de l'última parada fins al destí.

**No** inclou l'espera a casa abans de sortir (surts quan toca), ni marge de
seguretat, ni retards: és horari **teòric programat**, no temps real.

### `transbords` i `modes`

- `transbords`: el camp `transfers` de l'itinerari MOTIS (canvis de vehicle;
  caminar entre estacions compta com a transbord).
- `modes`: modes utilitzats en ordre, deduplicats, traduïts des del mode GTFS +
  l'operador: `Rodalies`, `FGC`, `Metro`, `Tram`, `Bus`, `Tren`, `A peu`.
  `["A peu"]` amb `transbords: 0` vol dir que anar-hi caminant és més ràpid que
  qualsevol combinació de transport públic (passa a alguns barris cèntrics).

---

## 2. `sortides_hora_punta` — qualitat del servei

**Definició:** nombre de **sortides diferents de transport públic entre les
07:00 i les 09:00 locals** d'aquell dimarts que formen part d'un trajecte òptim
cap a **plaça de Catalunya**.

Es fa amb una única consulta de **rang** (`timetableView=true`,
`arriveBy=false`, `searchWindow=7200`, sortida a les 07:00 locals). Aquesta mena
de cerca (range-RAPTOR) retorna **tot el front de Pareto** sobre la finestra: un
itinerari per cada sortida que, o bé et deixa arribar abans, o bé et permet
sortir més tard, que totes les altres. Es compta l'hora de sortida del **primer
tram de transport públic** de cada itinerari i es compten les hores diferents.

Per què això mesura el que interessa:

- Un poble amb un tren cada hora dona **2**.
- Un municipi amb tren cada 6 min dona **~20**.
- Castelldefels dona **15**, Terrassa **29**, Sant Cugat **52**, Olivella **0**.

**Què NO és:** no és el total de circulacions que passen pel municipi. Si dues
sortides seguides arriben a Barcelona igual de tard (p. ex. un bus lent que surt
just abans d'un tren ràpid), la dominada no compta — i és correcte, perquè no
és una sortida *útil*. Tampoc distingeix un tren d'un bus: compta opcions.

També depèn del destí (plaça de Catalunya) i del punt d'origen: un municipi amb
dues estacions llunyanes entre si pot sumar les sortides de totes dues només si
les dues queden a menys de 30 min a peu del punt de referència del municipi.

---

## 3. Destins

| id | punt | coordenades |
|---|---|---|
| `roche-sant-cugat` | Complex Farmacèutic Roche, av. de la Generalitat 171-173, Sant Cugat del Vallès | **41.492364, 2.058228** |
| `pl-catalunya` | Plaça de Catalunya, Barcelona | 41.3870, 2.1701 |
| `sants` | Estació de Barcelona-Sants | 41.3792, 2.1400 |

### Verificació de la coordenada de Roche

Consultat a **Nominatim / OpenStreetMap**:

- `Avinguda de la Generalitat 171-173, Sant Cugat del Vallès` →
  **41.4923643, 2.0582279** (Volpelleres, 08172). És la que s'ha fet servir.
- A pocs metres, OSM té la parada de bus literalment anomenada
  **«Av. de la Generalitat, 171 (Roche Diagnostics)»** a 41.49188, 2.05758 —
  76 m del punt triat. Confirma l'adreça.
- L'àrea `Complex Farmacèutic Roche` (41.4936, 2.0586) i els nodes
  `Roche Diagnostics` (41.49425, 2.05851), `Roche Edifici Corporatiu Tramuntana`
  (41.49340, 2.05728) i `Roche Planta industrial` són tots del mateix recinte,
  dins d'un radi de ~250 m. S'ha triat el punt de l'adreça postal
  (l'accés per l'avinguda) i no el centre del recinte, perquè és on arribes.

**Matís important sobre l'estació.** L'encàrrec deia «junto a la estación de FGC
Sant Joan». Sant Joan **sí que és l'estació d'FGC més propera**, però no està al
costat:

| estació FGC | distància en línia recta al punt de Roche |
|---|---|
| **Sant Joan** (41.49019, 2.07648) | **1 539 m** (~21 min a peu) |
| Volpelleres (41.48095, 2.07225) | 1 725 m |
| Sant Cugat (41.46791, 2.07820) | 3 188 m |

L'últim quilòmetre i mig el resol el router amb la llançadora **SJ** (Sarbus) o
la **L0055** (Marfina) des de l'estació de Sant Joan, ~7 min de bus + 2-4 min a
peu. Això vol dir que **tots els temps cap a `roche-sant-cugat` porten un
transbord i ~10-12 min de cua que no desapareixen encara que visquis al costat
d'una estació d'FGC**, i que depenen d'un bus de baixa freqüència; si aquell bus
no et quadra, l'alternativa real és caminar ~20 min des de Sant Joan. És la part
del número menys robusta de tot el fitxer.

---

## 4. Cobertura

| | amb dada | `arriba_tard` | `null` |
|---|---|---|---|
| 92 municipis → `roche-sant-cugat` | **91** | 2 | 1 |
| 92 municipis → `pl-catalunya` | **91** | 1 | 1 |
| 92 municipis → `sants` | **91** | 1 | 1 |
| 92 municipis · `sortides_hora_punta` | **92** | — | 0 |
| 73 barris → els tres destins | **73** | 0 | 0 |

- **`null` (1 municipi): Olivella.** No hi ha cap combinació que hi arribi abans
  de les 10:00; la primera opció que el router troba surt a les 10:12 i arriba a
  les 12:31. `sortides_hora_punta: 0`. Coincideix amb la realitat: Olivella és un
  disseminat sense estació i amb un servei de bus testimonial.
- **`arriba_tard` (3 municipis):** Castellví de Rosanes (els tres destins),
  Òrrius (només Roche, arriba 09:48).
- Els altres dos casos que es temia que quedessin fora sí que tenen dada:
  **Olesa de Bonesvalls** (119 min a pl. Catalunya, però `sortides_hora_punta: 0`
  — hi ha un bus abans de les 07:00 i prou) i **Subirats** (118 min, 2 sortides).
  Són números correctes i alhora la confirmació que allà no s'hi pot viure sense
  cotxe.

---

## 5. Comprovacions de cordura

| Trajecte | Esperat | Obtingut | |
|---|---|---|---|
| Castelldefels → pl. Catalunya (R2S) | 30-40 min | **43 min**, 0 transb., Rodalies | ✔ just per sobre |
| Castelldefels → Roche Sant Cugat | 70-95 min | **82 min**, 3 transb., Rodalies+Metro+FGC+Bus | ✔ |
| Barcelona (centre) → Sant Cugat per FGC | 30-40 min | **58 min** fins a Roche | ✔ (vegeu nota) |
| Terrassa → pl. Catalunya | 45-60 min | **65 min**, FGC directe | ≈ una mica alt |
| Sabadell → pl. Catalunya | 45-60 min | **48 min**, Rodalies directe | ✔ |
| Olivella (sense estació) | dolentíssim o inexistent | **`null`**, `sortides_hora_punta: 0` | ✔ |
| Castellví de Rosanes | dolentíssim o inexistent | 108 min i `arriba_tard` | ✔ |

Sobre els dos que queden per sobre de la banda esperada: la banda que es
recorda sol ser **d'estació a estació**, i aquí hi ha les dues caminades. A
Terrassa, per exemple, el desglossament és 8 min a peu + 51 min d'FGC + 6 min a
peu. A Sant Cugat → pl. Catalunya (49 min): 14 min a peu fins a l'estació +
29 min d'S2 + 6 min a peu. Els números no estan inflats: és que **el punt de
referència del municipi no és l'andana**.

El cas «Barcelona centre → Sant Cugat per FGC» no és comparable directament:
els 58 min són fins a **Roche**, que és 1,5 km més enllà de la xarxa d'FGC
(vegeu el matís de l'apartat 3). Fins a l'estació de Sant Cugat serien ~35 min.

---

## 6. Quan el número és poc fiable

Llegiu-ho abans de prendre cap decisió amb aquestes xifres.

1. **El punt d'origen és un sol punt per municipi.** És la coordenada de
   referència de `municipis.json` (nucli urbà), no on viuries. En municipis
   grans o disseminats (Terrassa, Sant Cugat, Cerdanyola, Sant Boi, el
   Papiol…) el temps pot variar ±15 min segons el barri. **Com més gran o més
   disseminat el municipi, menys informatiu és el número.**
2. **Horari teòric.** Ni retards, ni avaries, ni obres, ni afectacions de
   Rodalies. A la pràctica R1, R2 i R4 acumulen incidències amb regularitat.
3. **Un únic dia i una única hora.** Dimarts 22-09-2026, arribada 09:00. Un
   altre dia o una altra hora donen altres números, sobretot on el servei és
   escàs.
4. **Depèn de la cobertura GTFS de Transitous.** Si un operador comarcal no
   publica GTFS o Transitous no l'ha incorporat, el seu servei **no existeix**
   per al router. Un `null` o un `sortides_hora_punta` molt baix pot ser tant
   «no hi ha servei» com «el servei no està al feed». Els municipis petits del
   Garraf, l'Alt Penedès i el Baix Llobregat interior són els més exposats a
   aquest biaix.
5. **`null` vol dir «el router no ha trobat cap trajecte raonable»**: cap opció
   que surti després de les 05:30 i arribi abans de les 09:00 en menys de 4 h,
   caminant com a màxim 30 min a cada extrem. No vol dir necessàriament que
   sigui impossible arribar-hi; vol dir que no hi ha un *commute* viable.
6. **Les caminades poden semblar generoses.** A 4,5 km/h i amb encaminament real
   pel carrer, sortir del vestíbul d'una estació gran (pl. Catalunya, Sants)
   costa 5-6 min al model. És deliberat: és temps que existeix.
7. **Els temps cap a Roche depenen d'un bus llançadora** de freqüència limitada
   (vegeu apartat 3). Són els menys robustos del fitxer.
8. **Barris de Barcelona:** el punt de referència és el centroide del barri.
   En barris grans o de muntanya (Vallvidrera, la Marina del Prat Vermell,
   Torre Baró) el centroide pot quedar lluny d'on hi ha gent i de la parada.

---

## 7. Reproduir-ho

```bash
cd data-src
python3 fetch-transit.py          # 660 consultes + 2a passada, ~45 min, reprenible
python3 fetch-transit.py --test   # només les comprovacions de cordura
```

El script desa cada resposta resumida a `.transit-cache.json`; si s'atura, es pot
tornar a llançar i continua on era. Fa 3 consultes en paral·lel amb una pausa de
0,7 s entre consulta i consulta, per no abusar d'un servei comunitari gratuït.

Per refer-ho amb una altra data, canvieu les constants `DIA`, `ARRIBADA_UTC`,
`SORTIDA_MINIMA_UTC` i `PUNTA_INICI_UTC` al capdamunt del script (recordeu que
l'hora local és UTC+2 en horari d'estiu i UTC+1 a l'hivern).

---

## 8. Llicència de les dades

- Horaris: GTFS dels operadors (Renfe/Rodalies, FGC, TMB, TRAM, DGTM de la
  Generalitat), agregats per Transitous.
- Xarxa de carrers i geocodificació: © col·laboradors d'OpenStreetMap, ODbL.
  <https://www.openstreetmap.org/copyright>
