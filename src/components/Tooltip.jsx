import { getWeights } from '../utils/cellStyle';

export default function Tooltip({ hover, spotData, colors, extra }) {
  if (!hover) return null;
  const w = getWeights(spotData?.[hover.hand]);
  return (
    <div className="floating-tooltip" style={{ left: hover.x, top: hover.y }}>
      <div className="tooltip-title">Рука: {hover.hand}</div>
      <div className="tooltip-row"><span style={{ color: colors.Allin }}>All-in:</span> <span>{w.Allin}%</span></div>
      <div className="tooltip-row"><span style={{ color: colors.Raise }}>Raise:</span> <span>{w.Raise}%</span></div>
      <div className="tooltip-row"><span style={{ color: colors.Call }}>Call:</span> <span>{w.Call}%</span></div>
      <div className="tooltip-row"><span style={{ color: colors.Fold }}>Fold:</span> <span>{w.Fold}%</span></div>
      {extra && extra(hover.hand)}
    </div>
  );
}
