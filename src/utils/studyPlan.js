import { spotKey } from './format';
import { addDays, keyToDate } from './activity';

export const PLAN_DEFAULTS = { spotsPerDay: 3, handsPerSpot: 30, durationDays: 7, order: 'sequential' };
export const EMPTY_PLAN_STORE = { active: null, archive: [] };

export const planSpotKey = spotKey;

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function normalizePlanStore(v) {
  if (!isPlainObject(v)) return EMPTY_PLAN_STORE;
  return {
    active: isPlainObject(v.active) && Array.isArray(v.active.spots) ? { days: {}, ...v.active } : null,
    archive: Array.isArray(v.archive) ? v.archive : [],
  };
}

export function planDayIndex(plan, today) {
  return Math.round((keyToDate(today) - keyToDate(plan.startDate)) / 86400000);
}
export const planEndDate = (plan) => addDays(plan.startDate, plan.durationDays - 1);
export const isPlanOver = (plan, today) => planDayIndex(plan, today) >= plan.durationDays;

// --- детерминированный ГСЧ, чтобы случайный выбор был одинаковым весь день ---
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Сколько рук по каждому споту сыграно в дни ДО указанного */
function handsBefore(plan, day) {
  const res = {};
  Object.entries(plan.days || {}).forEach(([k, d]) => {
    if (k >= day) return;
    Object.entries(d.progress || {}).forEach(([key, n]) => { res[key] = (res[key] || 0) + n; });
  });
  return res;
}

/**
 * Споты на день. existingKeys — Set ключей спотов, которые есть в базе (удалённые пропускаются).
 */
export function getDaySpots(plan, today, existingKeys) {
  const saved = plan.days?.[today]?.spots;
  const keys = plan.spots.map(planSpotKey).filter(k => !existingKeys || existingKeys.has(k));
  if (saved) return saved.filter(k => !existingKeys || existingKeys.has(k));
  if (keys.length === 0) return [];
  const n = Math.min(plan.spotsPerDay, keys.length);
  const idx = Math.max(0, planDayIndex(plan, today));

  if (plan.order === 'random') {
    const before = handsBefore(plan, today);
    const rnd = mulberry32(hashString(`${plan.id}|${today}`));
    const pool = keys.map(k => ({ k, w: 1 / (1 + (before[k] || 0)) }));
    const picked = [];
    while (picked.length < n && pool.length) {
      const total = pool.reduce((s, p) => s + p.w, 0);
      let r = rnd() * total;
      let i = 0;
      for (; i < pool.length - 1; i++) { r -= pool[i].w; if (r <= 0) break; }
      picked.push(pool.splice(i, 1)[0].k);
    }
    return picked;
  }

  const start = (idx * n) % keys.length;
  return Array.from({ length: n }, (_, i) => keys[(start + i) % keys.length]);
}

/** Прогресс дня: [{ key, done, target, complete }], dayComplete */
export function getDayProgress(plan, today, existingKeys) {
  const spots = getDaySpots(plan, today, existingKeys);
  const progress = plan.days?.[today]?.progress || {};
  const items = spots.map(key => {
    const done = progress[key] || 0;
    return { key, done, target: plan.handsPerSpot, complete: done >= plan.handsPerSpot };
  });
  return { items, dayComplete: items.length > 0 && items.every(i => i.complete) };
}

export function recordPlanProgress(plan, today, key, hands, existingKeys) {
  const spots = getDaySpots(plan, today, existingKeys);
  const day = plan.days?.[today] || { spots, progress: {} };
  return {
    ...plan,
    days: {
      ...plan.days,
      [today]: { spots: day.spots || spots, progress: { ...day.progress, [key]: (day.progress?.[key] || 0) + hands } },
    },
  };
}

/** Статусы дней для полоски: done | missed | today | future | partial */
export function getDayStrip(plan, today) {
  return Array.from({ length: plan.durationDays }, (_, i) => {
    const k = addDays(plan.startDate, i);
    const d = plan.days?.[k];
    const complete = d && d.spots.length > 0 && d.spots.every(s => (d.progress[s] || 0) >= plan.handsPerSpot);
    let status;
    if (complete) status = 'done';
    else if (k === today) status = 'today';
    else if (k > today) status = 'future';
    else status = d && Object.keys(d.progress).length ? 'partial' : 'missed';
    return { key: k, index: i + 1, status };
  });
}

/** Итоги плана по спотам из истории (сессии с planId) */
export function planSummary(plan, history, today) {
  const perSpot = {};
  const empty = () => ({ hands: 0, errors: 0, sessions: [] });
  plan.spots.forEach(s => { perSpot[planSpotKey(s)] = empty(); });
  [...history].sort((a, b) => a.date.localeCompare(b.date)).forEach(s => {
    if (s.planId !== plan.id || !s.hands) return;
    const k = spotKey(s);
    if (!perSpot[k]) perSpot[k] = empty();
    perSpot[k].hands += s.hands;
    perSpot[k].errors += s.errors;
    perSpot[k].sessions.push({ date: s.date, hands: s.hands, acc: Math.round(((s.hands - s.errors) / s.hands) * 100) });
  });
  const strip = getDayStrip(plan, today);
  return {
    perSpot,
    daysDone: strip.filter(d => d.status === 'done').length,
    totalHands: Object.values(perSpot).reduce((a, s) => a + s.hands, 0),
  };
}

/** Переименование спота/ситуации/папки внутри плана */
export function renameInPlan(plan, level, oldName, newName, ctx) {
  const map = (s) => {
    if (level === 'cat' && s.cat === oldName) return { ...s, cat: newName };
    if (level === 'sit' && s.cat === ctx.cat && s.sit === oldName) return { ...s, sit: newName };
    if (level === 'spot' && s.cat === ctx.cat && s.sit === ctx.sit && s.spot === oldName) return { ...s, spot: newName };
    return s;
  };
  const keyMap = {};
  const spots = plan.spots.map(s => { const n = map(s); keyMap[planSpotKey(s)] = planSpotKey(n); return n; });
  const rk = (k) => keyMap[k] || k;
  const days = {};
  Object.entries(plan.days || {}).forEach(([day, d]) => {
    days[day] = {
      spots: d.spots.map(rk),
      progress: Object.fromEntries(Object.entries(d.progress || {}).map(([k, v]) => [rk(k), v])),
    };
  });
  return { ...plan, spots, days };
}

export function spotLabel(plan, key) {
  const s = plan.spots.find(p => planSpotKey(p) === key);
  return s ? `${s.sit} / ${s.spot}` : key;
}

export function findPlanSpot(plan, key) {
  return plan.spots.find(p => planSpotKey(p) === key) || null;
}
