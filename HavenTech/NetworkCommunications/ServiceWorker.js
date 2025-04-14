

//https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
//may need https for the offline caching functionality
//https://developer.chrome.com/docs/workbox/caching-strategies-overview/

//https://css-tricks.com/the-difference-between-web-sockets-web-workers-and-service-workers/
//Service Worker - "A type of Web Worker that creates a background service that acts middleware for handling network requests between the browser and server, even in offline situations."

//https://web.dev/service-workers-cache-storage/

//maybe not necessarily needed because the http cache caches most things by default

//below is from another tutorial

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js');
  });
}


var CACHE_NAME = 'my-offline-cache';
var urlsToCache = [
  '/',
  '/static/css/main.c9699bb9.css',
  '/static/js/main.99348925.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request).catch(function() {
      caches.match(event.request).then(function(response) {
        return response;
      }
    );
  );
});
