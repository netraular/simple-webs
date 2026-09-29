#!/usr/bin/env python3
"""Avisos y quejas ciudadanas (IRIS) por barrio de Barcelona → data-src/queixes.json

El IRIS es el buzón por el que la ciudad le dice al Ayuntamiento que algo no
está bien: un contenedor desbordado, una farola fundida, una acera levantada,
un coche abandonado. Cada ficha lleva el barrio, así que se puede contar cuántos
avisos por mil habitantes salen de cada sitio.

**Lo primero, porque si no el número engaña: esto mide la propensión a avisar
tanto como el problema.** Un barrio organizado, con gente que tiene tiempo y
espera que le contesten, avisa más que uno que dejó de esperarlo hace años. Dos
sitios igual de sucios pueden salir con cifras muy distintas, y el que sale
peor puede ser el que más se cuida. Se publica porque un aviso es un hecho
—alguien vio algo y lo dijo—, pero leerlo como «aquí hay más problemas» es
leerlo mal. La advertencia viaja con el dato hasta la ficha de la capa.

**Qué se cuenta y qué no.** El recurso trae 287.304 fichas, pero un tercio no
habla de ningún lugar: son trámites, impuestos y consultas al Ayuntamiento. Eso
se ve solo en los datos —el área «Portal de tràmits» tiene 29.914 fichas y
**ninguna** con barrio, y las consultas, 43.713, tampoco—, así que exigir
coordenada ya hace casi toda la limpieza. Aun así las áreas administrativas se
descartan por nombre, porque unas pocas sí traen barrio y seguirían sin hablar
del sitio.

Dos cifras:

* `queixes_1000` — todos los avisos que hablan del lugar.
* `queixes_neteja_1000` — recogida y limpieza + mantenimiento del espacio
  urbano: las dos áreas mayores con diferencia y las que describen cómo está la
  calle, que es lo que se nota al vivir allí.

**Solo Barcelona.** No hay nada equivalente en los 91 municipios: cada
ayuntamiento tiene su propio buzón y ninguno publica el recuento por zonas. Otro
indicador de los que solo tienen los 73 barrios, como el ruido y los locales
vacíos.

Se baja por `datastore_search_sql`, que agrupa en el servidor. Va en Python
porque el portal **corta el handshake TLS de Node** (ECONNRESET).

    python3 build_queixes.py [--fresh]
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
SORTIDA = AQUI / "queixes.json"
POBLACIO = AQUI / "bcn-barris-poblacio.json"

CKAN = "https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search_sql"
RECURS = "efc9fd4d-a812-427c-846d-a086d22012a4"   # IRIS 2025, el último año completo
ANY = 2025
N_BARRIS = 73
FILES_MIN = 200000        # el de 2025 son 287.304; el de 2026 va por 72.326, a medias

# Áreas que son trámites con el Ayuntamiento, no avisos sobre un lugar. Van en
# una lista y no repartidas por el código porque son la decisión editorial de
# este fichero. **El doble espacio de «Informació  tràmits» está en el origen**:
# si se corrige, deja de casar y vuelven a colarse 17.890 fichas.
AREES_FORA = (
    "Portal de tràmits",
    "Informació  tràmits i atenció ciutadana",
    "Gestions municipals",
    "Hisenda",
)

# Una consulta es una pregunta y un agradecimiento no es una queja. Ninguno de
# los dos trae barrio casi nunca, pero se excluyen por lo que son, no por lo
# que les falta.
TIPUS_FORA = ("CONSULTA", "QUERY", "AGRAIMENT", "GRATITUDE")

# Las dos áreas que describen cómo está la calle.
AREES_NETEJA = ("Recollida i neteja de l'espai urbà", "Manteniment de l'espai urbà")

UA = {"User-Agent": "simple-webs/1.0 (+https://webs.raular.com)"}


def llista(valors: tuple[str, ...]) -> str:
    """Los nombres llevan apóstrofos catalanes, así que hay que doblarlos."""
    return ", ".join("'" + v.replace("'", "''") + "'" for v in valors)


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
    print("avisos y quejas (IRIS) por barrio de Barcelona\n")

    # 1. ¿Está el recurso entero? El portal no devuelve `total` con
    #    `include_total`, así que contar las filas que llegan no dice nada: hay
    #    que preguntárselo. Es la comprobación que destapó el censo de 2024.
    n = int(sql(f'SELECT count(*) as n FROM "{RECURS}"', "bcn-iris-count.json", fresh)[0]["n"])
    print(f"· {n} fichas en el recurso de {ANY}")
    if n < FILES_MIN:
        raise SystemExit(f"solo {n} fichas (esperaba {FILES_MIN}+): el recurso viene "
                         f"truncado o es el del año en curso. No se publica.")

    # Se agrupa **solo por el código**, y el nombre sale del padrón. No es una
    # manía: el campo BARRI no siempre trae un barrio. Hay 84 pares
    # (código, nombre) para 73 códigos, porque una decena de fichas llevan ahí
    # la calle o el parque —«Ronda de la Universitat», «Parc de la Font del
    # Racó»—. Agrupando por los dos, esas fichas sueltas salían como filas
    # aparte y machacaban al barrio de verdad: el Poblenou pasaba de 5.640
    # avisos a 1. El código nunca falla; el rótulo sí.
    files = sql(
        f'SELECT "CODI_BARRI", count(*) as avisos, '
        f'sum(case when "AREA" in ({llista(AREES_NETEJA)}) then 1 else 0 end) as neteja '
        f'FROM "{RECURS}" '
        f'WHERE "CODI_BARRI" IS NOT NULL '
        f'AND "AREA" NOT IN ({llista(AREES_FORA)}) '
        f'AND "TIPUS" NOT IN ({llista(TIPUS_FORA)}) '
        f'GROUP BY "CODI_BARRI"',
        "bcn-iris-barris.json", fresh)

    padro = json.loads(POBLACIO.read_text("utf8"))
    pob = {b["codi_barri"]: b["poblacio"] for b in padro}
    noms = {b["codi_barri"]: b["nom_barri"] for b in padro}

    barris: dict[str, dict] = {}
    for f in files:
        codi = str(f["CODI_BARRI"]).zfill(2)
        avisos, neteja = int(f["avisos"]), int(f["neteja"])
        fitxa = {"nom": noms.get(codi, "?"), "avisos": avisos, "avisos_neteja": neteja}
        p = pob.get(codi)
        if p:
            fitxa["queixes_1000"] = round(avisos / p * 1000, 1)
            fitxa["queixes_neteja_1000"] = round(neteja / p * 1000, 1)
        barris[codi] = fitxa

    if len(barris) != N_BARRIS:
        raise SystemExit(f"esperaba {N_BARRIS} barrios y he encontrado {len(barris)}: "
                         f"faltan {sorted(set(f'{i:02d}' for i in range(1, 74)) - set(barris))}")
    sense_pob = [c for c, b in barris.items() if "queixes_1000" not in b]
    if sense_pob:
        raise SystemExit(f"sin población para {sense_pob}: ¿ha cambiado "
                         f"bcn-barris-poblacio.json?")

    tot = sum(b["avisos"] for b in barris.values())
    net = sum(b["avisos_neteja"] for b in barris.values())
    print(f"· {len(barris)} barrios · {tot} avisos localizados ({tot / n * 100:.0f} % del "
          f"recurso) · {net} de limpieza y mantenimiento ({net / tot * 100:.0f} %)")
    ordre = sorted(barris.values(), key=lambda b: -b["queixes_1000"])
    for b in ordre[:3] + ordre[-3:]:
        print(f"    {b['nom'][:30]:32} {b['queixes_1000']:>6} /1.000 hab."
              f" · {b['queixes_neteja_1000']:>6} de calle")

    dades = {
        "generat": date.today().isoformat(),
        "font": "Ajuntament de Barcelona · IRIS, incidències, queixes i suggeriments",
        "url": f"{CKAN}?sql=… FROM \"{RECURS}\"",
        "recurs": RECURS,
        "any": ANY,
        "fitxes_recurs": n,
        "avisos_localitzats": tot,
        "arees_excloses": list(AREES_FORA),
        "tipus_exclosos": list(TIPUS_FORA),
        "arees_neteja": list(AREES_NETEJA),
        "nota": ("Avisos, quejas y sugerencias que los vecinos mandan al Ayuntamiento "
                 "por el IRIS, por mil habitantes. Mide la propensión a avisar tanto "
                 "como el problema: un barrio organizado y con tiempo avisa más que uno "
                 "que dejó de esperar respuesta, así que la cifra alta no prueba que un "
                 "sitio esté peor. Se cuentan solo las fichas con barrio y se descartan "
                 "las áreas administrativas (trámites, hacienda, gestiones), que hablan "
                 f"del Ayuntamiento y no del lugar. Dato de {ANY}, el último año "
                 "completo. No existe para los municipios: cada ayuntamiento tiene su "
                 "propio buzón y ninguno publica el recuento por zonas."),
        "barris": barris,
    }
    SORTIDA.write_text(json.dumps(dades, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    print(f"\n→ {SORTIDA.name}: {len(barris)} barrios")


if __name__ == "__main__":
    main()
