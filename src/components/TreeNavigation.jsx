function Level({ label, value, options, onChange, disabled, showCrud, onCreate, onRename, onDelete }) {
  return (
    <div className="tree-level">
      <span className="tree-label">{label}:</span>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {showCrud && (
        <div className="crud-icons">
          <span title="Создать" onClick={onCreate}>➕</span>
          <span title="Переименовать" onClick={onRename}>✏️</span>
          <span title="Удалить" onClick={onDelete}>🗑️</span>
        </div>
      )}
    </div>
  );
}

export default function TreeNavigation({ ranges, cat, sit, spot, setCat, setSit, setSpot, isLocked, onCreate, onRename, onDelete, onStart }) {
  const cats = Object.keys(ranges);
  const sits = cat && ranges[cat] ? Object.keys(ranges[cat]) : [];
  const spots = sit && ranges[cat]?.[sit] ? Object.keys(ranges[cat][sit]) : [];

  return (
    <div className="tree-navigation">
      <Level label="Папка" value={cat} options={cats} onChange={setCat} showCrud={!isLocked}
        onCreate={() => onCreate('cat')} onRename={() => onRename('cat')} onDelete={() => onDelete('cat')} />
      <Level label="Ситуация" value={sit} options={sits} onChange={setSit} disabled={!cat} showCrud={!isLocked && !!cat}
        onCreate={() => onCreate('sit')} onRename={() => onRename('sit')} onDelete={() => onDelete('sit')} />
      <Level label="Спот" value={spot} options={spots} onChange={setSpot} disabled={!sit} showCrud={!isLocked && !!sit}
        onCreate={() => onCreate('spot')} onRename={() => onRename('spot')} onDelete={() => onDelete('spot')} />

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '15px' }}>
        <button className="start-training-btn" onClick={onStart} disabled={!spot}>▶ Начать тренировку</button>
      </div>
    </div>
  );
}
