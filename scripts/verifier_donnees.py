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
STATUTS_AVIS_RECO = {"à découvrir", "intéressé", "rejeté"}
# Liste fermée des genres (DATA-02), à garder identique à CLAUDE.md.
GENRES = {
    "aventure", "fantasy", "science-fiction", "polar", "thriller", "historique",
    "western", "humour", "jeunesse", "espionnage", "fantastique", "animalier",
    "guerre", "aviation", "shōnen", "sport", "documentaire",
}
# Valeurs du champ facultatif `regard` (DATA-03) : la série ne guide pas les recos.
REGARDS = {"classique", "jeunesse", "hors goût", "non suivi"}

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


FORMAT_DATE_ANNONCE = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")


def fin_de_periode(date):
    """Dernier jour couvert par une date partielle : « 2026 » → 31/12/2026, « 2026-03 » → 31/03/2026."""
    morceaux = [int(x) for x in date.split("-")]
    if len(morceaux) == 3:
        return datetime.date(*morceaux)
    if len(morceaux) == 2:
        annee, mois = morceaux
        return datetime.date(annee + mois // 12, mois % 12 + 1, 1) - datetime.timedelta(days=1)
    return datetime.date(morceaux[0], 12, 31)


def verifier_a_paraitre(f, libelle, s):
    """Tomes annoncés (US-13) : liste de {tome, titre, date, a_verifier, sources}."""
    annonces = s["a_paraitre"]
    if not isinstance(annonces, list) or not annonces:
        erreur(f, f"{libelle} : a_paraitre doit être une liste non vide (ou absent)")
        return
    tp = s.get("tomes_parus")
    vus = set()
    for a in annonces:
        if not isinstance(a, dict):
            erreur(f, f"{libelle} : chaque entrée de a_paraitre doit être un objet")
            continue
        tome = a.get("tome")
        lib = f"{libelle} T{tome} à paraître"
        if not (est_entier(tome) and tome >= 1):
            erreur(f, f"{lib} : tome doit être un entier ≥ 1")
        elif tome in vus:
            erreur(f, f"{lib} : annoncé deux fois")
        elif est_entier(tp) and tome <= tp:
            erreur(f, f"{lib} : déjà compté dans tomes_parus ({tp}), à retirer de a_paraitre")
        vus.add(tome)
        if a.get("titre") is not None and not (isinstance(a["titre"], str) and a["titre"].strip()):
            erreur(f, f"{lib} : titre doit être un texte ou null")
        date = a.get("date")
        if date is not None:
            if not (isinstance(date, str) and FORMAT_DATE_ANNONCE.match(date)):
                erreur(f, f"{lib} : date « {date} » invalide (AAAA, AAAA-MM, AAAA-MM-JJ ou null)")
            else:
                try:
                    if fin_de_periode(date) < datetime.date.today():
                        avertir(f, f"{lib} : date {date} dépassée, à vérifier lors de la prochaine veille")
                except ValueError:
                    erreur(f, f"{lib} : date « {date} » invalide")
        if not isinstance(a.get("a_verifier"), bool):
            erreur(f, f"{lib} : a_verifier doit valoir true ou false")
        if not est_liste_de_textes(a.get("sources")) or not a["sources"]:
            erreur(f, f"{lib} : au moins une source est obligatoire")


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
            erreur(f, f"{libelle} : au moins un auteur est obligatoire")
        genres = s.get("genres", None)
        if not est_liste_de_textes(genres):
            erreur(f, f"{libelle} : genres doit être une liste de textes")
        else:
            if not 1 <= len(genres) <= 3:
                erreur(f, f"{libelle} : {len(genres)} genre(s), il en faut de 1 à 3")
            if len(set(genres)) != len(genres):
                erreur(f, f"{libelle} : genre en double")
            for g in genres:
                if g not in GENRES:
                    erreur(f, f"{libelle} : genre « {g} » hors de la liste autorisée (voir CLAUDE.md)")
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
        if "regard" in s and s["regard"] not in REGARDS:
            erreur(f, f"{libelle} : regard « {s['regard']} » non autorisé ({', '.join(sorted(REGARDS))}), "
                      "ou champ absent si la série reflète mes goûts actuels")
        if "a_paraitre" in s:
            verifier_a_paraitre(f, libelle, s)
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
        if r.get("statut") not in STATUTS_AVIS_RECO:
            erreur(f, f"{libelle} : statut « {r.get('statut')} » non autorisé ({', '.join(sorted(STATUTS_AVIS_RECO))})")
        liees = r.get("series_liees")
        if not est_liste_de_textes(liees):
            erreur(f, f"{libelle} : series_liees doit être une liste d'id")
        else:
            for sid in liees:
                if sid not in series_par_id:
                    erreur(f, f"{libelle} : series_liees « {sid} » absent de series.json")
                elif "regard" in series_par_id[sid]:
                    erreur(f, f"{libelle} : series_liees « {sid} » a un regard "
                              f"« {series_par_id[sid]['regard']} », elle ne peut pas justifier une reco")
        date = r.get("date_reco")
        try:
            datetime.date.fromisoformat(date)
        except (TypeError, ValueError):
            erreur(f, f"{libelle} : date_reco « {date} » invalide (AAAA-MM-JJ)")


def verifier_fichier_couvertures(f, series_par_id):
    """{ serie_id: URL https d'une image } : couvertures.json (généré) ou couvertures_manuelles.json."""
    chemin = DATA / f
    if not chemin.exists():
        return
    try:
        couvertures = json.loads(chemin.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        erreur(f, f"JSON invalide (ligne {e.lineno}, colonne {e.colno}) : {e.msg}")
        return
    if not isinstance(couvertures, dict):
        erreur(f, "le contenu doit être un objet { serie_id: url }")
        return
    for sid, url in couvertures.items():
        if sid not in series_par_id:
            erreur(f, f"« {sid} » absent de series.json")
        if not isinstance(url, str) or not re.fullmatch(r"https://\S+", url):
            erreur(f, f"« {sid} » : URL « {url} » invalide (https:// attendu)")


def verifier_couvertures(series_par_id, albums):
    """US-12, US-15 : surcharges manuelles et fichier généré, cohérents entre eux."""
    verifier_fichier_couvertures("couvertures_manuelles.json", series_par_id)
    verifier_fichier_couvertures("couvertures.json", series_par_id)
    try:
        manuelles = json.loads((DATA / "couvertures_manuelles.json").read_text(encoding="utf-8"))
        generees = json.loads((DATA / "couvertures.json").read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return
    if isinstance(manuelles, dict) and isinstance(generees, dict):
        for sid, url in manuelles.items():
            if generees.get(sid) != url:
                erreur("couvertures.json", f"« {sid} » : surcharge manuelle non reprise (relancer scripts/couvertures.py)")
    eans = {(a.get("serie_id"), a.get("ean")) for a in albums if isinstance(a, dict)}
    if isinstance(generees, dict):
        for sid, url in generees.items():
            m = re.fullmatch(r"https://covers\.openlibrary\.org/b/isbn/(\d{13})-M\.jpg", str(url))
            if m and (sid, m.group(1)) not in eans:
                erreur("couvertures.json", f"« {sid} » : EAN {m.group(1)} ne correspond à aucun album de la série (relancer scripts/couvertures.py)")


def main():
    series = charger("series.json")
    albums = charger("albums.json")
    recos = charger("reco.json")

    series_par_id = verifier_series(series) if series is not None else {}
    if albums is not None and series is not None:
        verifier_albums(albums, series_par_id)
    if recos is not None and series is not None:
        verifier_reco(recos, series_par_id)
    if albums is not None and series is not None:
        verifier_couvertures(series_par_id, albums)

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
