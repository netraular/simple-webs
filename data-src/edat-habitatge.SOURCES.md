# `edat-habitatge.json` — fonts de dades

Generat amb `build_habitatge_edat.py`. **Antiguitat del parc d'habitatge als 73
barris de Barcelona**, i només allà.

| | |
|---|---|
| Conjunt | «Locals d'ús habitatge segons l'any de construcció» |
| Organisme | Ajuntament de Barcelona (cadastre), Open Data BCN |
| Recurs | `50e0edf3-c999-464a-afc2-0af71140fd0b` |
| API | `datastore_search_sql` |
| Any | **2026** |
| Files | 8.236 (secció censal × tram) |
| Habitatges | **836.621** |
| Cobertura | **73/73 barris · 0 municipis** |

---

## Què és `pct_habitatge_pre1960`

La proporció d'habitatges del barri construïts **abans de 1960**. És la frontera
entre la ciutat de patis de llums, sense ascensor i sense aïllament, i la de
l'expansió posterior. Compta **habitatges**, no edificis.

Discrimina molt:

| | |
|---|---|
| el Barri Gòtic | **85,4 %** |
| el Raval | 78,8 % |
| … | |
| Canyelles | 0,1 % |
| Baró de Viver | **0,0 %** |

Els trams del cadastre s'enumeren a mà i no es parsegen:

```
<1901 · 1901-1940 · 1941-1950 · 1951-1960   ← els quatre que compten
1961-1970 · 1971-1980 · 1981-1990 · 1991-2000 · 2001-2010 · 2011-2020 · 2021-2030
```

`<1901` no té la forma dels altres, i un parser que se l'empassés malament
restaria un **9 % del parc** sense dir res.

## Per què no hi ha municipis, i no es pot arreglar

El **Cens de Població i Habitatges del INE** publica «Año de construcción del
edificio» per municipi **només per als de més de 50.000 habitants**: taula tpx
[59527](https://www.ine.es/jaxi/files/tpx/es/csv_bdsc/59527.csv), 151 municipis
a tot Espanya, **17 dels nostres 91**. S'ha repassat el rang 59495–59560 de la
sèrie d'habitatge del Cens 2021 i no hi ha cap taula equivalent ni per a tots
els municipis ni per secció censal.

Així que aquest indicador és dels que **només tenen els 73 barris**, com el
soroll i els locals buits. La pàgina ho diu.

## Paranys del portal

- **`datastore_search_sql`, no `datastore_search`.** Permet fer el `GROUP BY` al
  servidor i baixar l'agregat en comptes del recurs sencer. Tampoc està protegida
  per BunkerWeb.
- **El portal no diu quantes files té.** `include_total` no torna `total` en
  aquest CKAN. Hi ha recursos publicats **truncats** —el cens comercial de 2024
  en torna exactament 44.000—, i un script que es refiï del que li arriba no ho
  veurà. Per això el primer que fa aquest és un `SELECT count(*)` i **es planta**
  si baixa de 8.000.
- **En Python i no en Node**: aquest host **talla l'encaixada TLS de Node**
  (`ECONNRESET`), mentre que `urllib` i curl hi passen.

## Reproduir-ho

```sh
cd data-src
python3 build_habitatge_edat.py   # --fresh per tornar a baixar
node build-transport.mjs
```
