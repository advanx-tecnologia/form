const SOURCE = 'https://raw.githubusercontent.com/advanx-tecnologia/form/main/google-local/';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

addEventListener('fetch', event => event.respondWith(handle(event.request)));

async function handle(request) {
  const url = new URL(request.url);
  if (url.pathname === '/google-local') {
    return Response.redirect(`${url.origin}/google-local/`, 301);
  }

  const relativePath = url.pathname.replace(/^\/google-local\//, '') || 'index.html';
  if (relativePath.includes('..')) return new Response('Not found', { status: 404 });

  const upstream = await fetch(`${SOURCE}${relativePath}`, {
    cf: relativePath === 'index.html' ? { cacheTtl: 0 } : { cacheTtl: 3600, cacheEverything: true },
    headers: { 'User-Agent': 'Advanx Google Local Form Publisher' },
  });

  if (!upstream.ok) return new Response('Not found', { status: upstream.status });

  const headers = new Headers(upstream.headers);
  headers.delete('content-security-policy');
  headers.delete('content-security-policy-report-only');
  headers.delete('x-frame-options');
  const extension = relativePath.slice(relativePath.lastIndexOf('.'));
  if (CONTENT_TYPES[extension]) headers.set('content-type', CONTENT_TYPES[extension]);
  headers.set('cache-control', relativePath === 'index.html' ? 'public, max-age=60' : 'public, max-age=3600');

  return new Response(upstream.body, { status: upstream.status, headers });
}
