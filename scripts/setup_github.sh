#!/usr/bin/env bash
# Sprint 0 — crée les labels, les milestones Sprint 1 à 4 et les 12 issues du backlog.
# Relançable : labels mis à jour (--force), milestones et issues déjà présents ignorés.
# Les issues sont créées SANS milestone (posé par le PO au sprint planning).
# L'ajout au Project « Bibliothèque BD » se fait à la main.
#
# Usage : bash scripts/setup_github.sh   (gh installé et authentifié)

set -euo pipefail

REPO="${REPO:-Arnotnt/bibliotheque-bd}"

command -v gh >/dev/null || { echo "gh introuvable" >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "gh non authentifié (gh auth login)" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Labels
# ---------------------------------------------------------------------------
label() { # nom couleur description
  gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null
  echo "  label $1"
}

echo "Labels…"
label "type:us"   1d76db "User story : fonctionnalité ou évolution"
label "type:bug"  1d76db "Comportement incorrect"
label "type:inc"  1d76db "Incohérence code / données / doc"
label "type:opt"  1d76db "Optimisation sans changement fonctionnel"
label "type:data" 1d76db "Correction ponctuelle de data/"

label "epic:socle"      5319e7 "Import, déploiement, fondations"
label "epic:collection" 5319e7 "Consultation de la collection"
label "epic:lecture"    5319e7 "Suivi des lectures"
label "epic:notation"   5319e7 "Notes et avis"
label "epic:veille"     5319e7 "Veille des nouveautés"
label "epic:reco"       5319e7 "Recommandations"

label "prio:must"   b60205 "MoSCoW : indispensable"
label "prio:should" fbca04 "MoSCoW : important"
label "prio:could"  c5def5 "MoSCoW : bonus"

label "pts:1" 0e8a16 "Estimation : 1 point"
label "pts:2" 0e8a16 "Estimation : 2 points"
label "pts:3" 0e8a16 "Estimation : 3 points"
label "pts:5" 0e8a16 "Estimation : 5 points"
label "pts:8" 0e8a16 "Estimation : 8 points"

label "needs-validation" fef2c0 "Décision du PO nécessaire"

# ---------------------------------------------------------------------------
# 2. Milestones
# ---------------------------------------------------------------------------
echo "Milestones…"
existing_ms="$(gh api "repos/$REPO/milestones?state=all&per_page=100" --jq '.[].title')"

milestone() { # titre description
  if grep -qxF "$1" <<<"$existing_ms"; then
    echo "  milestone $1 (existe déjà)"
  else
    gh api "repos/$REPO/milestones" -f title="$1" -f description="$2" >/dev/null
    echo "  milestone $1 créé"
  fi
}

milestone "Sprint 1" "Sprint Goal : « Je vois ma collection en ligne »"
milestone "Sprint 2" "Sprint Goal : « Je sais ce qui me manque »"
milestone "Sprint 3" "Sprint Goal : « Mes lectures et mes notes sont complètes »"
milestone "Sprint 4" "Sprint Goal : « Claude me conseille »"

# ---------------------------------------------------------------------------
# 3. Issues du backlog (sans milestone)
# ---------------------------------------------------------------------------
echo "Issues…"
existing_issues="$(gh issue list --repo "$REPO" --state all --limit 500 --json title --jq '.[].title')"

issue() { # id titre labels  (corps lu sur stdin)
  local id="$1" title="$1 — $2" labels="$3" body
  body="$(cat)"
  if grep -q "^$id —" <<<"$existing_issues"; then
    echo "  $id (existe déjà)"
  else
    url="$(gh issue create --repo "$REPO" --title "$title" --label "$labels" --body "$body")"
    echo "  $id → $url"
  fi
}

issue "US-01" "Importer l'export Bubble en JSON" "type:us,epic:socle,prio:must,pts:3" <<'EOF'
## User story
En tant que PO, je veux importer mon export Bubble en JSON afin de ne rien ressaisir.

## Contexte
Ma collection existe déjà dans l'application Bubble. L'export `import/export-bubble.csv` contient 309 lignes (309 albums, 60 séries, tous possédés, 226 lus, 18 séries notées). Format : séparateur `;`, UTF-8 avec BOM, champs texte sur plusieurs lignes.

## Correction
Script Python sans dépendance (`csv` de la bibliothèque standard) qui lit le CSV et écrit `data/series.json` et `data/albums.json` selon le modèle de `CLAUDE.md` :
- notes Bubble sur 5 × 2 ; note de série si présente, sinon première note d'album de la série ;
- espaces en fin de nom de série supprimés (`Goldorak `, `Lanfeust de Troy `) ;
- doublon Saint Seiya : Time Odyssey T3 (standard + collector) réduit à une ligne ;
- 2 albums Tanguy et Laverdure sans EAN conservés avec `ean: null` ;
- `tomes_parus` = plus grand numéro de tome possédé ;
- `id` de série en minuscules, sans accents, avec tirets.

## Critères d'acceptance
- [ ] 60 séries et 308 albums générés
- [ ] Notes converties sur 10 (18 séries notées)
- [ ] Noms de séries nettoyés, `id` conformes et uniques
- [ ] Script relançable : deux exécutions donnent des fichiers identiques
- [ ] JSON valides

## Fichiers à modifier
- `scripts/import_bubble.py`
- `data/series.json`
- `data/albums.json`

## Mockup
Sans objet.
EOF

issue "US-02" "Voir la liste de mes séries" "type:us,epic:collection,prio:must,pts:3" <<'EOF'
## User story
En tant que lecteur, je veux voir la liste de mes séries afin d'avoir une vue d'ensemble.

## Contexte
Écran d'accueil du site : c'est la première chose que voient la famille et les amis.

## Correction
`index.html` charge `data/series.json` et `data/albums.json` (fetch), puis `js/app.js` construit une carte par série. Possédés et lus calculés à partir des albums. Style dans `css/style.css`, sans framework.

## Critères d'acceptance
- [ ] Une carte par série : titre, auteurs, possédés / parus, lus, note
- [ ] Tri alphabétique (insensible aux accents et à la casse)
- [ ] Chaque carte mène à la page série
- [ ] Affichage lisible sur mobile
- [ ] Aucune erreur dans la console

## Fichiers à modifier
- `index.html`
- `js/app.js`
- `css/style.css`

## Mockup
Écran « Accueil » : capture à déposer dans `docs/mockups/` (Sprint 0, étape 4).
EOF

issue "US-03" "Filtrer et rechercher une série" "type:us,epic:collection,prio:must,pts:3" <<'EOF'
## User story
En tant que lecteur, je veux filtrer et rechercher afin de trouver vite une série.

## Contexte
Avec 60 séries, la liste devient longue à parcourir.

## Correction
Barre de filtres et champ de recherche sur `index.html`, filtrage côté client dans `js/app.js`. Normalisation des chaînes (NFD + suppression des diacritiques, minuscules) pour la recherche.

## Critères d'acceptance
- [ ] Filtres : possédé / lu / à lire / incomplète
- [ ] Recherche sur le titre et les auteurs
- [ ] Recherche insensible aux accents et à la casse (« derive » trouve « Dérive »)
- [ ] Filtres et recherche combinables
- [ ] Message clair quand aucun résultat

## Fichiers à modifier
- `index.html`
- `js/app.js`
- `css/style.css`

## Mockup
Écran « Accueil » : `docs/mockups/` (Sprint 0, étape 4).
EOF

issue "US-04" "Page série avec tomes et manquants" "type:us,epic:collection,prio:must,pts:5" <<'EOF'
## User story
En tant que lecteur, je veux une page série afin de voir les tomes et les manquants.

## Contexte
Savoir quels tomes manquent est l'un des objectifs principaux du site.

## Correction
`serie.html?id=<id>` : lit l'`id` dans l'URL, affiche la série et la liste des tomes de 1 à `tomes_parus`. Un tome est manquant s'il est absent de `albums.json` ou avec `possede: false`.

## Critères d'acceptance
- [ ] Liste des tomes 1..N avec statut possédé / lu / manquant
- [ ] Note et avis de la série affichés
- [ ] Lien retour vers l'accueil
- [ ] `id` inconnu : message d'erreur propre, pas de page blanche
- [ ] Aucune erreur dans la console

## Fichiers à modifier
- `serie.html`
- `js/app.js`
- `css/style.css`

## Mockup
Écran « Page série » : capture à déposer dans `docs/mockups/` (Sprint 0, étape 4).
EOF

issue "US-05" "Publier le site sur GitHub Pages" "type:us,epic:socle,prio:must,pts:1" <<'EOF'
## User story
En tant que PO, je veux le site sur GitHub Pages afin de le partager.

## Contexte
Consultation publique en lecture seule par moi, la famille et un ami.

## Correction
Activer GitHub Pages depuis la branche `main`, à la racine (réglage du repo, fait par le PO ou avec son accord). Créer un `README.md` avec le lien public.

## Critères d'acceptance
- [ ] URL publique fonctionnelle
- [ ] Les fichiers `data/*.json` se chargent en ligne (chemins relatifs)
- [ ] Lien vers le site dans le README

## Fichiers à modifier
- `README.md`

## Mockup
Sans objet.
EOF

issue "US-06" "Enregistrer une BD lue non achetée" "type:us,epic:lecture,prio:must,pts:2" <<'EOF'
## User story
En tant que lecteur, je veux enregistrer une BD lue non achetée afin de tracer toutes mes lectures.

## Contexte
Je lis aussi des BD empruntées ou lues chez des amis. Le modèle le prévoit déjà : `possede: false, lu: true`.

## Correction
Pas d'écran de saisie : la gestion passe par Claude Code. Documenter la demande type (« J'ai lu Undertaker 1 à 3 chez un ami ») et la tester. Côté site, afficher un badge « lu, non possédé » sur la carte et la page série.

## Critères d'acceptance
- [ ] Demande type documentée et testée sur un vrai cas
- [ ] Badge « lu, non possédé » visible sur la page série
- [ ] Ces albums ne comptent pas dans les possédés

## Fichiers à modifier
- `js/app.js`
- `css/style.css`
- `CLAUDE.md` (si la demande type doit être précisée)

## Mockup
Écran « Page série » : `docs/mockups/`.
EOF

issue "US-07" "Noter une série sur 10 avec un avis" "type:us,epic:notation,prio:must,pts:2" <<'EOF'
## User story
En tant que lecteur, je veux noter une série sur 10 avec un avis afin de garder mon ressenti.

## Contexte
Les notes servent aussi de base aux recommandations (US-10).

## Correction
Demande type à Claude Code (« Note Tyler Cross 9/10 : ambiance géniale ») qui met à jour `note` et `avis` dans `data/series.json`. Affichage de la note et de l'avis sur la carte et la page série.

## Critères d'acceptance
- [ ] Note entière 0–10 (ou absente) et avis court affichés sur la carte et la page série
- [ ] Série non notée : affichage neutre, pas de « null »
- [ ] Demande type documentée et testée

## Fichiers à modifier
- `js/app.js`
- `css/style.css`

## Mockup
Écrans « Accueil » et « Page série » : `docs/mockups/`.
EOF

issue "US-08" "Tableau de bord de la collection" "type:us,epic:collection,prio:should,pts:3" <<'EOF'
## User story
En tant que lecteur, je veux un tableau de bord afin de suivre ma collection.

## Contexte
Vue chiffrée de la collection et de la pile à lire.

## Correction
`stats.html` calcule les indicateurs à partir des deux fichiers JSON, dans `js/app.js`. Graphiques simples en HTML/CSS, sans bibliothèque (sinon demander au PO).

## Critères d'acceptance
- [ ] Totaux : séries, albums possédés, albums lus
- [ ] % lu
- [ ] Pile à lire (possédés non lus)
- [ ] Séries incomplètes
- [ ] Répartition des notes

## Fichiers à modifier
- `stats.html`
- `js/app.js`
- `css/style.css`

## Mockup
Écran « Tableau de bord » : capture à déposer dans `docs/mockups/` (Sprint 0, étape 4).
EOF

issue "US-09" "Veille des prochains tomes des séries suivies" "type:us,epic:veille,prio:should,pts:3" <<'EOF'
## User story
En tant que lecteur, je veux une veille des prochains tomes de mes séries suivies afin de ne rien rater.

## Contexte
`tomes_parus` est initialisé à l'import au plus grand tome possédé : il doit être corrigé par la veille pour que les manquants soient justes.

## Correction
Procédure documentée pour Claude Code (« Fais la veille des nouveautés ») : pour chaque série `suivie: true`, chercher les tomes parus et à paraître, mettre à jour `tomes_parus` en citant la source et la date de sortie, produire un résumé.

## Critères d'acceptance
- [ ] Procédure de veille documentée
- [ ] `tomes_parus` mis à jour avec la source citée dans le commit
- [ ] Résumé des sorties à venir (série, tome, date, source)

## Fichiers à modifier
- `CLAUDE.md` (procédure)
- `data/series.json`

## Mockup
Sans objet.
EOF

issue "US-10" "Recommandations basées sur mes goûts" "type:us,epic:reco,prio:should,pts:5" <<'EOF'
## User story
En tant que lecteur, je veux des recommandations basées sur mes goûts afin de découvrir des séries.

## Contexte
Partir de mes séries notées ≥ 8 : auteurs, genres, ton de mes avis.

## Correction
Demande type « Recommande-moi 5 séries » : Claude Code analyse les séries notées ≥ 8, propose des séries absentes de la collection, et écrit le résultat dans `data/reco.json`. Le format de `reco.json` est à définir dans ce ticket.

## Critères d'acceptance
- [ ] 5 séries non possédées
- [ ] Chacune justifiée par mes notes ou mes avis, avec source
- [ ] Écrites dans `data/reco.json` (JSON valide, format documenté)

## Fichiers à modifier
- `data/reco.json`
- `CLAUDE.md` (format de `reco.json`)

## Mockup
Sans objet.
EOF

issue "US-11" "Page Recommandations" "type:us,epic:reco,prio:could,pts:3,needs-validation" <<'EOF'
## User story
En tant que lecteur, je veux une page Recommandations afin de les consulter et les trier.

## Contexte
Rendre visibles sur le site les recommandations de US-10.

## Correction
Page listant `data/reco.json`. Le statut (à découvrir / intéressé / rejeté) doit être stocké dans `reco.json` et modifié via Claude Code, le site étant en lecture seule : changement du modèle de données à valider par le PO.

## Critères d'acceptance
- [ ] Liste des recos avec justification
- [ ] Statut à découvrir / intéressé / rejeté affiché
- [ ] Tri ou filtre par statut

## Fichiers à modifier
- `reco.html` (nouveau)
- `js/app.js`
- `css/style.css`
- `data/reco.json`

## Mockup
À réaliser.
EOF

issue "US-12" "Afficher les couvertures" "type:us,epic:collection,prio:could,pts:3,needs-validation" <<'EOF'
## User story
En tant que lecteur, je veux voir les couvertures afin de rendre le site plus visuel.

## Contexte
Les albums ont presque tous un EAN (2 exceptions : Tanguy et Laverdure).

## Correction
Afficher une couverture à partir de l'EAN, sinon un visuel par défaut. La source d'images (service externe ou images stockées dans le repo) n'est pas tranchée : choix à valider par le PO (droits, fiabilité, poids du repo).

## Critères d'acceptance
- [ ] Couverture affichée via l'EAN si disponible
- [ ] Visuel par défaut sinon
- [ ] Aucun lien d'image cassé

## Fichiers à modifier
- `js/app.js`
- `css/style.css`

## Mockup
Écrans « Accueil » et « Page série » : `docs/mockups/`.
EOF

echo "Terminé. Ajout au Project « Bibliothèque BD » : à faire à la main."
