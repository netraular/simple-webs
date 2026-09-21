#!/usr/bin/env python3
"""Genera bcn-barris-poblacio.json: població dels 73 barris de Barcelona.

Font: Open Data BCN, dataset `pad_mdbas_sexe` ("Població per sexe"),
Padró Municipal d'Habitants a 1 de gener, desagregat per secció censal i sexe.

El CSV ve per (districte, barri, AEB, secció censal, sexe) sense cap fila de
total, així que n'hi ha prou amb sumar totes les files agrupant per barri.

Ús: python3 build_poblacio.py
"""

import csv
import io
import json
import os
import sys
import urllib.request

ANY = 2026
RESOURCE_URL = (
    "https://opendata-ajuntament.barcelona.cat/data/dataset/"
    "16c11ddf-a783-4b64-aa68-3dc83dc70379/resource/"
    "3057b89d-9713-4001-8f07-a6fb122a152b/download"
)

HERE = os.path.dirname(os.path.abspath(__file__))
GEOJSON = os.path.join(HERE, "bcn-barris.geojson")
OUT = os.path.join(HERE, "bcn-barris-poblacio.json")


def fetch_csv(url):
    req = urllib.request.Request(url, headers={"User-Agent": "curl/8"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read().decode("utf-8")


def main():
    raw = fetch_csv(RESOURCE_URL)
    rows = list(csv.DictReader(io.StringIO(raw)))
    if not rows:
        sys.exit("CSV buit")

    dates = {r["Data_Referencia"] for r in rows}
    if dates != {"%d-01-01" % ANY}:
        sys.exit("Data de referència inesperada: %s" % dates)

    # Suma per barri. Cap fila de total al CSV -> suma directa, sense doble compte.
    total_barri = {}
    noms = {}
    for r in rows:
        codi = "%02d" % int(r["Codi_Barri"])
        valor = r["Valor"].strip()
        if not valor.lstrip("-").isdigit():
            sys.exit("Valor no numèric al CSV: %r" % r)
        total_barri[codi] = total_barri.get(codi, 0) + int(valor)
        noms[codi] = r["Nom_Barri"].strip()

    # Els codis i noms canònics surten del geojson amb què es creuarà.
    geo = json.load(open(GEOJSON, encoding="utf-8"))
    geo_barris = [
        (f["properties"]["codi_barri"], f["properties"]["nom_barri"])
        for f in geo["features"]
    ]
    geo_codis = {c for c, _ in geo_barris}

    nomes_csv = sorted(set(total_barri) - geo_codis)
    nomes_geo = sorted(geo_codis - set(total_barri))
    if nomes_csv or nomes_geo:
        print("ATENCIÓ  codis només al CSV: %s" % nomes_csv, file=sys.stderr)
        print("ATENCIÓ  codis només al geojson: %s" % nomes_geo, file=sys.stderr)

    out = []
    for codi, nom in sorted(geo_barris, key=lambda x: int(x[0])):
        out.append(
            {
                "codi_barri": codi,
                "nom_barri": nom,
                "poblacio": total_barri.get(codi),  # None -> null si manca
                "any": ANY,
            }
        )

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    amb_dada = [o for o in out if o["poblacio"] is not None]
    total = sum(o["poblacio"] for o in amb_dada)
    print("barris: %d (%d amb dada)" % (len(out), len(amb_dada)))
    print("total Barcelona %d: %d" % (ANY, total))
    top = max(amb_dada, key=lambda o: o["poblacio"])
    bot = min(amb_dada, key=lambda o: o["poblacio"])
    print("més poblat:  %s (%s) %d" % (top["nom_barri"], top["codi_barri"], top["poblacio"]))
    print("menys poblat: %s (%s) %d" % (bot["nom_barri"], bot["codi_barri"], bot["poblacio"]))
    if not 1_600_000 <= total <= 1_800_000:
        sys.exit("Total fora de rang plausible")


if __name__ == "__main__":
    main()
