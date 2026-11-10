/* Service worker — Painel (/) e App da cliente (/cliente) · Nexosys */
const VERSAO = 'nexo-studio-v8';
// B = pasta do app ("/" local, "/studio-sobrancelhas/" no GitHub Pages)
const B = new URL('./', self.location).pathname;
const SHELL = ['', 'index.html', 'cliente/', 'cliente/index.html', 'assets/styles.css', 'assets/core.js', 'assets/ui.js', 'assets/painel.js', 'assets/cliente.js',
  'manifest-painel.webmanifest', 'cliente/manifest.webmanifest', 'icons/painel.svg', 'icons/cliente.svg', 'icons/painel-192.png', 'icons/cliente-192.png', 'icons/badge.png'].map(p => B + p);

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Páginas e código do app: rede primeiro (sempre atualizado), cache quando offline
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSAO).then(c => c.put(req, cp)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match(url.pathname.startsWith(B + 'cliente') ? B + 'cliente/index.html' : B + 'index.html'))));
    return;
  }
  // Fontes do Google: cache primeiro
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const cp = res.clone(); caches.open(VERSAO).then(c => c.put(req, cp)); return res; })));
  }
});

/* Web Push: em produção o servidor envia lembretes e aprovações mesmo com o app fechado (chaves VAPID). */
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) { d = { titulo: 'Studio', texto: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Studio', { body: d.texto || '', icon: d.icone || B + 'icons/cliente-192.png', badge: B + 'icons/badge.png', data: { url: d.url || B + 'cliente/#/horarios' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const alvo = new URL((e.notification.data && e.notification.data.url) || B, location.origin).href;
  const raiz = u => new URL(u).pathname.startsWith(B + 'cliente') ? 'cliente' : 'painel';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    const w = ws.find(x => raiz(x.url) === raiz(alvo));
    if (w) { if (w.navigate) w.navigate(alvo).catch(() => {}); return w.focus(); }
    return self.clients.openWindow(alvo);
  }));
});
