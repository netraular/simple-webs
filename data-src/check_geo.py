#!/usr/bin/env python3
"""Comprovacions de cordura dels fitxers geografics generats a data-src/.

Us:  python3 data-src/check_geo.py
Surt amb codi 1 si alguna comprovacio falla.
"""
import json
import math
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MUNI = os.path.join(HERE, "municipis.geojson")
BARRIS = os.path.join(HERE, "bcn-barris.geojson")
PREUS = os.path.join(HERE, "bcn-barris-preus.json")

PC_LAT, PC_LON = 41.3870, 2.1701  # Placa de Catalunya
RADI_KM = 35.0

errors = []
warnings = []


def check(cond, msg):
    if cond:
        print("  OK   %s" % msg)
    else:
        print("  FAIL %s" % msg)
        errors.append(msg)


def iter_coords(geom):
    def rec(c):
        if c and isinstance(c[0], (int, float)):
            yield c
        else:
            for x in c:
                for y in rec(x):
                    yield y
    return rec(geom["coordinates"])


def bbox(features):
    xs, ys = [], []
    for f in features:
        for x, y in iter_coords(f["geometry"]):
            xs.append(x)
            ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)


def haversine_km(lat, lon):
    r = 6371.0088
    p1, p2 = math.radians(PC_LAT), math.radians(lat)
    dp = p2 - p1
    dl = math.radians(lon - PC_LON)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def signed_area(ring):
    s = 0.0
    for i in range(len(ring) - 1):
        s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
    return s / 2.0


def area_km2(geom):
    """Area aproximada en km2 (equirectangular local). Detecta anells mal niuats."""
    parts = ([geom["coordinates"]] if geom["type"] == "Polygon"
             else geom["coordinates"])
    total = 0.0
    for poly in parts:
        for i, ring in enumerate(poly):
            lat_m = sum(p[1] for p in ring) / len(ring)
            pr = [(p[0] * 111.32 * math.cos(math.radians(lat_m)), p[1] * 111.32)
                  for p in ring]
            a = abs(signed_area(pr))
            total += a if i == 0 else -a
    return total


def sizes(path):
    raw = os.path.getsize(path)
    gz = int(subprocess.run("gzip -c %s | wc -c" % path, shell=True,
                            capture_output=True, text=True).stdout.strip())
    return raw, gz


def max_abs_coord(features):
    m = 0.0
    for f in features:
        for x, y in iter_coords(f["geometry"]):
            m = max(m, abs(x), abs(y))
    return m


print("== municipis.geojson ==")
muni = json.load(open(MUNI, encoding="utf-8"))
mf = muni["features"]
raw, gz = sizes(MUNI)
print("  features: %d | %d bytes | %d bytes gzip" % (len(mf), raw, gz))
b = bbox(mf)
print("  bbox lon %.4f..%.4f  lat %.4f..%.4f" % (b[0], b[2], b[1], b[3]))

check(muni["type"] == "FeatureCollection", "es un FeatureCollection")
check(raw < 1_500_000, "mida < 1,5 MB sense gzip (%d)" % raw)
check(1.4 <= b[0] and b[2] <= 2.6, "bbox lon dins 1.4..2.6")
check(41.1 <= b[1] and b[3] <= 41.8, "bbox lat dins 41.1..41.8")
check(max_abs_coord(mf) < 180, "cap coordenada tipus UTM (>180); CRS es EPSG:4326")

codis = [f["properties"].get("codi_ine") for f in mf]
check("08019" in codis, "Barcelona (08019) hi es")
check(all(isinstance(c, str) and len(c) == 5 and c.isdigit() for c in codis),
      "tots els codi_ine son 5 digits string")
check(len(set(codis)) == len(codis), "codi_ine sense duplicats")
check(all(f["properties"].get("nom") for f in mf), "tots tenen nom")
check(all(f["properties"].get("comarca") for f in mf), "tots tenen comarca")
check(all(f["geometry"]["type"] in ("Polygon", "MultiPolygon") for f in mf),
      "totes les geometries son poligonals")

# Area real del municipi de Barcelona = 101,35 km2 (INE) / 101,82 km2 (ICGC 1:50.000).
# Aquesta comprovacio detecta el bug d'anells mal niuats del WFS de l'ICGC, que
# feia col-lapsar Barcelona a 5 punts i ~0 km2 sense que cap altra prova ho veies.
bcn = [f for f in mf if f["properties"]["codi_ine"] == "08019"][0]
a_bcn = area_km2(bcn["geometry"])
print("  area Barcelona: %.1f km2 (referencia ICGC 101,8)" % a_bcn)
check(95 < a_bcn < 110, "area del municipi de Barcelona plausible")

fora = []
for f in mf:
    d = min(haversine_km(y, x) for x, y in iter_coords(f["geometry"]))
    if d > RADI_KM + 0.5:
        fora.append((f["properties"]["codi_ine"], round(d, 1)))
check(not fora, "tots els municipis toquen el radi de %g km (fora: %s)" % (RADI_KM, fora[:5]))

print("== bcn-barris.geojson ==")
bar = json.load(open(BARRIS, encoding="utf-8"))
bfs = bar["features"]
raw_b, gz_b = sizes(BARRIS)
print("  features: %d | %d bytes | %d bytes gzip" % (len(bfs), raw_b, gz_b))
bb = bbox(bfs)
print("  bbox lon %.4f..%.4f  lat %.4f..%.4f" % (bb[0], bb[2], bb[1], bb[3]))

check(len(bfs) == 73, "73 barris")
check(max_abs_coord(bfs) < 180, "cap coordenada tipus UTM; CRS es EPSG:4326")
check(2.0 <= bb[0] and bb[2] <= 2.3, "bbox lon dins 2.0..2.3")
check(41.3 <= bb[1] and bb[3] <= 41.5, "bbox lat dins 41.3..41.5")
cb = [f["properties"].get("codi_barri") for f in bfs]
check(sorted(cb) == ["%02d" % i for i in range(1, 74)], "codi_barri 01..73 complet i unic")
check(all(f["properties"].get("nom_barri") for f in bfs), "tots tenen nom_barri")
check(all(f["properties"].get("codi_districte") for f in bfs), "tots tenen codi_districte")
check(all(f["properties"].get("nom_districte") for f in bfs), "tots tenen nom_districte")
check(len({f["properties"]["codi_districte"] for f in bfs}) == 10, "10 districtes")
a_bar = sum(area_km2(f["geometry"]) for f in bfs)
print("  suma area dels 73 barris: %.1f km2" % a_bar)
check(95 < a_bar < 110, "els 73 barris sumen l'area de la ciutat")
check(abs(a_bar - a_bcn) < 5, "coherent amb el municipi 08019 de municipis.geojson")

print("== bcn-barris-preus.json ==")
pr = json.load(open(PREUS, encoding="utf-8"))
raw_p, gz_p = sizes(PREUS)
rows = pr["barris"]
amb = [r for r in rows if r.get("compra_eur_m2") is not None]
print("  barris: %d (%d amb compra_eur_m2) | %d bytes | %d bytes gzip"
      % (len(rows), len(amb), raw_p, gz_p))
check(len(rows) == 73, "73 registres de preus")
check({r["codi_barri"] for r in rows} == set(cb), "codi_barri coincideix amb bcn-barris.geojson")
check(all(r["nom_barri"] == n for r, n in
          zip(sorted(rows, key=lambda r: r["codi_barri"]),
              [f["properties"]["nom_barri"] for f in
               sorted(bfs, key=lambda f: f["properties"]["codi_barri"])])),
      "nom_barri coincideix amb la geometria")
check(all(300 < r["compra_eur_m2"] < 15000 for r in amb),
      "compra_eur_m2 en un rang plausible (300..15000)")
if len(amb) < 73:
    warnings.append("%d barris sense compra_eur_m2 (la font els agrega amb un barri veï)"
                    % (73 - len(amb)))

print()
for w in warnings:
    print("AVIS: %s" % w)
if errors:
    print("\n%d COMPROVACIONS FALLIDES" % len(errors))
    sys.exit(1)
print("Totes les comprovacions correctes.")
