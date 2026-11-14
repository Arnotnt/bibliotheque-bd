# Bibliothèque BD d'Arnaud

Site perso pour gérer ma collection de BD, mes lectures et obtenir des recommandations.
Hébergé gratuitement sur GitHub Pages. Le projet est mené comme un vrai projet agile :
mockups, user stories en issues GitHub, sprints, pull requests et revues.

## Objectifs produit
- Voir ma collection par série : ce que j'ai, ce que j'ai lu, ce qui manque.
- Ajouter des BD lues mais pas achetées.
- Noter chaque **série** sur 10, avec un avis court.
- Recevoir des recommandations (veilles faites avec Claude).
- Consultation publique en lecture seule (moi, famille, un ami) ; la gestion passe par ce repo.

## Rôles
- **Arnaud** : Product Owner et reviewer. Il priorise, pose les milestones, valide les mockups, relit et fusionne les PR.
- **Claude Code** : équipe de développement. Rédige les issues, code, ouvre les PR. Ne fusionne jamais et ne pose jamais de milestone seul.

## Organisation agile dans GitHub

| Notion | Dans GitHub |
|---|---|
| Ticket (US, bug…) | Issue, titre `<PRÉFIXE-NN> — titre` |
| Epic, type, priorité, estimation | Labels (voir ci-dessous) |
| Sprint | Milestone `Sprint N` (1 semaine) |
| Kanban | GitHub Project « Bibliothèque BD » : Backlog → Sprint → En cours → En revue → Fait |
| Développement | Une branche par issue (`us-04-page-serie`), une PR avec `Closes #N` |
| Historique | `docs/JOURNAL.md` (une ligne datée par ticket soldé, le plus récent en haut) |
| Rétro | `docs/retro.md` (garder / arrêter / essayer, à chaque fin de sprint) |
| Mockups | `docs/mockups/` (captures) + lien dans l'issue concernée |

**Règle n°1 : toute idée de développement passe d'abord par une issue** (skill
`bibliotheque-bd-user-story-first`). Les opérations courantes de gestion de la
collection (section « Demandes types ») n'en demandent pas.

### Labels

| Famille | Labels | Couleur |
|---|---|---|
| Type | `type:us`, `type:bug`, `type:inc`, `type:opt`, `type:data` | bleu `1d76db` |
| Epic | `epic:socle`, `epic:collection`, `epic:lecture`, `epic:notation`, `epic:veille`, `epic:reco` | violet `5319e7` |
| Priorité | `prio:must`, `prio:should`, `prio:could` | rouge `b60205` / orange `fbca04` / gris `c5def5` |
| Estimation | `pts:1`, `pts:2`, `pts:3`, `pts:5`, `pts:8` | vert `0e8a16` |
| Validation | `needs-validation` | jaune `fef2c0` |

Chaque issue porte exactement un label type, un epic, une priorité et une estimation.

### Definition of Done (à recopier dans `.github/pull_request_template.md`)
- [ ] Tous les critères d'acceptance de l'issue sont vérifiés
- [ ] Testé en local (`python3 -m http.server` puis http://localhost:8000)
- [ ] Aucune erreur dans la console du navigateur
- [ ] `python3 scripts/verifier_donnees.py` passe (0 erreur ; vérifié aussi par l'Action sur la PR)
- [ ] N incrémenté dans `?v=N` sur toutes les pages si `js/app.js` ou `css/style.css` a changé (contrôlé par le script)
- [ ] `docs/JOURNAL.md` mis à jour
- [ ] La description de la PR contient `Closes #N`

## Stack (volontairement simple)
- HTML + CSS + JavaScript vanilla, **sans build ni npm**.
- Données dans des fichiers JSON sous `data/`, lues par le site au chargement.
- Déploiement : GitHub Pages depuis la branche `main`, à la racine. Repo public.

## Structure
```
index.html          accueil : liste des séries, filtres, recherche
serie.html          détail d'une série (?id=...)
stats.html          tableau de bord
reco.html           recommandations (data/reco.json), filtrables par statut
auteur.html         page d'un auteur (?nom=...) : ses séries et ses recos
envies.html         à acheter : tomes manquants des séries sans regard (+ classiques en option)
css/style.css
js/app.js
data/series.json    une entrée par série
data/albums.json    une entrée par album
data/reco.json      recommandations issues des veilles
data/couvertures.json  URL de la couverture de chaque série, généré
data/couvertures_manuelles.json  couvertures choisies à la main, prioritaires
scripts/couvertures.py     fusionne surcharges manuelles et Open Library → data/couvertures.json
scripts/import_bubble.py   import unique de l'export Bubble (CSV)
scripts/setup_github.sh    création des labels, milestones et issues du Sprint 0
scripts/verifier_donnees.py  vérification de data/*.json (format, doublons, cohérence) et des ?v=N des pages
.github/workflows/verifier-donnees.yml  lance la vérification sur chaque PR
docs/JOURNAL.md  docs/retro.md  docs/mockups/
.github/ISSUE_TEMPLATE/user-story.md
.github/pull_request_template.md
```

## Modèle de données

`data/series.json`
```json
{
  "id": "blacksad",
  "titre": "Blacksad",
  "auteurs": ["Juan Díaz Canales", "Juanjo Guarnido"],
  "editeur": "Dargaud",
  "categorie": "BD",
  "genres": ["polar", "animalier"],
  "statut": "en cours",
  "tomes_parus": 7,
  "suivie": true,
  "note": 10,
  "avis": "Des planches splendides et une histoire parfaite."
}
```
- `statut` : `en cours` | `terminée` | `abandonnée par moi`
- `tomes_parus` : renseigné à la main ou par une veille ; sert à calculer les manquants.
- `suivie` : `true` si je veux être alerté des nouveaux tomes.
- `note` : entier de 0 à 10, ou `null`.
- Sens de la note (règle DATA-03, 2026-11-14) : elle juge la série **dans son genre** (« pour quelqu'un qui aime ce genre de BD, ça vaut combien ? »), pas mon envie actuelle. Barème : 9-10 chef-d'œuvre du genre, je relis ; 7-8 très bon, je recommande à un amateur du genre ; 5-6 correct, sans plus ; ≤ 4 raté, même pour son public.
- `regard` (DATA-03, facultatif) : la série **ne guide pas les recommandations**, quelle que soit sa note. Valeurs : `classique` (patrimoine, acheté par fidélité : Astérix, Tintin), `jeunesse` (apprécié, mais pour enfants : Yakari, Cédric), `hors goût` (bien fait, pas mon style : Focu, Blueberry), `non suivi` (j'ai arrêté ou « sans plus » : Lucky Luke, Légende). Champ absent = la série reflète mes goûts actuels. Il se déduit de mon avis, et je valide la valeur. Indépendant de `suivie` : Astérix est `classique` et suivie ; 1629, terminée et non suivie, n'a pas de `regard` et guide les recos.
- `auteurs` (règle DATA-01, 2026-11-14) : scénaristes et dessinateurs principaux, **sans les coloristes** ni les auteurs du roman ou de la licence d'origine. Ordre : scénariste puis dessinateur. Séries reprises par plusieurs équipes : les **créateurs**, puis l'**équipe du dernier album paru** de la série principale numérotée (hors-séries et spin-offs exclus). Noms de plume tels que signés (`Hergé`, `Jijé`, `Fabcaro`). Au moins un auteur par série.
- `a_paraitre` (US-13, facultatif) : tomes **annoncés mais pas encore parus**, renseignés par la veille et affichés sur le tableau de bord et la page série.
  ```json
  "a_paraitre": [
    { "tome": 15, "titre": "Le secret du Scorpion", "date": "2026", "a_verifier": true, "sources": ["https://…"] }
  ]
  ```
  `tome` > `tomes_parus` ; `titre` ou `null` ; `date` au format `AAAA`, `AAAA-MM` ou `AAAA-MM-JJ`, ou `null` si inconnue ; `a_verifier` : `true` si la date vient d'une seule source ou d'une précommande ; au moins une source. Champ absent quand rien n'est annoncé (pas de liste vide).
- `genres` (règle DATA-02, 2026-11-14) : de 1 à 3 genres, du plus au moins marquant, choisis dans cette liste fermée : `aventure`, `fantasy`, `science-fiction`, `polar`, `thriller`, `historique`, `western`, `humour`, `jeunesse`, `espionnage`, `fantastique`, `animalier`, `guerre`, `aviation`, `shōnen`, `sport`, `documentaire`. Ajouter un genre demande l'accord du PO et la mise à jour de `GENRES` dans `scripts/verifier_donnees.py`.

`data/albums.json`
```json
{
  "serie_id": "blacksad",
  "tome": 1,
  "titre": "Quelque part entre les ombres",
  "ean": "9782205049657",
  "possede": true,
  "lu": true,
  "date_ajout": "2024-07-06"
}
```
- Lu sans être acheté : `possede: false, lu: true`.
- Les manquants ne sont pas stockés : ce sont les tomes de 1 à `tomes_parus` absents de `albums.json` ou avec `possede: false`.

`data/couvertures.json` (US-12, US-15) : `{ "blacksad": "https://covers.openlibrary.org/b/isbn/9782205049657-M.jpg", … }`, généré par `python3 scripts/couvertures.py`, jamais édité à la main. Le site affiche l'URL telle quelle ; aucune image n'est stockée dans le repo.
- Sources, par ordre de priorité :
  1. `data/couvertures_manuelles.json` (`{ serie_id: url }`, édité à la main) : image choisie par Claude et validée par moi, de préférence sur [Open Library](https://openlibrary.org) (autre édition, `…/b/id/<n°>-M.jpg`) ou sur le site de l'éditeur (image de la fiche album, en taille moyenne). Open Library n'est pas interrogé pour ces séries.
  2. Open Library : le premier album (par numéro de tome) dont l'EAN a une image ([API Covers](https://openlibrary.org/dev/docs/api/covers)).
- Écartés (US-15) : scraping de la Fnac (interdit par ses conditions, anti-robots) et Google Books (clé d'API et attribution Google obligatoires).
- Série absente du fichier = visuel par défaut (initiales). 58 séries sur 61 au 2026-11-14 (37 Open Library, 21 manuelles) ; sans couverture : 24 Heures Chrono, Durandal, L'Enfer du Tromé.
- Une image liée sur un site d'éditeur peut disparaître : le site réaffiche alors les initiales. Il suffit de remplacer l'URL dans `couvertures_manuelles.json` et de relancer le script.
- Open Library limite les requêtes par ISBN (environ 100 toutes les 5 minutes par adresse IP) : ne pas relancer le script en boucle.

`data/reco.json` (US-10) : une entrée par série recommandée, jamais une série déjà dans `series.json`.
```json
{
  "id": "long-john-silver",
  "titre": "Long John Silver",
  "auteurs": ["Xavier Dorison", "Mathieu Lauffray"],
  "editeur": "Dargaud",
  "tomes_parus": 4,
  "statut_serie": "terminée",
  "parution": "4 tomes, le dernier en novembre 2013",
  "pourquoi": "Justification à partir de mes notes et avis.",
  "series_liees": ["1629-ou-l-effrayante-histoire-des-naufrages-du-jakarta"],
  "sources": ["https://…"],
  "date_reco": "2026-11-14",
  "statut": "à découvrir"
}
```
- Une série que je lis ou ajoute à ma collection sort de `reco.json`.
- `series_liees` : `id` de mes séries (notées ≥ 8 de préférence) qui justifient la recommandation, **jamais une série avec `regard`** (contrôlé par le script).
- `sources` : au moins une URL qui confirme les tomes et les dates.
- Une nouvelle demande de recommandations ajoute des entrées ; on ne supprime une reco qu'avec mon accord.
- `statut` (US-11) : `à découvrir` (par défaut à la création) | `intéressé` | `rejeté`. Une reco rejetée reste dans le fichier et s'affiche grisée sur la page Recommandations, filtrable par statut.

## Règles pour Claude
- Toujours répondre en français.
- Avant toute modification de `data/`, montrer ce qui change, lancer `python3 scripts/verifier_donnees.py`, puis commiter avec un message clair (ex. « Ajout Blacksad T8, lu, possédé »).
- Ne jamais supprimer d'album ou de série sans confirmation explicite.
- Les `id` de série sont en minuscules, sans accents, avec des tirets (`le-troisieme-testament`).
- Avant d'ajouter une série, vérifier qu'elle n'existe pas déjà sous un nom proche.
- Pour une veille ou une recommandation, citer la source et la date de sortie.
- Rester simple : pas de framework ni de dépendance sans me demander.
- En fin de sprint, proposer la démo (ce qui est en ligne) et une rétro de 3 lignes.

## Demandes types (gestion courante, sans issue)
- « J'ai acheté et lu Blacksad tome 8 » → ajouter ou mettre à jour l'album.
- « J'ai lu Undertaker 1 à 3 chez un ami » → albums `possede: false, lu: true`.
  Si la série n'existe pas encore : la créer (`suivie: false`, `note: null`, `tomes_parus` d'après une source), puis ajouter les albums avec `date_ajout` du jour et `ean: null` si inconnu. Testé le 2026-11-14 sur Undertaker.
  Après l'ajout d'albums ou d'une série, relancer `python3 scripts/couvertures.py` pour lui trouver une couverture.
- « Note Tyler Cross 9/10 : ambiance géniale » → mettre à jour la série.
  `note` : entier de 0 à 10 ; `avis` : le texte donné, avec une majuscule et un point final, sans le réécrire. Testé le 2026-11-14 sur Okko.
  Si l'avis indique un `regard` (« classique », « pour la jeunesse », « pas mon style », « j'ai arrêté »), le proposer et l'ajouter après mon accord.
- « Fais la veille des nouveautés » → pour chaque série `suivie`, chercher les tomes à paraître et mettre à jour `tomes_parus`.
- « Long John Silver m'intéresse » / « Rejette De Cape et de Crocs » → mettre à jour `statut` dans `data/reco.json` (`intéressé` ou `rejeté`), sans supprimer l'entrée.
- « Recommande-moi 5 séries » → partir de mes séries notées ≥ 8 **sans `regard`** (auteurs, genres, ton de mes avis), proposer des séries que je n'ai pas, écrire le résultat dans `data/reco.json`.

## Procédure de veille (US-09)
Déclencheur : « Fais la veille des nouveautés ».
1. Lister les séries `suivie: true` de `data/series.json`.
2. Pour chacune, une recherche web : dernier tome paru (numéro, titre, date) et tomes annoncés. Sources à privilégier : éditeur, Bédéthèque, libraires.
3. Mettre à jour `tomes_parus` (tomes **déjà parus** seulement) et `statut` si la série est finie (alors `suivie: false`).
   Mettre à jour `a_paraitre` : ajouter les tomes annoncés (avec date, titre et source), et retirer ceux qui sont parus (ils passent dans `tomes_parus`). Le script de vérification signale les dates dépassées.
4. Écrire le compte rendu dans `docs/veille/AAAA-MM-JJ.md` : sorties à venir (série, tome, date, source), mises à jour, séries sans nouveauté. Une date issue d'une seule source ou d'une précommande est marquée « à vérifier ».
5. Montrer les changements au PO, puis commiter `data/series.json` et le compte rendu avec un message qui cite les principales sources.

## Import Bubble (US-01)
- Source : `import/export-bubble.csv` (séparateur `;`, UTF-8 avec BOM, champs texte sur plusieurs lignes).
- 309 albums, 60 séries, tous possédés, 226 lus. 18 séries notées.
- Notes Bubble sur 5 → multiplier par 2. Prendre la note de série si elle existe, sinon la première note d'album trouvée dans la série.
- Nettoyer les espaces en fin de nom de série (`Goldorak `, `Lanfeust de Troy `).
- Saint Seiya : Time Odyssey tome 3 apparaît deux fois (standard + collector) : garder une seule ligne.
- 2 albums sans EAN (Tanguy et Laverdure) : garder avec `ean: null`.
- `tomes_parus` initialisé au plus grand numéro de tome possédé (à corriger par la veille).
- Script : `python3 scripts/import_bubble.py`. Il **écrase** `data/*.json` : ne plus le relancer une fois la collection modifiée à la main.
- Choix faits à l'import (2026-11-14) :
  - One-shots (album sans numéro de tome, 10 séries) : `tome: 1`, `statut: terminée`, `suivie: false`. Toutes les autres séries : `en cours`, `suivie: true`.
  - XIII « 13.1 » = The XIII Mystery - L'enquête → tome 13.
  - Saint Seiya T3 : on garde l'édition collector (EAN 9782505126799, porte l'avis).
  - `avis` : avis de série, sinon premier avis d'album. `auteurs` : union des auteurs des albums, du plus fréquent au moins fréquent. `editeur` : le plus fréquent.
  - `genres: []` (absent de l'export, à compléter). Catégorie Bubble « Mangas » → `Manga`.
  - Champs vides (titre d'album, date d'ajout) → `null`.

## Historique des sprints

Le backlog vit dans les issues GitHub et le [kanban](https://github.com/users/Arnotnt/projects/2) ; le détail de chaque ticket soldé est dans `docs/JOURNAL.md`, les rétros dans `docs/retro.md`.

| Sprint | Sprint Goal | Tickets | Pts |
|---|---|---|---|
| 0 | Mise en place : labels, milestones, templates, docs, maquettes | — | — |
| 1 | « Je vois ma collection en ligne et ce qui me manque » | US-01, US-02, US-03, US-04, US-05 | 15 |
| 2 | « Je suis ma collection et Claude me conseille » | US-06, US-07, US-08, US-09, US-10 | 15 |
| 3 | « Le site est complet et les données sont fiables » | OPT-01, DATA-01, DATA-02, US-13, US-11, US-12, OPT-02 | 18 |

Capacité : la charge se calcule sur la capacité de Claude ; le goulot est la revue du PO (rétros des sprints 1 et 2).
