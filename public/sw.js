/* INP CHESS service worker — app shell + assets em cache para modo offline */
const CACHE = 'inpchess-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([
      '/', '/login', '/jogar', '/treinar', '/puzzles', '/academy',
      '/ranking', '/perfil', '/torneios',
    ])).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // nunca cachear API do Supabase nem métodos não-GET
  if (e.request.method !== 'GET' || url.hostname.endsWith('supabase.co')) return;

  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res.ok && (url.origin === self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    }),
  );
});
