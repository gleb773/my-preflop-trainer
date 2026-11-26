import { useState } from 'react';

export default function NameModal({ title, initialValue = '', onSubmit, onCancel }) {
  const [value, setValue] = useState(initialValue);
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <h3>{title}</h3>
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit(value); if (e.key === 'Escape') onCancel(); }}
          className="custom-input"
        />
        <div className="modal-btns">
          <button className="btn fold" onClick={onCancel}>Отмена</button>
          <button className="btn call" onClick={() => onSubmit(value)}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}
