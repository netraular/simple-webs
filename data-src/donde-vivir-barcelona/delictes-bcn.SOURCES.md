# `delictes-bcn.json` — fonts de dades

Generat amb `build_delictes_bcn.py`. **Delictes dins de Barcelona, repartits pels
seus 10 districtes**, per donar un número diferent a cada un dels 73 barris en
comptes del número únic de la ciutat.

| | |
|---|---|
| Fets | «Fets coneguts per Àrea Bàsica Policial» — Socrata [`qnyt-emjc`](https://analisi.transparenciacatalunya.cat/d/qnyt-emjc) |
| Creuament | «Municipi ↔ ABP» — Socrata [`dtpq-6fvw`](https://analisi.transparenciacatalunya.cat/d/dtpq-6fvw) |
| Mestre d'ABP | Socrata [`i2dd-kfpa`](https://analisi.transparenciacatalunya.cat/d/i2dd-kfpa) |
| Organisme | Departament d'Interior · Mossos d'Esquadra |
| Nivell | **Àrea Bàsica Policial**; dins de Barcelona, els **10 districtes** |
| Any | el mateix que publica el Ministeri (avui **2025**) |
| Cobertura | **73/73 barris**, amb **10 valors diferents** |

---

## Per què existeix aquest fitxer

`seguretat.json` porta els delictes del **Balance de Criminalidad** del Ministeri
de l'Interior, que només desglossa municipis de més de 20.000 habitants: **38 dels
nostres 91**, i **cap barri**. Els 73 barris de Barcelona compartien, doncs, un sol
número —el de la ciutat sencera— i la criminalitat no distingia el Raval de
Pedralbes.

Dada per barri **no n'hi ha**: ningú la publica. Però els Mossos publiquen per
**ABP**, i dins de Barcelona **les ABP són exactament els 10 districtes** (codis 34
a 43 del mestre, un per districte, comprovat contra `dtpq-6fvw`). Amb això els 73
barris passen d'un valor a deu, i la diferència és enorme:

| Districte | Delictes/1.000 hab. |
|---|---|
| Ciutat Vella | **330,2** |
| Eixample | 150,3 |
| Sants-Montjuïc | 101,8 |
| Sant Martí | 84,0 |
| les Corts | 83,5 |
| Sant Andreu | 70,6 |
| Gràcia | 50,0 |
| Nou Barris | 48,6 |
| Sarrià-Sant Gervasi | 47,2 |
| Horta-Guinardó | 43,3 |

Ciutat Vella multiplica per set Horta-Guinardó. El 330 no és un error de
denominador: són 38.246 fets sobre 115.829 veïns, i dos terços dels fets de tota
la ciutat són **furts** concentrats al casc antic i la platja.

## Què és, i què no és

- És **dada de districte**, no de barri. Els barris d'un mateix districte
  comparteixen número, i la pàgina ho diu amb aquestes paraules. El Gòtic i la
  Barceloneta surten iguals perquè la font no els separa, no perquè ho siguin.
- És **el lloc on passa el fet**, no on viu qui el pateix ni qui el comet. Un
  districte amb molta gent de pas —Ciutat Vella, l'Eixample— acumula fets que no
  són «dels seus veïns».
- El denominador és el **padró del districte** (suma dels seus barris), no el del
  barri. Dividir els 38.246 fets de Ciutat Vella entre els 50.863 veïns del Raval
  donaria una taxa set vegades inflada.

## El prorrateig

El **repartiment** entre districtes és dels Mossos; el **nivell** és del Ministeri.

Són dos recomptes diferents del mateix i s'assemblen molt —**167.615 contra
169.678** el 2025, un 1,2 % de diferència— però no són idèntics. Barrejar les dues
escales deixaria els 73 barris mesurats amb un regle diferent del dels 91
municipis, i tota la pàgina va d'això. Així que els deu districtes s'escalen per un
factor (**1,0123** avui) perquè sumin exactament el que publica el Ministeri per
Barcelona.

El factor queda escrit al JSON. Si s'allunyés d'1 voldria dir que les dues fonts
han deixat de comptar el mateix, i **el script es planta si passa de ±15 %**.

## Les tipologies

| Camp | `tipus_de_fet` dels Mossos |
|---|---|
| `delictes_total` | tots els fets coneguts |
| `robatoris_violencia` | «Robatori amb violència i/o intimidació» |
| `robatoris_domicili` | **no existeix** |

Els Mossos publiquen «Robatori amb força» i «Robatori amb força interior vehicle»,
i **cap de les dues és** «robos con fuerza en domicilios». Així que
`robatoris_domicili_1000` es queda **sense dada als 73 barris**, i la pàgina ho
pinta en gris. És preferible a triar la que més s'hi assembli.

---

## Paranys, tots convertits en guardes que **fallen**

| Parany | Què passa si no es mira |
|---|---|
| **`ABP Virtual`** | 84.635 fets el 2025, ~12 % de tot Catalunya. És **ciberdelinqüència sense territori**. Sumar-la infla qualsevol taxa. El script es planta si apareix entre els districtes. |
| **`ABP Barcelona`** | Existeix a banda dels deu districtes (1.467 fets el 2025). És una unitat pròpia, no un districte: no es reparteix. |
| **Els noms no casen** | `qnyt-emjc` identifica l'ABP pel **nom**, no pel codi, i no coincideix literalment amb el mestre: «ABP Les Corts» contra «les Corts», «ABP Horta-Guinardó» contra «Horta Guinardó». Es compara normalitzat (sense article, accents ni guions). |
| **Filtrar per nom al `$where`** | Un `WHERE nom='ABP Horta Guinardó'` torna **zero files sense avisar**. Per això es demanen **totes** les ABP —són 62 files— i el casament es fa en Python, on es pot normalitzar. |
| **El mestre equivocat** | `6p8j-c3jv` **no** és el mestre d'ABP i dona resultats absurds. El bo és `i2dd-kfpa`. |
| **La geometria** | `dtpq-6fvw` i `i2dd-kfpa` porten el polígon a cada fila. Cal `$select` amb les columnes justes o es baixen desenes de MB per no usar-los. |
| **L'any en curs** | Està incomplet (285.545 fets a mitjan 2026 contra 582.297 tot el 2025). S'agafa **el mateix any que el Ministeri**, llegit de `seguretat.json`, perquè el prorrateig compari el mateix amb el mateix. |

## Els 53 municipis que segueixen sense dada

Fora de Barcelona el Ministeri cobreix 38 dels nostres 91 i els altres **es queden
en gris**. Hi hauria una alternativa: repartir la taxa de l'ABP a tots els seus
municipis. Cobriria els 91, però produiria només **20 valors diferents** — dotze
municipis del Vallès Oriental durien el número de Granollers com si fos seu. Això
és inventar una dada amb forma de dada, i no es fa.

Dins de Barcelona sí es fa, i la diferència no és arbitrària: allà l'ABP **és** el
districte, una unitat administrativa real amb el seu padró, i baixar de 1 a 10
valors afina; fora, l'ABP és un conjunt de municipis heterogenis i repartir-la
n'esborra les diferències.

---

## Reproduir-ho

```sh
cd data-src/donde-vivir-barcelona
python3 build_seguretat.py        # cal abans: d'aquí surt l'any i el total del Ministeri
python3 build_delictes_bcn.py     # --fresh per tornar a baixar
node build-transport.mjs
```

La taxa no es calcula aquí: `delictes-bcn.json` desa **recomptes absoluts**, com
`seguretat.json`, i `build-transport.mjs` els divideix pel padró del districte amb
el mateix denominador que fa servir per tota la resta de la pàgina.
