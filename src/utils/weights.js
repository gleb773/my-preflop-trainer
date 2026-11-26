export const round2 = (v) => Math.round(Number(v) * 100) / 100;
export const clampPct = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return round2(Math.min(100, Math.max(0, n)));
};

// Порядок, в котором «отнимаем» проценты при переполнении
const REDUCE_ORDER = ['Call', 'Raise', 'Allin'];

/**
 * Пересчитывает веса так, чтобы Allin + Raise + Call + Fold = 100.
 * @param {{Allin:number, Raise:number, Call:number}} w текущие веса
 * @param {'Allin'|'Raise'|'Call'|'Fold'} action что меняем
 * @param {number} value новое значение (0..100)
 * @param {'Allin'|'Raise'|'Call'} fillAction куда добавить проценты, если уменьшили Fold
 */
export function rebalanceWeights(w, action, value, fillAction = 'Raise') {
  const res = { Allin: Number(w.Allin) || 0, Raise: Number(w.Raise) || 0, Call: Number(w.Call) || 0 };
  const v = clampPct(value);

  const reduce = (excess, exclude) => {
    for (const key of REDUCE_ORDER) {
      if (excess <= 0) break;
      if (key === exclude) continue;
      const take = Math.min(excess, res[key]);
      res[key] -= take;
      excess -= take;
    }
  };

  if (action === 'Fold') {
    const target = 100 - v;
    const cur = res.Allin + res.Raise + res.Call;
    if (cur > target) reduce(cur - target, null);
    else if (cur < target) res[fillAction] += target - cur;
  } else {
    res[action] = v;
    const sum = res.Allin + res.Raise + res.Call;
    if (sum > 100) reduce(sum - 100, action);
  }

  const Allin = round2(res.Allin), Raise = round2(res.Raise), Call = round2(res.Call);
  return { Allin, Raise, Call, Fold: round2(Math.max(0, 100 - Allin - Raise - Call)) };
}
