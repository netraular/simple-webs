# `bcn-barris-poblacio.json` — fonts de dades

Generat el **2026-09-21** amb `build_poblacio.py` (al mateix directori).

Població dels **73 barris de Barcelona** segons el **Padró Municipal d'Habitants
a 1 de gener de 2026**.

Cap xifra és inventada ni estimada: cada valor és la suma exacta de les files del
CSV oficial. Els 73 barris tenen dada (cap `null`).

---

## Font

| | |
|---|---|
| Portal | Open Data BCN (CKAN) — Ajuntament de Barcelona |
| Dataset | `pad_mdbas_sexe` — "Població per sexe" (`package_id` `16c11ddf-a783-4b64-aa68-3dc83dc70379`) |
| Recurs | `2026_pad_mdbas_sexe.csv` (`resource_id` `3057b89d-9713-4001-8f07-a6fb122a152b`) |
| Data de referència | **2026-01-01** (columna `Data_Referencia`, valor únic a tot el fitxer) |
| Productor | Ajuntament de Barcelona, Oficina Municipal de Dades (OMD) — Padró Municipal d'Habitants |
| Freqüència | anual |

**URL exacta del recurs descarregat:**

```
https://opendata-ajuntament.barcelona.cat/data/dataset/16c11ddf-a783-4b64-aa68-3dc83dc70379/resource/3057b89d-9713-4001-8f07-a6fb122a152b/download
```

Fitxa del dataset:
<https://opendata-ajuntament.barcelona.cat/data/ca/dataset/pad_mdbas_sexe>

Descoberta via:
`https://opendata-ajuntament.barcelona.cat/data/api/3/action/package_search?q=poblacio+barris&rows=30`
i `.../package_show?id=pad_mdbas_sexe`.

---

## Com s'ha agregat

El CSV té 2.136 files amb les columnes:

```
Data_Referencia,Codi_Districte,Nom_Districte,Codi_Barri,Nom_Barri,AEB,Seccio_Censal,Valor,SEXE
2026-01-01,1,Ciutat Vella,1,el Raval,1,1001,682,1
```

La granularitat és **(districte, barri, AEB, secció censal, sexe)**: 1.068 seccions
censals × 2 sexes (`SEXE` 1 = homes, 2 = dones). **No hi ha cap fila de total** ni
subtotal, de manera que l'agregació és una **suma directa de `Valor` agrupant per
`Codi_Barri`**, sense risc de doble compte.

Comprovacions fetes pel script:

- `Data_Referencia` té un únic valor (`2026-01-01`).
- Tots els `Valor` són numèrics (0 files suprimides o amb `..`).
- Hi ha exactament 73 valors de `Codi_Barri`, 10 de `Codi_Districte`.
- El total resultant ha de caure dins 1.600.000 – 1.800.000 (si no, el script avorta).

### Codis i noms

`Codi_Barri` ve al CSV com a enter (`1` … `73`) i es normalitza a **dos dígits amb
zero al davant** (`"01"` … `"73"`) per casar amb `codi_barri` de `bcn-barris.geojson`.

- **Encreuament amb `bcn-barris.geojson`: 73/73 codis casen**, cap sobrer per cap
  dels dos costats.
- El `nom_barri` de sortida es pren del **geojson** (per garantir identitat exacta
  en el creuament); s'ha verificat que els 73 noms del CSV són **idèntics** als del
  geojson, cap discrepància.
- L'ordre de sortida és per codi de barri ascendent.

---

## Resultat i control de coherència

| | |
|---|---|
| Barris amb dada | **73 / 73** |
| Total Barcelona (suma dels 73 barris) | **1.729.963** hab. (1/1/2026) |
| Barri més poblat | **Sant Andreu** (`60`) — 59.330 |
| 2n més poblat | la Nova Esquerra de l'Eixample (`09`) — 59.117 |
| Barri menys poblat | **la Clota** (`42`) — 1.123 |
| 2n menys poblat | Vallbona (`56`) — 1.440 |

Contrast amb l'any anterior del mateix dataset (`2025_pad_mdbas_sexe.csv`,
`resource_id` `30d95868-7968-4a26-bf9b-9eaee53b2e3f`): total **1.732.066** hab. a
1/1/2025, també amb 73 barris. La variació 2025 → 2026 és de **−2.103** hab.
(−0,12 %), coherent amb una sèrie padronal estable.

Els extrems encaixen amb el perfil esperat de la ciutat: capçalera de 46.000–60.000
hab. (Sant Andreu, la Nova Esquerra de l'Eixample, la Sagrada Família, la Vila de
Gràcia, el Raval) i cua per sota de 3.000 (la Clota, Vallbona, Can Peguera,
Baró de Viver).

---

## Reproduir

```sh
python3 build_poblacio.py
```

Torna a descarregar el recurs, reagrega i reescriu `bcn-barris-poblacio.json`.
Per canviar d'any, cal actualitzar `ANY` i `RESOURCE_URL` amb el `resource_id`
corresponent (surten de `package_show?id=pad_mdbas_sexe`).
