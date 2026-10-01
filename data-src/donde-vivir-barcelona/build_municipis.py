#!/usr/bin/env python3
"""Repara l'estructura d'anells del GeoJSON del WFS de l'ICGC i filtra
els municipis a <= 35 km de Placa de Catalunya.

El WFS de l'ICGC (ArcGIS Server) retorna cada municipi com un MultiPolygon
amb UN SOL "part" que conte TOTS els anells (exteriors i forats) barrejats.
Segons GeoJSON, el primer anell d'un part es l'exterior i la resta son forats,
de manera que qualsevol lector (mapshaper, Leaflet...) descarta el contorn real.
Els anells SI que tenen l'orientacio correcta: CCW = exterior, CW = forat.
Aqui els reagrupem en poligons valids i validem l'area contra l'atribut
AREAM5000 que publica el mateix ICGC.
"""
import json
import math
import os
import urllib.request

WFS = ("https://geoserveis.icgc.cat/servei/catalunya/divisions-administratives/wfs"
       "?service=WFS&version=2.0.0&request=GetFeature"
       "&typeNames=divisions_administratives_wfs:divisions_administratives_municipis_50000"
       "&outputFormat=GEOJSON&srsName=EPSG:4326")

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "_dl", "icgc_municipis_50000.geojson")
OUT = os.path.join(HERE, "_dl", "municipis_4326_raw.geojson")
LAT0, LON0, R_KM = 41.3870, 2.1701, 35.0


def signed_area(ring):
    s = 0.0
    for i in range(len(ring) - 1):
        s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
    return s / 2.0


def bbox_of(ring):
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return min(xs), min(ys), max(xs), max(ys)


def point_in_ring(pt, ring):
    x, y = pt
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > y) != (yj > y):
            xint = (xj - xi) * (y - yi) / (yj - yi) + xi
            if x < xint:
                inside = not inside
        j = i
    return inside


def regroup(geom):
    """Retorna una llista de poligons [ [exterior, forat, ...], ... ]."""
    if geom["type"] == "Polygon":
        parts = [geom["coordinates"]]
    else:
        parts = geom["coordinates"]
    rings = [r for part in parts for r in part]

    outers, holes = [], []
    for r in rings:
        if len(r) < 4:
            continue
        (outers if signed_area(r) > 0 else holes).append(r)
    if not outers:  # tot CW: invertim el criteri
        outers = [r[::-1] for r in holes]
        holes = []

    polys = [[o] for o in outers]
    obb = [bbox_of(o) for o in outers]
    oar = [abs(signed_area(o)) for o in outers]

    for h in holes:
        pt = h[0]
        best, best_area = None, None
        for i, o in enumerate(outers):
            b = obb[i]
            if not (b[0] <= pt[0] <= b[2] and b[1] <= pt[1] <= b[3]):
                continue
            if point_in_ring(pt, o) and (best_area is None or oar[i] < best_area):
                best, best_area = i, oar[i]
        if best is None:  # forat orfe: el descartem, no inventem geometria
            continue
        polys[best].append(h)
    return polys


def area_km2(polys):
    """Area aproximada (equirectangular local), suficient per validar."""
    total = 0.0
    for poly in polys:
        for i, ring in enumerate(poly):
            lat_m = sum(p[1] for p in ring) / len(ring)
            k = 111.32
            pr = [(p[0] * k * math.cos(math.radians(lat_m)), p[1] * k) for p in ring]
            a = abs(signed_area(pr))
            total += a if i == 0 else -a
    return total


def hav(lat, lon):
    r = 6371.0088
    p1, p2 = math.radians(LAT0), math.radians(lat)
    a = (math.sin((p2 - p1) / 2) ** 2
         + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon - LON0) / 2) ** 2)
    return 2 * r * math.asin(math.sqrt(a))


def main():
    os.makedirs(os.path.dirname(SRC), exist_ok=True)
    if not os.path.exists(SRC):
        print("descarregant el WFS de l'ICGC...")
        urllib.request.urlretrieve(WFS, SRC)
    d = json.load(open(SRC, encoding="utf-8"))
    bad, sel = [], []
    for f in d["features"]:
        p = f["properties"]
        polys = regroup(f["geometry"])
        ref = p.get("AREAM5000")
        got = area_km2(polys)
        if ref and ref > 0 and abs(got - ref) / ref > 0.03:
            bad.append((str(p["CODIMUNI"])[:5], p["NOMMUNI"], round(ref, 2), round(got, 2)))

        dmin = min(hav(pt[1], pt[0]) for poly in polys for ring in poly for pt in ring)
        if dmin > R_KM:
            continue
        geom = ({"type": "Polygon", "coordinates": polys[0]} if len(polys) == 1
                else {"type": "MultiPolygon", "coordinates": polys})
        sel.append({"type": "Feature",
                    "properties": {"codi_ine": str(p["CODIMUNI"])[:5],
                                   "nom": p["NOMMUNI"],
                                   "comarca": p.get("NOMCOMAR")},
                    "geometry": geom})

    print("municipis a Catalunya: %d" % len(d["features"]))
    print("area reconstruida != AREAM5000 (>3%%): %d" % len(bad))
    for x in bad[:10]:
        print("   ", x)
    sel.sort(key=lambda f: f["properties"]["codi_ine"])
    print("seleccionats (<= %g km): %d" % (R_KM, len(sel)))
    json.dump({"type": "FeatureCollection", "features": sel},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print("escrit", OUT)
    print("\nAra simplifica amb mapshaper:")
    print("  npx mapshaper %s \\\n     -simplify 60%% keep-shapes \\\n"
          "     -o precision=0.00001 format=geojson %s"
          % (OUT, os.path.join(HERE, "municipis.geojson")))


if __name__ == "__main__":
    main()
