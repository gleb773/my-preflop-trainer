import HandGrid from './HandGrid';
import Tooltip from './Tooltip';
import { useHoverTooltip } from '../hooks/useHoverTooltip';
import { getCellBackground } from '../utils/cellStyle';
import { formatTime } from '../utils/format';

export default function SummaryPanel({ session, spotData, colors, onRepeat, onBack }) {
  const { hover, onMove, onLeave } = useHoverTooltip();
  const { hands, errors, durationSec, answerTimeSec, perHand } = session;
  const correct = hands - errors;
  const accuracy = hands > 0 ? Math.round((correct / hands) * 100) : 0;
  const avgTime = hands > 0 ? (answerTimeSec / hands).toFixed(1) : 0;

  const background = (h) => {
    const base = getCellBackground(spotData[h], colors);
    if (!perHand[h]?.attempts) return `linear-gradient(rgba(17, 24, 39, 0.82), rgba(17, 24, 39, 0.82)), ${base}`;
    return base;
  };

  return (
    <div className="summary-panel">
      <Tooltip
        hover={hover} spotData={spotData} colors={colors}
        extra={h => perHand[h] && (
          <div className="tooltip-row tooltip-session"><span>Сессия:</span><span>{perHand[h].attempts - perHand[h].errors}/{perHand[h].attempts}</span></div>
        )}
      />
      <h2>Итоги тренировки: {session.spot}</h2>
      <div className="summary-stats">
        <div className="stat-box"><span>Время</span><strong>{formatTime(durationSec)}</strong></div>
        <div className="stat-box"><span>Ср. время ответа</span><strong>{avgTime} сек</strong></div>
        <div className="stat-box"><span>Пройдено рук</span><strong>{hands}</strong></div>
        <div className="stat-box"><span>Верных</span><strong style={{ color: '#10b981' }}>{correct}</strong></div>
        <div className="stat-box"><span>Ошибок</span><strong style={{ color: '#ef4444' }}>{errors}</strong></div>
        <div className="stat-box"><span>Качество</span><strong>{accuracy}%</strong></div>
      </div>

      <h4 style={{ marginTop: '20px', marginBottom: '15px', color: '#9ca3af', textAlign: 'center' }}>Анализ рук (Наведите курсор на ячейку)</h4>

      <div className="summary-matrix-wrapper">
        <HandGrid
          className="summary-grid"
          getBackground={background}
          cellClassName={h => {
            const d = perHand[h];
            if (!d?.attempts) return 'summary-cell';
            return `summary-cell ${d.errors > 0 ? 'summary-incorrect' : 'summary-correct'}`;
          }}
          renderExtra={h => {
            const d = perHand[h];
            if (!d?.attempts) return null;
            return <div className={`cell-stats ${d.errors > 0 ? 'stat-incorrect' : 'stat-correct'}`}>{d.attempts - d.errors}/{d.attempts}</div>;
          }}
          onHoverMove={onMove}
          onHoverLeave={onLeave}
        />
      </div>

      <div style={{ display: 'flex', gap: '15px', marginTop: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn call" style={{ width: '200px' }} onClick={onRepeat}>Повторить сессию</button>
        <button className="btn fold" style={{ width: '200px' }} onClick={onBack}>Вернуться в редактор</button>
      </div>
    </div>
  );
}
