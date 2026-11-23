/* advanx-form.js — módulo único dos formulários Advanx (lead, UTM, máscaras, agenda, mensagens).
   Servido em https://form.advanx.com.br/assets/advanx-form.js. Mudou endpoint, agenda, máscara, texto ou CTA: editar só aqui.
   Cada página declara só a origem: <script src="https://form.advanx.com.br/assets/advanx-form.js" data-origem="advogado37d"></script>
   Sem dependência, sem credencial (as edges são públicas e validam no servidor). Regra de celular = receber-lead/lib.ts (teste de paridade). */
(function () {
  'use strict';
  var SUPABASE = 'https://rbhdpchaawbclzjcwkoe.supabase.co/functions/v1/';
  var DESKCOMM_6C = 'https://crm.advanx.com.br/api/v1/webhooks/in/K4tbswoDDTESGzDVuW16NfD8FA1jGvww'; // entrada "6 contratos em 37 dias"
  var TEXTO_6C = 'Olá! Quero confirmar minha conversa com a Advanx sobre fechar de 6 a 12 contratos em até 37 dias, com garantia de resultados. Escolhi {horario}. Vocês podem confirmar?';

  var CONFIG = {
    lead: SUPABASE + 'receber-lead',
    agenda: SUPABASE + 'agenda',
    whatsapp: 'https://wa.advanx.com.br/r',
    tempo: { lead: 15000, horarios: 12000, reserva: 30000, padrao: 20000 },
    // Um registro por formulário: nome no banco, nicho, entrada do Deskcomm e texto do WhatsApp depois de agendar.
    formularios: {
      'advogado37d': { formulario: 'Aplicação Empresas (advogado37d)', nicho: 'Advocacia', deskcomm: DESKCOMM_6C, whatsappAgendado: TEXTO_6C },
      '6-a-12-em-37d-black': { formulario: 'Aplicação Empresas (37d black)', nicho: 'Advocacia', deskcomm: DESKCOMM_6C, whatsappAgendado: TEXTO_6C },
      'implementacao-ia': { formulario: 'Implementação IA (conversa)', nicho: null, deskcomm: null, whatsappAgendado: null }
    }
  };
  var MSG = {
    envioFalhou: 'Não foi possível enviar. Tente novamente.',
    envioDemorou: 'A conexão demorou. Tente novamente.',
    concluirFalhou: 'Não foi possível concluir agora.',
    horarioOcupado: 'Esse horário não está mais disponível. Escolha outro.',
    horarioOcupadoOpcao: 'Esse horário não está mais disponível. Escolha outra opção.',
    agendarFalhou: 'Não foi possível agendar. Tente novamente.',
    carregarFalhou: 'Não foi possível carregar.',
    reservando: 'Reservando horário...'
  };

  // ---- Celular (mesma regra do servidor) ----
  var DDDS_BR = '11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' ');
  function so(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }
  function celular(v) { // '55DD9XXXXXXXX' ou ''
    var d = String(v == null ? '' : v).split('@')[0].replace(/\D/g, '');
    if (d.length === 13 && d.slice(0, 2) === '55') d = d.slice(2);
    if (d.length === 12 && d.charAt(0) === '0') d = d.slice(1);
    return /^[1-9]{2}9\d{8}$/.test(d) && DDDS_BR.indexOf(d.slice(0, 2)) !== -1 && !/^(\d)\1+$/.test(d.slice(2)) ? '55' + d : '';
  }
  function digitosCelular(v) {
    var d = so(v);
    if (d.length > 11 && d.slice(0, 2) === '55') d = d.slice(2);
    if (d.length > 11 && d.charAt(0) === '0') d = d.slice(1);
    return d.slice(0, 11);
  }

  // ---- Máscaras ----
  function encaixa(d, modelo) { // modelo com 0 = dígito
    var out = '', i = 0;
    for (var k = 0; k < modelo.length && i < d.length; k++) out += modelo.charAt(k) === '0' ? d.charAt(i++) : modelo.charAt(k);
    return out;
  }
  var mascara = {
    celular: function (v) {
      var d = digitosCelular(v); if (!d) return '';
      if (d.length < 3) return '(' + d;
      var p = '(' + d.slice(0, 2) + ') ';
      return d.length <= 7 ? p + d.slice(2) : p + d.slice(2, 7) + '-' + d.slice(7);
    },
    cpf: function (v) { return encaixa(so(v).slice(0, 11), '000.000.000-00'); },
    cnpj: function (v) { return encaixa(so(v).slice(0, 14), '00.000.000/0000-00'); },
    cep: function (v) { return encaixa(so(v).slice(0, 8), '00000-000'); }
  };
  function dv(d, pesos) { var s = 0; for (var i = 0; i < pesos.length; i++) s += Number(d.charAt(i)) * pesos[i]; var r = s % 11; return r < 2 ? 0 : 11 - r; }
  var valida = {
    celular: function (v) { return !!celular(v); },
    cpf: function (v) {
      var d = so(v); if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
      return dv(d, [10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d.charAt(9)) && dv(d, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d.charAt(10));
    },
    cnpj: function (v) {
      var d = so(v); if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
      return dv(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d.charAt(12)) && dv(d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d.charAt(13));
    },
    cep: function (v) { return /^\d{8}$/.test(so(v)); }
  };
  var LIMITE = { celular: 25, cpf: 14, cnpj: 18, cep: 9 };
  // <input data-mascara="celular|cpf|cnpj|cep">: máscara ao digitar e colar, limite de caracteres e teclado numérico.
  function aplicarMascaras(raiz) {
    var els = (raiz || document).querySelectorAll('input[data-mascara]');
    for (var i = 0; i < els.length; i++) (function (el) {
      var tipo = el.getAttribute('data-mascara'); if (!mascara[tipo] || el._advanxMascara) return;
      el._advanxMascara = true; el.setAttribute('inputmode', 'numeric'); if (!el.maxLength || el.maxLength < 0) el.maxLength = LIMITE[tipo];
      el.addEventListener('input', function () { el.value = mascara[tipo](el.value); });
    })(els[i]);
  }

  // ---- UTM e cliques ----
  function utm() {
    var q = new URLSearchParams(location.search), g = function (k) { var v = q.get(k); return v ? v.slice(0, 250) : null; };
    return {
      utm_source: g('utm_source') || g('source'), utm_medium: g('utm_medium'), utm_campaign: g('utm_campaign'),
      utm_content: g('utm_content'), utm_term: g('utm_term'), utm_placement: g('utm_placement') || g('placement'),
      fbclid: g('fbclid'), gclid: g('gclid'), gbraid: g('gbraid'), wbraid: g('wbraid'), src: g('src')
    };
  }

  // ---- Rede ----
  function postJson(url, body, timeout, opcoes) {
    var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, timeout || CONFIG.tempo.padrao);
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal, keepalive: !!(opcoes && opcoes.keepalive) })
      .then(function (r) {
        return r.text().then(function (t) {
          var data = {}; try { data = t ? JSON.parse(t) : {}; } catch (_) { data = {}; }
          if (!r.ok || data.ok !== true) { var e = new Error(r.status === 409 ? MSG.horarioOcupadoOpcao : MSG.concluirFalhou); e.status = r.status; throw e; }
          return data;
        });
      })
      .finally(function () { clearTimeout(timer); });
  }

  // ---- Formulário atual ----
  var tag = document.currentScript || document.querySelector('script[data-origem]');
  var origem = tag && tag.getAttribute('data-origem') || '';
  var form = CONFIG.formularios[origem] || null;
  function exigirForm() { if (!form) throw new Error('advanx-form: data-origem desconhecida (' + origem + ')'); return form; }

  // Lead no banco novo (edge receber-lead). campos: nome, telefone, email, area, colaboradores, faturamento, instagram, empresa, submission_id, respostas{}.
  function enviarLead(campos, opcoes) {
    var f = exigirForm(), u = utm(), hp = document.getElementById('site_extra'), r = {}, k;
    var respostas = campos.respostas || {};
    for (k in respostas) if (Object.prototype.hasOwnProperty.call(respostas, k)) r[k] = respostas[k];
    if (!('posicionamento' in r)) r.posicionamento = u.utm_placement;
    r.pagina = location.pathname;
    var body = { formulario: f.formulario, nicho: f.nicho };
    for (k in campos) if (k !== 'respostas' && Object.prototype.hasOwnProperty.call(campos, k)) body[k] = campos[k];
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'gbraid', 'wbraid'].forEach(function (c) { body[c] = u[c]; });
    body.site_extra = hp ? hp.value : '';
    body.respostas = r;
    return postJson(CONFIG.lead, body, (opcoes && opcoes.timeout) || CONFIG.tempo.lead, opcoes);
  }

  // Lead no Deskcomm (entrada do formulário, no-cors). opcoes.beacon: ao fechar a aba.
  function enviarDeskcomm(campos, opcoes) {
    var f = exigirForm(); if (!f.deskcomm) return Promise.resolve(false);
    var u = utm(), q = new URLSearchParams(location.search), todos = {}, k;
    for (k in campos) if (Object.prototype.hasOwnProperty.call(campos, k)) todos[k] = campos[k];
    todos.utm_source = q.get('utm_source'); todos.utm_medium = u.utm_medium; todos.utm_campaign = u.utm_campaign;
    todos.utm_content = u.utm_content; todos.utm_term = u.utm_term; todos.utm_placement = u.utm_placement;
    todos.utm_fbclid = u.fbclid; todos.utm_gclid = u.gclid; todos.pagina = location.pathname;
    var dados = new URLSearchParams();
    for (k in todos) if (todos[k]) dados.append(k, todos[k]);
    try {
      if (opcoes && opcoes.beacon && navigator.sendBeacon) { navigator.sendBeacon(f.deskcomm, dados); return Promise.resolve(true); }
      return fetch(f.deskcomm, { method: 'POST', mode: 'no-cors', body: dados, keepalive: true }).then(function () { return true; }, function () { return false; });
    } catch (_) { return Promise.resolve(false); }
  }

  // Agenda (edge agenda): horários livres e reserva.
  var agenda = {
    horarios: function () {
      var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, CONFIG.tempo.horarios);
      return fetch(CONFIG.agenda + '?t=' + Date.now(), { headers: { Accept: 'application/json' }, signal: ctrl.signal })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok || d.ok === false) throw new Error('agenda'); return d; }); })
        .finally(function () { clearTimeout(timer); });
    },
    reservar: function (body) { return postJson(CONFIG.agenda, body, CONFIG.tempo.reserva); }
  };

  function whatsapp(texto) { return CONFIG.whatsapp + (texto ? '?text=' + encodeURIComponent(texto) : ''); }
  function whatsappAgendado(horario) { var f = exigirForm(); return whatsapp(f.whatsappAgendado ? f.whatsappAgendado.replace('{horario}', horario) : ''); }

  window.AdvanxForm = {
    versao: '2026-11-23', origem: origem, form: form, config: CONFIG, msg: MSG,
    celular: celular, digitosCelular: digitosCelular, mascara: mascara, valida: valida, aplicarMascaras: aplicarMascaras,
    utm: utm, postJson: postJson, enviarLead: enviarLead, enviarDeskcomm: enviarDeskcomm, agenda: agenda,
    whatsapp: whatsapp, whatsappAgendado: whatsappAgendado
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { aplicarMascaras(); });
  else aplicarMascaras();
})();
