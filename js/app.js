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
  const [series, albums] = await Promise.all([chargerJSON('data/series.json'), chargerJSON('data/albums.json')]);
  return { series, albums };
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
    texteRecherche: normaliser(serie.titre + ' ' + (serie.auteurs || []).join(' '))
  });
}

function enrichirTout({ series, albums }) {
  const parSerie = new Map();
  for (const a of albums) {
    if (!parSerie.has(a.serie_id)) parSerie.set(a.serie_id, []);
    parSerie.get(a.serie_id).push(a);
  }
  return series
    .map(s => enrichir(s, parSerie.get(s.id) || []))
    .sort((a, b) => collator.compare(normaliser(a.titre), normaliser(b.titre)));
}

/* ---------- Affichage commun ---------- */

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

function carteHTML(s) {
  return '<li><a class="card" href="serie.html?id=' + encodeURIComponent(s.id) + '">' +
    '<div class="cover"><span class="cover-initials" aria-hidden="true">' + esc(initiales(s.titre)) + '</span>' +
    noteBadgeHTML(s.note) + '</div>' +
    '<div class="card-body">' +
    '<h2>' + esc(s.titre) + '</h2>' +
    '<p class="card-authors">' + esc(auteursCourts(s.auteurs)) + '</p>' +
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

/** Séries retenues par un filtre et une recherche (titre + auteurs, sans accents ni casse). */
function filtrerSeries(series, filtre, recherche) {
  const garder = FILTRES[filtre] || FILTRES.tout;
  const mots = normaliser(recherche).split(/\s+/).filter(Boolean);
  return series.filter(s => garder(s) && mots.every(m => s.texteRecherche.includes(m)));
}

function pageCollection(series) {
  const liste = document.getElementById('liste-series');
  const compteur = document.getElementById('compteur');
  const champ = document.getElementById('recherche');
  const puces = [...document.querySelectorAll('.chips [data-filtre]')];
  const vide = document.getElementById('aucun-resultat');
  const videTexte = document.getElementById('aucun-resultat-texte');

  // État initial lu dans l'URL (?q=…&filtre=…) pour pouvoir partager une vue filtrée.
  const params = new URLSearchParams(location.search);
  let filtre = FILTRES[params.get('filtre')] ? params.get('filtre') : 'tout';
  champ.value = params.get('q') || '';

  function majURL() {
    const p = new URLSearchParams();
    if (champ.value.trim()) p.set('q', champ.value.trim());
    if (filtre !== 'tout') p.set('filtre', filtre);
    const qs = p.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  function afficher() {
    const q = champ.value.trim();
    const resultats = filtrerSeries(series, filtre, q);
    puces.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filtre === filtre)));
    compteur.textContent = resultats.length + ' ' + pluriel(resultats.length, 'série') + ' · ordre alphabétique';
    liste.innerHTML = resultats.map(carteHTML).join('');
    liste.hidden = resultats.length === 0;
    vide.hidden = resultats.length > 0;
    if (!resultats.length) {
      videTexte.textContent = q
        ? 'Aucun titre ni auteur ne correspond à « ' + q + ' »' + (filtre !== 'tout' ? ' avec ce filtre.' : '.')
        : 'Aucune série ne correspond à ce filtre.';
    }
    majURL();
  }

  champ.addEventListener('input', afficher);
  puces.forEach(b => b.addEventListener('click', () => { filtre = b.dataset.filtre; afficher(); }));
  document.getElementById('effacer').addEventListener('click', () => {
    champ.value = '';
    filtre = 'tout';
    afficher();
    champ.focus();
  });
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

function serieHTML(s) {
  const statut = s.statut ? s.statut.charAt(0).toUpperCase() + s.statut.slice(1) : '';
  const tags = (statut ? '<span class="tag tag-statut">' + esc(statut) + '</span>' : '') +
    (s.genres || []).map(g => '<span class="tag">' + esc(g.charAt(0).toUpperCase() + g.slice(1)) + '</span>').join('');
  return '<div class="serie-layout">' +
    '<section class="serie-info">' +
      '<div class="serie-head">' +
        '<div class="book-cover" aria-hidden="true"><span>' + esc(initiales(s.titre)) + '</span><span>Couverture</span></div>' +
        '<div class="serie-title"><h1>' + esc(s.titre) + '</h1>' +
          '<p>' + esc((s.auteurs || []).join(', ')) + '</p>' +
          (s.editeur ? '<p class="editeur">' + esc(s.editeur) + '</p>' : '') +
          (tags ? '<div class="tags">' + tags + '</div>' : '') +
        '</div>' +
      '</div>' +
      noteHTML(s) +
      compteursHTML(s) +
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

/* ---------- Démarrage ---------- */

async function demarrer() {
  initTheme();
  const page = document.body.dataset.page;
  const contenu = document.querySelector('main');
  try {
    const series = enrichirTout(await chargerDonnees());
    afficherStatsEnTete(series);
    if (page === 'collection') pageCollection(series);
    if (page === 'serie') pageSerie(series);
  } catch (erreur) {
    afficherErreur(contenu, erreur);
  }
}

document.addEventListener('DOMContentLoaded', demarrer);
