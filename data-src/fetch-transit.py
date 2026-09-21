#!/usr/bin/env python3
"""
fetch-transit.py — temps en transport public (porta a porta) amb el router MOTIS
public de Transitous (https://api.transitous.org), que serveix els GTFS de
Rodalies/Renfe, FGC, TMB (metro/bus), TRAM i els busos interurbans de Catalunya.

Genera data-src/transit.json.

Us:
    python3 fetch-transit.py            # tot (92 municipis + 73 barris)
    python3 fetch-transit.py --test     # nomes unes quantes proves de cordura
    python3 fetch-transit.py --only-municipis

Es reprenible: guarda cada resposta resumida a .transit-cache.json i no torna a
demanar el que ja te.
"""
import argparse
import concurrent.futures as cf
import json
import os
import sys
import threading
import time
import urllib.parse
import urllib.request
import urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
API = "https://api.transitous.org/api/v1/plan"
CACHE = os.path.join(HERE, ".transit-cache.json")
OUT = os.path.join(HERE, "transit.json")

# --- Dia i hores de referencia -------------------------------------------
# Dimarts 22 de setembre de 2026, dia feiner normal. Catalunya es a CEST
# (UTC+2) fins al 25 d'octubre, per tant hora local = UTC + 2.
DIA = "2026-09-22"
ARRIBADA_LOCAL = "09:00"
ARRIBADA_UTC = f"{DIA}T07:00:00Z"   # 09:00 local
SORTIDA_MINIMA_UTC = f"{DIA}T03:30:00Z"  # 05:30 local: ningu no surt de casa abans
PUNTA_INICI_UTC = f"{DIA}T05:00:00Z"  # 07:00 local
PUNTA_FINESTRA = 7200                 # 2 h -> fins a les 09:00 local
MAX_MIN = 240                         # mes de 4 h porta a porta = no es un commute
LIMIT_TARD = f"{DIA}T08:00:00Z"       # 10:00 local: segona oportunitat

DESTINS = {
    # Complex Farmaceutic Roche, Av. de la Generalitat 171-173, Sant Cugat.
    "roche-sant-cugat": (41.492364, 2.058228),
    "pl-catalunya": (41.3870, 2.1701),
    "sants": (41.3792, 2.1400),
}

# Parametres comuns: nomes a peu als extrems (l'usuari no te cotxe), i fins a
# 30 min de cami fins a la primera parada i des de l'ultima.
COMU = {
    "preTransitModes": "WALK",
    "postTransitModes": "WALK",
    "directModes": "WALK",
    "maxPreTransitTime": "1800",
    "maxPostTransitTime": "1800",
    "maxDirectTime": "3600",
    "pedestrianSpeed": "1.25",   # 4,5 km/h
}

_lock = threading.Lock()
_cache = {}
_ncalls = [0]


def load_cache():
    global _cache
    if os.path.exists(CACHE):
        with open(CACHE, encoding="utf-8") as f:
            _cache = json.load(f)


def save_cache():
    with _lock:
        tmp = CACHE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(_cache, f)
        os.replace(tmp, CACHE)


def api(params, retries=4):
    url = API + "?" + urllib.parse.urlencode(params)
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "Accept": "application/json",
                "User-Agent": "simple-webs data-src/1.0 (transit times, low volume)",
            })
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2.0 * (i + 1) + 1.0)
    raise RuntimeError(f"API error after {retries} tries: {last}")


# --- Normalitzacio de modes ----------------------------------------------
RAIL_MODES = {"RAIL", "REGIONAL_RAIL", "REGIONAL_FAST_RAIL", "LONG_DISTANCE",
              "HIGHSPEED_RAIL", "NIGHT_RAIL", "SUBURBAN", "COMMUTER"}


def mode_name(leg):
    m = (leg.get("mode") or "").upper()
    ag = (leg.get("agencyName") or "")
    agl = ag.lower()
    if m == "WALK":
        return None
    if m == "SUBWAY":
        return "Metro"
    if m == "TRAM":
        return "Tram"
    if m in ("BUS", "COACH"):
        return "Bus"
    if m == "FUNICULAR" or m == "AERIAL_LIFT" or m == "CABLE_CAR":
        return "Funicular"
    if m in RAIL_MODES:
        if "fgc" in agl or "ferrocarrils" in agl:
            return "FGC"
        if "cercan" in agl or "rodali" in agl or "renfe" in agl:
            return "Rodalies"
        return "Tren"
    if m == "FERRY":
        return "Vaixell"
    return None


def resumeix(it):
    """Converteix un itinerari MOTIS en {min, transbords, modes, sortida, arribada}."""
    modes = []
    for leg in it.get("legs", []):
        n = mode_name(leg)
        if n and (not modes or modes[-1] != n):
            modes.append(n)
    # dedup preservant ordre
    vist, nets = set(), []
    for m in modes:
        if m not in vist:
            vist.add(m)
            nets.append(m)
    return {
        "min": round(it["duration"] / 60),
        "transbords": max(0, it.get("transfers", 0)),
        "modes": nets,
        "sortida": it.get("startTime"),
        "arribada": it.get("endTime"),
    }


def millor_itinerari(origen, desti_ll, limit=None):
    """Millor trajecte que arriba a temps (arriveBy 09:00 local d'un dimarts)."""
    limit = limit or ARRIBADA_UTC
    p = dict(COMU)
    p.update({
        "fromPlace": f"{origen[0]},{origen[1]}",
        "toPlace": f"{desti_ll[0]},{desti_ll[1]}",
        "time": limit,
        "arriveBy": "true",
        "timetableView": "false",
    })
    d = api(p)
    ARRIBADA_UTC_L = limit  # noqa: N806
    # Nomes valen els trajectes que arriben a temps I que surten de casa el
    # mateix mati. Sense aixo el router "resol" els pobles sense servei amb un
    # bus del vespre anterior i una nit d'espera, que dona xifres absurdes.
    cands = [it for it in d.get("itineraries", [])
             if it["endTime"] <= ARRIBADA_UTC_L
             and it["startTime"] >= SORTIDA_MINIMA_UTC
             and it["duration"] <= MAX_MIN * 60]
    # un barri cèntric pot tenir-ho més a prop a peu que amb metro
    cands += [it for it in d.get("direct", []) if it["duration"] <= MAX_MIN * 60]
    if not cands:
        return {"_cap": True}
    best = min(cands, key=lambda x: x["duration"])
    r = resumeix(best)
    if not r["modes"]:
        r["modes"] = ["A peu"]
        r["transbords"] = 0
    return r


def sortides_punta(origen):
    """Nombre de sortides utils cap a Barcelona (pl. Catalunya) entre 07:00 i
    09:00 locals. Es una cerca de rang (range-RAPTOR): retorna totes les
    combinacions optimes de Pareto (sortida mes tard / arribada mes aviat) dins
    la finestra, es a dir una per cada sortida aprofitable."""
    p = dict(COMU)
    p.update({
        "fromPlace": f"{origen[0]},{origen[1]}",
        "toPlace": f"{DESTINS['pl-catalunya'][0]},{DESTINS['pl-catalunya'][1]}",
        "time": PUNTA_INICI_UTC,
        "arriveBy": "false",
        "timetableView": "true",
        "searchWindow": str(PUNTA_FINESTRA),
        "numItineraries": "50",
    })
    d = api(p)
    fi = f"{DIA}T07:00:00Z"   # 09:00 local
    sortides = set()
    for it in d.get("itineraries", []):
        # sortida del primer tram de transport public (no del portal de casa)
        t = None
        for leg in it.get("legs", []):
            if (leg.get("mode") or "").upper() != "WALK":
                t = leg["startTime"]
                break
        if t is None:
            continue           # itinerari nomes a peu: no es una "sortida"
        if PUNTA_INICI_UTC <= t < fi:
            sortides.add(t)
    return len(sortides), len(d.get("itineraries", []))


def feina(item):
    kind, key, lat, lon, dest = item
    ck = f"{kind}|{key}|{dest}"
    if ck in _cache:
        return ck, _cache[ck]
    try:
        if dest == "__punta__":
            n, tot = sortides_punta((lat, lon))
            val = {"sortides_hora_punta": n, "_n_itin": tot}
        elif dest.endswith("@tard"):
            # Segona oportunitat per als que no arriben a les 09:00: mirem si hi
            # ha res que arribi abans de les 10:00. Es marca com a tard.
            val = millor_itinerari((lat, lon), DESTINS[dest[:-5]], limit=LIMIT_TARD)
            if val and "_cap" not in val:
                val["tard"] = True
        else:
            val = millor_itinerari((lat, lon), DESTINS[dest])
    except Exception as e:  # noqa: BLE001
        val = {"_error": str(e)[:200]}
    with _lock:
        _cache[ck] = val
        _ncalls[0] += 1
        n = _ncalls[0]
    if n % 10 == 0:
        save_cache()
        print(f"  ... {n} consultes noves fetes", file=sys.stderr, flush=True)
    time.sleep(0.7)
    return ck, val


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--test", action="store_true")
    ap.add_argument("--only-municipis", action="store_true")
    ap.add_argument("--jobs", type=int, default=3)
    args = ap.parse_args()

    load_cache()

    with open(os.path.join(HERE, "municipis.json"), encoding="utf-8") as f:
        municipis = json.load(f)
    barris_path = os.path.join(HERE, "..", "pages", "data", "bcn-barris.json")
    with open(barris_path, encoding="utf-8") as f:
        bd = json.load(f)
    barris = bd["municipis"] if isinstance(bd, dict) else bd

    if args.test:
        proves = [m for m in municipis
                  if m["nom"] in ("Castelldefels", "Barcelona", "Terrassa",
                                  "Sabadell", "Olivella", "Sant Cugat del Vallès")]
        municipis, barris = proves, []

    tasques = []
    dests = list(DESTINS) + ["__punta__"]
    for m in municipis:
        for d in dests:
            tasques.append(("mun", m["codi_ine"], m["lat"], m["lon"], d))
    if not args.only_municipis:
        for b in barris:
            for d in dests:
                tasques.append(("bar", str(b["ine"]), b["lat"], b["lon"], d))

    pend = [t for t in tasques if f"{t[0]}|{t[1]}|{t[4]}" not in _cache]
    print(f"{len(tasques)} consultes, {len(pend)} pendents", file=sys.stderr)

    with cf.ThreadPoolExecutor(max_workers=args.jobs) as ex:
        list(ex.map(feina, pend))
    save_cache()

    # --- Segona passada: els que no arriben a les 09:00 ------------------
    # Hi ha municipis amb servei real que, simplement, no et deixen a temps
    # (Castellvi de Rosanes arriba a les 09:10 com a molt aviat). Dir-ne "null"
    # seria tan fals com inventar-se un temps: es torna a demanar amb limit a
    # les 10:00 i es marca el resultat com a tard.
    rescat = []
    for t in tasques:
        kind, key, lat, lon, dest = t
        if dest == "__punta__":
            continue
        v = _cache.get(f"{kind}|{key}|{dest}")
        if v and "_cap" in v and f"{kind}|{key}|{dest}@tard" not in _cache:
            rescat.append((kind, key, lat, lon, dest + "@tard"))
    if rescat:
        print(f"segona passada: {len(rescat)} consultes", file=sys.stderr)
        with cf.ThreadPoolExecutor(max_workers=args.jobs) as ex:
            list(ex.map(feina, rescat))
        save_cache()

    # --- Muntatge de transit.json ---------------------------------------
    def bloc(items, idkey):
        out = {}
        for it in items:
            k = str(it[idkey])
            entrada = {"nom": it["nom"], "sortides_hora_punta": None, "destins": {}}
            pv = _cache.get(f"{'mun' if idkey == 'codi_ine' else 'bar'}|{k}|__punta__")
            if pv and "sortides_hora_punta" in pv:
                entrada["sortides_hora_punta"] = pv["sortides_hora_punta"]
            for d in DESTINS:
                pre = "mun" if idkey == "codi_ine" else "bar"
                v = _cache.get(f"{pre}|{k}|{d}")
                if not v or "_error" in v or "_cap" in v:
                    v = _cache.get(f"{pre}|{k}|{d}@tard")
                if not v or "_error" in v or "_cap" in v or v.get("min") is None:
                    entrada["destins"][d] = None
                else:
                    e = {
                        "min": v["min"],
                        "transbords": v["transbords"],
                        "modes": v["modes"],
                    }
                    if v.get("tard"):
                        arr = (v.get("arribada") or "")[11:16]
                        hh = int(arr[:2]) + 2 if arr else None
                        e["arriba_tard"] = True
                        e["arribada_local"] = f"{hh:02d}{arr[2:]}" if arr else None
                        e["nota"] = ("cap trajecte no hi arriba abans de les 09:00; "
                                     "aquest es el millor que hi arriba abans de les 10:00")
                    entrada["destins"][d] = e
            out[k] = entrada
        return out

    with open(os.path.join(HERE, "municipis.json"), encoding="utf-8") as f:
        municipis_all = json.load(f)
    doc = {
        "meta": {
            "metode": ("Encaminament multimodal porta a porta amb MOTIS sobre els GTFS "
                       "oficials (Rodalies de Catalunya/Renfe, FGC, TMB metro i bus, TRAM, "
                       "busos interurbans de la Generalitat), servit per la instancia "
                       "publica de Transitous. Cami a peu a 4,5 km/h als dos extrems, "
                       "maxim 30 min de cami abans de la primera parada i despres de "
                       "l'ultima. Nomes horari programat, sense temps real."),
            "font": "https://api.transitous.org/api/v1/plan (MOTIS / Transitous)",
            "hora_referencia": (f"arribada a les {ARRIBADA_LOCAL} de dimarts {DIA} "
                                "(hora local CEST, UTC+2); dia feiner sense festius"),
            "hora_punta": ("sortides_hora_punta = nombre de sortides diferents de transport "
                           "public entre les 07:00 i les 09:00 locals que porten a placa de "
                           "Catalunya en un trajecte optim de Pareto (sortir mes tard / "
                           "arribar mes aviat). Mesura la frequencia util, no el total de "
                           "circulacions."),
            "destins": {k: {"lat": v[0], "lon": v[1]} for k, v in DESTINS.items()},
            "generat": time.strftime("%Y-%m-%d"),
            "limitacions": ("Horari teoric, no temps real. El temps es de portal a portal amb "
                            "l'espera als transbords inclosa, pero NO l'espera a casa abans de "
                            "sortir. Les coordenades d'origen son el punt central del municipi "
                            "o del barri, que en municipis grans o disseminats pot quedar lluny "
                            "de l'estacio. null = el router no troba cap trajecte raonable en "
                            "transport public."),
        },
        "municipis": bloc(municipis_all, "codi_ine"),
        "barris": bloc(barris, "ine") if not args.only_municipis else {},
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    print(f"escrit {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
