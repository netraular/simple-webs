#!/usr/bin/env python3
"""Locales vacíos por barrio de Barcelona → data-src/comerc.json

El censo comercial del Ayuntamiento recorre a pie todos los locales de planta
baja de la ciudad y anota si tienen actividad o no. De ahí sale un indicador que
no publica ninguna estadística oficial: **qué proporción de los bajos de tu
calle están cerrados**.

Es el «¿hay vida aquí?» que no contesta ninguna otra fuente. Va del **3,7 %** de
Torre Baró al **23,1 %** de la Font d'en Fargues, con un 10,9 % de media de
ciudad.

**Solo Barcelona.** Fuera de la ciudad no hay equivalente: el «Cens d'activitats
municipal» de la Diputació (Socrata `txvw-xc3g`) solo recoge los ayuntamientos
que le delegan la gestión —43 de nuestros 92, y Barcelona no está—, así que no
se puede completar. Otro indicador de los que solo tienen los 73 barrios.

**Se usa el censo de 2022, no el de 2024, y esto importa.** El recurso de 2024
(`38babeec-…`) está **truncado**: devuelve exactamente 44.000 filas, le falta el
barrio 54 y da resultados imposibles —Pedralbes con 8 locales y el 100 % vacíos,
Vallvidrera con 3—. El de 2022 tiene 66.088 filas y los 73 barrios.

Ese error no se ve si uno se fía de lo que le llega: el portal **no** devuelve
`total` con `include_total`, así que un script que pida las filas y las cuente
no sabe si le han dado todas. Por eso lo primero que hace este es un
`SELECT count(*)` y se planta si no cuadra.

Se baja por **`datastore_search_sql`**: permite agrupar en el servidor y evita
bajarse los 25 MB del CSV. Va en Python porque el portal **corta el handshake
TLS de Node** (ECONNRESET).

    python3 build_comerc.py [--fresh]
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
SORTIDA = AQUI / "comerc.json"

CKAN = "https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search_sql"
RECURS = "99764d55-b1be-4281-b822-4277442cc721"   # Cens comercial 2022, complet
ANY = 2022
N_BARRIS = 73
FILES_MIN = 60000         # el de 2022 son 66.088; el truncado de 2024, 44.000

SENSE_ACTIVITAT = "Sense activitat Econòmica"
# Con pocos locales el porcentaje solo puede tomar un puñado de valores y se
# leería como una diferencia real. Mismo criterio que el % de centros públicos.
MIN_LOCALS = 30

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
    print("locales vacíos por barrio de Barcelona\n")

    # 1. ¿Está el recurso entero? Es la comprobación que destapó que el de 2024
    #    no lo está, y la única forma de saberlo en este portal.
    n = int(sql(f'SELECT count(*) as n FROM "{RECURS}"', "bcn-comerc-count.json", fresh)[0]["n"])
    print(f"· {n} locales en el recurso")
    if n < FILES_MIN:
        raise SystemExit(f"solo {n} locales (esperaba {FILES_MIN}+): el recurso viene "
                         f"truncado, como el censo de 2024. No se publica.")

    files = sql(
        f'SELECT "Codi_Barri", "Nom_Barri", count(*) as locals, '
        f'sum(case when "Nom_Principal_Activitat" = \'{SENSE_ACTIVITAT}\' then 1 else 0 end) as buits '
        f'FROM "{RECURS}" GROUP BY "Codi_Barri", "Nom_Barri"',
        "bcn-comerc-barris.json", fresh)

    barris: dict[str, dict] = {}
    for f in files:
        codi = str(f["Codi_Barri"]).zfill(2)
        locals_, buits = int(f["locals"]), int(f["buits"])
        if locals_ <= 0:
            continue
        fitxa = {"nom": f["Nom_Barri"], "locals": locals_, "locals_buits": buits}
        if locals_ >= MIN_LOCALS:
            fitxa["pct_locals_buits"] = round(buits / locals_ * 100, 1)
        barris[codi] = fitxa

    if len(barris) != N_BARRIS:
        raise SystemExit(f"esperaba {N_BARRIS} barrios y he encontrado {len(barris)}: "
                         f"faltan {sorted(set(f'{i:02d}' for i in range(1, 74)) - set(barris))}")

    tot = sum(b["locals"] for b in barris.values())
    buits = sum(b["locals_buits"] for b in barris.values())
    sense_pct = [c for c, b in barris.items() if "pct_locals_buits" not in b]
    print(f"· {len(barris)} barrios · {tot:,} locales · {buits / tot * 100:.1f} % vacíos"
          .replace(",", "."))
    if sense_pct:
        print(f"· sin porcentaje por tener menos de {MIN_LOCALS} locales: {sense_pct}")
    ordre = sorted((b for b in barris.values() if "pct_locals_buits" in b),
                   key=lambda b: -b["pct_locals_buits"])
    for b in ordre[:2] + ordre[-2:]:
        print(f"    {b['nom'][:30]:32} {b['pct_locals_buits']:>5} % vacíos "
              f"de {b['locals']} locales")

    dades = {
        "generat": date.today().isoformat(),
        "font": "Ajuntament de Barcelona · Cens comercial de la ciutat",
        "url": f"{CKAN}?sql=… FROM \"{RECURS}\"",
        "recurs": RECURS,
        "any": ANY,
        "locals": tot,
        "min_locals_per_percentatge": MIN_LOCALS,
        "nota": ("Porcentaje de locales de planta baja sin actividad económica, según "
                 "el censo comercial, que se levanta recorriendo la ciudad a pie. Mide "
                 "si los bajos de la calle están abiertos o cerrados, no cuánto "
                 "comercio hay: un barrio residencial con pocos locales y todos "
                 "abiertos sale igual de bien que uno con muchos. Es dato de 2022 "
                 "porque el censo de 2024 que publica el portal está truncado (44.000 "
                 "filas y 72 barrios, con valores imposibles). No existe para los "
                 "municipios: fuera de Barcelona no hay censo comercial comparable. El "
                 f"porcentaje solo se publica con {MIN_LOCALS} locales o más."),
        "barris": barris,
    }
    SORTIDA.write_text(json.dumps(dades, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    print(f"\n→ {SORTIDA.name}: {len(barris)} barrios")


if __name__ == "__main__":
    main()
