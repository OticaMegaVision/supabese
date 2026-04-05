// ╔══════════════════════════════════════════════════════════════╗
// ║  ÓticaVision Pro — Service Worker                           ║
// ║  Estratégia: Cache-First para assets, Network-First para API║
// ║  Versão: 3.0 (Local-First)                                  ║
// ╚══════════════════════════════════════════════════════════════╝

const CACHE_NAME     = 'oticavision-v3';
const CACHE_STATIC   = 'oticavision-static-v3';
const CACHE_DYNAMIC  = 'oticavision-dynamic-v3';

// Assets que SEMPRE devem estar em cache (app shell)
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
];

// CDNs externas que cacheamos para uso offline
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/dexie@3/dist/dexie.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];

// ── INSTALL: pré-cacheia o app shell ──────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Instalando v3...');
  event.waitUntil(
    Promise.all([
      // Cache estático obrigatório
      caches.open(CACHE_STATIC).then(cache => {
        console.log('[SW] Cache estático...');
        return cache.addAll(STATIC_ASSETS).catch(e => {
          console.warn('[SW] Alguns assets falharam no cache:', e);
        });
      }),
      // Cache CDNs em paralelo (não bloqueia install se falhar)
      caches.open(CACHE_DYNAMIC).then(cache => {
        return Promise.allSettled(
          CDN_ASSETS.map(url =>
            fetch(url, { mode: 'cors' })
              .then(res => { if (res.ok) cache.put(url, res); })
              .catch(() => {/* CDN offline na instalação: ok */})
          )
        );
      })
    ]).then(() => {
      console.log('[SW] Instalação concluída ✅');
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE: limpa caches antigas ────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Ativando v3...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_STATIC && key !== CACHE_DYNAMIC)
          .map(key => {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      console.log('[SW] Ativação concluída ✅');
      return self.clients.claim();
    })
  );
});

// ── FETCH: estratégia inteligente por tipo de recurso ─────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignora requests não-GET
  if (event.request.method !== 'GET') return;

  // Ignora requests do Supabase (dados) — sempre vai para rede
  if (url.hostname.includes('supabase.co')) return;

  // Ignora requests de extensões e chrome-extension
  if (!url.protocol.startsWith('http')) return;

  // ── App Shell (index.html, manifest) — Cache-First com fallback ──
  if (url.pathname.endsWith('index.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        // Retorna cache imediatamente e atualiza em background
        if (cached) {
          fetch(event.request)
            .then(res => {
              if (res && res.ok) {
                caches.open(CACHE_STATIC).then(c => c.put(event.request, res));
              }
            })
            .catch(() => {});
          return cached;
        }
        // Sem cache: tenta rede
        return fetch(event.request).then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_STATIC).then(c => c.put(event.request, clone));
          }
          return res;
        }).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // ── CDNs (Font Awesome, jsPDF etc.) — Cache-First ──
  const isCDN = CDN_ASSETS.some(cdnUrl => event.request.url.startsWith(cdnUrl.split('?')[0]))
    || url.hostname.includes('cdnjs.cloudflare.com')
    || url.hostname.includes('cdn.jsdelivr.net')
    || url.hostname.includes('fonts.googleapis.com')
    || url.hostname.includes('fonts.gstatic.com');

  if (isCDN) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_DYNAMIC).then(c => c.put(event.request, clone));
          }
          return res;
        }).catch(() => {
          console.warn('[SW] CDN offline e sem cache:', event.request.url);
          return new Response('/* offline */', { headers: { 'Content-Type': 'text/javascript' } });
        });
      })
    );
    return;
  }

  // ── Ícones e imagens locais — Cache-First ──
  if (url.pathname.startsWith('/icons/') || url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_STATIC).then(c => c.put(event.request, clone));
          }
          return res;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // ── Demais requests — Network-First com fallback para cache ──
  event.respondWith(
    fetch(event.request).then(res => {
      if (res && res.ok) {
        const clone = res.clone();
        caches.open(CACHE_DYNAMIC).then(c => c.put(event.request, clone));
      }
      return res;
    }).catch(() => {
      return caches.match(event.request).then(cached => {
        return cached || new Response(
          JSON.stringify({ error: 'offline', message: 'Sem conexão' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      });
    })
  );
});

// ── BACKGROUND SYNC ───────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('[SW] Background sync disparado');
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'BACKGROUND_SYNC' });
        });
      })
    );
  }
});

// ── PUSH NOTIFICATIONS (preparado para uso futuro) ────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'ÓticaVision Pro', {
        body:    data.body    || '',
        icon:    './icons/icon-192x192.png',
        badge:   './icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data:    { url: data.url || './' }
      })
    );
  } catch(e) {}
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || './')
  );
});

// ── MENSAGENS DO APP ──────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting — atualizando...');
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_NAME });
  }
});

console.log('[SW] Service Worker ÓticaVision Pro v3 carregado ✅');
