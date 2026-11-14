# Mockups — référence visuelle

Maquettes réalisées dans Claude Design et validées par Arnaud le 2026-11-14.
**Elles font référence** pour l'implémentation des écrans (US-02, US-03, US-04, US-06, US-07, US-08).

- Canvas interactif (privé, à partager depuis Claude) : https://claude.ai/artifact/CZ3m8eWLgXbqne4tLWMdE2
- Sources des maquettes : [`source/`](source/). Ce sont des fichiers Claude Design (`.dc.html`) qui ne s'ouvrent pas seuls dans un navigateur, mais ils donnent les styles exacts, les textes et la logique de calcul.

| Écran | Fichier site | Source maquette | Variantes sur le canvas | Issues |
|---|---|---|---|---|
| 1. Ma collection | `index.html` | [`01-collection.dc.html`](source/01-collection.dc.html) | mobile, aucun résultat, sombre, desktop | US-02, US-03, US-06, US-07 |
| 2. Page série | `serie.html?id=…` | [`02-page-serie.dc.html`](source/02-page-serie.dc.html) | Blacksad (noté, 1 manquant), Undertaker (lu non possédé), Blake et Mortimer (sans note, à lire), sombre, desktop | US-04, US-06, US-07 |
| 3. Tableau de bord | `stats.html` | [`03-tableau-de-bord.dc.html`](source/03-tableau-de-bord.dc.html) | mobile, sombre, desktop | US-08 |

Captures PNG : à exporter depuis le canvas et à déposer ici (`01-collection.png`, `02-page-serie.png`, `03-tableau-de-bord.png`).

## Charte

### Typographie (Google Fonts)
- Titres : **Literata** 700 (serif). Titre du site 22 px, titre de page 28 px, titres de section 20–22 px.
- Texte : **Atkinson Hyperlegible** 400/700, 16 px, interligne 1.45. Libellés secondaires 13–14 px.

### Couleurs (variables CSS, clair / sombre)

| Variable | Rôle | Clair | Sombre |
|---|---|---|---|
| `--bg` | fond de page | `#F5EFE3` | `#1A1612` |
| `--surf` | cartes, en-tête | `#FFFCF6` | `#231E19` |
| `--surf2` | fond de barre, bouton thème | `#EDE4D3` | `#2E2720` |
| `--line` | bordures | `#D9CBB2` | `#463B30` |
| `--ink` | texte | `#2B2119` | `#F2EADD` |
| `--ink2` | texte secondaire | `#62564A` | `#BCAF9D` |
| `--own` | **possédé** | `#6B4A2F` | `#D6B38E` |
| `--read` | **lu** | `#2C5F8F` | `#8DB8E6` |
| `--onread` | texte sur `--read` | `#FFFFFF` | `#10202F` |
| `--readtint` | fond « lu, non possédé » | `#DDE8F3` | `#1F3247` |
| `--toread` | **à lire** | `#E3A43A` | `#E9B455` |
| `--ontoread` | texte sur `--toread` | `#2B2119` | `#1A1612` |
| `--toreadtxt` | texte « à lire » | `#875810` | `#F0C470` |
| `--toreadtint` | fond « à lire » | `#F7EAD0` | `#3A2D17` |
| `--miss` | **manquant** | `#A8352A` | `#EE8270` |
| `--misstint` | fond « manquant » | `#F5DDD7` | `#47231D` |
| `--cover` | couverture par défaut | `#E4D8C3` | `#342C24` |
| `--covertxt` | initiales sur couverture | `#6E604F` | `#A89880` |

### Codes visuels des statuts (légende commune aux écrans)
- **Possédé · lu** : plein `--read`.
- **Possédé · à lire** : plein `--toread`.
- **Lu, non possédé** : fond `--readtint`, bordure pleine 2 px `--read`.
- **Manquant** : hachures à 135° `--miss` / `--misstint`, bordure **pointillée** `--miss`.
  Les statuts se distinguent aussi par la forme (bordure pleine ou pointillée, hachures), pas seulement par la couleur.

### Mise en page
- Conteneur `max-width: 1120px`, marges 16 px.
- En-tête : logo + « Bibliothèque BD d'Arnaud », sous-titre `N séries · N albums · N % lus`, bouton thème clair/sombre (44×44), onglets **Collection** / **Tableau de bord** (onglet actif souligné de 3 px).
- Pied de page : « Consultation seule · Données mises à jour le <date> ».
- Cibles tactiles ≥ 44 px, contraste texte ≥ 4.5:1, vrais `<button>`, `<a>`, `<label>`.

## Écran 1 — Ma collection (`index.html`)
- Champ « Rechercher une série » (titre ou auteur, sans accents ni casse).
- Filtres en pastilles, un seul actif (`aria-pressed`) : Tout · Possédées · Lues · À lire · Incomplètes. Défilement horizontal sur mobile.
- Légende des couleurs, puis compteur « N séries · ordre alphabétique ».
- Grille de cartes `repeat(auto-fill, minmax(160px, 1fr))`. Chaque carte mène à la page série :
  - couverture 3:4 (initiales en attendant US-12), pastille de note `N/10` en haut à droite si notée ;
  - titre, auteurs ;
  - `possédés/parus`, barre empilée lu / à lire / lu non possédé / manquant ;
  - `N lus`, mention « Incomplète » si `0 < possédés < parus`, badge « Lu, non possédé » s'il y en a.
- Aucun résultat : encart « Aucune série trouvée », rappel de la recherche, bouton « Effacer la recherche ».

## Écran 2 — Page série (`serie.html?id=…`)
- Lien retour « ← Collection ».
- Colonne gauche : couverture, titre, auteurs, éditeur, pastilles statut + genres ; bloc **Ma note** (grand chiffre `/10` + avis en citation) ou « Pas encore noté » en pointillés ; compteurs possédés / lus / à lire / lus non possédés / manquants.
- Colonne droite « Tomes » : frise de cases numérotées 1..N, puis liste des tomes `TN Titre` avec une étiquette de statut. Les tomes manquants ont une ligne en pointillés et une icône.
- Les deux colonnes passent l'une sous l'autre sur mobile (flex-wrap).

## Écran 3 — Tableau de bord (`stats.html`)
- 4 chiffres clés : séries, albums possédés, albums lus, % de la collection lue (avec barre lu / à lire).
- **Pile à lire** : total, top des séries par nombre d'albums possédés non lus, avec barre ; « + N albums dans N autres séries ».
- **Séries incomplètes** : nombre de séries et de tomes manquants, barre possédé / manquant par série.
- **Répartition des notes** : histogramme 1 à 10, nombre de séries au-dessus des barres, moyenne.

## Écarts assumés avec les maquettes
- Les données affichées dans les maquettes sont un échantillon de 12 séries : le site utilisera `data/*.json`.
- Les liens internes des maquettes (`Main.dc.html`, `Serie*.dc.html`…) deviennent `index.html`, `serie.html?id=…`, `stats.html`.
