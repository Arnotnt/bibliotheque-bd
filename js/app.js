/* Bibliothèque BD d'Arnaud — logique commune aux pages (JavaScript vanilla, sans build). */
'use strict';

/* ---------- Utilitaires ---------- */

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

/** Minuscules, sans accents : sert au tri et à la recherche. */
function normaliser(texte) {
  return String(texte || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Échappe une chaîne avant de l'insérer dans du HTML. */
function esc(texte) {
  return String(texte == null ? '' : texte).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function pluriel(n, singulier, plurielForme) {
  return n > 1 ? (plurielForme || singulier + 's') : singulier;
}

function pct(n, total) {
  return total ? (n / total * 100).toFixed(2) + '%' : '0%';
}

/* ---------- Thème clair / sombre ---------- */

const CLE_THEME = 'bd-theme';

function themeInitial() {
  try {
    const choix = localStorage.getItem(CLE_THEME);
    if (choix === 'light' || choix === 'dark') return choix;
  } catch (e) { /* stockage indisponible : on suit le système */ }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function appliquerTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const bouton = document.querySelector('.theme-toggle');
  if (bouton) bouton.setAttribute('aria-label', theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre');
}

function initTheme() {
  appliquerTheme(themeInitial());
  const bouton = document.querySelector('.theme-toggle');
  if (!bouton) return;
  bouton.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    appliquerTheme(theme);
    try { localStorage.setItem(CLE_THEME, theme); } catch (e) { /* tant pis */ }
  });
}

/* ---------- Données ---------- */

async function chargerJSON(chemin) {
  const reponse = await fetch(chemin, { cache: 'no-cache' });
  if (!reponse.ok) throw new Error(chemin + ' : HTTP ' + reponse.status);
  return reponse.json();
}

async function chargerDonnees() {
  const [series, albums, couvertures] = await Promise.all([
    chargerJSON('data/series.json'),
    chargerJSON('data/albums.json'),
    chargerJSON('data/couvertures.json').catch(() => ({})) // facultatif : sans lui, visuels par défaut
  ]);
  return { series, albums, couvertures };
}

/**
 * Statut de chaque tome de 1 à N (N = tomes_parus, ou plus grand tome connu s'il est supérieur).
 * possede+lu → 'lu' ; possede non lu → 'alire' ; lu non possédé → 'lnp' ; sinon → 'manquant'.
 */
function tomesDeLaSerie(serie, albumsDeLaSerie) {
  const parTome = new Map(albumsDeLaSerie.map(a => [a.tome, a]));
  const maxConnu = albumsDeLaSerie.reduce((m, a) => Math.max(m, a.tome), 0);
  const parus = Math.max(serie.tomes_parus || 0, maxConnu);
  const tomes = [];
  for (let n = 1; n <= parus; n++) {
    const album = parTome.get(n) || null;
    let statut = 'manquant';
    if (album && album.possede) statut = album.lu ? 'lu' : 'alire';
    else if (album && album.lu) statut = 'lnp';
    tomes.push({ tome: n, album, statut });
  }
  return tomes;
}

/** Série enrichie des compteurs calculés à partir des albums. */
function enrichir(serie, albumsDeLaSerie) {
  const tomes = tomesDeLaSerie(serie, albumsDeLaSerie);
  const compte = s => tomes.filter(t => t.statut === s).length;
  const lu = compte('lu');
  const alire = compte('alire');
  const lnp = compte('lnp');
  const manquants = compte('manquant');
  const possedes = lu + alire;
  return Object.assign({}, serie, {
    tomes,
    parus: tomes.length,
    possedes,
    lu,
    alire,
    lnp,
    lus: lu + lnp,
    manquants,
    incomplete: possedes > 0 && possedes < tomes.length,
    // Date d'ajout la plus récente d'un album de la série (tri « ajout récent », US-16).
    dateAjout: albumsDeLaSerie.reduce((m, a) => (a.date_ajout && a.date_ajout > m ? a.date_ajout : m), ''),
    texteRecherche: normaliser(serie.titre + ' ' + (serie.auteurs || []).join(' '))
  });
}

function enrichirTout({ series, albums, couvertures = {} }) {
  const parSerie = new Map();
  for (const a of albums) {
    if (!parSerie.has(a.serie_id)) parSerie.set(a.serie_id, []);
    parSerie.get(a.serie_id).push(a);
  }
  return series
    .map(s => Object.assign(enrichir(s, parSerie.get(s.id) || []), { couverture: couvertures[s.id] || null }))
    .sort((a, b) => collator.compare(normaliser(a.titre), normaliser(b.titre)));
}

/* ---------- Affichage commun ---------- */

/* Couvertures (US-12, US-15) : data/couvertures.json (généré par scripts/couvertures.py) donne l'URL
   de l'image de chaque série : Open Library (EAN vérifié) ou surcharge manuelle. Aucune image n'est
   stockée dans le repo. Série absente : le visuel par défaut (initiales) reste affiché. */
function imageCouvertureHTML(s) {
  if (!s.couverture) return '';
  return '<img class="cover-img" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"' +
    ' src="' + esc(s.couverture) + '">';
}

// Filet de sécurité si le service ne répond pas : on retire l'image, les initiales réapparaissent.
// (Les événements error ne remontent pas : écoute en phase de capture.)
document.addEventListener('error', e => {
  if (e.target.classList && e.target.classList.contains('cover-img')) e.target.remove();
}, true);

const MOTS_IGNORES = new Set(['le', 'la', 'les', 'l', 'de', 'des', 'du', 'd', 'et', 'un', 'une', 'en', 'a', 'au', 'aux', 'ou']);

/** Initiales pour la couverture par défaut : « Blake et Mortimer » → BM, « XIII » → XIII. */
function initiales(titre) {
  const mots = titre.split(/[\s'’\-–:,.()…]+/).filter(Boolean);
  if (mots.length && /^(\d+|[IVXLC]{2,})$/.test(mots[0])) return mots[0].slice(0, 4);
  const utiles = mots.filter(m => !MOTS_IGNORES.has(normaliser(m)));
  return (utiles.length ? utiles : mots).slice(0, 2).map(m => m[0].toUpperCase()).join('');
}

function auteursCourts(auteurs) {
  const liste = auteurs || [];
  return liste.length > 3 ? liste.slice(0, 3).join(', ') + ' et al.' : liste.join(', ');
}

function libelleBarre(s) {
  const parties = [s.possedes + ' possédés sur ' + s.parus + ' parus', s.lus + ' ' + pluriel(s.lus, 'lu')];
  if (s.alire) parties.push(s.alire + ' à lire');
  if (s.lnp) parties.push(s.lnp + ' ' + pluriel(s.lnp, 'lu non possédé', 'lus non possédés'));
  if (s.manquants) parties.push(s.manquants + ' ' + pluriel(s.manquants, 'manquant'));
  return parties.join(', ');
}

function barreHTML(s) {
  return '<div class="bar" role="img" aria-label="' + esc(libelleBarre(s)) + '">' +
    '<span class="seg-read" style="width:' + pct(s.lu, s.parus) + '"></span>' +
    '<span class="seg-toread" style="width:' + pct(s.alire, s.parus) + '"></span>' +
    '<span class="seg-lnp" style="width:' + pct(s.lnp, s.parus) + '"></span>' +
    '<span class="seg-miss" style="width:' + pct(s.manquants, s.parus) + '"></span>' +
    '</div>';
}

function noteBadgeHTML(note) {
  if (note == null) return '';
  return '<span class="note-badge" aria-label="Note ' + note + ' sur 10">' + note + '/10</span>';
}

/* ---------- Badges « regard » et « Terminée » (US-14) ---------- */

const SVG_BADGE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const REGARDS = {
  'classique': { libelle: 'Classique', icone: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 21l5-2.5 5 2.5-1.5-7.5"/>' },
  'jeunesse': { libelle: 'Jeunesse', icone: '<ellipse cx="12" cy="9" rx="5.5" ry="6.5"/><path d="M12 15.5l-1 1.5h2zM12 17c-1 2 1 3 0 5"/>' },
  'hors goût': { libelle: 'Hors goût', icone: '<path d="M12 3v18M12 6h7l2 2.5-2 2.5h-7M12 13H5l-2 2.5L5 18h7"/>' },
  'non suivi': { libelle: 'Non suivi', icone: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>' }
};
const ICONE_TERMINEE = '<path d="M5 12.5l4.5 4.5L19 7.5"/>';

/** Badge du champ `regard` (DATA-03), ou '' si la série reflète les goûts actuels. */
function regardBadgeHTML(s) {
  const r = REGARDS[s.regard];
  if (!r) return '';
  const aide = r.libelle + ' : ne compte pas dans les recommandations';
  return '<span class="badge-regard" title="' + aide + '" aria-label="' + aide + '">' +
    SVG_BADGE + r.icone + '</svg>' + r.libelle + '</span>';
}

/** Badges de la carte : regard puis « Terminée ». */
function badgesCarteHTML(s) {
  const fin = s.statut === 'terminée'
    ? '<span class="badge-regard badge-terminee" title="Série terminée" aria-label="Série terminée">' +
      SVG_BADGE + ICONE_TERMINEE + '</svg>Terminée</span>'
    : '';
  const html = regardBadgeHTML(s) + fin;
  return html ? '<div class="card-badges">' + html + '</div>' : '';
}

function carteHTML(s) {
  return '<li><a class="card" href="serie.html?id=' + encodeURIComponent(s.id) + '" title="' + esc(s.titre) + '">' +
    '<div class="cover"><span class="cover-initials" aria-hidden="true">' + esc(initiales(s.titre)) + '</span>' +
    imageCouvertureHTML(s) + noteBadgeHTML(s.note) + '</div>' +
    '<div class="card-body">' +
    '<h2>' + esc(s.titre) + '</h2>' +
    '<p class="card-authors">' + esc(auteursCourts(s.auteurs)) + '</p>' +
    badgesCarteHTML(s) +
    '<div class="card-stats">' +
    '<span class="card-own"><strong>' + s.possedes + '</strong>/' + s.parus + ' possédés</span>' +
    barreHTML(s) +
    '<div class="card-meta"><span class="card-read"><strong>' + s.lus + '</strong> ' + pluriel(s.lus, 'lu') + '</span>' +
    (s.incomplete ? '<span class="card-incomplete">Incomplète</span>' : '') + '</div>' +
    (s.lnp ? '<span class="badge-lnp">Lu, non possédé</span>' : '') +
    '</div></div></a></li>';
}

function afficherStatsEnTete(series) {
  const el = document.getElementById('stats-entete');
  if (!el) return;
  const albums = series.reduce((n, s) => n + s.possedes, 0);
  const lus = series.reduce((n, s) => n + s.lu, 0);
  const pctLus = albums ? Math.round(lus / albums * 100) : 0;
  el.innerHTML = series.length + ' ' + pluriel(series.length, 'série') +
    ' · <span class="stat-own">' + albums + ' ' + pluriel(albums, 'album') + '</span>' +
    ' · <span class="stat-read">' + pctLus + ' % lus</span>';
}

function afficherErreur(conteneur, erreur) {
  console.error(erreur);
  conteneur.innerHTML = '<div class="message" role="alert"><h2>Impossible de charger la collection</h2>' +
    '<p>Les fichiers de données n’ont pas pu être lus. Réessayez dans un instant.</p></div>';
}

/* ---------- Page : collection (index.html) ---------- */

const FILTRES = {
  tout: () => true,
  possedees: s => s.possedes > 0,
  lues: s => s.lus > 0 && s.alire === 0,
  alire: s => s.alire > 0,
  incompletes: s => s.incomplete
};

/* Vue de l'accueil (US-20) : cartes détaillées ou mur de couvertures. */
const VUES = ['cartes', 'couvertures'];
const CLE_VUE = 'bd-vue';

function vueMemorisee() {
  try {
    const v = localStorage.getItem(CLE_VUE);
    if (VUES.includes(v)) return v;
  } catch (e) { /* stockage indisponible */ }
  return 'cartes';
}

/* Regard (US-16) : valeur dans l'URL → test sur le champ `regard` (DATA-03). */
const FILTRES_REGARD = {
  toutes: () => true,
  gouts: s => !s.regard,
  classique: s => s.regard === 'classique',
  jeunesse: s => s.regard === 'jeunesse',
  'hors-gout': s => s.regard === 'hors goût',
  'non-suivi': s => s.regard === 'non suivi'
};

/* Tris (US-16) : à valeur égale, on départage toujours par titre. */
const parTitre = (a, b) => collator.compare(normaliser(a.titre), normaliser(b.titre));
const TRIS = {
  titre: { libelle: 'ordre alphabétique', comparer: parTitre },
  note: { libelle: 'par note', comparer: (a, b) => (b.note == null ? -1 : b.note) - (a.note == null ? -1 : a.note) || parTitre(a, b) },
  tomes: { libelle: 'par nombre de tomes', comparer: (a, b) => b.parus - a.parus || parTitre(a, b) },
  manquants: { libelle: 'par tomes manquants', comparer: (a, b) => b.manquants - a.manquants || parTitre(a, b) },
  ajout: { libelle: 'par ajout récent', comparer: (a, b) => b.dateAjout.localeCompare(a.dateAjout) || parTitre(a, b) }
};

/**
 * Séries retenues par les réglages de l'accueil, dans l'ordre demandé.
 * Recherche : titre + auteurs, sans accents ni casse.
 */
function filtrerSeries(series, { filtre = 'tout', recherche = '', regard = 'toutes', suivies = false, tri = 'titre', genre = '' } = {}) {
  const garder = FILTRES[filtre] || FILTRES.tout;
  const garderRegard = FILTRES_REGARD[regard] || FILTRES_REGARD.toutes;
  const mots = normaliser(recherche).split(/\s+/).filter(Boolean);
  return series
    .filter(s => garder(s) && garderRegard(s) && (!suivies || s.suivie === true) &&
      (!genre || (s.genres || []).includes(genre)) &&
      mots.every(m => s.texteRecherche.includes(m)))
    .sort((TRIS[tri] || TRIS.titre).comparer);
}

function pageCollection(series) {
  const liste = document.getElementById('liste-series');
  const compteur = document.getElementById('compteur');
  const champ = document.getElementById('recherche');
  const puces = [...document.querySelectorAll('.chips [data-filtre]')];
  const choixRegard = document.getElementById('f-regard');
  const boutonSuivies = document.getElementById('f-suivies');
  const choixTri = document.getElementById('f-tri');
  const reinit = document.getElementById('reinitialiser');
  const choixGenre = document.getElementById('f-genre');
  const boutonsVue = [...document.querySelectorAll('[data-vue]')];
  const vide = document.getElementById('aucun-resultat');
  const videTexte = document.getElementById('aucun-resultat-texte');

  // État initial lu dans l'URL (?q=…&filtre=…&regard=…&suivies=1&tri=…) pour pouvoir partager une vue.
  const params = new URLSearchParams(location.search);
  let filtre = FILTRES[params.get('filtre')] ? params.get('filtre') : 'tout';
  let suivies = params.get('suivies') === '1';
  champ.value = params.get('q') || '';
  choixRegard.value = FILTRES_REGARD[params.get('regard')] ? params.get('regard') : 'toutes';
  choixTri.value = TRIS[params.get('tri')] ? params.get('tri') : 'titre';

  // Genres (US-17, US-23) : liste déroulante des seuls genres présents, avec leur nombre de séries.
  const nbParGenre = new Map();
  series.forEach(s => (s.genres || []).forEach(g => nbParGenre.set(g, (nbParGenre.get(g) || 0) + 1)));
  const genresPresents = [...nbParGenre.keys()].sort((a, b) => nbParGenre.get(b) - nbParGenre.get(a) || collator.compare(a, b));
  let genre = nbParGenre.has(params.get('genre')) ? params.get('genre') : '';
  choixGenre.insertAdjacentHTML('beforeend', genresPresents.map(g =>
    '<option value="' + esc(g) + '">' + esc(g.charAt(0).toUpperCase() + g.slice(1)) + ' (' + nbParGenre.get(g) + ')</option>').join(''));

  // Vue cartes ou mur de couvertures (US-20) : l'URL prime, sinon le dernier choix de ce navigateur.
  let vue = VUES.includes(params.get('vue')) ? params.get('vue') : vueMemorisee();

  const reglagesParDefaut = () =>
    !champ.value.trim() && filtre === 'tout' && choixRegard.value === 'toutes' && !suivies && choixTri.value === 'titre' && !genre;

  function majURL() {
    const p = new URLSearchParams();
    if (champ.value.trim()) p.set('q', champ.value.trim());
    if (filtre !== 'tout') p.set('filtre', filtre);
    if (choixRegard.value !== 'toutes') p.set('regard', choixRegard.value);
    if (suivies) p.set('suivies', '1');
    if (choixTri.value !== 'titre') p.set('tri', choixTri.value);
    if (genre) p.set('genre', genre);
    if (vue !== 'cartes') p.set('vue', vue);
    const qs = p.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  function afficher() {
    const q = champ.value.trim();
    const resultats = filtrerSeries(series, { filtre, recherche: q, regard: choixRegard.value, suivies, tri: choixTri.value, genre });
    puces.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filtre === filtre)));
    choixGenre.value = genre;
    boutonsVue.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vue === vue)));
    liste.classList.toggle('mur', vue === 'couvertures');
    boutonSuivies.setAttribute('aria-pressed', String(suivies));
    reinit.hidden = reglagesParDefaut();
    compteur.textContent = resultats.length + ' ' + pluriel(resultats.length, 'série') + ' · ' + (TRIS[choixTri.value] || TRIS.titre).libelle;
    liste.innerHTML = resultats.map(carteHTML).join('');
    liste.hidden = resultats.length === 0;
    vide.hidden = resultats.length > 0;
    if (!resultats.length) {
      const autresReglages = filtre !== 'tout' || choixRegard.value !== 'toutes' || suivies || genre;
      videTexte.textContent = q
        ? 'Aucun titre ni auteur ne correspond à « ' + q + ' »' + (autresReglages ? ' avec ces filtres.' : '.')
        : 'Aucune série ne correspond à ces filtres.';
    }
    majURL();
  }

  function toutEffacer() {
    champ.value = '';
    filtre = 'tout';
    suivies = false;
    choixRegard.value = 'toutes';
    choixTri.value = 'titre';
    genre = '';
    afficher();
  }

  champ.addEventListener('input', afficher);
  puces.forEach(b => b.addEventListener('click', () => { filtre = b.dataset.filtre; afficher(); }));
  choixRegard.addEventListener('change', afficher);
  choixTri.addEventListener('change', afficher);
  boutonSuivies.addEventListener('click', () => { suivies = !suivies; afficher(); });
  choixGenre.addEventListener('change', () => { genre = choixGenre.value; afficher(); });
  boutonsVue.forEach(b => b.addEventListener('click', () => {
    vue = b.dataset.vue;
    try { localStorage.setItem(CLE_VUE, vue); } catch (e) { /* stockage indisponible : l'URL suffit */ }
    afficher();
  }));
  reinit.addEventListener('click', () => { toutEffacer(); champ.focus(); });
  document.getElementById('effacer').addEventListener('click', () => { toutEffacer(); champ.focus(); });
  afficher();
}

/* ---------- Page : série (serie.html?id=…) ---------- */

const STATUTS_TOME = {
  lu: 'Possédé · lu',
  alire: 'Possédé · à lire',
  lnp: 'Lu, non possédé',
  manquant: 'Manquant'
};

const ICONE_MANQUANT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></svg>';

const LEGENDE_HTML = '<div class="legend boxed" aria-label="Légende des couleurs">' +
  '<span><span class="swatch swatch-own" aria-hidden="true"></span>Possédé</span>' +
  '<span><span class="swatch swatch-read" aria-hidden="true"></span>Lu</span>' +
  '<span><span class="swatch swatch-toread" aria-hidden="true"></span>À lire</span>' +
  '<span><span class="swatch swatch-lnp" aria-hidden="true"></span>Lu, non possédé</span>' +
  '<span><span class="swatch swatch-miss" aria-hidden="true"></span>Manquant</span></div>';

/** Regroupe les manquants consécutifs (3 ou plus) en une seule ligne pour les longues séries. */
function lignesDeTomes(tomes) {
  const lignes = [];
  for (let i = 0; i < tomes.length; i++) {
    const t = tomes[i];
    if (t.statut === 'manquant') {
      let j = i;
      while (j + 1 < tomes.length && tomes[j + 1].statut === 'manquant') j++;
      if (j - i + 1 >= 3) {
        lignes.push({ plage: true, de: t.tome, a: tomes[j].tome, nombre: j - i + 1 });
        i = j;
        continue;
      }
    }
    lignes.push(t);
  }
  return lignes;
}

function ligneTomeHTML(l) {
  if (l.plage) {
    return '<li class="tome-row st-manquant">' +
      '<span class="cell range" aria-hidden="true">' + l.de + '–' + l.a + '</span>' +
      '<span class="tome-titre"><span class="num">T' + l.de + ' à T' + l.a + '</span> <strong>' + l.nombre + ' tomes</strong></span>' +
      '<span class="tome-tag">' + ICONE_MANQUANT + 'Manquants</span></li>';
  }
  const titre = l.album && l.album.titre;
  return '<li class="tome-row st-' + l.statut + '">' +
    '<span class="cell" aria-hidden="true">' + l.tome + '</span>' +
    '<span class="tome-titre"><span class="num">T' + l.tome + '</span>' + (titre ? ' <strong>' + esc(titre) + '</strong>' : '') + '</span>' +
    '<span class="tome-tag">' + (l.statut === 'manquant' ? ICONE_MANQUANT : '') + STATUTS_TOME[l.statut] + '</span></li>';
}

function noteHTML(s) {
  if (s.note == null) {
    return '<div class="note-empty"><strong>Pas encore noté</strong><span>' +
      (s.avis ? esc(s.avis) : 'Aucun avis pour cette série.') + '</span></div>';
  }
  return '<div class="note-box"><div class="note-line"><span class="label">Ma note</span>' +
    '<span class="valeur">' + s.note + '</span><span class="sur">/10</span></div>' +
    (s.avis ? '<blockquote>« ' + esc(s.avis.trim()) + ' »</blockquote>' : '') + '</div>';
}

function compteursHTML(s) {
  let html = '<span class="c-own"><strong>' + s.possedes + '</strong> ' + pluriel(s.possedes, 'possédé') + ' / ' + s.parus + ' parus</span>' +
    '<span class="c-read"><strong>' + s.lus + '</strong> ' + pluriel(s.lus, 'lu') + '</span>';
  if (s.alire) html += '<span class="c-toread"><strong>' + s.alire + '</strong> à lire</span>';
  if (s.lnp) html += '<span class="c-lnp"><strong>' + s.lnp + '</strong> ' + pluriel(s.lnp, 'lu, non possédé', 'lus, non possédés') + '</span>';
  if (s.manquants) html += '<span class="c-miss"><strong>' + s.manquants + '</strong> ' + pluriel(s.manquants, 'manquant') + '</span>';
  return '<div class="serie-counts">' + html + '</div>';
}

function annoncesSerieHTML(s) {
  const annonces = (s.a_paraitre || []).slice().sort((x, y) => x.tome - y.tome);
  if (!annonces.length) return '';
  return '<div class="annonces"><h2>À paraître</h2><ul>' + annonces.map(a =>
    '<li><strong>' + libelleTomeAnnonce(a) + '</strong><span>' + dateAnnonce(a.date) + aVerifierHTML(a) + '</span></li>'
  ).join('') + '</ul></div>';
}

function serieHTML(s) {
  const statut = s.statut ? s.statut.charAt(0).toUpperCase() + s.statut.slice(1) : '';
  const tags = (statut ? '<span class="tag tag-statut">' + esc(statut) + '</span>' : '') +
    (s.genres || []).map(g => '<a class="tag tag-genre" href="index.html?genre=' + encodeURIComponent(g) + '" title="Toutes mes séries de ce genre">' +
      esc(g.charAt(0).toUpperCase() + g.slice(1)) + '</a>').join('') +
    regardBadgeHTML(s);
  return '<div class="serie-layout">' +
    '<section class="serie-info">' +
      '<div class="serie-head">' +
        '<div class="book-cover" aria-hidden="true"><span>' + esc(initiales(s.titre)) + '</span><span>Couverture</span>' +
          imageCouvertureHTML(s) + '</div>' +
        '<div class="serie-title"><h1>' + esc(s.titre) + '</h1>' +
          '<p>' + auteursLiensHTML(s.auteurs) + '</p>' +
          (s.editeur ? '<p class="editeur">' + esc(s.editeur) + '</p>' : '') +
          (tags ? '<div class="tags">' + tags + '</div>' : '') +
        '</div>' +
      '</div>' +
      noteHTML(s) +
      compteursHTML(s) +
      annoncesSerieHTML(s) +
    '</section>' +
    '<section class="serie-tomes" aria-labelledby="titre-tomes">' +
      '<div class="tomes-head"><h2 id="titre-tomes">Tomes</h2><span>' + s.parus + ' parus</span></div>' +
      '<ul class="tomes-grid" aria-hidden="true">' +
        s.tomes.map(t => '<li class="st-' + t.statut + '"><span class="cell">' + t.tome + '</span></li>').join('') +
      '</ul>' +
      '<ol class="tomes-list">' + lignesDeTomes(s.tomes).map(ligneTomeHTML).join('') + '</ol>' +
    '</section>' +
  '</div>' + LEGENDE_HTML;
}

function pageSerie(series) {
  const conteneur = document.getElementById('serie');
  const id = new URLSearchParams(location.search).get('id');
  const serie = series.find(s => s.id === id);
  if (!serie) {
    document.title = 'Série introuvable — Bibliothèque BD d’Arnaud';
    conteneur.innerHTML = '<div class="message" role="alert"><h2>Série introuvable</h2>' +
      '<p>' + (id ? 'Aucune série ne correspond à l’identifiant « ' + esc(id) + ' ».' : 'Aucune série n’est indiquée dans l’adresse.') + '</p>' +
      '<a class="btn-primary" href="index.html">Retour à la collection</a></div>';
    return;
  }
  document.title = serie.titre + ' — Bibliothèque BD d’Arnaud';
  conteneur.innerHTML = serieHTML(serie);
}

/* ---------- Page : tableau de bord (stats.html) ---------- */

const NB_LIGNES_PANNEAU = 6;

function lienSerie(s) {
  return 'serie.html?id=' + encodeURIComponent(s.id);
}

/* Tomes annoncés (US-13) : date « AAAA », « AAAA-MM » ou « AAAA-MM-JJ », ou null. */
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function dateAnnonce(date) {
  if (!date) return 'Date inconnue';
  const [a, m, j] = date.split('-').map(Number);
  if (j) return j + (j === 1 ? 'er' : '') + ' ' + MOIS[m - 1] + ' ' + a;
  if (m) return MOIS[m - 1].charAt(0).toUpperCase() + MOIS[m - 1].slice(1) + ' ' + a;
  return String(a);
}

/** Clé de tri : par date (les dates partielles en fin de période), « date inconnue » en dernier. */
function cleDateAnnonce(date) {
  if (!date) return '9999-99-99';
  const [a, m, j] = date.split('-');
  return a + '-' + (m || '12') + '-' + (j || '31');
}

function libelleTomeAnnonce(a) {
  return 'T' + a.tome + (a.titre ? ' · ' + esc(a.titre) : '');
}

function aVerifierHTML(a) {
  return a.a_verifier ? '<span class="tag-averifier" title="Date issue d’une seule source ou d’une précommande">à vérifier</span>' : '';
}

function aParaitreHTML(series) {
  const annonces = series.flatMap(s => (s.a_paraitre || []).map(a => ({ s, a })))
    .sort((x, y) => cleDateAnnonce(x.a.date).localeCompare(cleDateAnnonce(y.a.date)) ||
      collator.compare(x.s.titre, y.s.titre) || x.a.tome - y.a.tome);
  const lignes = annonces.map(({ s, a }) =>
    '<li><a href="' + lienSerie(s) + '"><span class="r-titre"><strong>' + esc(s.titre) + '</strong> ' +
    '<span class="r-tome">' + libelleTomeAnnonce(a) + '</span></span>' +
    '<span class="r-date">' + dateAnnonce(a.date) + aVerifierHTML(a) + '</span></a></li>'
  ).join('');
  return '<section class="panel" aria-labelledby="t-aparaitre">' +
    '<div class="panel-head"><div><h2 id="t-aparaitre">À paraître</h2>' +
    '<p>Prochains tomes annoncés, d’après la dernière veille</p></div></div>' +
    (annonces.length ? '<ul class="rows">' + lignes + '</ul>' : '<p>Aucune sortie annoncée pour le moment.</p>') +
  '</section>';
}

function kpisHTML(series) {
  const possedes = series.reduce((n, s) => n + s.possedes, 0);
  const lus = series.reduce((n, s) => n + s.lus, 0);
  const lusPossedes = series.reduce((n, s) => n + s.lu, 0);
  const pctLu = possedes ? Math.round(lusPossedes / possedes * 100) : 0;
  return '<div class="kpis">' +
    '<div class="kpi"><strong>' + series.length + '</strong><span>' + pluriel(series.length, 'série') + '</span></div>' +
    '<div class="kpi k-own"><strong>' + possedes + '</strong><span>' + pluriel(possedes, 'album possédé', 'albums possédés') + '</span></div>' +
    '<div class="kpi k-read"><strong>' + lus + '</strong><span>' + pluriel(lus, 'album lu', 'albums lus') + '</span></div>' +
    '<div class="kpi k-read"><strong>' + pctLu + ' %</strong><span>de la collection lue</span>' +
      '<div class="bar" role="img" aria-label="' + pctLu + ' % lus, ' + (100 - pctLu) + ' % à lire">' +
      '<span class="seg-read" style="width:' + pct(lusPossedes, possedes) + '"></span>' +
      '<span class="seg-toread" style="width:' + pct(possedes - lusPossedes, possedes) + '"></span></div></div>' +
  '</div>';
}

function reste(liste, unite) {
  if (liste.length <= NB_LIGNES_PANNEAU) return '';
  const autres = liste.slice(NB_LIGNES_PANNEAU);
  const total = autres.reduce((n, x) => n + x.nombre, 0);
  return '<p class="panel-foot">+ ' + total + ' ' + unite(total) + ' dans ' + autres.length + ' ' +
    pluriel(autres.length, 'autre série', 'autres séries') + '</p>';
}

function pileHTML(series) {
  const pile = series.filter(s => s.alire > 0)
    .map(s => ({ s, nombre: s.alire }))
    .sort((a, b) => b.nombre - a.nombre || collator.compare(a.s.titre, b.s.titre));
  if (!pile.length) return ''; // tout est lu : l'encart n'apporte rien (US-25)
  const total = pile.reduce((n, x) => n + x.nombre, 0);
  const max = pile[0].nombre;
  const lignes = pile.slice(0, NB_LIGNES_PANNEAU).map(({ s, nombre }) =>
    '<li><a href="' + lienSerie(s) + '"><strong class="r-titre">' + esc(s.titre) + '</strong>' +
    '<span class="r-toread">' + nombre + '</span>' +
    '<span class="bar" aria-hidden="true"><span class="seg-toread" style="width:' + pct(nombre, max) + '"></span></span></a></li>'
  ).join('');
  return '<section class="panel" aria-labelledby="t-pile">' +
    '<div class="panel-head"><div><h2 id="t-pile">Pile à lire</h2><p>Albums possédés, pas encore lus</p></div>' +
    '<span class="pile-total" aria-label="' + total + ' albums à lire">' + total + '</span></div>' +
    '<ul class="rows">' + lignes + '</ul>' + reste(pile, n => pluriel(n, 'album')) +
  '</section>';
}

/* À lire (US-25) : séries lues sans en posséder un seul album (lues chez un ami), et la suite à lire. */
function aLireHTML(series) {
  const lues = series.filter(s => s.lnp > 0 && s.possedes === 0)
    .map(s => ({ s, suite: s.tomes.filter(t => t.statut === 'manquant').map(t => t.tome) }))
    .sort((a, b) => (b.suite.length > 0) - (a.suite.length > 0) || TRIS.note.comparer(a.s, b.s));
  const lignes = lues.map(({ s, suite }) => {
    const lus = s.tomes.filter(t => t.statut === 'lnp').map(t => t.tome);
    return '<li><a href="' + lienSerie(s) + '"><span class="r-titre"><strong>' + esc(s.titre) + '</strong> ' +
      '<span class="r-tome">' + 'T' + plagesDeTomes(lus) + ' ' + pluriel(lus.length, 'lu', 'lus') + '</span></span>' +
      (suite.length
        ? '<span class="r-suite">Suite : T' + plagesDeTomes(suite) + '</span>'
        : '<span class="r-fini">Lue en entier</span>') +
      '<span class="bar" role="img" aria-label="' + lus.length + ' ' + pluriel(lus.length, 'tome lu', 'tomes lus') + ' sur ' + s.parus + '">' +
      '<span class="seg-lnp" style="width:' + pct(lus.length, s.parus) + '"></span>' +
      '<span class="seg-miss" style="width:' + pct(suite.length, s.parus) + '"></span></span></a></li>';
  }).join('');
  return '<section class="panel" aria-labelledby="t-alire">' +
    '<div class="panel-head"><div><h2 id="t-alire">À lire</h2><p>Séries lues ailleurs, que je ne possède pas : où j’en suis</p></div></div>' +
    (lues.length ? '<ul class="rows">' + lignes + '</ul>' : '<p>Aucune série lue sans être achetée.</p>') +
  '</section>';
}

/* Derniers ajouts (US-25) : les albums les plus récemment ajoutés (date_ajout). */
const LIBELLES_STATUT_ALBUM = { lu: 'lu', alire: 'à lire', lnp: 'lu ailleurs' };

function derniersAjoutsHTML(series) {
  const ajouts = series.flatMap(s => s.tomes.filter(t => t.album && t.album.date_ajout).map(t => ({ s, t })))
    .sort((x, y) => y.t.album.date_ajout.localeCompare(x.t.album.date_ajout) ||
      collator.compare(x.s.titre, y.s.titre) || x.t.tome - y.t.tome);
  // Un lot ajouté le même jour pour une série tient sur une ligne (« T1 à 17 »).
  const lots = [];
  ajouts.forEach(({ s, t }) => {
    const der = lots[lots.length - 1];
    if (der && der.s === s && der.date === t.album.date_ajout && der.statut === t.statut) der.tomes.push(t);
    else lots.push({ s, date: t.album.date_ajout, statut: t.statut, tomes: [t] });
  });
  const lignes = lots.slice(0, NB_LIGNES_PANNEAU).map(({ s, date, statut, tomes }) => {
    const nums = tomes.map(t => t.tome).sort((a, b) => a - b);
    const titre = tomes.length === 1 && tomes[0].album.titre ? ' · ' + esc(tomes[0].album.titre) : '';
    return '<li><a href="' + lienSerie(s) + '"><span class="r-titre"><strong>' + esc(s.titre) + '</strong> ' +
      '<span class="r-tome">T' + plagesDeTomes(nums) + titre + '</span></span>' +
      '<span class="r-date">' + dateCourte(date) + ' <span class="r-statut st-' + statut + '">' + LIBELLES_STATUT_ALBUM[statut] + '</span></span></a></li>';
  }).join('');
  return '<section class="panel" aria-labelledby="t-ajouts">' +
    '<div class="panel-head"><div><h2 id="t-ajouts">Derniers ajouts</h2><p>Ce qui est entré dans la bibliothèque dernièrement</p></div></div>' +
    (lots.length ? '<ul class="rows">' + lignes + '</ul>' : '<p>Aucune date d’ajout connue.</p>') +
  '</section>';
}

function notesHTML(series) {
  const notees = series.filter(s => s.note != null);
  const compte = {};
  notees.forEach(s => { compte[s.note] = (compte[s.note] || 0) + 1; });
  const echelle = compte[0] ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const max = Math.max(1, ...Object.values(compte));
  const moyenne = notees.length ? (notees.reduce((n, s) => n + s.note, 0) / notees.length).toFixed(1).replace('.', ',') : null;
  const barres = echelle.map(n => {
    const c = compte[n] || 0;
    const classe = !c ? 'zero' : (n >= 9 ? 'top' : '');
    return '<div><b>' + (c || '') + '</b><i class="' + classe + '" style="height:' + (c ? Math.round(c / max * 130) : 2) + 'px"></i></div>';
  }).join('');
  const aria = 'Répartition des notes : ' + echelle.slice().reverse().filter(n => compte[n])
    .map(n => n + '/10 : ' + compte[n] + ' ' + pluriel(compte[n], 'série')).join(', ') + '.';
  return '<section class="panel" aria-labelledby="t-notes">' +
    '<div><h2 id="t-notes">Répartition des notes</h2><p class="histo-note" style="font-size:14px">' +
    notees.length + ' ' + pluriel(notees.length, 'série notée', 'séries notées') + ' sur ' + series.length +
    (moyenne ? ' · moyenne ' + moyenne + '/10' : '') + '</p></div>' +
    '<div class="histo" role="img" aria-label="' + esc(aria) + '" style="--cols:' + echelle.length + '">' + barres + '</div>' +
    '<div class="histo-axis" aria-hidden="true" style="--cols:' + echelle.length + '">' + echelle.map(n => '<span>' + n + '</span>').join('') + '</div>' +
    '<p class="histo-note">Note sur 10 · nombre de séries au-dessus des barres</p>' +
  '</section>';
}

/* ---------- Mes goûts en chiffres (US-22) ---------- */

const MIN_SERIES_GROUPE = 2; // en dessous, une moyenne ne veut rien dire : groupe listé à part

const virgule = n => n.toFixed(1).replace('.', ',');

/** Moyenne des notes par clé (genre, éditeur…) : [{ cle, moyenne, nb }], meilleure moyenne d'abord. */
function moyennesPar(series, cles) {
  const groupes = new Map();
  series.filter(s => s.note != null).forEach(s => cles(s).forEach(c => {
    if (!groupes.has(c)) groupes.set(c, []);
    groupes.get(c).push(s.note);
  }));
  return [...groupes].map(([cle, notes]) => ({ cle, nb: notes.length, moyenne: notes.reduce((a, b) => a + b, 0) / notes.length }))
    .sort((a, b) => b.moyenne - a.moyenne || b.nb - a.nb || collator.compare(a.cle, b.cle));
}

function barresMoyennesHTML(titre, groupes, lien) {
  const retenus = groupes.filter(g => g.nb >= MIN_SERIES_GROUPE);
  const isoles = groupes.filter(g => g.nb < MIN_SERIES_GROUPE);
  const majuscule = t => t.charAt(0).toUpperCase() + t.slice(1);
  const lignes = retenus.map(g => {
    const nom = lien ? '<a href="' + lien(g.cle) + '">' + esc(majuscule(g.cle)) + '</a>' : esc(majuscule(g.cle));
    return '<li><span class="g-nom">' + nom + '</span>' +
      '<span class="g-val"><strong>' + virgule(g.moyenne) + '</strong>/10 <small>· ' + g.nb + ' ' + pluriel(g.nb, 'série') + '</small></span>' +
      '<span class="bar" aria-hidden="true"><span class="seg-read" style="width:' + (g.moyenne * 10).toFixed(1) + '%"></span></span></li>';
  }).join('');
  return '<div class="gouts-bloc"><h3>' + titre + '</h3>' +
    (retenus.length ? '<ul class="gouts-barres">' + lignes + '</ul>' : '<p class="histo-note">Pas assez de séries pour comparer.</p>') +
    (isoles.length ? '<p class="histo-note">Une seule série : ' +
      isoles.map(g => esc(majuscule(g.cle)) + ' (' + g.moyenne + '/10)').join(', ') + '</p>' : '') +
  '</div>';
}

// Valeur du champ `regard` → valeur du filtre Regard de l'accueil (US-16).
const REGARD_VERS_URL = { 'classique': 'classique', 'jeunesse': 'jeunesse', 'hors goût': 'hors-gout', 'non suivi': 'non-suivi' };

function regardsHTML(series) {
  const lignes = [{ libelle: 'Mes goûts', nb: series.filter(s => !s.regard).length, regard: 'gouts' }]
    .concat(Object.keys(REGARDS).map(r => ({
      libelle: REGARDS[r].libelle, nb: series.filter(s => s.regard === r).length, regard: REGARD_VERS_URL[r]
    })));
  return '<div class="gouts-bloc"><h3>Regard sur mes séries</h3><ul class="gouts-regards">' +
    lignes.map(l => '<li><a href="index.html?regard=' + l.regard + '"><strong>' + l.nb + '</strong> ' + esc(l.libelle) + '</a></li>').join('') +
    '</ul><p class="histo-note">Total : ' + lignes.reduce((n, l) => n + l.nb, 0) + ' séries · « Mes goûts » = sans regard, elles guident les recommandations</p></div>';
}

function goutsContenuHTML(series, toutes) {
  const base = toutes ? series : series.filter(s => !s.regard);
  return '<p class="histo-note">' + base.length + ' ' + pluriel(base.length, 'série') +
      (toutes ? ', toutes incluses' : ' qui reflètent mes goûts (sans regard)') + ' · une série compte pour chacun de ses genres</p>' +
    barresMoyennesHTML('Par genre', moyennesPar(base, s => s.genres || []), g => 'index.html?genre=' + encodeURIComponent(g) + (toutes ? '' : '&regard=gouts')) +
    barresMoyennesHTML('Par éditeur', moyennesPar(base, s => (s.editeur ? [s.editeur] : [])));
}

function goutsHTML(series) {
  return '<section class="panel panel-large" aria-labelledby="t-gouts">' +
    '<div class="panel-head"><div><h2 id="t-gouts">Mes goûts en chiffres</h2><p>Note moyenne par genre et par éditeur</p></div>' +
    '<label class="gouts-toutes"><input type="checkbox" id="gouts-toutes"> Inclure toutes les séries</label></div>' +
    '<div id="gouts-contenu" aria-live="polite">' + goutsContenuHTML(series, false) + '</div>' +
    regardsHTML(series) +
  '</section>';
}

function pageStats(series) {
  const conteneur = document.getElementById('stats');
  conteneur.innerHTML = '<h1 class="page-title">Tableau de bord</h1>' + kpisHTML(series) +
    achatsHTML(series) +
    '<div class="panels">' + aParaitreHTML(series) + aLireHTML(series) + pileHTML(series) + derniersAjoutsHTML(series) +
    notesHTML(series) + goutsHTML(series) + '</div>';
  initAchats();
  const toutes = document.getElementById('gouts-toutes');
  toutes.addEventListener('change', () => {
    document.getElementById('gouts-contenu').innerHTML = goutsContenuHTML(series, toutes.checked);
  });
}

/* ---------- Page : auteur (auteur.html?nom=…, US-19) ---------- */

function lienAuteur(nom) {
  return 'auteur.html?nom=' + encodeURIComponent(nom);
}

/** Liste d'auteurs en liens vers leur page, séparés par des virgules. */
function auteursLiensHTML(auteurs) {
  return (auteurs || []).map(n => '<a class="lien-auteur" href="' + lienAuteur(n) + '">' + esc(n) + '</a>').join(', ');
}

const memeAuteur = nom => a => normaliser(a) === normaliser(nom);

function pageAuteur(series, recos) {
  const conteneur = document.getElementById('auteur');
  const nom = (new URLSearchParams(location.search).get('nom') || '').trim();
  const siennes = nom ? series.filter(s => (s.auteurs || []).some(memeAuteur(nom))) : [];
  const recosSiennes = nom ? recos.filter(r => (r.auteurs || []).some(memeAuteur(nom))) : [];

  if (!siennes.length && !recosSiennes.length) {
    document.title = 'Auteur introuvable — Bibliothèque BD d’Arnaud';
    conteneur.innerHTML = '<div class="message" role="alert"><h2>Auteur introuvable</h2>' +
      '<p>' + (nom ? 'Aucune série de ma collection ni recommandation n’est signée « ' + esc(nom) + ' ».' : 'Aucun auteur n’est indiqué dans l’adresse.') + '</p>' +
      '<a class="btn-primary" href="index.html">Retour à la collection</a></div>';
    return;
  }

  // Nom tel qu'écrit dans les données (accents, majuscules), plutôt que celui de l'URL.
  const nomAffiche = [...siennes, ...recosSiennes].flatMap(x => x.auteurs || []).find(memeAuteur(nom)) || nom;
  document.title = nomAffiche + ' — Bibliothèque BD d’Arnaud';
  const notees = siennes.filter(s => s.note != null);
  const moyenne = notees.length ? (notees.reduce((n, s) => n + s.note, 0) / notees.length).toFixed(1).replace('.', ',').replace(',0', '') : null;
  const resume = [siennes.length + ' ' + pluriel(siennes.length, 'série') + ' dans ma collection'];
  if (moyenne) resume.push('note moyenne ' + moyenne + '/10');
  if (recosSiennes.length) resume.push(recosSiennes.length + ' ' + pluriel(recosSiennes.length, 'recommandation'));

  const seriesParId = new Map(series.map(s => [s.id, s]));
  conteneur.innerHTML =
    '<a class="back-link" href="index.html">← Collection</a>' +
    '<div><h1 class="page-title">' + esc(nomAffiche) + '</h1><p class="count auteur-resume">' + resume.join(' · ') + '</p></div>' +
    (siennes.length
      ? '<section class="auteur-section" aria-labelledby="t-siennes"><h2 id="t-siennes">Dans ma collection</h2>' +
        '<ul class="series-grid">' + siennes.slice().sort(TRIS.note.comparer).map(carteHTML).join('') + '</ul></section>'
      : '') +
    (recosSiennes.length
      ? '<section class="auteur-section" aria-labelledby="t-recos"><h2 id="t-recos">À découvrir : recommandations</h2>' +
        '<ul class="reco-list">' + recosSiennes.map(r => recoHTML(r, seriesParId)).join('') + '</ul></section>'
      : '');
}

/* ---------- À acheter (US-18, intégré au tableau de bord par US-25) ---------- */

/** « 1 à 4, 9, 11 à 13 » à partir d'une liste triée de numéros. */
function plagesDeTomes(nums) {
  const plages = [];
  nums.forEach(n => {
    const der = plages[plages.length - 1];
    if (der && n === der[1] + 1) der[1] = n; else plages.push([n, n]);
  });
  return plages.map(([a, b]) => (a === b ? String(a) : a + (b === a + 1 ? ', ' : ' à ') + b)).join(', ');
}

/** Tomes parus non possédés (manquants ou lus non possédés) : ceux à acheter. */
function tomesAAcheter(s) {
  return s.tomes.filter(t => t.statut === 'manquant' || t.statut === 'lnp');
}

function envieHTML({ s, tomes }) {
  const nums = tomes.map(t => t.tome);
  const dejaLus = tomes.filter(t => t.statut === 'lnp').length;
  const cases = tomes.map(t =>
    '<li class="st-' + t.statut + '"><span class="cell" title="' + (t.statut === 'lnp' ? 'Tome ' + t.tome + ', déjà lu' : 'Tome ' + t.tome) + '">' + t.tome + '</span></li>').join('');
  return '<li class="envie">' +
    '<div class="mini-cover" aria-hidden="true"><span class="cover-initials">' + esc(initiales(s.titre)) + '</span>' + imageCouvertureHTML(s) + '</div>' +
    '<div><h3><a href="' + lienSerie(s) + '">' + esc(s.titre) + '</a></h3>' +
      '<p class="auteurs">' + esc(auteursCourts(s.auteurs)) + '</p></div>' +
    (s.note != null ? '<span class="note" aria-label="Note ' + s.note + ' sur 10">' + s.note + '/10</span>' : '<span></span>') +
    '<div class="tomes">' +
      '<ul class="tomes-grid" aria-hidden="true">' + cases + '</ul>' +
      '<p class="detail">' + pluriel(nums.length, 'Tome', 'Tomes') + ' ' + plagesDeTomes(nums) +
        ' <span class="dispo">· ' + nums.length + ' ' + pluriel(nums.length, 'tome') + (dejaLus ? ', dont' : '') + '</span>' +
        (dejaLus ? ' <span class="lnp">' + dejaLus + ' déjà ' + pluriel(dejaLus, 'lu') + '</span>' : '') + '</p>' +
    '</div></li>';
}

function groupeEnviesHTML(titre, sousTitre, groupe) {
  const total = groupe.reduce((n, x) => n + x.tomes.length, 0);
  return '<section class="groupe-envies">' +
    '<h3 class="groupe-titre">' + titre + ' <span>' + total + ' ' + pluriel(total, 'tome') + (sousTitre ? ' · ' + sousTitre : '') + '</span></h3>' +
    (groupe.length ? '<ul class="envies">' + groupe.map(envieHTML).join('') + '</ul>' : '<p class="count">Rien à acheter : ces séries sont complètes.</p>') +
  '</section>';
}

/* Liste à acheter, intégrée au tableau de bord (US-25, ex-page envies.html). */
function achatsHTML(series) {
  const aAcheter = filtre => series.filter(filtre)
    .map(s => ({ s, tomes: tomesAAcheter(s) }))
    .filter(x => x.tomes.length)
    .sort((a, b) => TRIS.note.comparer(a.s, b.s));
  // Les séries jeunesse, hors goût et non suivi ne sont jamais proposées (validé par le PO, #50),
  // ni celles dont je ne possède aucun album, même lues ailleurs (US-24, #65) : elles sont dans « À lire ».
  const collectionnee = s => s.possedes > 0;
  const gouts = aAcheter(s => !s.regard && collectionnee(s));
  const classiques = aAcheter(s => s.regard === 'classique' && collectionnee(s));
  const compter = g => g.reduce((n, x) => n + x.tomes.length, 0);
  const total = avec => {
    const nbTomes = compter(gouts) + (avec ? compter(classiques) : 0);
    const nbSeries = gouts.length + (avec ? classiques.length : 0);
    return nbTomes + '<small>' + pluriel(nbTomes, 'tome') + ' · ' + nbSeries + ' ' + pluriel(nbSeries, 'série') + '</small>';
  };
  return '<section class="panel achats" aria-labelledby="t-achats" data-total-sans="' + esc(total(false)) + '" data-total-avec="' + esc(total(true)) + '">' +
    '<div class="envies-head"><div><h2 id="t-achats">À acheter</h2>' +
      '<p>Les tomes parus qui me manquent, dans les séries qui me plaisent. Triés par note.</p></div>' +
      '<div class="envies-total" id="total-envies" aria-live="polite"></div></div>' +
    '<div class="envies-options">' +
      '<label><input type="checkbox" id="avec-classiques"> <span>Ajouter les classiques <span class="hint">(' +
        esc(classiques.slice(0, 3).map(x => x.s.titre).join(', ')) + (classiques.length > 3 ? '…' : '') + ' · ' +
        compter(classiques) + ' ' + pluriel(compter(classiques), 'tome') + ')</span></span></label>' +
      '<button type="button" class="btn-print" id="imprimer">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/></svg>' +
        'Imprimer la liste</button>' +
    '</div>' +
    groupeEnviesHTML('Mes séries', '', gouts) +
    '<div id="groupe-classiques" hidden>' + groupeEnviesHTML('Classiques', 'achetés par fidélité', classiques) + '</div>' +
  '</section>';
}

function initAchats() {
  const section = document.querySelector('.achats');
  const caseClassiques = document.getElementById('avec-classiques');
  const total = document.getElementById('total-envies');
  caseClassiques.checked = new URLSearchParams(location.search).get('classiques') === '1';
  function maj() {
    const avec = caseClassiques.checked;
    document.getElementById('groupe-classiques').hidden = !avec;
    total.innerHTML = avec ? section.dataset.totalAvec : section.dataset.totalSans;
    history.replaceState(null, '', avec ? '?classiques=1' : location.pathname);
  }
  caseClassiques.addEventListener('change', maj);
  document.getElementById('imprimer').addEventListener('click', () => window.print());
  maj();
}

/* ---------- Page : recommandations (reco.html) ---------- */

// Ordre d'affichage : ce qui m'intéresse d'abord, les recos rejetées en dernier (grisées).
const STATUTS_RECO = ['intéressé', 'à découvrir', 'rejeté'];
const LIBELLES_STATUT_RECO = { 'intéressé': 'Intéressé', 'à découvrir': 'À découvrir', 'rejeté': 'Rejetée' };

function domaine(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; }
}

function dateCourte(iso) {
  const [a, m, j] = (iso || '').split('-').map(Number);
  return j ? j + (j === 1 ? 'er' : '') + ' ' + MOIS[m - 1] + ' ' + a : '';
}

function recoHTML(r, seriesParId) {
  const statut = STATUTS_RECO.includes(r.statut) ? r.statut : 'à découvrir';
  const liees = (r.series_liees || []).map(id => seriesParId.get(id)).filter(Boolean).map(s =>
    '<a href="' + lienSerie(s) + '">' + esc(s.titre) + (s.note != null ? ' <span class="r-note">' + s.note + '/10</span>' : '') + '</a>'
  ).join('');
  const sources = (r.sources || []).map(u =>
    '<a href="' + esc(u) + '" rel="noopener" target="_blank">' + esc(domaine(u)) + '</a>').join(', ');
  const meta = [r.editeur, r.tomes_parus ? r.tomes_parus + ' ' + pluriel(r.tomes_parus, 'tome') : '', r.statut_serie ? 'série ' + r.statut_serie : '']
    .filter(Boolean).map(esc).join(' · ');
  return '<li class="reco-card statut-' + (statut === 'rejeté' ? 'rejete' : statut === 'intéressé' ? 'interesse' : 'decouvrir') + '">' +
    '<div class="reco-head"><div><h2>' + esc(r.titre) + '</h2>' +
      '<p class="card-authors">' + auteursLiensHTML(r.auteurs) + '</p></div>' +
      '<span class="reco-statut">' + LIBELLES_STATUT_RECO[statut] + '</span></div>' +
    (meta ? '<p class="reco-meta">' + meta + '</p>' : '') +
    (r.parution ? '<p class="reco-meta">' + esc(r.parution) + '</p>' : '') +
    '<p class="reco-pourquoi">' + esc(r.pourquoi) + '</p>' +
    (liees ? '<div class="reco-liees"><span>Parce que j’ai aimé</span>' + liees + '</div>' : '') +
    '<p class="reco-foot">Recommandée le ' + dateCourte(r.date_reco) + (sources ? ' · Sources : ' + sources : '') + '</p>' +
  '</li>';
}

function pageReco(series, recos) {
  const liste = document.getElementById('liste-recos');
  const compteur = document.getElementById('compteur');
  const puces = [...document.querySelectorAll('.chips [data-filtre]')];
  const seriesParId = new Map(series.map(s => [s.id, s]));
  const triees = recos.slice().sort((a, b) =>
    STATUTS_RECO.indexOf(a.statut) - STATUTS_RECO.indexOf(b.statut) ||
    (b.date_reco || '').localeCompare(a.date_reco || '') || collator.compare(a.titre, b.titre));

  const params = new URLSearchParams(location.search);
  let filtre = STATUTS_RECO.includes(params.get('statut')) ? params.get('statut') : 'tout';

  function afficher() {
    const resultats = filtre === 'tout' ? triees : triees.filter(r => r.statut === filtre);
    puces.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filtre === filtre)));
    compteur.textContent = resultats.length + ' ' + pluriel(resultats.length, 'recommandation') +
      (filtre === 'tout' ? '' : ' · ' + LIBELLES_STATUT_RECO[filtre].toLowerCase());
    liste.innerHTML = resultats.length
      ? resultats.map(r => recoHTML(r, seriesParId)).join('')
      : '<li class="message"><p>Aucune recommandation avec ce statut.</p></li>';
    const p = new URLSearchParams();
    if (filtre !== 'tout') p.set('statut', filtre);
    history.replaceState(null, '', p.toString() ? '?' + p : location.pathname);
  }

  puces.forEach(b => b.addEventListener('click', () => { filtre = b.dataset.filtre; afficher(); }));
  afficher();
}

/* ---------- Démarrage ---------- */

async function demarrer() {
  initTheme();
  // Sur mobile, la navigation défile horizontalement : on garde l'onglet courant visible.
  const courant = document.querySelector('.main-nav [aria-current="page"]');
  if (courant) courant.parentElement.scrollLeft = courant.offsetLeft - courant.parentElement.offsetLeft - 16;
  const page = document.body.dataset.page;
  const contenu = document.querySelector('main');
  try {
    const series = enrichirTout(await chargerDonnees());
    afficherStatsEnTete(series);
    if (page === 'collection') pageCollection(series);
    if (page === 'serie') pageSerie(series);
    if (page === 'stats') pageStats(series);
    if (page === 'auteur') pageAuteur(series, await chargerJSON('data/reco.json').catch(() => []));
    if (page === 'reco') pageReco(series, await chargerJSON('data/reco.json'));
  } catch (erreur) {
    afficherErreur(contenu, erreur);
  }
}

document.addEventListener('DOMContentLoaded', demarrer);
