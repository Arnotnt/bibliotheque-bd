# Bibliothèque BD d'Arnaud

Ma collection de BD : séries, albums possédés, lus et manquants, notes et avis.

**Site public (lecture seule) : https://arnotnt.github.io/bibliotheque-bd/**

- [Ma collection](https://arnotnt.github.io/bibliotheque-bd/) : toutes les séries, avec filtres et recherche
- Page série, par exemple [Blacksad](https://arnotnt.github.io/bibliotheque-bd/serie.html?id=blacksad) : couverture, tomes possédés, lus et manquants, note et avis, tomes à paraître
- [Tableau de bord](https://arnotnt.github.io/bibliotheque-bd/stats.html) : à acheter (liste imprimable), prochaines sorties, séries lues ailleurs à continuer, derniers ajouts, notes et goûts
- [Recommandations](https://arnotnt.github.io/bibliotheque-bd/reco.html) : séries conseillées par Claude d'après mes notes, filtrables par statut

## Fonctionnement

- Site statique en HTML, CSS et JavaScript, sans build ni dépendance, publié par GitHub Pages depuis `main`.
- Les données sont dans `data/` (`series.json`, `albums.json`, `reco.json`, `couvertures.json`, `couvertures_manuelles.json`). La collection se gère avec Claude Code dans ce dépôt (voir `CLAUDE.md`).
- `python3 scripts/verifier_donnees.py` contrôle les données ; une GitHub Action le lance sur chaque pull request.
- Couvertures : [Open Library](https://openlibrary.org) et sites des éditeurs, choisies par `python3 scripts/couvertures.py` (surcharges manuelles dans `data/couvertures_manuelles.json`).
- Le projet est mené en mode agile : issues, sprints (milestones), pull requests et [kanban](https://github.com/users/Arnotnt/projects/2).

## Lancer le site en local

```bash
python3 -m http.server
```

Puis ouvrir http://localhost:8000.
