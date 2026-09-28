#!/usr/bin/env python3
"""Línea de costa catalana, recortada → data-src/costa.geojson

Para poder decir a qué distancia del mar queda cada zona hace falta una línea
de costa, y no hay ninguna en el repositorio. El ICGC publica la suya pero tras
credenciales (`datacloud.icgc.cat` contesta 401), así que se usa la de
**Natural Earth 10 m**, que es de dominio público.

El fichero entero son 10 MB y 4.133 tramos de todo el planeta. Recortado a
Cataluña queda **una sola polilínea de unos 150 puntos y ~3,5 kB**, que sí se
puede versionar sin despeinarse. Por eso el recorte se hace aquí y lo que se
guarda en el repositorio es el resultado: nadie tiene que bajarse 10 MB para
reconstruir la página.

Precisión: escala 1:10.000.000, es decir un error del orden de cientos de
metros. Para «¿esta zona está a 2 km del mar o a 25?» sobra; para «¿a cuántos
metros de la playa?» no serviría, y la página no lo pregunta.

    python3 build_costa.py [--fresh]
"""
from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

AQUI = Path(__file__).parent
CACHE = AQUI / "_work"
SORTIDA = AQUI / "costa.geojson"

FONT = ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/"
        "geojson/ne_10m_coastline.geojson")
# Cataluña con margen: la costa del Maresme sube hasta Portbou y el Garraf baja
# hasta el Ebro. Sobra por todos lados a propósito, que cortar justo es lo que
# deja un hueco al final.
CAIXA = {"lon": (0.0, 3.6), "lat": (40.3, 42.7)}

UA = {"User-Agent": "simple-webs/1.0 (+https://webs.raular.com)"}


def dins(lon: float, lat: float) -> bool:
    return (CAIXA["lon"][0] <= lon <= CAIXA["lon"][1]
            and CAIXA["lat"][0] <= lat <= CAIXA["lat"][1])


def main() -> None:
    fresh = "--fresh" in sys.argv
    cau = CACHE / "ne_10m_coastline.geojson"
    if not cau.exists() or fresh:
        CACHE.mkdir(exist_ok=True)
        print(f"  ↓ {FONT} (10 MB)…")
        with urllib.request.urlopen(urllib.request.Request(FONT, headers=UA), timeout=600) as r:
            cau.write_bytes(r.read())

    mon = json.loads(cau.read_text(encoding="utf8"))
    print(f"· Natural Earth: {len(mon['features'])} tramos en el mundo")

    # De cada tramo que toque la caja se guardan solo los vértices de dentro,
    # partiendo en varios trozos si el tramo entra y sale. Así no queda ninguna
    # recta larguísima cruzando el mapa entre dos puntos lejanos.
    trossos: list[list] = []
    for f in mon["features"]:
        g = f["geometry"]
        linies = (g["coordinates"] if g["type"] == "MultiLineString"
                  else [g["coordinates"]])
        for linia in linies:
            actual: list = []
            for lon, lat in linia:
                if dins(lon, lat):
                    actual.append([round(lon, 4), round(lat, 4)])
                elif actual:
                    if len(actual) > 1:
                        trossos.append(actual)
                    actual = []
            if len(actual) > 1:
                trossos.append(actual)

    if not trossos:
        raise SystemExit("el recorte no ha dejado ningún tramo: ¿ha cambiado la fuente?")

    punts = sum(len(t) for t in trossos)
    sortida = {
        "type": "Feature",
        "properties": {
            "nom": "Línia de costa de Catalunya",
            "font": "Natural Earth 10 m physical coastline (domini públic)",
            "url": FONT,
            "escala": "1:10.000.000",
            "caixa": [CAIXA["lon"][0], CAIXA["lat"][0], CAIXA["lon"][1], CAIXA["lat"][1]],
            "nota": ("Retall de la costa mundial a la caixa de Catalunya. La precisió "
                     "és de l'ordre de centenars de metres: serveix per dir si una "
                     "zona és costanera o d'interior, no per mesurar la platja."),
        },
        "geometry": {"type": "MultiLineString", "coordinates": trossos},
    }
    SORTIDA.write_text(json.dumps(sortida, ensure_ascii=False) + "\n", encoding="utf8")
    print(f"\n→ {SORTIDA.name}: {len(trossos)} tramos, {punts} puntos, "
          f"{SORTIDA.stat().st_size / 1024:.1f} kB")


if __name__ == "__main__":
    main()
