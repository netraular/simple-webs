# `nacionalitats.json` — fonts de dades

Generat amb `build_nacionalitats.py`. **Origen de la població** dels 73 barris
de Barcelona, per la regió geogràfica de la seva nacionalitat.

| | |
|---|---|
| Font | Ajuntament de Barcelona · Padró Municipal d'Habitants (OMD) |
| Recurs A | `9577a42e-224d-42ea-ae47-039824b265df` — **21 regions** × 73 barris (2026) |
| Recurs B | `8fa43cfd-5d5b-4fc9-b40b-0a538d2b59b0` — Espanya / resta UE / resta del món (2026) |
| Diccionari | `pad-dimensions`, recurs `b00be3f8-9328-4175-8689-24a25bc0907c` |
| Població | **1.728.973** (regions) i **1.729.624** (grups): **0,04 % de diferència** |
| Cobertura | **73/73 barris** · 0 municipis |

---

## Primer la cautela: la nacionalitat no és l'idioma ni l'origen

Qui es nacionalitza **deixa de comptar com a estranger** encara que arribés
l'any passat. Un brasiler compta a Amèrica del Sud i no parla castellà. Un
argentí amb passaport italià compta a la UE. Això mesura **nacionalitat
registrada al padró**, i prou.

`pct_nac_llatinoamerica` és Carib + Amèrica Central + Amèrica del Sud, que és el
més a prop que arriba una dada pública de «parla castellana» **sense ser-ho**:
a dins hi ha el Brasil i Haití, i a fora hi ha qui ja té el DNI.

És el mateix advertiment que ja porta `pct_estrangera`, estès a aquestes dues
capes.

## Per què calen dos recursos i no un

Les 21 regions són les de **Nacions Unides**, i això vol dir que **Espanya és
dins d'«Europa meridional»** amb Itàlia i Portugal: 1.335.386 persones de les
1.728.973 de la ciutat. D'aquesta taula sola **no en surt la UE**.

El segon recurs parteix la població en Espanya / resta de la UE / resta del món,
i la resol. I de passada dóna el contrast que val més que cap declaració: **dues
retallades diferents del mateix padró han de donar la mateixa ciutat**. Donen
1.728.973 i 1.729.624 — un 0,04 %, que és exactament el que emmascara el portal.
Per damunt del 0,5 % el build s'atura.

Amb les dues taules, «resta d'Europa» surt per resta: Europa (regions 15-18)
menys Espanya menys UE. Són el Regne Unit, Ucraïna, Rússia, Suïssa, els Balcans.
**No hi ha cap altra manera de separar-ho**, perquè les regions de l'ONU no
saben què és la Unió Europea.

## Les cel·les emmascarades

El portal escriu `..` a tot valor **menor que 5**. Es compten com a zero i es diu
quantes eren: **455 a la taula de regions i 260 a la de grups**, sobre 1,7
milions de persones. Mou el percentatge molt menys que el redondeig, però
declarar-ho costa una línia i no declarar-ho és fingir exactitud.

## Les 21 regions, i com s'agrupen

| Codis | Grup publicat |
|---|---|
| 1-5 Àfrica oriental, central, septentrional, meridional, occidental | `africa` |
| 6 Carib · 7 Amèrica central · 8 Amèrica del sud | `llatinoamerica` |
| 9 Amèrica del nord | `america_nord` |
| 10-14 Àsia central, oriental, meridional, sud-oriental, occidental + 19-22 Oceania | `asia_oceania` |
| 15-18 Europa oriental, septentrional, meridional, occidental | **partits** en `ue` i `resta_europa` amb el recurs B |
| 23 No consta | 160 persones, no s'agrupen |

Dues **capes** (`pct_nac_ue`, `pct_nac_llatinoamerica`) i un **repartiment
complet** que va només a la fitxa. Això últim és deliberat: **no es pinta el
mapa per «d'on és la gent»**, i ordenar 164 zones per això seria justament el que
no es vol fer.

Al `zonas.json` el repartiment va com a **llista**, no com a objecte: repetir sis
noms de clau 73 vegades costava 7 kB de la càrrega inicial per no dir res que no
digui ja `meta.indicadors.nacionalitats.regions`, que és d'on la fitxa llegeix
l'ordre.

## Recorregut

De **2,9 %** (les Tres Torres) a **17,1 %** (Porta) de nacionalitat
llatinoamericana. La UE va del 2 % al 10 % (Vallvidrera).

## Per què no hi ha res per als 91 municipis

Es va buscar. No existeix com a dada pública:

| On | Què hi ha |
|---|---|
| **Idescat EMEX** | «Població. Per nacionalitat» = espanyola i estrangera. Cap taula per continents a l'API |
| **INE, Estadística Contínua de Població** | L'única taula municipal amb nacionalitat (**79544**) té tres categories: Total, Espanyola, Estrangera. El desglossament per agrupació de països (**77019**, **77023**) només baixa a comunitat autònoma i província |
| **analisi.transparenciacatalunya.cat** | `jzx6-bqke`, població estrangera per país de nacionalitat, **del conjunt de Catalunya**, sense desagregar per municipi |

Així que és un altre indicador dels que només tenen els 73 barris, com el soroll,
els locals buits i els avisos de l'IRIS.

## Reproduir-ho

```sh
cd data-src/donde-vivir-barcelona
python3 build_nacionalitats.py      # --fresh per repetir la descàrrega
node build-transport.mjs
```

Va en **Python** perquè `opendata-ajuntament.barcelona.cat` **talla l'encaixada
TLS de Node** (ECONNRESET).
