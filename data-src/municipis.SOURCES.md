# `municipis.json` — fonts de dades

Generat el **2026-09-21**.

Municipis de Catalunya amb el **cap de municipi** a **32 km o menys** en línia recta
de la **Plaça de Catalunya de Barcelona** (`lat 41.3870`, `lon 2.1701`).

**Resultat: 92 municipis** (86 dins de 30 km), rang de distàncies **0,75 – 31,96 km**.

Cap camp és inventat ni estimat. Tots els valors venen literalment d'una de les
fonts d'aquí sota.

---

## Camps i procedència

| Camp | Font | Data de les dades |
|---|---|---|
| `codi_ine` | Socrata `wpyq-we8x`, columna `codi_municipi_ine` | actualitzat 2024-11-27 |
| `nom` | Socrata `wpyq-we8x`, columna `municipi` (nom oficial en català) | actualitzat 2024-11-27 |
| `comarca` | Socrata `wpyq-we8x`, columna `comarca` | actualitzat 2024-11-27 |
| `provincia` | Socrata `wpyq-we8x`, columna `prov_ncia` | actualitzat 2024-11-27 |
| `lat`, `lon` | Socrata `wpyq-we8x`, columnes `latitud` / `longitud` (WGS84) | actualitzat 2024-11-27 |
| `dist_bcn_km` | **calculat** (Haversine, R = 6371,0088 km), arrodonit a 2 decimals | — |
| `poblacio` | IDESCAT EMEX, indicador `f321` "Població" | **2025** |
| `poblacio_any` | any de l'indicador `f321` | `"2025"` |
| `poblacio_padro_2025` | Socrata `x5sz-niat`, columna `total`, `any=2025` (contrast) | **2025** |
| `superficie_km2` | IDESCAT EMEX, indicador `f271` "Superfície" (km²) | **2025** |
| `superficie_any` | any de l'indicador `f271` | `"2025"` |

---

## URLs exactes utilitzades

### 1. Geometria, codi INE, nom i comarca

Dataset **"Caps de municipi de Catalunya georeferenciats"** (ICGC / Generalitat),
resource id `wpyq-we8x`:

- Fitxa: <https://analisi.transparenciacatalunya.cat/d/wpyq-we8x>
- Descàrrega utilitzada:
  `https://analisi.transparenciacatalunya.cat/resource/wpyq-we8x.json?$limit=5000`
- Metadades: `https://analisi.transparenciacatalunya.cat/api/views/wpyq-we8x.json`
- Cobertura: **947 files = 947 municipis**, tots amb `codi_municipi_ine`, `comarca`,
  `latitud` i `longitud`. Cap forat.

> Les coordenades són les del **cap de municipi** (nucli urbà / casa consistorial),
> no el centroide geomètric del terme. Per a "distància a Barcelona" això és el que
> té sentit, però implica que un municipi amb un terme molt extens pot tenir part del
> territori més a prop de Barcelona que el que indica `dist_bcn_km`.
> Per a Barcelona la coordenada és la de l'Ajuntament (Plaça Sant Jaume), d'aquí que
> `dist_bcn_km = 0.75` i no 0.

### 2. Població i superfície

**IDESCAT, API EMEX** (<https://www.idescat.cat/dev/api/>):

- Consulta en bloc utilitzada (una sola crida, tots els municipis):
  `https://api.idescat.cat/emex/v1/dades.json?i=f271,f321&tipus=mun&lang=ca`
- Llista de municipis i codis: `https://api.idescat.cat/emex/v1/nodes.json?tipus=mun`
- `f271` = Superfície (km²), any de referència **2025**, actualitzat 2025-05-07.
- `f321` = Població, any de referència **2025**, actualitzat 2026-02-25.
  Font declarada per l'Idescat: *"Idescat, a partir del Cens de població anual de l'INE."*

L'API EMEX identifica els municipis amb el **codi de 6 dígits** (INE de 5 dígits +
dígit de control). L'aparellament amb `codi_ine` s'ha fet amb els **5 primers dígits**:
els 947 municipis del radi han aparellat, cap sense correspondència.

### 3. Contrast de població (padró)

Dataset **"Dades històriques de població dels municipis de Catalunya"**, resource id
`x5sz-niat`:

- Fitxa: <https://analisi.transparenciacatalunya.cat/d/x5sz-niat>
- Descàrrega utilitzada:
  `https://analisi.transparenciacatalunya.cat/resource/x5sz-niat.json?any=2025&$limit=5000`
- S'han filtrat les files `nom_ens` que comencen per `"Ajuntament"` (947 de 1059;
  la resta són EMD i altres ens locals). Clau = 5 primers dígits de `codi_10`.

Guardat com `poblacio_padro_2025` perquè es pugui contrastar. **Les dues fonts
difereixen com a molt un 1,07 %** (el màxim és Barcelona: 1.713.247 al cens anual
de l'Idescat vs 1.731.649 al padró). Són recomptes diferents, no un error.

> Avís sobre `x5sz-niat`: les columnes `homes` i `dones` d'aquest dataset estan
> clarament corrompudes (no sumen el `total`). Només se n'ha fet servir `total`.

### 4. Descobriment dels datasets

- `https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=municipis&limit=30`
- `https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=padró+població&limit=15`

No ha calgut Overpass / OpenStreetMap ni l'INE: les fonts 1 i 2 cobreixen el 100 %
dels camps demanats.

---

## Completesa

Sobre els 92 municipis del fitxer:

| Camp | Valors nuls |
|---|---|
| `codi_ine` | 0 |
| `nom` | 0 |
| `comarca` | 0 |
| `provincia` | 0 |
| `lat` / `lon` | 0 |
| `dist_bcn_km` | 0 |
| `poblacio` | 0 |
| `superficie_km2` | 0 |
| `poblacio_padro_2025` | 0 |

**No hi ha cap camp incomplet.** No s'ha fet servir `null` enlloc.

---

## Verificació de cordura

Distribució per comarca (92 municipis, radi 32 km):

| Comarca | Municipis |
|---|---|
| Baix Llobregat | 29 |
| Vallès Occidental | 19 |
| Vallès Oriental | 19 |
| Maresme | 15 |
| Barcelonès | 5 (la comarca sencera) |
| Alt Penedès | 4 |
| Garraf | 1 (Olivella) |

Població total dels 92 municipis: **4.846.725** hab. (2025).
Dins de 30 km: 86 municipis, **4.788.348** hab.

Comprovació de la llista de control demanada:

| Municipi | `dist_bcn_km` | |
|---|---|---|
| Barcelona | 0,75 | ✔ |
| Sant Adrià de Besòs | 6,29 | ✔ |
| l'Hospitalet de Llobregat | 6,61 | ✔ |
| Santa Coloma de Gramenet | 7,87 | ✔ |
| el Prat de Llobregat | 8,99 | ✔ |
| Badalona | 9,62 | ✔ |
| Sant Cugat del Vallès | 11,72 | ✔ |
| Mollet del Vallès | 16,95 | ✔ |
| Sabadell | 18,44 | ✔ |
| Castelldefels | 20,01 | ✔ |
| Martorell | 22,21 | ✔ |
| Terrassa | 23,71 | ✔ |
| Granollers | 26,44 | ✔ |
| Mataró | 28,67 | ✔ |
| **Sitges** | **34,39** | ✘ fora del radi de 32 km |
| **Vilanova i la Geltrú** | **41,28** | ✘ fora del radi de 32 km |

### Sitges i Vilanova i la Geltrú NO hi són

No és un forat de dades: **cap dels dos és a 32 km o menys de la Plaça de Catalunya
en línia recta**. El cap de municipi de Sitges és a **34,39 km** i el de Vilanova i
la Geltrú a **41,28 km**. La costa del Garraf gira cap a l'oest i s'allunya de
Barcelona molt més ràpid del que suggereix el temps de tren. L'únic municipi del
Garraf que entra al radi és **Olivella** (31,16 km), que és l'interior de la comarca.

Municipis que queden just fora, per si es vol ampliar el radi:

| Distància | Municipi | Comarca |
|---|---|---|
| 32,25 | Sant Sadurní d'Anoia | Alt Penedès |
| 32,26 | Vacarisses | Vallès Occidental |
| 32,56 | Masquefa | Anoia |
| 32,57 | Bigues i Riells del Fai | Vallès Oriental |
| 32,69 | l'Ametlla del Vallès | Vallès Oriental |
| 32,90 | Avinyonet del Penedès | Alt Penedès |
| 33,39 | Sant Andreu de Llavaneres | Maresme |
| 33,57 | Sant Feliu de Codines | Vallès Oriental |
| 34,14 | Llinars del Vallès | Vallès Oriental |
| 34,39 | **Sitges** | Garraf |
| 34,52 | la Garriga | Vallès Oriental |
| 35,03 | Collbató | Baix Llobregat |
| 36,01 | Sant Pere de Ribes | Garraf |
| 38,30 | Arenys de Mar | Maresme |
| 39,64 | Vilafranca del Penedès | Alt Penedès |
| 41,28 | **Vilanova i la Geltrú** | Garraf |
| 43,04 | Sant Celoni | Vallès Oriental |

Amb un radi de **42 km** hi entrarien tant Sitges com Vilanova i la Geltrú
(i uns 60 municipis més).

---

## Format del fitxer

`municipis.json` és un **array** d'objectes, **ordenat per `dist_bcn_km` ascendent**.

```json
{
  "codi_ine": "08015",
  "nom": "Badalona",
  "comarca": "Barcelonès",
  "provincia": "Barcelona",
  "lat": 41.452263,
  "lon": 2.245877,
  "dist_bcn_km": 9.62,
  "poblacio": 230642,
  "poblacio_any": "2025",
  "poblacio_padro_2025": 231542,
  "superficie_km2": 21.18,
  "superficie_any": "2025"
}
```

Fórmula de la distància (Haversine, radi mitjà de la Terra 6371,0088 km):

```
a = sin²(Δφ/2) + cos φ₁ · cos φ₂ · sin²(Δλ/2)
d = 2R · asin(√a)
```
