# `tarifes.json` — fonts de dades

Generat amb `build_tarifes.py`. Dos **costos corrents** per municipi que la
pàgina no tenia i que pesen tant com el preu del pis: la **corona tarifària**
i l'**aigua**.

Les dues fonts són **només municipals**. Barcelona sencera és zona tarifària 1 i
té un únic preu de l'aigua: repetir el mateix número als seus 73 barris fingiria
una diferència que no existeix, i per això els barris queden sense dada.

---

## 1. Zona tarifària i abonament — Autoritat del Transport Metropolità

### Els tres fitxers

| Recurs | URL | Què porta |
|---|---|---|
| `cities` | <https://www.atm.cat/documents/d/portal-atm/cities> | 365 municipis amb `name`, `fare_zone`, `logic_zone`, `region` |
| `zones_intersect` | <https://www.atm.cat/documents/d/portal-atm/zones_intersect> | per a cada zona lògica, quantes zones hi ha fins a cadascuna de les altres |
| `sectors_tarifaris_amb` | <https://www.atm.cat/documents/d/portal-atm/sectors_tarifaris_amb> | GeoJSON de 43 sectors amb `{sector, zona}` |

Portal del visor: <https://www.atm.cat/titols-tarifes/sistema-de-transport/mapa-de-la-zonificacio>

### Avís de procedència: això NO és el catàleg de dades obertes

No hi ha cap conjunt de zonificació tarifària a
`analisi.transparenciacatalunya.cat` (cerques de `tarifaria`, `ATM`,
`zonificacio`, `autoritat transport metropolita`: cap resultat). Els tres
fitxers d'aquí són els que l'ATM serveix al seu **visor públic**: JSON **sense
llicència declarada, sense versionat i sense cap garantia que la URL hi
continuï sent**. És la mateixa categoria de font que el PX del Ministeri de
l'Interior a `build_seguretat.py`.

Per això el script no se'n fia i **no escriu res** si alguna cosa no quadra:

1. Els **92 municipis** de `municipis.json` han d'emparellar-se per nom
   normalitzat. Avui donen 92/92, sense cap empat. Si en falla un, peta.
2. El sector que conté el punt del municipi al GeoJSON ha de coincidir amb la
   `fare_zone` del llistat. Són dues fonts diferents de la mateixa casa i avui
   diuen exactament el mateix: **0 discrepàncies**. Si n'hi ha una, peta.
3. Si el servidor torna HTML en comptes de JSON, peta i no desa la memòria cau.

### La corona **no** és el nombre de zones

L'error fàcil seria llegir el primer dígit de `fare_zone` («2C» → 2 zones). És
**fals** per a bona part de l'àrea metropolitana:

| Municipi | `fare_zone` | `logic_zone` | Zones fins a Barcelona |
|---|---|---|---|
| Sant Cugat del Vallès | `2C` | 61 | **1** |
| Badia del Vallès | `2C` | 61 | **1** |
| Rubí | `2C` | 7 | **2** |
| Terrassa | `3C` | 17 | **3** |

El que mana és la **zona lògica** i la matriu `zones_intersect`: el nombre de
zones fins a Barcelona és `zones_intersect[logic_zone == "1"].intersect[la seva
zona lògica]`.

**Validació externa.** Els municipis de tot Catalunya que queden a 1 zona de
Barcelona segons aquesta lectura són exactament **36**, i la llista coincideix
clavada amb els 36 municipis de l'Àrea Metropolitana de Barcelona. Cap altra
lectura de les dades dona aquest resultat.

Dels **91 municipis** de la pàgina (Barcelona va a part, per barris):
**35 a 1 zona, 24 a 2, 32 a 3**. Cap a 4 o més.

### Per què no hi ha el preu de l'abonament

Hi era —el cost de la T-usual segons les zones— i **se n'ha tret**. Anava
**escrit a mà** dins del script, copiat de l'HTML pla del portal de l'ATM, i
canvia cada gener: un número que cal recordar d'actualitzar és un número que
algun dia menteix. El que es guarda és **quantes corones creues**, que és una
propietat del lloc i no caduca; el preu del títol el consulta qui el necessiti a
<https://www.atm.cat/titols-tarifes>.

### Camps que en surten

| Camp | On va | Unitat | Cobertura |
|---|---|---|---|
| `zona_tarifaria` | arrel de la zona | text (`1`, `2C`, `3E`…) | 91/91 municipis |
| `zones_a_bcn` | `ind` | 1–6 | 91/91 |

`zona_tarifaria` va com a text i no com a número perquè és l'etiqueta que porta
escrita el bitllet; el que es pot ordenar i filtrar és `zones_a_bcn`.

### Què NO diu aquest número

- Són les corones que creues per **anar a Barcelona**. Qui es mou dins de la seva
  pròpia corona, o cap a un altre municipi de la mateixa, en creua menys.
- No diu res de la **freqüència** ni de si tens estació a prop: això ho diuen
  `estacions`, `dist_tren_km` i `dist_estacio_km` (vegeu `transport.SOURCES.md`).

---

## 2. Preu de l'aigua — Agència Catalana de l'Aigua

| | |
|---|---|
| Conjunt | `6st4-ptsi` · «Preu de l'aigua per municipi a Catalunya» |
| URL | <https://analisi.transparenciacatalunya.cat/resource/6st4-ptsi.json> |
| Sèrie | 2017 – **2025** (947 municipis per any) |
| Clau | `codi_municipi` de 6 dígits → `zfill(6)[:5]` |

El camp `preu_aigua` és el **total del metre cúbic**: subministrament + cànon de
l'aigua + clavegueram. El conjunt també desglossa les tres parts i l'entitat
gestora, que no es fan servir.

- **Cobertura: 91/91 municipis**, any **2025**.
- Rang real a l'àrea: **1,26 – 4,02 €/m³**, mediana **2,37**. Un factor de tres
  entre municipis veïns.
- El script prova els anys de més recent a més antic i es queda amb el primer
  que torni files; si un any encara no està publicat no en desa la resposta
  buida a la memòria cau, perquè l'any vinent no es quedi llegint el forat.

### Què NO diu aquest número

És la **tarifa** del municipi, no una factura. El que pagues depèn del que
gastis i del tram, i molts municipis tenen tarifa social que aquí no hi surt.

---

## 3. Refer-ho

```sh
cd data-src
python3 build_tarifes.py          # --fresh per tornar a baixar-ho tot
node build-transport.mjs          # ho enganxa a pages/data/zonas.json
node test-transport.mjs
```

La memòria cau viu a `data-src/_work/`. Els tres fitxers de l'ATM fan 370 kB
en total i el de l'aigua, 250 kB.
