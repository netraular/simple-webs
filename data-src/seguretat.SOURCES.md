# `seguretat.json` — fonts de dades

Generat amb `build_seguretat.py`. Dues fonts oficials, totes dues **només
municipals**: cap de les dues baixa al barri.

Es guarden **recuentos absoluts**, no taxes. Qui divideix pel padró és
`build-transport.mjs`, amb el mateix padró que fa servir la resta de la
pàgina, perquè no convisquin dos denominadors diferents al mateix mapa.

---

## 1. Delictes — Ministeri de l'Interior

**Balance de Criminalidad**, balanç del 4t trimestre (= any complet).

| Camp al JSON | Fila del CSV |
|---|---|
| `delictes_total` | `III. TOTAL INFRACCIONES PENALES` |
| `robatoris_violencia` | `6. Robos con violencia e intimidación` |
| `robatoris_domicili` | `7.1.-Robos con fuerza en domicilios` |

Portal: <https://estadisticasdecriminalidad.ses.mir.es/>

### Cobertura: 38 dels 91 municipis, 0 dels 73 barris

El Ministeri **només desglossa els municipis de més de 20.000 habitants**. Ho
diu el títol de la pròpia taula: «Municipios mayores de 20.000 habitantes e
islas». Dels nostres 91 municipis (Barcelona va a part, desglossada en barris),
en compleixen el llindar 38. Els 53 restants no hi són, i no hi ha cap altra
font que els cobreixi:

- Els **Mossos d'Esquadra** publiquen per **Àrea Bàsica Policial** — 62 per a
  tota Catalunya, sense columna de municipi. A Barcelona una ABP és un
  districte: 10, no els 73 barris.
- El **portal de dades obertes de l'Ajuntament** no té cap conjunt de delictes
  (cerques de `delictes`, `robatoris`, `furts`, `victimització`, `mossos`,
  `seguretat ciutadana`: cap resultat). Sí que hi ha
  `incidents-gestionats-gub`, per barri, però és el registre d'activitat de la
  Guàrdia Urbana —trànsit, aparcament, incendis, animals, avaries— i no
  sostindria una xifra de criminalitat.
- **Idescat EMEX** no porta cap indicador de delictes.

### La URL no és estable

L'identificador PX canvia cada trimestre (2025: Q1 `1509001-003` … Q4
`1509010-012`; 2024 Q4 `1409010-012`). Per això el script **rasca l'índex** i
agafa l'última taula del trimestre en comptes de tenir el número escrit:

```
https://estadisticasdecriminalidad.ses.mir.es/sec/dynPx/inebase/index.htm?type=pcaxis&path=/DatosBalanceAnt/{període}/&file=pcaxis
```

El CSV és `;`-separat i **UTF-8 amb BOM** (`utf-8-sig`), no ISO-8859. La
columna de geografia porta el codi INE al davant (`08019 Barcelona`), així que
creua amb `zonas.json` sense taula de correspondències.

### El que la xifra mesura de veritat

**Els delictes es compten on passen, no on viu qui els pateix.** Un municipi
amb aeroport, port, polígon o molt turisme surt alt sense que els seus veïns
hi visquin pitjor. Amb les dades de 2025:

| Municipi | Delictes/1.000 hab. | Per què |
|---|---:|---|
| el Prat de Llobregat | 160,8 | l'aeroport és dins el terme |
| Sant Adrià de Besòs | 107,7 | |
| Barcelona | 99,0 | ~45 % del total són furts |
| Castellar del Vallès | 14,9 | el mínim de la sèrie |

Els **robatoris en domicili** són l'única de les tres xifres que mesura una
cosa que li passa a qui hi viu, i per això no s'assembla a les altres: a dalt
hi surten municipis benestants de casa baixa (Sant Cugat del Vallès, 2,6 ‰),
que és on es roba a les cases.

---

## 2. Zona verda per habitant — Diputació de Barcelona

**Observatori del Territori**, via Socrata (Dades Obertes de Catalunya).

```
https://analisi.transparenciacatalunya.cat/resource/8aaj-ypcb.json
```

Camp `_38_comp_sol_sv_hab` → `zona_verda_m2_hab`. Any 2024, **91/91
municipis**, 0 barris.

El `codi_municipi` de Socrata porta el dígit de control (`080193`); es talla a
5 posicions per creuar amb el codi INE.

Compte amb la lectura: mesura el **sòl verd urbà dins del terme municipal per
habitant**, així que un municipi petit envoltat de bosc surt altíssim
(Matadepera, 224,5 m²/hab.) i una ciutat densa surt baixa (Barcelona, 8,2).
No diu a quina distància tens un parc.
