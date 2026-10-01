# `esport.json` — fonts de dades

Generat amb `build_esport.mjs`. **Espais esportius per zona**, i és dels pocs
indicadors que arriba a **163 de les 164 zones**.

| | |
|---|---|
| Conjunt | «Cens d'equipaments esportius» (CEEC) |
| Organisme | Consell Català de l'Esport, Generalitat |
| Recurs | Socrata [`edxn-ww2s`](https://analisi.transparenciacatalunya.cat/d/edxn-ww2s) |
| Files | 42.776 a la província 08 (72.830 a tot Catalunya) |
| Coordenades | **100 %** de les files en porten |
| Cobertura | **91/91 municipis · 72/73 barris** |

---

## Per què la font original i no el resum d'Idescat

Idescat publica el mateix comptat (EMEX `f300`, «Espais esportius») però **només
per municipi**. La font original porta coordenades, i això permet baixar al
barri per *point-in-polygon* — geometria, no estimació — i passar de 91 zones
cobertes a 163.

El resum serveix llavors per una altra cosa millor: **validar el recompte**. El
script demana `f300` per Barcelona i compara. Avui:

```
Barcelona · Idescat f300: 5112 · aquí: 5112 · 0,00 % de diferència
```

Si es separessin més d'un **2 %**, el script **es planta**. És la manera de
saber que el filtre de classificacions segueix sent el bo el dia que el cens
canviï de codis.

> `api.idescat.cat` **penja el `fetch` de Node** («Connect Timeout» als 10 s,
> cada vegada) mentre que `node:https` i curl hi entren sense problema. El
> script fa servir `node:https` només per aquesta crida. És el revers del cas ja
> documentat del portal de Barcelona, que mata el TLS de Node sencer.

## Què es compta

**Espais**, no instal·lacions: un poliesportiu amb tres pistes són tres.

Es descarten sis classificacions que acompanyen l'esport però no són on es fa:

| Codi | Què és |
|---|---|
| `VES` | vestidors |
| `MAG` | magatzems |
| `SER` | serveis |
| `GRA` | grades |
| `COM` | comerç |
| `POR` | porteria |

Són **12.767 de les 42.776** files de la província. Cap d'elles declara
superfície al cens, cosa que confirma que la font les tracta igual. I és
exactament el tall amb què el recompte quadra amb Idescat.

## Per què un recompte i no metres quadrats

El cens porta `superf_cie` i en principi seria més informatiu. Però dels ~34
milions de m² de Catalunya, **16,3 milions són camps de golf** i 9,6 més espais
naturals: per superfície, un municipi amb un golf sortiria disparat i
l'indicador diria «aquí es pot fer esport» quan diu «aquí hi ha un club de
golf». Comptant espais, el golf compta un.

## Com es reparteix

- **Municipis**: pel camp `ine`, que porta el dígit de control (`080193` →
  `08019`). 91/91.
- **Barris**: els 5.112 espais de Barcelona porten coordenades i es posen dins
  del polígon del barri amb el mateix *ray casting* que `build_centres.mjs`.
  **72 de 73**; només **2 punts de 5.112** cauen fora de tot polígon.

La Teixonera surt amb **zero**, i és un zero de debò, no un forat: el cens cobreix
tota la ciutat i un barri petit de vessant pot no tenir ni una pista. Mateix
criteri que amb els centres educatius.

## Cautela

La taxa per mil habitants és **soroll als municipis petits**: amb dos espais i
400 veïns surt un número altíssim que no diu res. Es publica perquè la dada és
certa, i la pàgina avisa. Sant Cugat del Vallès en té 9,91 per mil i Barcelona
2,98: la diferència és real, però part és mida.

## Reproduir-ho

```sh
cd data-src/donde-vivir-barcelona
node build_esport.mjs
node build-transport.mjs
```
