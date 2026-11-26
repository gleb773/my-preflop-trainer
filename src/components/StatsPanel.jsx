import { HANDS, getCombosCount, TOTAL_COMBOS } from '../utils/hands';
import { getWeights } from '../utils/cellStyle';

export default function StatsPanel({ spotData, colors }) {
  const sum = { Fold: 0, Call: 0, Raise: 0, Allin: 0 };
  HANDS.forEach(h => {
    const w = getWeights(spotData?.[h]);
    const combos = getCombosCount(h);
    Object.keys(sum).forEach(k => { sum[k] += (w[k] / 100) * combos; });
  });
  return (
    <div className="stats-panel">
      {['Fold', 'Call', 'Raise', 'Allin'].map(k => (
        <span key={k} style={{ color: colors[k] }}>
          {k}: {((sum[k] / TOTAL_COMBOS) * 100).toFixed(2)}% ({sum[k].toFixed(1)})
        </span>
      ))}
    </div>
  );
}
