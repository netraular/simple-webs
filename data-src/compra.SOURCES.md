# `compra.json` i `compra-bcn-barris.json` — fonts de dades

Generat el **2026-09-21** amb `build_compra.py` (d'aquest mateix directori).

Preu de **compra** d'habitatge en **€/m² construït** als municipis de l'entorn de
Barcelona, i per districte i barri de Barcelona ciutat.

**Resultat:**

| Fitxer | Contingut | Període |
|---|---|---|
| `compra.json` | **89 municipis** amb dada (de 92 a `municipis.json`) | **gener – desembre 2025** |
| `compra-bcn-barris.json` | **10 districtes** + **70 barris** (de 73) de Barcelona | **gener – desembre 2025** |

Cap preu és inventat, estimat, interpolat ni convertit. Tots els valors venen
literalment d'una de les fonts d'aquí sota. Els municipis i barris sense preu
publicat **no s'inclouen**: es llisten a `meta.sense_dada` i
`meta.exclosos_sense_dada` amb el motiu.

---

## 1. Font principal — Generalitat de Catalunya (compravendes registrades)

**Secretaria d'Habitatge i Inclusió Social**, *Estadística de compravendes
d'habitatge registrades i preu de venda*. L'origen primari de les dades és el
**Col·legi de Registradors de la Propietat**: són **operacions realment
inscrites al Registre de la Propietat**, no ofertes ni taxacions.

### Pàgines de descàrrega (landing pages)

- Índex de l'estadística:
  <https://habitatge.gencat.cat/ca/dades/indicadors_estadistiques/estadistiques_de_construccio_i_mercat_immobiliari/estadistica-de-les-compravendes/>
- Sèrie **Catalunya / per municipis**, any 2025:
  <https://habitatge.gencat.cat/ca/dades/indicadors_estadistiques/estadistiques_de_construccio_i_mercat_immobiliari/estadistica-de-les-compravendes/compravendes-habitatges-Catalunya/2025/>
- Sèrie **Barcelona ciutat** (districtes i barris):
  <https://habitatge.gencat.cat/ca/dades/indicadors_estadistiques/estadistiques_de_construccio_i_mercat_immobiliari/estadistica-de-les-compravendes/compravendes-habitatges-Barcelona/>
- Metodologia:
  <https://habitatge.gencat.cat/ca/dades/indicadors_estadistiques/estadistiques_de_construccio_i_mercat_immobiliari/estadistica-de-les-compravendes/metodologia/>

### Fitxers XLSX utilitzats (URLs exactes)

Municipis (→ `compra.json`):

```
https://habitatge.gencat.cat/web/.content/home/dades/estadistiques/01_Estadistiques_de_construccio_i_mercat_immobiliari/02_Compravenda_i_preu_de_venda/02_Compravendes_d_habitatges_registrades_i_el_preu_de_venda/2025/MUN_acum1any_2025.xlsx
```

Barcelona ciutat, habitatge usat (→ `compra-bcn-barris.json`):

```
https://habitatge.gencat.cat/web/.content/home/dades/estadistiques/01_Estadistiques_de_construccio_i_mercat_immobiliari/02_Compravenda_i_preu_de_venda/02_Compravendes_d_habitatges_registrades_i_el_preu_de_venda/2025/BCN_usat_acum1any_2025.xlsx
```

Full utilitzat en tots dos casos: **`4t25acum_1any`** (acumulat dels quatre
trimestres, tancat al 4t trimestre de 2025). El propi full declara el període:
*«Període: gener 2025 - desembre 2025»*.

> **Aquest és el període més recent publicat.** Les URLs equivalents per a 2026
> (`.../2026/MUN_acum1any_2026.xlsx`, `BCN_usat_acum1any_2026.xlsx`) retornen
> **404** a data de 2026-09-21.

### Definició exacta de la mètrica

`compra_eur_m2` = columna **«Preu / m2 construït → Habitatge usat»**.

- **Habitatge usat = segona mà.** És la mètrica demanada.
- Denominador: **m² construïts** (superfície construïda, no útil).
- És una mitjana ponderada sobre les compravendes registrades del període.
- Els fitxers també donen obra nova, que es conserva a part com a
  `compra_eur_m2_obra_nova`, i el conjunt com a `compra_eur_m2_tots_els_habitatges`.

### Camps de `compra.json` i procedència

| Camp | Origen | Notes |
|---|---|---|
| `codi_ine` | `municipis.json` (i columna «Codi» del XLSX, que ja és l'INE de 5 xifres) | string de 5 xifres |
| `nom` | `municipis.json` | nom oficial en català, coherent amb la resta del projecte |
| `compra_eur_m2` | XLSX, «Preu / m2 construït → Habitatge usat» | **€/m², segona mà** |
| `nombre_operacions` | XLSX, «Nre. Compravendes → Habitatge usat» | mida de la mostra |
| `superficie_mitjana_m2` | XLSX, «Superfície mitjana (m2 construïts) → Habitatge usat» | |
| `compra_eur_total` | XLSX, «Preu total (milers d'euros) → Habitatge usat` × 1000 | preu mitjà **de l'immoble sencer**, en € |
| `compra_eur_m2_obra_nova` | XLSX, «Preu / m2 construït → Habitatge nou» | obra nova, a part |
| `compra_eur_m2_tots_els_habitatges` | XLSX, «Preu / m2 construït → Total» | nou + usat |
| `nombre_operacions_total` | XLSX, «Nre. Compravendes → Total» | |
| `dist_bcn_km`, `comarca` | `municipis.json` | no recalculat aquí |
| `periode`, `any` | capçalera del full | `"gener 2025 - desembre 2025"`, `2025` |
| `font`, `font_url` | — | constants |
| `nota` | nota al peu del full, quan n'hi ha | vegeu Cervelló |
| `valor_tasat_ministeri` | font 2 (creuament) | `null` si no n'hi ha |

`compra_eur_total` és el **preu mitjà de l'immoble sencer** que publica la font,
no una conversió feta aquí. `compra_eur_m2` **no** s'ha derivat dividint
`compra_eur_total` per la superfície: totes dues xifres vénen de columnes
diferents del mateix full.

### Camps de `compra-bcn-barris.json`

Mateixa mètrica (habitatge usat, €/m² construït) i mateix període. A més:
`compra_eur_m2_maxim` i `compra_eur_m2_minim`, que són el màxim i el mínim
observats entre les operacions individuals d'aquell districte o barri (són
valors extrems reals, sovint atípics: p. ex. 198 €/m² o 23.142 €/m²).

`codi` és el **codi oficial de districte (1-10) o de barri (1-73) de
l'Ajuntament de Barcelona**, no un codi INE.

---

## 2. Font de creuament — Ministerio (valor tasat)

**Ministerio de Transportes y Movilidad Sostenible / Ministerio de Vivienda y
Agenda Urbana**, *Boletín Estadístico Online*, capítol «Valor tasado de la
vivienda», **taula 4: «Valor tasado de vivienda libre de los municipios mayores
de 25.000 habitantes»**.

- Índex del capítol: <https://apps.fomento.gob.es/BoletinOnline2/?nivel=2&orden=35000000>
- Fitxer XLS: <https://apps.fomento.gob.es/BoletinOnline2/sedal/35103500.XLS>
- Full utilitzat: **`T2A2026`** → *«Segundo trimestre de 2026»*, unitat declarada
  al full: **euros/m²**. És el trimestre més recent del fitxer (86 fulls, des de
  2005).

> La pàgina institucional que indexa aquesta estadística
> (`transportes.gob.es/.../vivienda/precios-vivienda`) retorna **403** a peticions
> automatitzades; el fitxer es descarrega directament del Boletín Estadístico.

Es guarda dins l'objecte `valor_tasat_ministeri` de cada municipi, **mai com a
`compra_eur_m2`**, perquè **no és el mateix indicador**:

- És un **valor de taxació pericial** (Ordre ECO/805/2003) encarregada
  majoritàriament per a la concessió d'hipoteques, **no un preu de transacció**.
- `eur_m2_mes_de_5_anys_antiguitat` és l'aproximació a «segona mà» d'aquesta font
  (l'altra columna, «hasta cinco años», és pràcticament obra nova).
- `nombre_tasacions_*` és la mida de mostra.

### Concordança entre les dues fonts

30 dels 89 municipis tenen les dues fonts. La ràtio mitjana
registradors ÷ taxació és **1,015** (les dues fonts difereixen menys d'un 2 % de
mitjana), amb desviacions extremes de **−10,4 %** (Montcada i Reixac) i
**+15,5 %** (Gavà). És una validació creuada independent i molt bona.

---

## 3. Univers de municipis

L'univers és exactament el de **`municipis.json`** d'aquest directori: els **92
municipis** amb el cap de municipi a **32 km o menys** de la plaça de Catalunya.
`codi_ine`, `nom` i `dist_bcn_km` es reutilitzen d'allà sense recalcular, de
manera que els fitxers es poden creuar directament per `codi_ine`.

---

## 4. Limitacions — llegiu-les

1. **Cobertura de la font principal:** el fitxer declara *«Compravendes
   d'habitatge registrades als municipis de més de 2.000 habitants»* (358
   municipis de Catalunya). Per això falten **3** dels 92 municipis de
   referència:

   | Municipi | Població | Motiu |
   |---|---|---|
   | Santa Maria de Martorelles | 867 | < 2.000 habitants |
   | Òrrius | 814 | < 2.000 habitants |
   | la Palma de Cervelló | 3.059 | nota (2) del full: *«la informació de la Palma de Cervelló està integrada a Cervelló»* |

   El valor de **Cervelló** (`08068`) inclou, doncs, la Palma de Cervelló. Queda
   registrat al camp `nota` d'aquell municipi.

2. **Cobertura de la font de creuament:** el Ministerio **només publica
   municipis de més de 25.000 habitants**, i amb un padró de referència
   endarrerit: **Molins de Rei** (27.291 hab) i **Castellar del Vallès** (25.395
   hab) superen el llindar però encara **no** surten a la taula. En total, 30
   dels 89 municipis tenen creuament.

3. **Períodes diferents:** la mètrica principal és **anual 2025** i el creuament
   és **2T 2026**. No són directament comparables en el temps.

4. **Mostres petites.** 4 municipis tenen menys de 30 operacions registrades
   (Castellví de Rosanes 16, Vallromanes 29, Olesa de Bonesvalls 29, Subirats
   29). Amb mostres així el preu mitjà és molt volàtil. Useu
   `nombre_operacions` per filtrar o per ponderar.

5. **Barris de Barcelona:** 3 dels 73 barris s'han exclòs perquè la font no
   publica preu (mostra insuficient): **la Clota** i **Can Peguera** («n.d.», 1
   operació cadascun) i **Baró de Viver** (0). A més, nota de la font: *«El total
   de Barcelona no és la suma dels districtes o barris, hi ha alguns habitatges
   que no s'han pogut geolocalitzar»*.

6. **m² construïts, no útils.** Comparar aquests €/m² amb preus expressats en
   superfície útil els infraestima aproximadament un 15-20 %.

7. **Preu registrat ≠ preu d'oferta.** Aquestes xifres són el que s'ha escripturat,
   sistemàticament per sota dels preus demanats als portals immobiliaris.

---

## 5. Fonts provades que **no** servien

Es deixa constància per no tornar-hi.

| Font | Resultat |
|---|---|
| **Socrata / dades obertes Generalitat** — `analisi.transparenciacatalunya.cat`, cerques `compravenda`, `preu habitatge`, `venda`, `habitatge` al catàleg (`/api/catalog/v1?q=...`) | **No hi ha cap dataset de preu de compra.** Només **lloguer**: `qww9-bvhh` (preu mitjà de lloguer per municipi), `hepw-33ik`, `2qex-hzb5`. El dataset `8aaj-ypcb` (Observatori del Territori) té `_12_hab_preu_mig_lloguer`, també lloguer. |
| **IDESCAT EMEX** — `https://api.idescat.cat/emex/v1/dades.json?id=080193` | Té construcció, habitatges iniciats/acabats i règim de tinença, però **cap indicador de preu de compra**. |
| **Ministerio, web institucional** — `transportes.gob.es/.../vivienda/precios-vivienda` i `mivau.gob.es` | **403** (WAF) i **404** respectivament. Les dades s'han obtingut pel Boletín Estadístico Online (§2). |
| **Open Data Ajuntament de Barcelona** — dataset `habitatges-2na-ma` | Preu **d'oferta** d'Idealista per barri, i la sèrie **s'atura el 2015**. Descartat a favor de la font de la Generalitat, que és preu registrat i arriba al 2025. |
| **INE — Índice de Precios de Vivienda** | És un **número índex** (base 100), no €/m². No serveix. |

---

## 6. Com es reprodueix

`build_compra.py` no descarrega res: espera els fitxers ja baixats a `$WORK`
(per defecte `/tmp`).

```bash
cd /tmp
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36'
B='https://habitatge.gencat.cat/web/.content/home/dades/estadistiques/01_Estadistiques_de_construccio_i_mercat_immobiliari/02_Compravenda_i_preu_de_venda/02_Compravendes_d_habitatges_registrades_i_el_preu_de_venda/2025'

curl -sL -A "$UA" "$B/MUN_acum1any_2025.xlsx"      -o g_MUN_acum1any_2025.xlsx
curl -sL -A "$UA" "$B/BCN_usat_acum1any_2025.xlsx" -o f_BCN_usat_acum1any_2025.xlsx
curl -sL -A "$UA" 'https://apps.fomento.gob.es/BoletinOnline2/sedal/35103500.XLS' -o vt_mun.xls

python3 -m pip install openpyxl xlrd        # xlrd ≥2.0 llegeix .xls; openpyxl, .xlsx
WORK=/tmp python3 /ruta/a/data-src/build_compra.py
```

L'script imprimeix un resum i una comprovació de cordura.

---

## 7. Comprovació de cordura (sortida de l'script)

`compra_eur_m2`, habitatge usat, 2025:

| Municipi | €/m² | operacions | valor tasat Min. (2T 2026) |
|---|---:|---:|---:|
| Barcelona | 4.748,1 | 14.515 | 4.594,6 |
| Sant Cugat del Vallès | 5.340,2 | 598 | 4.987,7 |
| Castelldefels | 4.665,4 | 672 | 4.326,6 |
| Mataró | 2.540,3 | 1.457 | 2.511,8 |
| Sabadell | 2.359,5 | 2.119 | 2.368,6 |
| Terrassa | 2.097,3 | 3.838 | 2.248,0 |

Barcelona dins de 4.000–4.900, Sant Cugat per sobre de Barcelona, Terrassa i
Sabadell clarament per sota: tot quadra amb el que s'esperava.

Rang global: **1.524,3 €/m²** (Subirats) – **5.340,2 €/m²** (Sant Cugat del
Vallès). Total d'operacions de segona mà cobertes: **45.571**.

A `compra-bcn-barris.json`, extrems per barri: **Pedralbes 7.491,4 €/m²** i
**Ciutat Meridiana 1.896,0 €/m²**.
