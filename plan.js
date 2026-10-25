// Всё, что относится к плану: даты, направления, цели, метрики.
// Этот файл читают и приложение, и Telegram-бот (bot/notify.mjs), поэтому здесь нет кода для страницы.

export const PLAN = {
  start: '2026-10-25',
  deadline: '2027-06-30',
  // День считается до 04:00 утра: отчёт в 01:30 ночи всё ещё идёт во вчерашний день.
  dayStartsAtHour: 4,

  goalIncome: 150000,

  cycles: [
    { n: 1, start: '2026-10-26', end: '2027-01-17', title: 'Запуск', incomeTarget: 70000 },
    { n: 2, start: '2027-01-18', end: '2027-04-11', title: 'Масштаб', incomeTarget: 110000 },
    { n: 3, start: '2027-04-12', end: '2027-06-30', title: 'Выход на 150 000', incomeTarget: 150000 },
  ],

  // weeklyHours — недельный бюджет фокус-часов
  directions: [
    { id: 'novella', name: 'Novella', color: '#f472b6', weeklyHours: 10 },
    { id: 'proveit', name: 'Prove It', color: '#60a5fa', weeklyHours: 7 },
    { id: 'misports', name: 'Mi Sports', color: '#34d399', weeklyHours: 3 },
    { id: 'notary', name: 'Нотариат', color: '#fbbf24', weeklyHours: 3 },
    { id: 'uni', name: 'Институт', color: '#a78bfa', weeklyHours: 0 },
    { id: 'health', name: 'Здоровье', color: '#f87171', weeklyHours: 0 },
    { id: 'other', name: 'Другое', color: '#9ca3af', weeklyHours: 0 },
  ],
  timerDirections: ['novella', 'proveit', 'misports', 'notary', 'uni', 'other'],

  incomeSources: [
    { id: 'misports', name: 'Mi Sports (твоя доля)' },
    { id: 'novella', name: 'Novella' },
    { id: 'proveit', name: 'Prove It' },
    { id: 'notary', name: 'Нотариат' },
    { id: 'other', name: 'Другое' },
  ],

  // По дню недели (0 = воскресенье)
  weekPattern: ['free', 'lecture', 'seminar', 'lecture', 'seminar', 'lecture', 'seminar'],
  dayTypes: {
    lecture: {
      name: 'лекции', focusTarget: 180,
      hint: 'Лекции — это твоё рабочее время. Ноутбук на паре: два фокус-блока по Novella или Prove It прямо там, третий — вечером.',
    },
    seminar: {
      name: 'семинары', focusTarget: 120,
      hint: 'Семинары ~3 часа. Утренний блок до выхода из дома и один блок вечером.',
    },
    free: {
      name: 'без пар', focusTarget: 240,
      hint: 'Сильный день: 4 часа фокуса. Вечером — недельный разбор.',
    },
  },

  minimumDay: [
    { id: 'nov', text: 'Novella: хотя бы одно рабочее действие' },
    { id: 'pi', text: 'Prove It: видео выложены на все аккаунты' },
    { id: 'not', text: 'Нотариат: 15 минут' },
    { id: 'body', text: 'Тело: тренировка или 50 отжиманий + 50 приседаний' },
    { id: 'report', text: 'Вечерний отчёт отправлен коучу (отмечается сам)' },
  ],

  notes: [
    { id: 'plan', when: 'morning', label: 'Что сегодня главное и почему' },
    { id: 'day', when: 'evening', label: 'Как прошёл день — расскажи как есть' },
    { id: 'slip', when: 'evening', label: 'Где отвлёкся или сорвался и что было перед этим' },
    { id: 'win', when: 'evening', label: 'Чем сегодня можно гордиться' },
    { id: 'tomorrow', when: 'evening', label: 'Главное на завтра' },
    { id: 'thoughts', when: 'evening', label: 'Мысли, тревоги, ситуации с людьми (дневник)' },
  ],

  // agg: как сводить за неделю — sum или avg
  metrics: [
    { group: 'Novella', items: [
      { id: 'nov_listings', label: 'Новых объявлений', type: 'num', agg: 'sum' },
      { id: 'nov_reels', label: 'Reels / постов', type: 'num', agg: 'sum' },
      { id: 'nov_msgs', label: 'Сообщений от клиентов', type: 'num', agg: 'sum' },
      { id: 'nov_sales', label: 'Продаж, шт', type: 'num', agg: 'sum' },
      { id: 'nov_rev', label: 'Выручка, ₽', type: 'num', agg: 'sum' },
    ] },
    { group: 'Prove It', items: [
      { id: 'pi_videos', label: 'Видео выложено', type: 'num', agg: 'sum' },
      { id: 'pi_views', label: 'Просмотров за день', type: 'num', agg: 'sum' },
      { id: 'pi_regs', label: 'Регистраций', type: 'num', agg: 'sum' },
      { id: 'pi_ftd', label: 'Депозитов (FTD)', type: 'num', agg: 'sum' },
      { id: 'pi_usd', label: 'Доход, $', type: 'num', agg: 'sum' },
    ] },
    { group: 'Mi Sports', items: [
      { id: 'ms_ship', label: 'Отправок', type: 'num', agg: 'sum' },
      { id: 'ms_sales', label: 'Продаж', type: 'num', agg: 'sum' },
    ] },
    { group: 'Знания', items: [
      { id: 'not_topic', label: 'Нотариат: что разобрал', type: 'text' },
      { id: 'eru', label: 'Эрудиция: что слушал', type: 'text' },
    ] },
    { group: 'Тело', items: [
      { id: 'sleep', label: 'Сон, часов', type: 'num', agg: 'avg' },
      { id: 'train', label: 'Тренировка', type: 'select', options: ['—', 'Зал', 'Бокс', 'Зал + бокс', 'Другое'] },
      { id: 'supps', label: 'Добавки приняты', type: 'check' },
    ] },
    { group: 'Голова', items: [
      { id: 'energy', label: 'Энергия, 1–10', type: 'num', agg: 'avg' },
      { id: 'mood', label: 'Настроение, 1–10', type: 'num', agg: 'avg' },
      { id: 'anx', label: 'Тревога, 1–10', type: 'num', agg: 'avg' },
      { id: 'social', label: 'Соцсети + YouTube, мин (смотри экранное время)', type: 'num', agg: 'sum' },
      { id: 'silence', label: 'Время в тишине, мин', type: 'num', agg: 'sum' },
    ] },
  ],

  // Фокус по неделям. Цикл 2 и 3 расписываем на разборе в конце предыдущего цикла.
  milestones: [
    { from: '2026-10-25', to: '2026-10-25', text: 'Нулевой день: поставить приложение, убрать YouTube и TikTok с телефона, закрыть минимальный день.' },
    { from: '2026-10-26', to: '2026-11-01', text: 'Запуск. Телефон без YouTube/TikTok. Записаться на анализы. Novella: Instagram, 10 шаблонов объявлений, список кадров. Prove It: постинг каждый день.' },
    { from: '2026-11-02', to: '2026-11-08', text: 'Mi Sports: новые позиции отсняты и выставлены за 3 дня. Prove It: 1 видео в день на каждый аккаунт. Novella: всё готово к приезду товара.' },
    { from: '2026-11-09', to: '2026-11-15', text: 'Novella: товар приехал — проверка качества, съёмка, все объявления за 7 дней. Подготовка к работе в конторе.' },
    { from: '2026-11-16', to: '2026-11-22', text: 'Старт в нотариальной конторе, журнал практики. Novella: Reels каждый день.' },
    { from: '2026-11-23', to: '2026-11-29', text: 'Novella: первые продажи и цифры по каждой модели. Prove It: какие видео дали больше всего просмотров.' },
    { from: '2026-11-30', to: '2026-12-06', text: 'Novella: отобрать 3–5 моделей-победителей. Prove It: масштабировать 2 лучших формата.' },
    { from: '2026-12-07', to: '2026-12-13', text: 'Novella: заказ основной партии (если качество подтвердилось). Нотариат: блок «Наследование».' },
    { from: '2026-12-14', to: '2026-12-20', text: 'Чекпойнт Prove It 20.12: воронка просмотры → регистрации → депозиты. Решение, что масштабировать.' },
    { from: '2026-12-21', to: '2026-12-27', text: 'Предновогодние продажи. Подготовка к сессии заранее.' },
    { from: '2026-12-28', to: '2027-01-03', text: 'Праздники: минимальный день обязателен каждый день.' },
    { from: '2027-01-04', to: '2027-01-10', text: 'Сессия. Режим: экзамены + минимальный день.' },
    { from: '2027-01-11', to: '2027-01-17', text: 'Сессия. Разбор цикла 1 и план цикла 2.' },
    { from: '2027-01-18', to: '2027-04-11', text: 'Цикл 2 «Масштаб»: недельный план составим на разборе 17.01.' },
    { from: '2027-04-12', to: '2027-06-30', text: 'Цикл 3 «Выход на 150 000»: недельный план составим на разборе 11.04.' },
  ],

  cycleGoals: {
    1: {
      novella: [
        'Все позиции тестовой партии на Авито не позже 7 дней после приезда',
        'Отобраны 3–5 моделей-победителей, заказана основная партия',
        'Instagram Novella: 30+ Reels',
      ],
      proveit: [
        'Постинг каждый день на все аккаунты без пропусков',
        '600+ видео суммарно за цикл',
        'Найдены 2–3 формата с просмотрами в 5 раз выше среднего',
        'Первые регистрации и депозиты по реферальной ссылке',
      ],
      misports: [
        'Новые позиции отсняты и выставлены за 3 дня после приезда',
        'Не больше 3 часов в неделю',
      ],
      notary: [
        'Старт работы в конторе 15.11, журнал практики ведётся',
        'Прочитаны Основы законодательства РФ о нотариате',
        'Пройден блок «Наследование» (ГК, часть 3)',
      ],
      uni: ['Зимняя сессия закрыта без долгов'],
      health: [
        'Анализы сданы, схема добавок по результатам',
        '3 тренировки в неделю в 80% недель',
        'Сон 7+ часов в среднем',
      ],
      other: [
        'YouTube заменён аудио по эрудиции',
        'Вечерний отчёт отправлен коучу в 90% дней',
        'Практика тишины дошла до 15 минут',
      ],
    },
  },
};

// ---------- даты (общие для приложения и бота) ----------
const pad = n => String(n).padStart(2, '0');
const parts = s => { const [y, m, d] = s.split('-').map(Number); return [y, m - 1, d]; };

export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDate = s => new Date(...parts(s));
export const diff = (a, b) => Math.round((Date.UTC(...parts(b)) - Date.UTC(...parts(a))) / 864e5);
export const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return ymd(d); };
export const mondayOf = s => addDays(s, -((parseDate(s).getDay() + 6) % 7));

export const TOTAL_DAYS = diff(PLAN.start, PLAN.deadline) + 1;
export const daysLeft = date => Math.max(0, diff(date, PLAN.deadline));
export const dayNo = date => diff(PLAN.start, date) + 1;

export function cycleInfo(date) {
  const c = PLAN.cycles.find(c => date >= c.start && date <= c.end);
  if (!c) return null;
  return { ...c, week: Math.floor(diff(c.start, date) / 7) + 1, weeks: Math.ceil((diff(c.start, c.end) + 1) / 7) };
}

export const milestoneFor = date => PLAN.milestones.find(m => date >= m.from && date <= m.to) || null;

export function dayTypeFor(date) {
  const id = PLAN.weekPattern[parseDate(date).getDay()];
  return { id, ...PLAN.dayTypes[id] };
}

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
