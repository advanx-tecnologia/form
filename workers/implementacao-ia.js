// form.advanx.com.br/implementacao-ia/ — serves the static route from the main branch of this repo
// (same pattern as the other form workers). The form API lives at /api/implementacao-ia/ on the VPS origin.
const SOURCE = 'https://raw.githubusercontent.com/advanx-tecnologia/form/main/implementacao-ia/';
const BASE = '/implementacao-ia';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
};

addEventListener('fetch', event => event.respondWith(handle(event.request)));

async function handle(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', {status: 405});
  if (url.pathname === BASE) return Response.redirect(`${url.origin}${BASE}/${url.search}`, 301);

  const relativePath = url.pathname.slice(BASE.length + 1) || 'index.html';
  const extension = relativePath.includes('.') ? relativePath.slice(relativePath.lastIndexOf('.')) : '';
  if (relativePath.includes('..') || !CONTENT_TYPES[extension]) return new Response('Not found', {status: 404});

  const isIndex = relativePath === 'index.html';
  const upstream = await fetch(`${SOURCE}${relativePath}`, {
    cf: isIndex ? {cacheTtl: 0} : {cacheTtl: 300, cacheEverything: true},
    headers: {'User-Agent': 'Advanx Implementacao IA Form Publisher'},
  });
  if (!upstream.ok) return new Response('Not found', {status: upstream.status === 404 ? 404 : 502});

  const headers = new Headers(upstream.headers);
  for (const h of ['content-security-policy', 'content-security-policy-report-only', 'x-frame-options', 'access-control-allow-origin', 'cross-origin-resource-policy', 'x-github-request-id', 'source-age', 'x-cache', 'x-cache-hits', 'x-fastly-request-id', 'x-served-by', 'x-timer', 'via', 'etag']) headers.delete(h);
  headers.set('content-type', CONTENT_TYPES[extension]);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('cache-control', isIndex ? 'public, max-age=60' : 'public, max-age=300');
  return new Response(request.method === 'HEAD' ? null : upstream.body, {status: 200, headers});
}
