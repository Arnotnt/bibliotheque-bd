# Journal

Une ligne datée par ticket soldé, le plus récent en haut.
Format : `AAAA-MM-JJ — <PRÉFIXE-NN> — titre (#n° PR)`

- 2026-11-15 — US-24 — « À acheter » ignore les séries dont je ne possède aucun album (lues ailleurs : Undertaker, et les 4 séries ajoutées le 2026-11-15), y compris dans « Bientôt en librairie » (#PR)
- 2026-11-15 — US-23 — Filtre de genre en liste déroulante dans les réglages (genres présents avec leur nombre de séries), à la place des pastilles à défilement horizontal (#64)
- 2026-11-14 — US-22 — Tableau de bord : encart « Mes goûts en chiffres », note moyenne par genre et par éditeur (groupes d’au moins 2 séries), répartition des regards, bascule « toutes les séries » (#61)
- 2026-11-14 — US-19 — Page auteur (`auteur.html?nom=…`) : ses séries, note moyenne, ses recos ; auteurs cliquables sur les pages série et Recommandations (#60)
- 2026-11-14 — US-18 — Page « À acheter » (`envies.html`) : tomes parus non possédés des séries sans `regard` triés par note (11 tomes), classiques en option (+34), « Bientôt en librairie », impression ; maquette validée (#59)
- 2026-11-14 — US-20 — Accueil : bascule Cartes / Couvertures, mur de couvertures seules (titre au survol et pour les lecteurs d’écran), choix gardé dans l’URL et dans le navigateur (#58)
- 2026-11-14 — US-17 — Accueil : pastilles des genres présents avec leur nombre de séries (un genre à la fois, dans l’URL) ; genres cliquables sur la page série (#57)
- 2026-11-14 — US-16 — Accueil : filtre Regard (toutes, mes goûts, classiques, jeunesse, hors goût, non suivi), « Suivies seulement », tri par titre, note, tomes, manquants ou ajout récent, le tout gardé dans l’URL (#56)
- 2026-11-14 — BUG-01 — Cache navigateur : `css/style.css?v=N` et `js/app.js?v=N` sur toutes les pages, même N contrôlé par `scripts/verifier_donnees.py`, ligne ajoutée à la Definition of Done (#55)
- 2026-11-14 — US-15 — Couvertures : surcharges manuelles (`data/couvertures_manuelles.json`) prioritaires sur Open Library, `couvertures.json` en URL complètes ; 58 séries sur 61 couvertes au lieu de 37 (#46)
- 2026-11-14 — US-14 — Badges Classique, Jeunesse, Hors goût, Non suivi et Terminée sur les cartes (sous les auteurs) et badge regard sur la page série, info-bulle « ne compte pas dans les recommandations » (#45)
- 2026-11-14 — DATA-03 — Note « dans son genre » (barème 9-10 / 7-8 / 5-6 / ≤ 4) et champ `regard` (classique, jeunesse, hors goût, non suivi) sur 30 séries, exclues des recos et contrôlées par le script (#43)
- 2026-11-14 — OPT-02 — Documentation à jour : section Sprint 0 retirée de CLAUDE.md au profit d'un historique des sprints, README avec toutes les pages (#37)
- 2026-11-14 — US-12 — Couvertures : images Open Library via l'EAN, choisies par `scripts/couvertures.py` (37 séries sur 61), initiales par défaut sinon (#36)
- 2026-11-14 — US-11 — Page Recommandations : `reco.html`, statut à découvrir / intéressé / rejeté (rejetées grisées), filtre par statut, lien dans la navigation (#35)
- 2026-11-14 — US-13 — Prochaines sorties visibles sur le site : champ `a_paraitre`, bloc « À paraître » sur le tableau de bord et la page série, 3 sorties de la veille saisies (#34)
- 2026-11-14 — DATA-01 + DATA-02 — Auteurs corrigés et genres complétés pour les 61 séries, règles dans CLAUDE.md, contrôlées par le script (#33)
- 2026-11-14 — OPT-01 — Script de vérification des données : `scripts/verifier_donnees.py` + Action sur chaque PR, 0 erreur sur les données actuelles (#32)
- 2026-11-14 — US-07 — Noter une série sur 10 avec un avis : demande type testée sur Okko 9/10 (#25)
- 2026-11-14 — US-06 — Enregistrer une BD lue non achetée : demande type testée sur Undertaker T1–T3 (#24)
- 2026-11-14 — US-10 — Recommandations basées sur mes goûts : 4 séries dans `data/reco.json` (Undertaker retirée, déjà lue), format documenté (#23)
- 2026-11-14 — US-09 — Veille des prochains tomes : 9 séries suivies, 15 passées en terminée, 5 `tomes_parus` corrigés, compte rendu dans `docs/veille/` (#22)
- 2026-11-14 — US-08 — Tableau de bord de la collection : totaux, % lu, pile à lire, séries incomplètes, répartition des notes (#21)
- 2026-11-14 — US-05 — Publier le site sur GitHub Pages : https://arnotnt.github.io/bibliotheque-bd/, lien dans le README (#18)
- 2026-11-14 — US-04 — Page série avec tomes et manquants : statut tome par tome, note et avis, manquants consécutifs regroupés (#17)
- 2026-11-14 — US-03 — Filtrer et rechercher une série : 5 filtres, recherche titre + auteur sans accents, vue partageable par l'URL (#16)
- 2026-11-14 — US-02 — Voir la liste de mes séries : cartes par série, tri alphabétique, thème clair/sombre (#15)
- 2026-11-14 — US-01 — Importer l'export Bubble en JSON : 60 séries, 308 albums, 18 séries notées (#14)
- 2026-11-14 — Sprint 0 — étape 4 : maquettes des 3 écrans dans `docs/mockups/`, liées aux issues US-02, 03, 04, 06, 07, 08
- 2026-11-14 — Sprint 0 — mise en place : templates GitHub, docs, script de setup, export Bubble rangé dans `import/`
