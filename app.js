import {
  PLAN, TOTAL_DAYS, ymd, parseDate, diff, addDays, mondayOf,
  daysLeft, dayNo, cycleInfo, milestoneFor, dayTypeFor, plural,
} from './plan.js';

const KEY = 'ryvok.v1';
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const WD_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const DIRS = Object.fromEntries(PLAN.directions.map(d => [d.id, d]));
const METRICS = Object.fromEntries(PLAN.metrics.flatMap(g => g.items).map(m => [m.id, m]));
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

// ---------- иконки ----------
const ICONS = {
  home: '<path d="M3.5 10.5 12 3.5l8.5 7V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19z"/>',
  report: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.5 2M9.5 2.5h5M19 6l1.5-1.5"/>',
  bars: '<path d="M5 20v-6M12 20V5M19 20v-10M3 20.5h18"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  flame: '<path d="M12 3c.8 3.2 5 5.4 5 10.2a5 5 0 0 1-10 0c0-2.3 1.2-3.8 2.4-4.8.2 1.7 1 2.8 1.8 3.3C11 8.6 11.3 5.8 12 3z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  pause: '<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="3"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  send: '<path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5z"/>',
  download: '<path d="M12 3.5v11M7 10l5 5 5-5M5 20.5h14"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5.5 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  bag: '<path d="M5 8h14l-1.2 12.5H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10.5 21 7.5v9l-5-3z"/>',
  box: '<path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9"/>',
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>',
  dumbbell: '<path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.3 1.8 3.5 1.8 3.5-1.8 3.5-1.8M9 9.5h.01M15 9.5h.01"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  bolt: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.7 7.5 9 4.3-1.3 7.5-4.5 7.5-9V6z"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13.5h9l1-13.5"/>',
};
const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x=".5" y=".5" width="31" height="31" rx="9.5" fill="#14171e" stroke="rgba(255,255,255,.12)"/><path d="M16 6.5l8.5 8.5-3 3-5.5-5.5-5.5 5.5-3-3z" fill="#ff7a1a"/><path d="M16 15l8.5 8.5-3 3-5.5-5.5-5.5 5.5-3-3z" fill="#ffb35c"/></svg>';

// ---------- утилиты ----------
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const pad = n => String(n).padStart(2, '0');
const fmt = s => s.split('-').reverse().join('.');
const fmtShort = s => fmt(s).slice(0, 5);
const fmtLong = s => { const d = parseDate(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const wd = s => WD[parseDate(s).getDay()];
const nowTime = () => new Date().toTimeString().slice(0, 5);
const rub = n => Math.round(n || 0).toLocaleString('ru-RU') + ' ₽';
const today = () => ymd(new Date(Date.now() - PLAN.dayStartsAtHour * 3600e3));
const buzz = (p = 8) => { try { navigator.vibrate?.(p); } catch (e) { /* без вибрации */ } };
const parseNum = v => { const n = Number(String(v).replace(/\s/g, '').replace(',', '.')); return v === '' || isNaN(n) ? '' : n; };

// ---------- состояние ----------
function fresh() {
  const cycleGoals = {};
  for (const c of PLAN.cycles) {
    cycleGoals[c.n] = {};
    for (const d of PLAN.directions) {
      cycleGoals[c.n][d.id] = (PLAN.cycleGoals[c.n]?.[d.id] || []).map(text => ({ id: uid(), text, done: false }));
    }
  }
  return {
    meta: { v: 1, firstDay: today() },
    days: {}, weeks: {}, cycleGoals,
    income: { '2026-10': { misports: 50000 } },
    timer: null,
    ui: {},
  };
}

function migrate(s) {
  s.ui ||= {};
  s.ui.dir ||= 'novella';
  s.ui.dur ||= 50;
  s.ui.open ||= { Novella: true, 'Prove It': true, income: true };
  s.weeks ||= {};
  s.income ||= {};
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) { /* хранилище недоступно — начинаем с чистого листа */ }
  return migrate(fresh());
}

let S = load();
let tab = 'today';
let lastTab = null;
let reportDate = today();
let weekStart = mondayOf(today());
let previewOpen = false;
let scrollStrip = false;

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Не удалось сохранить. Сделай резервную копию в настройках.'); }
}

function day(date) {
  if (!S.days[date]) {
    S.days[date] = {
      morning: null,
      tasks: [0, 1, 2].map(() => ({ id: uid(), text: '', dir: 'novella', done: false })),
      min: {}, metrics: {}, notes: {}, focus: [],
    };
  }
  return S.days[date];
}
const peek = date => S.days[date];
const tracked = date => date >= S.meta.firstDay && date <= today();
const week = mon => (S.weeks[mon] ||= { goals: [], review: '' });

// ---------- подсчёты ----------
const focusMin = (d, dir) => d ? d.focus.filter(f => !dir || f.dir === dir).reduce((a, f) => a + f.min, 0) : 0;
const minCount = d => d ? PLAN.minimumDay.filter(m => d.min[m.id]).length : 0;
const minDone = d => minCount(d) === PLAN.minimumDay.length;

function scoreParts(date) {
  const d = peek(date);
  if (!d) return { morning: 0, min: 0, tasks: 0, focus: 0 };
  const tasks = d.tasks.filter(t => t.text.trim());
  return {
    morning: d.morning ? 20 : 0,
    min: Math.round(30 * minCount(d) / PLAN.minimumDay.length),
    tasks: tasks.length ? Math.round(30 * tasks.filter(t => t.done).length / tasks.length) : 0,
    focus: Math.round(20 * Math.min(1, focusMin(d) / dayTypeFor(date).focusTarget)),
  };
}
const score = date => Object.values(scoreParts(date)).reduce((a, b) => a + b, 0);

function burnedBefore(date) {
  let n = 0;
  for (let x = S.meta.firstDay; x < date; x = addDays(x, 1)) if (!minDone(peek(x))) n++;
  return n;
}

function streak() {
  let x = today(), n = 0;
  if (!minDone(peek(x))) x = addDays(x, -1);
  while (x >= S.meta.firstDay && minDone(peek(x))) { n++; x = addDays(x, -1); }
  return n;
}

function weekFocus(mon, dir, upTo = '9999') {
  let m = 0;
  for (let i = 0; i < 7; i++) { const x = addDays(mon, i); if (x <= upTo) m += focusMin(peek(x), dir); }
  return m;
}

function metricAgg(mon, m) {
  const vals = [];
  for (let i = 0; i < 7; i++) {
    const v = peek(addDays(mon, i))?.metrics[m.id];
    if (typeof v === 'number' && !isNaN(v)) vals.push(v);
  }
  if (!vals.length) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  return m.agg === 'avg' ? Math.round(sum / vals.length * 10) / 10 : sum;
}

const isFilled = (m, v) => v !== undefined && v !== null && v !== '' && v !== false && !(m.type === 'select' && v === m.options[0]);
const incomeTotal = month => Object.values(S.income[month] || {}).reduce((a, b) => a + (Number(b) || 0), 0);
const lastIncomeMonth = () => Object.keys(S.income).filter(k => incomeTotal(k) > 0).sort().pop();

// ---------- плавное обновление DOM без потери фокуса ----------
function morph(a, b) {
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  for (const { name, value } of [...b.attributes]) if (a.getAttribute(name) !== value) a.setAttribute(name, value);
  for (const { name } of [...a.attributes]) if (!b.hasAttribute(name)) a.removeAttribute(name);
  const busy = document.activeElement === a || a === recEl;
  if (a.tagName === 'INPUT') {
    if (a.type === 'checkbox') a.checked = b.hasAttribute('checked');
    else if (!busy) { const v = b.getAttribute('value') ?? ''; if (a.value !== v) a.value = v; }
    return;
  }
  if (a.tagName === 'TEXTAREA') { if (!busy && a.value !== b.value) a.value = b.value; return; }
  morphChildren(a, b);
  if (a.tagName === 'SELECT') a.value = b.value;
}

function morphChildren(a, b) {
  const an = [...a.childNodes], bn = [...b.childNodes];
  bn.forEach((n, i) => {
    const o = an[i];
    if (!o) a.appendChild(n);
    else if (o.nodeType !== n.nodeType || o.nodeName !== n.nodeName
      || (o.nodeType === 1 && o.getAttribute('data-key') !== n.getAttribute('data-key'))) a.replaceChild(n, o);
    else morph(o, n);
  });
  for (let i = bn.length; i < an.length; i++) an[i].remove();
}

// ---------- общие куски разметки ----------
function ring(p, size = 98, sw = 8) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r, h = size / 2;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle class="ring-track" cx="${h}" cy="${h}" r="${r}" stroke-width="${sw}"/>
    <circle class="ring-arc" cx="${h}" cy="${h}" r="${r}" stroke-width="${sw}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - Math.min(1, p))).toFixed(2)}" transform="rotate(-90 ${h} ${h})" style="opacity:${p > 0 ? 1 : 0}"/></svg>`;
}

const RING_R = 124, RING_C = 2 * Math.PI * RING_R;
const TICKS = [...Array(60)].map((_, i) => {
  const a = i / 60 * 2 * Math.PI, r1 = 146, r2 = i % 5 ? 140 : 134;
  const p = (r, f) => (150 + r * f).toFixed(1);
  return `<line class="tick ${i % 5 ? '' : 'major'}" x1="${p(r1, Math.sin(a))}" y1="${p(r1, -Math.cos(a))}" x2="${p(r2, Math.sin(a))}" y2="${p(r2, -Math.cos(a))}"/>`;
}).join('');
const bigRing = p => `<svg viewBox="0 0 300 300">${TICKS}
  <circle class="ring-track" cx="150" cy="150" r="${RING_R}" stroke-width="12"/>
  <circle id="ringArc" class="ring-arc" cx="150" cy="150" r="${RING_R}" stroke-width="12" stroke-dasharray="${RING_C.toFixed(2)}" stroke-dashoffset="${(RING_C * (1 - p)).toFixed(2)}" transform="rotate(-90 150 150)" style="opacity:${p > 0 ? 1 : 0}"/></svg>`;

const micBtn = (id, cls = '') => `<button type="button" class="mic ${cls} ${recEl?.id === id ? 'rec' : ''}" data-mic="${id}" aria-label="Голосовой ввод">${icon('mic')}</button>`;

const voiceField = ({ attrs, id, value, label, rows = 3, placeholder = 'Нажми на микрофон и говори' }) => `
  <div class="field">
    ${label ? `<label class="field-label" for="${id}">${esc(label)}</label>` : ''}
    <div class="voice ${recEl?.id === id ? 'is-rec' : ''}"><textarea id="${id}" ${attrs} rows="${rows}" placeholder="${esc(placeholder)}">${esc(value || '')}</textarea>${micBtn(id)}</div>
  </div>`;

const checkRow = ({ attrs, checked, text, del, key }) => `
  <div class="crow ${checked ? 'done' : ''}" data-key="${key}">
    <label class="cb"><input type="checkbox" ${attrs} ${checked ? 'checked' : ''} aria-label="Выполнено"><span>${icon('check')}</span></label>
    <span class="crow-text">${esc(text)}</span>
    ${del ? `<button class="x" ${del} aria-label="Удалить">${icon('x')}</button>` : ''}
  </div>`;

function stackBar(d, target) {
  const total = Math.max(target, focusMin(d));
  const segs = PLAN.directions.map(dir => [dir, focusMin(d, dir.id)]).filter(([, m]) => m > 0);
  return `<div class="stack">${segs.map(([dir, m]) => `<i style="width:${(m / total * 100).toFixed(1)}%;--c:${dir.color}"></i>`).join('')}</div>
    ${segs.length ? `<div class="legend">${segs.map(([dir, m]) => `<span style="--c:${dir.color}"><i></i>${esc(dir.name)} <b class="mono">${m}</b></span>`).join('')}</div>` : ''}`;
}

// ---------- шапка и навигация ----------
function renderTop() {
  const t = today(), d = parseDate(t), st = streak();
  $('#top').innerHTML = `<div class="topbar">
    <div class="brand">${LOGO}<div><b>РЫВОК</b><small>${WD_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}</small></div></div>
    <span class="chip-stat ${st ? 'hot' : ''}" title="Дней подряд с закрытым минимумом">${icon('flame')}${st}</span>
    <span class="chip-stat" title="Дней до 30.06.2027">${daysLeft(t)}<small>дн</small></span>
    <button class="icon-btn ${tab === 'more' ? 'on' : ''}" data-act="go" data-tab="more" aria-label="Настройки">${icon('sliders')}</button>
  </div>`;
}

function renderNav() {
  $('#tabs').innerHTML = `
    <button data-tab="today">${icon('home')}<span>Сегодня</span></button>
    <button data-tab="report">${icon('report')}<span>Отчёт</span></button>
    <button data-tab="focus" class="fab" aria-label="Фокус"><span class="fab-ring"><span class="fab-core">${icon('timer')}<b id="fabTime"></b></span></span></button>
    <button data-tab="week">${icon('bars')}<span>Неделя</span></button>
    <button data-tab="goals">${icon('target')}<span>Цели</span></button>`;
}

// ---------- экраны ----------
function viewToday() {
  const t = today(), d = day(t), c = cycleInfo(t), dt = dayTypeFor(t), ms = milestoneFor(t);
  const left = daysLeft(t), passed = Math.max(0, dayNo(t) - 1), burned = burnedBefore(t), sc = score(t);
  const weeks = Math.ceil(TOTAL_DAYS / 7), curW = Math.min(weeks - 1, Math.floor(passed / 7));
  const seg = [...Array(weeks)].map((_, i) => i < curW ? '<i class="past"></i>'
    : i === curW ? `<i class="now" style="--f:${((passed % 7) + 1) / 7}"></i>` : '<i></i>').join('');
  const tasks = d.tasks.filter(x => x.text.trim());
  const wdName = WD_FULL[parseDate(t).getDay()];
  return `
  <section class="card hero">
    <div class="hero-top">
      <div>
        <div class="eyebrow">до 30 июня 2027</div>
        <div class="count">${left}</div>
        <div class="count-sub">${plural(left, 'день', 'дня', 'дней')} · ≈ <b>${(left * 16).toLocaleString('ru-RU')}</b> ч без сна</div>
      </div>
      <button class="score-ring" data-act="scoreinfo" aria-label="Оценка дня ${sc} из 100">${ring(sc / 100)}<span class="score-val"><b>${sc}</b><span>оценка</span></span></button>
    </div>
    <div class="weeks" style="grid-template-columns:repeat(${weeks},1fr)" aria-hidden="true">${seg}</div>
    <div class="hero-meta"><span>неделя ${curW + 1} из ${weeks}</span><span class="${burned ? 'bad' : ''}">${burned ? `сгорело дней: ${burned}` : 'сгоревших дней нет'}</span></div>
    <div class="cycle-line"><span class="tag">${c ? `Цикл ${c.n}` : 'Старт'}</span><span>${c ? `${esc(c.title)} · неделя ${c.week}/${c.weeks}` : 'цикл 1 стартует 26.10'}</span></div>
    ${ms ? `<p class="ms">${esc(ms.text)}</p>` : ''}
  </section>

  <section class="card daytype">
    <div class="dt-icon">${icon('calendar')}</div>
    <div><b>${wdName} · ${dt.name}</b><p>${esc(dt.hint)}</p></div>
    <div class="dt-target"><b>${dt.focusTarget}</b><span>мин</span></div>
  </section>

  <button class="morning ${d.morning ? 'done' : ''}" data-act="morning">
    <span class="m-icon">${icon(d.morning ? 'check' : 'sun')}</span>
    <span class="m-text"><b>${d.morning ? 'Утренний блок сделан' : 'Утренний блок'}</b>
      <small>${d.morning ? `в ${d.morning} · +20 к оценке дня` : 'первый час — главная задача, телефон после'}</small></span>
    <span class="m-switch"></span>
  </button>

  <section class="card">
    <div class="card-head"><span class="eyebrow">Главные задачи</span><span class="meta">${tasks.filter(x => x.done).length}/${tasks.length || d.tasks.length}</span></div>
    <div class="tasks">${d.tasks.map(task => taskRow(t, task)).join('')}</div>
    <div class="card-actions">
      ${d.tasks.length < 6 ? `<button class="link" data-act="addtask">${icon('plus')}Задача</button>` : '<span></span>'}
      <button class="link" data-act="carry">${icon('right')}Перенести со вчера</button>
    </div>
  </section>

  ${focusCard(t)}

  <section class="card">
    <div class="card-head"><span class="eyebrow">Минимальный день</span><span class="meta">${minCount(d)}/${PLAN.minimumDay.length}</span></div>
    <div class="min-progress">${PLAN.minimumDay.map(m => `<i class="${d.min[m.id] ? 'on' : ''}"></i>`).join('')}</div>
    <div class="min-grid">${PLAN.minimumDay.map(m => `
      <label class="min-tile ${d.min[m.id] ? 'on' : ''}">
        <input type="checkbox" data-date="${t}" data-min="${m.id}" ${d.min[m.id] ? 'checked' : ''}>
        <span class="mt-icon">${icon(m.icon)}</span>
        <span><b>${esc(m.short)}</b><small style="display:block">${esc(m.sub)}</small></span>
        <span class="mt-check">${icon('check')}</span>
      </label>`).join('')}</div>
    <p class="hint">Не пропускай дважды подряд. Плохой день — это минимальный день, а не ноль.</p>
  </section>

  <section class="card">
    ${voiceField({ attrs: `data-date="${t}" data-note="plan"`, id: 'n-plan', value: d.notes.plan, label: PLAN.notes.find(n => n.id === 'plan').label, rows: 2, placeholder: PLAN.notes.find(n => n.id === 'plan').hint })}
  </section>`;
}

const taskRow = (date, t) => `
  <div class="task ${t.done ? 'done' : ''}" data-key="${t.id}">
    <label class="cb"><input type="checkbox" data-date="${date}" data-task="${t.id}" data-f="done" ${t.done ? 'checked' : ''} aria-label="Выполнено"><span>${icon('check')}</span></label>
    <textarea class="task-text" id="t-${t.id}" rows="1" data-date="${date}" data-task="${t.id}" data-f="text" placeholder="Что именно сделать">${esc(t.text)}</textarea>
    ${micBtn(`t-${t.id}`, 'sm')}
    <label class="dir-pill" style="--c:${DIRS[t.dir]?.color}"><i></i>${esc(DIRS[t.dir]?.name)}${icon('chev')}
      <select data-date="${date}" data-task="${t.id}" data-f="dir" aria-label="Направление">${PLAN.directions.map(d => `<option value="${d.id}" ${d.id === t.dir ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select>
    </label>
  </div>`;

function focusCard(t) {
  const d = day(t), target = dayTypeFor(t).focusTarget, total = focusMin(d), tm = S.timer;
  return `<section class="card">
    <div class="card-head"><span class="eyebrow">Фокус сегодня</span><span class="meta">${total} / ${target} мин</span></div>
    ${stackBar(d, target)}
    <div class="row gap-8 mt-12">
      ${tm ? `<button class="btn grow" data-act="go" data-tab="focus">${icon('timer')}Идёт блок · ${esc(DIRS[tm.dir].name)}</button>`
        : `<button class="btn primary grow" data-act="quickstart">${icon('play')}${esc(DIRS[S.ui.dir].name)} · ${S.ui.dur} мин</button>
           <button class="btn icon" data-act="go" data-tab="focus" aria-label="Настроить таймер">${icon('sliders')}</button>`}
    </div>
  </section>`;
}

function viewFocus() {
  const t = today(), d = day(t), target = dayTypeFor(t).focusTarget, total = focusMin(d), tm = S.timer;
  const sel = tm ? tm.dir : S.ui.dir, dur = tm ? tm.duration : S.ui.dur;
  const p = tm ? Math.min(1, elapsed() / (tm.duration * 60e3)) : 0;
  const state = tm ? (tm.since ? 'running' : 'paused') : '';
  return `
  <section class="focus-stage">
    <div class="focus-ring ${state}" style="--dc:${DIRS[sel].color}">
      ${bigRing(p)}
      <div class="focus-center">
        <span class="eyebrow">${tm ? (tm.since ? 'идёт блок' : 'пауза') : 'готов к старту'}</span>
        <div class="clock" id="clock">${tm ? clockText() : `${dur}:00`}</div>
        <div class="focus-dir"><i></i>${esc(DIRS[sel].name)}</div>
      </div>
    </div>
    <div class="focus-controls">
      ${!tm ? `<button class="fab-play" data-act="tstart" aria-label="Старт">${icon('play')}</button>`
        : `<button class="round" data-act="tcancel" aria-label="Сбросить без записи">${icon('x')}</button>
           <button class="fab-play" data-act="tpause" aria-label="${tm.since ? 'Пауза' : 'Продолжить'}">${icon(tm.since ? 'pause' : 'play')}</button>
           <button class="round good" data-act="tstop" aria-label="Завершить и записать">${icon('check')}</button>`}
    </div>
  </section>

  <section class="card">
    <span class="eyebrow label-sm">Направление</span>
    <div class="chips scroll">${PLAN.timerDirections.map(id => `<button class="chip ${sel === id ? 'on' : ''}" style="--c:${DIRS[id].color}" data-act="tdir" data-v="${id}" ${tm ? 'disabled' : ''}><i></i>${esc(DIRS[id].name)}</button>`).join('')}</div>
    <span class="eyebrow label-sm">Длительность</span>
    <div class="seg">${[15, 25, 50, 90].map(m => `<button class="${dur === m ? 'on' : ''}" data-act="tdur" data-v="${m}" ${tm ? 'disabled' : ''}>${m}</button>`).join('')}</div>
  </section>

  <section class="card">
    <div class="card-head"><span class="eyebrow">Сегодня</span><span class="meta">${total} / ${target} мин</span></div>
    ${stackBar(d, target)}
    ${d.focus.length ? `<div class="sessions">${d.focus.map((f, i) => `<span class="sess" style="--c:${DIRS[f.dir]?.color}"><i></i>${f.at} · ${f.min}м<button data-act="delfocus" data-i="${i}" aria-label="Удалить блок">${icon('x')}</button></span>`).join('')}</div>` : ''}
    <div class="manual"><input type="text" inputmode="numeric" id="manualMin" placeholder="мин" aria-label="Минуты">
      <button class="btn grow" data-act="manual">${icon('plus')}Вручную в «${esc(DIRS[sel].name)}»</button></div>
  </section>
  <p class="hint center">Телефон экраном вниз, уведомления выключены.<br>После блока — перерыв 5–10 минут без ленты.</p>`;
}

function metricControl(date, m, v) {
  const a = `data-date="${date}" data-metric="${m.id}"`, id = `m-${m.id}`;
  switch (m.input) {
    case 'stepper': return `<div class="mrow"><label for="${id}">${esc(m.label)}</label>
      <div class="stepper"><button data-act="step" ${a} data-d="-1" aria-label="Меньше">−</button>
      <input type="text" inputmode="decimal" id="${id}" ${a} value="${esc(v ?? '')}" placeholder="0">
      <button data-act="step" ${a} data-d="1" aria-label="Больше">+</button></div></div>`;
    case 'number': return `<div class="mrow"><label for="${id}">${esc(m.label)}</label>
      <div class="numfield ${m.unit ? '' : 'bare'}"><input type="text" inputmode="decimal" id="${id}" ${a} value="${esc(v ?? '')}" placeholder="0">${m.unit ? `<span>${esc(m.unit)}</span>` : ''}</div></div>`;
    case 'scale': {
      const rgb = m.invert ? '255,84,104' : '255,122,26';
      return `<div class="mrow col"><span class="ml">${esc(m.label)}<b>${v || '—'}</b></span>
        <div class="scale" style="--rgb:${rgb}">${[...Array(10)].map((_, i) => `<button class="${v && i < v ? 'on' : ''} ${v === i + 1 ? 'cur' : ''}" style="--o:${(0.25 + 0.75 * (i + 1) / 10).toFixed(2)}" data-act="scale" ${a} data-v="${i + 1}" aria-label="${i + 1}">${i + 1}</button>`).join('')}</div></div>`;
    }
    case 'chips': return `<div class="mrow col"><span class="ml">${esc(m.label)}</span>
      <div class="chips">${m.options.map(o => `<button class="chip ${(v || m.options[0]) === o ? 'on' : ''}" data-act="pick" ${a} data-v="${esc(o)}">${o === '—' ? 'Не было' : esc(o)}</button>`).join('')}</div></div>`;
    case 'switch': return `<label class="mrow"><span class="ml">${esc(m.label)}</span><input type="checkbox" class="switch" ${a} ${v ? 'checked' : ''}></label>`;
    default: return `<div class="mrow col"><label class="ml" for="${id}">${esc(m.label)}</label>
      <div class="voice one ${recEl?.id === id ? 'is-rec' : ''}"><input type="text" id="${id}" ${a} value="${esc(v ?? '')}">${micBtn(id, 'sm')}</div></div>`;
  }
}

function metricGroup(date, g, d) {
  const n = g.items.filter(m => isFilled(m, d.metrics[m.id])).length;
  return `<details class="card acc" data-acc="${esc(g.group)}" style="--c:${g.color}" ${S.ui.open[g.group] ? 'open' : ''}>
    <summary><span class="acc-icon">${icon(g.icon)}</span><span class="acc-title">${esc(g.group)}</span>
      <span class="acc-sum ${n === g.items.length ? 'full' : ''}">${n}/${g.items.length}</span>${icon('chev', 'chev')}</summary>
    <div class="acc-body">${g.items.map(m => metricControl(date, m, d.metrics[m.id])).join('')}</div>
  </details>`;
}

function viewReport() {
  const date = reportDate, d = day(date), t = today();
  const from = S.meta.firstDay > addDays(t, -13) ? S.meta.firstDay : addDays(t, -13);
  const strip = [];
  for (let x = from; x <= t; x = addDays(x, 1)) strip.push(x);
  const evening = PLAN.notes.filter(n => n.when === 'evening');
  const voiced = evening.filter(n => (d.notes[n.id] || '').trim()).length;
  const all = PLAN.metrics.flatMap(g => g.items);
  const filled = all.filter(m => isFilled(m, d.metrics[m.id])).length;
  const sent = !!d.min.report;
  return `
  <div class="page-head"><h1>Отчёт</h1><span class="meta">${date === t ? 'сегодня' : fmtLong(date)}</span></div>
  <div class="datestrip" id="strip">${strip.map(x => {
    const st = minDone(peek(x)) ? 'ok' : x < t ? 'burn' : '';
    return `<button class="dchip ${x === date ? 'on' : ''}" data-act="rdate" data-v="${x}"><small>${wd(x)}</small><b>${parseDate(x).getDate()}</b><span class="st ${st}"></span></button>`;
  }).join('')}</div>

  <section class="card"><div class="status-grid">
    <div><b>${score(date)}</b><small>оценка</small></div>
    <div><b>${voiced}/${evening.length}</b><small>голосом</small></div>
    <div><b>${filled}/${all.length}</b><small>цифры</small></div>
    <div><b class="${sent ? 'good' : ''}">${sent ? icon('check') : '—'}</b><small>${sent ? 'отправлен' : 'не отправлен'}</small></div>
  </div></section>

  <section class="card">
    <div class="card-head"><span class="eyebrow">Голосом · 2–3 минуты</span></div>
    ${evening.map(n => voiceField({ attrs: `data-date="${date}" data-note="${n.id}"`, id: `n-${n.id}`, value: d.notes[n.id], label: n.label, rows: n.id === 'day' ? 4 : 2, placeholder: n.hint })).join('')}
  </section>

  ${PLAN.metrics.map(g => metricGroup(date, g, d)).join('')}

  <details class="card preview" id="repPrev" ${previewOpen ? 'open' : ''}>
    <summary><span>${icon('report')}Что увидит коуч</span>${icon('chev', 'chev')}</summary>
    <pre class="pre">${previewOpen ? esc(buildDayReport(date)) : ''}</pre>
  </details>
  <div class="spacer"></div>
  <div class="sendbar">
    <button class="btn ${sent ? 'ok-state' : 'primary'} grow" data-act="share">${icon(sent ? 'check' : 'send')}${sent ? 'Отправлен · ещё раз' : 'Отправить коучу'}</button>
    <button class="btn icon" data-act="download" aria-label="Скачать файл">${icon('download')}</button>
    <button class="btn icon" data-act="copy" aria-label="Скопировать текст">${icon('copy')}</button>
  </div>`;
}

function viewWeek() {
  const mon = weekStart, w = week(mon), t = today();
  const days = [...Array(7)].map((_, i) => addDays(mon, i));
  const c = cycleInfo(addDays(mon, 3)) || cycleInfo(mon);
  const ms = milestoneFor(addDays(mon, 3)) || milestoneFor(mon);
  const tr = days.filter(tracked);
  const avg = tr.length ? Math.round(tr.reduce((a, x) => a + score(x), 0) / tr.length) : 0;
  const mins = tr.filter(x => minDone(peek(x))).length;
  const budgeted = PLAN.directions.filter(d => d.weeklyHours > 0);
  const totalBudget = budgeted.reduce((a, d) => a + d.weeklyHours, 0);
  const rows = PLAN.metrics.flatMap(g => g.items).filter(m => m.type === 'num').map(m => [m, metricAgg(mon, m)]).filter(([, v]) => v !== null);
  return `
  <div class="page-head"><h1>Неделя</h1>
    <div class="pager"><button class="icon-btn" data-act="wprev" aria-label="Прошлая неделя">${icon('left')}</button>
      <span class="mono">${fmtShort(mon)}–${fmtShort(addDays(mon, 6))}</span>
      <button class="icon-btn" data-act="wnext" aria-label="Следующая неделя">${icon('right')}</button></div></div>

  ${c || ms ? `<section class="card plan-card">${c ? `<span class="tag">Цикл ${c.n} · неделя ${c.week}/${c.weeks}</span>` : ''}${ms ? `<p>${esc(ms.text)}</p>` : ''}</section>` : ''}

  <div class="kpis">
    <div class="kpi"><b>${avg}</b><small>средняя оценка</small></div>
    <div class="kpi"><b>${(weekFocus(mon) / 60).toFixed(1)}<span>/${totalBudget}</span></b><small>часов фокуса</small></div>
    <div class="kpi"><b>${mins}<span>/${tr.length || 7}</span></b><small>минимум закрыт</small></div>
  </div>

  <section class="card">
    <div class="card-head"><span class="eyebrow">Оценка по дням</span></div>
    <div class="chart">${days.map(x => {
      const on = tracked(x), s = on ? score(x) : 0;
      return `<div class="bar-col ${x === t ? 'now' : ''}"><b>${on ? s : ''}</b>
        <div class="bar-track"><div class="bar-fill ${minDone(peek(x)) ? 'ok' : ''}" style="height:${on ? Math.max(4, s) : 0}%"></div></div>
        <small>${wd(x)}</small></div>`;
    }).join('')}</div>
    <div class="legend"><span style="--c:var(--accent)"><i></i>минимальный день закрыт</span></div>
  </section>

  <section class="card">
    <div class="card-head"><span class="eyebrow">Часы по направлениям</span></div>
    ${budgeted.map(dir => {
      const h = weekFocus(mon, dir.id) / 60;
      return `<div class="hrow" style="--c:${dir.color}"><div class="hrow-top"><span><i></i>${esc(dir.name)}</span><span class="mono">${h.toFixed(1)} / ${dir.weeklyHours} ч</span></div>
        <div class="meter"><div style="width:${Math.min(100, h / dir.weeklyHours * 100).toFixed(1)}%"></div></div></div>`;
    }).join('')}
  </section>

  <section class="card">
    <div class="card-head"><span class="eyebrow">Цели недели</span><span class="meta">${w.goals.filter(g => g.done).length}/${w.goals.length}</span></div>
    ${w.goals.map(g => checkRow({ attrs: `data-wk="${mon}" data-goal="${g.id}"`, checked: g.done, text: g.text, del: `data-act="delgoal" data-id="${g.id}"`, key: g.id })).join('')
      || '<p class="hint" style="margin-top:0">3–5 проверяемых целей: «выложить 30 видео», а не «заняться Prove It».</p>'}
    <div class="add-row"><div class="voice one grow"><input type="text" id="newGoal" placeholder="Новая цель недели">${micBtn('newGoal', 'sm')}</div>
      <button class="btn icon primary" data-act="addgoal" aria-label="Добавить цель">${icon('plus')}</button></div>
  </section>

  ${rows.length ? `<section class="card"><div class="card-head"><span class="eyebrow">Цифры недели</span></div>
    <div class="numtable">${rows.map(([m, v]) => `<div><span>${esc(m.label)}${m.agg === 'avg' ? ' · среднее' : ''}</span><b class="mono">${v.toLocaleString('ru-RU')}${m.unit ? ' ' + esc(m.unit) : ''}</b></div>`).join('')}</div></section>` : ''}

  <section class="card">
    ${voiceField({ attrs: `data-wk="${mon}" data-review="1"`, id: 'wreview', value: w.review, label: 'Недельный разбор', rows: 3, placeholder: 'Что сработало, что нет, что меняю на следующей неделе' })}
    <div class="row gap-8 mt-12">
      <button class="btn primary grow" data-act="wshare">${icon('send')}Неделю коучу</button>
      <button class="btn icon" data-act="wdownload" aria-label="Скачать">${icon('download')}</button>
      <button class="btn icon" data-act="wcopy" aria-label="Скопировать">${icon('copy')}</button>
    </div>
  </section>`;
}

function viewGoals() {
  const t = today(), month = t.slice(0, 7), inc = S.income[month] || {};
  const total = incomeTotal(month), cur = cycleInfo(t) || PLAN.cycles[0];
  const offset = (parseDate(PLAN.start).getDay() + 6) % 7;
  let cells = '<i class="blank"></i>'.repeat(offset), ok = 0, burn = 0;
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const x = addDays(PLAN.start, i);
    let cls = '';
    if (x > t) cls = 'fut';
    else if (minDone(peek(x))) { cls = 'ok'; ok++; }
    else if (x < t && x >= S.meta.firstDay) { cls = 'burn'; burn++; }
    if (x === t) cls += ' now';
    cells += `<i class="${cls}"></i>`;
  }
  return `
  <div class="page-head"><h1>Цели</h1><span class="meta">${fmt(PLAN.deadline)}</span></div>

  <section class="card">
    <div class="card-head"><span class="eyebrow">Доход за ${MONTHS_NOM[Number(month.slice(5)) - 1]}</span><span class="tag">цель ${Math.round(PLAN.goalIncome / 1000)}к</span></div>
    <div class="income-big"><b>${rub(total)}</b><span>/ мес</span></div>
    <div class="goalbar">
      <div class="meter"><div style="width:${Math.min(100, total / PLAN.goalIncome * 100).toFixed(1)}%"></div></div>
      ${PLAN.cycles.map(cy => `<span class="tickmark ${total >= cy.incomeTarget ? 'hit' : ''}" style="left:${(cy.incomeTarget / PLAN.goalIncome * 100).toFixed(1)}%"><i></i><small>${Math.round(cy.incomeTarget / 1000)}к</small></span>`).join('')}
    </div>
    <details class="sub" data-acc="income" ${S.ui.open.income ? 'open' : ''}>
      <summary>Внести по источникам${icon('chev', 'chev')}</summary>
      <div class="acc-body">${PLAN.incomeSources.map(s => `<div class="mrow"><label for="inc-${s.id}">${esc(s.name)}</label>
        <div class="numfield"><input type="text" inputmode="numeric" id="inc-${s.id}" data-income="${month}" data-src="${s.id}" value="${esc(inc[s.id] ?? '')}" placeholder="0"><span>₽</span></div></div>`).join('')}</div>
    </details>
  </section>

  <section class="card">
    <div class="card-head"><span class="eyebrow">Карта ${TOTAL_DAYS} дней</span><span class="meta">${daysLeft(t)} осталось</span></div>
    <div class="lifegrid" aria-label="Каждая клетка — один день до 30 июня 2027">${cells}</div>
    <div class="legend sq"><span style="--c:var(--accent)"><i></i>минимум закрыт · ${ok}</span><span style="--c:rgba(255,84,104,.6)"><i></i>сгорел · ${burn}</span><span><i class="fut"></i>впереди</span></div>
  </section>

  <section class="card">
    <div class="card-head"><span class="eyebrow">Циклы</span></div>
    <div class="ctl">${PLAN.cycles.map(cy => {
      const len = diff(cy.start, cy.end) + 1;
      const prog = t < cy.start ? 0 : t > cy.end ? 1 : (diff(cy.start, t) + 1) / len;
      return `<div class="ctl-seg ${cy.n === cur.n && t >= cy.start ? 'now' : ''}" style="flex:${len}">
        <div class="meter"><div style="width:${(prog * 100).toFixed(1)}%"></div></div>
        <b>${cy.n}. ${esc(cy.title)}</b><small>${fmtShort(cy.start)}–${fmtShort(cy.end)}<br>${Math.round(cy.incomeTarget / 1000)}к ₽/мес</small></div>`;
    }).join('')}</div>
  </section>

  <section class="card">
    <div class="card-head"><span class="eyebrow">Цели цикла ${cur.n}</span></div>
    <div class="dir-goals">${PLAN.directions.map(dir => {
      const list = S.cycleGoals[cur.n]?.[dir.id] || [];
      const key = `cg-${dir.id}`;
      return `<details data-acc="${key}" ${S.ui.open[key] ? 'open' : ''} style="--c:${dir.color}">
        <summary><span class="dot"></span><span class="grow">${esc(dir.name)}</span><span class="acc-sum ${list.length && list.every(g => g.done) ? 'full' : ''}">${list.filter(g => g.done).length}/${list.length}</span>${icon('chev', 'chev')}</summary>
        <div class="inner">
          ${list.map(g => checkRow({ attrs: `data-cg="${cur.n}" data-dir="${dir.id}" data-gid="${g.id}"`, checked: g.done, text: g.text, del: `data-act="delcg" data-dir="${dir.id}" data-id="${g.id}"`, key: g.id })).join('')}
          <div class="add-row"><input type="text" id="cg-${dir.id}" placeholder="Новая цель">
            <button class="btn icon" data-act="addcg" data-dir="${dir.id}" aria-label="Добавить">${icon('plus')}</button></div>
        </div>
      </details>`;
    }).join('')}</div>
  </section>

  <section class="card">
    <div class="card-head"><span class="eyebrow">План по неделям</span></div>
    <ul class="timeline">${PLAN.milestones.map(m => `<li class="${t >= m.from && t <= m.to ? 'now' : t > m.to ? 'past' : ''}"><b>${fmtShort(m.from)}${m.to !== m.from ? ' – ' + fmtShort(m.to) : ''}</b>${esc(m.text)}</li>`).join('')}</ul>
  </section>`;
}

function viewMore() {
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  return `
  <div class="page-head"><h1>Настройки</h1><button class="icon-btn" data-act="go" data-tab="today" aria-label="Закрыть">${icon('x')}</button></div>

  <section class="card">
    <div class="set-row"><span class="set-icon">${icon('phone')}</span><div class="grow"><b>Установить на телефон</b>
      <small>Android: Chrome → ⋮ → «Установить приложение». iPhone: Safari → «Поделиться» → «На экран „Домой“».</small></div></div>
    ${installPrompt ? `<button class="btn primary grow" style="width:100%" data-act="install">${icon('download')}Установить сейчас</button>` : ''}
  </section>

  <section class="card">
    <div class="set-row"><span class="set-icon">${icon('mic')}</span><div class="grow"><b>Голосовой ввод</b>
      <small>${SR ? 'Нажми микрофон и говори, нажми ещё раз — стоп. Нужен интернет.' : 'Браузер не умеет распознавать сам — нажимай микрофон на клавиатуре телефона.'}</small></div>
      <span class="pill ${SR ? 'on' : ''}">${SR ? 'есть' : 'клавиатура'}</span></div>
    <div class="set-row"><span class="set-icon">${icon('bell')}</span><div class="grow"><b>Сигнал таймера</b>
      <small>Уведомление, когда блок закончился. Утренние и вечерние напоминания присылает Telegram-бот.</small></div>
      <span class="pill ${perm === 'granted' ? 'on' : ''}">${{ granted: 'вкл', denied: 'запрещено', default: 'выкл', unsupported: 'нет' }[perm]}</span></div>
    <button class="btn" style="width:100%" data-act="notif">${icon('bell')}Включить и проверить</button>
  </section>

  <section class="card">
    <div class="set-row"><span class="set-icon">${icon('shield')}</span><div class="grow"><b>Резервная копия</b>
      <small>Данные хранятся только на этом устройстве. Раз в неделю скачивай копию.</small></div></div>
    <div class="row gap-8"><button class="btn grow" data-act="backup">${icon('download')}Скачать</button><button class="btn grow" data-act="import">${icon('plus')}Загрузить</button></div>
  </section>

  <section class="card">
    <div class="set-row"><span class="set-icon">${icon('trash')}</span><div class="grow"><b>Стереть всё</b><small>Отменить нельзя. Сначала скачай копию.</small></div>
      <button class="btn sm danger" data-act="reset">Стереть</button></div>
  </section>
  <p class="hint center">Рывок · ${fmt(PLAN.start)} → ${fmt(PLAN.deadline)}</p>`;
}

const VIEWS = { today: viewToday, report: viewReport, focus: viewFocus, week: viewWeek, goals: viewGoals, more: viewMore };

function render() {
  renderTop();
  document.querySelectorAll('#tabs > button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const view = $('#view'), html = VIEWS[tab]();
  if (tab !== lastTab) {
    view.innerHTML = html;
    view.classList.remove('enter');
    void view.offsetWidth;
    view.classList.add('enter');
    lastTab = tab;
  } else {
    const tpl = document.createElement('div');
    tpl.innerHTML = html;
    morphChildren(view, tpl);
  }
  document.querySelectorAll('#view textarea').forEach(grow);
  updateTimerUI();
  if (scrollStrip) {
    scrollStrip = false;
    const strip = $('#strip'), on = $('#strip .dchip.on');
    if (strip && on) strip.scrollLeft = on.offsetLeft - strip.clientWidth / 2 + on.clientWidth / 2;
  }
}

function setTab(name) {
  tab = name;
  if (name === 'report') { reportDate = today(); scrollStrip = true; }
  if (name === 'week') weekStart = mondayOf(today());
  render();
  scrollTo(0, 0);
}

// ---------- отчёты для коуча ----------
function metricLine(g, d) {
  const parts = g.items.map(m => {
    const v = d?.metrics[m.id];
    if (!isFilled(m, v)) return null;
    return m.type === 'check' ? m.label : `${m.label}: ${v}${m.unit ? ' ' + m.unit : ''}`;
  }).filter(Boolean);
  return parts.length ? parts.join('; ') : 'нет данных';
}

function contextBlock(date) {
  const c = cycleInfo(date) || PLAN.cycles[0];
  const lm = lastIncomeMonth();
  const L = ['## Контекст целей'];
  L.push(`- Главная цель: ${rub(PLAN.goalIncome)}/мес чистыми к 30.06.2027. Последний учтённый доход: ${lm ? `${rub(incomeTotal(lm))} (${lm})` : 'не введён'}.`);
  L.push(`- Цель цикла ${c.n} «${c.title}» (до ${fmt(c.end)}): ${rub(c.incomeTarget)}/мес.`);
  L.push('- Расписание: пн/ср/пт лекции (можно работать на парах), вт/чт/сб семинары ~3 ч, вс без пар. Нотариальная контора с 15.11.2026.');
  L.push(`- Цели цикла ${c.n}:`);
  for (const dir of PLAN.directions) {
    const list = S.cycleGoals[c.n]?.[dir.id] || [];
    if (list.length) L.push(`  ${dir.name}: ${list.map(g => `[${g.done ? 'x' : ' '}] ${g.text}`).join('; ')}`);
  }
  return L;
}

function last7(date) {
  const L = ['## Последние 7 дней', 'дата | оценка | утро | минимум | фокус, мин | соцсети, мин'];
  for (let i = 6; i >= 0; i--) {
    const x = addDays(date, -i);
    if (x < S.meta.firstDay) continue;
    const d = peek(x);
    L.push(`${fmtShort(x)} ${wd(x)} | ${score(x)} | ${d?.morning ? 'да' : 'нет'} | ${minCount(d)}/${PLAN.minimumDay.length} | ${focusMin(d)} | ${d?.metrics.social ?? '—'}`);
  }
  return L;
}

function buildDayReport(date) {
  const d = day(date), dt = dayTypeFor(date), c = cycleInfo(date), ms = milestoneFor(date), mon = mondayOf(date);
  const L = [`РЫВОК — ОТЧЁТ ЗА ${fmt(date)} (${wd(date)})`, ''];
  L.push('Коучу: разбери день по фактам и сравни с прошлыми днями. Назови главную ошибку дня и дай одну конкретную правку на завтра. Без утешений.', '');
  L.push('## Положение');
  L.push(`- День ${dayNo(date)} из ${TOTAL_DAYS}; до 30.06.2027 осталось ${daysLeft(date)} дн.`);
  L.push(`- ${c ? `Цикл ${c.n} «${c.title}», неделя ${c.week} из ${c.weeks}` : 'До старта цикла 1'}; тип дня: ${dt.name}, цель фокуса ${dt.focusTarget} мин.`);
  if (ms) L.push(`- План недели: ${ms.text}`);
  const sp = scoreParts(date);
  L.push(`- Оценка дня: ${score(date)}/100 (утро ${sp.morning}/20, минимум ${sp.min}/30, задачи ${sp.tasks}/30, фокус ${sp.focus}/20). Сгоревших дней до этого: ${burnedBefore(date)}. Серия: ${streak()}.`, '');

  L.push('## Утренний блок', d.morning ? `Сделан до телефона, отмечен в ${d.morning}.` : 'НЕ сделан.', '');

  L.push('## Главные задачи');
  const tasks = d.tasks.filter(t => t.text.trim());
  L.push(...(tasks.length ? tasks.map(t => `- [${t.done ? 'x' : ' '}] ${DIRS[t.dir]?.name}: ${t.text.trim()}`) : ['- задачи не поставлены']), '');

  L.push(`## Минимальный день: ${minCount(d)}/${PLAN.minimumDay.length}`, ...PLAN.minimumDay.map(m => `- [${d.min[m.id] ? 'x' : ' '}] ${m.text}`), '');

  L.push(`## Фокус: ${focusMin(d)} из ${dt.focusTarget} мин`);
  const byDir = PLAN.directions.map(dir => [dir, focusMin(d, dir.id)]).filter(([, m]) => m > 0);
  L.push(...(byDir.length ? byDir.map(([dir, m]) => `- ${dir.name}: ${m} мин`) : ['- ни одного блока']));
  if (d.focus.length) L.push(`- Блоки: ${d.focus.map(f => `${f.at} ${DIRS[f.dir]?.name} ${f.min}`).join(', ')}`);
  L.push(`- Неделя на сегодня: ${PLAN.directions.filter(x => x.weeklyHours).map(x => `${x.name} ${(weekFocus(mon, x.id, date) / 60).toFixed(1)}/${x.weeklyHours} ч`).join(', ')}`, '');

  L.push('## Метрики', ...PLAN.metrics.map(g => `- ${g.group}: ${metricLine(g, d)}`), '');

  L.push('## Своими словами');
  for (const n of PLAN.notes) L.push(`### ${n.label}`, (d.notes[n.id] || '').trim() || '(пусто)');
  L.push('', ...last7(date), '', ...contextBlock(date));
  return L.join('\n');
}

function buildWeekReport(mon) {
  const w = week(mon), c = cycleInfo(addDays(mon, 3)) || cycleInfo(mon), ms = milestoneFor(addDays(mon, 3));
  const end = addDays(mon, 6);
  const L = [`РЫВОК — НЕДЕЛЬНЫЙ ОТЧЁТ ${fmt(mon)} – ${fmt(end)}`, ''];
  L.push('Коучу: оцени неделю по фактам против плана и бюджета часов. Что было главным тормозом? Предложи 3–5 целей на следующую неделю и одну правку в режиме.', '');
  L.push('## Положение');
  if (c) L.push(`- Цикл ${c.n} «${c.title}», неделя ${c.week} из ${c.weeks}.`);
  if (ms) L.push(`- План недели: ${ms.text}`);
  L.push(`- До 30.06.2027 осталось ${daysLeft(end)} дн. Сгоревших дней всего: ${burnedBefore(addDays(end, 1) > today() ? today() : addDays(end, 1))}.`, '');

  L.push('## По дням', 'дата | оценка | утро | минимум | фокус, мин | соцсети, мин | сон');
  for (let i = 0; i < 7; i++) {
    const x = addDays(mon, i), d = peek(x);
    L.push(`${fmtShort(x)} ${wd(x)} | ${score(x)} | ${d?.morning ? 'да' : 'нет'} | ${minCount(d)}/${PLAN.minimumDay.length} | ${focusMin(d)} | ${d?.metrics.social ?? '—'} | ${d?.metrics.sleep ?? '—'}`);
  }
  L.push('');

  L.push(`## Часы фокуса: ${(weekFocus(mon) / 60).toFixed(1)} ч`);
  L.push(...PLAN.directions.map(dir => [dir, weekFocus(mon, dir.id) / 60]).filter(([dir, h]) => h > 0 || dir.weeklyHours)
    .map(([dir, h]) => `- ${dir.name}: ${h.toFixed(1)}${dir.weeklyHours ? ` из ${dir.weeklyHours}` : ''} ч`), '');

  L.push('## Цифры недели');
  const nums = PLAN.metrics.flatMap(g => g.items).filter(m => m.type === 'num').map(m => [m, metricAgg(mon, m)]).filter(([, v]) => v !== null);
  L.push(...(nums.length ? nums.map(([m, v]) => `- ${m.label}${m.agg === 'avg' ? ' (среднее)' : ''}: ${v}${m.unit ? ' ' + m.unit : ''}`) : ['- нет данных']));
  const train = [...Array(7)].map((_, i) => peek(addDays(mon, i))?.metrics.train).filter(v => v && v !== '—');
  L.push(`- Тренировок: ${train.length}${train.length ? ` (${train.join(', ')})` : ''}`, '');

  L.push('## Цели недели', ...(w.goals.length ? w.goals.map(g => `- [${g.done ? 'x' : ' '}] ${g.text}`) : ['- не ставились']), '');

  L.push('## Что за неделю говорил');
  for (let i = 0; i < 7; i++) {
    const x = addDays(mon, i), d = peek(x);
    const bits = ['day', 'slip'].map(id => d?.notes[id]?.trim()).filter(Boolean);
    if (bits.length) L.push(`- ${fmtShort(x)} ${wd(x)}: ${bits.join(' / ')}`);
  }
  L.push('', '## Недельный разбор', w.review?.trim() || '(пусто)', '', ...contextBlock(mon));
  return L.join('\n');
}

async function exportText(name, text, mode) {
  if (mode === 'copy') {
    try { await navigator.clipboard.writeText(text); toast('Текст скопирован', 'copy'); return true; }
    catch (e) { toast('Не получилось скопировать. Скачай файл.'); return false; }
  }
  const file = new File([text], name, { type: 'text/plain' });
  if (mode === 'share' && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return true; }
    catch (e) { if (e.name === 'AbortError') return false; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast(mode === 'share' ? 'Файл скачан — отправь его в чат с коучем' : 'Файл скачан', 'download');
  return true;
}

// ---------- таймер ----------
const elapsed = () => S.timer ? S.timer.acc + (S.timer.since ? Date.now() - S.timer.since : 0) : 0;

function clockText() {
  const s = Math.ceil(Math.max(0, S.timer.duration * 60e3 - elapsed()) / 1000);
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

function updateTimerUI() {
  const fab = $('#tabs .fab'), tm = S.timer;
  if (!tm) {
    fab?.classList.remove('running');
    fab?.style.removeProperty('--p');
    return;
  }
  if (elapsed() >= tm.duration * 60e3) { finishTimer(true); return; }
  const p = elapsed() / (tm.duration * 60e3), txt = clockText();
  const clock = $('#clock'), arc = $('#ringArc'), ft = $('#fabTime');
  if (clock) clock.textContent = txt;
  if (arc) { arc.style.opacity = 1; arc.setAttribute('stroke-dashoffset', (RING_C * (1 - p)).toFixed(2)); }
  if (ft) ft.textContent = txt;
  if (fab) { fab.classList.add('running'); fab.style.setProperty('--p', p.toFixed(4)); }
}

function finishTimer(auto) {
  const { dir, duration } = S.timer;
  const min = Math.min(duration, Math.round(elapsed() / 60000));
  S.timer = null;
  if (min >= 1) day(today()).focus.push({ dir, min, at: nowTime() });
  save();
  render();
  if (auto) {
    ring3();
    notify('Блок завершён', `${DIRS[dir].name}: ${min} мин. Перерыв 5–10 минут — без ленты.`);
  }
  buzz([20, 60, 20]);
  toast(min >= 1 ? `Записано: ${DIRS[dir].name}, ${min} мин` : 'Меньше минуты — не записано', min >= 1 ? 'check' : 'x');
}

function ring3() {
  try {
    navigator.vibrate?.([300, 150, 300]);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach(t => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.3);
    });
  } catch (e) { /* звук недоступен */ }
}

async function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
    else new Notification(title, { body });
  } catch (e) { /* не удалось показать */ }
}

// ---------- голосовой ввод ----------
let rec = null, recEl = null;

function setRecUI(el, on) {
  document.querySelector(`[data-mic="${el.id}"]`)?.classList.toggle('rec', on);
  el.closest('.voice')?.classList.toggle('is-rec', on);
}

function toggleMic(btn) {
  const el = document.getElementById(btn.dataset.mic);
  if (!el) return;
  if (!SR) {
    toast('Здесь нет встроенного распознавания — нажми микрофон на клавиатуре', 'mic');
    el.focus();
    return;
  }
  if (rec) {
    const same = recEl === el;
    rec.stop();
    if (same) return;
  }
  const r = new SR();
  r.lang = 'ru-RU';
  r.continuous = true;
  r.interimResults = true;
  const base = el.value.trim() ? el.value.trimEnd() + ' ' : '';
  let finalText = '';
  r.onresult = e => {
    finalText = '';
    let interim = '';
    for (const res of e.results) {
      if (res.isFinal) finalText += res[0].transcript.trim() + ' ';
      else interim += res[0].transcript;
    }
    el.value = base + finalText + interim;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  r.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('Разреши доступ к микрофону', 'mic');
    else if (e.error === 'network') toast('Для распознавания нужен интернет');
    else if (e.error !== 'no-speech' && e.error !== 'aborted') toast('Ошибка распознавания: ' + e.error);
  };
  r.onend = () => {
    setRecUI(el, false);
    if (rec === r) { rec = null; recEl = null; }
    el.value = (base + finalText).trimEnd();
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  try { r.start(); } catch (e) { toast('Не удалось включить микрофон', 'mic'); return; }
  rec = r;
  recEl = el;
  setRecUI(el, true);
  buzz(12);
}

// ---------- ввод и действия ----------
function grow(el) {
  if (el.tagName !== 'TEXTAREA') return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 2 + 'px';
}

function bindInput(el) {
  const ds = el.dataset;
  const val = el.type === 'checkbox' ? el.checked : el.value;
  if (ds.wk) {
    const w = week(ds.wk);
    if (ds.review) w.review = val;
    else if (ds.goal) { const g = w.goals.find(x => x.id === ds.goal); if (g) g.done = val; }
    return true;
  }
  if (ds.income) { (S.income[ds.income] ||= {})[ds.src] = parseNum(val); return true; }
  if (ds.cg) {
    const g = S.cycleGoals[ds.cg]?.[ds.dir]?.find(x => x.id === ds.gid);
    if (g) g.done = val;
    return true;
  }
  if (!ds.date) return false;
  const d = day(ds.date);
  if (ds.note) d.notes[ds.note] = val;
  else if (ds.min) d.min[ds.min] = val;
  else if (ds.metric) d.metrics[ds.metric] = METRICS[ds.metric].type === 'num' ? parseNum(val) : val;
  else if (ds.task) { const t = d.tasks.find(x => x.id === ds.task); if (t) t[ds.f] = val; }
  else return false;
  return true;
}

function markReported(date) {
  day(date).min.report = true;
  save();
  render();
}

const metricOf = a => [day(a.dataset.date), METRICS[a.dataset.metric]];

const actions = {
  go(a) { setTab(a.dataset.tab); return 'done'; },
  morning() {
    const d = day(today());
    d.morning = d.morning ? null : nowTime();
    buzz(d.morning ? [10, 40, 18] : 8);
    if (d.morning) toast('Утренний блок засчитан · +20', 'sun');
  },
  scoreinfo() {
    const p = scoreParts(today());
    toast(`Утро ${p.morning}/20 · минимум ${p.min}/30 · задачи ${p.tasks}/30 · фокус ${p.focus}/20`, 'bolt');
    return 'done';
  },
  addtask() { day(today()).tasks.push({ id: uid(), text: '', dir: S.ui.dir, done: false }); },
  carry() {
    const d = day(today());
    const prev = peek(addDays(today(), -1));
    const left = (prev?.tasks || []).filter(t => t.text.trim() && !t.done && !d.tasks.some(x => x.text === t.text));
    if (!left.length) return toast('Со вчера переносить нечего');
    for (const t of left) {
      const slot = d.tasks.find(x => !x.text.trim());
      if (slot) Object.assign(slot, { text: t.text, dir: t.dir });
      else d.tasks.push({ id: uid(), text: t.text, dir: t.dir, done: false });
    }
    toast(`Перенесено: ${left.length}`, 'right');
  },

  tdir(a) { S.ui.dir = a.dataset.v; buzz(6); },
  tdur(a) { S.ui.dur = Number(a.dataset.v); buzz(6); },
  tstart() {
    S.timer = { dir: S.ui.dir, duration: S.ui.dur, acc: 0, since: Date.now() };
    buzz([10, 40, 10]);
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  },
  quickstart() { actions.tstart(); save(); setTab('focus'); return 'done'; },
  tpause() {
    const tm = S.timer;
    if (tm.since) { tm.acc += Date.now() - tm.since; tm.since = null; } else tm.since = Date.now();
    buzz(8);
  },
  tstop() { finishTimer(false); return 'done'; },
  tcancel() { if (confirm('Сбросить блок без записи?')) S.timer = null; },
  manual() {
    const n = parseInt($('#manualMin').value, 10);
    if (!n || n < 1 || n > 600) return toast('Введи минуты числом');
    day(today()).focus.push({ dir: S.ui.dir, min: n, at: nowTime() });
    $('#manualMin').value = '';
    toast(`Добавлено: ${DIRS[S.ui.dir].name}, ${n} мин`, 'check');
  },
  delfocus(a) { if (confirm('Удалить этот блок?')) day(today()).focus.splice(Number(a.dataset.i), 1); },

  step(a) {
    const [d, m] = metricOf(a);
    const cur = Number(d.metrics[m.id]) || 0;
    d.metrics[m.id] = Math.max(0, Math.round((cur + Number(a.dataset.d) * (m.step || 1)) * 10) / 10);
    buzz(5);
  },
  scale(a) {
    const [d, m] = metricOf(a), v = Number(a.dataset.v);
    d.metrics[m.id] = d.metrics[m.id] === v ? '' : v;
    buzz(5);
  },
  pick(a) { const [d, m] = metricOf(a); d.metrics[m.id] = a.dataset.v; buzz(5); },

  rdate(a) { reportDate = a.dataset.v; scrollStrip = true; buzz(5); },
  share() { exportText(`ryvok-${reportDate}.txt`, buildDayReport(reportDate), 'share').then(ok => ok && markReported(reportDate)); return 'done'; },
  download() { exportText(`ryvok-${reportDate}.txt`, buildDayReport(reportDate), 'download').then(ok => ok && markReported(reportDate)); return 'done'; },
  copy() { exportText('', buildDayReport(reportDate), 'copy').then(ok => ok && markReported(reportDate)); return 'done'; },

  wprev() { weekStart = addDays(weekStart, -7); },
  wnext() { weekStart = addDays(weekStart, 7); },
  addgoal() {
    const el = $('#newGoal'), text = el.value.trim();
    if (!text) return toast('Сначала напиши или наговори цель', 'mic');
    week(weekStart).goals.push({ id: uid(), text, done: false });
    el.value = '';
    buzz(8);
  },
  delgoal(a) { const w = week(weekStart); w.goals = w.goals.filter(g => g.id !== a.dataset.id); },
  wshare() { exportText(`ryvok-week-${weekStart}.txt`, buildWeekReport(weekStart), 'share'); return 'done'; },
  wdownload() { exportText(`ryvok-week-${weekStart}.txt`, buildWeekReport(weekStart), 'download'); return 'done'; },
  wcopy() { exportText('', buildWeekReport(weekStart), 'copy'); return 'done'; },

  addcg(a) {
    const n = (cycleInfo(today()) || PLAN.cycles[0]).n, dir = a.dataset.dir;
    const el = document.getElementById(`cg-${dir}`), text = el.value.trim();
    if (!text) return;
    ((S.cycleGoals[n] ||= {})[dir] ||= []).push({ id: uid(), text, done: false });
    el.value = '';
  },
  delcg(a) {
    const n = (cycleInfo(today()) || PLAN.cycles[0]).n, list = S.cycleGoals[n][a.dataset.dir];
    if (confirm('Удалить цель?')) S.cycleGoals[n][a.dataset.dir] = list.filter(g => g.id !== a.dataset.id);
  },

  install() { installPrompt?.prompt(); installPrompt = null; },
  async notif() {
    if (!('Notification' in window)) return toast('Уведомления тут не поддерживаются');
    const p = await Notification.requestPermission();
    if (p === 'granted') notify('Рывок', 'Уведомления работают. Таймер подаст сигнал, когда блок закончится.');
    else toast('Уведомления не разрешены', 'bell');
    render();
  },
  backup() { exportText(`ryvok-backup-${today()}.json`, JSON.stringify(S, null, 1), 'download'); return 'done'; },
  import() { $('#importFile').click(); return 'done'; },
  reset() {
    if (!confirm('Стереть все данные? Это не отменить.')) return 'done';
    if (prompt('Напиши СТЕРЕТЬ, чтобы подтвердить') !== 'СТЕРЕТЬ') return 'done';
    S = migrate(fresh());
    toast('Данные стёрты', 'trash');
  },
};

async function importBackup(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data.days || !data.meta) throw new Error('bad');
    if (!confirm('Заменить текущие данные копией из файла?')) return;
    S = migrate(data);
    save();
    render();
    toast('Копия загружена', 'check');
  } catch (e) { toast('Это не похоже на копию Рывка'); }
  $('#importFile').value = '';
}

document.addEventListener('click', e => {
  const tb = e.target.closest('#tabs > button');
  if (tb) { buzz(5); setTab(tb.dataset.tab); return; }
  const mic = e.target.closest('[data-mic]');
  if (mic) { e.preventDefault(); toggleMic(mic); return; }
  const a = e.target.closest('[data-act]');
  if (!a || a.disabled || !actions[a.dataset.act]) return;
  if (a.closest('summary')) e.preventDefault();
  const r = actions[a.dataset.act](a);
  if (r === 'done') return;
  save();
  render();
});

document.addEventListener('input', e => {
  if (bindInput(e.target)) save();
  grow(e.target);
});

document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'importFile') { importBackup(el.files[0]); return; }
  if (!bindInput(el)) return;
  if (el.type === 'checkbox') buzz(el.checked ? [8, 30, 12] : 6);
  save();
  render();
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
  if (e.target.id === 'newGoal') actions.addgoal();
  else if (e.target.id?.startsWith('cg-')) actions.addcg({ dataset: { dir: e.target.id.slice(3) } });
  else if (e.target.id === 'manualMin') actions.manual();
  else { e.target.blur(); return; }
  save();
  render();
});

document.addEventListener('toggle', e => {
  const el = e.target;
  if (el.id === 'repPrev') {
    if (previewOpen !== el.open) { previewOpen = el.open; render(); }
  } else if (el.dataset?.acc) {
    if (!!S.ui.open[el.dataset.acc] !== el.open) { S.ui.open[el.dataset.acc] = el.open; save(); }
  }
}, true);

function toast(msg, ic) {
  const t = $('#toast');
  t.innerHTML = `${ic ? icon(ic) : ''}<span>${esc(msg)}</span>`;
  t.classList.add('show');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => t.classList.remove('show'), 2800);
}

let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (tab === 'more') render(); });

// Смена дня в 04:00, пока приложение открыто
let shownDay = today();
function tick() {
  updateTimerUI();
  if (today() !== shownDay) { shownDay = today(); render(); }
}
setInterval(tick, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
navigator.storage?.persist?.();

renderNav();
render();
