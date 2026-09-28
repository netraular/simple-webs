# `centres.json` — fonts de dades

Generat amb `build_centres.mjs`. Centres educatius per zona, i és **un dels pocs
indicadors que arriba a les 164** sense inventar-se res.

| | |
|---|---|
| Conjunt | `kvmv-ahh4` · «Directori de centres docents anual. Base 2020» |
| Organisme | Departament d'Educació |
| URL | <https://analisi.transparenciacatalunya.cat/resource/kvmv-ahh4.json> |
| Sèrie | curs 2020/21 – **2025/2026** |
| Àmbit baixat | província 08, curs més recent: **3.582 centres** |

El curs no va escrit a mà: el script demana `$select=curs&$group=curs&$order=curs
DESC&$limit=1` i es queda amb el més nou. Cada setembre en surt un, i escriure'l
al codi el deixaria desfasat sense avisar.

---

## Com es reparteixen

**Municipis.** Directe: el conjunt porta `codi_municipi` amb el codi INE de 5
dígits, la mateixa clau que fa servir tota la resta del projecte. **92/92**, cap
municipi sense cap centre.

**Barris de Barcelona.** Per **point-in-polygon**: els 943 centres de la ciutat
porten els 943 les seves coordenades (`coordenades_geo_x` / `_y`, WGS84) i
s'assignen al barri el polígon del qual els conté, amb `data-src/bcn-barris.geojson`,
que ja era al repositori. Això és **geometria, no una estimació**: cada centre va
al barri on és, no a un repartiment proporcional.

- **73/73 barris** en tenen algun.
- **2 centres de 943** no cauen dins de cap polígon (queden just al límit del
  terme) i no s'assignen a cap barri. Surten al recompte de la consola.

El conjunt porta també `codi_districte_municipal`, que serveix de xarxa de
seguretat: els 10 districtes hi són i quadren.

---

## Camps que en surten

| Camp | Unitat | Municipis | Barris |
|---|---|---|---|
| `centres_educatius_1000` | centres / 1.000 hab. | 91/91 | 73/73 |
| `pct_centres_publics` | % | 71/91 | 63/73 |

Tots dos van dins de `ind`.

### Per què `pct_centres_publics` no hi és sempre

Només es publica a partir de **5 centres**. Amb tres, els únics valors possibles
són 0, 33, 67 i 100: un percentatge que només pot donar quatre respostes no és
un percentatge, és una classificació disfressada, i en un mapa es llegiria com
una diferència real entre municipis. El llindar queda escrit al JSON
(`min_centres_per_percentatge`) perquè la pàgina el pugui citar.

### Per què la taxa per mil habitants s'ha de mirar amb cura

Es dispara als municipis petits: dos centres sobre 900 veïns donen 2,2 per mil
quan la mediana de l'àrea ronda el 0,6. El número és cert —hi ha aquests dos
centres— però no vol dir que hi hagi més oferta escolar de la que hi ha. La
pàgina ho adverteix a la nota de la capa.

---

## Què NO diu

- **«Privat» inclou el concertat.** El directori marca `nom_naturalesa` amb
  `Públic` o `Privat`, i el concert va en un altre conjunt (`8spq-9nx7`,
  «Concerts educatius»), que no s'ha creuat. Per tant `pct_centres_publics` és
  *públic contra tota la resta*, no *públic contra privat pur*.
- **Hi entren tots els ensenyaments**: llars d'infants, escoles, instituts,
  centres d'adults i d'ensenyaments de règim especial. No es distingeix per
  etapa, tot i que el conjunt porta una columna per ensenyament (`einf2c`,
  `epri`, `eso`, `batx`…) per a qui la vulgui.
- **No mesura places ni qualitat**, només quants centres hi ha. Un institut de
  1.200 alumnes compta igual que una llar d'infants de 40.
- **No mesura proximitat.** Un centre al límit del barri veí pot quedar més a
  prop de casa teva que el del teu barri.

---

## Refer-ho

```sh
cd data-src
node build_centres.mjs
node build-transport.mjs
node test-transport.mjs
```

No cacheja: són dues consultes Socrata i menys de 2 MB.
