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

function pageCollection(series) {
  const liste = document.getElementById('liste-series');
  const compteur = document.getElementById('compteur');
  compteur.textContent = series.length + ' ' + pluriel(series.length, 'série') + ' · ordre alphabétique';
  liste.innerHTML = series.map(carteHTML).join('');
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
  } catch (erreur) {
    afficherErreur(contenu, erreur);
  }
}

document.addEventListener('DOMContentLoaded', demarrer);
