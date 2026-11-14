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
- [ ] Les fichiers `data/*.json` sont valides (pas de doublon d'`id`)
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
css/style.css
js/app.js
data/series.json    une entrée par série
data/albums.json    une entrée par album
data/reco.json      recommandations issues des veilles
scripts/import_bubble.py   import unique de l'export Bubble (CSV)
scripts/setup_github.sh    création des labels, milestones et issues du Sprint 0
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

## Règles pour Claude
- Toujours répondre en français.
- Avant toute modification de `data/`, montrer ce qui change, puis commiter avec un message clair (ex. « Ajout Blacksad T8, lu, possédé »).
- Ne jamais supprimer d'album ou de série sans confirmation explicite.
- Les `id` de série sont en minuscules, sans accents, avec des tirets (`le-troisieme-testament`).
- Avant d'ajouter une série, vérifier qu'elle n'existe pas déjà sous un nom proche.
- Pour une veille ou une recommandation, citer la source et la date de sortie.
- Rester simple : pas de framework ni de dépendance sans me demander.
- En fin de sprint, proposer la démo (ce qui est en ligne) et une rétro de 3 lignes.

## Demandes types (gestion courante, sans issue)
- « J'ai acheté et lu Blacksad tome 8 » → ajouter ou mettre à jour l'album.
- « J'ai lu Undertaker 1 à 3 chez un ami » → albums `possede: false, lu: true`.
- « Note Tyler Cross 9/10 : ambiance géniale » → mettre à jour la série.
- « Fais la veille des nouveautés » → pour chaque série `suivie`, chercher les tomes à paraître et mettre à jour `tomes_parus`.
- « Recommande-moi 5 séries » → partir de mes séries notées ≥ 8 (auteurs, genres, ton de mes avis), proposer des séries que je n'ai pas, écrire le résultat dans `data/reco.json`.

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

---

## Sprint 0 — mise en place (section à supprimer une fois terminé)

1. Créer `scripts/setup_github.sh` qui, avec `gh` :
   - crée tous les labels ci-dessus (`gh label create … --color … --force`) ;
   - crée les milestones `Sprint 1` à `Sprint 4` (via `gh api repos/{owner}/{repo}/milestones`) ;
   - crée les 12 issues du backlog ci-dessous, au format de la skill, avec leurs labels, **sans milestone** ;
   - les ajoute au Project « Bibliothèque BD ».
   Me montrer le script avant de l'exécuter.
2. Créer `.github/ISSUE_TEMPLATE/user-story.md` (format de la skill) et `.github/pull_request_template.md` (Definition of Done).
3. Créer `docs/JOURNAL.md`, `docs/retro.md` et `docs/mockups/`.
4. Mockups (3 écrans : Accueil, Page série, Tableau de bord) : réalisés à part dans Claude Design, captures déposées dans `docs/mockups/` puis liées aux issues US-02, US-04 et US-08. ✅ fait le 2026-11-14 (captures, sources et charte dans `docs/mockups/`).
5. Sprint planning du Sprint 1 : ✅ fait le 2026-11-14, élargi à US-01 → US-05 (15 pts) car la charge est calculée sur la capacité de Claude.

### Backlog initial

| ID | Epic | Prio | Pts | User story | Critères d'acceptance clés |
|---|---|---|---|---|---|
| US-01 | socle | must | 3 | En tant que PO, je veux importer mon export Bubble en JSON afin de ne rien ressaisir | 60 séries / 308 albums générés ; notes converties sur 10 ; noms nettoyés ; script relançable |
| US-02 | collection | must | 3 | En tant que lecteur, je veux voir la liste de mes séries afin d'avoir une vue d'ensemble | Carte par série : titre, auteurs, possédés / parus, lus, note ; tri alphabétique |
| US-03 | collection | must | 3 | En tant que lecteur, je veux filtrer et rechercher afin de trouver vite une série | Filtres possédé / lu / à lire / incomplète ; recherche titre + auteur, sans accents ni casse |
| US-04 | collection | must | 5 | En tant que lecteur, je veux une page série afin de voir les tomes et les manquants | Liste des tomes 1..N avec statut possédé / lu / manquant ; note et avis affichés ; lien retour |
| US-05 | socle | must | 1 | En tant que PO, je veux le site sur GitHub Pages afin de le partager | URL publique fonctionnelle ; lien dans le README |
| US-06 | lecture | must | 2 | En tant que lecteur, je veux enregistrer une BD lue non achetée afin de tracer toutes mes lectures | Demande type à Claude Code documentée et testée ; badge « lu, non possédé » visible sur le site |
| US-07 | notation | must | 2 | En tant que lecteur, je veux noter une série sur 10 avec un avis afin de garder mon ressenti | Note 0–10 + avis court affichés sur la carte et la page série ; demande type documentée |
| US-08 | collection | should | 3 | En tant que lecteur, je veux un tableau de bord afin de suivre ma collection | Totaux, % lu, pile à lire, séries incomplètes, répartition des notes |
| US-09 | veille | should | 3 | En tant que lecteur, je veux une veille des prochains tomes de mes séries suivies afin de ne rien rater | Procédure de veille documentée ; `tomes_parus` mis à jour avec la source ; résumé des sorties à venir |
| US-10 | reco | should | 5 | En tant que lecteur, je veux des recommandations basées sur mes goûts afin de découvrir des séries | 5 séries non possédées, chacune justifiée par mes notes / avis ; écrites dans `data/reco.json` |
| US-11 | reco | could | 3 | En tant que lecteur, je veux une page Recommandations afin de les consulter et les trier | Liste des recos avec justification ; statut à découvrir / intéressé / rejeté |
| US-12 | collection | could | 3 | En tant que lecteur, je veux voir les couvertures afin de rendre le site plus visuel | Couverture via l'EAN si disponible, sinon visuel par défaut ; aucun lien cassé |

### Plan de sprints (révisé le 2026-11-14 : capacité Claude, le goulot est la revue du PO)

| Sprint | Sprint Goal | US | Pts |
|---|---|---|---|
| 1 | « Je vois ma collection en ligne et ce qui me manque » | US-01, US-02, US-03, US-04, US-05 | 15 |
| 2 | à redéfinir au planning (pistes : US-06, US-07, US-08, puis US-09 à US-11) | — | — |
| Backlog | — | US-12 | 3 |
