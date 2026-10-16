// Gerente offline do app Privo Hábitos — v3 (instalação à prova de falhas)
const CACHE = 'privo-habitos-v3';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icon.svg'];

// Ao instalar: guarda cada arquivo individualmente — um erro não derruba o resto
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(ARQUIVOS.map((a) => c.add(a).catch(() => null)))
    )
  );
  self.skipWaiting();
});

// Ao atualizar: apaga versões antigas do cache
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Ao tocar numa notificação: abre o app (ou traz a janela aberta para frente)
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      if (janelas.length > 0) return janelas[0].focus();
      return self.clients.openWindow('./index.html');
    })
  );
});

// Página principal: internet primeiro, cache só se estiver offline
self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((nova) => {
          const copia = nova.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
          return nova;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }
  // Demais arquivos (são fixos): cache primeiro
  e.respondWith(
    caches.match(e.request).then((resposta) => {
      if (resposta) return resposta;
      return fetch(e.request).then((nova) => {
        const copia = nova.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return nova;
      });
    })
  );
});