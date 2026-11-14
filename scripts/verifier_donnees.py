#!/usr/bin/env python3
"""Vérifie la validité et la cohérence des fichiers data/*.json (OPT-01).

Usage : python3 scripts/verifier_donnees.py
Code de sortie 0 si tout est bon, 1 s'il y a au moins une erreur.
Les avertissements sont affichés mais ne font pas échouer le script.
Python standard uniquement, sans dépendance.
"""

import datetime
import json
import re
import sys
import unicodedata
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
DATA = RACINE / "data"

FORMAT_ID = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
STATUTS_SERIE = {"en cours", "terminée", "abandonnée par moi"}
STATUTS_RECO = {"en cours", "terminée"}

erreurs = []
avertissements = []


def erreur(fichier, message):
    erreurs.append(f"{fichier} : {message}")


def avertir(fichier, message):
    avertissements.append(f"{fichier} : {message}")


def normaliser(texte):
    """Minuscules, sans accents ni ponctuation : pour comparer des titres."""
    texte = unicodedata.normalize("NFD", texte or "")
    texte = "".join(c for c in texte if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", texte.lower()).strip()


def est_entier(valeur):
    return isinstance(valeur, int) and not isinstance(valeur, bool)


def est_liste_de_textes(valeur):
    return isinstance(valeur, list) and all(isinstance(v, str) and v.strip() for v in valeur)


def charger(nom):
    chemin = DATA / nom
    try:
        with open(chemin, encoding="utf-8") as f:
            contenu = json.load(f)
    except FileNotFoundError:
        erreur(nom, "fichier introuvable")
        return None
    except json.JSONDecodeError as e:
        erreur(nom, f"JSON invalide (ligne {e.lineno}, colonne {e.colno}) : {e.msg}")
        return None
    if not isinstance(contenu, list):
        erreur(nom, "le contenu doit être une liste")
        return None
    return contenu


def verifier_id(fichier, ident, deja_vus, libelle):
    if not isinstance(ident, str) or not FORMAT_ID.match(ident):
        erreur(fichier, f"{libelle} : id « {ident} » invalide (minuscules, sans accents, tirets)")
    elif ident in deja_vus:
        erreur(fichier, f"{libelle} : id « {ident} » en double")
    deja_vus.add(ident)


def verifier_series(series):
    f = "series.json"
    ids = set()
    for i, s in enumerate(series):
        if not isinstance(s, dict):
            erreur(f, f"entrée n°{i + 1} : doit être un objet")
            continue
        libelle = f"série « {s.get('id', f'n°{i + 1}')} »"
        verifier_id(f, s.get("id"), ids, libelle)
        if not isinstance(s.get("titre"), str) or not s["titre"].strip():
            erreur(f, f"{libelle} : titre manquant")
        if not est_liste_de_textes(s.get("auteurs", None)):
            erreur(f, f"{libelle} : auteurs doit être une liste de noms")
        elif not s["auteurs"]:
            avertir(f, f"{libelle} : aucun auteur")
        if not est_liste_de_textes(s.get("genres", None)):
            erreur(f, f"{libelle} : genres doit être une liste de textes")
        if s.get("statut") not in STATUTS_SERIE:
            erreur(f, f"{libelle} : statut « {s.get('statut')} » non autorisé ({', '.join(sorted(STATUTS_SERIE))})")
        tp = s.get("tomes_parus")
        if not (est_entier(tp) and tp >= 1):
            erreur(f, f"{libelle} : tomes_parus doit être un entier ≥ 1")
        if not isinstance(s.get("suivie"), bool):
            erreur(f, f"{libelle} : suivie doit valoir true ou false")
        note = s.get("note")
        if note is not None and not (est_entier(note) and 0 <= note <= 10):
            erreur(f, f"{libelle} : note « {note} » invalide (entier de 0 à 10, ou null)")
        if s.get("suivie") is True and s.get("statut") != "en cours":
            avertir(f, f"{libelle} : suivie alors que la série est « {s.get('statut')} »")
    return {s["id"]: s for s in series if isinstance(s, dict) and isinstance(s.get("id"), str)}


def verifier_albums(albums, series_par_id):
    f = "albums.json"
    couples = set()
    max_tome = {}
    for i, a in enumerate(albums):
        if not isinstance(a, dict):
            erreur(f, f"entrée n°{i + 1} : doit être un objet")
            continue
        sid, tome = a.get("serie_id"), a.get("tome")
        libelle = f"album {sid} T{tome}"
        if sid not in series_par_id:
            erreur(f, f"{libelle} : serie_id « {sid} » absent de series.json")
        if not (est_entier(tome) and tome >= 1):
            erreur(f, f"{libelle} : tome doit être un entier ≥ 1")
        elif (sid, tome) in couples:
            erreur(f, f"{libelle} : en double")
        else:
            couples.add((sid, tome))
            max_tome[sid] = max(max_tome.get(sid, 0), tome)
        for champ in ("possede", "lu"):
            if not isinstance(a.get(champ), bool):
                erreur(f, f"{libelle} : {champ} doit valoir true ou false")
        if a.get("possede") is False and a.get("lu") is False:
            avertir(f, f"{libelle} : ni possédé ni lu, l'entrée est inutile")
        ean = a.get("ean")
        if ean is not None and not (isinstance(ean, str) and re.fullmatch(r"\d{10}|\d{13}", ean)):
            erreur(f, f"{libelle} : ean « {ean} » invalide (10 ou 13 chiffres, ou null)")
        date = a.get("date_ajout")
        if date is not None:
            try:
                datetime.date.fromisoformat(date)
            except (TypeError, ValueError):
                erreur(f, f"{libelle} : date_ajout « {date} » invalide (AAAA-MM-JJ ou null)")
    for sid, tome in max_tome.items():
        tp = series_par_id[sid].get("tomes_parus") if sid in series_par_id else None
        if est_entier(tp) and tome > tp:
            avertir(f, f"série « {sid} » : tome {tome} présent alors que tomes_parus vaut {tp}")


def verifier_reco(recos, series_par_id):
    f = "reco.json"
    ids = set()
    titres_series = {normaliser(s.get("titre")): sid for sid, s in series_par_id.items()}
    for i, r in enumerate(recos):
        if not isinstance(r, dict):
            erreur(f, f"entrée n°{i + 1} : doit être un objet")
            continue
        rid = r.get("id")
        libelle = f"reco « {rid} »"
        verifier_id(f, rid, ids, libelle)
        if rid in series_par_id:
            erreur(f, f"{libelle} : déjà dans series.json (lue ou possédée), à retirer des recos")
        elif normaliser(r.get("titre")) in titres_series:
            erreur(f, f"{libelle} : même titre que la série « {titres_series[normaliser(r.get('titre'))]} » de series.json")
        if not isinstance(r.get("pourquoi"), str) or not r["pourquoi"].strip():
            erreur(f, f"{libelle} : justification (pourquoi) manquante")
        if not est_liste_de_textes(r.get("sources")) or not r["sources"]:
            erreur(f, f"{libelle} : au moins une source est obligatoire")
        if r.get("statut_serie") not in STATUTS_RECO:
            erreur(f, f"{libelle} : statut_serie « {r.get('statut_serie')} » non autorisé")
        liees = r.get("series_liees")
        if not est_liste_de_textes(liees):
            erreur(f, f"{libelle} : series_liees doit être une liste d'id")
        else:
            for sid in liees:
                if sid not in series_par_id:
                    erreur(f, f"{libelle} : series_liees « {sid} » absent de series.json")
        date = r.get("date_reco")
        try:
            datetime.date.fromisoformat(date)
        except (TypeError, ValueError):
            erreur(f, f"{libelle} : date_reco « {date} » invalide (AAAA-MM-JJ)")


def main():
    series = charger("series.json")
    albums = charger("albums.json")
    recos = charger("reco.json")

    series_par_id = verifier_series(series) if series is not None else {}
    if albums is not None and series is not None:
        verifier_albums(albums, series_par_id)
    if recos is not None and series is not None:
        verifier_reco(recos, series_par_id)

    for a in avertissements:
        print(f"⚠️  {a}")
    for e in erreurs:
        print(f"❌ {e}")
    resume = (f"{len(series or [])} séries, {len(albums or [])} albums, {len(recos or [])} recos — "
              f"{len(erreurs)} erreur(s), {len(avertissements)} avertissement(s)")
    print(("✅ " if not erreurs else "") + resume)
    return 1 if erreurs else 0


if __name__ == "__main__":
    sys.exit(main())
