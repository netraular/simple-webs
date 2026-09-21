# `lloguer.json` i `lloguer-bcn-barris.json` — fonts de dades

Preus **oficials de lloguer** d'habitatge als municipis de l'entorn de Barcelona i,
a part, per districte i barri de la ciutat de Barcelona.

Totes les xifres provenen del **Registre de fiances de lloguer de l'INCASÒL**
(Institut Català del Sòl, Departament d'Habitatge de la Generalitat de Catalunya).
És una estadística de **caràcter censal**: no és una mostra d'anuncis ni una
estimació, sinó el recompte de **tots** els contractes de lloguer d'habitatge la
fiança dels quals s'ha dipositat a l'INCASÒL en el període.

**Període: 2026T1 (gener–març de 2026).** És el trimestre complet més recent
publicat a data de 2026-09-21. Els trimestres posteriors encara no hi són.

**Cap valor no està estimat, imputat ni interpolat.** Els municipis i barris sense
dada publicada s'exclouen i es llisten dins del JSON (`meta.sense_dada`,
`meta.exclosos_sense_dada`).

---

## 1. Font de `lloguer.json` — Socrata (dades obertes de la Generalitat)

- **Dataset:** «Preu mitjà del lloguer d'habitatges per municipi»
- **Resource id:** `qww9-bvhh`
- **Domini:** `analisi.transparenciacatalunya.cat`
- **Pàgina del dataset:**
  <https://analisi.transparenciacatalunya.cat/Habitatge/Preu-mitj-del-lloguer-d-habitatges-per-municipi/qww9-bvhh>
- **Esquema (metadades):**
  <https://analisi.transparenciacatalunya.cat/api/views/qww9-bvhh.json>
- **Crida exacta a l'API que s'ha fet servir:**

  ```
  https://analisi.transparenciacatalunya.cat/resource/qww9-bvhh.json?$limit=5000&$where=any%3D2026%20AND%20periode%3D'gener-mar%C3%A7'
  ```

  (sense URL-encoding: `$where=any=2026 AND periode='gener-març'`) → **686 files**,
  una per municipi de Catalunya present al fitxer del trimestre.

- **Llicència:** dades obertes de la Generalitat de Catalunya.

### Definició exacta de cada columna de l'origen

Descripcions literals de les metadades del dataset:

| Columna origen | Tipus | Definició oficial |
|---|---|---|
| `ambit_territorial` | text | Àmbit territorial: municipal. Valor únic `Municipi`. |
| `codi_territorial` | text | Municipi: **codi INE, camp de text de 5 dígits** (amb zeros a l'esquerra). |
| `nom_territori` | text | Nom del municipi. |
| `any` | number | Any de l'alta de la fiança de lloguer al Registre de fiances de l'INCASÒL. |
| `periode` | text | Abast temporal del període. Valors trimestrals (`gener-març`, `abril-juny`, `juliol-setembre`, `octubre-desembre`) **i acumulats** (`gener-juny`, `gener-setembre`, `gener-desembre`). |
| `habitatges` | number | **Nombre de contractes** que s'han donat d'alta al Registre de fiances en el període considerat. |
| `renda` | number | **Import del lloguer mensual mitjà** (euros/mes). Dades anonimitzades (buides) per a municipis amb **menys de 6 habitatges registrats**. |
| `tram_preus` | text | Tram de preus en què cau la renda mitjana. No s'ha fet servir. |

> ⚠️ **Compte amb `periode`.** El dataset barreja trimestres i acumulats de l'any en
> el mateix fitxer. Filtrar només per `any` duplicaria municipis i barrejaria
> agregats de 3, 6, 9 i 12 mesos. Cal filtrar **sempre** també per `periode`.
> Aquí s'ha agafat el **trimestre solt** `gener-març`, no l'acumulat.

### Camps de `lloguer.json` i procedència

`lloguer.json` és un objecte `{ "meta": {...}, "municipis": [...] }`.

| Camp | Procedència |
|---|---|
| `codi_ine` | `codi_territorial` (5 dígits, zeros a l'esquerra). |
| `nom` | Nom oficial pres de `municipis.json` (mateixa grafia que la resta del projecte). |
| `lloguer_mitja_eur_mes` | `renda`, arrodonit a 2 decimals. **Euros/mes.** |
| `lloguer_eur_m2_mes` | **`null` sempre.** Aquest dataset no publica superfície ni preu per m². Vegeu §4. |
| `nombre_contractes` | `habitatges`. Mida de la mostra del trimestre. |
| `metrica` | Text fix descrivint la mètrica. |
| `periode` / `any` | `"2026T1"` / `2026`, derivats de `periode='gener-març'` + `any=2026`. |
| `font` / `font_url` | Text fix + la URL de l'API de dalt. |
| `dist_bcn_km`, `comarca` | Còpia de `municipis.json` (no provenen de l'INCASÒL). |

---

## 2. Font de `lloguer-bcn-barris.json` — Portal Barcelona Dades

Ni el Socrata de la Generalitat ni el CKAN d'`opendata-ajuntament.barcelona.cat`
publiquen el lloguer per barri. Sí que ho fa el **Portal Barcelona Dades** de
l'Oficina Municipal de Dades, que redifon **la mateixa estadística de l'INCASÒL**
desagregada a districte i barri.

- **Indicador:** «Preu mitjà (€) del lloguer d'habitatges»
- **Indicator id:** `b37xv8wcjh`
- **Pàgina:** <https://portaldades.ajuntament.barcelona.cat/ca/estad%C3%ADstiques/b37xv8wcjh>
- **Font declarada a l'indicador:** «Generalitat de Catalunya. Secretaria
  d'habitatge, a partir de les fiances de lloguer dipositades a l'INCASÒL».
- **Llicència:** CC BY 4.0.
- **Descàrrega exacta (CSV, 5.944 files, sèrie 2000→2026T1):**

  ```
  https://portaldades.ajuntament.barcelona.cat/services/backend/rest/statistic/export?id=b37xv8wcjh&fileformat=CSV&lang=ca
  ```

  L'API demana la capçalera del client públic del portal:

  ```
  X-IBM-Client-Id: ecde3a3261b6b4ce6ce300f1ba7cf0f5
  ```

  (el clientId és públic: es llegeix de
  <https://portaldades.ajuntament.barcelona.cat/portal/config/apimanagerconsumercredentials.json>).
  `fileformat` accepta `CSV` o `EXCEL`, **en majúscules**.

### Definició de cada columna de l'origen

| Columna CSV | Definició |
|---|---|
| `Dim-00:TEMPS` | Inici del període, en ISO. `2026-01-01T00:00:00Z` = 2026T1. |
| `Dim-01:TERRITORI` | Nom del territori. |
| `Dim-01:TERRITORI (order)` | **Codi oficial** del territori: districte 1–10, barri 1–73 de l'Ajuntament de Barcelona. Verificat contra la nomenclatura oficial (18 Sants, 25 Sant Gervasi - la Bonanova, 43 Horta, 48 la Guineueta…). |
| `Dim-01:TERRITORI (type)` | `Barri`, `Districte`, `Municipi`, `Àmbit Funcional Territorial`, `Comunitat Autònoma`. |
| `TIME_TYPE` | `Trimestre` o `Any`. **S'ha filtrat `Trimestre`.** |
| `VALUE` | Renda mitjana mensual en euros. |

Filtre aplicat: `Dim-00:TEMPS == 2026-01-01T00:00:00Z` **i** `TIME_TYPE == Trimestre`.

> ⚠️ A `2026-01-01` hi ha files amb `TIME_TYPE=Any` amb el mateix valor, perquè de
> moment només hi ha un trimestre de l'any. En anys tancats `Any` és l'acumulat
> anual i **no** coincideix amb T1. Cal filtrar per `TIME_TYPE` sempre.

### Camps de `lloguer-bcn-barris.json`

Objecte `{ "meta": {...}, "ciutat": {...}, "districtes": [...], "barris": [...] }`.

| Camp | Procedència |
|---|---|
| `codi` | `Dim-01:TERRITORI (order)`. Codi oficial de districte (1–10) o barri (1–73). **No és codi INE.** |
| `nom` | `Dim-01:TERRITORI`. |
| `codi_districte` / `districte` (només a `barris`) | Derivats del codi de barri pels trams oficials (1–4 Ciutat Vella, 5–10 Eixample, 11–18 Sants-Montjuïc, 19–21 Les Corts, 22–27 Sarrià-Sant Gervasi, 28–32 Gràcia, 33–43 Horta-Guinardó, 44–56 Nou Barris, 57–62 Sant Andreu, 63–73 Sant Martí). |
| `lloguer_mitja_eur_mes` | `VALUE`, arrodonit a 2 decimals. |
| `lloguer_eur_m2_mes` | **`null` sempre.** L'indicador no en publica. |
| `nombre_contractes` | **`null`** a districtes i barris (la font no en publica la mostra). A `ciutat` sí: 8.156, pres de `qww9-bvhh`. |

---

## 3. Univers de municipis

`lloguer.json` fa servir el **mateix univers que `municipis.json` i `compra.json`**:
92 municipis amb el cap de municipi a 32 km o menys de la plaça de Catalunya. Així
els tres fitxers es poden creuar directament per `codi_ine`.

- **84 municipis amb renda publicada** (de 92).
- **8 sense dada**, tots per mostra insuficient (menys de 6 contractes al
  trimestre, la font anonimitza la renda): Santa Maria de Martorelles (4),
  Lliçà de Vall (5), Castellví de Rosanes (3), Ullastrell (2), Òrrius (2),
  Olesa de Bonesvalls (1), Olivella (2) i Vallromanes (ni tan sols apareix al
  fitxer del trimestre). Es llisten a `meta.sense_dada` amb el motiu.

Nota: el filtre original de l'encàrrec (35 km del cap de municipi de Barcelona)
donava 105 municipis, un **superconjunt** dels 92. S'ha retallat a l'univers del
projecte per coherència. Els 13 extres eren: Sitges, Vacarisses, Masquefa,
Sant Sadurní d'Anoia, Avinyonet del Penedès, Bigues i Riells del Fai, Gallifa,
Llinars del Vallès, Sant Andreu de Llavaneres, Sant Feliu de Codines,
Sant Llorenç Savall, l'Ametlla del Vallès i la Garriga.

---

## 4. Limitacions — llegiu-les

1. **No hi ha €/m²/mes enlloc.** Ni el dataset municipal de l'INCASÒL ni
   l'indicador de barris publiquen la superfície mitjana dels habitatges
   llogats, per tant `lloguer_eur_m2_mes` és `null` a **tots** els registres.
   No s'ha inventat cap divisió. (L'INCASÒL sí que publica superfícies en
   informes PDF/XLSX del seu web, però no en aquestes APIs.)

2. **La mostra trimestral és petita a molts municipis.** Barcelona té 8.156
   contractes al trimestre, però **46 dels 84 municipis amb dada en tenen menys
   de 50** (i 27 en tenen menys de 20). Amb
   mostres així la mitjana oscil·la molt d'un trimestre a l'altre i pot estar
   dominada per un grapat de contractes atípics. Feu servir sempre
   `nombre_contractes` per ponderar la fiabilitat; per a municipis petits és
   millor l'acumulat anual (`periode='gener-desembre'`) que el trimestre.

3. **És renda de contractes nous, no del parc llogat.** Només compta els
   contractes donats d'alta al període, que tendeixen a ser més cars que els
   contractes vigents antics.

4. **Només contractes amb fiança dipositada.** El dipòsit és obligatori, però el
   lloguer d'habitació, el de temporada i l'economia submergida hi queden fora
   o hi entren de manera irregular.

5. **Mitjana simple, no mediana.** `renda` és la mitjana aritmètica; els lloguers
   molt alts la tiben cap amunt.

6. **Barcelona ciutat: 4 barris sense dada** al trimestre (secret estadístic /
   mostra insuficient): la Clota (42), Torre Baró (54), Vallbona (56) i
   Baró de Viver (58). Queden 69 barris de 73 i els 10 districtes.

7. **El total de ciutat no és la mitjana dels districtes** (no està ponderat al
   fitxer); feu servir el valor de `ciutat`.

---

## 5. Fonts provades que **no** servien

- `opendata-ajuntament.barcelona.cat` (CKAN, 555 datasets): **no** té cap dataset
  de lloguer per barri. Els únics resultats amb «lloguer» són `lloguer-de-vehicles`
  i `manteniment-lloguer` (esforç econòmic, no preus).
- `hepw-33ik` «Preu mitjà del lloguer d'habitatges per àmbits supramunicipals»:
  només `Comarca`, `Província`, `AFT` i `Catalunya`. Cap districte ni barri.
- `2qex-hzb5` (portal de dades obertes de L'Hospitalet): el domini `opendata.l-h.cat`
  redirigeix a la seu electrònica; l'API ja no respon.
- Endpoint `/services/backend/rest/search` del Portal Barcelona Dades sense la
  capçalera `X-IBM-Client-Id`: retorna `401 Unauthorized`.

---

## 6. Comprovació de cordura

| Territori | 2026T1 (€/mes) | Contractes |
|---|---|---|
| **Barcelona** | **1.137,35** | 8.156 |
| Sant Cugat del Vallès | 1.475,84 | 334 |
| Terrassa | 764,74 | 749 |
| Mataró | 812,47 | 492 |
| Badalona | 978,24 | 616 |
| Sabadell | 869,25 | 708 |
| Granollers | 825,81 | 223 |
| Badia del Vallès (mínim) | 517,80 | 10 ⚠️ mostra molt petita |
| Alella (màxim) | 1.797,56 | 21 ⚠️ mostra molt petita |
| Catalunya (referència) | 861,23 | — |
| Àmbit Metropolità de Barcelona (referència) | 1.004,52 | — |

Barcelona cau dins de la forquilla esperada de 1.100–1.300 €/mes. ✔

**Creuament entre les dues fonts:** el valor de Barcelona ciutat de l'indicador
municipal de Socrata (`1137.35376410005`) i el del Portal Barcelona Dades
(`1137.35376410005`) són **idèntics fins a l'últim decimal**, cosa que confirma
que les dues descàrregues són la mateixa estadística de l'INCASÒL. ✔

Districtes de Barcelona, 2026T1 (€/mes): Sarrià-Sant Gervasi 1.599,89 ·
Les Corts 1.289,35 · Eixample 1.250,44 · Sant Martí 1.100,03 · Gràcia 1.081,25 ·
Ciutat Vella 1.011,41 · Sants-Montjuïc 1.007,64 · Sant Andreu 934,50 ·
Horta-Guinardó 929,60 · Nou Barris 816,57. Ordre i magnituds coherents. ✔

Barris extrems: Pedralbes 2.209,45 (màxim) i Can Peguera 398,55 (mínim; barri de
«cases barates» amb habitatges molt petits i renda antiga). ✔

---

## 7. Com es reprodueix

```bash
# 1) Municipis (Socrata, INCASÒL)
curl -s -G "https://analisi.transparenciacatalunya.cat/resource/qww9-bvhh.json" \
  --data-urlencode '$limit=5000' \
  --data-urlencode "\$where=any=2026 AND periode='gener-març'" -o rent2026T1.json

# 2) Barcelona per districte i barri (Portal Barcelona Dades)
curl -s -G "https://portaldades.ajuntament.barcelona.cat/services/backend/rest/statistic/export" \
  --data-urlencode "id=b37xv8wcjh" \
  --data-urlencode "fileformat=CSV" \
  --data-urlencode "lang=ca" \
  -H "X-IBM-Client-Id: ecde3a3261b6b4ce6ce300f1ba7cf0f5" -o lloguer_bcn.csv
```

Per saber quin és el trimestre complet més recent disponible:

```bash
curl -s -G "https://analisi.transparenciacatalunya.cat/resource/qww9-bvhh.json" \
  --data-urlencode '$select=any,periode,count(1) as n,count(renda) as amb_renda' \
  --data-urlencode '$where=any>=2025' \
  --data-urlencode '$group=any,periode' --data-urlencode '$limit=50'
```

Un trimestre es considera complet quan `amb_renda` és de l'ordre de 320–350
(el valor habitual per a un trimestre solt a tot Catalunya). 2026T1 en té 326. ✔
