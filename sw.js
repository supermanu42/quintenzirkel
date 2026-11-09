'use strict';

/* Service Worker: legt alle App-Dateien in den Cache, damit die App offline läuft.
 * Nach Änderungen an Dateien die Versionsnummer CACHE erhöhen. */
const CACHE = 'quintenzirkel-v71';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/util.js',
  './js/theory.js',
  './js/circle.js',
  './js/staff.js',
  './js/keyboard.js',
  './js/fretboard.js',
  './js/table.js',
  './js/audio.js',
  './js/finder.js',
  './js/chords.js',
  './js/panels.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
