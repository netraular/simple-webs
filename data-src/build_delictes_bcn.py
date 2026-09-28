#!/usr/bin/env python3
"""Delitos de Barcelona repartidos por distrito → data-src/delictes-bcn.json

Los 73 barrios comparten hoy un solo número —el del municipio de Barcelona, del
Balance de Criminalidad del Ministerio del Interior— y por tanto la criminalidad
no distingue un barrio de otro. No existe dato abierto por barrio, pero sí por
**Área Básica Policial**, y en Barcelona las ABP **son los 10 distritos**. Con eso
los 73 barrios pasan de un valor a diez, y la diferencia es enorme: Ciutat Vella
multiplica por siete a Horta-Guinardó.

Tres datasets de Socrata:

  · `dtpq-6fvw`  municipio ↔ ABP, con Barcelona partida en `codi_districte` 01-10.
  · `i2dd-kfpa`  maestro de las 60 ABP (nombre oficial por código).
  · `qnyt-emjc`  hechos conocidos por ABP y mes, 2011 en adelante.

El número que se guarda es **absoluto**, como en build_seguretat.py: la tasa la
calcula build-transport.mjs con el mismo padrón que usa para todo lo demás.

**Prorrateo.** El reparto entre distritos es de los Mossos; el nivel es el del
Ministerio. Son dos recuentos distintos de lo mismo y se parecen mucho —167.615
frente a 169.678 en 2025, un 1,2 % de diferencia— pero no son idénticos, y mezclar
las dos escalas dejaría a los barrios midiéndose con una regla distinta que la de
los 91 municipios. Así que los diez distritos se escalan para que sumen exactamente
lo que el Ministerio publica para Barcelona. El factor se guarda en el JSON; si se
alejara de 1 habría que mirarlo, y por eso el script se planta si pasa de ±15 %.

Trampas encontradas al construirlo, todas convertidas en guardas que **fallan**:

  · `qnyt-emjc` identifica la ABP por **nombre**, no por código, y no coincide
    literalmente con el maestro: «ABP Les Corts» vs «les Corts», «ABP
    Horta-Guinardó» vs «Horta Guinardó». Se compara normalizado.
  · **`ABP Virtual` hay que excluirla**: 84.635 hechos en 2025, un 12 % de toda
    Cataluña, y es ciberdelincuencia sin territorio. Sumarla infla cualquier tasa.
  · `ABP Barcelona` existe aparte de los diez distritos (1.467 hechos en 2025):
    es una unidad propia, no un distrito, y no se reparte.
  · El maestro de ABP **no** es `6p8j-c3jv`, que da resultados absurdos, sino
    `i2dd-kfpa`.
  · El año en curso está incompleto. Se usa el mismo año que el Ministerio, para
    que el prorrateo compare lo mismo con lo mismo.

    python3 build_delictes_bcn.py [--fresh]
"""
from __future__ import annotations

import json
import sys
import unicodedata
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

AQUI = Path(__file__).parent
CACHE = AQUI / "_work"
SORTIDA = AQUI / "delictes-bcn.json"
SEGURETAT = AQUI / "seguretat.json"

SOC = "https://analisi.transparenciacatalunya.cat/resource/"
INE_BCN = "08019"

# Las tipologías de los Mossos que se corresponden con las que ya lleva la
# página. No hay equivalente de «robos con fuerza en domicilios»: los Mossos
# publican «Robatori amb força» y «…interior vehicle», y ninguna de las dos es
# eso. Ese indicador se queda sin dato por barrio, que es la verdad.
TIPUS = {
    "robatoris_violencia": "Robatori amb violència i/o intimidació",
}

UA = {"User-Agent": "simple-webs/1.0 (+https://webs.raular.com)"}


def norm(s: str) -> str:
    """Nombre de ABP comparable: sin «ABP», sin artículo, sin acentos ni guiones."""
    s = unicodedata.normalize("NFD", s.strip().lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("-", " ").replace("'", " ")
    for art in ("abp ", "el ", "la ", "les ", "els ", "l "):
        while s.startswith(art):
            s = s[len(art):]
    return " ".join(s.split())


def soql(recurs: str, nom: str, fresh: bool, **params) -> list[dict]:
    """Consulta Socrata con caché en disco. Nunca se pide la geometría: las
    tablas de ABP la llevan y son decenas de MB por una columna que no se usa."""
    url = SOC + recurs + ".json?" + urllib.parse.urlencode(params)
    cau = CACHE / nom
    if cau.exists() and not fresh:
        return json.loads(cau.read_text(encoding="utf8"))
    CACHE.mkdir(exist_ok=True)
    print(f"  ↓ {recurs} {params.get('$select', '')[:50]}…")
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r:
        brut = r.read().decode("utf8")
    if not brut.lstrip().startswith(("[", "{")):
        raise SystemExit(f"{recurs} no ha devuelto JSON: {brut[:200]!r}")
    cau.write_text(brut, encoding="utf8")
    return json.loads(brut)


def districtes_abp(fresh: bool) -> dict[str, dict]:
    """Los 10 distritos de Barcelona con su ABP y su nombre oficial."""
    creuament = soql("dtpq-6fvw", "mossos-mun-abp.json", fresh,
                     **{"$select": "codi_municipi,codi_abp_mossos,codi_districte,nom_districte",
                        "$limit": 2000})
    mestre = soql("i2dd-kfpa", "mossos-abp.json", fresh,
                  **{"$select": "codi_abp_mossos,nom_abp_mossos", "$limit": 200})
    nom_abp = {a["codi_abp_mossos"]: a["nom_abp_mossos"] for a in mestre}

    out = {}
    for f in creuament:
        if not str(f.get("codi_municipi", "")).startswith(INE_BCN):
            continue
        codi = f["codi_districte"]
        if codi == "98":                       # «No consta»: no es un distrito
            continue
        abp = f["codi_abp_mossos"]
        out[codi] = {"nom": f["nom_districte"], "abp": abp, "abp_nom": nom_abp.get(abp)}

    if len(out) != 10:
        raise SystemExit(f"esperaba los 10 distritos de Barcelona, encontré {len(out)}: "
                         f"{sorted(out)}. El cruce municipio↔ABP ha cambiado de forma.")
    return out


def any_ministeri() -> int:
    """El año que usa el Ministerio, para prorratear contra lo mismo."""
    if not SEGURETAT.exists():
        raise SystemExit("falta seguretat.json: ejecuta antes build_seguretat.py")
    return int(json.loads(SEGURETAT.read_text(encoding="utf8"))["delictes"]["any"])


def fets(any_: int, fresh: bool) -> dict[str, dict[str, int]]:
    """Hechos conocidos de **todas** las ABP el año dado, indexados por nombre
    normalizado. Se piden todas —son 62 filas— en vez de filtrar por nombre en
    el `$where`: los nombres de la tabla de hechos no son literalmente los del
    maestro, así que un filtro por igualdad devuelve el vacío sin avisar. Casar
    en Python, donde se puede normalizar, es lo único que no miente."""
    tot = soql("qnyt-emjc", f"mossos-fets-{any_}.json", fresh,
               **{"$select": "rea_b_sica_policial_abp as abp,sum(coneguts) as n",
                  "$where": f"any='{any_}'",
                  "$group": "rea_b_sica_policial_abp", "$limit": 500})
    out: dict[str, dict[str, int]] = {}
    for f in tot:
        out.setdefault(norm(f["abp"]), {})["delictes_total"] = int(float(f["n"]))

    for camp, etiqueta in TIPUS.items():
        files = soql("qnyt-emjc", f"mossos-{camp}-{any_}.json", fresh,
                     **{"$select": "rea_b_sica_policial_abp as abp,sum(coneguts) as n",
                        "$where": f"any='{any_}' AND tipus_de_fet='{etiqueta}'",
                        "$group": "rea_b_sica_policial_abp", "$limit": 500})
        if not files:
            raise SystemExit(f"ninguna ABP tiene «{etiqueta}» en {any_}: "
                             f"la tipología ha cambiado de nombre")
        for f in files:
            out.setdefault(norm(f["abp"]), {})[camp] = int(float(f["n"]))
    return out


def main() -> None:
    fresh = "--fresh" in sys.argv
    print("delitos de Barcelona, por distrito\n")

    any_ = any_ministeri()
    print(f"· año {any_} (el mismo que publica el Ministerio)")

    dist = districtes_abp(fresh)
    print(f"· {len(dist)} distritos ↔ ABP {min(d['abp'] for d in dist.values())}"
          f"-{max(d['abp'] for d in dist.values())}")

    noms = [d["abp_nom"] for d in dist.values()]
    if any(n is None for n in noms):
        raise SystemExit("alguna ABP de Barcelona no está en el maestro i2dd-kfpa")
    # La ABP de ciberdelincuencia no tiene territorio: que no se cuele nunca.
    if any(norm(n) == "virtual" for n in noms):
        raise SystemExit("«ABP Virtual» entre los distritos: es ciberdelincuencia, no un sitio")

    dades = fets(any_, fresh)

    falten = [d["nom"] for d in dist.values() if norm(d["abp_nom"]) not in dades]
    if falten:
        raise SystemExit(f"sin hechos para {falten}: los nombres de ABP no casan")

    brut = {c: dict(dades[norm(d["abp_nom"])]) for c, d in dist.items()}
    suma = sum(v["delictes_total"] for v in brut.values())

    seg = json.loads(SEGURETAT.read_text(encoding="utf8"))["municipis"].get(INE_BCN, {})
    oficial = seg.get("delictes_total")
    if not oficial:
        raise SystemExit("seguretat.json no trae delictes_total de Barcelona")
    factor = oficial / suma
    print(f"· Mossos {suma:,} · Ministerio {oficial:,} · factor {factor:.4f}"
          .replace(",", "."))
    if not 0.85 <= factor <= 1.15:
        raise SystemExit(f"el factor de prorrateo es {factor:.3f}: las dos fuentes ya no "
                         f"cuentan lo mismo, hay que mirarlo antes de publicar nada")

    districtes = {}
    for codi, d in sorted(dist.items()):
        v = {camp: round(n * factor) for camp, n in brut[codi].items()}
        districtes[codi] = {"nom": d["nom"], "abp": d["abp"], **v}
        print(f"    {codi} {d['nom']:22} {v['delictes_total']:>7}")

    sortida = {
        "generat": date.today().isoformat(),
        "any": any_,
        "font": "Mossos d'Esquadra · Fets coneguts per ABP (Socrata qnyt-emjc), "
                "creuat amb dtpq-6fvw i i2dd-kfpa",
        "factor_prorrateig": round(factor, 4),
        "nota": ("Reparto entre distritos según los Mossos; nivel total según el "
                 "Balance de Criminalidad del Ministerio del Interior, que es la "
                 "misma vara con la que se miden los 91 municipios. Los recuentos "
                 "son absolutos: la tasa la calcula build-transport.mjs. Es dato "
                 "de distrito, no de barrio: los barrios de un mismo distrito "
                 "comparten número. «ABP Virtual» (ciberdelincuencia, sin "
                 "territorio) y «ABP Barcelona» (unidad aparte de los distritos) "
                 "quedan fuera."),
        "sense_dada": ("No hay equivalente de «robos con fuerza en domicilios»: los "
                       "Mossos publican «Robatori amb força» y «…interior vehicle», "
                       "y ninguna de las dos es eso."),
        "districtes": districtes,
    }
    SORTIDA.write_text(json.dumps(sortida, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    print(f"\n→ {SORTIDA.name}: {len(districtes)} distritos")


if __name__ == "__main__":
    main()
