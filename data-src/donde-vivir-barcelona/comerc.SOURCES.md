# `comerc.json` — fonts de dades

Generat amb `build_comerc.py`. **Locals buits als 73 barris de Barcelona**, i
només allà.

| | |
|---|---|
| Conjunt | «Cens comercial de la ciutat de Barcelona» |
| Organisme | Ajuntament de Barcelona, Open Data BCN |
| Recurs | **`99764d55-b1be-4281-b822-4277442cc721`** (2022) |
| API | `datastore_search_sql` |
| Locals | **66.088** |
| Cobertura | **73/73 barris** · percentatge a 69 · **0 municipis** |

---

## Què és `pct_locals_buits`

La proporció de locals de planta baixa **sense activitat econòmica**. El cens es
aixeca recorrent la ciutat a peu, local per local, i és l'única font que contesta
*«els baixos d'aquest carrer estan oberts o tancats?»*.

| | |
|---|---|
| la Font d'en Fargues | **23,1 %** de 117 locals |
| el Barri Gòtic | 21,1 % de 1.936 |
| mitjana de ciutat | 10,9 % |
| les Tres Torres | 3,7 % de 482 |
| Canyelles | **3,3 %** de 123 |

**Mesura si estan oberts, no quant comerç hi ha.** Un barri residencial amb pocs
locals i tots oberts surt igual de bé que un amb molts. Són dues preguntes i
aquesta en contesta una.

El percentatge **només es publica amb 30 locals o més**. Per sota només pot
prendre un grapat de valors i es llegiria com una diferència real: quatre barris
(la Clota amb 14 locals, Can Peguera 21, Vallbona 24 i Torre Baró 25) es queden sense. Mateix
criteri que el % de centres públics.

## Per què el cens de 2022 i no el de 2024

**El recurs de 2024 (`38babeec-5c47-43d3-84e7-b13a4b89004f`) està truncat.**

| | 2022 | 2024 |
|---|---|---|
| Files | **66.088** | 44.000 exactes |
| Barris | **73** | 72 (falta el 54) |
| Pedralbes | 275 locals, 5,5 % buits | **8 locals, 100 % buits** |

44.000 rodó no és una coincidència i els valors són impossibles. El de 2022 està
complet.

**Aquest error no es veu si un es refia del que li arriba.** El portal **no**
torna `total` amb `include_total`, així que un script que demani les files i les
compti no sap si li han donat totes. Per això el primer que fa aquest és un
`SELECT count(*)` i **es planta** si baixa de 60.000. Va ser així com es va
descobrir.

## Per què no hi ha municipis

El «Cens d'activitats municipal» de la Diputació (Socrata `txvw-xc3g`, 42.079
files) només recull els ajuntaments que li deleguen la gestió: **43 dels nostres
92, i Barcelona no hi és**. No hi ha res comparable fora de la ciutat, i no
s'inventa.

## Paranys del portal

- **`datastore_search_sql`**: el `GROUP BY` va al servidor i estalvia baixar-se
  els 25 MB del CSV.
- **En Python i no en Node**: el host **talla l'encaixada TLS de Node**
  (`ECONNRESET`).

## Reproduir-ho

```sh
cd data-src/donde-vivir-barcelona
python3 build_comerc.py   # --fresh per tornar a baixar
node build-transport.mjs
```
