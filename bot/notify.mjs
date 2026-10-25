// Отправляет напоминание в Telegram. Запускается GitHub Actions по расписанию (.github/workflows/telegram.yml).
// Режимы: morning, midday, evening, weekly, test, chatid (показать chat_id в логе).
import { TOTAL_DAYS, daysLeft, dayNo, cycleInfo, milestoneFor, dayTypeFor, plural } from '../plan.js';

const { TG_TOKEN, TG_CHAT_ID, APP_URL = '', KIND = '', SCHEDULE = '' } = process.env;

// Должно совпадать с cron в workflow (время UTC, Москва = UTC+3)
const BY_CRON = {
  '30 4 * * *': 'morning',
  '0 10 * * 1-6': 'midday',
  '30 18 * * *': 'evening',
  '0 16 * * 0': 'weekly',
};
const kind = KIND || BY_CRON[SCHEDULE] || 'test';

if (!TG_TOKEN) {
  console.error('Нет секрета TG_TOKEN. Добавь его: Settings → Secrets and variables → Actions.');
  process.exit(1);
}

const api = (method, body) => fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body || {}),
}).then(r => r.json());

if (kind === 'chatid') {
  const res = await api('getUpdates');
  const chats = new Map();
  for (const u of res.result || []) {
    const chat = (u.message || u.edited_message || u.my_chat_member || {}).chat;
    if (chat) chats.set(chat.id, chat.first_name || chat.title || '');
  }
  console.log(chats.size
    ? [...chats].map(([id, name]) => `chat_id: ${id}  (${name})`).join('\n')
    : 'Пусто. Напиши своему боту в Telegram любое сообщение и запусти ещё раз.');
  process.exit(0);
}

if (!TG_CHAT_ID) {
  console.error('Нет секрета TG_CHAT_ID. Сначала запусти workflow в режиме chatid.');
  process.exit(1);
}

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const left = daysLeft(today);
const c = cycleInfo(today), ms = milestoneFor(today), dt = dayTypeFor(today);
const pct = Math.max(0, Math.round((dayNo(today) - 1) / TOTAL_DAYS * 100));
const head = `<b>${left} ${plural(left, 'день', 'дня', 'дней')}</b> до 30.06.2027 · прошло ${pct}%`
  + (c ? `\nЦикл ${c.n} «${esc(c.title)}», неделя ${c.week} из ${c.weeks}` : '');
const link = APP_URL ? `\n\n${APP_URL}` : '';

const texts = {
  morning: `Подъём.\n${head}\n\n${ms ? `<b>План недели:</b> ${esc(ms.text)}\n\n` : ''}<b>Сегодня ${dt.name}.</b> ${esc(dt.hint)}\n\nПервый час — главная задача. Телефон после. Отметь утренний блок, когда сделаешь.`,
  midday: `Середина дня.\nСколько фокус-минут уже есть? Если ноль — запусти 25-минутный блок прямо сейчас, а не через час.\n\n${head}`,
  evening: `Вечерний отчёт.\n1. Закрой минимальный день\n2. Наговори голосом 2–3 минуты во вкладке «Отчёт»\n3. «Отправить файл» → в чат коучу\n\nМинимальный день ещё не закрыт? Время есть до 4 утра.\n\n${head}`,
  weekly: `Недельный разбор.\nОткрой «Неделя»: часы против бюджета, цифры, наговори итоги, отправь недельный файл коучу и поставь цели на следующую неделю.\n\n${head}`,
  test: `Бот работает.\n${head}`,
};

const res = await api('sendMessage', {
  chat_id: TG_CHAT_ID,
  text: (texts[kind] || texts.test) + link,
  parse_mode: 'HTML',
  link_preview_options: { is_disabled: true },
});
if (!res.ok) {
  console.error('Telegram ответил ошибкой:', res.description);
  process.exit(1);
}
console.log(`Отправлено: ${kind}`);
