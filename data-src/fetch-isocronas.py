#!/usr/bin/env python3
"""
fetch-isocronas.py — temps en transport public des de cada municipi i barri cap
a QUALSEVOL punt de l'area, no nomes cap als sis destins fixos.

Es el que permet que la pagina et deixi clicar un punt del mapa i et digui quant
s'hi triga des de cada lloc.

Metode
------
MOTIS te un endpoint `one-to-all` que, d'una sola tacada, calcula el temps des
d'un punt fins a TOTES les parades que hi ha a l'abast dins d'un limit. Aixo
canvia l'escala del problema: en comptes de demanar un itinerari per cada parell
origen-desti (milers de consultes), en fem **una per origen** — 165 en total — i
el router ja ens torna l'abast sencer.

    https://api.transitous.org/api/v1/one-to-all

El temps d'un punt arbitrari P des d'un municipi M es:

    t(M -> P) = min sobre les parades S a prop de P de
                    [ t(M -> S)  +  caminar(S -> P) ]

t(M -> S) el dona el router; caminar(S -> P) el calcula la pagina. L'unica
aproximacio es l'ultim tram a peu, que es exactament el que fa qualsevol eina
d'isocrones. NO hi ha cap model de pivots ni suma de trajectes independents.

Sortida: isocrones.json  → graella de parades + matriu de minuts per origen.

Us:
    python3 fetch-isocronas.py            # 165 consultes, ~30-45 min
    python3 fetch-isocronas.py --test     # nomes 3 origens
    python3 fetch-isocronas.py --jobs 2

Reprenible: desa cada origen ja resolt a _work/.isocrones-cache.json.
"""
import argparse
import concurrent.futures as cf
import json
import math
import os
import sys
import threading
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, "_work")
API = "https://api.transitous.org/api/v1/one-to-all"
CACHE = os.path.join(WORK, ".isocrones-cache.json")
OUT = os.path.join(HERE, "isocrones.json")

# --- Hora de referencia ---------------------------------------------------
# El dataset de destins fixos (transit.json) es "arribar a les 09:00". Aqui no
# es pot fer igual: one-to-all amb arriveBy=true donaria els temps CAP a l'origen,
# i el que volem es la direccio contraria. Aixi que es una sortida fixa.
#
# 07:15 local d'un dimarts feiner. Es l'hora a la qual surt de casa qui ha
# d'entrar a treballar a les 9 a Barcelona des de fora, i cau dins de la finestra
# de mes servei. Que sigui una sortida fixa i no una cerca de rang vol dir que
# un poble amb un unic bus a les 07:05 en surt mal parat encara que el seu
# commute real sigui viable: esta dit a les SOURCES, no s'amaga.
DIA = "2026-09-29"
SORTIDA_UTC = f"{DIA}T05:15:00Z"    # 07:15 local (CEST, UTC+2)
MAX_MIN = 105                       # limit de l'abast que demanem al router

# Encaminament: mateixos parametres que fetch-transit.py, per coherencia.
COMU = {
    "mode": "TRANSIT",
    "maxTravelTime": str(MAX_MIN),
    "arriveBy": "false",
    "maxPreTransitTime": "1800",     # fins a 30 min a peu fins a la primera parada
    "pedestrianSpeed": "1.25",       # 4,5 km/h
}

# --- Graella ---------------------------------------------------------------
# El router torna ~18.000 parades per origen (la majoria, paradetes de bus). No
# te sentit guardar-les una per una: es quantitzen a una graella i es guarda el
# minim de cada cel·la.
#
# 600 m es el compromis. Vol dir com a molt 424 m d'error de posicio de la
# parada, ~5 min a peu, que se suma a la caminada estimada. A 300 m l'error
# baixaria a 3 min pero la matriu es quadruplicaria i la pagina passaria d'uns
# centenars de KB a uns quants MB: no compensa afinar la posicio de la parada
# quan tota la resta del model (origen = un sol punt per municipi, horari
# teoric) ja te un marge molt mes gran.
BBOX = (41.18, 1.63, 41.77, 2.58)   # S, W, N, E — el mateix que linies.json
CELLA_M = 600
DLAT = CELLA_M / 111320.0
DLON = DLAT / math.cos(math.radians(41.45))


def cella(lat, lon):
    return (int(math.floor((lat - BBOX[0]) / DLAT)),
            int(math.floor((lon - BBOX[1]) / DLON)))


def centre(iy, ix):
    return (round(BBOX[0] + (iy + 0.5) * DLAT, 5),
            round(BBOX[1] + (ix + 0.5) * DLON, 5))


_lock = threading.Lock()
_cache = {}
_n = [0]


def load_cache():
    global _cache
    if os.path.exists(CACHE):
        with open(CACHE, encoding="utf-8") as f:
            _cache = json.load(f)


def save_cache():
    with _lock:
        os.makedirs(WORK, exist_ok=True)
        tmp = CACHE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(_cache, f)
        os.replace(tmp, CACHE)


def api(lat, lon, retries=4):
    p = dict(COMU)
    p["one"] = f"{lat},{lon}"
    p["time"] = SORTIDA_UTC
    url = API + "?" + urllib.parse.urlencode(p)
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "Accept": "application/json",
                "User-Agent": "simple-webs data-src/1.0 (isochrones, low volume)",
            })
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(3.0 * (i + 1))
    raise RuntimeError(f"one-to-all ha fallat {retries} cops: {last}")


def feina(item):
    kind, key, lat, lon = item
    ck = f"{kind}|{key}"
    if ck in _cache:
        return
    try:
        d = api(lat, lon)
        S, W, N, E = BBOX
        graella = {}
        for a in d.get("all", []):
            pl = a.get("place") or {}
            la, lo = pl.get("lat"), pl.get("lon")
            dur = a.get("duration")
            if la is None or lo is None or dur is None:
                continue
            if not (S <= la <= N and W <= lo <= E):
                continue
            iy, ix = cella(la, lo)
            k = f"{iy},{ix}"
            m = int(round(dur))
            if k not in graella or m < graella[k]:
                graella[k] = m
        val = graella
    except Exception as e:  # noqa: BLE001
        val = {"_error": str(e)[:200]}
    with _lock:
        _cache[ck] = val
        _n[0] += 1
        n = _n[0]
    print(f"  [{n}] {kind} {key}: "
          + (f"{len(val)} cel·les" if "_error" not in val else f"ERROR {val['_error']}"),
          file=sys.stderr, flush=True)
    if n % 5 == 0:
        save_cache()
    time.sleep(1.0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--test", action="store_true")
    ap.add_argument("--jobs", type=int, default=2)
    args = ap.parse_args()

    os.makedirs(WORK, exist_ok=True)
    load_cache()

    with open(os.path.join(HERE, "municipis.json"), encoding="utf-8") as f:
        municipis = json.load(f)
    with open(os.path.join(HERE, "..", "pages", "data", "bcn-barris.json"), encoding="utf-8") as f:
        bd = json.load(f)
    barris = bd["municipis"] if isinstance(bd, dict) else bd

    if args.test:
        municipis = [m for m in municipis
                     if m["nom"] in ("Terrassa", "Castelldefels", "Barcelona")]
        barris = []

    tasques = [("mun", m["codi_ine"], m["lat"], m["lon"]) for m in municipis]
    tasques += [("bar", str(b["ine"]), b["lat"], b["lon"]) for b in barris]
    pend = [t for t in tasques if f"{t[0]}|{t[1]}" not in _cache]
    print(f"{len(tasques)} origens, {len(pend)} pendents", file=sys.stderr)

    if pend:
        with cf.ThreadPoolExecutor(max_workers=args.jobs) as ex:
            list(ex.map(feina, pend))
        save_cache()

    # --- Muntatge -----------------------------------------------------------
    # Ancoratges = les cel·les que algun origen arriba a assolir. Es una unio,
    # no una interseccio: una cel·la que nomes assoleix un municipi tambe val.
    totes = {}
    for ck, g in _cache.items():
        if not isinstance(g, dict) or "_error" in g:
            continue
        for k, m in g.items():
            if k not in totes or m < totes[k]:
                totes[k] = m
    claus = sorted(totes)
    print(f"cel·les assolides per algu: {len(claus)}", file=sys.stderr)

    # Les ancores no van com a parells lat/lon (20 caracters cadascuna) sino com
    # a index de graella empaquetat, iy*NCOLS+ix. La pagina en reconstrueix el
    # centre amb bbox, cella_m i ncols. Estalvia ~70 % del pes de la llista.
    ncols = int(math.ceil((BBOX[3] - BBOX[1]) / DLON)) + 1
    ancores = []
    for k in claus:
        iy, ix = (int(x) for x in k.split(","))
        ancores.append(iy * ncols + ix)

    idx = {k: i for i, k in enumerate(claus)}
    NO = 255                       # inabastable dins del limit

    def matriu(items, idkey, pre):
        files, ids = [], []
        for it in items:
            k = str(it[idkey])
            g = _cache.get(f"{pre}|{k}")
            if not isinstance(g, dict) or "_error" in g:
                g = {}
            fila = bytearray([NO]) * len(claus)
            for ck, m in g.items():
                i = idx.get(ck)
                if i is not None:
                    fila[i] = min(254, m)
            files.append(bytes(fila))
            ids.append(k)
        return ids, files

    with open(os.path.join(HERE, "municipis.json"), encoding="utf-8") as f:
        municipis_all = json.load(f)

    import base64
    doc = {
        "generat": time.strftime("%Y-%m-%d"),
        "metode": ("MOTIS one-to-all sobre els GTFS oficials servits per Transitous: una "
                   "consulta per origen que retorna el temps fins a totes les parades a "
                   "l'abast. El temps fins a un punt qualsevol P es el minim, sobre les "
                   "parades properes a P, de (temps fins a la parada + caminar fins a P). "
                   "L'unic tram estimat es aquesta ultima caminada."),
        "font": "https://api.transitous.org/api/v1/one-to-all (MOTIS / Transitous)",
        "hora": (f"sortida a les 07:15 locals de dimarts {DIA} (CEST, UTC+2). A diferencia "
                 "de transit.json, que es 'arribar a les 09:00', aqui es una sortida fixa: "
                 "one-to-all amb arriveBy donaria la direccio contraria. Un poble amb un "
                 "unic bus poc abans d'aquesta hora en surt mal parat."),
        "limit_min": MAX_MIN,
        "cella_m": CELLA_M,
        "bbox": list(BBOX),
        "dlat": round(DLAT, 8),
        "dlon": round(DLON, 8),
        "ncols": ncols,
        "inabastable": NO,
        # index empaquetat iy*ncols+ix; centre = bbox[0]+(iy+.5)*dlat, bbox[1]+(ix+.5)*dlon
        "ancores": ancores,
    }
    for items, idkey, pre, nom in ((municipis_all, "codi_ine", "mun", "municipis"),
                                   (barris, "ine", "bar", "barris")):
        ids, files = matriu(items, idkey, pre)
        doc[nom] = {"ids": ids,
                    "matriu": base64.b64encode(b"".join(files)).decode("ascii")}

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False)
    mb = os.path.getsize(OUT) / 1048576
    print(f"escrit {OUT} · {mb:.2f} MB · {len(ancores)} ancores "
          f"× {len(doc['municipis']['ids'])} municipis + {len(doc['barris']['ids'])} barris",
          file=sys.stderr)


if __name__ == "__main__":
    main()
