/* Tracking específico desta aplicação. Sem PII e adiado para proteger a renderização inicial. */
(function (window, document) {
  'use strict';
  if (window.AdvanxTracking) return;

  var GTM_ID = 'GTM-KXPZNRHK';
  var META_PIXEL_ID = '502759528362336';
  var GA4_ID = 'G-98EL5GXG5F';
  var fired = new Set();
  var pendentes = [];
  var inicializado = false;
  window.dataLayer = window.dataLayer || [];

  function inserir(src) {
    var script = document.createElement('script');
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  }

  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  function instalarFilaMeta() {
    if (window.fbq) return;
    var fbq = window.fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    window._fbq = window._fbq || fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    inserir('https://connect.facebook.net/en_US/fbevents.js');
  }

  function persistirFbclid() {
    var fbclid = new URLSearchParams(window.location.search).get('fbclid');
    var temFbc = /(?:^|;\s*)_fbc=/.test(document.cookie);
    if (!fbclid || temFbc) return;
    document.cookie = [
      '_fbc=' + encodeURIComponent('fb.1.' + Date.now() + '.' + fbclid),
      'path=/', 'domain=.advanx.com.br', 'max-age=' + (60 * 60 * 24 * 90), 'SameSite=Lax', 'Secure'
    ].join('; ');
  }

  function enviarDestino(nome, dados) {
    if (nome === 'page_view') {
      window.fbq('track', 'PageView', dados);
      window.gtag('event', 'page_view', Object.assign({ send_to: GA4_ID }, dados));
    } else if (nome === 'view_content') {
      window.fbq('track', 'ViewContent', dados);
      window.gtag('event', 'view_content', Object.assign({ send_to: GA4_ID }, dados));
    } else if (nome === 'form_start') {
      window.fbq('trackCustom', 'FormStart', dados);
      window.gtag('event', 'form_start', Object.assign({ send_to: GA4_ID }, dados));
    } else if (nome === 'generate_lead') {
      window.fbq('track', 'Lead', dados);
      window.gtag('event', 'generate_lead', Object.assign({ send_to: GA4_ID }, dados));
    } else if (nome === 'schedule') {
      window.fbq('track', 'Schedule', dados);
      window.gtag('event', 'schedule', Object.assign({ send_to: GA4_ID }, dados));
    }
  }

  function inicializar() {
    if (inicializado) return;
    inicializado = true;
    persistirFbclid();
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    inserir('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(GTM_ID));
    instalarFilaMeta();
    window.fbq('init', META_PIXEL_ID);
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID, { send_page_view: false });
    inserir('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID));
    pendentes.forEach(function (evento) { enviarDestino(evento.nome, evento.dados); });
    pendentes = [];
  }

  function emitir(nome, dados) {
    var chave = nome + ':' + (dados && dados.submission_id ? dados.submission_id : location.pathname);
    if (fired.has(chave)) return;
    fired.add(chave);
    var seguro = Object.assign({ event: nome, form_path: location.pathname }, dados || {});
    window.dataLayer.push(seguro);
    if (inicializado) enviarDestino(nome, seguro);
    else pendentes.push({ nome: nome, dados: seguro });
  }

  window.AdvanxTracking = { emit: emitir };
  emitir('page_view');
  emitir('view_content');

  ['pointerdown', 'keydown', 'touchstart'].forEach(function (evento) {
    window.addEventListener(evento, inicializar, { once: true, passive: true });
  });
  window.setTimeout(inicializar, 4000);
})(window, document);
