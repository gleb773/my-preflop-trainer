/** Нормализованные веса руки; если руки нет в споте — 100% Fold */
export function getWeights(data = {}) {
  const Allin = Number(data.Allin) || 0;
  const Raise = Number(data.Raise) || 0;
  const Call = Number(data.Call) || 0;
  const Fold = data.Fold !== undefined ? Number(data.Fold) : Math.max(0, 100 - Allin - Raise - Call);
  return { Allin, Raise, Call, Fold };
}

export function getCellBackground(data, colors, striped = false) {
  const { Allin: a, Raise: r, Call: c } = getWeights(data);
  const s1 = a, s2 = a + r, s3 = a + r + c;
  const base = `linear-gradient(to right, ${colors.Allin} 0% ${s1}%, ${colors.Raise} ${s1}% ${s2}%, ${colors.Call} ${s2}% ${s3}%, ${colors.Fold} ${s3}% 100%)`;
  if (striped) {
    return `repeating-linear-gradient(45deg, rgba(0,0,0,0.7), rgba(0,0,0,0.7) 4px, rgba(20,20,20,0.9) 4px, rgba(20,20,20,0.9) 8px), ${base}`;
  }
  return base;
}
