# `queixes.json` — fonts de dades

Generat amb `build_queixes.py`. **Avisos, queixes i suggeriments** que els veïns
envien a l'Ajuntament pel sistema IRIS. **Només els 73 barris.**

| | |
|---|---|
| Font | Ajuntament de Barcelona · IRIS |
| Recurs | `efc9fd4d-a812-427c-846d-a086d22012a4` (**2025**, el darrer any complet) |
| API | CKAN `datastore_search_sql` |
| Fitxes al recurs | **287.304** |
| Comptades | **195.976** (68 %) · de neteja i manteniment **160.303** (82 % d'aquestes) |
| Cobertura | **73/73 barris** · 0 municipis |
| Recorregut | de **57,3** (les Tres Torres) a **256,8** (Can Peguera) avisos per mil |

---

## Primer la cautela, perquè si no el número enganya

**Això mesura la propensió a avisar tant com el problema.** Un barri organitzat,
amb gent que té temps i que espera que li contestin, avisa més que un que fa
anys que va deixar d'esperar resposta. Dos llocs igual de bruts poden donar
xifres molt diferents, i **el que surt pitjor pot ser el que més es cuida**.

Es publica perquè un avís és un fet —algú va veure una cosa i la va dir—, però
llegir-ho com «aquí hi ha més problemes» és llegir-ho malament. L'advertiment
viatja amb la dada fins a la fitxa de la capa i la metodologia, no es queda a la
lletra petita.

## Què es compta i què no

D'entrada, **un terç de les fitxes no parla de cap lloc**: són tràmits,
impostos i consultes a l'Ajuntament. I això no és una opinió, es veu a les
dades:

| Àrea | Fitxes | Amb barri |
|---|---:|---:|
| Recollida i neteja de l'espai urbà | 90.030 | 99,7 % |
| Manteniment de l'espai urbà | 70.675 | 99,8 % |
| **Portal de tràmits** | 29.914 | **0 %** |
| **Informació  tràmits i atenció ciutadana** | 17.890 | 0,4 % |
| Mobilitat | 13.948 | 84,1 % |
| Prevenció i seguretat | 13.096 | 90,0 % |
| **Gestions municipals** | 10.880 | 5,1 % |
| **Hisenda** | 3.071 | 0 % |

Exigir barri ja fa gairebé tota la neteja. Tot i així **les quatre àrees
administratives es descarten pel nom**, perquè unes poques sí que porten barri i
seguirien sense parlar del lloc.

⚠️ **El doble espai d'«Informació  tràmits i atenció ciutadana» és a l'origen.**
Si algú el «corregeix», deixa de casar i tornen a colar-s'hi 17.890 fitxes.

També queden fora quatre tipus pel que són, no pel que els falta: `CONSULTA` i
`QUERY` són preguntes (43.713, i cap amb barri), `AGRAIMENT` i `GRATITUDE` són
agraïments (531).

## El parany que de debò costava

**El camp `BARRI` no sempre porta un barri.** Hi ha **84 parells
(codi, nom) per a 73 codis**: una desena de fitxes hi duen el carrer o el parc
—«Ronda de la Universitat», «Parc de la Font del Racó», «Jardins de Can
Batllori»—.

Agrupant per `CODI_BARRI` **i** `BARRI`, aquestes fitxes soltes sortien com a
files a part i, en indexar per codi, **machacaven el barri de debò: el Poblenou
passava de 5.640 avisos a 1**. I el recompte de 73 codis diferents no ho
delatava.

Per això s'agrupa **només pel codi**, i el nom surt del padró
(`bcn-barris-poblacio.json`). El codi no falla mai; el rètol sí.

## Les dues xifres

| Capa | Què és |
|---|---|
| `queixes_1000` | Tots els avisos que parlen del lloc, per mil habitants |
| `queixes_neteja_1000` | Recollida i neteja + manteniment de l'espai urbà: les dues àrees més grans amb diferència i les que descriuen **com està el carrer**, que és el que es nota vivint-hi |

## Guardes que aturen el build

- `SELECT count(*)` primer: **el portal no torna `total` amb `include_total`**,
  així que comptar les files que arriben no diu res. Per sota de **200.000** es
  planta. (El recurs de 2026 va per 72.326 i està a mitges: no s'usa.)
- Si no surten els **73 barris**, o si a algun li falta població al padró,
  s'atura en lloc de publicar una taxa coixa.

## Per què no hi ha equivalent als 91 municipis

Cada ajuntament té la seva bústia i cap no publica el recompte per zones. És un
indicador dels que només tenen els 73 barris, com el soroll i els locals buits.

## Reproduir-ho

```sh
cd data-src
python3 build_queixes.py            # --fresh per repetir la descàrrega
node build-transport.mjs
```

Va en **Python** perquè `opendata-ajuntament.barcelona.cat` **talla l'encaixada
TLS de Node** (ECONNRESET). Les URL `/download` del portal són darrere de
BunkerWeb + hCaptcha; l'API de CKAN no.
