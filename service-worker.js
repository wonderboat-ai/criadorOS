/* ============================================================
   Wonder Boat — Service Worker
   ============================================================
   Estratégia: cache-first com revalidação em background (stale-while-revalidate).
   Após a primeira visita com internet, todo o app fica disponível offline.
   Atualizações chegam silenciosamente em background; ao detectar nova versão,
   a aplicação principal recebe notificação e pode oferecer recarregamento.
   ============================================================ */

const CACHE_VERSION = 'wonderboat-v1.0.7';
// Versão embutida no nome do cache: ao subir CACHE_VERSION, o filtro do
// activate descarta automaticamente caches de versões anteriores.
const CACHE_NAME = 'wonderboat-cache-' + CACHE_VERSION;

// Recursos essenciais do app — pré-cacheados na instalação do SW.
// Como o HTML é autocontido (libs e fontes inline em base64), apenas
// o próprio index e as fontes Google externas precisam ser cacheados.
const RECURSOS_PRECACHE = [
  './',
  './index.html',
  './Index.html',
  './manifest.json'
];

// Domínios externos que devem ser cacheados quando carregados pela primeira vez.
// Fontes Google são as únicas dependências externas do app.
const DOMINIOS_CACHE_EXTERNO = [
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

/* ============================================================
   INSTALL — Pré-cacheia recursos essenciais
   ============================================================ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // addAll é atômico — se um recurso falhar, nenhum é cacheado.
      // Para resiliência, usamos tentativas individuais com fallback gracioso.
      return Promise.all(
        RECURSOS_PRECACHE.map(url =>
          cache.add(url).catch(err => {
            console.warn('[SW] Falha ao pré-cachear:', url, err.message);
          })
        )
      );
    }).then(() => {
      // Ativa imediatamente sem esperar reload manual
      return self.skipWaiting();
    })
  );
});

/* ============================================================
   ACTIVATE — Limpa caches antigos
   ============================================================ */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => {
      // Toma controle imediato de todas as abas abertas
      return self.clients.claim();
    })
  );
});

/* ============================================================
   FETCH — Estratégia cache-first com revalidação em background
   ============================================================ */
self.addEventListener('fetch', event => {
  const req = event.request;

  // Só intercepta GET — POST, PUT, DELETE não devem ser cacheados.
  if (req.method !== 'GET') return;

  // Filtra apenas mesma origem + domínios externos permitidos
  const url = new URL(req.url);
  const mesmaOrigem = url.origin === self.location.origin;
  const dominioPermitido = DOMINIOS_CACHE_EXTERNO.some(d => url.hostname.includes(d));
  if (!mesmaOrigem && !dominioPermitido) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(req).then(cached => {
        // Em paralelo, busca da rede para revalidar (stale-while-revalidate)
        const networkPromise = fetch(req).then(response => {
          // Só cacheia respostas válidas (status 200 e tipo basic/cors)
          if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
            cache.put(req, response.clone()).catch(err => {
              // Quotas excedidas, etc. — falha silenciosa, não quebra fluxo.
              console.warn('[SW] Falha ao cachear:', req.url, err.message);
            });
          }
          return response;
        }).catch(err => {
          // Sem rede — se há cache, ele será usado abaixo. Senão, propaga erro.
          if (!cached) throw err;
          return null;
        });

        // Cache-first: retorna cache imediatamente se existe.
        // Network rola em background revalidando para próxima visita.
        return cached || networkPromise;
      });
    })
  );
});

/* ============================================================
   MESSAGE — Comunicação app ↔ service worker
   ============================================================ */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0] && event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});
