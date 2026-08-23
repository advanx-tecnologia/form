/* Shared tracking contract for static forms on form.advanx.com.br. No PII. */
(function (window, document) {
  'use strict';
  if (window.AdvanxTracking) return;

  var GTM_ID = 'GTM-KXPZNRHK';
  var META_PIXEL_ID = '502759528362336';
  var GA4_ID = 'G-98EL5GXG5F';
  var fired = new Set();
  window.dataLayer = window.dataLayer || [];

  function insert(src) {
    var script = document.createElement('script');
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  }

  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  function installMetaQueue() {
    if (window.fbq) return;
    var fbq = window.fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    window._fbq = window._fbq || fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    insert('https://connect.facebook.net/en_US/fbevents.js');
  }

  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  insert('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(GTM_ID));
  installMetaQueue();
  window.fbq('init', META_PIXEL_ID);
  window.gtag('js', new Date());
  window.gtag('config', GA4_ID, { send_page_view: false });
  insert('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID));

  function destinationEvent(name, data) {
    if (name === 'page_view') {
      window.fbq('track', 'PageView', data);
      window.gtag('event', 'page_view', data);
    } else if (name === 'view_content') {
      window.fbq('track', 'ViewContent', data);
      window.gtag('event', 'view_content', data);
    } else if (name === 'form_start') {
      window.fbq('trackCustom', 'FormStart', data);
      window.gtag('event', 'form_start', data);
    } else if (name === 'generate_lead') {
      window.fbq('track', 'Lead', data);
      window.gtag('event', 'generate_lead', data);
    } else if (name === 'schedule') {
      window.fbq('track', 'Schedule', data);
      window.gtag('event', 'schedule', data);
    }
  }

  function emit(name, data) {
    var key = name + ':' + (data && data.submission_id ? data.submission_id : location.pathname);
    if (fired.has(key)) return;
    fired.add(key);
    var safe = Object.assign({ event: name, form_path: location.pathname }, data || {});
    window.dataLayer.push(safe);
    destinationEvent(name, safe);
  }

  window.AdvanxTracking = { emit: emit };
  emit('page_view');
  emit('view_content');
})(window, document);
