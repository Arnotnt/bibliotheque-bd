#!/usr/bin/env python3
"""Choisit une couverture par série sur Open Library et l'écrit dans data/couvertures.json (US-12).

Usage : python3 scripts/couvertures.py
Pour chaque série, essaie les EAN de ses albums par ordre de tome et garde le premier
qui a une image sur Open Library. Le site n'affiche que ces EAN vérifiés : aucune
image cassée ni erreur 404 dans la console. À relancer après l'ajout d'albums.
Python standard uniquement, sans dépendance ni clé d'API.
"""

import json
import re
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
DATA = RACINE / "data"
URL = "https://covers.openlibrary.org/b/isbn/{ean}-M.jpg?default=false"


def a_une_couverture(ean):
    requete = urllib.request.Request(URL.format(ean=ean), method="HEAD",
                                     headers={"User-Agent": "bibliotheque-bd-couvertures"})
    try:
        with urllib.request.urlopen(requete, timeout=20) as reponse:
            return reponse.status == 200
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        raise


def premiere_couverture(eans):
    for ean in eans:
        if a_une_couverture(ean):
            return ean
    return None


def main():
    series = json.loads((DATA / "series.json").read_text(encoding="utf-8"))
    albums = json.loads((DATA / "albums.json").read_text(encoding="utf-8"))

    eans_par_serie = {}
    for a in sorted(albums, key=lambda a: a["tome"]):
        if isinstance(a.get("ean"), str) and re.fullmatch(r"\d{13}", a["ean"]):
            eans_par_serie.setdefault(a["serie_id"], []).append(a["ean"])

    ids = [s["id"] for s in series]
    try:
        with ThreadPoolExecutor(max_workers=6) as pool:
            trouves = list(pool.map(lambda i: premiere_couverture(eans_par_serie.get(i, [])), ids))
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"❌ Open Library injoignable ({e}) : data/couvertures.json n'est pas modifié.")
        return 1

    couvertures = {i: ean for i, ean in zip(ids, trouves) if ean}
    chemin = DATA / "couvertures.json"
    chemin.write_text(json.dumps(couvertures, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    sans = [i for i, ean in zip(ids, trouves) if not ean]
    print(f"✅ {len(couvertures)} séries sur {len(ids)} ont une couverture → {chemin.relative_to(RACINE)}")
    if sans:
        print("Sans couverture (visuel par défaut) : " + ", ".join(sans))
    return 0


if __name__ == "__main__":
    sys.exit(main())
