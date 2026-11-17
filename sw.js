/* Service worker (US-28) : site installable et consultable hors ligne.
   - Pages, CSS, JS et icônes : mis en cache à l'installation. Les pages sont servies
     réseau d'abord (pour voir tout de suite un déploiement), le cache en secours.
   - data/*.json : réseau d'abord, le cache en secours, avec l'en-tête X-Bd-Hors-Ligne
     (date des données) pour que le site affiche « Hors ligne : données du … ».
   - Couvertures et polices : gardées au fil des visites (cache d'abord).
   VERSION doit valoir le N de ?v=N des pages : scripts/verifier_donnees.py le contrôle. */
'use strict';

const VERSION = 15;
const CACHE_SITE = 'bd-site-v' + VERSION;
const CACHE_DONNEES = 'bd-donnees';
const CACHE_IMAGES = 'bd-images';
const MAX_IMAGES = 200;

const PAGES = ['index.html', 'serie.html', 'stats.html', 'bilan.html', 'reco.html', 'auteur.html'];
const FICHIERS = ['./', ...PAGES, 'css/style.css?v=' + VERSION, 'js/app.js?v=' + VERSION, 'manifest.webmanifest',
  'img/icone.svg', 'img/icone-192.png', 'img/icone-512.png', 'img/apple-touch-icon.png'];
const DONNEES = ['data/series.json', 'data/albums.json', 'data/reco.json', 'data/couvertures.json'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const site = await caches.open(CACHE_SITE);
    await site.addAll(FICHIERS);
    // Données : au mieux, pour qu'une première visite suffise à tout consulter hors ligne.
    const donnees = await caches.open(CACHE_DONNEES);
    await Promise.all(DONNEES.map(d => fetch(d, { cache: 'no-cache' }).then(r => r.ok && donnees.put(d, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.filter(n => n.startsWith('bd-site-v') && n !== CACHE_SITE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

/** Réseau d'abord ; en cas d'échec, la copie en cache (marquée hors ligne pour les données). */
async function reseauDabord(requete, nomCache, cle, marquer) {
  const cache = await caches.open(nomCache);
  try {
    const reponse = await fetch(requete);
    if (reponse.ok) await cache.put(cle, reponse.clone());
    return reponse;
  } catch (erreur) {
    const copie = await cache.match(cle, { ignoreSearch: !marquer });
    if (!copie) throw erreur;
    if (!marquer) return copie;
    const entetes = new Headers(copie.headers);
    entetes.set('X-Bd-Hors-Ligne', copie.headers.get('date') || 'inconnue');
    return new Response(await copie.blob(), { status: copie.status, statusText: copie.statusText, headers: entetes });
  }
}

/** Cache d'abord, puis le réseau (images, polices) ; on limite le nombre d'images gardées. */
async function cacheDabord(requete, nomCache) {
  const cache = await caches.open(nomCache);
  const copie = await cache.match(requete);
  if (copie) return copie;
  const reponse = await fetch(requete);
  if (reponse.ok || reponse.type === 'opaque') {
    await cache.put(requete, reponse.clone());
    const cles = await cache.keys();
    if (cles.length > MAX_IMAGES) await cache.delete(cles[0]);
  }
  return reponse;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const memeOrigine = url.origin === self.location.origin;
  const chemin = memeOrigine ? url.pathname.slice(new URL(self.registration.scope).pathname.length) : '';

  if (memeOrigine && chemin.startsWith('data/') && chemin.endsWith('.json')) {
    e.respondWith(reseauDabord(req, CACHE_DONNEES, chemin, true));
  } else if (memeOrigine && (req.mode === 'navigate' || chemin.endsWith('.html') || chemin === '')) {
    // Pages : la page sans ses paramètres (serie.html?id=…) sert pour toutes les séries.
    e.respondWith(reseauDabord(req, CACHE_SITE, chemin || 'index.html', false)
      .catch(() => caches.match('index.html', { ignoreSearch: true })));
  } else if (memeOrigine) {
    e.respondWith(caches.match(req).then(c => c || fetch(req)));
  } else if (req.destination === 'image' || req.destination === 'font' || url.hostname === 'fonts.googleapis.com') {
    e.respondWith(cacheDabord(req, CACHE_IMAGES).catch(() => Response.error()));
  }
});
