import { useState, useEffect } from 'react';
import './App.css';

const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

function generateHandMatrix() {
  const hands = [];
  for (let i = 0; i < ranks.length; i++) {
    for (let j = 0; j < ranks.length; j++) {
      if (i === j) hands.push(`${ranks[i]}${ranks[j]}`);
      else if (i < j) hands.push(`${ranks[i]}${ranks[j]}s`);
      else hands.push(`${ranks[j]}${ranks[i]}o`);
    }
  }
  return hands;
}

const getCombosCount = (hand) => {
  if (hand.length === 2) return 6; 
  if (hand[2] === 's') return 4;   
  return 12;                       
};

const getAbstractHand = (comboStr) => {
  if (comboStr.length !== 4) return null;
  const r1 = comboStr[0], s1 = comboStr[1];
  const r2 = comboStr[2], s2 = comboStr[3];
  const rankOrder = "AKQJT98765432";
  const first = rankOrder.indexOf(r1) < rankOrder.indexOf(r2) ? r1 : r2;
  const second = rankOrder.indexOf(r1) < rankOrder.indexOf(r2) ? r2 : r1;
  if (r1 === r2) return r1 + r2;
  if (s1 === s2) return first + second + 's';
  return first + second + 'o';
};

function App() {
  const hands = generateHandMatrix();

  const [mode, setMode] = useState('editor'); 
  
  // --- ДЕРЕВО ПАПОК ---
  const [ranges, setRanges] = useState(() => {
    const saved = localStorage.getItem('pokerRangesV8');
    if (saved) return JSON.parse(saved);
    return {
      "Cash 100bb": {
        "Open Raise (RFI)": { "UTG": {}, "HJ": {}, "CO": {}, "BTN": {}, "SB": {} },
        "vs 3-Bet": { "UTG vs HJ": {}, "BTN vs BB": {} }
      }
    };
  });

  const [activeCat, setActiveCat] = useState(Object.keys(ranges)[0] || "");
  const [activeSit, setActiveSit] = useState("");
  const [activeSpot, setActiveSpot] = useState("");

  useEffect(() => {
    if (ranges[activeCat]) {
      const sits = Object.keys(ranges[activeCat]);
      if (!sits.includes(activeSit)) setActiveSit(sits[0] || "");
    } else {
      setActiveCat(Object.keys(ranges)[0] || "");
    }
  }, [ranges, activeCat]);

  useEffect(() => {
    if (ranges[activeCat] && ranges[activeCat][activeSit]) {
      const spots = Object.keys(ranges[activeCat][activeSit]);
      if (!spots.includes(activeSpot)) setActiveSpot(spots[0] || "");
    } else {
      setActiveSpot("");
    }
  }, [ranges, activeCat, activeSit]);

  // --- КАСТОМНОЕ ОКНО ВВОДА ДЛЯ CRUD ---
  const [inputModal, setInputModal] = useState({ isOpen: false, type: '', level: '', oldName: '', title: '' });
  const [inputValue, setInputValue] = useState("");

  const openCreateModal = (level) => {
    let title = level === 'cat' ? 'Новая папка' : level === 'sit' ? 'Новая ситуация' : 'Новый спот';
    setInputModal({ isOpen: true, type: 'create', level, oldName: '', title });
    setInputValue("");
  };

  const openRenameModal = (level) => {
    const oldName = level === 'cat' ? activeCat : level === 'sit' ? activeSit : activeSpot;
    if (!oldName) return;
    let title = level === 'cat' ? 'Переименовать папку' : level === 'sit' ? 'Переименовать ситуацию' : 'Переименовать спот';
    setInputModal({ isOpen: true, type: 'rename', level, oldName, title });
    setInputValue(oldName);
  };

  const submitInputModal = () => {
    const name = inputValue.trim();
    if (!name) return alert("Имя не может быть пустым!");
    
    const { type, level, oldName } = inputModal;
    const newRanges = { ...ranges };

    if (type === 'create') {
      if (level === 'cat') {
        if (newRanges[name]) return alert("Папка с таким именем уже существует!");
        newRanges[name] = { "Новая Ситуация": { "Новый Спот": {} } };
        setActiveCat(name);
      } else if (level === 'sit') {
        if (!activeCat) return;
        if (newRanges[activeCat][name]) return alert("Ситуация уже существует!");
        newRanges[activeCat][name] = { "Новый Спот": {} };
        setActiveSit(name);
      } else if (level === 'spot') {
        if (!activeCat || !activeSit) return;
        if (newRanges[activeCat][activeSit][name]) return alert("Спот уже существует!");
        newRanges[activeCat][activeSit][name] = {};
        setActiveSpot(name);
      }
    } else if (type === 'rename') {
      if (name === oldName) {
        setInputModal({ ...inputModal, isOpen: false });
        return;
      }
      if (level === 'cat') {
        if (newRanges[name]) return alert("Имя занято!");
        newRanges[name] = newRanges[oldName];
        delete newRanges[oldName];
        setActiveCat(name);
      } else if (level === 'sit') {
        if (newRanges[activeCat][name]) return alert("Имя занято!");
        newRanges[activeCat][name] = newRanges[activeCat][oldName];
        delete newRanges[activeCat][oldName];
        setActiveSit(name);
      } else if (level === 'spot') {
        if (newRanges[activeCat][activeSit][name]) return alert("Имя занято!");
        newRanges[activeCat][activeSit][name] = newRanges[activeCat][activeSit][oldName];
        delete newRanges[activeCat][activeSit][oldName];
        setActiveSpot(name);
      }
    }
    
    setRanges(newRanges);
    setInputModal({ ...inputModal, isOpen: false });
  };

  const handleDelete = (level) => {
    const targetName = level === 'cat' ? activeCat : level === 'sit' ? activeSit : activeSpot;
    if (!targetName) return;
    if (!window.confirm(`Вы уверены, что хотите удалить "${targetName}" и все вложенные данные?`)) return;

    const newRanges = { ...ranges };
    if (level === 'cat') {
      delete newRanges[targetName];
      setActiveCat(Object.keys(newRanges)[0] || "");
    } else if (level === 'sit') {
      delete newRanges[activeCat][targetName];
      setActiveSit(Object.keys(newRanges[activeCat] || {})[0] || "");
    } else if (level === 'spot') {
      delete newRanges[activeCat][activeSit][targetName];
      setActiveSpot(Object.keys(newRanges[activeCat][activeSit] || {})[0] || "");
    }
    setRanges(newRanges);
  };

  // --- СОСТОЯНИЯ ПРИЛОЖЕНИЯ ---
  const [actionColors, setActionColors] = useState(() => {
    const savedColors = localStorage.getItem('pokerColorsV8');
    return savedColors ? JSON.parse(savedColors) : { Allin: '#f59e0b', Raise: '#ef4444', Call: '#4ade80', Fold: '#3b82f6' };
  });

  const [allinWeight, setAllinWeight] = useState(0);
  const [raiseWeight, setRaiseWeight] = useState(100);
  const [callWeight, setCallWeight] = useState(0);
  const foldWeight = Number((100 - allinWeight - raiseWeight - callWeight).toFixed(2));

  const [isMouseDown, setIsMouseDown] = useState(false);
  const [currentHand, setCurrentHand] = useState("AKs");
  const [currentCards, setCurrentCards] = useState([{rank: 'A', suit: 's'}, {rank: 'K', suit: 's'}]);
  const [message, setMessage] = useState("Ваш ход!");
  const [showMatrix, setShowMatrix] = useState(false);
  
  const [trainerMode, setTrainerMode] = useState('Simple');
  const [diceValue, setDiceValue] = useState(100);
  const [trainerCurrentSpot, setTrainerCurrentSpot] = useState(""); 
  
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importAction, setImportAction] = useState("Raise");
  const [clearBeforeImport, setClearBeforeImport] = useState(true);

  const [hoverData, setHoverData] = useState(null); 
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [totalSessionTime, setTotalSessionTime] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionHistory, setSessionHistory] = useState({});

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} мин ${s} сек`;
  };

  const getMatrixData = (h) => {
    if (mode === 'trainer' && isSessionActive && trainerCurrentSpot) {
      return ranges[activeCat]?.[activeSit]?.[trainerCurrentSpot]?.[h] || { Allin: 0, Raise: 0, Call: 0, Fold: 100 };
    }
    return ranges[activeCat]?.[activeSit]?.[activeSpot]?.[h] || { Allin: 0, Raise: 0, Call: 0, Fold: 100 };
  };

  const rollNewHand = () => {
    let activeTrainerSpot = activeSpot;
    if (mode === 'trainer' && activeSpot === 'ALL_SPOTS') {
      const spots = Object.keys(ranges[activeCat]?.[activeSit] || {});
      activeTrainerSpot = spots.length > 0 ? spots[Math.floor(Math.random() * spots.length)] : "";
    }
    setTrainerCurrentSpot(activeTrainerSpot);

    const randomIndex = Math.floor(Math.random() * hands.length);
    const newHand = hands[randomIndex];
    setCurrentHand(newHand);
    setDiceValue(Math.floor(Math.random() * 100) + 1); 

    const suits = ['s', 'h', 'd', 'c'];
    let s1, s2;
    if (newHand.length === 2) { 
      s1 = suits[Math.floor(Math.random() * 4)];
      do { s2 = suits[Math.floor(Math.random() * 4)] } while (s1 === s2);
    } else if (newHand[2] === 's') { 
      s1 = s2 = suits[Math.floor(Math.random() * 4)];
    } else { 
      s1 = suits[Math.floor(Math.random() * 4)];
      do { s2 = suits[Math.floor(Math.random() * 4)] } while (s1 === s2);
    }
    setCurrentCards([{rank: newHand[0], suit: s1}, {rank: newHand[1], suit: s2}]);
  };

  useEffect(() => { if (!isSessionActive) rollNewHand(); }, [activeCat, activeSit, activeSpot, mode]);
  useEffect(() => { localStorage.setItem('pokerRangesV8', JSON.stringify(ranges)); }, [ranges]);
  useEffect(() => { localStorage.setItem('pokerColorsV8', JSON.stringify(actionColors)); }, [actionColors]);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsMouseDown(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleSlider = (action, val) => {
    const v = Number(val);
    let a = action === 'Allin' ? v : allinWeight;
    let r = action === 'Raise' ? v : raiseWeight;
    let c = action === 'Call' ? v : callWeight;

    if (a + r + c > 100) {
      if (action === 'Allin') { r = 100 - a; c = 0; if (r < 0) r = 0; }
      else if (action === 'Raise') { c = 100 - a - r; if (c < 0) { c = 0; a = 100 - r; } }
      else if (action === 'Call') { r = 100 - a - c; if (r < 0) { r = 0; a = 100 - c; } }
    }
    setAllinWeight(Number(a.toFixed(2))); setRaiseWeight(Number(r.toFixed(2))); setCallWeight(Number(c.toFixed(2)));
  };

  const setPureAction = (action) => {
    setAllinWeight(action === 'Allin' ? 100 : 0);
    setRaiseWeight(action === 'Raise' ? 100 : 0);
    setCallWeight(action === 'Call' ? 100 : 0);
  };

  const applyBrush = (hand) => {
    if (mode === 'editor' && activeCat && activeSit && activeSpot) {
      setRanges(prev => ({
        ...prev, [activeCat]: { ...prev[activeCat],
          [activeSit]: { ...prev[activeCat][activeSit],
            [activeSpot]: { ...prev[activeCat][activeSit][activeSpot],
              [hand]: { Allin: allinWeight, Raise: raiseWeight, Call: callWeight, Fold: foldWeight }
            }
          }
        }
      }));
    }
  };

  const handleMouseDown = (e, hand) => { e.preventDefault(); setIsMouseDown(true); applyBrush(hand); };
  const handleMouseEnter = (e, hand) => { if (isMouseDown) applyBrush(hand); };

  const handleCellMouseMove = (e, hand) => {
    let x = e.clientX + 15; let y = e.clientY + 15;
    const tooltipWidth = 150; const tooltipHeight = 160;
    if (window.innerWidth - e.clientX < tooltipWidth + 20) x = e.clientX - tooltipWidth - 10;
    if (window.innerHeight - e.clientY < tooltipHeight + 20) y = e.clientY - tooltipHeight - 10;
    setHoverData({ hand, x, y });
  };
  const handleCellMouseLeave = () => { setHoverData(null); };

  const startSession = () => {
    if (!activeCat || !activeSit || (!activeSpot && activeSpot !== 'ALL_SPOTS')) return alert("Выберите категорию, ситуацию и спот!");
    setSessionHistory({});
    setSessionStartTime(Date.now());
    setIsSessionActive(true);
    setShowSummary(false);
    setMessage("Сессия начата! Ваш ход!");
    rollNewHand();
  };

  const finishSession = () => {
    setIsSessionActive(false);
    setTotalSessionTime(Math.floor((Date.now() - sessionStartTime) / 1000));
    setShowSummary(true);
  };

  const handleTrainerAction = (userAction) => {
    if (!isSessionActive && !showSummary) startSession();

    const handData = getMatrixData(currentHand);
    let isCorrect = false; let msg = ""; let targetActionForRecord = "Fold";

    if (trainerMode === 'Simple') {
      const weight = handData[userAction] || 0;
      if (weight > 0) {
        isCorrect = true; msg = `✅ Верно! (${userAction} ${weight}%)`;
      } else {
        const correctActions = Object.entries(handData).filter(([_, w]) => w > 0).map(([a, w]) => `${a} (${w}%)`).join(' или ');
        msg = `❌ Ошибка! Нужно: ${correctActions}`;
      }
    } else {
      const a = Number(handData.Allin || 0); const r = Number(handData.Raise || 0); const c = Number(handData.Call || 0);
      if (diceValue <= a && a > 0) targetActionForRecord = 'Allin';
      else if (diceValue <= a + r && r > 0) targetActionForRecord = 'Raise';
      else if (diceValue <= a + r + c && c > 0) targetActionForRecord = 'Call';
      else targetActionForRecord = 'Fold';

      if (userAction === targetActionForRecord) {
        isCorrect = true; msg = `✅ Верно! (Кубик: ${diceValue} -> ${targetActionForRecord})`;
      } else {
        msg = `❌ Ошибка! (Кубик: ${diceValue} -> Нужно ${targetActionForRecord})`;
      }
    }

    if (isSessionActive) {
      setSessionHistory(prev => {
        const historyData = prev[currentHand] || { attempts: 0, errors: 0 };
        return { ...prev, [currentHand]: { attempts: historyData.attempts + 1, errors: historyData.errors + (isCorrect ? 0 : 1) } };
      });
    }

    setMessage(msg);
    setTimeout(() => { rollNewHand(); setMessage("Ваш ход!"); setShowMatrix(false); }, 1500);
  };

  const getCellBackground = (hand) => {
    const data = getMatrixData(hand);
    const a = data.Allin || 0; const r = data.Raise || 0; const c = data.Call || 0;
    const stop1 = a; const stop2 = a + r; const stop3 = a + r + c;
    return `linear-gradient(to right, ${actionColors.Allin} 0% ${stop1}%, ${actionColors.Raise} ${stop1}% ${stop2}%, ${actionColors.Call} ${stop2}% ${stop3}%, ${actionColors.Fold} ${stop3}% 100%)`;
  };

  const getSummaryCellBackground = (hand) => {
    const data = sessionHistory[hand];
    if (!data || data.attempts === 0) return '#1f2937'; 
    if (data.errors > 0) return '#dc2626'; 
    return '#10b981'; 
  };

  const updateColor = (action, color) => setActionColors(prev => ({ ...prev, [action]: color }));
  const clearCurrentRange = () => {
    if(activeCat && activeSit && activeSpot) {
      setRanges(prev => ({...prev, [activeCat]: {...prev[activeCat], [activeSit]: {...prev[activeCat][activeSit], [activeSpot]: {}}}}));
    }
  };

  const processImport = () => {
    const txt = importText; const regex = /\[([\d.]+)\]([\s\S]*?)\[\/\1\]/g; 
    const pointsAcc = {}; hands.forEach(h => pointsAcc[h] = 0);
    let cleanedTxt = txt; let match;
    
    while ((match = regex.exec(txt)) !== null) {
      const weight = parseFloat(match[1]);
      match[2].split(',').forEach(c => { const abs = getAbstractHand(c.trim()); if(abs) pointsAcc[abs] += weight; });
      cleanedTxt = cleanedTxt.replace(match[0], ''); 
    }
    cleanedTxt.split(',').forEach(c => { const abs = getAbstractHand(c.trim()); if(abs) pointsAcc[abs] += 100; });

    const newPosRange = { ...ranges[activeCat][activeSit][activeSpot] };
    const targetAction = importAction; 

    hands.forEach(h => {
      const totalPoints = pointsAcc[h];
      const avg = Number(Math.min(100, (totalPoints / getCombosCount(h))).toFixed(2));
      if (clearBeforeImport || !newPosRange[h]) newPosRange[h] = { Allin: 0, Raise: 0, Call: 0, Fold: 100 };
      newPosRange[h][targetAction] = avg;

      let a = newPosRange[h].Allin; let r = newPosRange[h].Raise; let c = newPosRange[h].Call;
      if (a + r + c > 100) {
        if (targetAction === 'Allin') { r = 100 - a; c = 0; if (r < 0) r = 0; }
        else if (targetAction === 'Raise') { c = 100 - a - r; if (c < 0) { c = 0; a = 100 - r; } }
        else if (targetAction === 'Call') { r = 100 - a - c; if (r < 0) { r = 0; a = 100 - c; } }
      }
      newPosRange[h] = { Allin: Number(a.toFixed(2)), Raise: Number(r.toFixed(2)), Call: Number(c.toFixed(2)), Fold: Number((100 - a - r - c).toFixed(2)) };
    });

    setRanges(prev => ({...prev, [activeCat]: {...prev[activeCat], [activeSit]: {...prev[activeCat][activeSit], [activeSpot]: newPosRange}}}));
    setShowImport(false); setImportText("");
  };

  const renderStats = () => {
    let f = 0, c = 0, r = 0, a = 0;
    hands.forEach(h => {
      const data = getMatrixData(h);
      const combos = getCombosCount(h);
      a += ((data.Allin || 0) / 100) * combos; r += ((data.Raise || 0) / 100) * combos;
      c += ((data.Call || 0) / 100) * combos; f += ((data.Fold !== undefined ? data.Fold : 100) / 100) * combos;
    });
    const tot = 1326;
    return (
      <div className="stats-panel">
        <span style={{color: actionColors.Fold}}>Fold: {((f/tot)*100).toFixed(2)}% ({f.toFixed(1)})</span>
        <span style={{color: actionColors.Call}}>Call: {((c/tot)*100).toFixed(2)}% ({c.toFixed(1)})</span>
        <span style={{color: actionColors.Raise}}>Raise: {((r/tot)*100).toFixed(2)}% ({r.toFixed(1)})</span>
        <span style={{color: actionColors.Allin}}>Allin: {((a/tot)*100).toFixed(2)}% ({a.toFixed(1)})</span>
      </div>
    );
  };

  const PlayingCard = ({ rank, suit }) => {
    const suitColors = { s: '#374151', h: '#dc2626', d: '#2563eb', c: '#16a34a' }; const suitSymbols = { s: '♠', h: '♥', d: '♦', c: '♣' };
    return (
      <div className="playing-card" style={{ backgroundColor: suitColors[suit] }}>
        <span className="card-rank">{rank}</span><span className="card-suit-bg">{suitSymbols[suit]}</span>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* ПЛАВАЮЩИЙ ТУЛТИП */}
      {hoverData && (
        <div className="floating-tooltip" style={{ left: hoverData.x, top: hoverData.y }}>
          <div className="tooltip-title">Рука: {hoverData.hand}</div>
          <div className="tooltip-row"><span style={{color: actionColors.Allin}}>All-in:</span> <span>{getMatrixData(hoverData.hand).Allin || 0}%</span></div>
          <div className="tooltip-row"><span style={{color: actionColors.Raise}}>Raise:</span> <span>{getMatrixData(hoverData.hand).Raise || 0}%</span></div>
          <div className="tooltip-row"><span style={{color: actionColors.Call}}>Call:</span> <span>{getMatrixData(hoverData.hand).Call || 0}%</span></div>
          <div className="tooltip-row"><span style={{color: actionColors.Fold}}>Fold:</span> <span>{getMatrixData(hoverData.hand).Fold ?? 100}%</span></div>
        </div>
      )}

      {/* КАСТОМНАЯ МОДАЛКА ВВОДА ИМЕНИ (ЗАМЕНА PROMPT) */}
      {inputModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '400px'}}>
            <h3>{inputModal.title}</h3>
            <input 
              autoFocus 
              value={inputValue} 
              onChange={e => setInputValue(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter') submitInputModal(); }}
              placeholder="Введите название..."
              className="custom-input"
            />
            <div className="modal-btns">
              <button className="btn fold" onClick={() => setInputModal({ ...inputModal, isOpen: false })}>Отмена</button>
              <button className="btn call" onClick={submitInputModal}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА ИМПОРТА */}
      {showImport && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Импорт: {activeSpot}</h3>
            <div style={{display: 'flex', alignItems: 'center', gap: '15px', background: '#111827', padding: '12px', borderRadius: '8px'}}>
              <label style={{fontWeight: 'bold'}}>Загрузить как:</label>
              <select value={importAction} onChange={e => setImportAction(e.target.value)} style={{padding: '8px 12px', borderRadius: '6px', background: '#374151', color: 'white', border: 'none', cursor: 'pointer', flexGrow: 1}}>
                <option value="Raise">Raise (Рейз)</option>
                <option value="Call">Call (Колл)</option>
                <option value="Allin">All-in (Олл-ин)</option>
              </select>
            </div>
            <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Вставьте строку сюда..." />
            <div style={{marginTop: '5px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', color: '#f3f4f6'}}>
                <input type="checkbox" checked={clearBeforeImport} onChange={e => setClearBeforeImport(e.target.checked)} style={{width: '18px', height: '18px'}} />
                Очистить матрицу перед загрузкой (оставить только Фолд)
              </label>
            </div>
            <div className="modal-btns">
              <button className="btn fold" onClick={() => setShowImport(false)}>Отмена</button>
              <button className="btn call" onClick={processImport}>Импорт</button>
            </div>
          </div>
        </div>
      )}

      {/* ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМОВ */}
      <div className="tabs">
        <button className={mode === 'editor' ? 'tab active' : 'tab'} onClick={() => { setMode('editor'); setShowSummary(false); }}>✏️ Редактор</button>
        <button className={mode === 'trainer' ? 'tab active' : 'tab'} onClick={() => { setMode('trainer'); setShowMatrix(false); setShowSummary(false); }}>🎯 Тренажер</button>
      </div>

      {/* ДЕРЕВО ПАПОК (С ОЖИВШИМИ ИКОНКАМИ) */}
      <div className="tree-navigation">
        <div className="tree-level">
          <span className="tree-label">ПАПКА:</span>
          <select value={activeCat} onChange={(e) => setActiveCat(e.target.value)}>
            {Object.keys(ranges).map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          {mode === 'editor' && (
            <div className="crud-icons">
              <span title="Создать папку" onClick={() => openCreateModal('cat')}>➕</span>
              <span title="Переименовать" onClick={() => openRenameModal('cat')}>✏️</span>
              <span title="Удалить" onClick={() => handleDelete('cat')}>🗑️</span>
            </div>
          )}
        </div>

        <div className="tree-level">
          <span className="tree-label">СИТУАЦИЯ:</span>
          <select value={activeSit} onChange={(e) => setActiveSit(e.target.value)} disabled={!activeCat}>
            {activeCat && ranges[activeCat] ? Object.keys(ranges[activeCat]).map(sit => <option key={sit} value={sit}>{sit}</option>) : null}
          </select>
          {mode === 'editor' && activeCat && (
            <div className="crud-icons">
              <span title="Создать ситуацию" onClick={() => openCreateModal('sit')}>➕</span>
              <span title="Переименовать" onClick={() => openRenameModal('sit')}>✏️</span>
              <span title="Удалить" onClick={() => handleDelete('sit')}>🗑️</span>
            </div>
          )}
        </div>

        <div className="tree-level">
          <span className="tree-label">СПОТ:</span>
          <select value={activeSpot} onChange={(e) => setActiveSpot(e.target.value)} disabled={!activeSit}>
            {mode === 'trainer' && <option value="ALL_SPOTS">🎲 Все споты (Случайно)</option>}
            {activeCat && activeSit && ranges[activeCat][activeSit] ? Object.keys(ranges[activeCat][activeSit]).map(spot => <option key={spot} value={spot}>{spot}</option>) : null}
          </select>
          {mode === 'editor' && activeSit && (
            <div className="crud-icons">
              <span title="Создать спот" onClick={() => openCreateModal('spot')}>➕</span>
              <span title="Переименовать" onClick={() => openRenameModal('spot')}>✏️</span>
              <span title="Удалить" onClick={() => handleDelete('spot')}>🗑️</span>
            </div>
          )}
        </div>
      </div>

      {/* --- РЕЖИМ РЕДАКТОРА --- */}
      {mode === 'editor' && (
        <div className="editor-panel">
          <div className="color-settings">
             <div className="color-item"><label>Fold</label><input type="color" value={actionColors.Fold} onChange={(e) => updateColor('Fold', e.target.value)} /></div>
             <div className="color-item"><label>Call</label><input type="color" value={actionColors.Call} onChange={(e) => updateColor('Call', e.target.value)} /></div>
             <div className="color-item"><label>Raise</label><input type="color" value={actionColors.Raise} onChange={(e) => updateColor('Raise', e.target.value)} /></div>
             <div className="color-item"><label>Allin</label><input type="color" value={actionColors.Allin} onChange={(e) => updateColor('Allin', e.target.value)} /></div>
          </div>

          <div className="brush-controls">
            <div className="buttons-container">
              <button className="btn" style={{ backgroundColor: actionColors.Fold }} onClick={() => setPureAction('Fold')}>100% Fold</button>
              <button className="btn" style={{ backgroundColor: actionColors.Call }} onClick={() => setPureAction('Call')}>100% Call</button>
              <button className="btn" style={{ backgroundColor: actionColors.Raise }} onClick={() => setPureAction('Raise')}>100% Raise</button>
              <button className="btn" style={{ backgroundColor: actionColors.Allin }} onClick={() => setPureAction('Allin')}>100% Allin</button>
            </div>
            
            <div className="sliders-group">
              <div className="slider-container">
                <div className="slider-row"><label style={{color: actionColors.Allin}}>Allin: {allinWeight}%</label><input type="range" min="0" max="100" step="1" value={allinWeight} onChange={(e) => handleSlider('Allin', e.target.value)} /></div>
              </div>
              <div className="slider-container">
                <div className="slider-row"><label style={{color: actionColors.Raise}}>Raise: {raiseWeight}%</label><input type="range" min="0" max="100" step="1" value={raiseWeight} onChange={(e) => handleSlider('Raise', e.target.value)} /></div>
              </div>
              <div className="slider-container">
                <div className="slider-row"><label style={{color: actionColors.Call}}>Call: {callWeight}%</label><input type="range" min="0" max="100" step="1" value={callWeight} onChange={(e) => handleSlider('Call', e.target.value)} /></div>
              </div>
              <div className="slider-container">
                <div className="slider-row"><label style={{color: actionColors.Fold}}>Fold: {foldWeight}%</label><div className="progress-bar" style={{backgroundColor: actionColors.Fold}}></div></div>
              </div>
            </div>
          </div>
          <div style={{display: 'flex', gap: '10px'}}>
            <button className="btn clear" onClick={clearCurrentRange}>Очистить спот</button>
            <button className="btn clear" style={{backgroundColor: '#2563eb'}} onClick={() => {if(activeSpot) setShowImport(true); else alert("Создайте спот!");}}>Импорт (текст)</button>
          </div>
        </div>
      )}

      {/* --- РЕЖИМ ТРЕНАЖЕРА --- */}
      {mode === 'trainer' && !showSummary && (
        <div className="trainer-panel">
          <div className="trainer-controls">
             <button className={`pos-btn ${trainerMode === 'Simple' ? 'active' : ''}`} onClick={() => setTrainerMode('Simple')}>Простой режим</button>
             <button className={`pos-btn ${trainerMode === 'RNG' ? 'active' : ''}`} onClick={() => setTrainerMode('RNG')}>RNG режим</button>
          </div>
          
          <div className="trainer-board">
             <div className="board-header">
                <span className="board-cat">{activeCat}</span>
                <span className="board-sit">{activeSit}</span>
             </div>
             
             <div className="board-spot-title">{trainerCurrentSpot || "Спот не выбран"}</div>
             
             <div style={{height: '30px', margin: '10px 0'}}>
                <p className="message">{message}</p>
             </div>

             <div className="board-cards" onClick={() => setShowMatrix(!showMatrix)}>
                <PlayingCard rank={currentCards[0].rank} suit={currentCards[0].suit} />
                <PlayingCard rank={currentCards[1].rank} suit={currentCards[1].suit} />
             </div>

             {trainerMode === 'RNG' && (
                <div className="rng-dice">🎲 <span>{diceValue}</span></div>
             )}

             <div className="action-panel">
                <button className="btn" style={{ backgroundColor: actionColors.Fold }} onClick={() => handleTrainerAction('Fold')}>Fold</button>
                <button className="btn" style={{ backgroundColor: actionColors.Call }} onClick={() => handleTrainerAction('Call')}>Call</button>
                <button className="btn" style={{ backgroundColor: actionColors.Raise }} onClick={() => handleTrainerAction('Raise')}>Raise</button>
                <button className="btn" style={{ backgroundColor: actionColors.Allin }} onClick={() => handleTrainerAction('Allin')}>All-in</button>
             </div>
             
             {isSessionActive && (
               <button className="finish-session-btn" onClick={finishSession}>Завершить сессию</button>
             )}
          </div>
        </div>
      )}

      {/* --- ЭКРАН ИТОГОВ СЕССИИ --- */}
      {showSummary && (
        <div className="summary-panel">
           <h2>Итоги тренировки</h2>
           <div className="summary-stats">
              {(() => {
                 let totalHands = 0, errors = 0;
                 Object.values(sessionHistory).forEach(d => { totalHands += d.attempts; errors += d.errors; });
                 const correct = totalHands - errors;
                 const accuracy = totalHands > 0 ? Math.round((correct / totalHands) * 100) : 0;
                 const avgTime = totalHands > 0 ? Math.round(totalSessionTime / totalHands) : 0;

                 return (
                   <>
                     <div className="stat-box"><span>Время</span><strong>{formatTime(totalSessionTime)}</strong></div>
                     <div className="stat-box"><span>Ср. время ответа</span><strong>{avgTime} сек</strong></div>
                     <div className="stat-box"><span>Пройдено рук</span><strong>{totalHands}</strong></div>
                     <div className="stat-box"><span>Верных</span><strong style={{color: '#10b981'}}>{correct}</strong></div>
                     <div className="stat-box"><span>Ошибок</span><strong style={{color: '#ef4444'}}>{errors}</strong></div>
                     <div className="stat-box"><span>Качество</span><strong>{accuracy}%</strong></div>
                   </>
                 );
              })()}
           </div>
           
           <h4 style={{marginTop: '20px', marginBottom: '15px', color: '#9ca3af', textAlign: 'center'}}>Анализ рук (Наведите курсор на красную ячейку)</h4>
           
           <div className="summary-matrix-wrapper">
             <div className="poker-grid summary-grid">
              {hands.map((hand) => {
                const data = sessionHistory[hand];
                return (
                  <div 
                    key={hand} 
                    className="grid-cell" 
                    onMouseMove={(e) => handleCellMouseMove(e, hand)} 
                    onMouseLeave={handleCellMouseLeave}
                    style={{ background: getSummaryCellBackground(hand), border: data && data.attempts > 0 ? '1px solid #111827' : '1px solid #374151' }}
                  >
                    <div>{hand}</div>
                    {data && data.attempts > 0 && (
                      <div className="cell-stats">
                        {data.attempts - data.errors}/{data.attempts}
                      </div>
                    )}
                  </div>
                );
              })}
             </div>
           </div>

          <button className="btn call" style={{marginTop: '30px', width: '200px'}} onClick={() => {setShowSummary(false); startSession();}}>Начать заново</button>
        </div>
      )}

      {/* --- СТАНДАРТНАЯ МАТРИЦА --- */}
      {(mode === 'editor' || (showMatrix && !showSummary)) && activeSpot && (
        <>
          <div className="poker-grid" onMouseLeave={handleCellMouseLeave}>
            {hands.map((hand) => (
              <div 
                key={hand} 
                className="grid-cell" 
                onMouseDown={(e) => handleMouseDown(e, hand)} 
                onMouseEnter={(e) => handleMouseEnter(e, hand)} 
                onMouseMove={(e) => handleCellMouseMove(e, hand)}
                style={{ background: getCellBackground(hand) }}
              >
                {hand}
              </div>
            ))}
          </div>
          {renderStats()}
        </>
      )}
    </div>
  );
}

export default App;