import { useState } from 'react';
import { clampPct } from '../utils/weights';

/** Поле ввода %: значение применяется по Enter или при потере фокуса */
function PercentInput({ value, onCommit, onFocus }) {
  const [draft, setDraft] = useState(String(value));
  const commit = () => {
    const normalized = draft.replace(',', '.').trim();
    if (normalized === '' || !Number.isFinite(Number(normalized))) { setDraft(String(value)); return; }
    const v = clampPct(normalized);
    if (v === value) setDraft(String(value));
    else onCommit(v);
  };
  return (
    <input
      type="text"
      inputMode="decimal"
      className="percent-input"
      value={draft}
      onFocus={e => { e.target.select(); onFocus(); }}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setDraft(String(value)); e.target.blur(); } }}
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
