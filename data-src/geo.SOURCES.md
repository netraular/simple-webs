# Fonts de les dades geogràfiques i de preus

Generat el 2026-09-21. Tots els fitxers de sortida són **EPSG:4326 (WGS84, graus lon/lat)**,
llestos per a Leaflet.

| Fitxer | Features | Bytes | Bytes gzip |
|---|---:|---:|---:|
| `municipis.geojson` | 121 | 698 658 | 197 841 |
| `bcn-barris.geojson` | 73 | 272 330 | 59 452 |
| `bcn-barris-preus.json` | 73 | 13 916 | 2 237 |

Comprovacions: `python3 data-src/check_geo.py`
Reconstrucció dels municipis: `python3 data-src/build_municipis.py` (baixa el WFS si cal) + mapshaper.

---

## 1. `municipis.geojson` — municipis a ≤ 35 km de Plaça de Catalunya

**Font:** Institut Cartogràfic i Geològic de Catalunya (ICGC), geoservei WFS de divisions
administratives, capa `divisions_administratives_municipis_50000` (base municipal 1:50.000).

URL exacta de descàrrega:

```
https://geoserveis.icgc.cat/servei/catalunya/divisions-administratives/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=divisions_administratives_wfs:divisions_administratives_municipis_50000&outputFormat=GEOJSON&srsName=EPSG:4326
```

GetCapabilities: <https://geoserveis.icgc.cat/servei/catalunya/divisions-administratives/wfs?service=WFS&request=GetCapabilities&version=2.0.0>
Pàgina del producte: <https://www.icgc.cat/ca/Descarregues/Cartografia-vectorial/Divisions-administratives>

- **Llicència:** CC BY 4.0 — atribució obligatòria: «Institut Cartogràfic i Geològic de Catalunya (ICGC)».
- **CRS original:** l'ICGC distribueix la base en **EPSG:25831** (ETRS89 / UTM 31N). Aquí s'ha
  demanat al WFS amb `srsName=EPSG:4326`, de manera que **el servidor ja retorna graus
  lon/lat**; no ha calgut reprojectar al nostre costat. Verificat: cap coordenada > 180.
- **Descarregat:** tot Catalunya, 947 municipis, 12,7 MB.

### Reparació d'anells (important)

El WFS de l'ICGC va sobre ArcGIS Server i **retorna GeoJSON estructuralment incorrecte**: cada
municipi surt com un `MultiPolygon` amb **un sol *part* que conté tots els anells barrejats**
(exteriors i forats). Com que GeoJSON diu que el primer anell d'un *part* és l'exterior i la
resta són forats, qualsevol lector estàndard descarta el contorn real. Barcelona, per exemple,
té 24 anells en un sol *part*: l'anell 0 és un retall de 5 punts i l'anell 21 (3.107 punts) és
el contorn de veritat → en llegir-ho, mapshaper deixava **Barcelona amb 5 punts** i Sitges amb 7.

Els anells *sí* que tenen l'orientació correcta (CCW = exterior, CW = forat), així que
`build_municipis.py` els reagrupa: cada anell CCW obre un polígon nou i cada anell CW s'assigna
com a forat a l'anell exterior més petit que el conté (*point-in-ring* per raycasting).

**Validació:** l'àrea reconstruïda es compara amb l'atribut `AREAM5000` que publica el mateix
ICGC per a cada municipi → **0 de 947 municipis es desvien més d'un 3 %**. Barcelona surt
102,0 km² (referència ICGC 101,8 km²).

### Selecció territorial

S'inclou tot municipi del qual **alguna part** cau a ≤ 35 km de Plaça de Catalunya
(41,3870 N / 2,1701 E), distància haversine calculada sobre la geometria **sense simplificar**
→ 121 municipis, de Sitges a Mataró i de Terrassa/Granollers al Garraf.

### Simplificació

```
npx mapshaper municipis_4326_raw.geojson -simplify 60% keep-shapes \
    -o precision=0.00001 format=geojson municipis.geojson
```

- Visvalingam (per defecte a mapshaper), **topologia preservada** → els límits compartits entre
  municipis veïns segueixen encaixant, sense forats ni solapaments.
- `keep-shapes`: cap polígon no desapareix.
- `precision=0.00001` ≈ 1,1 m, prou per a web.
- Vèrtexs: 56.257 → 36.205 (64 %). Barcelona passa de 4.025 a 1.942 punts; la línia de costa i
  la vall del Llobregat es mantenen perfectament llegibles.

### Propietats

`codi_ine` (5 dígits, string) · `nom` · `comarca`

`codi_ine` surt de l'atribut `CODIMUNI` de l'ICGC, que té **6 dígits** (codi INE de 5 + dígit de
control); s'agafen els 5 primers. Comprovat: Barcelona = `08019`.

---

## 2. `bcn-barris.geojson` — els 73 barris de Barcelona

**Font:** Open Data BCN (Ajuntament de Barcelona), dataset *Unitats administratives de la ciutat
de Barcelona* (`20170706-districtes-barris`), recurs `Unitats_Administratives_BCN.geojson`.

- Dataset: <https://opendata-ajuntament.barcelona.cat/data/ca/dataset/20170706-districtes-barris>
- Recurs: <https://opendata-ajuntament.barcelona.cat/data/dataset/808daafa-d9ce-48c0-925a-fa5afdb1ed41/resource/cd800462-f326-429f-a67a-c69b7fc4c50a/download>
- **Llicència:** CC BY 4.0.
- **Ull:** el recurs anunciat com a «GeoJSON» és en realitat un **ZIP** (`Content-Type:
  application/octet-stream`) que conté `0301100100_UNITATS_ADM_POLIGONS.json` (22,8 MB) i
  `..._PUNTS.json`.

- **CRS original: EPSG:25831** (ETRS89 / UTM 31N) — coordenades tipus `432115, 4590999`.
  **Reprojectat de veritat** amb mapshaper (PROJ intern):
  `mapshaper barris_25831.geojson -proj from=EPSG:25831 wgs84`.
  Verificat després: bbox lon 2,0523–2,2280 / lat 41,3170–41,4683, que és Barcelona ciutat.

- **Selecció:** el fitxer porta 1.501 polígons de tota mena d'unitats (1.068 seccions censals,
  233 AEB, 74 ZUA, 73 barris, 40 grans barris, 10 districtes, 1 terme municipal). S'han filtrat
  només els `TIPUS_UA == "BARRI"` → exactament **73**.

- **Simplificació:**
  ```
  npx mapshaper barris_4326.json -simplify 50% keep-shapes \
      -o precision=0.00001 format=geojson bcn-barris.geojson
  ```
  Validació: els 73 barris sumen **101,9 km²**, que quadra amb el municipi de Barcelona
  (101,8 km²) i amb el polígon 08019 de `municipis.geojson` (102,0 km²).

- **Propietats:** `codi_barri` (01–73) · `nom_barri` · `codi_districte` (01–10) · `nom_districte`.
  Els noms de districte s'han creuat pel camp `DISTRICTE` amb els 10 polígons `TIPUS_UA ==
  "DISTRICTE"` del mateix fitxer.

---

## 3. `bcn-barris-preus.json` — preus per barri

### Compra: `compra_eur_m2` — **disponible, any 2015**

**Font:** Open Data BCN, *Habitatges de segona mà a Barcelona* (`habitatges-2na-ma`) —
estimació del preu mitjà d'oferta de venda (€/m²) del portal Idealista.com per barri.

- Dataset: <https://opendata-ajuntament.barcelona.cat/data/ca/dataset/habitatges-2na-ma>
- Recurs 2015: <https://opendata-ajuntament.barcelona.cat/data/dataset/59975890-c615-4080-8dd7-ef1406085590/resource/cd9118c6-427c-4390-8334-3670cc3f3f6a/download/2015_habitatges_2na_ma2015.csv>
- **Llicència:** CC BY 4.0. **Codificació del CSV:** latin-1. Separador de milers: punt.
- **2015 és l'any més recent que publica Open Data BCN** per a aquesta sèrie per barris
  (els recursos disponibles són 2009–2015).
- Valor de referència de la ciutat el 2015: **3.392 €/m²**.
- **59 dels 73 barris** tenen valor propi. Els altres **14 són `null`**: la font els agrupa amb
  un barri veí mitjançant notes a peu («(1)», «(2)», «(3)»…) i **no publica** una xifra
  individual. No s'ha inventat cap valor ni s'ha imputat el del grup.
- L'aparellament barri↔codi s'ha verificat contra `bcn-barris.geojson`: **0 desalineacions**
  (les diferències de text són només de format: `Sants-Badal` vs `Sants - Badal`, sufixos AEI,
  crides de nota).

### Lloguer: `lloguer_eur_mes` i `lloguer_eur_m2` — **no disponibles per barri → `null`**

Open Data BCN **ja no publica** cap sèrie de preu de lloguer desagregada per barri. Comprovat
exhaustivament amb `package_list` de la seva API CKAN: **555 datasets**, cap de lloguer
residencial per barri (els antics `est-mercat-immobiliari-lloguer-*` retornen 404; l'únic
dataset amb «lloguer» al nom i àmbit d'habitatge és `manteniment-lloguer`, que és un índex
d'esforç econòmic, no un preu).

El portal de dades obertes de la Generalitat tampoc no baixa de municipi: el dataset d'Incasòl
*Preu mitjà del lloguer d'habitatges per municipi* (`qww9-bvhh`) té un únic
`ambit_territorial = "Municipi"` (46.105 files).

Per tant els dos camps queden a `null` a tots els barris. Com a **referència de ciutat**
(no per barri, i marcada com a tal dins de `_meta`) s'hi ha desat la xifra real d'Incasòl:

- **1.134,61 €/mes**, Barcelona municipi, any 2025 (període gener–desembre, 30.789 contractes).
- <https://analisi.transparenciacatalunya.cat/resource/qww9-bvhh.json?codi_territorial=08019&any=2025>
- Dataset: <https://analisi.transparenciacatalunya.cat/d/qww9-bvhh> — Incasòl / Generalitat de
  Catalunya, llicència CC BY 4.0.

---

## Fonts consultades i descartades

- **Socrata / dades obertes Generalitat** (`analisi.transparenciacatalunya.cat`): el dataset
  *Divisions administratives de Catalunya* (`qwex-qqbg`) és de tipus `href`, només enllaça a
  l'ICGC; no serveix geometria via API. Per això s'ha anat directament al WFS de l'ICGC.
- **WFS de l'ICGC en SHAPE+ZIP**: `outputFormat=SHAPE%2BZIP` retorna *ArcGIS Server Error* (HTTP
  400). Era l'alternativa neta al problema d'anells; en no funcionar, s'ha reparat en Python.
- **IGN / Líneas Límite Municipales i repos de GeoJSON de tercers**: no calien, l'ICGC és la
  font oficial i autoritativa per a Catalunya i té més detall.
- **Overpass API**: no ha calgut.

## Atribució a mostrar al mapa

> Límits municipals: © Institut Cartogràfic i Geològic de Catalunya (CC BY 4.0).
> Barris i preus de compra: © Ajuntament de Barcelona — Open Data BCN (CC BY 4.0).
> Lloguer: Incasòl, Generalitat de Catalunya (CC BY 4.0).
