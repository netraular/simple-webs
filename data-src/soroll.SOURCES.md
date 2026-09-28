# `soroll.json` — fonts de dades

Generat amb `build_soroll.py`. Soroll als **73 barris de Barcelona**, i només
allà: és **l'espejo exacte dels delictes**, que cobreixen 38 municipis i cap
barri.

| | |
|---|---|
| Conjunt | «Població exposada al soroll · Mapa estratègic de soroll» |
| Organisme | Ajuntament de Barcelona, Open Data BCN |
| Recurs | `7b3783aa-0569-4bcb-b35f-5ade252ae319` |
| API | <https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search> |
| Any | **2022** (hi ha també sèrie 2017) |
| Files | 19.272 |

---

## Per què per l'API CKAN i no per `/download`

Des del **2026-09** les descàrregues directes del portal estan darrere de
BunkerWeb + hCaptcha: contesten **HTTP 200** amb una pàgina «Bot Detection» d'uns
12 kB en comptes del CSV. L'API `datastore_search` **no** està protegida. És la
mateixa via que documenta `indicadors.SOURCES.md`, i el script comprova que la
resposta no comenci per HTML abans de desar-la a la memòria cau.

## Per què en Python i no en Node

El portal **talla l'encaixada TLS de Node** (`ECONNRESET` en el mòdul `https`,
`UND_ERR_CONNECT_TIMEOUT` amb `fetch`), mentre que `urllib` de Python i curl hi
passen sense problema. Comprovat el 2026-09-28: el TCP connecta i el TLS es
tanca. La resta de scripts nous del projecte van en Node; aquest no pot.

---

## Què hi ha al conjunt i què se n'agafa

Cada fila és una combinació de **barri × font de soroll × període × franja de
decibels**, amb el percentatge de població del barri que hi viu exposada.

| Camp | Valors |
|---|---|
| `font_soroll` | Trànsit viari · Trànsit ferroviari · Indústria · Oci i lleure · **Total** · Total (fonts obligatòries) |
| `periode_horari` | Dia · Vespre · Nit · **Lden** |
| `rang` | `<35` · `35-40` · … · `75-80` · `>=80 dB(A)` |

S'agafa **`font_soroll = "Total"`** —totes les fonts juntes— i se'n sumen les
franges per damunt de dos llindars:

| Camp | Període | Llindar | Per què aquest |
|---|---|---|---|
| `pct_soroll_65db` | `Lden` | ≥ 65 dB(A) | Valor de qualitat acústica que la normativa catalana fixa per a zona residencial |
| `pct_soroll_nit_55db` | `Nit` | ≥ 55 dB(A) | Llindar de descans de la Directiva europea 2002/49/CE |

Lden és l'índex de dia complet, amb recàrrec pel vespre i per la nit. Les dues
xifres responen preguntes diferents i donen mapes diferents: hi ha barris
tranquils de dia i sorollosos de nit.

**El percentatge el publica l'Ajuntament.** L'únic que fa el script és sumar
franges. No hi ha cap interpolació ni cap model pel mig.

### El camp ve com a fracció, no com a percentatge

Es diu `percentatge_poblacio_exposada` però les franges d'un barri sumen **1**,
no 100. El script ho **comprova barri a barri abans de multiplicar** (tolerància
del 2 %) i peta si algun dia la font canvia d'unitat, que és l'única manera que
això no acabi publicant un 4.930 %.

---

## Cobertura i rang

**73/73 barris, 0 municipis.**

| | |
|---|---|
| Més sorollós (Lden ≥ 65) | l'Antiga Esquerra de l'Eixample, **49,3 %** |
| | la Dreta de l'Eixample, 43,1 % · la Sagrada Família, 38,2 % |
| Més tranquil | Can Peguera, **0,3 %** |
| | Sant Genís dels Agudells, 1,2 % · les Roquetes, 2,5 % |

Discrimina moltíssim: de 0,3 a 49,3 dins de la mateixa ciutat.

## Per què no hi ha soroll municipal

Buscat i no trobat, el 2026-09-28:

- `analisi.transparenciacatalunya.cat`: `soroll`, `acustica`, `contaminacio
  acustica`, `mapa estrategic` → cap conjunt agregable (només una enquesta
  social).
- Els **mapes estratègics de soroll** de la Generalitat es publiquen com a
  cartografia i PDF **municipi a municipi**, sense cap taula agregada.
  <https://sig.gencat.cat/visors/mapes_soroll.html> dona **404**.
- L'**AMB** respon **403** a qualsevol client que no sigui un navegador.

Creuar-ho caldria descarregar i processar GIS municipi a municipi, i el resultat
seria discutible. Mentre no hi hagi una taula publicada, el camp es queda a
`null` fora de Barcelona.

---

## Refer-ho

```sh
cd data-src
python3 build_soroll.py           # --fresh per tornar a baixar-ho
node build-transport.mjs
node test-transport.mjs
```

La memòria cau viu a `data-src/_work/bcn-soroll.json` (5 MB).
