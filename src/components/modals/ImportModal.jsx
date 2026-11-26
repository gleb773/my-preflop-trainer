import { useState } from 'react';

export default function ImportModal({ spotName, onImport, onCancel }) {
  const [text, setText] = useState('');
  const [action, setAction] = useState('Raise');
  const [clearBefore, setClearBefore] = useState(true);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Импорт: {spotName}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#111827', padding: '12px', borderRadius: '8px' }}>
          <label style={{ fontWeight: 'bold' }}>Загрузить как:</label>
          <select value={action} onChange={e => setAction(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', background: '#374151', color: 'white', border: 'none', cursor: 'pointer', flexGrow: 1 }}>
            <option value="Raise">Raise (Рейз)</option>
            <option value="Call">Call (Колл)</option>
            <option value="Allin">All-in (Олл-ин)</option>
          </select>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Вставьте строку GTOBase (Ctrl+V). Поддерживаются комбо (AsKs), руки (AKs, AKo, QQ, AK) и веса [50]...[/50]"
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', color: '#f3f4f6' }}>
          <input type="checkbox" checked={clearBefore} onChange={e => setClearBefore(e.target.checked)} style={{ width: '18px', height: '18px' }} /> Очистить матрицу перед загрузкой
        </label>
        <div className="modal-btns">
          <button className="btn fold" onClick={onCancel}>Отмена</button>
          <button className="btn call" onClick={() => onImport({ text, action, clearBefore })}>Импорт</button>
        </div>
      </div>
    </div>
  );
}
