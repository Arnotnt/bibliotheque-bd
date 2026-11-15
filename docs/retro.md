# Rétrospectives

Une section par fin de sprint, la plus récente en haut.

## Sprint 6 — 2026-11-15
Sprint Goal : « Mon tableau de bord me dit quoi acheter et quoi lire, et je montre mes coups de cœur » — atteint
Vélocité : 8 pts livrés sur 8 engagés (US-25, US-26 ; PR #73 et #75, fusionnées par Claude à la demande du PO)
Démo : https://arnotnt.github.io/bibliotheque-bd/stats.html (À acheter avec options classiques et recos, À lire) et https://arnotnt.github.io/bibliotheque-bd/?filtre=coups-de-coeur

- **Garder** : les retours du PO sur une PR ouverte intégrés dans la même PR (Derniers ajouts retiré, option recos ajoutée), et les idées écartées gardées en issue (US-26).
- **Arrêter** : proposer des encarts « pour remplir » : Derniers ajouts et Pile à lire vide n'apportaient rien.
- **Essayer** : marquer les premières recos « intéressé » et les premiers coups de cœur pour que les nouvelles options ne restent pas vides.

## Sprint 5 — 2026-11-14
Sprint Goal : « Je trouve vite ce que je cherche, et je sais quoi acheter » — atteint
Vélocité : 19 pts livrés sur 19 engagés (BUG-01, US-16, US-17, US-20, US-18, US-19, US-22 ; PR #55 à #61, fusionnées par Claude à la demande du PO, exceptionnellement)
Démo : https://arnotnt.github.io/bibliotheque-bd/ (« Mes goûts » triés par note, vue Couvertures, page « À acheter », page auteur, encart « Mes goûts en chiffres »)

- **Garder** : la maquette validée avant de coder une nouvelle page (US-18), le test dans le navigateur avant chaque PR, et le numéro de version `?v=N` contrôlé par le script.
- **Arrêter** : livrer 7 PR empilées d'un coup : c'est lourd à relire, et une seule à corriger aurait bloqué toutes les suivantes (déjà relevé au Sprint 3).
- **Essayer** : fusionner au fil de l'eau, une PR relue avant d'ouvrir la suivante sur les mêmes fichiers ; et donner à l'app l'accès au dossier Documents pour que son serveur local (`.claude/launch.json`) démarre.

## Sprint 3 — 2026-11-14
Sprint Goal : « Le site est complet et les données sont fiables » — atteint, avec une réserve : couvertures pour 37 séries sur 61 seulement (limite d'Open Library)
Vélocité : 18 pts livrés sur 18 engagés (OPT-01, DATA-01, DATA-02, US-13, US-11, US-12, OPT-02 ; PR #32 à #37)
Démo : https://arnotnt.github.io/bibliotheque-bd/ (couvertures, recherche « hergé », bloc « À paraître » du tableau de bord, page Recommandations)

- **Garder** : poser tous les arbitrages en début de sprint avec une recommandation, et le script de vérification lancé par l'Action sur chaque PR.
- **Arrêter** : empiler les branches les unes sur les autres : l'ordre de fusion devient strict et une fusion partielle a bloqué OPT-02 et demandé un aller-retour de plus.
- **Essayer** : une maquette rapide avant toute nouvelle page (US-11 et US-13 faites sans), et vérifier l'environnement de test (dossier du serveur, cache du navigateur) avant de demander au PO de tester.

## Sprint 2 — 2026-11-14
Sprint Goal : « Je suis ma collection et Claude me conseille » — atteint, avec une réserve : 4 recommandations au lieu de 5 (Undertaker retirée car déjà lue)
Vélocité : 15 pts livrés sur 15 engagés (US-06 à US-10, PR #21 à #25)
Charge réelle : environ 1 h 10 du planning à la dernière fusion, attentes du PO comprises (estimé : 2 h à 2 h 45)
Démo : https://arnotnt.github.io/bibliotheque-bd/stats.html

- **Garder** : montrer au PO les changements de `data/` avant fusion, et documenter les sources de la veille dans `docs/veille/`.
- **Arrêter** : ouvrir en parallèle plusieurs PR qui modifient `series.json` et `JOURNAL.md` : chaque fusion a demandé de régler des conflits.
- **Essayer** : regrouper les changements de données en une seule validation par sprint, et vérifier avant de recommander une série qu'elle n'est pas en cours de lecture.

## Sprint 1 — 2026-11-14
Sprint Goal : « Je vois ma collection en ligne et ce qui me manque » — atteint
Vélocité : 15 pts livrés sur 15 engagés (US-01 à US-05, PR #14 à #18)
Charge réelle : environ 1 h de travail Claude, validation de l'import comprise (estimé : 3 h 30 à 4 h 30)
Démo : https://arnotnt.github.io/bibliotheque-bd/

- **Garder** : une PR par US, testée dans le navigateur avant fusion, et le JOURNAL tenu à chaque PR.
- **Arrêter** : estimer le temps de Claude avec des marges de développeur humain : la vraie limite, c'est le temps de validation du PO.
- **Essayer** : un sprint 2 plus gros (US-06 à US-10, environ 15 pts), validé sur le site en ligne en fin de sprint plutôt que PR par PR.

<!--
## Sprint N — AAAA-MM-JJ
Sprint Goal : « … » — atteint / partiellement / non
Vélocité : X pts livrés sur Y engagés

- **Garder** :
- **Arrêter** :
- **Essayer** :
-->
