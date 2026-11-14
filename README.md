# Bibliothèque BD d'Arnaud

Ma collection de BD : séries, albums possédés, lus et manquants, notes et avis.

**Site public (lecture seule) : https://arnotnt.github.io/bibliotheque-bd/**

- [Ma collection](https://arnotnt.github.io/bibliotheque-bd/) : toutes les séries, avec filtres et recherche
- Page série, par exemple [Blacksad](https://arnotnt.github.io/bibliotheque-bd/serie.html?id=blacksad) : les tomes possédés, lus et manquants

## Fonctionnement

- Site statique en HTML, CSS et JavaScript, sans build ni dépendance, publié par GitHub Pages depuis `main`.
- Les données sont dans `data/series.json` et `data/albums.json`. La collection se gère avec Claude Code dans ce dépôt (voir `CLAUDE.md`).
- Le projet est mené en mode agile : issues, sprints (milestones), pull requests et [kanban](https://github.com/users/Arnotnt/projects/2).

## Lancer le site en local

```bash
python3 -m http.server
```

Puis ouvrir http://localhost:8000.
