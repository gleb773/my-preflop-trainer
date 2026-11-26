/** Пороги серий правильных ответов. level: 1 — скромно … 4 — на весь экран */
export const STREAK_TIERS = [
  { at: 3, text: 'COMBO x3', level: 1 },
  { at: 5, text: 'SUPER COMBO', level: 1 },
  { at: 10, text: 'ULTRA COMBO', level: 2 },
  { at: 15, text: 'BRUTAL!', level: 2 },
  { at: 20, text: 'UNSTOPPABLE', level: 3 },
  { at: 30, text: 'FATALITY', level: 4 },
  { at: 50, text: 'PREFLOP GOD', level: 4 },
];

/** Порог, достигнутый ровно на этой серии, или null. После 50 — каждые +25. */
export function getStreakTier(streak) {
  const tier = STREAK_TIERS.find(t => t.at === streak);
  if (tier) return tier;
  if (streak > 50 && streak % 25 === 0) return { at: streak, text: `PREFLOP GOD x${streak}`, level: 4 };
  return null;
}

/** Уровень бейджа-счётчика для текущей серии (0 — не показывать) */
export function getStreakLevel(streak) {
  let level = 0;
  for (const t of STREAK_TIERS) if (streak >= t.at) level = t.level;
  return level;
}

export const BREAKER_MIN_STREAK = 5;
export const RECORD_MIN = 3;
