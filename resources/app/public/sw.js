// sw.js - SolarERP PWA Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let the browser handle standard fetching, simple pass-through.
  // This satisfies PWA install triggers on Android/Chrome/Safari.
  event.respondWith(fetch(event.request));
});
