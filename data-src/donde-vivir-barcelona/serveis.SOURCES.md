# `serveis.json` — fonts de dades

Generat amb `fetch-serveis.mjs`. **Serveis de barri** de les 164 zones, des
d'OpenStreetMap.

| | |
|---|---|
| Font | © col·laboradors d'[OpenStreetMap](https://www.openstreetmap.org/copyright), **ODbL** |
| API | Overpass (`overpass-api.de`, amb `overpass.kumi.systems` de recanvi) |
| Rectangle | `41,05 · 1,60 → 41,85 · 2,70` — el mateix que les estacions |
| Punts | **22.305** · bus 10.922 · comerç 5.795 · escola 2.336 · farmàcia 2.224 · salut 1.028 |
| Cobertura | **164/164** a les distàncies · **160/164** a les densitats |

---

## Per què OpenStreetMap i no un registre oficial

Perquè **no n'hi ha cap que arribi alhora als 91 municipis i als 73 barris**.

| Alternativa | Per què no |
|---|---|
| Cens comercial de Barcelona | Només la ciutat. Ja s'usa, per als locals buits |
| Cens d'activitats de la Diputació (`txvw-xc3g`) | 43 dels 92 municipis, i Barcelona no hi és |
| Centres sanitaris de CatSalut (`9gu7-iwci`) | **El seu zero vol dir «no registrat», no «no n'hi ha»** — el mateix defecte que ja va fer descartar els CAP i les biblioteques |
| Directori de centres docents | Sí que s'usa, i **serveix per contrastar**: veure més avall |

OSM té el defecte contrari i més portable: **no s'inventa res, però li pot
faltar**. Això es mesura, no es suposa.

## Les tres cauteles, i com es comproven

1. **Les distàncies es mesuren contra tots els punts del rectangle**, no contra
   els de la zona. Un municipi al qual no li hagin mapat res a dins té igualment
   un número honest: el del poble del costat.
2. **Les densitats no es publiquen per sota de 2.000 habitants** (ni, al bus,
   de 0,2 km²). Mateix criteri que el mínim de locals del cens comercial.
3. **Si una categoria deixa més del 15 % de les zones a zero, el build s'atura.**
   Avui: comerç 4 %, farmàcies 1 %, bus 0 %.

I el contrast que de debò val: **2.336 escoles a OSM contra 2.739 al directori
oficial del Departament d'Educació — el 85 %**. El build es planta per sota del
70 %. Si OSM anés curt aquí, aniria curt a tot arreu i les distàncies sortirien
llargues.

## Una xifra per pregunta, i per què aquesta

| Capa | Forma | Per què |
|---|---|---|
| `comercos_1000` | per mil hab. | Importa que n'hi hagi uns quants a prop |
| `farmacies_1000` | per mil hab. | Igual, i són de les coses millor mapades: són negocis senyalitzats |
| `parades_bus_km2` | **per km²** | Veure la taula de sota |
| `dist_salut_km` | distància | En necessites **un**, no vuit |
| `dist_escola_km` | distància | Igual. Conviu amb `centres_educatius_1000`, que és oficial i mesura una altra cosa |

### Les parades de bus: dues formes descartades amb els números al davant

| Forma | Què passava |
|---|---|
| per mil habitants | **Mesurava superfície despoblada del revés.** Les parades segueixen la llargada dels carrers, no la gent: Vallvidrera 21,8 i la Marina del Prat Vermell 33,1, i el Barri Gòtic —el lloc més ben comunicat de la ciutat— 0,7 |
| distància a la més propera | **7 valors diferents en 164 zones**, mediana 0,1 km. És cert que aquí tothom té parada a menys de 200 m, i justament per això no és un indicador sinó una constant |
| **per km²** ✅ | 137 valors diferents en 162 zones. A dalt: Ciutat Meridiana 76,9, el Coll 59,3, el Carmel 56,3 — barris de vessant sense metro on el bus és la xarxa que hi ha. Això sí és el que es volia mesurar |

### I per això les altres quatre van a dos decimals

El mateix defecte apareix pel redondeig si no es vigila: les farmàcies van de 0
a 1,3 per mil i les escoles són gairebé totes a menys d'un quilòmetre, així que
**a dècimes 160 zones s'apilonaven en 12 valors**. Amb dos decimals:

| Capa | Valors diferents | Zones a zero |
|---|---|---|
| `comercos_1000` | 103 | 7 |
| `farmacies_1000` | 62 | 1 |
| `parades_bus_km2` *(1 decimal, arriba a 77)* | 137 | 0 |
| `dist_salut_km` | 85 | 0 |
| `dist_escola_km` | 51 | 0 |

Els zeros de les distàncies també eren del redondeig: eren 9 i 3, i ara cap
—ningú té l'escola exactament a la porta, la tenia a menys de 50 m.

## Etiquetes que es compten

```
comerc    shop = supermarket | convenience | greengrocer | butcher | bakery
farmacia  amenity = pharmacy
salut     amenity = clinic | doctors | hospital   ·   healthcare = centre | doctor
escola    amenity = school | kindergarten
bus       highway = bus_stop
```

L'ordre de classificació importa: una farmàcia dins d'un hospital és hospital.
Es descarta el que està `disused`, `abandoned`, `construction`, `proposed`,
`was` o `demolished` — un supermercat en obres no et dóna menjar.

Els *ways* i les *relations* es demanen amb `out center` i es fan servir pel
centroide: una escola és un recinte, no un punt.

## Paranys tècnics

- La consulta va per **GET amb User-Agent propi**, com la de les estacions. Amb
  429 (cua) o 504 (la consulta passa del seu propi topall) s'espera 25 s i es
  reintenta fins a tres cops; després es prova l'altre endpoint.
- **Darrere d'un proxy que intercepta TLS**, `fetch` de Node falla amb
  `SELF_SIGNED_CERT_IN_CHAIN`. Cal
  `NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt`.
- La descarga es cacheja a `_work/overpass-serveis.json`; `--fresh` la repeteix.
- **2.696 dels 22.305 punts cauen fora de tot polígon**: el rectangle és més
  gran que els nostres 91 municipis. És esperat, i es compta i s'imprimeix.

## Reproduir-ho

```sh
cd data-src/donde-vivir-barcelona
NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt node fetch-serveis.mjs
node build-transport.mjs
```
