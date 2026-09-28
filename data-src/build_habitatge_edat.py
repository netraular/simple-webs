#!/usr/bin/env python3
"""Antigüedad del parque de vivienda, por barrio → data-src/edat-habitatge.json

El catastro de Barcelona publica cuántas viviendas de cada sección censal se
construyeron en cada tramo de años. Sumando por barrio sale la pregunta que se
hace de verdad quien mira un piso: **¿qué antigüedad tiene lo que hay aquí?**

De ahí sale un solo campo, `pct_habitatge_pre1960`: qué proporción del parque
es anterior a 1960. Es la frontera que separa el ensanche y los cascos antiguos
—patios de luces, sin ascensor, sin aislamiento— de la ciudad de los sesenta en
adelante. Discrimina muchísimo: del **0,0 %** de Baró de Viver y Canyelles al
**66,9 %** del Barri Gòtic.

**Solo Barcelona, y no hay forma de extenderlo.** El Censo de Población y
Viviendas del INE publica «Año de construcción del edificio» por municipio solo
para los de más de 50.000 habitantes: de los nuestros, **17 de 91** (tabla tpx
59527, comprobada). No hay tabla por sección censal ni ninguna equivalente que
cubra el resto. Así que este indicador es de los que solo tienen los 73 barrios,
como el ruido, y la página lo dice.

Se baja por **`datastore_search_sql`** —no `datastore_search`— porque permite
hacer el `GROUP BY` en el servidor y bajarse 8.236 filas agregadas en vez del
CSV entero. El portal tampoco protege esa API.

**El tamaño real hay que preguntarlo.** Este portal **no** devuelve `total` con
`include_total`, y hay recursos publicados **truncados** (el censo comercial de
2024 devuelve exactamente 44.000 filas y valores imposibles). Así que el script
hace su propio `SELECT count(*)` y se planta si no cuadra.

Va en Python y no en Node porque el portal **corta el handshake TLS de Node**
(ECONNRESET), mientras que `urllib` y curl pasan sin problema.

    python3 build_habitatge_edat.py [--fresh]
"""
from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

AQUI = Path(__file__).parent
CACHE = AQUI / "_work"
SORTIDA = AQUI / "edat-habitatge.json"

CKAN = "https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search_sql"
RECURS = "50e0edf3-c999-464a-afc2-0af71140fd0b"   # locals d'ús habitatge per any de construcció
N_BARRIS = 73
FILES_MIN = 8000          # 73 barrios × ~113 secciones × tramos; menos es truncamiento

# Los tramos anteriores a 1960, tal como los escribe el catastro. Se enumeran en
# vez de parsear el texto: «<1901» no tiene la forma de los demás y un parser
# que se lo tragara mal restaría un 9 % del parque sin decir nada.
PRE_1960 = ["<1901", "1901-1940", "1941-1950", "1951-1960"]

UA = {"User-Agent": "simple-webs/1.0 (+https://webs.raular.com)"}


def sql(consulta: str, nom: str, fresh: bool) -> list[dict]:
    url = CKAN + "?" + urllib.parse.urlencode({"sql": consulta})
    cau = CACHE / nom
    if cau.exists() and not fresh:
        brut = cau.read_bytes()
    else:
        CACHE.mkdir(exist_ok=True)
        print(f"  ↓ {consulta[:88]}…")
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r:
            brut = r.read()
        if brut[:400].lstrip().lower().startswith((b"<!doctype", b"<html")):
            raise SystemExit("el portal ha devuelto HTML: han vuelto a bloquear la API")
        cau.write_bytes(brut)
    cos = json.loads(brut)
    if not cos.get("success"):
        raise SystemExit(f"CKAN ha contestado success:false · {json.dumps(cos)[:200]}")
    return cos["result"]["records"]


def main() -> None:
    fresh = "--fresh" in sys.argv
    print("antigüedad del parque de vivienda, por barrio de Barcelona\n")

    # 1. ¿Está el recurso entero? El portal no lo dice si no se le pregunta.
    n = int(sql(f'SELECT count(*) as n FROM "{RECURS}"', "bcn-edat-count.json", fresh)[0]["n"])
    print(f"· {n} filas en el recurso")
    if n < FILES_MIN:
        raise SystemExit(f"solo {n} filas (esperaba {FILES_MIN}+): el recurso viene "
                         f"truncado, como el censo comercial de 2024. No se publica.")

    anys = [r["Any"] for r in sql(f'SELECT DISTINCT "Any" FROM "{RECURS}"',
                                  "bcn-edat-any.json", fresh)]
    if len(anys) != 1:
        raise SystemExit(f"el recurso mezcla {len(anys)} años ({anys}): hay que filtrar")
    any_ = int(anys[0])
    print(f"· año {any_}")

    # 2. El agregado, hecho en el servidor.
    tram_in = ", ".join("'" + t.replace("'", "''") + "'" for t in PRE_1960)
    files = sql(
        f'SELECT "Codi_barri", "Nom_barri", sum(cast("Nombre" as int)) as total, '
        f'sum(case when "Any_construccio" in ({tram_in}) then cast("Nombre" as int) '
        f'else 0 end) as pre1960 '
        f'FROM "{RECURS}" GROUP BY "Codi_barri", "Nom_barri"',
        "bcn-edat-barris.json", fresh)

    barris: dict[str, dict] = {}
    for f in files:
        codi = str(f["Codi_barri"]).zfill(2)
        total, pre = int(f["total"]), int(f["pre1960"])
        if total <= 0:
            continue
        barris[codi] = {
            "nom": f["Nom_barri"],
            "habitatges": total,
            "pct_habitatge_pre1960": round(pre / total * 100, 1),
        }

    if len(barris) != N_BARRIS:
        raise SystemExit(f"esperaba {N_BARRIS} barrios y he encontrado {len(barris)}: "
                         f"faltan {sorted(set(f'{i:02d}' for i in range(1, 74)) - set(barris))}")

    suma = sum(b["habitatges"] for b in barris.values())
    print(f"· {len(barris)} barrios · {suma:,} viviendas".replace(",", "."))
    ordre = sorted(barris.items(), key=lambda kv: -kv[1]["pct_habitatge_pre1960"])
    for codi, b in ordre[:2] + ordre[-2:]:
        print(f"    {codi} {b['nom'][:30]:32} {b['pct_habitatge_pre1960']:>5} % anterior a 1960")

    dades = {
        "generat": date.today().isoformat(),
        "font": "Ajuntament de Barcelona · Cadastre, locals d'ús habitatge per any de construcció",
        "url": f"{CKAN}?sql=… FROM \"{RECURS}\"",
        "recurs": RECURS,
        "any": any_,
        "habitatges": suma,
        "tram_pre1960": PRE_1960,
        "nota": ("Porcentaje de las viviendas del barrio construidas antes de 1960, "
                 "según el catastro. 1960 es la frontera entre la ciudad de patios de "
                 "luces, sin ascensor y sin aislamiento, y la de la expansión "
                 "posterior. Cuenta viviendas, no edificios. Es dato de barrio y no "
                 "existe para los municipios: el Censo del INE solo publica año de "
                 "construcción para los de más de 50.000 habitantes, 17 de los "
                 "nuestros, y no hay tabla equivalente más fina."),
        "barris": barris,
    }
    SORTIDA.write_text(json.dumps(dades, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    print(f"\n→ {SORTIDA.name}: {len(barris)} barrios")


if __name__ == "__main__":
    main()
