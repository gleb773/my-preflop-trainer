import { useEffect } from 'react';
import HandGrid from '../HandGrid';
import StatsPanel from '../StatsPanel';
import Tooltip from '../Tooltip';
import { useHoverTooltip } from '../../hooks/useHoverTooltip';
import { getCellBackground } from '../../utils/cellStyle';

/** Просмотр ренжа спота (только чтение) перед тренировкой */
export default function RangePreviewModal({ title, subtitle, spotData, colors, onStart, onClose }) {
  const { hover, onMove, onLeave } = useHoverTooltip();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content range-preview">
        <Tooltip hover={hover} spotData={spotData} colors={colors} />
        <div className="range-preview-head">
          <div>
            {subtitle && <div className="range-preview-sub">{subtitle}</div>}
            <h3>{title}</h3>
          </div>
          <button className="range-preview-close" onClick={onClose} title="Закрыть (Esc)">✕</button>
        </div>
        <HandGrid
          className="readonly-grid"
          getBackground={h => getCellBackground(spotData[h], colors)}
          onHoverMove={onMove}
          onHoverLeave={onLeave}
        />
        <StatsPanel spotData={spotData} colors={colors} />
        <div className="modal-btns">
          <button className="btn fold" onClick={onClose}>Закрыть</button>
          {onStart && <button className="btn call" onClick={onStart}>▶ Начать тренировку</button>}
        </div>
      </div>
    </div>
  );
}
