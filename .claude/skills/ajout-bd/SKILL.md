---
name: ajout-bd
description: Ajouter des BD à la bibliothèque (achetées, lues, lues chez un ami), série comprise si elle n'existe pas, avec EAN, titres, couverture, note et avis. À utiliser dès qu'Arnaud dit « j'ai acheté… », « j'ai lu… », « ajoute… » à propos d'albums de BD ou de manga.
---

# Ajout de BD (OPT-03)

Gestion courante : **pas d'issue**. Suivre les étapes dans l'ordre, sans en sauter.
Les règles de données sont dans `CLAUDE.md` (Modèle de données) ; cette skill ne les répète pas, elle les applique.

## 1. Série
- Chercher dans `data/series.json` un nom proche (sans accents, sans article, « 5 » / « Cinq »…). Si elle existe : passer à l'étape 2.
- Sinon la créer :
  - `id` en minuscules, sans accents, avec tirets ; `titre` tel qu'édité.
  - `auteurs` selon DATA-01 (scénariste puis dessinateur, sans coloristes), `editeur`, `categorie` (`BD`, `Manga`, `Comics`).
  - `genres` : 1 à 3 dans la liste fermée de DATA-02.
  - `tomes_parus` et `statut` d'après une source (éditeur, Bédéthèque, libraire), citée dans le message de commit.
  - `suivie: false`, `note: null`, `avis: null` par défaut (sauf indication d'Arnaud).

## 2. Albums
- Un objet par tome dans `data/albums.json`, ou mise à jour s'il existe déjà.
- `possede` / `lu` d'après la demande (« chez un ami » → `possede: false, lu: true`).
- `date_ajout` : date du jour pour un nouvel album ; ne pas la changer sur un album existant.
- `titre` : titre de l'album (pas celui de la série), `null` seulement pour un one-shot sans sous-titre.

## 3. EAN (ISBN-13 de l'édition standard)
Pas d'intégrale, d'édition noir et blanc, de tirage limité, d'édition Fnac ou France Loisirs.
Sources, dans cet ordre :
1. L'EAN donné par Arnaud (photo du code-barres ou saisie).
2. Le catalogue de la BnF, API SRU sans clé, en cherchant par titre de série + nom d'un auteur :
   ```bash
   curl -s 'https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&recordSchema=dublincore&maximumRecords=100&query=bib.title%20all%20%22<serie>%22%20and%20bib.author%20all%20%22<auteur>%22'
   ```
   Chaque notice donne le titre de l'album, l'année et `ISBN …`. La BnF ne donne **pas** le numéro de tome : le confirmer ailleurs.
3. Libraires et sites qui donnent tome + titre + EAN : Ludum, la fiche éditeur, Fidelio (`ssr.fidelio.ca/fr/Catalog/Details/<ean>`), CDI/Side (`…cdi.ch/en/<ean>-<serie>-t<nn>`). Bédéthèque refuse souvent les accès automatiques (403) : s'en servir via la recherche web.
- Vérifier la cohérence : titres et dates croissants avec les tomes, EAN du même éditeur.
- `ean: null` seulement si rien n'est trouvé ; le dire dans le compte rendu.

## 4. Couverture
1. Lancer `python3 scripts/couvertures.py` (Open Library via les EAN). Ne pas le relancer en boucle (limite d'environ 100 requêtes par 5 minutes).
2. Si la série figure encore dans « Sans couverture », **chercher soi-même et ajouter directement**, sans demander avant (décision du PO, OPT-03) :
   - Open Library, autre édition : `https://covers.openlibrary.org/b/id/<n°>-M.jpg` ;
   - sinon l'image du tome 1 sur le site de l'éditeur ou d'un libraire (`og:image` de la fiche), **en taille moyenne** (viser moins de 300 ko : chercher une variante `-medium`, `M300x400`, `large_default`…).
   - Vérifier que l'URL répond `200 image/…` (`curl -s -o /dev/null -w "%{http_code} %{content_type} %{size_download}" <url>`).
   - L'ajouter dans `data/couvertures_manuelles.json` (clés triées), puis relancer `python3 scripts/couvertures.py`.
   - Jamais de scraping de la Fnac ni de Google Books (US-15).
3. Lister dans le commit les couvertures choisies par Claude, pour qu'Arnaud puisse les corriger.

## 5. Note et avis (si Arnaud en donne)
- `note` : entier de 0 à 10, au sens de DATA-03 (« dans son genre »).
- `avis` : le texte donné, avec une majuscule et un point final, **sans le réécrire**.
- Si l'avis suggère un `regard` (classique, jeunesse, hors goût, non suivi) : le proposer et ne l'ajouter qu'après accord.
- Si la note est **≥ 8** et que la série n'est pas déjà coup de cœur : demander à Arnaud « Coup de cœur ? » (US-26). N'ajouter `"coup_de_coeur": true` qu'après un oui ; sinon ne rien ajouter (jamais `false`).

## 6. Clôture
1. Montrer à Arnaud ce qui change : séries créées, albums, EAN trouvés et manquants, couvertures choisies.
2. `python3 scripts/verifier_donnees.py` : 0 erreur.
3. Commiter `data/` avec un message clair (« Ajout Blacksad T8, lu, possédé »), qui cite les sources de `tomes_parus`, des EAN et des couvertures choisies à la main.
4. Si l'on n'est pas sur `main` ou si la branche est protégée : branche `data-…` et PR, comme d'habitude.
