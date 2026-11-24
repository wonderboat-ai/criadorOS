/* ============================================================
   Wonder Boat — Service Worker
   ============================================================
   Estratégia: cache-first com revalidação em background (stale-while-revalidate).
   Após a primeira visita com internet, todo o app fica disponível offline.
   Atualizações chegam silenciosamente em background; ao detectar nova versão,
   a aplicação principal recebe notificação e pode oferecer recarregamento.

   v1.8.5 — pensado para rodar atrás do Cloudflare Access (login por código):
   - nunca intercepta /api, /auth e /cdn-cgi (login, sessão e API do Access);
   - nunca guarda resposta redirecionada (redirect para a página de login);
   - a instalação só vale se o documento principal ("./") for baixado inteiro:
     sessão vencida ou rede ruim aborta a instalação e a versão antiga (com o
     cache antigo) continua funcionando, em vez de ficar com cache vazio.
   ============================================================ */

const CACHE_VERSION = 'wonderboat-v1.8.6';
// Versão embutida no nome do cache: ao subir CACHE_VERSION, o filtro do
// activate descarta automaticamente caches de versões anteriores.
const CACHE_NAME = 'wonderboat-cache-' + CACHE_VERSION;

// Recursos essenciais do app — pré-cacheados na instalação do SW.
// Como o HTML é autocontido (libs e fontes inline em base64), apenas
// o próprio index e as fontes Google externas precisam ser cacheados.
// Nome lowercase obrigatório — GitHub Pages é case-sensitive.
const RECURSOS_PRECACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Sem estes a instalação é recusada (o resto é "melhor esforço").
// Na Cloudflare "./index.html" redireciona para "./" e por isso não é guardado.
const RECURSOS_OBRIGATORIOS = ['./'];

// Domínios externos que devem ser cacheados quando carregados pela primeira vez.
// Fontes Google são as únicas dependências externas do app.
const DOMINIOS_CACHE_EXTERNO = [
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// Caminhos do Access/API que o SW nunca toca (só existem na hospedagem Cloudflare).
const CAMINHOS_SEM_SW = /^\/(api|auth|cdn-cgi)\//;

// Resposta que vale guardar: 200 direto (não redirecionada), da mesma origem ou liberada por CORS.
function respostaCacheavel(r) {
  return !!r && r.status === 200 && !r.redirected && (r.type === 'basic' || r.type === 'cors');
}

/* ============================================================
   INSTALL — Pré-cacheia recursos essenciais
   ============================================================ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        RECURSOS_PRECACHE.map(url => {
          const obrigatorio = RECURSOS_OBRIGATORIOS.includes(url);
          // cache:'reload' ignora o cache HTTP: a instalação pega sempre a versão atual.
          return fetch(url, { cache: 'reload', credentials: 'same-origin' })
            .then(resp => {
              if (respostaCacheavel(resp)) return cache.put(url, resp);
              if (obrigatorio) throw new Error('pré-cache recusado: ' + url + ' (status ' + resp.status + ')');
              console.warn('[SW] Pré-cache ignorado:', url, resp.status, resp.redirected ? '(redirecionado)' : '');
            })
            .catch(err => {
              if (obrigatorio) throw err;   // aborta a instalação: o SW antigo continua valendo
              console.warn('[SW] Falha ao pré-cachear:', url, err.message);
            });
        })
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

  // Login, sessão e API nunca passam pelo cache.
  if (mesmaOrigem && CAMINHOS_SEM_SW.test(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(req).then(cached => {
        // Em paralelo, busca da rede para revalidar (stale-while-revalidate)
        const networkPromise = fetch(req).then(response => {
          // Só cacheia respostas válidas (200 direto, sem redirecionamento)
          if (respostaCacheavel(response)) {
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
