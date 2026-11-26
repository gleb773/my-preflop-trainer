import { useState } from 'react';
import { planSpotKey, PLAN_DEFAULTS } from '../utils/studyPlan';

function NumberField({ label, value, onChange, min, max, suffix }) {
  const n = Number(value);
  const invalid = !/^\d{1,4}$/.test(String(value).trim()) || n < min || n > max;
  return (
    <label className="plan-field">
      <span>{label}</span>
      <input
        type="text" inputMode="numeric"
        className={`percent-input plan-number ${invalid ? 'invalid' : ''}`}
        title={invalid ? `Введите число от ${min} до ${max}` : undefined}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {suffix && <small>{suffix}</small>}
    </label>
  );
}

const fieldValid = (v, min, max) => /^\d{1,4}$/.test(String(v).trim()) && Number(v) >= min && Number(v) <= max;

export default function PlanEditor({ ranges, initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || 'План на неделю');
  const [selected, setSelected] = useState(initial?.spots || []);
  const [spotsPerDay, setSpotsPerDay] = useState(String(initial?.spotsPerDay ?? PLAN_DEFAULTS.spotsPerDay));
  const [handsPerSpot, setHandsPerSpot] = useState(String(initial?.handsPerSpot ?? PLAN_DEFAULTS.handsPerSpot));
  const [durationDays, setDurationDays] = useState(String(initial?.durationDays ?? PLAN_DEFAULTS.durationDays));
  const [order, setOrder] = useState(initial?.order || PLAN_DEFAULTS.order);
  const [openCats, setOpenCats] = useState(() => new Set(Object.keys(ranges).slice(0, 1)));

  const selectedKeys = new Set(selected.map(planSpotKey));
  const isSel = (s) => selectedKeys.has(planSpotKey(s));
  const toggle = (s) => setSelected(prev => (isSel(s) ? prev.filter(p => planSpotKey(p) !== planSpotKey(s)) : [...prev, s]));
  const sitSpots = (cat, sit) => Object.keys(ranges[cat][sit]).map(spot => ({ cat, sit, spot }));
  const toggleSit = (cat, sit) => {
    const spots = sitSpots(cat, sit);
    const all = spots.every(isSel);
    setSelected(prev => (all
      ? prev.filter(p => !(p.cat === cat && p.sit === sit))
      : [...prev, ...spots.filter(s => !isSel(s))]));
  };
  const move = (i, dir) => setSelected(prev => {
    const next = [...prev];
    const j = i + dir;
    if (j < 0 || j >= next.length) return prev;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const valid = name.trim() && selected.length > 0
    && fieldValid(spotsPerDay, 1, 50) && fieldValid(handsPerSpot, 1, 1000) && fieldValid(durationDays, 1, 365);

  const save = () => {
    if (!valid) return;
    onSave({
      name: name.trim(), spots: selected, order,
      spotsPerDay: Number(spotsPerDay), handsPerSpot: Number(handsPerSpot), durationDays: Number(durationDays),
    });
  };

  return (
    <div className="summary-panel plan-panel">
      <h2>{initial ? '✏️ Изменить план' : '📚 Новый план обучения'}</h2>

      <label className="plan-field plan-name">
        <span>Название</span>
        <input className="custom-input" value={name} onChange={e => setName(e.target.value)} />
      </label>

      <div className="plan-settings">
        <NumberField label="Спотов в день" value={spotsPerDay} onChange={setSpotsPerDay} min={1} max={50} />
        <NumberField label="Рук на спот" value={handsPerSpot} onChange={setHandsPerSpot} min={1} max={1000} />
        <NumberField label="Длительность" value={durationDays} onChange={setDurationDays} min={1} max={365} suffix="дней" />
      </div>

      <div className="plan-order">
        <span>Споты на день:</span>
        <button className={`pos-btn ${order === 'sequential' ? 'active' : ''}`} onClick={() => setOrder('sequential')}>По порядку списка</button>
        <button className={`pos-btn ${order === 'random' ? 'active' : ''}`} onClick={() => setOrder('random')}>🎲 Случайно</button>
      </div>
      <p className="history-hint plan-order-hint">
        {order === 'sequential'
          ? 'Каждый день берутся следующие споты из списка по кругу: день 1 — первые, день 2 — следующие…'
          : 'Каждый день споты выбираются случайно, чаще — те, что вы меньше изучали.'}
      </p>

      <div className="plan-columns">
        <div className="plan-tree">
          <h4 className="history-subtitle">Выберите споты</h4>
          {Object.keys(ranges).map(cat => (
            <div key={cat} className="plan-cat">
              <div className="plan-cat-title" onClick={() => setOpenCats(prev => { const n = new Set(prev); if (n.has(cat)) n.delete(cat); else n.add(cat); return n; })}>
                {openCats.has(cat) ? '▾' : '▸'} {cat}
              </div>
              {openCats.has(cat) && Object.keys(ranges[cat]).map(sit => {
                const spots = sitSpots(cat, sit);
                const all = spots.length > 0 && spots.every(isSel);
                const some = spots.some(isSel);
                return (
                  <div key={sit} className="plan-sit">
                    <label className="plan-check plan-sit-title">
                      <input type="checkbox" checked={all} ref={el => { if (el) el.indeterminate = some && !all; }} onChange={() => toggleSit(cat, sit)} />
                      {sit}
                    </label>
                    {spots.map(s => (
                      <label key={s.spot} className="plan-check plan-spot">
                        <input type="checkbox" checked={isSel(s)} onChange={() => toggle(s)} />
                        {s.spot}
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="plan-selected">
          <h4 className="history-subtitle">Выбрано: {selected.length}</h4>
          {selected.length === 0 && <p className="history-hint">Отметьте споты слева</p>}
          <ol>
            {selected.map((s, i) => (
              <li key={planSpotKey(s)}>
                <span className="plan-sel-name">{s.sit} / <b>{s.spot}</b></span>
                {order === 'sequential' && (
                  <span className="plan-sel-btns">
                    <button onClick={() => move(i, -1)} disabled={i === 0} title="Выше">↑</button>
                    <button onClick={() => move(i, 1)} disabled={i === selected.length - 1} title="Ниже">↓</button>
                  </span>
                )}
                <button className="plan-sel-remove" onClick={() => toggle(s)} title="Убрать">✕</button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginTop: '25px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn fold" style={{ width: '200px' }} onClick={onCancel}>Отмена</button>
        <button className="btn call" style={{ width: '200px', opacity: valid ? 1 : 0.5 }} disabled={!valid} onClick={save}>
          {initial ? 'Сохранить' : 'Создать план'}
        </button>
      </div>
    </div>
  );
}
