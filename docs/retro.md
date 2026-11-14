# Rétrospectives

Une section par fin de sprint, la plus récente en haut.

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
