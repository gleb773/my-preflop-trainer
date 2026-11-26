export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const RANK_ORDER = 'AKQJT98765432';
export const SUITS = ['s', 'h', 'd', 'c'];
export const ACTIONS = ['Fold', 'Call', 'Raise', 'Allin'];
export const TOTAL_COMBOS = 1326;

function generateHandMatrix() {
  const hands = [];
  for (let i = 0; i < RANKS.length; i++) {
    for (let j = 0; j < RANKS.length; j++) {
      if (i === j) hands.push(`${RANKS[i]}${RANKS[j]}`);
      else if (i < j) hands.push(`${RANKS[i]}${RANKS[j]}s`);
      else hands.push(`${RANKS[j]}${RANKS[i]}o`);
    }
  }
  return hands;
}

/** 169 рук в порядке матрицы 13×13 */
export const HANDS = generateHandMatrix();
const HAND_SET = new Set(HANDS);

export const getCombosCount = (hand) => {
  if (hand.length === 2) return 6;
  if (hand[2] === 's') return 4;
  return 12;
};

/** "AsKd" -> "AKo" */
export const getAbstractHand = (comboStr) => {
  if (comboStr.length !== 4) return null;
  const r1 = comboStr[0].toUpperCase(), s1 = comboStr[1].toLowerCase();
  const r2 = comboStr[2].toUpperCase(), s2 = comboStr[3].toLowerCase();
  if (!RANK_ORDER.includes(r1) || !RANK_ORDER.includes(r2)) return null;
  if (!SUITS.includes(s1) || !SUITS.includes(s2)) return null;
  if (r1 === r2) return s1 === s2 ? null : r1 + r2;
  const [first, second] = RANK_ORDER.indexOf(r1) < RANK_ORDER.indexOf(r2) ? [r1, r2] : [r2, r1];
  return first + second + (s1 === s2 ? 's' : 'o');
};

/**
 * Абстрактная запись руки ("AKs", "AKo", "QQ", "AK") -> список рук матрицы.
 * "AK" без суффикса означает и AKs, и AKo.
 */
export const parseAbstractHand = (str) => {
  const s = str.trim();
  if (s.length < 2 || s.length > 3) return null;
  const r1 = s[0].toUpperCase(), r2 = s[1].toUpperCase();
  if (!RANK_ORDER.includes(r1) || !RANK_ORDER.includes(r2)) return null;
  const [first, second] = RANK_ORDER.indexOf(r1) <= RANK_ORDER.indexOf(r2) ? [r1, r2] : [r2, r1];
  if (first === second) return s.length === 2 ? [first + second] : null;
  if (s.length === 2) return [first + second + 's', first + second + 'o'];
  const suffix = s[2].toLowerCase();
  if (suffix !== 's' && suffix !== 'o') return null;
  const hand = first + second + suffix;
  return HAND_SET.has(hand) ? [hand] : null;
};

export const getNeighbors = (handIndex) => {
  const row = Math.floor(handIndex / 13);
  const col = handIndex % 13;
  const neighbors = [];
  for (let r = Math.max(0, row - 1); r <= Math.min(12, row + 1); r++) {
    for (let c = Math.max(0, col - 1); c <= Math.min(12, col + 1); c++) {
      neighbors.push(r * 13 + c);
    }
  }
  return neighbors;
};

const isPlayed = (d) => d && (d.Allin > 0 || d.Raise > 0 || d.Call > 0);

/** Зона тренировки: разыгрываемые руки + ореол вокруг них, с ручными исключениями (inZone). */
export const getActivePool = (spotData = {}) => {
  const haloSet = new Set();
  HANDS.forEach((h, idx) => {
    if (isPlayed(spotData[h])) getNeighbors(idx).forEach(n => haloSet.add(HANDS[n]));
  });
  const pool = HANDS.filter(h => {
    const manual = spotData[h]?.inZone;
    if (manual !== undefined) return manual;
    return haloSet.has(h);
  });
  return pool.length > 0 ? pool : HANDS;
};

/**
 * Взвешенный выбор: рука с ошибками выпадает чаще.
 * stats: { [hand]: { attempts, errors } }
 */
export const pickWeightedHand = (pool, stats = {}) => {
  const weights = pool.map(h => {
    const s = stats[h];
    if (!s || !s.attempts) return 1;
    return 1 + 4 * (s.errors / s.attempts);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
};

export const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Случайные масти для руки */
export const dealCards = (hand) => {
  let s1, s2;
  if (hand.length === 3 && hand[2] === 's') {
    s1 = s2 = pickRandom(SUITS);
  } else {
    s1 = pickRandom(SUITS);
    do { s2 = pickRandom(SUITS); } while (s1 === s2);
  }
  return [{ rank: hand[0], suit: s1 }, { rank: hand[1], suit: s2 }];
};
