// Conversation form: one question at a time. The server validates and saves every answer;
// the browser holds no credentials and pushes only events without personal data to GTM.
import {questions, opening, next, validate} from './flow.js';

const API = document.querySelector('meta[name="ia-api"]')?.content || '/api/implementacao-ia/';
const WHATSAPP = 'https://wa.advanx.com.br/r';
const box = document.querySelector('#conversation');
const history = document.querySelector('#history');
const status = document.querySelector('#status');
const ATTR = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'gbraid', 'wbraid'];
const attribution = Object.fromEntries([...new URLSearchParams(location.search)].filter(([k]) => ATTR.includes(k)).map(([k, v]) => [k, v.slice(0, 250)]));

let token = sessionStorage.getItem('ia-session');
let state = {answers: {}};
let busy = false;

function track(event, extra = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({event, form_name: 'implementacao_ia', ...extra});
}

function once(name, fn) {
  const key = 'ia-ev-' + name;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  fn();
}

function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

const say = q => typeof q.text === 'function' ? q.text(state.answers) : q.text;
const first = name => String(name || '').trim().split(/\s+/)[0];

async function api(route, payload) {
  const r = await fetch(API + route, {
    method: payload ? 'POST' : 'GET',
    headers: {...(payload ? {'Content-Type': 'application/json'} : {}), ...(token ? {Authorization: 'Bearer ' + token} : {})},
    ...(payload ? {body: JSON.stringify(payload)} : {}),
    signal: AbortSignal.timeout(30000),
  });
  let j = {};
  try { j = await r.json(); } catch { /* handled below */ }
  if (r.status === 401) { sessionStorage.removeItem('ia-session'); token = null; }
  if (!r.ok || !j.ok) throw new Error(j.message || 'Não foi possível salvar. Tente novamente.');
  return j;
}

function retryButton(label, fn) {
  const b = el('button', label, 'btn');
  b.type = 'button';
  b.onclick = fn;
  return b;
}

function renderHistory() {
  history.replaceChildren(el('div', opening, 'bubble'));
  const view = {...state.answers};
  for (const key of Object.keys(questions)) {
    if (!(key in view)) continue;
    const q = questions[key];
    history.append(el('div', typeof q.text === 'function' ? q.text(view) : q.text, 'bubble'));
    const v = view[key];
    history.append(el('div', key === 'phone' ? '+55 ' + v.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') : Array.isArray(v) ? v.join(' · ') : v, 'answer'));
  }
}

function render() {
  box.replaceChildren();
  box.onsubmit = e => e.preventDefault();
  status.textContent = '';
  renderHistory();
  const key = state.next || next(state.answers);
  if (key === 'end') return finishWithoutProfile();
  if (key === 'calendar') return calendar();
  ask(key);
}

function ask(key) {
  const q = questions[key];
  const label = el('div', say(q), 'bubble');
  label.id = 'pergunta';
  label.tabIndex = -1;
  box.append(label);
  let selected = Array.isArray(state.answers[key]) ? [...state.answers[key]] : [];
  let field;
  const button = el('button', 'Continuar', 'btn');
  button.type = 'submit';

  if (q.options) {
    const group = el('div', undefined, 'options');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-labelledby', 'pergunta');
    for (const text of q.options) {
      const b = el('button', text, 'option');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(selected.includes(text)));
      b.onclick = () => {
        if (busy) return;
        if (q.multi) {
          selected = selected.includes(text) ? selected.filter(x => x !== text) : [...selected, text];
          b.setAttribute('aria-pressed', String(selected.includes(text)));
        } else {
          selected = [text];
          group.querySelectorAll('.option').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
          submit();
        }
      };
      group.append(b);
    }
    box.append(group);
    if (q.multi) box.append(button);
  } else {
    const wrap = el('div', undefined, key === 'phone' ? 'field phone' : 'field');
    if (key === 'phone') wrap.append(el('span', '+55', 'ddi'));
    field = el(q.type === 'textarea' ? 'textarea' : 'input');
    if (q.type !== 'textarea') field.type = q.type || 'text';
    field.placeholder = q.placeholder;
    field.setAttribute('aria-labelledby', 'pergunta');
    field.required = true;
    field.maxLength = key === 'pain' ? 2000 : 200;
    if (q.autocomplete) field.autocomplete = q.autocomplete;
    if (key === 'phone') field.inputMode = 'tel';
    if (key === 'email') field.inputMode = 'email';
    if (key === 'personal' || key === 'business') { field.autocapitalize = 'none'; field.spellcheck = false; }
    wrap.append(field);
    box.append(wrap, button);
  }

  async function submit() {
    if (busy) return;
    let value;
    try {
      value = validate(key, q.options ? (q.multi ? selected : selected[0]) : field.value);
    } catch (e) {
      status.textContent = e.message;
      field?.setAttribute('aria-invalid', 'true');
      field?.focus();
      return;
    }
    busy = true;
    button.disabled = true;
    status.textContent = 'Salvando…';
    try {
      const j = await api('answer', {key, value});
      once('form_start', () => track('form_start'));
      if (j.lead_event) once('generate_lead', () => track('generate_lead', {event_id: j.event_id}));
      state = j;
      render();
    } catch (e) {
      status.textContent = e.message;
      if (!token) box.append(retryButton('Começar de novo', () => location.reload()));
    } finally {
      busy = false;
      button.disabled = false;
    }
  }

  box.onsubmit = e => { e.preventDefault(); submit(); };
  label.focus({preventScroll: true});
  (field || label).scrollIntoView({block: 'center', behavior: 'instant'});
  field?.focus({preventScroll: true});
}

function finishWithoutProfile() {
  const msg = el('div', undefined, 'bubble');
  msg.append(el('p', `Obrigado, ${first(state.answers.name)}! Pelo que você contou, a implementação ainda não é o melhor passo para você agora.`),
    el('p', 'Quando o momento mudar, é só preencher de novo. A gente vai gostar de conversar.'));
  msg.tabIndex = -1;
  box.append(msg);
  msg.focus({preventScroll: true});
  msg.scrollIntoView({block: 'center', behavior: 'instant'});
}

const dayFmt = new Intl.DateTimeFormat('pt-BR', {timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit'});
const dayLong = new Intl.DateTimeFormat('pt-BR', {timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long'});
const hourFmt = new Intl.DateTimeFormat('pt-BR', {timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit'});

function booked(start) {
  box.replaceChildren();
  const d = new Date(start);
  const msg = el('div', `Diagnóstico marcado para ${dayLong.format(d)} às ${hourFmt.format(d)}. O convite chega no seu e-mail, e a gente confirma pelo WhatsApp.`, 'bubble');
  msg.tabIndex = -1;
  const wa = el('a', 'Confirmar no WhatsApp', 'btn');
  wa.href = WHATSAPP;
  wa.rel = 'noopener';
  box.append(msg, wa);
  msg.focus({preventScroll: true});
}

async function calendar() {
  if (state.booking) return booked(state.booking.start);
  const intro = el('div', undefined, 'bubble');
  intro.append(el('p', `Pronto, ${first(state.answers.name)}! Já dá para marcar o seu diagnóstico gratuito: uma conversa por vídeo em que você descobre qual time começar.`),
    el('p', 'Escolha o melhor horário (horário de Brasília):'));
  intro.id = 'agenda-titulo';
  intro.tabIndex = -1;
  const cal = el('div', 'Consultando horários…', 'calendar');
  cal.setAttribute('aria-labelledby', 'agenda-titulo');
  box.append(intro, cal);
  intro.focus({preventScroll: true});
  intro.scrollIntoView({block: 'start', behavior: 'instant'});
  let j;
  try {
    j = await api('slots');
  } catch (e) {
    cal.replaceChildren(el('p', e.message), retryButton('Tentar de novo', () => render()));
    return;
  }
  cal.replaceChildren();
  if (!j.slots.length) {
    cal.append(el('p', 'Os próximos dias estão cheios. Chame a gente no WhatsApp que a gente encontra um horário.'));
    const wa = el('a', 'Falar no WhatsApp', 'btn');
    wa.href = WHATSAPP;
    cal.append(wa);
    return;
  }
  const days = [...new Set(j.slots.map(s => s.day))];
  const dayRow = el('div', undefined, 'days');
  dayRow.setAttribute('role', 'group');
  dayRow.setAttribute('aria-label', 'Dia');
  const hours = el('div', undefined, 'hours');
  hours.setAttribute('role', 'group');
  hours.setAttribute('aria-label', 'Horário');
  const action = el('div', undefined, 'book');
  let chosen = null;

  function pickDay(day, button) {
    dayRow.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    hours.replaceChildren();
    action.replaceChildren();
    chosen = null;
    for (const slot of j.slots.filter(s => s.day === day)) {
      const b = el('button', hourFmt.format(new Date(slot.start)), 'option slot');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.onclick = () => {
        hours.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        chosen = slot.start;
        action.replaceChildren();
        const confirm = el('button', 'Confirmar horário', 'btn');
        confirm.type = 'button';
        if (!j.booking_enabled) {
          confirm.disabled = true;
          action.append(confirm, el('p', 'Prévia para revisão: a marcação está desligada e nenhum convite é enviado.', 'note'));
          return;
        }
        confirm.onclick = async () => {
          if (busy || !chosen) return;
          busy = true;
          confirm.disabled = true;
          status.textContent = 'Marcando…';
          try {
            const r = await api('book', {start: chosen});
            once('schedule', () => track('schedule', {event_id: state.event_id}));
            status.textContent = '';
            booked(r.start);
          } catch (e) {
            status.textContent = e.message;
            confirm.disabled = false;
          } finally {
            busy = false;
          }
        };
        action.append(confirm);
      };
      hours.append(b);
    }
  }

  for (const day of days) {
    const b = el('button', dayFmt.format(new Date(day + 'T15:00:00Z')), 'option day');
    b.type = 'button';
    b.onclick = () => pickDay(day, b);
    dayRow.append(b);
  }
  cal.append(dayRow, hours, action);
  pickDay(days[0], dayRow.firstChild);
}

async function boot() {
  const had = !!token;
  try {
    const j = token ? await api('session', {}) : await api('session', {attribution});
    if (j.token) { token = j.token; sessionStorage.setItem('ia-session', token); }
    state = j;
    render();
  } catch (e) {
    if (had && !token) return boot(); // expired or invalid session: start a fresh one
    status.textContent = e.message;
    box.replaceChildren(retryButton('Tentar de novo', () => location.reload()));
  }
}

boot();
