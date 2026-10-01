#!/usr/bin/env python3
"""Origen de la población por barrio de Barcelona → data-src/donde-vivir-barcelona/nacionalitats.json

El padrón municipal agrupa a cada vecino por la **región geográfica de su
nacionalidad**: 21 regiones de la clasificación de Naciones Unidas, de «Àfrica
oriental» a «Micronèsia». De ahí salen dos cifras y un desglose.

**Lo primero, porque si no el número dice algo que no es: la nacionalidad no es
el idioma ni el origen.** Quien se nacionaliza deja de contar como extranjero
aunque llegara el año pasado; un brasileño cuenta en América del Sur y no habla
español; un argentino con pasaporte italiano cuenta en la UE. Esto mide
**nacionalidad registrada en el padrón**, y nada más. La misma advertencia que
ya lleva `pct_estrangera`, extendida a estas dos.

Dos capas:

* `pct_nac_ue` — nacionalidad de otro país de la Unión Europea (sin España).
* `pct_nac_llatinoamerica` — Caribe + América Central + América del Sur. Es lo
  más cerca que llega un dato público de «habla hispana», y **no es lo mismo**:
  dentro están Brasil y Haití, y fuera está quien ya tiene el DNI.

Y un **desglose completo** para la ficha —UE · resto de Europa · África ·
América Latina · América del Norte · Asia y Oceanía—, que es donde un reparto
se lee bien sin convertirse en un eje por el que ordenar el mapa.

**Hacen falta dos recursos, no uno.** Las 21 regiones son de la ONU, así que
**España está dentro de «Europa meridional»** junto a Italia y Portugal: de esa
tabla sola no sale la UE. El segundo recurso, el que parte la población en
España / resto de la UE / resto del mundo, lo resuelve, y de paso permite un
contraste que vale más que cualquier declaración: las dos tablas tienen que dar
la misma población de ciudad.

**Solo Barcelona, y no por pereza.** Se buscó el equivalente para los 91
municipios y no existe como dato público:

* **Idescat EMEX** llega a «Població. Per nacionalitat», que es española y
  extranjera, y nada más. No hay tabla por continentes en su API.
* **INE, Estadística Continua de Población**: la única tabla municipal con
  nacionalidad (79544) tiene exactamente tres categorías —Total, Española,
  Extranjera—. El desglose por agrupación de países (77019, 77023) solo baja a
  comunidad autónoma y provincia.
* **analisi.transparenciacatalunya.cat**: la población extranjera por país de
  nacionalidad es del conjunto de Cataluña, sin desagregar por municipio.

Así que es otro indicador de los que solo tienen los 73 barrios, como el ruido,
los locales vacíos y los avisos del IRIS.

Va en Python porque el portal **corta el handshake TLS de Node** (ECONNRESET).

    python3 build_nacionalitats.py [--fresh]
"""
from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date
from pathlib import Path

AQUI = Path(__file__).parent
CACHE = AQUI / "_work"
SORTIDA = AQUI / "nacionalitats.json"
POBLACIO = AQUI / "bcn-barris-poblacio.json"

CKAN = "https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search"
REGIONS = "9577a42e-224d-42ea-ae47-039824b265df"   # 2026, 21 regiones × 73 barrios
GRUPS = "8fa43cfd-5d5b-4fc9-b40b-0a538d2b59b0"     # 2026, España / resta UE / resta del món
ANY = 2026
N_BARRIS = 73

# Códigos de la dimensión NACIONALITAT_REGIO, del diccionario del propio portal
# (dataset `pad-dimensions`). Se agrupan aquí y no en la página porque es una
# decisión de qué mide el indicador, no de cómo se pinta.
#   1-5   África · 6 Caribe · 7 América central · 8 América del sur
#   9     América del norte · 10-14 Asia · 15-18 Europa · 19-22 Oceanía · 23 No consta
AFRICA = ("1", "2", "3", "4", "5")
LLATINA = ("6", "7", "8")
AMERICA_NORD = ("9",)
ASIA = ("10", "11", "12", "13", "14")
EUROPA = ("15", "16", "17", "18")       # ¡España está aquí dentro!
OCEANIA = ("19", "20", "21", "22")

# Dimensión NACIONALITAT_G del segundo recurso.
G_ESPANYA, G_UE, G_RESTA = "1", "2", "3"

# El portal enmascara como «..» todo valor menor que 5. Cuenta como 0 y se dice
# cuántas celdas eran: en la tabla de regiones son decenas sobre 1,7 millones de
# personas, así que mueve el porcentaje mucho menos que el redondeo, pero
# declararlo cuesta una línea y no declararlo es fingir exactitud.
MASCARA = ".."

UA = {"User-Agent": "simple-webs/1.0 (+https://webs.raular.com)"}


def registres(recurs: str, nom: str, fresh: bool) -> list[dict]:
    url = CKAN + "?" + urllib.parse.urlencode({"resource_id": recurs, "limit": 50000})
    cau = CACHE / nom
    if cau.exists() and not fresh:
        brut = cau.read_bytes()
    else:
        CACHE.mkdir(exist_ok=True)
        print(f"  ↓ {recurs}")
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r:
            brut = r.read()
        if brut[:400].lstrip().lower().startswith((b"<!doctype", b"<html")):
            raise SystemExit("el portal ha devuelto HTML: han vuelto a bloquear la API")
        cau.write_bytes(brut)
    cos = json.loads(brut)
    if not cos.get("success"):
        raise SystemExit(f"CKAN ha contestado success:false · {json.dumps(cos)[:200]}")
    return cos["result"]["records"]


def suma(recs: list[dict], dim: str) -> tuple[dict[str, dict[str, int]], int]:
    """{codi_barri: {valor_dimensio: persones}}, y cuántas celdas venían enmascaradas."""
    out: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    amagades = 0
    for r in recs:
        v = str(r["Valor"]).strip()
        if not v.lstrip("-").isdigit():
            if v == MASCARA:
                amagades += 1
            continue
        codi = str(r["Codi_Barri"]).zfill(2)
        out[codi][str(r[dim])] += int(v)
    return out, amagades


def main() -> None:
    fresh = "--fresh" in sys.argv
    print(f"origen de la población por barrio de Barcelona · padrón {ANY}\n")

    reg, amagades_reg = suma(registres(REGIONS, "bcn-nac-regio.json", fresh), "NACIONALITAT_REGIO")
    grp, amagades_grp = suma(registres(GRUPS, "bcn-nac-grup.json", fresh), "NACIONALITAT_G")

    for nom, d in (("regiones", reg), ("grupos", grp)):
        if len(d) != N_BARRIS:
            raise SystemExit(f"la tabla de {nom} trae {len(d)} barrios y esperaba {N_BARRIS}")

    # El contraste que de verdad vale: dos recortes distintos del mismo padrón
    # tienen que dar la misma ciudad. Si se separan, una de las dos descargas
    # viene incompleta y no lo diría ninguna otra comprobación.
    tot_reg = sum(sum(v.values()) for v in reg.values())
    tot_grp = sum(sum(v.values()) for v in grp.values())
    desviacio = abs(tot_reg - tot_grp) / max(tot_reg, tot_grp) * 100
    print(f"· por regiones {tot_reg} personas · por grupos {tot_grp} "
          f"({desviacio:.2f} % de diferencia)")
    print(f"· celdas enmascaradas por ser menores que 5: {amagades_reg} en regiones, "
          f"{amagades_grp} en grupos")
    if desviacio > 0.5:
        raise SystemExit("las dos tablas no cuadran: alguna descarga viene incompleta")

    padro = json.loads(POBLACIO.read_text("utf8"))
    noms = {b["codi_barri"]: b["nom_barri"] for b in padro}

    barris: dict[str, dict] = {}
    for codi, r in reg.items():
        g = grp.get(codi, {})
        total = sum(r.values())
        if total <= 0:
            raise SystemExit(f"barrio {codi} sin población en la tabla de regiones")
        ue = g.get(G_UE, 0)
        espanya = g.get(G_ESPANYA, 0)
        # «Resto de Europa» es lo que queda de Europa al quitar España y la UE:
        # Reino Unido, Ucrania, Rusia, Suiza, los Balcanes. No hay ninguna otra
        # forma de separarlo, porque las regiones de la ONU no saben de la UE.
        europa = sum(r.get(c, 0) for c in EUROPA)
        resta_europa = max(europa - espanya - ue, 0)
        llatina = sum(r.get(c, 0) for c in LLATINA)

        def pct(n: int) -> float:
            return round(n / total * 100, 1)

        barris[codi] = {
            "nom": noms.get(codi, "?"),
            "poblacio_padro": total,
            "pct_nac_ue": pct(ue),
            "pct_nac_llatinoamerica": pct(llatina),
            # El desglose de la ficha. Suma ~100 con la parte española, que la
            # página ya tiene como el complemento de `pct_estrangera`.
            "regions": {
                "ue": pct(ue),
                "resta_europa": pct(resta_europa),
                "africa": pct(sum(r.get(c, 0) for c in AFRICA)),
                "llatinoamerica": pct(llatina),
                "america_nord": pct(sum(r.get(c, 0) for c in AMERICA_NORD)),
                "asia_oceania": pct(sum(r.get(c, 0) for c in ASIA + OCEANIA)),
            },
        }

    ordre = sorted(barris.values(), key=lambda b: -b["pct_nac_llatinoamerica"])
    print(f"\n· latinoamericana, de {ordre[-1]['pct_nac_llatinoamerica']} % a "
          f"{ordre[0]['pct_nac_llatinoamerica']} %")
    for b in ordre[:3] + ordre[-2:]:
        print(f"    {b['nom'][:30]:32} {b['pct_nac_llatinoamerica']:>5} % Latam · "
              f"{b['pct_nac_ue']:>4} % UE")

    dades = {
        "generat": date.today().isoformat(),
        "font": "Ajuntament de Barcelona · Padró Municipal d'Habitants (OMD)",
        "recursos": {"regions": REGIONS, "grups": GRUPS},
        "any": ANY,
        "poblacio_padro": tot_reg,
        "celles_emmascarades": {"regions": amagades_reg, "grups": amagades_grp},
        "nota": ("Reparto de la población por la región geográfica de su nacionalidad, "
                 "según el padrón municipal. La nacionalidad no es el idioma ni el "
                 "origen: quien se nacionaliza deja de contar como extranjero aunque "
                 "llegara el año pasado, un brasileño cuenta en América del Sur y no "
                 "habla español, y un argentino con pasaporte italiano cuenta en la UE. "
                 "«América Latina» es Caribe más América Central más América del Sur, "
                 "que es lo más cerca que llega un dato público de «habla hispana» sin "
                 "llegar a serlo. No existe para los municipios: ni Idescat ni el INE "
                 "publican el desglose por origen por debajo de la provincia."),
        "barris": barris,
    }
    SORTIDA.write_text(json.dumps(dades, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    print(f"\n→ {SORTIDA.name}: {len(barris)} barrios")


if __name__ == "__main__":
    main()
