#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_indicadors.py — genera `indicadors.json` i `indicadors-barris.json`.

Indicadors socioeconòmics per als 92 municipis de `municipis.json` i, en paral·lel,
per als 73 barris de Barcelona.

Fonts (cap valor és inventat, estimat ni interpolat):

  A) INE — Atlas de distribución de renta de los hogares (ADRH), any 2023.
     Taules de la província de Barcelona (08), baixades en CSV de jaxiT3:
       - 30896  Indicadores de renta media y mediana
       - 30904  Indicadores demográficos
       - 37686  Índice de Gini y Distribución de la renta P80/P20
     Cada taula porta files de municipi, de districte i de secció censal.
     Per als municipis fem servir NOMÉS les files de municipi (columnes
     `Distritos` i `Secciones` buides): són xifres publicades, no agregades.
     Per als barris de Barcelona fem servir les files de secció censal del
     municipi 08019 i les agreguem (veure `agrega_barris`).

  B) IDESCAT — API EMEX (https://api.idescat.cat/emex/v1/dades.json), una sola
     crida en bloc per a tots els municipis de Catalunya.

  C) Open Data BCN — correspondència secció censal -> barri (i control de valors),
     a partir dels fitxers de l'Atles de renda publicats per l'Ajuntament.

Ús:  python3 build_indicadors.py            (descarrega i escriu els JSON)
     python3 build_indicadors.py --cache     (reutilitza /tmp/indicadors-cache)
"""

import csv
import io
import json
import os
import sys
import urllib.request
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = "/tmp/indicadors-cache"
UA = {"User-Agent": "simple-webs/data-src build_indicadors.py"}

# ---------------------------------------------------------------- utilitats


def fetch(url, fname, binary=False):
    """Descarrega `url` a CACHE/fname (i la reutilitza si ja hi és)."""
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, fname)
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        sys.stderr.write("  GET %s\n" % url)
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=900) as r, open(path, "wb") as f:
            while True:
                chunk = r.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
    return path


def num_es(s):
    """'16.682' -> 16682.0 ; '30,9' -> 30.9 ; '' / '..' -> None."""
    s = (s or "").strip()
    if s in ("", "..", ".", "-", "n.d."):
        return None
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def r1(x):
    return None if x is None else round(x, 1)


def r0(x):
    return None if x is None else int(round(x))


# ------------------------------------------------------- INE ADRH (CSV jaxiT3)

INE_CSV = "https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/%s.csv"
INE_TAULES = {
    "renda": "30896",   # Indicadores de renta media y mediana — província 08
    "demo": "30904",    # Indicadores demográficos — província 08
    "gini": "37686",    # Índice de Gini y P80/P20 — província 08
}
ANY_ADRH = "2023"


def llegeix_ine(nom):
    """Retorna (per_municipi, per_seccio_08019) per a l'any ANY_ADRH.

    per_municipi:     {codi_ine: {indicador: valor}}
    per_seccio_08019: {codi_seccio_10d: {indicador: valor}}
    """
    path = fetch(INE_CSV % INE_TAULES[nom], "ine_%s.csv" % nom)
    muni = defaultdict(dict)
    secc = defaultdict(dict)
    with open(path, encoding="utf-8-sig") as fh:
        rd = csv.reader(fh, delimiter=";")
        next(rd)  # capçalera
        for row in rd:
            if len(row) < 6:
                continue
            mun, dist, sec, indicador, periode, total = row[:6]
            if periode != ANY_ADRH:
                continue
            codi_mun = mun.split(" ", 1)[0]
            if dist == "" and sec == "":
                muni[codi_mun][indicador] = num_es(total)
            elif sec != "" and codi_mun == "08019":
                secc[sec.split(" ", 1)[0]][indicador] = num_es(total)
    return muni, secc


# ------------------------------------------------------------- IDESCAT EMEX

EMEX_INDICADORS = [
    "f7",    # RFDB per habitant (€)
    "f385",  # Índex socioeconòmic territorial (Catalunya=100)
    "f308",  # Atur registrat (mitjanes anuals)
    "f222",  # Població desocupada (cens anual)
    "f223",  # Població activa (cens anual)
    "f389",  # Població 15+ amb educació superior (%)
    "f401",  # Habitatges familiars principals de lloguer (%)
    "f19",   # Turismes
    "f368",  # Recollida selectiva de residus municipals (%)
    "f381",  # Alumnes residents que estudien al mateix municipi (%)
    "f321",  # Població
]
EMEX_URL = (
    "https://api.idescat.cat/emex/v1/dades.json?i=%s&tipus=mun&lang=ca"
    % ",".join(EMEX_INDICADORS)
)


def llegeix_emex():
    """Retorna ({codi_ine: {fID: valor}}, {fID: metadades})."""
    path = fetch(EMEX_URL, "emex_bulk.json")
    with open(path, encoding="utf-8") as fh:
        d = json.load(fh)
    cols = [c["id"] for c in d["fitxes"]["cols"]["col"]]
    dades = defaultdict(dict)
    meta = {}
    inds = d["fitxes"]["indicadors"]["i"]
    if isinstance(inds, dict):
        inds = [inds]
    for ind in inds:
        fid = ind["id"]
        meta[fid] = {
            "nom": ind.get("c"),
            "any": ind.get("r"),
            "unitat": ind.get("u"),
            "font": ind.get("s"),
            "taula": (ind.get("t") or {}).get("content"),
        }
        vals = ind["v"].split(",")
        assert len(vals) == len(cols), "EMEX: %s desquadrat" % fid
        for codi6, v in zip(cols, vals):
            if v != "_":
                dades[codi6[:5]][fid] = float(v)
    return dades, meta


# ----------------------------------------------- Open Data BCN: secció -> barri

# Recurs 2023 de l'Atles de renda de l'Ajuntament: porta Codi_Districte,
# Codi_Barri, Nom_Barri i Seccio_Censal per a les 1.068 seccions de la ciutat.
BCN_MAPA_URL = (
    "https://opendata-ajuntament.barcelona.cat/data/dataset/"
    "renda-tributaria-per-persona-atlas-distribucio/resource/"
    "2248ae01-340f-41ce-ab08-5cb6986ece73/download"
)


def llegeix_mapa_barris():
    """{codi_seccio_10d: (codi_barri, nom_barri)} i {codi_barri: nom}."""
    path = fetch(BCN_MAPA_URL, "bcn_atles_renda_persona_2023.csv")
    mapa, noms, valors = {}, {}, {}
    with open(path, encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            cb = "%02d" % int(row["Codi_Barri"])
            cd = int(row["Codi_Districte"])
            cs = int(row["Seccio_Censal"])
            codi10 = "08019%02d%03d" % (cd, cs)
            mapa[codi10] = cb
            noms[cb] = row["Nom_Barri"]
            valors[codi10] = num_es(row["Import_Euros"])
    return mapa, noms, valors


# ------------------------------------------------------------------ agregació


def mitjana_ponderada(parells):
    """parells = [(valor, pes)]. None en valor o pes -> la secció no compta."""
    num = den = 0.0
    n = 0
    for v, w in parells:
        if v is None or w is None or w <= 0:
            continue
        num += v * w
        den += w
        n += 1
    if den == 0:
        return None, 0
    return num / den, n


# ----------------------------------------------------------------------- main


def main():
    sys.stderr.write("1/4 INE ADRH (província 08, any %s)\n" % ANY_ADRH)
    renda_mun, renda_sec = llegeix_ine("renda")
    demo_mun, demo_sec = llegeix_ine("demo")
    gini_mun, gini_sec = llegeix_ine("gini")

    sys.stderr.write("2/4 IDESCAT EMEX\n")
    emex, emex_meta = llegeix_emex()

    sys.stderr.write("3/4 municipis\n")
    with open(os.path.join(HERE, "municipis.json"), encoding="utf-8") as fh:
        municipis = json.load(fh)

    out_mun = []
    cobertura = defaultdict(int)
    for m in municipis:
        ci = m["codi_ine"]
        R, D, G, E = renda_mun.get(ci, {}), demo_mun.get(ci, {}), gini_mun.get(ci, {}), emex.get(ci, {})

        turismes = E.get("f19")
        pob = E.get("f321")
        turismes_1000 = (turismes / pob * 1000) if (turismes and pob) else None

        desoc, activa = E.get("f222"), E.get("f223")
        atur_taxa = (desoc / activa * 100) if (desoc is not None and activa) else None

        rec = {
            "codi_ine": ci,
            "nom": m["nom"],
            # --- INE ADRH 2023
            "renda_llar_eur": r0(R.get("Renta neta media por hogar")),
            "renda_persona_eur": r0(R.get("Renta neta media por persona")),
            "renda_bruta_llar_eur": r0(R.get("Renta bruta media por hogar")),
            "renda_bruta_persona_eur": r0(R.get("Renta bruta media por persona")),
            "renda_uc_mitjana_eur": r0(R.get("Media de la renta por unidad de consumo")),
            "renda_uc_mediana_eur": r0(R.get("Mediana de la renta por unidad de consumo")),
            "gini": r1(G.get("Índice de Gini")),
            "p80_p20": r1(G.get("Distribución de la renta P80/P20")),
            "edat_mitjana": r1(D.get("Edad media de la población")),
            "pct_menors_18": r1(D.get("Porcentaje de población menor de 18 años")),
            "pct_65_mes": r1(D.get("Porcentaje de población de 65 y más años")),
            "mida_mitjana_llar": r1(D.get("Tamaño medio del hogar")),
            "pct_llars_unipersonals": r1(D.get("Porcentaje de hogares unipersonales")),
            "pct_poblacio_espanyola": r1(D.get("Porcentaje de población española")),
            "poblacio_adrh_2023": r0(D.get("Población")),
            # --- IDESCAT EMEX
            "rfdb_habitant_eur": r0(E.get("f7")),
            "ist": r1(E.get("f385")),
            "atur_taxa_pct": r1(atur_taxa),
            "atur_registrat": r1(E.get("f308")),
            "pct_educacio_superior": r1(E.get("f389")),
            "pct_habitatge_lloguer": r1(E.get("f401")),
            "pct_recollida_selectiva": r1(E.get("f368")),
            "pct_alumnes_mateix_municipi": r1(E.get("f381")),
            "turismes_per_1000_hab": r0(turismes_1000),
        }
        for k, v in rec.items():
            if k not in ("codi_ine", "nom") and v is not None:
                cobertura[k] += 1
        out_mun.append(rec)

    sys.stderr.write("4/4 barris de Barcelona\n")
    mapa, noms_barri, valors_control = llegeix_mapa_barris()

    # control: els imports de l'Ajuntament han de coincidir amb els de l'INE
    discrepants = 0
    for codi10, v in valors_control.items():
        ine_v = renda_sec.get(codi10, {}).get("Renta neta media por persona")
        if v is not None and ine_v is not None and abs(v - ine_v) > 1:
            discrepants += 1
    sys.stderr.write("    seccions Open Data BCN vs INE: %d discrepants de %d\n"
                     % (discrepants, len(valors_control)))

    per_barri = defaultdict(list)
    for codi10, cb in mapa.items():
        per_barri[cb].append(codi10)

    out_barris = []
    for cb in sorted(per_barri):
        secs = per_barri[cb]
        pes = {s: demo_sec.get(s, {}).get("Población") for s in secs}
        # nombre de llars de cada secció = població / mida mitjana de la llar
        llars = {}
        for s in secs:
            p = pes.get(s)
            t = demo_sec.get(s, {}).get("Tamaño medio del hogar")
            llars[s] = (p / t) if (p and t) else None

        def wp(taula, camp):  # ponderat per població
            return mitjana_ponderada([(taula.get(s, {}).get(camp), pes.get(s)) for s in secs])

        def wl(taula, camp):  # ponderat per nombre de llars
            return mitjana_ponderada([(taula.get(s, {}).get(camp), llars.get(s)) for s in secs])

        pob_tot = sum(v for v in pes.values() if v)
        llars_tot = sum(v for v in llars.values() if v)
        rec = {
            "codi_barri": cb,
            "nom": noms_barri[cb],
            "renda_llar_eur": r0(wl(renda_sec, "Renta neta media por hogar")[0]),
            "renda_persona_eur": r0(wp(renda_sec, "Renta neta media por persona")[0]),
            "renda_bruta_llar_eur": r0(wl(renda_sec, "Renta bruta media por hogar")[0]),
            "renda_bruta_persona_eur": r0(wp(renda_sec, "Renta bruta media por persona")[0]),
            "gini": None,
            "p80_p20": None,
            "edat_mitjana": r1(wp(demo_sec, "Edad media de la población")[0]),
            "pct_menors_18": r1(wp(demo_sec, "Porcentaje de población menor de 18 años")[0]),
            "pct_65_mes": r1(wp(demo_sec, "Porcentaje de población de 65 y más años")[0]),
            "mida_mitjana_llar": r1(pob_tot / llars_tot) if llars_tot else None,
            "pct_llars_unipersonals": r1(wl(demo_sec, "Porcentaje de hogares unipersonales")[0]),
            "pct_poblacio_espanyola": r1(wp(demo_sec, "Porcentaje de población española")[0]),
            "poblacio_adrh_2023": r0(pob_tot) if pob_tot else None,
            "n_seccions": len(secs),
            "n_seccions_amb_renda": wp(renda_sec, "Renta neta media por persona")[1],
        }
        out_barris.append(rec)

    # ------------------------------------------------------------------ meta
    def emex_any(fid):
        return (emex_meta.get(fid) or {}).get("any")

    URL_ADRH = ("https://www.ine.es/dyngs/INEbase/es/operacion.htm"
                "?c=Estadistica_C&cid=1254736177088&idp=1254735976608")
    URL_RENDA = INE_CSV % INE_TAULES["renda"]
    URL_DEMO = INE_CSV % INE_TAULES["demo"]
    URL_GINI = INE_CSV % INE_TAULES["gini"]

    def f_ine(camp, nom, url, nota):
        return {"camp": camp, "nom": nom, "font": "INE, Atlas de distribución de renta de los hogares (ADRH)",
                "url": url, "any": 2023, "nota": nota}

    def f_emex(camp, nom, fid, n_pub, nota):
        return {"camp": camp, "nom": nom, "font": "Idescat, API EMEX (indicador %s)" % fid,
                "url": "https://api.idescat.cat/emex/v1/dades.json?i=%s&tipus=mun&lang=ca" % fid,
                "any": emex_any(fid), "publicacio": n_pub, "nota": nota}

    fonts = [
        f_ine("renda_llar_eur", "Renda neta mitjana per llar (€)", URL_RENDA,
              "Fila de municipi de la taula INE 30896, indicador «Renta neta media por hogar»."),
        f_ine("renda_persona_eur", "Renda neta mitjana per persona (€)", URL_RENDA,
              "Fila de municipi de la taula INE 30896, indicador «Renta neta media por persona»."),
        f_ine("renda_bruta_llar_eur", "Renda bruta mitjana per llar (€)", URL_RENDA,
              "Renda abans d'impostos i cotitzacions."),
        f_ine("renda_bruta_persona_eur", "Renda bruta mitjana per persona (€)", URL_RENDA,
              "Renda abans d'impostos i cotitzacions."),
        f_ine("renda_uc_mitjana_eur", "Renda mitjana per unitat de consum (€)", URL_RENDA,
              "Corregeix la mida i composició de la llar (escala OCDE modificada). "
              "És la xifra comparable entre municipis amb llars de mida diferent."),
        f_ine("renda_uc_mediana_eur", "Renda mediana per unitat de consum (€)", URL_RENDA,
              "L'INE la publica arrodonida a trams, de manera que municipis diferents "
              "poden compartir exactament el mateix valor."),
        f_ine("gini", "Índex de Gini (%)", URL_GINI,
              "0 = igualtat perfecta, 100 = desigualtat màxima. Renda per unitat de consum."),
        f_ine("p80_p20", "Distribució de la renda P80/P20", URL_GINI,
              "Quocient entre el percentil 80 i el percentil 20 de la renda per unitat de consum."),
        f_ine("edat_mitjana", "Edat mitjana de la població (anys)", URL_DEMO, ""),
        f_ine("pct_menors_18", "Població menor de 18 anys (%)", URL_DEMO, ""),
        f_ine("pct_65_mes", "Població de 65 anys i més (%)", URL_DEMO, ""),
        f_ine("mida_mitjana_llar", "Mida mitjana de la llar (persones)", URL_DEMO, ""),
        f_ine("pct_llars_unipersonals", "Llars unipersonals (%)", URL_DEMO, ""),
        f_ine("pct_poblacio_espanyola", "Població de nacionalitat espanyola (%)", URL_DEMO, ""),
        f_ine("poblacio_adrh_2023", "Població segons l'ADRH", URL_DEMO,
              "Població de referència del propi Atles (2023). No substitueix el camp "
              "`poblacio` de municipis.json (padró 2025); serveix per ponderar i per contrastar."),
        f_emex("rfdb_habitant_eur", "Renda familiar disponible bruta per habitant (€)", "f7",
               "https://www.idescat.cat/pub/?id=rfdbc",
               "Macromagnitud de comptabilitat regional d'Idescat; NO és comparable amb la "
               "renda de l'ADRH (concepte i metodologia diferents). Útil com a segona lectura."),
        f_emex("ist", "Índex socioeconòmic territorial (Catalunya=100)", "f385",
               "https://www.idescat.cat/pub/?id=ist",
               "Índex sintètic d'Idescat que combina renda, nivell educatiu, ocupació i "
               "categoria professional. >100 = per damunt de la mitjana catalana."),
        {"camp": "atur_taxa_pct", "nom": "Taxa d'atur (%)",
         "font": "Idescat, API EMEX (indicadors f222 i f223); font primària Cens de població anual de l'INE",
         "url": "https://api.idescat.cat/emex/v1/dades.json?i=f222,f223&tipus=mun&lang=ca",
         "any": emex_any("f222"),
         "publicacio": "https://www.idescat.cat/pub/?id=censph",
         "nota": "CALCULAT: població desocupada (f222) / població activa (f223) × 100. "
                 "Numerador i denominador són xifres publicades d'Idescat del mateix any "
                 "(%s) i la mateixa font. És la taxa d'atur censal, no la taxa d'atur "
                 "registral del SOC ni la de l'EPA." % emex_any("f222")},
        f_emex("atur_registrat", "Atur registrat (mitjana anual, persones)", "f308",
               "https://www.idescat.cat/pub/?id=atureg",
               "Xifra absoluta del Departament d'Empresa i Treball. Mitjana dels dotze mesos."),
        f_emex("pct_educacio_superior", "Població de 15 anys i més amb educació superior (%)", "f389",
               "https://www.idescat.cat/pub/?id=censph", ""),
        f_emex("pct_habitatge_lloguer", "Habitatges familiars principals de lloguer (%)", "f401",
               "https://www.idescat.cat/pub/?id=censph",
               "Cens de població i habitatges 2021: és l'any més recent publicat, més antic "
               "que la resta d'indicadors."),
        f_emex("pct_recollida_selectiva", "Recollida selectiva de residus municipals (%)", "f368",
               "https://www.idescat.cat/pub/?id=resmc",
               "Font primària: Agència de Residus de Catalunya."),
        f_emex("pct_alumnes_mateix_municipi", "Alumnes residents que estudien al mateix municipi (%)", "f381",
               "https://www.idescat.cat/pub/?id=emoesc",
               "Ensenyaments no universitaris. Indica si el municipi té prou places escolars "
               "o si els infants han de desplaçar-se fora."),
        {"camp": "turismes_per_1000_hab", "nom": "Turismes per 1.000 habitants",
         "font": "Idescat, API EMEX (indicadors f19 i f321); font primària DGT",
         "url": "https://api.idescat.cat/emex/v1/dades.json?i=f19,f321&tipus=mun&lang=ca",
         "any": emex_any("f19"),
         "publicacio": "https://www.idescat.cat/pub/?id=parcc",
         "nota": "CALCULAT: turismes (f19, %s) / població (f321, %s) × 1.000. Barreja dos anys "
                 "consecutius perquè Idescat no publica el quocient." % (emex_any("f19"), emex_any("f321"))},
    ]

    meta_mun = {
        "generat": "2026-09-21",
        "ambit": "92 municipis de municipis.json (tots de la província de Barcelona)",
        "clau": "codi_ine (5 dígits)",
        "regla": "Cap valor és inventat, estimat ni interpolat. El que no es publica és null.",
        "operacio_ine": {
            "nom": "Atlas de distribución de renta de los hogares (ADRH)",
            "codi": "ADRH", "IOE": "30325",
            "url": URL_ADRH,
            "api": "https://servicios.ine.es/wstempus/js/ES/TABLAS_OPERACION/ADRH",
            "taules_usades": {
                "30896": "Indicadores de renta media y mediana — província de Barcelona",
                "30904": "Indicadores demográficos — província de Barcelona",
                "37686": "Índice de Gini y Distribución de la renta P80/P20 — província de Barcelona",
            },
            "any": 2023,
            "nota": "2023 és l'últim any publicat (sèrie 2015-2023).",
        },
        "cobertura": {k: "%d/92" % v for k, v in sorted(cobertura.items())},
        "fonts": fonts,
    }

    meta_barris = {
        "generat": "2026-09-21",
        "ambit": "73 barris de Barcelona (municipi 08019)",
        "clau": "codi_barri (2 dígits, '01'..'73')",
        "regla": "Cap valor és inventat, estimat ni interpolat.",
        "metode": (
            "L'INE no publica dades per barri: publica per secció censal. Els 73 barris de "
            "Barcelona són unions de seccions censals senceres, de manera que s'han agregat "
            "les 1.068 seccions del municipi 08019 de l'ADRH 2023 amb la correspondència "
            "secció->barri de l'Open Data BCN. Les mitjanes per persona i l'edat mitjana "
            "s'agreguen ponderant per la població de cada secció (publicada a la mateixa "
            "taula 30904 de l'ADRH, any 2023): el resultat és la mitjana exacta del barri "
            "llevat de l'arrodoniment amb què l'INE publica cada secció. Les mitjanes per "
            "llar s'agreguen ponderant pel nombre de llars de cada secció, que es dedueix de "
            "població / mida mitjana de la llar (totes dues xifres publicades per l'INE, "
            "però la mida mitjana ve arrodonida a un decimal: veure limitacions)."
        ),
        "no_agregables": (
            "gini i p80_p20 es deixen a null a tots els barris: la desigualtat d'una unió de "
            "seccions NO és la mitjana de les desigualtats de cada secció, i l'INE no publica "
            "el Gini per barri. Publicar-hi una mitjana seria inventar-se el valor."
        ),
        "fonts": [f for f in fonts if f["camp"] in {
            "renda_llar_eur", "renda_persona_eur", "renda_bruta_llar_eur",
            "renda_bruta_persona_eur", "edat_mitjana", "pct_menors_18", "pct_65_mes",
            "pct_llars_unipersonals", "pct_poblacio_espanyola", "poblacio_adrh_2023",
            "mida_mitjana_llar"}]
        + [{"camp": "codi_barri", "nom": "Correspondència secció censal -> barri",
            "font": "Open Data BCN (Ajuntament de Barcelona), dataset "
                    "renda-tributaria-per-persona-atlas-distribucio, recurs "
                    "2023_renda_neta_mitjana_per_persona.csv",
            "url": BCN_MAPA_URL, "any": 2023,
            "nota": "Columnes Codi_Districte, Codi_Barri, Nom_Barri, Seccio_Censal. "
                    "Els imports d'aquest fitxer s'han contrastat un a un amb els de l'INE: "
                    "%d discrepàncies de %d seccions." % (discrepants, len(valors_control))}],
    }

    with open(os.path.join(HERE, "indicadors.json"), "w", encoding="utf-8") as fh:
        json.dump({"meta": meta_mun, "municipis": out_mun}, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    with open(os.path.join(HERE, "indicadors-barris.json"), "w", encoding="utf-8") as fh:
        json.dump({"meta": meta_barris, "barris": out_barris}, fh, ensure_ascii=False, indent=1)
        fh.write("\n")

    sys.stderr.write("\nOK  indicadors.json (%d municipis), indicadors-barris.json (%d barris)\n"
                     % (len(out_mun), len(out_barris)))
    for k, v in sorted(cobertura.items()):
        sys.stderr.write("    %-30s %3d/92\n" % (k, v))


if __name__ == "__main__":
    main()
