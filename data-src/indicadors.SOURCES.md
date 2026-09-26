# `indicadors.json` i `indicadors-barris.json` — fonts de dades

Generat el **2026-09-21** amb `build_indicadors.py` (al mateix directori).

Indicadors socioeconòmics per als **92 municipis** de `municipis.json` i, en paral·lel,
per als **73 barris de Barcelona**.

**Cap valor és inventat, estimat ni interpolat.** El que la font no publica queda a
`null`. Els dos únics camps calculats (`atur_taxa_pct` i `turismes_per_1000_hab`) són
quocients explícits de dues xifres publicades i estan marcats com a tals aquí sota i
al `meta.fonts` del JSON.

---

## Resum de cobertura

| Camp | Font | Any | Municipis |
|---|---|---|---|
| `renda_llar_eur` | INE ADRH | 2023 | **92/92** |
| `renda_persona_eur` | INE ADRH | 2023 | **92/92** |
| `renda_bruta_llar_eur` | INE ADRH | 2023 | **92/92** |
| `renda_bruta_persona_eur` | INE ADRH | 2023 | **92/92** |
| `renda_uc_mitjana_eur` | INE ADRH | 2023 | **92/92** |
| `renda_uc_mediana_eur` | INE ADRH | 2023 | **92/92** |
| `gini` | INE ADRH | 2023 | **92/92** |
| `p80_p20` | INE ADRH | 2023 | **92/92** |
| `edat_mitjana` | INE ADRH | 2023 | **92/92** |
| `pct_menors_18` | INE ADRH | 2023 | **92/92** |
| `pct_65_mes` | INE ADRH | 2023 | **92/92** |
| `mida_mitjana_llar` | INE ADRH | 2023 | **92/92** |
| `pct_llars_unipersonals` | INE ADRH | 2023 | **92/92** |
| `pct_poblacio_espanyola` | INE ADRH | 2023 | **92/92** |
| `poblacio_adrh_2023` | INE ADRH | 2023 | **92/92** |
| `rfdb_habitant_eur` | Idescat EMEX `f7` | 2023 (p) | 90/92 |
| `ist` | Idescat EMEX `f385` | 2024 (p) | **92/92** |
| `atur_taxa_pct` | Idescat EMEX `f222`/`f223` (**calculat**) | 2024 | **92/92** |
| `atur_registrat` | Idescat EMEX `f308` | 2025 | **92/92** |
| `pct_educacio_superior` | Idescat EMEX `f389` | 2024 | **92/92** |
| `pct_habitatge_lloguer` | Idescat EMEX `f401` | **2021** | **92/92** |
| `pct_recollida_selectiva` | Idescat EMEX `f368` | 2024 | **92/92** |
| `pct_alumnes_mateix_municipi` | Idescat EMEX `f381` | curs 2024/25 | **92/92** |
| `turismes_per_1000_hab` | Idescat EMEX `f19`/`f321` (**calculat**) | 2024 / 2025 | **92/92** |

Els 92 municipis són tots de la **província de Barcelona** (`codi_ine` comença per `08`),
cosa que permet fer servir una sola taula provincial de l'INE per indicador.

---

## 1. INE — Atlas de distribución de renta de los hogares (ADRH)

| | |
|---|---|
| Operació | **Atlas de distribución de renta de los hogares**, codi `ADRH`, IOE `30325` |
| Fitxa | <https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177088&idp=1254735976608> |
| Origen de les dades | Declaracions de l'IRPF (AEAT i hisendes forals) creuades amb el padró |
| Sèrie | 2015 – **2023**. S'ha agafat **2023**, l'últim any publicat |
| Granularitat publicada | municipi, districte i **secció censal** |

### Com s'han localitzat les taules

L'API tempus3 de l'INE llista les operacions i les taules de cada operació:

```
https://servicios.ine.es/wstempus/js/ES/OPERACIONES_DISPONIBLES
https://servicios.ine.es/wstempus/js/ES/TABLAS_OPERACION/ADRH
```

L'ADRH té **540 taules**: 10 tipus d'indicador × 54 àmbits (una taula per província,
amb `Codigo = DIST-SECC-MUN`, més les nacionals `NAC-CCAA-PROV`). Les taules de la
**província de Barcelona** s'han identificat comprovant la primera fila de dades de
cada candidata (`08001 Abrera`):

| Taula | Contingut | Descàrrega CSV utilitzada |
|---|---|---|
| **30896** | Indicadores de renta media y mediana | `https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/30896.csv` |
| **30904** | Indicadores demográficos | `https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/30904.csv` |
| **37686** | Índice de Gini y Distribución de la renta P80/P20 | `https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/37686.csv` |

> La taula **30824** que se solia citar com «la de municipis» és en realitat la taula
> **nacional** (tot Espanya, ~265 MB en CSV). Les taules provincials són molt més
> manejables (30 MB, 9 MB) i contenen exactament les mateixes xifres per al territori
> que ens interessa.

### Format del CSV i com s'ha llegit

```
Municipios;Distritos;Secciones;Indicadores de renta media y mediana;Periodo;Total
08019 Barcelona;;;Renta neta media por hogar;2023;47.361
08019 Barcelona;0801901 Barcelona distrito 01;0801901001 Barcelona sección 01001;Renta neta media por persona;2023;13.122
```

- Separador `;`, codificació UTF-8 amb BOM.
- Números en format espanyol: `.` = milers, `,` = decimals.
- Una fila és **de municipi** quan `Distritos` i `Secciones` són buides. Per als 92
  municipis s'agafen **només aquestes files**: són xifres publicades per l'INE, no
  agregacions nostres.
- El codi de municipi són els 5 primers caràcters de la columna `Municipios`
  (= `codi_ine`); el creuament amb `municipis.json` és **92/92, sense cap forat**.

### Definició de cada camp

| Camp | Indicador INE | Definició |
|---|---|---|
| `renda_llar_eur` | Renta neta media por hogar | Renda **neta** (després d'impostos i cotitzacions) mitjana de la llar, en euros/any |
| `renda_persona_eur` | Renta neta media por persona | Renda neta total del municipi dividida per la població |
| `renda_bruta_llar_eur` | Renta bruta media por hogar | Idem abans d'impostos i cotitzacions |
| `renda_bruta_persona_eur` | Renta bruta media por persona | Idem abans d'impostos i cotitzacions |
| `renda_uc_mitjana_eur` | Media de la renta por unidad de consumo | Renda per **unitat de consum** (escala OCDE modificada: 1 al primer adult, 0,5 als altres adults, 0,3 als menors). És la xifra que compara millor municipis amb llars de mida diferent |
| `renda_uc_mediana_eur` | Mediana de la renta por unidad de consumo | Mediana de la mateixa variable |
| `gini` | Índice de Gini | Desigualtat de la renda per unitat de consum. 0 = igualtat total, 100 = màxima desigualtat |
| `p80_p20` | Distribución de la renta P80/P20 | Quocient entre el percentil 80 i el percentil 20 de la renda per unitat de consum |
| `edat_mitjana` | Edad media de la población | Anys |
| `pct_menors_18` | Porcentaje de población menor de 18 años | % |
| `pct_65_mes` | Porcentaje de población de 65 y más años | % |
| `mida_mitjana_llar` | Tamaño medio del hogar | Persones per llar |
| `pct_llars_unipersonals` | Porcentaje de hogares unipersonales | % |
| `pct_poblacio_espanyola` | Porcentaje de población española | % de població amb nacionalitat espanyola |
| `poblacio_adrh_2023` | Población | Població de referència del propi Atles. **No substitueix** `poblacio` de `municipis.json` (padró 2025); serveix per ponderar l'agregació a barris i per contrastar |

### Limitacions de l'ADRH

- **`renda_uc_mediana_eur` ve publicada per trams.** Els 92 municipis només tenen
  **19 valors diferents** (Barcelona i Castelldefels comparteixen exactament 23.450 €).
  No serveix per a un mapa de color continu: per a això cal fer servir
  `renda_uc_mitjana_eur` (92 valors diferents) o `renda_llar_eur`.
- **`p80_p20` ve arrodonit a un decimal**: només 11 valors diferents entre 2,0 i 3,0.
  Té poca resolució per ordenar municipis; `gini` (22,9 – 35,4) discrimina millor.
- **`mida_mitjana_llar`** ve arrodonit a un decimal (8 valors diferents).
- La renda de l'ADRH és **renda declarada a l'IRPF**; no hi entra l'economia
  submergida ni la renda no declarada, i els residents sense obligació de declarar hi
  entren via creuament amb altres registres. No és renda de l'enquesta de condicions
  de vida.
- La renda **per llar** depèn molt de la mida de la llar. Un municipi amb famílies
  grans surt alt en `renda_llar_eur` sense que les persones hi visquin millor: per
  comparar benestar és millor `renda_uc_mitjana_eur`.
- El desfasament és de **~2 anys i mig** (dades 2023 publicades el 2025/2026).

---

## 2. Idescat — API EMEX

| | |
|---|---|
| API | <https://www.idescat.cat/dev/api/emex/> |
| Crida única utilitzada | `https://api.idescat.cat/emex/v1/dades.json?i=f7,f385,f308,f221,f222,f223,f389,f401,f19,f368,f381,f321&tipus=mun&lang=ca` |
| Catàleg de municipis | `https://api.idescat.cat/emex/v1/nodes.json?tipus=mun` (947 municipis) |

La resposta retorna, per a cada indicador, una cadena de **947 valors separats per
comes** alineada amb la llista `fitxes.cols.col`. El codi d'Idescat té **6 dígits**
(INE de 5 + dígit de control): `080193` → `codi_ine` `08019`. El `_` significa
«no publicat».

| Camp | Indicador | Taula Idescat | Any | Publicació |
|---|---|---|---|---|
| `rfdb_habitant_eur` | `f7` RFDB per habitant (€) | `t5` Renda familiar disponible bruta | **2023 (p)** | <https://www.idescat.cat/pub/?id=rfdbc> |
| `ist` | `f385` Índex socioeconòmic territorial | `t213` | **2024 (p)** | <https://www.idescat.cat/pub/?id=ist> |
| `atur_taxa_pct` | `f222` / `f223` × 100 | `t56` Relació amb l'activitat econòmica | **2024** | <https://www.idescat.cat/pub/?id=censph> |
| `atur_registrat` | `f308` Atur registrat, mitjanes anuals | `t188` | **2025** | <https://www.idescat.cat/pub/?id=atureg> |
| `pct_educacio_superior` | `f389` Educació superior (%) | `t215` Nivell de formació assolit | **2024** | <https://www.idescat.cat/pub/?id=censph> |
| `pct_habitatge_lloguer` | `f401` Habitatges de lloguer (%) | `t124` Règim de tinença | **2021** | <https://www.idescat.cat/pub/?id=censph> |
| `pct_recollida_selectiva` | `f368` Recollida selectiva (%) | `t204` Residus municipals | **2024** | <https://www.idescat.cat/pub/?id=resmc> |
| `pct_alumnes_mateix_municipi` | `f381` (%) | `t211` Mobilitat obligada per estudis | **curs 2024/25** | <https://www.idescat.cat/pub/?id=emoesc> |
| `turismes_per_1000_hab` | `f19` / `f321` × 1.000 | `t18` Parc de vehicles / `t195` Població | **2024 / 2025** | <https://www.idescat.cat/pub/?id=parcc> |

`(p)` = dada provisional segons Idescat.

### Per què aquests indicadors i no d'altres

El catàleg EMEX té ~80 taules per municipi. S'han descartat les magnituds
administratives i macroeconòmiques que no diuen res a qui busca on viure (VAB per
branques, caps de bestiar, comptes de cotització, resultats electorals, places
hoteleres, IBI…). Els triats responen cadascun a una pregunta concreta:

- **`ist` — Índex socioeconòmic territorial.** El més valuós dels «extres». És
  l'índex sintètic oficial d'Idescat (Catalunya = 100) construït a partir de renda,
  nivell d'estudis, ocupació i categoria professional. Resumeix en un sol número allò
  que la resta de camps expliquen per separat, i com que és un índex base 100 es
  llegeix d'un cop d'ull en un mapa divergent. Rang als 92 municipis: **75,9 – 130,1**.
- **`atur_taxa_pct`.** Mercat de treball local. És un % directament comparable, a
  diferència de l'atur registrat en xifres absolutes. Rang: **4,1 % – 15,2 %**.
- **`pct_educacio_superior`.** Perfil educatiu del veïnat, molt correlacionat amb el
  tipus de serveis i comerç que hi ha al municipi. Rang: **17,0 % – 63,4 %**.
- **`pct_alumnes_mateix_municipi`.** Per a qui té criatures: diu si el municipi té
  prou places escolars o si els infants s'han de desplaçar cada dia a un altre poble.
  Encaixa directament amb la temàtica de «llunyania» de la web. Rang extrem:
  **25,4 % – 96,5 %**, o sigui que discrimina molt.
- **`pct_recollida_selectiva`.** Indicador ambiental i, de retruc, de qualitat de la
  gestió municipal (sistemes porta a porta vs. contenidor obert). Rang:
  **24,9 % – 91,0 %**.
- **`turismes_per_1000_hab`.** Proxy de dependència del cotxe, que és exactament la
  variable que la web ja mesura amb els temps de desplaçament. Rang: **254 – 710**.
- **`pct_habitatge_lloguer`.** Profunditat del mercat de lloguer, complement natural
  de les dades de preu que la web ja té. Rang: **8,4 % – 31,1 %**.
- **`rfdb_habitant_eur`.** Segona lectura de la renda, d'una font i metodologia
  independents de l'INE (vegeu l'avís de sota).

### Limitacions dels camps d'Idescat

- **`rfdb_habitant_eur` NO és comparable amb la renda de l'ADRH.** La RFDB és una
  macromagnitud de comptabilitat regional (inclou rendes de la propietat i
  transferències socials imputades i es reparteix territorialment amb un model);
  la renda de l'ADRH surt de declaracions fiscals individuals. Les xifres són
  sistemàticament diferents (Barcelona: 25.898 € RFDB/hab. vs. 19.527 € de renda neta
  per persona de l'ADRH). Serveix per **ordenar** municipis, no per comparar nivells
  amb l'ADRH. Falta a **2 municipis** (`Santa Maria de Martorelles`, `Òrrius`):
  Idescat no la publica per a municipis molt petits.
- **`atur_taxa_pct` és calculat**: `f222` (població desocupada) / `f223` (població
  activa) × 100. Les dues xifres són publicades per Idescat, del **mateix any (2024)**
  i la **mateixa font** (Cens de població anual de l'INE). És per tant la **taxa d'atur
  censal**; no és la taxa d'atur registral del SOC ni la de l'EPA, i no coincidirà
  exactament amb cap de les dues. Es dona també `atur_registrat` (xifra absoluta,
  mitjana dels 12 mesos de 2025) per a qui vulgui la font administrativa crua; no se'n
  publica el denominador oficial per municipi, per això no se n'ha derivat cap taxa.
- **`pct_habitatge_lloguer` és de 2021** (Cens de població i habitatges). És l'any més
  recent publicat, però és **3 anys més antic** que la resta d'indicadors d'Idescat.
- **`turismes_per_1000_hab` és calculat i barreja dos anys**: turismes de 2024 sobre
  població de 2025, perquè Idescat no publica el quocient i els dos indicadors tenen
  any de referència diferent. L'efecte del desfasament és d'aproximadament l'1 %.
- **`pct_recollida_selectiva`** pot pujar molt de cop en un municipi que acaba
  d'implantar el porta a porta; no és un indicador estable interanualment.
- Els anys **no són homogenis** entre camps (2021, 2023, 2024, 2025, curs 2024/25).
  Cada camp porta el seu any a `meta.fonts[].any` del JSON; no s'han de barrejar en un
  mateix índex compost sense advertir-ho.

---

## 3. `indicadors-barris.json` — els 73 barris de Barcelona

L'INE **no publica dades per barri**: publica per **secció censal**. Els 73 barris de
Barcelona són unions de seccions censals senceres, de manera que es poden agregar
sense trencar cap secció.

### Correspondència secció censal → barri

Ve del fitxer de l'**Atles de renda de l'Ajuntament de Barcelona** (que és l'ADRH de
l'INE republicat, amb les etiquetes de districte i barri afegides):

```
https://opendata-ajuntament.barcelona.cat/data/dataset/renda-tributaria-per-persona-atlas-distribucio/resource/2248ae01-340f-41ce-ab08-5cb6986ece73/download
```

Fitxa del dataset:
<https://opendata-ajuntament.barcelona.cat/data/ca/dataset/renda-tributaria-per-persona-atlas-distribucio>

> **⚠ Aquesta URL ja no baixa el fitxer (comprovat el 2026-09-26).** El portal
> de l'Ajuntament ha posat les descàrregues darrere **BunkerWeb + hCaptcha**:
> respon **HTTP 200** amb una pàgina «Bot Detection» d'uns 12 kB en comptes del
> CSV, així que un script que no ho miri es guarda l'HTML a la caché i acaba
> deixant els camps a `null` sense dir res. `fetch()` ara ho detecta i peta.
>
> La via que **sí** que funciona és l'API CKAN del mateix portal, que no està
> protegida —`datastore_search` i `datastore_search_sql` sobre el `resource_id`
> del recurs:
>
> ```
> https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search?resource_id=2248ae01-340f-41ce-ab08-5cb6986ece73&limit=5
> ```
>
> La caché de `_work/` és d'abans del bloqueig, per això el script segueix
> funcionant. Qui la buidi haurà de passar el descarregador a CKAN.

Columnes: `Any, Codi_Districte, Nom_Districte, Codi_Barri, Nom_Barri, Seccio_Censal, Import_Euros`.
El codi INE de secció es reconstrueix com `08019` + districte (2 dígits) + secció (3 dígits).

**Controls fets pel script (tots superats):**

- **1.068 seccions**, cadascuna assignada a un únic barri; **73 barris** diferents.
- Els `Import_Euros` de l'Ajuntament s'han contrastat **un a un** amb els de l'INE
  (taula 30896, secció, 2023): **0 discrepàncies de 1.068**. Confirma que és
  exactament la mateixa dada.
- El `Codi_Barri` es normalitza a dos dígits (`"01"`…`"73"`) per casar amb
  `codi_barri` de `bcn-barris.geojson` i `bcn-barris-poblacio.json`.
- La suma de la població de les 1.068 seccions és **1.613.579**, **idèntica** a la
  població que l'INE publica per al municipi 08019 el 2023. Cap secció perduda ni
  duplicada.

### Mètode d'agregació

| Camps | Ponderació | És exacte? |
|---|---|---|
| `renda_persona_eur`, `renda_bruta_persona_eur`, `edat_mitjana`, `pct_menors_18`, `pct_65_mes`, `pct_poblacio_espanyola` | **població de la secció** (INE, taula 30904, 2023) | Sí. La mitjana per persona d'una unió de seccions és la mitjana ponderada per població de les mitjanes de cada secció |
| `renda_llar_eur`, `renda_bruta_llar_eur`, `pct_llars_unipersonals`, `mida_mitjana_llar` | **nombre de llars de la secció** = població ÷ mida mitjana de la llar | Sí en la fórmula, però la mida mitjana ve arrodonida a 1 decimal, cosa que introdueix soroll |
| `poblacio_adrh_2023` | suma directa | Sí |
| `gini`, `p80_p20` | — | **No s'agreguen: es deixen a `null` als 73 barris** |

**Per què `gini` i `p80_p20` són `null` a tots els barris:** la desigualtat d'una unió
de seccions **no** és la mitjana de les desigualtats de cada secció (s'hi perd tota la
desigualtat *entre* seccions, que en un barri com Sarrià o el Raval és justament la
part gran). L'INE no publica el Gini per barri i calcular-lo requeriria les
microdades. Posar-hi una mitjana ponderada seria inventar-se el valor, i per tant no
s'ha fet.

### Validació de l'agregació

Reagregant els 73 barris fins al conjunt de la ciutat i comparant amb la xifra que
l'INE publica directament per al municipi 08019:

| Camp | Reagregat des dels barris | Publicat per l'INE | Desviació |
|---|---|---|---|
| `poblacio_adrh_2023` | 1.613.579 | 1.613.579 | **0,00 %** |
| `pct_poblacio_espanyola` | 77,58 | 77,60 | −0,02 % |
| `pct_llars_unipersonals` | 32,48 | 32,50 | −0,06 % |
| `edat_mitjana` | 44,32 | 44,30 | +0,04 % |
| `pct_65_mes` | 21,54 | 21,50 | +0,21 % |
| `pct_menors_18` | 14,13 | 14,10 | +0,24 % |
| `renda_persona_eur` | 19.432 | 19.527 | −0,49 % |
| `renda_llar_eur` | 47.056 | 47.361 | −0,64 % |
| `renda_bruta_persona_eur` | 25.308 | 25.597 | −1,13 % |
| `renda_bruta_llar_eur` | 61.280 | 62.085 | −1,30 % |

Les desviacions venen de l'arrodoniment amb què l'INE publica cada secció (euros
sencers, percentatges a 1 decimal, mida de la llar a 1 decimal). **Cap camp es desvia
més de l'1,3 %.** Els valors per barri s'han de llegir com a bons per ordenar i
per pintar un mapa, no com a xifra oficial al cèntim.

### Camps auxiliars del JSON de barris

- `n_seccions`: seccions censals que formen el barri (de 1 a 40).
- `n_seccions_amb_renda`: seccions amb dada de renda publicada. **1.068 de 1.068**
  a tota la ciutat: cap barri té forats.

---

## 4. Comprovacions de coherència (municipis)

Ordre de la renda neta mitjana per llar, 2023:

| | Municipi | `renda_llar_eur` | `renda_persona_eur` | `ist` |
|---|---|---|---|---|
| 1r | Matadepera | 85.692 | 26.720 | 130,1 |
| 2n | Sant Cugat del Vallès | 74.951 | 24.748 | 123,0 |
| 3r | Cabrils | 72.705 | 24.186 | 120,1 |
| 4t | Alella | 72.328 | 25.382 | 120,3 |
| 5è | Sant Just Desvern | 67.583 | 25.286 | 123,9 |
| 21è | Castelldefels | 51.814 | 18.693 | 107,9 |
| 42è | Barcelona | 47.361 | 19.527 | 106,5 |
| 89è | Sant Adrià de Besòs | 36.148 | 13.268 | 87,1 |
| 91è | Santa Coloma de Gramenet | 34.161 | 12.584 | 81,4 |
| 92è | **Badia del Vallès** | **32.123** | 12.664 | 85,3 |

Coincideix amb el que s'espera de l'àrea: Matadepera, Sant Cugat, Cabrils, Alella i
Sant Just Desvern a dalt; Badia del Vallès, Santa Coloma i Sant Adrià a baix.
Barcelona ciutat queda al mig de la taula (42è de 92) perquè la mitjana municipal
barreja Pedralbes amb Ciutat Meridiana.

Als barris, l'ordre és el conegut: **les Tres Torres** (97.423 €/llar) i **Pedralbes**
(92.217 €) a dalt; **Can Peguera** (27.576 €), **la Trinitat Nova** (29.170 €) i
**Ciutat Meridiana** (29.283 €) a baix. La forquilla entre barris de Barcelona (×3,5)
és més ampla que la forquilla entre municipis (×2,7).

---

## 5. Com regenerar

```bash
cd data-src
python3 build_indicadors.py
```

El script descarrega tot el que necessita a `/tmp/indicadors-cache/` i el reutilitza
en execucions posteriors (esborra aquest directori per forçar una descàrrega nova).
Baixa ~75 MB. No fa servir cap credencial ni cap API de pagament.

**Per actualitzar a un any nou de l'ADRH** n'hi ha prou de canviar la constant
`ANY_ADRH` del script; els CSV de l'INE porten tota la sèrie 2015-2023 a dins, de
manera que també es pot generar qualsevol any anterior sense tornar a descarregar res.
