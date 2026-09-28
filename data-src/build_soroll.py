#!/usr/bin/env python3
"""Ruido en los barrios de Barcelona → data-src/soroll.json

El mapa estratégico de ruido del Ayuntamiento publica, barrio a barrio, qué
porcentaje de la población vive en cada franja de decibelios. No es una
estimación nuestra: el porcentaje viene publicado y lo único que hace este
script es sumar las franjas por encima de los dos umbrales de referencia.

  · **Lden ≥ 65 dB(A)** — índice de día completo (día, tarde y noche con
    recargo). 65 dB(A) es el valor de calidad acústica que la normativa
    catalana fija para una zona residencial: por encima, la zona está en
    conflicto.
  · **Noche ≥ 55 dB(A)** — umbral de descanso de la Directiva europea. Es otra
    pregunta y da otro mapa: hay barrios tranquilos de día y ruidosos de noche.

Solo Barcelona, y eso lo convierte en el **espejo de los delitos**: aquellos
cubren 38 municipios y ningún barrio; este, los 73 barrios y ningún municipio.
Fuera de la ciudad los mapas estratégicos se publican como cartografía
municipio a municipio, sin ninguna tabla agregada que cruzar: no hay dato
comparable y no se inventa.

Se baja por la **API CKAN `datastore_search`**, no por `/download`: desde
2026-09 las descargas directas del portal están detrás de BunkerWeb + hCaptcha
y contestan HTTP 200 con una página «Bot Detection». La API no está protegida
(ver `indicadors.SOURCES.md`).

Va en Python y no en Node como el resto de scripts nuevos por un motivo
concreto: el portal **corta el handshake TLS de Node** (ECONNRESET), mientras
que `urllib` y curl pasan sin problema.

    python3 build_soroll.py [--fresh]
"""
from __future__ import annotations

import json
import sys
import urllib.request
from collections import defaultdict
from datetime import date
from pathlib import Path

AQUI = Path(__file__).parent
CACHE = AQUI / "_work"
SORTIDA = AQUI / "soroll.json"

CKAN = "https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search"
RECURS = "7b3783aa-0569-4bcb-b35f-5ade252ae319"   # població exposada, per barri
ANY = 2022
LIMIT = 25000

N_BARRIS = 73
FONT = "Total"          # todas las fuentes de ruido juntas

# Las franjas por encima de cada umbral. `rang` es texto —«65-70 dB(A)»— y los
# umbrales de la normativa caen justo en un borde, así que enumerar las franjas
# es más seguro que parsear el texto.
SOBRE_65 = {"65-70 dB(A)", "70-75 dB(A)", "75-80 dB(A)", ">=80 dB(A)"}
SOBRE_55 = {"55-60 dB(A)", "60-65 dB(A)"} | SOBRE_65

MESURES = [
    {"camp": "pct_soroll_65db", "periode": "Lden", "franges": SOBRE_65, "llindar_db": 65,
     "nom": "Població exposada a Lden ≥ 65 dB(A) (%)"},
    {"camp": "pct_soroll_nit_55db", "periode": "Nit", "franges": SOBRE_55, "llindar_db": 55,
     "nom": "Població exposada a ≥ 55 dB(A) de nit (%)"},
]

UA = {"User-Agent": "simple-webs/1.0 (+https://webs.raular.com)"}


def baixa(url: str, nom: str, fresh: bool) -> bytes:
    cau = CACHE / nom
    if cau.exists() and not fresh:
        return cau.read_bytes()
    CACHE.mkdir(exist_ok=True)
    print(f"  ↓ {url[:96]}…")
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
        dades = r.read()
    if dades[:400].lstrip().lower().startswith((b"<!doctype", b"<html")):
        raise SystemExit(f"{url} ha devuelto HTML: el portal ha vuelto a bloquear la API")
    cau.write_bytes(dades)
    return dades


def main() -> None:
    fresh = "--fresh" in sys.argv
    print("ruido por barrio de Barcelona\n")

    url = f"{CKAN}?resource_id={RECURS}&limit={LIMIT}"
    cos = json.loads(baixa(url, "bcn-soroll.json", fresh))
    if not cos.get("success"):
        raise SystemExit(f"CKAN ha contestado success:false · {json.dumps(cos)[:200]}")
    files = cos["result"]["records"]
    total = cos["result"]["total"]
    print(f"· {len(files)} filas de {total}")
    if len(files) < total:
        raise SystemExit(f"faltan filas: {len(files)} de {total}; sube LIMIT")

    # El campo se llama `percentatge_poblacio_exposada` pero viene como
    # fracción: las franjas de un barrio suman 1, no 100. Se comprueba antes de
    # multiplicar, para que el día que la fuente cambie de unidad no salga un
    # 10.000 % en vez de un aviso.
    noms: dict[str, str] = {}
    suma: dict[tuple[str, str], float] = defaultdict(float)
    acum: dict[tuple[str, str], float] = defaultdict(float)

    for f in files:
        if f.get("font_soroll") != FONT:
            continue
        codi = str(f.get("barri", "")).zfill(2)
        try:
            v = float(f.get("percentatge_poblacio_exposada"))
        except (TypeError, ValueError):
            continue
        noms.setdefault(codi, f.get("nom_barri", ""))
        periode = f.get("periode_horari")
        suma[(codi, periode)] += v
        for m in MESURES:
            if periode == m["periode"] and f.get("rang") in m["franges"]:
                acum[(codi, m["camp"])] += v

    if len(noms) != N_BARRIS:
        raise SystemExit(f"esperaba {N_BARRIS} barrios y he encontrado {len(noms)}")
    for codi in noms:
        for m in MESURES:
            t = suma[(codi, m["periode"])]
            if abs(t - 1) > 0.02:
                raise SystemExit(
                    f"barrio {codi} ({noms[codi]}), periodo {m['periode']}: las franjas "
                    f"suman {t:.3f} y no 1 — la fuente ha cambiado de unidad")

    barris = {
        codi: {m["camp"]: round(acum[(codi, m["camp"])] * 100, 1) for m in MESURES}
        for codi in sorted(noms)
    }

    dades = {
        "generat": date.today().isoformat(),
        "font": "Ajuntament de Barcelona · Mapa estratègic de soroll, població exposada per barri",
        "url": url,
        "recurs": RECURS,
        "any": ANY,
        "nota": ("Porcentaje de vecinos del barrio que vive expuesto por encima del "
                 "umbral, sumando todas las fuentes de ruido (tráfico rodado y "
                 "ferroviario, industria y ocio). El porcentaje lo publica el "
                 "Ayuntamiento; aquí solo se suman las franjas. Lden es el índice de "
                 "día completo, con recargo por la tarde y la noche: 65 dB(A) es el "
                 "valor de calidad que la normativa catalana fija para zona "
                 "residencial. El de noche, 55 dB(A), es el umbral de descanso de la "
                 "Directiva europea."),
        "nota_cobertura": ("Solo los 73 barrios de Barcelona. Fuera de la ciudad los "
                           "mapas estratégicos de ruido se publican como cartografía "
                           "municipio a municipio y no hay ninguna tabla agregada "
                           "equivalente que cruzar."),
        "camps": [{"camp": m["camp"], "nom": m["nom"], "llindar_db": m["llindar_db"],
                   "periode": m["periode"]} for m in MESURES],
        "barris": barris,
    }
    SORTIDA.write_text(json.dumps(dades, ensure_ascii=False, indent=1) + "\n", encoding="utf8")

    ordre = sorted(barris, key=lambda c: -barris[c]["pct_soroll_65db"])
    fmt = lambda c: f"{noms[c]} {barris[c]['pct_soroll_65db']} %"   # noqa: E731
    print(f"\n→ {SORTIDA.name}: {len(barris)} barrios")
    print("  más ruidosos:   " + " · ".join(fmt(c) for c in ordre[:3]))
    print("  más tranquilos: " + " · ".join(fmt(c) for c in ordre[-3:]))


if __name__ == "__main__":
    main()
