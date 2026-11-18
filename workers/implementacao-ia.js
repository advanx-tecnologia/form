// form.advanx.com.br/implementacao-ia/ — the conversation now lives inside the page (18/11, ok do Rafael).
// Every path under the old route redirects (301) to the page section, keeping the query string (UTMs).
// Rollback: deploy the previous version of this file (git history) with scripts-trabalho/worker.ts.
const TARGET = 'https://advanx.com.br/implementacao-ia/';

addEventListener('fetch', event => event.respondWith(handle(event.request)));

function handle(request) {
  const url = new URL(request.url);
  return new Response(null, {
    status: 301,
    headers: {location: `${TARGET}${url.search}#diagnostico`, 'cache-control': 'public, max-age=300'},
  });
}
