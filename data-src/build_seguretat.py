#!/usr/bin/env python3
"""Seguridad y entorno urbano, por municipio → data-src/seguretat.json

Dos fuentes, las dos oficiales y las dos solo municipales:

  · Delitos. «Balance de Criminalidad» del Ministerio del Interior, año
    completo. Solo publica el desglose por municipio de los **mayores de
    20.000 habitantes**, así que de nuestros 92 municipios cubre unos 39 y
    ninguno de los 73 barrios de Barcelona. Los Mossos publican por Área
    Básica Policial, que en Barcelona son 10 distritos: tampoco sirve.

  · Zona verde por habitante. Observatori del Territori de la Diputació de
    Barcelona, vía Socrata. Ese sí cubre los 92, también sin barrios.

Se guardan los **recuentos absolutos**, no las tasas: quien las calcula es
build-transport.mjs, con el mismo padrón que ya usa para todo lo demás, para
que no convivan dos denominadores distintos en la misma página.

La URL del CSV de Interior **no es estable**: el identificador PX cambia cada
trimestre. Por eso se rasca el índice y se coge la última tabla en vez de
escribir el número a mano.

    python3 build_seguretat.py [--fresh]
"""
from __future__ import annotations

import csv
import io
import json
import re
import sys
import urllib.request
from pathlib import Path

AQUI = Path(__file__).parent
CACHE = AQUI / "_work"
SORTIDA = AQUI / "seguretat.json"

MIR = "https://estadisticasdecriminalidad.ses.mir.es"
# El índice lista las tablas del trimestre; la tercera es la de municipios.
MIR_INDEX = MIR + "/sec/dynPx/inebase/index.htm?type=pcaxis&path=/DatosBalanceAnt/{per}/&file=pcaxis"
MIR_CSV = MIR + "/sec/jaxiPx/files/_px/es/csv_bdsc/DatosBalanceAnt/l0/{px}.csv_bdsc?nocab=1"

SOCRATA = ("https://analisi.transparenciacatalunya.cat/resource/8aaj-ypcb.json"
           "?$where=provincia='Barcelona'&$select=codi_municipi,municipi,any,"
           "_38_comp_sol_sv_hab&$limit=5000")

# Las filas del CSV que nos interesan, con el nombre corto que llevarán al JSON.
# El resto de tipologías se descartan: la página no las enseña y abultan.
TIPOLOGIES = {
    "III. TOTAL INFRACCIONES PENALES": "delictes_total",
    "6. Robos con violencia e intimidación": "robatoris_violencia",
    "7.1.-Robos con fuerza en domicilios": "robatoris_domicili",
}

UA = {"User-Agent": "simple-webs/1.0 (+https://webs.raular.com)"}


def baixa(url: str, nom: str, fresh: bool) -> bytes:
    """Descarga con caché en disco: el CSV de Interior son 2,4 MB."""
    cau = CACHE / nom
    if cau.exists() and not fresh:
        return cau.read_bytes()
    CACHE.mkdir(exist_ok=True)
    print(f"  ↓ {url[:96]}…")
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r:
        dades = r.read()
    cau.write_bytes(dades)
    return dades


def darrer_periode() -> str:
    """El año completo más reciente que publique Interior, como «20254»."""
    from datetime import date
    any_ = date.today().year
    for a in range(any_, any_ - 3, -1):
        per = f"{a}4"                      # 4º trimestre = año completo
        try:
            html = baixa(MIR_INDEX.format(per=per), f"mir-index-{per}.html", False)
        except Exception:
            continue
        if re.search(rb"file=\d+\.px", html):
            return per
    raise SystemExit("no encuentro ningún trimestre publicado en Interior")


def px_municipis(per: str) -> str:
    """El identificador de la tabla de municipios: la última del índice."""
    html = baixa(MIR_INDEX.format(per=per), f"mir-index-{per}.html", False).decode("utf8", "replace")
    ids = sorted(set(re.findall(r"file=(\d+)\.px", html)))
    if not ids:
        raise SystemExit(f"el índice de {per} no lista ninguna tabla")
    return ids[-1]


def delictes(fresh: bool) -> tuple[dict, dict]:
    per = darrer_periode()
    px = px_municipis(per)
    brut = baixa(MIR_CSV.format(px=px), f"mir-{px}.csv", fresh)
    text = brut.decode("utf-8-sig")
    if "<html" in text[:400].lower():
        raise SystemExit("Interior ha devuelto HTML en vez del CSV")

    files = csv.reader(io.StringIO(text), delimiter=";")
    next(files, None)                                    # cabecera

    out: dict[str, dict] = {}
    anys: set[str] = set()
    for fila in files:
        if len(fila) < 4:
            continue
        geo, tip, periode, valor = (c.strip() for c in fila[:4])
        camp = TIPOLOGIES.get(tip)
        # Solo municipios de la provincia 08 y solo el dato del año, no la
        # variación interanual ni el año anterior.
        m = re.match(r"^(08\d{3})\s+(.+)$", geo)
        if not camp or not m or not periode.startswith("enero-diciembre"):
            continue
        anys.add(periode.split()[-1])
        try:
            n = int(valor.replace(".", "").replace(",", "."))
        except ValueError:
            continue
        codi = m.group(1)
        reg = out.setdefault(codi, {"nom": m.group(2)})
        # El fichero trae 2024 y 2025: nos quedamos con el más reciente.
        clau = (camp, periode.split()[-1])
        reg[clau] = n

    darrer = max(anys) if anys else None
    net = {}
    for codi, reg in out.items():
        v = {c: reg[(c, darrer)] for c in TIPOLOGIES.values() if (c, darrer) in reg}
        if v:
            net[codi] = v
    return net, {"any": int(darrer) if darrer else None, "px": px, "periode": per}


def zona_verda(fresh: bool) -> tuple[dict, int | None]:
    brut = baixa(SOCRATA, "obs-zona-verda.json", fresh)
    files = json.loads(brut)
    millor: dict[str, tuple[int, float]] = {}
    for f in files:
        codi, val, any_ = f.get("codi_municipi"), f.get("_38_comp_sol_sv_hab"), f.get("any")
        if not codi or val in (None, ""):
            continue
        # El código de Socrata lleva el dígito de control: 080193 → 08019.
        codi = str(codi)[:5]
        try:
            v, a = float(val), int(any_)
        except (TypeError, ValueError):
            continue
        if codi not in millor or a > millor[codi][0]:
            millor[codi] = (a, round(v, 1))
    anys = [a for a, _ in millor.values()]
    return {c: v for c, (_, v) in millor.items()}, (max(anys) if anys else None)


def main() -> None:
    fresh = "--fresh" in sys.argv
    print("seguridad y entorno, por municipio\n")

    print("· delitos (Ministerio del Interior)")
    crim, meta_crim = delictes(fresh)
    print(f"  {len(crim)} municipios de la provincia · año {meta_crim['any']} · tabla {meta_crim['px']}")

    print("· zona verde (Observatori del Territori)")
    verd, any_verd = zona_verda(fresh)
    print(f"  {len(verd)} municipios · año {any_verd}")

    municipis: dict[str, dict] = {}
    for codi, v in crim.items():
        municipis.setdefault(codi, {}).update(v)
    for codi, v in verd.items():
        municipis.setdefault(codi, {})["zona_verda_m2_hab"] = v

    dades = {
        "generat": __import__("datetime").date.today().isoformat(),
        "nota": ("Delitos: solo municipios de más de 20.000 habitantes; el "
                 "Ministerio no publica por debajo de ese umbral, ni por "
                 "barrios. Los recuentos son absolutos: la tasa la calcula "
                 "build-transport.mjs con el padrón de zonas.json."),
        "delictes": {
            "font": "Ministerio del Interior · Balance de Criminalidad",
            "url": MIR_CSV.format(px=meta_crim["px"]),
            "any": meta_crim["any"],
            "llindar_habitants": 20000,
            "municipis": len(crim),
        },
        "zona_verda": {
            "font": "Diputació de Barcelona · Observatori del Territori (Socrata 8aaj-ypcb)",
            "url": SOCRATA,
            "any": any_verd,
            "municipis": len(verd),
        },
        "municipis": municipis,
    }
    SORTIDA.write_text(json.dumps(dades, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    print(f"\n→ {SORTIDA.name}: {len(municipis)} municipios")


if __name__ == "__main__":
    main()
