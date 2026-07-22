// Offline support: network-first with cache fallback, so updates deploy
// normally and the app still opens without a connection.
const CACHE = 'a320sim-v5';
const PRECACHE = [
  './',
  './index.html',
  './cdu.html',
  './css/main.css',
  './css/cdu.css',
  './js/main.js',
  './js/cdu.js',
  './js/model.js',
  './js/sim.js',
  './js/flight.js',
  './js/navdata.js',
  './js/pfd.js',
  './js/nd.js',
  './js/sync.js',
  './js/sound.js',
  './js/components.js',
  './js/checklist.js',
  './js/ecam.js',
  './js/cdu_logic.js',
  './js/cdu_render.js',
  './js/cdu_ui.js',
  './js/panels/overhead.js',
  './js/panels/pedestal.js',
  './js/panels/fcu.js',
  './js/flight.js',
  './js/navdata.js',
  './js/pfd.js',
  './js/nd.js',
  './js/help.js',
  './manifest.webmanifest',
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  ev.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
