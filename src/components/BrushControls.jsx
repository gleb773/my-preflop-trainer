import { useState } from 'react';
import { round2 } from '../utils/weights';

/** Разбирает ввод: число 0–100, не больше 2 знаков после точки/запятой. Иначе null. */
function parsePercent(text) {
  const s = text.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{0,2})?$/.test(s)) return null;
  const v = Number(s);
  return v >= 0 && v <= 100 ? round2(v) : null;
}

/**
 * Поле ввода %: значение применяется по Enter или при потере фокуса.
 * Некорректное значение подсвечивается красным и не применяется.
 */
function PercentInput({ value, onCommit, onFocus }) {
  const [draft, setDraft] = useState(String(value));
  const parsed = parsePercent(draft);
  const invalid = draft.trim() !== '' && parsed === null;

  const revert = () => setDraft(String(value));
  const apply = () => {
    if (parsed === null) return false;
    if (parsed === value) revert();
    else onCommit(parsed);
    return true;
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={`percent-input ${invalid ? 'invalid' : ''}`}
      title={invalid ? 'Введите число от 0 до 100' : undefined}
      aria-invalid={invalid}
      value={draft}
      onFocus={e => { e.target.select(); onFocus(); }}
      onChange={e => setDraft(e.target.value)}
      // при уходе из поля с ошибкой — возвращаем прежнее значение
      onBlur={() => { if (!apply()) revert(); }}
      onKeyDown={e => {
        // Enter с ошибкой: остаёмся в поле, значение не применяется
        if (e.key === 'Enter' && parsed !== null) e.target.blur();
        if (e.key === 'Escape') { revert(); setTimeout(() => e.target.blur()); }
      }}
    />
  );
}

const ROWS = ['Fold', 'Call', 'Raise', 'Allin'];

export default function BrushControls({ weights, activeAction, colors, onChange, onSelect, onQuick, onClear, onImport }) {
  return (
    <div className="brush-controls">
      <div className="sliders-group">
        {ROWS.map(action => (
          <div
            key={action}
            className={`multi-slider-row ${activeAction === action ? 'active-row' : ''}`}
            onClick={() => onSelect(action)}
            style={{ '--row-color': colors[action] }}
          >
            <label>{action}</label>
            <input
              type="range" min="0" max="100" step="1"
              value={weights[action]}
              onChange={e => onChange(action, e.target.value)}
              className="custom-range"
            />
            {/* key сбрасывает черновик, когда значение меняется снаружи (ползунком) */}
            <PercentInput key={weights[action]} value={weights[action]} onCommit={v => onChange(action, v)} onFocus={() => onSelect(action)} />
            <span className="percent-sign">%</span>
          </div>
        ))}
      </div>

      <div className="quick-weights-panel">
        {[0, 25, 50, 75, 100].map(val => (
          <button key={val} className="quick-btn" onClick={() => onQuick(val)}>{val}%</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn fold" onClick={onClear}>Очистить спот</button>
        <button className="btn call" onClick={onImport}>⬇️ Импорт текста</button>
      </div>
    </div>
  );
}
