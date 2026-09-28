# `costa.geojson` — fonts de dades

Generat amb `build_costa.py`. La línia de costa catalana, retallada, per poder
dir a quina distància del mar queda cada zona (`ind.dist_mar_km`).

| | |
|---|---|
| Font | **Natural Earth 10 m physical coastline** |
| Llicència | **domini públic** (Natural Earth no en reclama cap dret) |
| URL | <https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_coastline.geojson> |
| Escala | 1:10.000.000 |

## Per què aquesta i no la de l'ICGC

L'ICGC publica una línia de costa molt millor, però `datacloud.icgc.cat` contesta
**401**: cal credencial. Overpass hauria servit però necessita una consulta POST
i tornar-ne prop d'un mega. Natural Earth és de domini públic, prou bona per a la
pregunta que es fa i pesa el que pesa.

## Per què el retall es versiona

El fitxer mundial fa **10 MB i 4.133 trams**. Retallat a la caixa de Catalunya
(lon 0,0–3,6 · lat 40,3–42,7) queda **1 tram de 155 punts i 3,4 kB**. Això sí es
pot tenir al repositori, i així ningú ha de baixar-se 10 MB per reconstruir la
pàgina. El retall parteix els trams que entren i surten de la caixa, de manera
que no queda cap recta llarguíssima unint dos punts llunyans.

## Com es calcula la distància

A `build-transport.mjs` (`distMarKm`), sobre un pla local equirectangular
corregit pel cosinus de la latitud. Es mesura contra **cada segment**, no contra
els vèrtexs: amb 155 punts per a 400 km de costa, dos vèrtexs veïns estan a
quilòmetres i mesurar només a ells donaria fins a 2 km d'error de més enmig d'un
tram recte.

Cobreix **les 164 zones**, municipis i barris, perquè només necessita `lat`/`lon`.

Contrast amb la realitat: Mataró 0,7 km · Premià de Mar 1,2 · Montgat 1,5 ·
Badalona 1,8 · Sant Adrià 2,1 · Castelldefels 3,1 … Terrassa 24,9 · Abrera 28,7 ·
Olesa de Montserrat 32,1.

## Què NO diu

- És **distància en línia recta des del punt de referència de la zona** —el nucli
  urbà del municipi o el centroide del barri—, no des del límit del terme. Un
  municipi llarg amb el poble terra endins i platja pròpia surt lluny.
- No és **distància a una platja**: la costa inclou ports, penya-segats i el
  delta.
- L'escala 1:10 M vol dir un error de l'ordre de **centenars de metres**.
  Serveix per separar costa d'interior; no per comptar metres.

## Refer-ho

```sh
cd data-src
python3 build_costa.py            # --fresh per tornar a baixar els 10 MB
node build-transport.mjs
```
