import { HANDS } from '../utils/hands';

/**
 * Матрица 13×13.
 * getBackground(hand) -> css background
 * renderExtra(hand) -> доп. содержимое ячейки
 * cellClassName(hand) -> доп. классы
 */
export default function HandGrid({
  getBackground, className = '', cellClassName, renderExtra,
  onCellMouseDown, onCellMouseEnter, onHoverMove, onHoverLeave,
}) {
  return (
    <div className={`poker-grid ${className}`} onMouseLeave={onHoverLeave}>
      {HANDS.map(hand => (
        <div
          key={hand}
          className={`grid-cell ${cellClassName ? cellClassName(hand) : ''}`}
          onMouseDown={onCellMouseDown ? (e) => { e.preventDefault(); onCellMouseDown(hand); } : undefined}
          onMouseEnter={onCellMouseEnter ? () => onCellMouseEnter(hand) : undefined}
          onMouseMove={onHoverMove ? (e) => onHoverMove(e, hand) : undefined}
          style={{ background: getBackground(hand) }}
        >
          <div>{hand}</div>
          {renderExtra && renderExtra(hand)}
        </div>
      ))}
    </div>
  );
}
