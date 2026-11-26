import { useState, useEffect, useRef, useMemo } from 'react';
import TreeNavigation from './TreeNavigation';
import BrushControls from './BrushControls';
import HandGrid from './HandGrid';
import StatsPanel from './StatsPanel';
import Tooltip from './Tooltip';
import { useHoverTooltip } from '../hooks/useHoverTooltip';
import NameModal from './modals/NameModal';
import ImportModal from './modals/ImportModal';
import { HANDS, getActivePool } from '../utils/hands';
import { rebalanceWeights } from '../utils/weights';
import { parseRangeText } from '../utils/importParser';
import { getCellBackground } from '../utils/cellStyle';

const LEVEL_TITLES = {
  create: { cat: 'Новая папка', sit: 'Новая ситуация', spot: 'Новый спот' },
  rename: { cat: 'Переименовать папку', sit: 'Переименовать ситуацию', spot: 'Переименовать спот' },
};

/** Переименовать ключ, сохранив порядок */
const renameKey = (obj, oldKey, newKey) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k === oldKey ? newKey : k, v]));
const omitKey = (obj, key) => Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));

export default function EditorView({
  ranges, setRanges, cat, sit, spot, setCat, setSit, setSpot, colors, setColors, onStart, onRenamePath,
}) {
  const [isLocked, setIsLocked] = useState(true);
  const [isMaskMode, setIsMaskMode] = useState(false);
  const [brush, setBrush] = useState({ Allin: 0, Raise: 100, Call: 0, Fold: 0 });
  const [activeAction, setActiveAction] = useState('Raise');
  const [fillAction, setFillAction] = useState('Raise');
  const [nameModal, setNameModal] = useState(null); // { type, level, oldName }
  const [showImport, setShowImport] = useState(false);
  const { hover, onMove, onLeave } = useHoverTooltip();

  const isMouseDown = useRef(false);
  const maskDragValue = useRef(true);
  useEffect(() => {
    const up = () => { isMouseDown.current = false; };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const spotData = useMemo(() => ranges[cat]?.[sit]?.[spot] || {}, [ranges, cat, sit, spot]);
  const pool = useMemo(() => getActivePool(spotData), [spotData]);
  const poolSet = useMemo(() => new Set(pool), [pool]);

  // ---------- CRUD ----------
  const nameOf = (level) => (level === 'cat' ? cat : level === 'sit' ? sit : spot);

  const openCreate = (level) => setNameModal({ type: 'create', level, oldName: '' });
  const openRename = (level) => { const old = nameOf(level); if (old) setNameModal({ type: 'rename', level, oldName: old }); };

  const submitName = (raw) => {
    const name = raw.trim();
    if (!name) return alert('Имя не может быть пустым!');
    const { type, level, oldName } = nameModal;
    const siblings = level === 'cat' ? ranges : level === 'sit' ? ranges[cat] : ranges[cat]?.[sit];
    if (!siblings && level !== 'cat') return;

    if (type === 'rename' && name === oldName) { setNameModal(null); return; }
    if (siblings[name]) return alert('Такое имя уже есть!');

    const updateLevel = (fn) => {
      if (level === 'cat') return fn(ranges);
      if (level === 'sit') return { ...ranges, [cat]: fn(ranges[cat]) };
      return { ...ranges, [cat]: { ...ranges[cat], [sit]: fn(ranges[cat][sit]) } };
    };

    if (type === 'create') {
      const empty = level === 'cat' ? { 'Новая Ситуация': { 'Новый Спот': {} } } : level === 'sit' ? { 'Новый Спот': {} } : {};
      setRanges(updateLevel(obj => ({ ...obj, [name]: empty })));
    } else {
      setRanges(updateLevel(obj => renameKey(obj, oldName, name)));
      onRenamePath(level, oldName, name, { cat, sit });
    }
    if (level === 'cat') setCat(name); else if (level === 'sit') setSit(name); else setSpot(name);
    setNameModal(null);
  };

  const handleDelete = (level) => {
    const target = nameOf(level);
    if (!target) return;
    if (!window.confirm(`Удалить "${target}" и все вложенные данные?`)) return;
    if (level === 'cat') setRanges(omitKey(ranges, target));
    else if (level === 'sit') setRanges({ ...ranges, [cat]: omitKey(ranges[cat], target) });
    else setRanges({ ...ranges, [cat]: { ...ranges[cat], [sit]: omitKey(ranges[cat][sit], target) } });
  };

  // ---------- Кисть ----------
  const updateSpot = (fn) => setRanges(prev => {
    const data = prev[cat]?.[sit]?.[spot];
    if (!data) return prev;
    return { ...prev, [cat]: { ...prev[cat], [sit]: { ...prev[cat][sit], [spot]: fn(data) } } };
  });

  const changeWeight = (action, value) => {
    setBrush(prev => rebalanceWeights(prev, action, value, fillAction));
    setActiveAction(action);
    if (action !== 'Fold') setFillAction(action);
  };
  const selectAction = (action) => {
    setActiveAction(action);
    if (action !== 'Fold') setFillAction(action);
  };

  const paint = (hand) => {
    if (isLocked || !spot) return;
    updateSpot(data => {
      const cur = data[hand] || { Allin: 0, Raise: 0, Call: 0, Fold: 100 };
      let next;
      if (isMaskMode) {
        next = { ...cur, inZone: maskDragValue.current };
      } else {
        const isSame = cur.Allin === brush.Allin && cur.Raise === brush.Raise && cur.Call === brush.Call;
        const isFoldBrush = brush.Allin + brush.Raise + brush.Call === 0;
        next = isSame && !isFoldBrush
          ? { ...cur, Allin: 0, Raise: 0, Call: 0, Fold: 100 }
          : { ...cur, Allin: brush.Allin, Raise: brush.Raise, Call: brush.Call, Fold: brush.Fold };
      }
      return { ...data, [hand]: next };
    });
  };

  const onCellDown = (hand) => {
    if (isLocked) return;
    isMouseDown.current = true;
    if (isMaskMode) maskDragValue.current = !poolSet.has(hand);
    paint(hand);
  };
  const onCellEnter = (hand) => { if (isMouseDown.current && !isLocked) paint(hand); };

  const clearSpot = () => {
    if (spot && window.confirm('Очистить все веса и настройки зоны в этом споте?')) updateSpot(() => ({}));
  };

  const processImport = ({ text, action, clearBefore }) => {
    const { percents, recognized, unknown } = parseRangeText(text);
    if (recognized === 0) return alert('Не удалось распознать ни одной руки.');
    updateSpot(data => {
      const next = { ...data };
      HANDS.forEach(h => {
        const base = clearBefore || !data[h] ? { Allin: 0, Raise: 0, Call: 0 } : data[h];
        const w = rebalanceWeights(base, action, percents[h]);
        next[h] = { ...w, inZone: data[h]?.inZone };
        if (next[h].inZone === undefined) delete next[h].inZone;
      });
      return next;
    });
    setShowImport(false);
    if (unknown.length) alert(`Импорт выполнен. Не распознано: ${unknown.slice(0, 10).join(', ')}${unknown.length > 10 ? '…' : ''}`);
  };

  return (
    <>
      {nameModal && (
        <NameModal
          title={LEVEL_TITLES[nameModal.type][nameModal.level]}
          initialValue={nameModal.oldName}
          onSubmit={submitName}
          onCancel={() => setNameModal(null)}
        />
      )}
      {showImport && <ImportModal spotName={spot} onImport={processImport} onCancel={() => setShowImport(false)} />}
      <Tooltip hover={hover} spotData={spotData} colors={colors} />

      <TreeNavigation
        ranges={ranges} cat={cat} sit={sit} spot={spot} setCat={setCat} setSit={setSit} setSpot={setSpot}
        isLocked={isLocked} onCreate={openCreate} onRename={openRename} onDelete={handleDelete} onStart={onStart}
      />

      <div className="editor-panel">
        <div className="editor-toolbar">
          <div className="lock-toggle" onClick={() => { setIsLocked(!isLocked); setIsMaskMode(false); }}>
            <span style={{ fontSize: '1.5rem' }}>{isLocked ? '🔒' : '🔓'}</span>
            <span style={{ fontWeight: 'bold', color: isLocked ? '#ef4444' : '#10b981' }}>{isLocked ? 'ЗАБЛОКИРОВАНО' : 'РЕДАКТИРОВАНИЕ'}</span>
          </div>
          {!isLocked && (
            <button className={`mask-btn ${isMaskMode ? 'active' : ''}`} onClick={() => setIsMaskMode(!isMaskMode)}>🎯 Зона Тренировки</button>
          )}
        </div>

        {!isLocked && !isMaskMode && (
          <>
            <div className="color-settings">
              {['Fold', 'Call', 'Raise', 'Allin'].map(a => (
                <div key={a} className="color-item">
                  <label>{a}</label>
                  <input type="color" value={colors[a]} onChange={e => setColors(prev => ({ ...prev, [a]: e.target.value }))} />
                </div>
              ))}
            </div>
            <BrushControls
              weights={brush} activeAction={activeAction} colors={colors}
              onChange={changeWeight} onSelect={selectAction} onQuick={val => changeWeight(activeAction, val)}
              onClear={clearSpot}
              onImport={() => { if (spot) setShowImport(true); else alert('Создайте спот!'); }}
            />
          </>
        )}

        {isMaskMode && (
          <div className="mask-info-panel">
            <h4>Режим настройки Зоны Тренировки</h4>
            <p>Ореол вычисляется автоматически. Заштрихованные руки (мертвая зона) не будут выпадать. Кликните по ячейке, чтобы включить/исключить её вручную.</p>
          </div>
        )}
      </div>

      {spot && (
        <>
          <HandGrid
            className={isLocked ? 'locked-grid' : ''}
            getBackground={h => getCellBackground(spotData[h], colors, isMaskMode && !poolSet.has(h))}
            onCellMouseDown={onCellDown}
            onCellMouseEnter={onCellEnter}
            onHoverMove={onMove}
            onHoverLeave={onLeave}
          />
          <StatsPanel spotData={spotData} colors={colors} />
        </>
      )}
    </>
  );
}
