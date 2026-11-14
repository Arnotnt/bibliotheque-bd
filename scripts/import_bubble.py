#!/usr/bin/env python3
"""Import unique de l'export Bubble (US-01).

Lit import/export-bubble.csv et écrit data/series.json et data/albums.json
selon le modèle décrit dans CLAUDE.md. Bibliothèque standard uniquement.

Relançable : la sortie est triée et déterministe, deux exécutions donnent
des fichiers identiques. Attention, il écrase data/*.json : à ne relancer
qu'avant les premières modifications manuelles de la collection.

Usage : python3 scripts/import_bubble.py
"""

import csv
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SOURCE = RACINE / "import" / "export-bubble.csv"
SORTIE = RACINE / "data"

COCHE = "✓"

# Numéros de tome non entiers dans l'export, corrigés à la main.
# XIII « 13.1 » = The XIII Mystery - L'enquête, qui est bien le tome 13.
TOMES_CORRIGES = {("XIII", "13.1"): 13}

# Doublons attendus (même série, même tome) : on garde la première ligne.
# Saint Seiya : Time Odyssey T3 existe en collector (1re ligne, avec l'avis) et en standard.
DOUBLONS_ATTENDUS = {("saint-seiya-time-odyssey", 3)}

CATEGORIES = {"BD": "BD", "Mangas": "Manga"}


def slug(texte):
    """id de série : minuscules, sans accents, mots séparés par des tirets."""
    texte = unicodedata.normalize("NFKD", texte)
    texte = "".join(c for c in texte if not unicodedata.combining(c))
    texte = re.sub(r"[^a-z0-9]+", "-", texte.lower())
    return texte.strip("-")


def ou_null(texte):
    texte = (texte or "").strip()
    return texte or None


def plus_frequent(valeurs):
    """Valeur la plus fréquente ; à égalité, la première rencontrée."""
    valeurs = [v for v in valeurs if v]
    if not valeurs:
        return None
    compte = Counter(valeurs)
    return max(valeurs, key=lambda v: (compte[v], -valeurs.index(v)))


def note_sur_10(texte):
    texte = (texte or "").strip()
    return int(texte) * 2 if texte else None


def numero_tome(serie, texte):
    texte = texte.strip()
    if not texte:
        return None  # one-shot : numéroté 1 plus bas
    if (serie, texte) in TOMES_CORRIGES:
        return TOMES_CORRIGES[(serie, texte)]
    valeur = float(texte)
    if not valeur.is_integer():
        sys.exit(f"Tome non entier non prévu : {serie} « {texte} » (ajouter à TOMES_CORRIGES)")
    return int(valeur)


def lire_csv():
    with SOURCE.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))


def construire(lignes):
    par_serie = defaultdict(list)
    for ligne in lignes:
        par_serie[" ".join(ligne["Titre de la série"].split())].append(ligne)

    series, albums, vus = [], [], set()

    for titre, lignes_serie in par_serie.items():
        serie_id = slug(titre)
        tomes_sans_numero = sum(1 for l in lignes_serie if not l["Tome"].strip())
        one_shot = len(lignes_serie) == 1 and tomes_sans_numero == 1
        if tomes_sans_numero and not one_shot:
            sys.exit(f"Album sans numéro de tome dans une série à plusieurs albums : {titre}")

        for l in lignes_serie:
            tome = numero_tome(titre, l["Tome"]) or 1
            cle = (serie_id, tome)
            if cle in vus:
                if cle not in DOUBLONS_ATTENDUS:
                    sys.exit(f"Doublon non prévu : {titre} tome {tome}")
                continue
            vus.add(cle)
            date = (l["Date d'ajout"] or "").strip()
            albums.append({
                "serie_id": serie_id,
                "tome": tome,
                "titre": ou_null(l["Titre de l'album"]),
                "ean": ou_null(l["EAN"]),
                "possede": l["Dans ma collection"].strip() == COCHE,
                "lu": l["Lu"].strip() == COCHE,
                "date_ajout": date[:10] or None,
            })

        auteurs = [" ".join(a.split()) for l in lignes_serie for a in l["Auteurs"].split(",") if a.strip()]
        compte = Counter(auteurs)
        auteurs_uniques = sorted(dict.fromkeys(auteurs), key=lambda a: (-compte[a], auteurs.index(a)))

        note_serie = next((l["Ma note de la série"] for l in lignes_serie if l["Ma note de la série"].strip()), "")
        note_album = next((l["Ma note de l'album"] for l in lignes_serie if l["Ma note de l'album"].strip()), "")
        avis_serie = next((l["Mon avis de la série"] for l in lignes_serie if l["Mon avis de la série"].strip()), "")
        avis_album = next((l["Mon avis de l'album"] for l in lignes_serie if l["Mon avis de l'album"].strip()), "")

        tomes = [a["tome"] for a in albums if a["serie_id"] == serie_id and a["possede"]]
        statut = "terminée" if one_shot else "en cours"
        categorie = plus_frequent([l["Catégory"].strip() for l in lignes_serie])

        series.append({
            "id": serie_id,
            "titre": titre,
            "auteurs": auteurs_uniques,
            "editeur": plus_frequent([l["Editeur"].strip() for l in lignes_serie]),
            "categorie": CATEGORIES.get(categorie, categorie),
            "genres": [],
            "statut": statut,
            "tomes_parus": max(tomes) if tomes else 0,
            "suivie": statut == "en cours",
            "note": note_sur_10(note_serie) if note_serie.strip() else note_sur_10(note_album),
            "avis": ou_null(avis_serie) or ou_null(avis_album),
        })

    ids = [s["id"] for s in series]
    doublons_id = [i for i, n in Counter(ids).items() if n > 1]
    if doublons_id:
        sys.exit(f"id de série en double : {doublons_id}")

    series.sort(key=lambda s: s["id"])
    albums.sort(key=lambda a: (a["serie_id"], a["tome"]))
    return series, albums


def ecrire(nom, donnees):
    SORTIE.mkdir(exist_ok=True)
    chemin = SORTIE / nom
    chemin.write_text(json.dumps(donnees, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return chemin


def main():
    series, albums = construire(lire_csv())
    ecrire("series.json", series)
    ecrire("albums.json", albums)
    print(f"{len(series)} séries, {len(albums)} albums "
          f"({sum(a['lu'] for a in albums)} lus, "
          f"{sum(s['note'] is not None for s in series)} séries notées)")


if __name__ == "__main__":
    main()
