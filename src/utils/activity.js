export const DEFAULT_DAILY_GOAL = 30;

const pad = (n) => String(n).padStart(2, '0');

/** Локальная дата 'YYYY-MM-DD' */
export function dayKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Ключ -> Date (локальная полночь) */
export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export const normalizeGoal = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 1000) : DEFAULT_DAILY_GOAL;
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export const normalizeActivity = (a) => {
  if (!isPlainObject(a)) return {};
  const res = {};
  Object.entries(a).forEach(([k, v]) => {
    const n = Number(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(n) && n > 0) res[k] = n;
  });
  return res;
};

/** Начальное заполнение из уже накопленной истории сессий */
export function buildActivityFromHistory(history) {
  const res = {};
  (Array.isArray(history) ? history : []).forEach(s => {
    if (!s?.date || !s.hands) return;
    const k = dayKey(new Date(s.date));
    res[k] = (res[k] || 0) + s.hands;
  });
  return res;
}

/**
 * Серия дней с выполненной нормой.
 * current — считается от сегодня, если норма выполнена, иначе от вчера (серия жива до конца дня).
 */
export function computeDailyStreak(activity, goal, todayKey = dayKey()) {
  const done = (k) => (activity[k] || 0) >= goal;
  const todayHands = activity[todayKey] || 0;
  const todayDone = todayHands >= goal;

  let current = 0;
  let cursor = todayDone ? todayKey : addDays(todayKey, -1);
  while (done(cursor)) { current++; cursor = addDays(cursor, -1); }

  const doneDays = Object.keys(activity).filter(done).sort();
  let longest = 0, run = 0, prev = null;
  doneDays.forEach(k => {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = k;
  });

  return {
    current, longest, totalDays: doneDays.length,
    todayHands, todayDone, goal,
    atRisk: current > 0 && !todayDone,
  };
}
