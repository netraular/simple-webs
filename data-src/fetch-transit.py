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

# Versio del format de la resposta guardada a la cache. Les entrades v1 nomes
# tenien {min, transbords, modes}; la v2 hi afegeix el desglos per tram (minuts
# a peu, en vehicle, espera, linies i parades), que es el que permet filtrar per
# "quant camino". Son claus separades: si la v2 falla, la v1 segueix intacta.
CACHE_VER = "v2"

# --- Dia i hores de referencia -------------------------------------------
# Dimarts 29 de setembre de 2026, dia feiner normal. Catalunya es a CEST
# (UTC+2) fins al 25 d'octubre, per tant hora local = UTC + 2.
DIA = "2026-09-29"
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
    # Terminal 1 del Prat, centroide de l'edifici a OSM. OJO: la coordenada que
    # hi havia a pois.json (41.2874, 2.0830) cau sobre la plataforma d'aeronaus,
    # sense cap carrer a prop, i el router no hi arribava des d'enlloc: tota la
    # columna sortia null. La T2 te estacio de Rodalies propia i va ~10 min millor.
    "aeroport": (41.28867, 2.07341),
    # Estacio de Rodalies de Castelldefels, no la platja: qui diu "anar a
    # Castelldefels" cada dia hi va al poble, i la platja ja es un POI a part.
    "castelldefels": (41.2800, 1.9757),
    # Estacio d'FGC de Sant Cugat (centre). Separada de Roche a proposit: el
    # punt de Roche queda a 1,5 km de la xarxa i arrossega un bus llancadora que
    # suma 10-12 min a TOTS els temps. "Arribar a Sant Cugat" en general es aixo.
    "sant-cugat-estacio": (41.46791, 2.07820),
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


def lloc(p):
    """Place de MOTIS -> {nom, lat, lon}, tolerant amb els camps que faltin."""
    if not isinstance(p, dict):
        return None
    lat, lon = p.get("lat"), p.get("lon")
    return {
        "nom": p.get("name"),
        "lat": round(lat, 5) if isinstance(lat, (int, float)) else None,
        "lon": round(lon, 5) if isinstance(lon, (int, float)) else None,
    }


def resumeix(it):
    """Converteix un itinerari MOTIS en el resum que guardem a la cache.

    A banda del total, desglossa el trajecte en les parts que l'usuari viu de
    manera diferent: caminar no es el mateix que anar assegut al tren, i esperar
    en una andana no es el mateix que cap de les dues coses.

      a_peu_acces     portal -> primera parada  (el "quant camino des de casa")
      a_peu_transbord caminar entre parades d'un transbord
      a_peu_final     ultima parada -> desti
      a_peu           la suma dels tres: el que filtra la pagina
      en_vehicle      temps dins d'un vehicle
      espera          durada total menys la suma dels trams: el temps mort

    `linies` son els trams de transport public en ordre, amb el codi de linia
    (S1, R4, L3, T2...) i les parades on puges i baixes, que es el que permet
    dibuixar l'itinerari sobre el mapa.
    """
    legs = it.get("legs", []) or []
    modes, linies = [], []
    a_peu_acces = a_peu_final = a_peu_transbord = en_vehicle = 0
    suma_trams = 0

    for i, leg in enumerate(legs):
        dur = round((leg.get("duration") or 0) / 60)
        suma_trams += leg.get("duration") or 0
        if (leg.get("mode") or "").upper() == "WALK":
            # START / END son els extrems que posa MOTIS al portal i al desti.
            de_inici = i == 0 or (leg.get("from") or {}).get("name") == "START"
            al_final = i == len(legs) - 1 or (leg.get("to") or {}).get("name") == "END"
            if de_inici:
                a_peu_acces += dur
            elif al_final:
                a_peu_final += dur
            else:
                a_peu_transbord += dur
            continue
        en_vehicle += dur
        n = mode_name(leg)
        if n and (not modes or modes[-1] != n):
            modes.append(n)
        linies.append({
            "ref": leg.get("routeShortName") or None,
            "xarxa": n,
            "operador": leg.get("agencyName") or None,
            "min": dur,
            "de": lloc(leg.get("from")),
            "a": lloc(leg.get("to")),
        })

    # dedup preservant ordre
    vist, nets = set(), []
    for m in modes:
        if m not in vist:
            vist.add(m)
            nets.append(m)

    total = it["duration"]
    return {
        "min": round(total / 60),
        "transbords": max(0, it.get("transfers", 0)),
        "modes": nets,
        "a_peu": a_peu_acces + a_peu_transbord + a_peu_final,
        "a_peu_acces": a_peu_acces,
        "a_peu_transbord": a_peu_transbord,
        "a_peu_final": a_peu_final,
        "en_vehicle": en_vehicle,
        "espera": max(0, round((total - suma_trams) / 60)),
        "linies": linies,
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


def ckey(kind, key, dest):
    return f"{CACHE_VER}|{kind}|{key}|{dest}"


def feina(item):
    kind, key, lat, lon, dest = item
    ck = ckey(kind, key, dest)
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

    pend = [t for t in tasques if ckey(t[0], t[1], t[4]) not in _cache]
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
        v = _cache.get(ckey(kind, key, dest))
        if v and "_cap" in v and ckey(kind, key, dest + "@tard") not in _cache:
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
            pre = "mun" if idkey == "codi_ine" else "bar"
            entrada = {"nom": it["nom"], "sortides_hora_punta": None, "destins": {}}
            pv = _cache.get(ckey(pre, k, "__punta__"))
            if pv and "sortides_hora_punta" in pv:
                entrada["sortides_hora_punta"] = pv["sortides_hora_punta"]
            for d in DESTINS:
                v = _cache.get(ckey(pre, k, d))
                if not v or "_error" in v or "_cap" in v:
                    v = _cache.get(ckey(pre, k, d + "@tard"))
                if not v or "_error" in v or "_cap" in v or v.get("min") is None:
                    entrada["destins"][d] = None
                else:
                    e = {
                        "min": v["min"],
                        "transbords": v["transbords"],
                        "modes": v["modes"],
                        # Desglos v2. Els camps antics de dalt no es toquen: la
                        # pagina pisos-vs-distancia.html els llegeix tal qual.
                        "a_peu": v.get("a_peu"),
                        "a_peu_acces": v.get("a_peu_acces"),
                        "a_peu_transbord": v.get("a_peu_transbord"),
                        "a_peu_final": v.get("a_peu_final"),
                        "en_vehicle": v.get("en_vehicle"),
                        "espera": v.get("espera"),
                        "linies": v.get("linies") or [],
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
            "desglos": ("Cada desti porta el trajecte partit en les parts que es viuen "
                        "diferent: a_peu_acces (portal -> primera parada), a_peu_transbord, "
                        "a_peu_final (ultima parada -> desti), a_peu (la suma dels tres), "
                        "en_vehicle i espera (temps mort als transbords). min = la suma de "
                        "tot. `linies` son els trams de transport public en ordre, amb codi "
                        "de linia i les parades on puges i baixes. ATENCIO: a_peu es el que "
                        "camines a la ruta MES RAPIDA, no el minim possible: podria haver-hi "
                        "una alternativa mes lenta i amb menys cami que el router descarta."),
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
