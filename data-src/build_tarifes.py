#!/usr/bin/env python3
"""Coste mensual de vivir en cada municipio → data-src/tarifes.json

Dos gastos corrientes que la página no tenía y que deciden tanto como el
precio del piso:

  · **Transporte.** Zona tarifaria de la ATM y, sobre todo, **cuántas zonas
    atraviesas para llegar a Barcelona**, que es lo que fija el precio del
    abono. Con eso sale el coste de la T-usual, el título de 30 días y viajes
    ilimitados: 22,80 €/mes viviendo dentro del área metropolitana, 42,70 €
    desde Terrassa o Mataró. Veinte euros al mes de diferencia por vivir una
    corona más lejos.

  · **Agua.** Precio del metro cúbico, que en el área va de 1,26 € a 4,02 €.
    Es un factor de tres entre municipios vecinos y no lo publica nadie más
    junto al resto.

Las dos son **solo municipales**. Barcelona entera es zona 1 y tiene un único
precio del agua, así que para los 73 barrios el dato es constante y no aporta
nada: la página lo enseña solo en los municipios.

## La corona NO es el número de zonas

El error fácil sería leer el primer dígito de `fare_zone` («2C» → 2 zonas).
Es falso para buena parte del área metropolitana: **Sant Cugat y Rubí son los
dos «2C»**, y desde Sant Cugat cruzas 1 zona y desde Rubí, 2. Lo que manda es
la zona *lógica* y la matriz `zones_intersect`, que dice cuántas zonas hay
entre dos zonas lógicas cualesquiera. De ahí sale el número correcto.

La comprobación de que la lectura es la buena: los municipios que quedan a
1 zona de Barcelona son exactamente los 36 del Àrea Metropolitana.

## De dónde salen los datos, y con qué garantía

La ATM **no publica esto en el catálogo de datos abiertos**. Los tres ficheros
son los que sirve su propio visor público de la zonificación: JSON sin licencia
declarada, sin versionado y sin ninguna garantía de que la URL siga ahí. Por
eso el script no se fía: exige emparejar **los 92 municipios** por nombre y
contrasta cada uno contra los polígonos de sectores, que son una fuente
distinta de la misma casa. Si las dos no dicen lo mismo, no escribe nada.

Las tarifas de la T-usual van escritas a mano abajo: están en HTML plano y
rascarlas sería más frágil que copiarlas con su fecha de consulta.

    python3 build_tarifes.py [--fresh]
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
import urllib.request
from datetime import date
from pathlib import Path

AQUI = Path(__file__).parent
CACHE = AQUI / "_work"
SORTIDA = AQUI / "tarifes.json"
MUNICIPIS = AQUI / "municipis.json"

ATM = "https://www.atm.cat/documents/d/portal-atm/"
ATM_CIUTATS = ATM + "cities"              # nom → fare_zone, logic_zone
ATM_INTERSECT = ATM + "zones_intersect"   # zones travessades entre zones lògiques
ATM_SECTORS = ATM + "sectors_tarifaris_amb"   # GeoJSON dels sectors, per contrastar

TUSUAL_URL = "https://www.atm.cat/titols-tarifes/titols-i-tarifes/t-usual"
TUSUAL_CONSULTA = "2026-09-28"
# T-usual: 30 días, viajes ilimitados dentro del número de zonas del título.
TUSUAL_EUR = {1: 22.80, 2: 30.55, 3: 42.70, 4: 52.15, 5: 59.60, 6: 63.85}

AIGUA = ("https://analisi.transparenciacatalunya.cat/resource/6st4-ptsi.json"
         "?$where=any='{any}'&$limit=1200")
AIGUA_DES_DE = 2025      # el año más reciente publicado; se prueba hacia atrás

# La zona lógica de Barcelona. La fila de `zones_intersect` que le corresponde
# es la que dice, para cada otra zona lógica, cuántas zonas hay de por medio.
ZONA_BCN = "1"

UA = {"User-Agent": "simple-webs/1.0 (+https://webs.raular.com)"}


def baixa(url: str, nom: str, fresh: bool) -> bytes:
    cau = CACHE / nom
    if cau.exists() and not fresh:
        return cau.read_bytes()
    CACHE.mkdir(exist_ok=True)
    print(f"  ↓ {url[:96]}…")
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
        dades = r.read()
    # El portal de la ATM está detrás de un proxy: si un día nos planta una
    # página de bloqueo, un json.loads() daría un error críptico y una caché
    # envenenada. Mejor reventar aquí y no guardar nada.
    if dades[:400].lstrip().lower().startswith((b"<!doctype", b"<html")):
        raise SystemExit(f"{url} ha devuelto HTML en vez de JSON")
    cau.write_bytes(dades)
    return dades


# --- emparejar nombres -----------------------------------------------------
# La ATM escribe «Hospitalet de Llobregat, L'» y el INE «l'Hospitalet de
# Llobregat». Se normaliza a una forma sin acentos, sin artículo y sin
# puntuación, que es suficiente: con los 92 municipios da 92 de 92 y ningún
# empate. Si algún día empatan dos, el script lo dice y para.
def norma(nom: str) -> str:
    s = unicodedata.normalize("NFD", nom.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    if "," in s:                                   # «Hospitalet…, L'» → «L' Hospitalet…»
        cos, article = s.rsplit(",", 1)
        s = f"{article.strip()} {cos.strip()}"
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = re.sub(r"^(el|la|l|els|les|sa|es) ", "", s)
    return re.sub(r"\s+", " ", s).strip()


# --- punto en polígono -----------------------------------------------------
def dins_anell(lon: float, lat: float, anell: list) -> bool:
    """Ray casting clásico. El anillo viene cerrado del GeoJSON."""
    dins = False
    n = len(anell)
    for i in range(n):
        x1, y1 = anell[i][0], anell[i][1]
        x2, y2 = anell[(i + 1) % n][0], anell[(i + 1) % n][1]
        if (y1 > lat) != (y2 > lat):
            tall = x1 + (lat - y1) * (x2 - x1) / (y2 - y1)
            if lon < tall:
                dins = not dins
    return dins


def dins_geometria(lon: float, lat: float, geom: dict) -> bool:
    pols = (geom["coordinates"] if geom["type"] == "MultiPolygon"
            else [geom["coordinates"]])
    for pol in pols:
        if not pol or not dins_anell(lon, lat, pol[0]):
            continue
        # Los anillos siguientes son huecos.
        if any(dins_anell(lon, lat, forat) for forat in pol[1:]):
            continue
        return True
    return False


def sector_de(lon: float, lat: float, sectors: list) -> str | None:
    for f in sectors:
        if dins_geometria(lon, lat, f["geometry"]):
            return f["properties"].get("sector")
    return None


# --- ATM -------------------------------------------------------------------
def tarifes_atm(munis: list[dict], fresh: bool) -> tuple[dict, dict]:
    ciutats = json.loads(baixa(ATM_CIUTATS, "atm-cities.json", fresh))
    intersect = json.loads(baixa(ATM_INTERSECT, "atm-intersect.json", fresh))
    sectors = json.loads(baixa(ATM_SECTORS, "atm-sectors.geojson", fresh))["features"]

    per_nom: dict[str, list] = {}
    for c in ciutats:
        per_nom.setdefault(norma(c["name"]), []).append(c)

    des_de_bcn = next((e["intersect"] for e in intersect
                       if e.get("logic_zone") == ZONA_BCN), None)
    if not des_de_bcn:
        raise SystemExit("zones_intersect no trae la fila de la zona 1 (Barcelona)")

    out: dict[str, dict] = {}
    sense, ambigus, discrepants, sense_poligon = [], [], [], []

    for m in munis:
        clau = norma(m["nom"])
        candidats = per_nom.get(clau, [])
        if not candidats:
            sense.append(m["nom"])
            continue
        if len({c["logic_zone"] for c in candidats}) > 1:
            ambigus.append(m["nom"])
            continue
        c = candidats[0]
        zones = des_de_bcn.get(c["logic_zone"])
        if zones is None:
            sense.append(f"{m['nom']} (zona lógica {c['logic_zone']} sin distancia)")
            continue
        zones = int(zones)

        # Contraste con la otra fuente de la ATM: el sector que encierra el
        # punto del municipio tiene que ser el mismo que dice el listado.
        sec = sector_de(m["lon"], m["lat"], sectors)
        if sec is None:
            sense_poligon.append(m["nom"])
        elif sec.upper() != c["fare_zone"].upper():
            discrepants.append(f"{m['nom']}: listado {c['fare_zone']} ≠ mapa {sec}")

        out[m["codi_ine"]] = {
            "zona_tarifaria": c["fare_zone"],
            "zones_a_bcn": zones,
            "transport_eur_mes": TUSUAL_EUR.get(zones),
        }

    if sense or ambigus:
        raise SystemExit("la ATM no cubre todos los municipios:\n  sin emparejar: "
                         + ", ".join(sense) + "\n  ambiguos: " + ", ".join(ambigus))
    if discrepants:
        raise SystemExit("las dos fuentes de la ATM no coinciden:\n  "
                         + "\n  ".join(discrepants))
    if sense_poligon:
        print(f"  ⚠ {len(sense_poligon)} sin polígono de sector, sin contrastar: "
              + ", ".join(sense_poligon[:6]) + ("…" if len(sense_poligon) > 6 else ""))

    meta = {
        "font": "Autoritat del Transport Metropolità · visor de la zonificació",
        "url": ATM_CIUTATS,
        "url_matriu": ATM_INTERSECT,
        "url_sectors": ATM_SECTORS,
        "consulta": date.today().isoformat(),
        "municipis": len(out),
        "contrastats": len(out) - len(sense_poligon),
        "nota": ("No es un conjunto del catálogo de datos abiertos: es el JSON "
                 "que la ATM sirve a su visor público de la zonificación, sin "
                 "licencia declarada ni URL garantizada. El número de zonas "
                 "sale de la matriz zones_intersect, no del dígito de la "
                 "corona: Sant Cugat y Rubí son los dos «2C» y están a 1 y a "
                 "2 zonas de Barcelona."),
        "tusual": {
            "font": "ATM · tarifa de la T-usual (30 días, viajes ilimitados)",
            "url": TUSUAL_URL,
            "consulta": TUSUAL_CONSULTA,
            "eur": {str(k): v for k, v in TUSUAL_EUR.items()},
        },
    }
    return out, meta


# --- agua ------------------------------------------------------------------
def preu_aigua(fresh: bool) -> tuple[dict, dict]:
    """El año más reciente que devuelva filas, probando hacia atrás."""
    for any_ in range(AIGUA_DES_DE + 2, AIGUA_DES_DE - 3, -1):
        url = AIGUA.format(any=any_)
        try:
            files = json.loads(baixa(url, f"aigua-{any_}.json", fresh))
        except Exception as e:                       # noqa: BLE001 — año sin publicar
            print(f"  ⚠ {any_}: {e}")
            continue
        if not files:
            # Un año aún sin publicar devuelve `[]`. Si se quedara en la caché,
            # el año que viene seguiríamos leyendo el hueco en vez del dato.
            (CACHE / f"aigua-{any_}.json").unlink(missing_ok=True)
            continue
        out = {}
        for f in files:
            codi, v = f.get("codi_municipi"), f.get("preu_aigua")
            if not codi or v in (None, ""):
                continue
            try:
                out[str(codi).zfill(6)[:5]] = round(float(v), 3)
            except ValueError:
                continue
        if out:
            return out, {
                "font": "Agència Catalana de l'Aigua, vía Dades Obertes de Catalunya (6st4-ptsi)",
                "url": url, "any": any_, "municipis": len(out),
                "nota": ("Precio total del metro cúbico: suministro + canon del "
                         "agua + alcantarillado. Es la tarifa del municipio, no "
                         "una factura: lo que pagues depende de lo que gastes y "
                         "del tramo."),
            }
    raise SystemExit("ningún año del precio del agua ha devuelto filas")


def main() -> None:
    fresh = "--fresh" in sys.argv
    print("coste del transporte y del agua, por municipio\n")

    munis = json.loads(MUNICIPIS.read_text(encoding="utf8"))
    print(f"· referencia: {len(munis)} municipios de municipis.json")

    print("· zona tarifaria (ATM)")
    atm, meta_atm = tarifes_atm(munis, fresh)
    quantes: dict[int, int] = {}
    for v in atm.values():
        quantes[v["zones_a_bcn"]] = quantes.get(v["zones_a_bcn"], 0) + 1
    print(f"  {len(atm)} municipios · zonas hasta Barcelona: "
          + ", ".join(f"{z} → {n}" for z, n in sorted(quantes.items())))

    print("· precio del agua (ACA)")
    aigua, meta_aigua = preu_aigua(fresh)
    nostres = {c: v for c, v in aigua.items() if c in atm}
    print(f"  {len(nostres)} de nuestros {len(atm)} municipios · año {meta_aigua['any']}")

    municipis: dict[str, dict] = {}
    for codi, v in atm.items():
        municipis[codi] = dict(v)
    for codi, v in nostres.items():
        municipis.setdefault(codi, {})["aigua_eur_m3"] = v

    dades = {
        "generat": date.today().isoformat(),
        "nota": ("Dos gastos corrientes por municipio. Los dos existen solo a "
                 "escala municipal: Barcelona entera es zona tarifaria 1 y "
                 "tiene un único precio del agua, así que para sus 73 barrios "
                 "el dato sería el mismo número repetido y no se publica."),
        "transport": meta_atm,
        "aigua": meta_aigua,
        "municipis": municipis,
    }
    SORTIDA.write_text(json.dumps(dades, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    print(f"\n→ {SORTIDA.name}: {len(municipis)} municipios")


if __name__ == "__main__":
    main()
