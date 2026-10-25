import {
  PLAN, TOTAL_DAYS, ymd, parseDate, addDays, mondayOf,
  daysLeft, dayNo, cycleInfo, milestoneFor, dayTypeFor, plural,
} from './plan.js';

const KEY = 'ryvok.v1';
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const DIRS = Object.fromEntries(PLAN.directions.map(d => [d.id, d]));
const METRICS = Object.fromEntries(PLAN.metrics.flatMap(g => g.items).map(m => [m.id, m]));
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const MIC = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const pad = n => String(n).padStart(2, '0');
const fmt = s => s.split('-').reverse().join('.');
const fmtShort = s => fmt(s).slice(0, 5);
const wd = s => WD[parseDate(s).getDay()];
const nowTime = () => new Date().toTimeString().slice(0, 5);
const rub = n => Math.round(n || 0).toLocaleString('ru-RU') + ' ₽';
const today = () => ymd(new Date(Date.now() - PLAN.dayStartsAtHour * 3600e3));

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
    ui: { dir: 'novella', dur: 50 },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* хранилище недоступно — начинаем с чистого листа */ }
  return fresh();
}

let S = load();
let tab = 'today';
let reportDate = today();
let weekStart = mondayOf(today());

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Не удалось сохранить. Сделай резервную копию во вкладке «Ещё».'); }
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

function score(date) {
  const d = peek(date);
  if (!d) return 0;
  let s = d.morning ? 20 : 0;
  s += 30 * minCount(d) / PLAN.minimumDay.length;
  const tasks = d.tasks.filter(t => t.text.trim());
  if (tasks.length) s += 30 * tasks.filter(t => t.done).length / tasks.length;
  s += 20 * Math.min(1, focusMin(d) / dayTypeFor(date).focusTarget);
  return Math.round(s);
}

function burnedBefore(date) {
  let n = 0;
  for (let x = S.meta.firstDay; x < date; x = addDays(x, 1)) if (!minDone(peek(x))) n++;
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

const incomeTotal = month => Object.values(S.income[month] || {}).reduce((a, b) => a + (Number(b) || 0), 0);
const lastIncomeMonth = () => Object.keys(S.income).filter(k => incomeTotal(k) > 0).sort().pop();

// ---------- отрисовка ----------
const voice = (attrs, id, value, label, rows = 3) => `
  ${label ? `<label class="lbl" for="${id}">${esc(label)}</label>` : ''}
  <div class="voice"><textarea id="${id}" ${attrs} rows="${rows}" placeholder="Нажми микрофон и говори">${esc(value || '')}</textarea>
  <button class="mic" data-mic="${id}" aria-label="Голосовой ввод">${MIC}</button></div>`;

const dirOptions = sel => PLAN.directions.map(d => `<option value="${d.id}" ${d.id === sel ? 'selected' : ''}>${esc(d.name)}</option>`).join('');

function render() {
  renderTop();
  $('#view').innerHTML = { today: viewToday, report: viewReport, week: viewWeek, goals: viewGoals, more: viewMore }[tab]();
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  document.querySelectorAll('textarea').forEach(grow);
}

function renderTop() {
  const t = today();
  const pct = Math.min(100, Math.round((dayNo(t) - 1) / TOTAL_DAYS * 100));
  $('#top').innerHTML = `<div class="topbar"><b>Рывок</b><span id="toptimer"></span><span class="muted small">${daysLeft(t)} дн · ${Math.max(0, pct)}%</span></div>`;
  updateTimerUI();
}

function viewToday() {
  const t = today(), d = day(t), c = cycleInfo(t), dt = dayTypeFor(t), ms = milestoneFor(t);
  const left = daysLeft(t), passed = Math.max(0, dayNo(t) - 1);
  const burned = burnedBefore(t);
  const plan = PLAN.notes.find(n => n.id === 'plan');
  return `
  <section class="card hero">
    <div class="row between">
      <div><div class="num">${left}</div><div class="muted">${plural(left, 'день остался', 'дня осталось', 'дней осталось')} до 30 июня 2027</div></div>
      <div class="score"><div class="sv">${score(t)}</div><div class="muted small">оценка дня</div></div>
    </div>
    <div class="bar"><i style="width:${passed / TOTAL_DAYS * 100}%"></i></div>
    <div class="row between small muted"><span>прошло ${passed} из ${TOTAL_DAYS}</span><span class="${burned ? 'bad' : ''}">сгорело дней: ${burned}</span></div>
    <div class="cyc">${c ? `Цикл ${c.n} «${esc(c.title)}» · неделя ${c.week} из ${c.weeks}` : 'Подготовка — цикл 1 стартует 26.10'}</div>
    ${ms ? `<div class="ms">${esc(ms.text)}</div>` : ''}
  </section>

  <section class="card daytype small"><b>${wd(t)[0].toUpperCase() + wd(t)[1]}, ${dt.name}.</b> ${esc(dt.hint)} <span class="muted">Цель фокуса: ${dt.focusTarget} мин.</span></section>

  <section class="card">
    <button class="morning ${d.morning ? 'done' : ''}" data-act="morning">${d.morning ? `✓ Утренний блок сделан · ${d.morning}` : 'Утренний блок сделан до телефона'}</button>
    <div class="small muted" style="margin-top:8px">Первые 60–120 минут после подъёма — одна главная задача. Соцсети после.</div>
  </section>

  <section class="card">
    <h2>Главные задачи</h2>
    ${d.tasks.map(task => taskRow(t, task)).join('')}
    <div class="row gap">
      ${d.tasks.length < 6 ? '<button class="btn small" data-act="addtask">+ задача</button>' : ''}
      <button class="btn small" data-act="carry">Перенести невыполненные со вчера</button>
    </div>
  </section>

  ${timerCard(t)}

  <section class="card">
    <h2>Минимальный день · ${minCount(d)}/${PLAN.minimumDay.length}</h2>
    ${PLAN.minimumDay.map(m => `<label class="check"><input type="checkbox" data-date="${t}" data-min="${m.id}" ${d.min[m.id] ? 'checked' : ''}><span>${esc(m.text)}</span></label>`).join('')}
    <div class="small muted" style="margin-top:6px">Не пропускай дважды подряд. Плохой день — это минимальный день, а не ноль.</div>
  </section>

  <section class="card">
    <h2>Утро</h2>
    ${voice(`data-date="${t}" data-note="plan"`, 'n-plan', d.notes.plan, plan.label)}
  </section>`;
}

const taskRow = (date, t) => `
  <div class="task ${t.done ? 'done' : ''}">
    <input type="checkbox" data-date="${date}" data-task="${t.id}" data-f="done" ${t.done ? 'checked' : ''} aria-label="Выполнено">
    <div class="tbody">
      <div class="voice one"><input type="text" id="t-${t.id}" data-date="${date}" data-task="${t.id}" data-f="text" value="${esc(t.text)}" placeholder="Что именно сделать">
      <button class="mic sm" data-mic="t-${t.id}" aria-label="Голосовой ввод">${MIC}</button></div>
      <select data-date="${date}" data-task="${t.id}" data-f="dir">${dirOptions(t.dir)}</select>
    </div>
  </div>`;

function timerCard(t) {
  const tm = S.timer, d = day(t), target = dayTypeFor(t).focusTarget, total = focusMin(d);
  const sel = tm ? tm.dir : S.ui.dir, dur = tm ? tm.duration : S.ui.dur;
  const sessions = d.focus.map((f, i) => `<span class="sess" style="border-left:3px solid ${DIRS[f.dir]?.color}">${esc(DIRS[f.dir]?.name)} ${f.min} мин · ${f.at}<button data-act="delfocus" data-i="${i}" aria-label="Удалить">×</button></span>`).join('');
  return `
  <section class="card timer">
    <h2>Фокус · ${total} из ${target} мин</h2>
    <div class="bar thin"><i style="width:${Math.min(100, total / target * 100)}%"></i></div>
    <div class="clock" id="clock">${tm ? clockText() : `${dur}:00`}</div>
    <div class="chips">${PLAN.timerDirections.map(id => `<button class="chip ${sel === id ? 'on' : ''}" data-act="tdir" data-v="${id}" ${tm ? 'disabled' : ''}>${esc(DIRS[id].name)}</button>`).join('')}</div>
    <div class="chips">${[25, 50, 90].map(m => `<button class="chip ${dur === m ? 'on' : ''}" data-act="tdur" data-v="${m}" ${tm ? 'disabled' : ''}>${m} мин</button>`).join('')}</div>
    <div class="row gap">
      ${!tm ? '<button class="btn primary grow" data-act="tstart">Старт</button>'
        : `<button class="btn grow" data-act="tpause">${tm.since ? 'Пауза' : 'Продолжить'}</button>
           <button class="btn primary grow" data-act="tstop">Записать</button>
           <button class="btn" data-act="tcancel" aria-label="Сбросить">✕</button>`}
    </div>
    ${sessions ? `<div class="sessions">${sessions}</div>` : ''}
    <div class="row gap"><input type="text" inputmode="numeric" id="manualMin" class="w80" placeholder="мин">
      <button class="btn small" data-act="manual">+ вручную в «${esc(DIRS[sel].name)}»</button></div>
  </section>`;
}

function metricInput(date, m, v) {
  const a = `data-date="${date}" data-metric="${m.id}"`;
  const id = `m-${m.id}`;
  if (m.type === 'check') return `<label class="mlabel" for="${id}">${esc(m.label)}</label><input type="checkbox" id="${id}" ${a} ${v ? 'checked' : ''}>`;
  if (m.type === 'select') return `<label class="mlabel" for="${id}">${esc(m.label)}</label><select id="${id}" ${a}>${m.options.map(o => `<option ${o === (v || m.options[0]) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  if (m.type === 'text') return `<label class="mlabel full" for="${id}">${esc(m.label)}</label><div class="voice one full"><input type="text" id="${id}" ${a} value="${esc(v ?? '')}"><button class="mic sm" data-mic="${id}" aria-label="Голосовой ввод">${MIC}</button></div>`;
  return `<label class="mlabel" for="${id}">${esc(m.label)}</label><input type="text" inputmode="decimal" id="${id}" ${a} value="${esc(v ?? '')}" placeholder="0">`;
}

function viewReport() {
  const date = reportDate, d = day(date), isToday = date === today();
  return `
  <section class="card row between datebar">
    <button class="btn" data-act="rprev" aria-label="Предыдущий день">‹</button>
    <div class="center"><b>${fmt(date)}</b> <span class="muted">${wd(date)}${isToday ? ' · сегодня' : ''}</span>
      <div class="small muted">оценка ${score(date)}/100 · минимум ${minCount(d)}/${PLAN.minimumDay.length}</div></div>
    <button class="btn" data-act="rnext" ${date >= today() ? 'disabled' : ''} aria-label="Следующий день">›</button>
  </section>
  ${isToday ? '' : '<section class="card small">Ты заполняешь прошлый день. <button class="btn small" data-act="rtoday">К сегодня</button></section>'}

  <section class="card">
    <h2>Голосом — 2–3 минуты</h2>
    ${PLAN.notes.filter(n => n.when === 'evening').map(n => voice(`data-date="${date}" data-note="${n.id}"`, `n-${n.id}`, d.notes[n.id], n.label, n.id === 'day' ? 4 : 2)).join('')}
  </section>

  ${PLAN.metrics.map(g => `<section class="card"><h2>${esc(g.group)}</h2><div class="grid2">${g.items.map(m => metricInput(date, m, d.metrics[m.id])).join('')}</div></section>`).join('')}

  <section class="card export">
    <h2>Отправить коучу</h2>
    <p class="small muted">В файле весь день, последние 7 дней и контекст целей. Просто отправь его в чат с Claude, объяснять ничего не нужно.</p>
    <button class="btn primary wide" data-act="share">Отправить файл</button>
    <div class="row gap"><button class="btn grow" data-act="download">Скачать .txt</button><button class="btn grow" data-act="copy">Скопировать текст</button></div>
    <details id="repPrev"><summary>Посмотреть, что внутри</summary><pre class="pre" id="repPre"></pre></details>
  </section>`;
}

function viewWeek() {
  const mon = weekStart, w = week(mon), t = today();
  const days = [...Array(7)].map((_, i) => addDays(mon, i));
  const c = cycleInfo(addDays(mon, 3)) || cycleInfo(mon);
  const ms = milestoneFor(addDays(mon, 3)) || milestoneFor(mon);
  const isNow = mon === mondayOf(t);
  const budgeted = PLAN.directions.filter(d => d.weeklyHours > 0);
  const totalBudget = budgeted.reduce((a, d) => a + d.weeklyHours, 0);
  const totalH = weekFocus(mon) / 60;
  const rows = PLAN.metrics.flatMap(g => g.items).filter(m => m.type === 'num')
    .map(m => [m, metricAgg(mon, m)]).filter(([, v]) => v !== null);
  return `
  <section class="card row between datebar">
    <button class="btn" data-act="wprev" aria-label="Прошлая неделя">‹</button>
    <div class="center"><b>${fmtShort(mon)} – ${fmtShort(addDays(mon, 6))}</b>${isNow ? ' <span class="muted">· эта неделя</span>' : ''}
      <div class="small muted">${c ? `Цикл ${c.n}, неделя ${c.week} из ${c.weeks}` : ''}</div></div>
    <button class="btn" data-act="wnext" aria-label="Следующая неделя">›</button>
  </section>
  ${ms ? `<section class="card daytype small"><b>План недели.</b> ${esc(ms.text)}</section>` : ''}

  <section class="card">
    <h2>Оценка по дням</h2>
    <div class="days">${days.map(x => `
      <div class="dcol ${x === t ? 'now' : ''}">
        <div class="dbar"><i class="${minDone(peek(x)) ? 'ok' : ''}" style="height:${tracked(x) ? Math.max(3, score(x)) : 0}%"></i></div>
        <div class="small">${wd(x)}</div><div class="small muted">${tracked(x) ? score(x) : '·'}</div>
      </div>`).join('')}</div>
    <div class="small muted" style="margin-top:8px">Оранжевый — минимальный день закрыт.</div>
  </section>

  <section class="card">
    <h2>Часы фокуса · ${totalH.toFixed(1)} из ${totalBudget} ч</h2>
    ${budgeted.map(dir => {
      const h = weekFocus(mon, dir.id) / 60;
      return `<div class="hrow"><span>${esc(dir.name)}</span><span class="muted">${h.toFixed(1)} / ${dir.weeklyHours} ч</span></div>
        <div class="bar thin"><i style="width:${Math.min(100, h / dir.weeklyHours * 100)}%;background:${dir.color}"></i></div>`;
    }).join('')}
  </section>

  <section class="card">
    <h2>Цели недели</h2>
    ${w.goals.map(g => `<div class="goal ${g.done ? 'done' : ''}"><input type="checkbox" data-wk="${mon}" data-goal="${g.id}" ${g.done ? 'checked' : ''}><span>${esc(g.text)}</span><button class="x" data-act="delgoal" data-id="${g.id}" aria-label="Удалить">×</button></div>`).join('') || '<div class="small muted">Поставь 3–5 целей на неделю. Каждая — проверяемая: «выложить 30 видео», а не «заняться Prove It».</div>'}
    <div class="addrow voice one"><input type="text" id="newGoal" placeholder="Новая цель недели"><button class="mic sm" data-mic="newGoal" aria-label="Голосовой ввод">${MIC}</button></div>
    <div class="row gap"><button class="btn small" data-act="addgoal">+ добавить</button></div>
  </section>

  ${rows.length ? `<section class="card"><h2>Цифры недели</h2><table class="sum">${rows.map(([m, v]) => `<tr><td>${esc(m.label)}${m.agg === 'avg' ? ' <span class="muted">(среднее)</span>' : ''}</td><td>${v.toLocaleString('ru-RU')}</td></tr>`).join('')}</table></section>` : ''}

  <section class="card">
    <h2>Недельный разбор</h2>
    ${voice(`data-wk="${mon}" data-review="1"`, 'wreview', w.review, 'Что сработало, что нет, что меняю на следующей неделе', 4)}
  </section>

  <section class="card export">
    <h2>Недельный отчёт коучу</h2>
    <button class="btn primary wide" data-act="wshare">Отправить файл недели</button>
    <div class="row gap"><button class="btn grow" data-act="wdownload">Скачать .txt</button><button class="btn grow" data-act="wcopy">Скопировать текст</button></div>
  </section>`;
}

function viewGoals() {
  const t = today(), month = t.slice(0, 7), inc = S.income[month] || {};
  const total = incomeTotal(month), c = cycleInfo(t) || PLAN.cycles[0];
  const n = c.n;
  const history = Object.keys(S.income).sort().reverse().filter(k => k !== month && incomeTotal(k) > 0);
  return `
  <section class="card">
    <h2>Главная цель</h2>
    <div class="big">${rub(PLAN.goalIncome)} в месяц</div>
    <div class="muted small">чистыми, к 30 июня 2027</div>
    <div class="bar"><i style="width:${Math.min(100, total / PLAN.goalIncome * 100)}%"></i></div>
    <div class="row between small"><span>${month.split('-').reverse().join('.')}: <b>${rub(total)}</b></span><span class="muted">цель цикла ${c.n}: ${rub(c.incomeTarget)}</span></div>
    <div class="grid2" style="margin-top:12px">
      ${PLAN.incomeSources.map(s => `<label class="mlabel" for="inc-${s.id}">${esc(s.name)}</label><input type="text" inputmode="numeric" id="inc-${s.id}" data-income="${month}" data-src="${s.id}" value="${esc(inc[s.id] ?? '')}" placeholder="0">`).join('')}
    </div>
    ${history.length ? `<div class="small muted" style="margin-top:10px">${history.map(k => `${k.split('-').reverse().join('.')}: ${rub(incomeTotal(k))}`).join(' · ')}</div>` : ''}
  </section>

  <section class="card">
    <h2>Циклы</h2>
    ${PLAN.cycles.map(cy => {
      const state = t > cy.end ? 'завершён' : t >= cy.start ? 'идёт' : 'впереди';
      const ci = cycleInfo(t);
      const pct = state === 'завершён' ? 100 : ci && ci.n === cy.n ? (ci.week - 1) / ci.weeks * 100 : 0;
      return `<div class="cycle ${state === 'идёт' ? 'now' : ''}"><div class="row between"><b>${cy.n}. ${esc(cy.title)}</b><span class="small muted">${state}</span></div>
        <div class="small muted">${fmtShort(cy.start)} – ${fmt(cy.end)} · доход к концу: ${rub(cy.incomeTarget)}/мес</div>
        <div class="bar thin"><i style="width:${pct}%"></i></div></div>`;
    }).join('')}
  </section>

  <section class="card">
    <h2>Цели цикла ${n} по направлениям</h2>
    ${PLAN.directions.map(dir => {
      const list = S.cycleGoals[n]?.[dir.id] || [];
      return `<div class="dirhead"><span class="dot" style="background:${dir.color}"></span>${esc(dir.name)}</div>
        ${list.map(g => `<div class="goal ${g.done ? 'done' : ''}"><input type="checkbox" data-cg="${n}" data-dir="${dir.id}" data-gid="${g.id}" ${g.done ? 'checked' : ''}><span>${esc(g.text)}</span><button class="x" data-act="delcg" data-dir="${dir.id}" data-id="${g.id}" aria-label="Удалить">×</button></div>`).join('')}
        <div class="addrow"><input type="text" id="cg-${dir.id}" placeholder="+ цель"><button class="btn small" data-act="addcg" data-dir="${dir.id}">OK</button></div>`;
    }).join('')}
  </section>

  <section class="card">
    <h2>План по неделям</h2>
    <ul class="mslist">${PLAN.milestones.map(m => `<li class="${t >= m.from && t <= m.to ? 'now' : t > m.to ? 'past' : ''}"><b>${fmtShort(m.from)}${m.to !== m.from ? '–' + fmtShort(m.to) : ''}</b> · ${esc(m.text)}</li>`).join('')}</ul>
  </section>`;
}

function viewMore() {
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  return `
  <section class="card">
    <h2>Установить на телефон</h2>
    ${installPrompt ? '<button class="btn primary wide" data-act="install">Установить приложение</button>' : ''}
    <p class="small"><b>Android (Chrome):</b> меню ⋮ → «Установить приложение» или «Добавить на главный экран».</p>
    <p class="small"><b>iPhone (Safari):</b> кнопка «Поделиться» → «На экран „Домой“».</p>
  </section>

  <section class="card">
    <h2>Голосовой ввод</h2>
    <p class="small">${SR ? 'Работает: нажми микрофон у любого поля и говори, нажми ещё раз, чтобы остановить. Нужен интернет.' : 'Этот браузер не умеет распознавать речь сам. Используй микрофон на клавиатуре телефона — он работает в любом поле.'}</p>
  </section>

  <section class="card">
    <h2>Уведомления таймера</h2>
    <p class="small muted">Сейчас: ${{ granted: 'включены', denied: 'запрещены в настройках браузера', default: 'не включены', unsupported: 'не поддерживаются' }[perm]}.</p>
    <div class="row gap"><button class="btn small" data-act="notif">Включить и проверить</button></div>
    <p class="small muted" style="margin-top:10px">Напоминания утром и вечером присылает Telegram-бот, он настраивается отдельно (см. README).</p>
  </section>

  <section class="card">
    <h2>Резервная копия</h2>
    <p class="small muted">Данные хранятся только на этом устройстве. Раз в неделю скачивай копию — так ничего не потеряется и можно перенести на другой телефон.</p>
    <div class="row gap"><button class="btn grow" data-act="backup">Скачать копию</button><button class="btn grow" data-act="import">Загрузить копию</button></div>
  </section>

  <section class="card">
    <h2>Сброс</h2>
    <button class="btn small danger" data-act="reset">Стереть все данные</button>
  </section>
  <p class="small muted center">Рывок · ${fmt(PLAN.start)} → ${fmt(PLAN.deadline)}</p>`;
}

// ---------- отчёты для коуча ----------
function metricLine(g, d) {
  const parts = g.items.map(m => {
    const v = d?.metrics[m.id];
    if (v === undefined || v === '' || v === false || (m.type === 'select' && v === m.options[0])) return null;
    return m.type === 'check' ? m.label : `${m.label}: ${v}`;
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
  L.push(`- Оценка дня: ${score(date)}/100. Сгоревших дней до этого (минимум не закрыт): ${burnedBefore(date)}.`, '');

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
  L.push(...(nums.length ? nums.map(([m, v]) => `- ${m.label}${m.agg === 'avg' ? ' (среднее)' : ''}: ${v}`) : ['- нет данных']));
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
    try { await navigator.clipboard.writeText(text); toast('Текст скопирован'); return true; }
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
  if (mode === 'share') toast('Файл скачан — отправь его в чат с коучем');
  return true;
}

// ---------- таймер ----------
const elapsed = () => S.timer ? S.timer.acc + (S.timer.since ? Date.now() - S.timer.since : 0) : 0;

function clockText() {
  const s = Math.ceil(Math.max(0, S.timer.duration * 60e3 - elapsed()) / 1000);
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

function updateTimerUI() {
  const top = document.getElementById('toptimer');
  if (!S.timer) { if (top) top.textContent = ''; return; }
  if (elapsed() >= S.timer.duration * 60e3) { finishTimer(true); return; }
  const txt = clockText();
  const clock = document.getElementById('clock');
  if (clock) clock.textContent = txt;
  if (top) top.textContent = `⏱ ${txt} · ${DIRS[S.timer.dir].name}${S.timer.since ? '' : ' · пауза'}`;
}

function finishTimer(auto) {
  const { dir, duration } = S.timer;
  const min = Math.min(duration, Math.round(elapsed() / 60000));
  S.timer = null;
  if (min >= 1) day(today()).focus.push({ dir, min, at: nowTime() });
  save();
  render();
  if (auto) {
    ring();
    notify('Блок завершён', `${DIRS[dir].name}: ${min} мин. Перерыв 5–10 минут — без ленты.`);
  }
  toast(min >= 1 ? `Записано: ${DIRS[dir].name}, ${min} мин` : 'Меньше минуты — не записано');
}

function ring() {
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

function toggleMic(btn) {
  const el = document.getElementById(btn.dataset.mic);
  if (!el) return;
  if (!SR) {
    toast('Здесь нет встроенного распознавания — нажми микрофон на клавиатуре телефона');
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
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('Разреши доступ к микрофону');
    else if (e.error === 'network') toast('Для распознавания нужен интернет');
    else if (e.error !== 'no-speech' && e.error !== 'aborted') toast('Ошибка распознавания: ' + e.error);
  };
  r.onend = () => {
    btn.classList.remove('rec');
    if (rec === r) { rec = null; recEl = null; }
    el.value = (base + finalText).trimEnd();
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  try { r.start(); } catch (e) { toast('Не удалось включить микрофон'); return; }
  rec = r;
  recEl = el;
  btn.classList.add('rec');
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
  if (ds.income) {
    const n = Number(String(val).replace(/\s/g, '').replace(',', '.'));
    (S.income[ds.income] ||= {})[ds.src] = val === '' || isNaN(n) ? '' : n;
    return true;
  }
  if (ds.cg) {
    const g = S.cycleGoals[ds.cg]?.[ds.dir]?.find(x => x.id === ds.gid);
    if (g) g.done = val;
    return true;
  }
  if (!ds.date) return false;
  const d = day(ds.date);
  if (ds.note) d.notes[ds.note] = val;
  else if (ds.min) d.min[ds.min] = val;
  else if (ds.metric) {
    const m = METRICS[ds.metric];
    if (m.type === 'num') {
      const n = Number(String(val).replace(/\s/g, '').replace(',', '.'));
      d.metrics[ds.metric] = val === '' || isNaN(n) ? '' : n;
    } else d.metrics[ds.metric] = val;
  } else if (ds.task) {
    const t = d.tasks.find(x => x.id === ds.task);
    if (t) t[ds.f] = val;
  } else return false;
  return true;
}

function markReported(date) {
  day(date).min.report = true;
  save();
  render();
}

const actions = {
  morning() { const d = day(today()); d.morning = d.morning ? null : nowTime(); },
  addtask() { day(today()).tasks.push({ id: uid(), text: '', dir: 'novella', done: false }); },
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
    toast(`Перенесено: ${left.length}`);
  },
  tdir(a) { S.ui.dir = a.dataset.v; },
  tdur(a) { S.ui.dur = Number(a.dataset.v); },
  tstart() {
    S.timer = { dir: S.ui.dir, duration: S.ui.dur, acc: 0, since: Date.now() };
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  },
  tpause() {
    const tm = S.timer;
    if (tm.since) { tm.acc += Date.now() - tm.since; tm.since = null; } else tm.since = Date.now();
  },
  tstop() { finishTimer(false); return 'done'; },
  tcancel() { if (confirm('Сбросить блок без записи?')) S.timer = null; },
  manual() {
    const n = parseInt($('#manualMin').value, 10);
    if (!n || n < 1 || n > 600) return toast('Введи минуты числом');
    day(today()).focus.push({ dir: S.ui.dir, min: n, at: nowTime() });
    toast(`Добавлено: ${DIRS[S.ui.dir].name}, ${n} мин`);
  },
  delfocus(a) { if (confirm('Удалить этот блок?')) day(today()).focus.splice(Number(a.dataset.i), 1); },

  rprev() { reportDate = addDays(reportDate, -1); },
  rnext() { if (reportDate < today()) reportDate = addDays(reportDate, 1); },
  rtoday() { reportDate = today(); },
  share() { exportText(`ryvok-${reportDate}.txt`, buildDayReport(reportDate), 'share').then(ok => ok && markReported(reportDate)); return 'done'; },
  download() { exportText(`ryvok-${reportDate}.txt`, buildDayReport(reportDate), 'download').then(ok => ok && markReported(reportDate)); return 'done'; },
  copy() { exportText('', buildDayReport(reportDate), 'copy').then(ok => ok && markReported(reportDate)); return 'done'; },

  wprev() { weekStart = addDays(weekStart, -7); },
  wnext() { weekStart = addDays(weekStart, 7); },
  addgoal() {
    const el = $('#newGoal'), text = el.value.trim();
    if (!text) return toast('Сначала напиши или наговори цель');
    week(weekStart).goals.push({ id: uid(), text, done: false });
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
    else toast('Уведомления не разрешены');
    render();
  },
  backup() { exportText(`ryvok-backup-${today()}.json`, JSON.stringify(S, null, 1), 'download'); return 'done'; },
  import() { $('#importFile').click(); return 'done'; },
  reset() {
    if (!confirm('Стереть все данные? Это не отменить.')) return 'done';
    if (prompt('Напиши СТЕРЕТЬ, чтобы подтвердить') !== 'СТЕРЕТЬ') return 'done';
    S = fresh();
    toast('Данные стёрты');
  },
};

async function importBackup(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data.days || !data.meta) throw new Error('bad');
    if (!confirm('Заменить текущие данные копией из файла?')) return;
    S = data;
    save();
    render();
    toast('Копия загружена');
  } catch (e) { toast('Это не похоже на копию Рывка'); }
  $('#importFile').value = '';
}

document.addEventListener('click', e => {
  const tb = e.target.closest('#tabs button');
  if (tb) {
    tab = tb.dataset.tab;
    if (tab === 'report') reportDate = today();
    render();
    scrollTo(0, 0);
    return;
  }
  const mic = e.target.closest('[data-mic]');
  if (mic) { e.preventDefault(); toggleMic(mic); return; }
  const a = e.target.closest('[data-act]');
  if (!a || a.disabled || !actions[a.dataset.act]) return;
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
  if (el.type === 'checkbox' || el.tagName === 'SELECT') {
    bindInput(el);
    save();
    render();
  } else if (el.dataset.income) render();
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (e.target.id === 'newGoal') actions.addgoal();
  else if (e.target.id?.startsWith('cg-')) actions.addcg({ dataset: { dir: e.target.id.slice(3) } });
  else return;
  save();
  render();
});

document.addEventListener('toggle', e => {
  if (e.target.id === 'repPrev' && e.target.open) $('#repPre').textContent = buildDayReport(reportDate);
}, true);

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => t.classList.remove('show'), 2600);
}

let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (tab === 'more') render(); });

// Смена дня в 04:00, пока приложение открыто
let shownDay = today();
setInterval(() => {
  updateTimerUI();
  if (today() !== shownDay) { shownDay = today(); render(); }
}, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { updateTimerUI(); if (today() !== shownDay) { shownDay = today(); render(); } } });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
navigator.storage?.persist?.();

render();
