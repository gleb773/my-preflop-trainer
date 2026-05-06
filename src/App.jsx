import { useState, useEffect, useCallback, useRef } from 'react';
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

const getNeighbors = (handIndex) => {
  const row = Math.floor(handIndex / 13);
  const col = handIndex % 13;
  const neighbors = [];
  for (let r = Math.max(0, row - 1); r <= Math.min(12, row + 1); r++) {
    for (let c = Math.max(0, col - 1); c <= Math.min(12, col + 1); c++) {
      neighbors.push(r * 13 + c);
    }
  }
  return neighbors;
};

function App() {
  const hands = generateHandMatrix();

  const [mode, setMode] = useState('editor'); 
  const [showSettings, setShowSettings] = useState(false);
  
  // --- ДЕРЕВО ПАПОК ---
  const [ranges, setRanges] = useState(() => {
    const saved = localStorage.getItem('pokerRangesV12');
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
    } else setActiveCat(Object.keys(ranges)[0] || "");
  }, [ranges, activeCat]);

  useEffect(() => {
    if (ranges[activeCat] && ranges[activeCat][activeSit]) {
      const spots = Object.keys(ranges[activeCat][activeSit]);
      if (!spots.includes(activeSpot)) setActiveSpot(spots[0] || "");
    } else setActiveSpot("");
  }, [ranges, activeCat, activeSit]);

  // --- КАСТОМНОЕ ОКНО ВВОДА ДЛЯ CRUD ---
  const [inputModal, setInputModal] = useState({ isOpen: false, type: '', level: '', oldName: '', title: '' });
  const [inputValue, setInputValue] = useState("");
  
  const inputRef = useRef(null);
  useEffect(() => {
    if (inputModal.isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputModal.isOpen]);

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
        if (newRanges[name]) return alert("Папка существует!");
        newRanges[name] = { "Новая Ситуация": { "Новый Спот": {} } };
        setActiveCat(name);
      } else if (level === 'sit') {
        if (!activeCat) return;
        if (newRanges[activeCat][name]) return alert("Ситуация существует!");
        newRanges[activeCat][name] = { "Новый Спот": {} };
        setActiveSit(name);
      } else if (level === 'spot') {
        if (!activeCat || !activeSit) return;
        if (newRanges[activeCat][activeSit][name]) return alert("Спот существует!");
        newRanges[activeCat][activeSit][name] = {};
        setActiveSpot(name);
      }
    } else if (type === 'rename') {
      if (name === oldName) return setInputModal({ ...inputModal, isOpen: false });
      if (level === 'cat') {
        if (newRanges[name]) return alert("Имя занято!");
        newRanges[name] = newRanges[oldName]; delete newRanges[oldName]; setActiveCat(name);
      } else if (level === 'sit') {
        if (newRanges[activeCat][name]) return alert("Имя занято!");
        newRanges[activeCat][name] = newRanges[activeCat][oldName]; delete newRanges[activeCat][oldName]; setActiveSit(name);
      } else if (level === 'spot') {
        if (newRanges[activeCat][activeSit][name]) return alert("Имя занято!");
        newRanges[activeCat][activeSit][name] = newRanges[activeCat][activeSit][oldName]; delete newRanges[activeCat][activeSit][oldName]; setActiveSpot(name);
      }
    }
    setRanges(newRanges);
    setInputModal({ ...inputModal, isOpen: false });
  };

  const handleDelete = (level) => {
    const targetName = level === 'cat' ? activeCat : level === 'sit' ? activeSit : activeSpot;
    if (!targetName) return;
    if (!window.confirm(`Удалить "${targetName}" и все вложенные данные?`)) return;
    const newRanges = { ...ranges };
    if (level === 'cat') { delete newRanges[targetName]; setActiveCat(Object.keys(newRanges)[0] || ""); }
    else if (level === 'sit') { delete newRanges[activeCat][targetName]; setActiveSit(Object.keys(newRanges[activeCat] || {})[0] || ""); }
    else if (level === 'spot') { delete newRanges[activeCat][activeSit][targetName]; setActiveSpot(Object.keys(newRanges[activeCat][activeSit] || {})[0] || ""); }
    setRanges(newRanges);
  };

  const [actionColors, setActionColors] = useState(() => {
    const saved = localStorage.getItem('pokerColorsV12');
    return saved ? JSON.parse(saved) : { Allin: '#f59e0b', Raise: '#ef4444', Call: '#4ade80', Fold: '#3b82f6' };
  });

  const [hotkeys, setHotkeys] = useState(() => {
    const saved = localStorage.getItem('pokerHotkeysV12');
    return saved ? JSON.parse(saved) : { Fold: '1', Call: '2', Raise: '3', Allin: '4' };
  });

  const [isLocked, setIsLocked] = useState(true);
  const [isMaskMode, setIsMaskMode] = useState(false);
  const [maskDragValue, setMaskDragValue] = useState(true);

  const [activeBrushAction, setActiveBrushAction] = useState('Raise');
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
  
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importAction, setImportAction] = useState("Raise");
  const [clearBeforeImport, setClearBeforeImport] = useState(true);

  const importTextRef = useRef(null);
  useEffect(() => {
    if (showImport && importTextRef.current) {
      importTextRef.current.focus();
    }
  }, [showImport]);

  const [hoverData, setHoverData] = useState(null); 
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [totalSessionTime, setTotalSessionTime] = useState(0);
  const [sessionHistory, setSessionHistory] = useState({});

  const formatTime = (seconds) => { const m = Math.floor(seconds/60); const s = seconds%60; return `${m} мин ${s} сек`; };

  const getMatrixData = (h) => {
    return ranges[activeCat]?.[activeSit]?.[activeSpot]?.[h] || {};
  };

  const getActivePool = useCallback(() => {
    const spotData = ranges[activeCat]?.[activeSit]?.[activeSpot] || {};
    const activeHands = hands.filter(h => spotData[h] && (spotData[h].Allin > 0 || spotData[h].Raise > 0 || spotData[h].Call > 0));
    const haloSet = new Set();
    
    activeHands.forEach(h => {
      const idx = hands.indexOf(h);
      getNeighbors(idx).forEach(n => haloSet.add(hands[n]));
    });

    const pool = hands.filter(h => {
      const manualOverride = spotData[h]?.inZone; 
      if (manualOverride !== undefined) return manualOverride; 
      return haloSet.has(h); 
    });
    
    return pool.length > 0 ? pool : hands; 
  }, [ranges, activeCat, activeSit, activeSpot]);

  const currentPool = getActivePool();

  const rollNewHand = () => {
    const pool = getActivePool();
    const newHand = pool[Math.floor(Math.random() * pool.length)];
    
    setCurrentHand(newHand);
    setDiceValue(Math.floor(Math.random() * 100) + 1); 

    const suits = ['s', 'h', 'd', 'c']; let s1, s2;
    if (newHand.length === 2) { s1 = suits[Math.floor(Math.random()*4)]; do { s2 = suits[Math.floor(Math.random()*4)] } while (s1 === s2); } 
    else if (newHand[2] === 's') { s1 = s2 = suits[Math.floor(Math.random()*4)]; } 
    else { s1 = suits[Math.floor(Math.random()*4)]; do { s2 = suits[Math.floor(Math.random()*4)] } while (s1 === s2); }
    setCurrentCards([{rank: newHand[0], suit: s1}, {rank: newHand[1], suit: s2}]);
  };

  useEffect(() => { if (mode !== 'trainer') rollNewHand(); }, [activeCat, activeSit, activeSpot, mode]);
  useEffect(() => { localStorage.setItem('pokerRangesV12', JSON.stringify(ranges)); }, [ranges]);
  useEffect(() => { localStorage.setItem('pokerColorsV12', JSON.stringify(actionColors)); }, [actionColors]);
  useEffect(() => { localStorage.setItem('pokerHotkeysV12', JSON.stringify(hotkeys)); }, [hotkeys]);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsMouseDown(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleTrainerActionRef = useCallback((action) => handleTrainerAction(action), [mode, currentHand, trainerMode, diceValue, activeSpot, ranges]);

  useEffect(() => {
    if (mode !== 'trainer' || showSettings || inputModal.isOpen) return;
    
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const code = e.code.toLowerCase(); 
      
      const matchKey = (boundKey) => {
        if (!boundKey) return false;
        const b = boundKey.toLowerCase();
        return key === b || code === `key${b}` || code === `digit${b}` || code === `numpad${b}` || code === b;
      };

      if (matchKey(hotkeys.Fold)) handleTrainerActionRef('Fold');
      else if (matchKey(hotkeys.Call)) handleTrainerActionRef('Call');
      else if (matchKey(hotkeys.Raise)) handleTrainerActionRef('Raise');
      else if (matchKey(hotkeys.Allin)) handleTrainerActionRef('Allin');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, showSettings, inputModal, hotkeys, handleTrainerActionRef]);

  const handleSlider = (action, val) => {
    const v = Number(val);
    let a = action === 'Allin' ? v : allinWeight; 
    let r = action === 'Raise' ? v : raiseWeight; 
    let c = action === 'Call' ? v : callWeight;
    
    if (a + r + c > 100) {
      if (action === 'Allin') { r = 100-a; c = 0; if (r<0) r=0; }
      else if (action === 'Raise') { c = 100-a-r; if (c<0){c=0; a=100-r;} }
      else if (action === 'Call') { r = 100-a-c; if (r<0){r=0; a=100-c;} }
    }
    setAllinWeight(Number(a.toFixed(2))); setRaiseWeight(Number(r.toFixed(2))); setCallWeight(Number(c.toFixed(2)));
    setActiveBrushAction(action);
  };

  const setQuickWeight = (val) => {
    if(activeBrushAction === 'Fold') {
       setAllinWeight(0); setRaiseWeight(0); setCallWeight(0);
    } else {
       handleSlider(activeBrushAction, val);
    }
  };

  const applyBrush = (hand, forceMaskValue = null) => {
    if (isLocked) return;
    if (!activeCat || !activeSit || !activeSpot) return;

    setRanges(prev => {
      const newRanges = JSON.parse(JSON.stringify(prev));
      const spotData = newRanges[activeCat][activeSit][activeSpot];
      if (!spotData[hand]) spotData[hand] = { Allin: 0, Raise: 0, Call: 0, Fold: 100 };

      if (isMaskMode) {
        const currentZoneStatus = currentPool.includes(hand);
        spotData[hand].inZone = forceMaskValue !== null ? forceMaskValue : !currentZoneStatus;
      } else {
        const isSame = spotData[hand].Allin === allinWeight && spotData[hand].Raise === raiseWeight && spotData[hand].Call === callWeight;
        if (isSame && activeBrushAction !== 'Fold') {
          spotData[hand] = { ...spotData[hand], Allin: 0, Raise: 0, Call: 0, Fold: 100 };
        } else {
          spotData[hand] = { ...spotData[hand], Allin: allinWeight, Raise: raiseWeight, Call: callWeight, Fold: foldWeight };
        }
      }
      return newRanges;
    });
  };

  const handleMouseDown = (e, hand) => { 
    e.preventDefault(); 
    if (isLocked) return;
    setIsMouseDown(true); 
    
    if (isMaskMode) {
      const inZone = currentPool.includes(hand);
      setMaskDragValue(!inZone);
      applyBrush(hand, !inZone);
    } else {
      applyBrush(hand); 
    }
  };

  const handleMouseEnter = (e, hand) => { 
    if (isMouseDown && !isLocked) {
      if (isMaskMode) applyBrush(hand, maskDragValue);
      else applyBrush(hand);
    }
  };

  const handleCellMouseMove = (e, hand) => {
    let x = e.clientX + 15; let y = e.clientY + 15;
    if (window.innerWidth - e.clientX < 170) x = e.clientX - 160;
    if (window.innerHeight - e.clientY < 180) y = e.clientY - 170;
    setHoverData({ hand, x, y });
  };

  const handleCellMouseLeave = () => setHoverData(null);
  const updateColor = (action, color) => setActionColors(prev => ({ ...prev, [action]: color }));

  const clearCurrentRange = () => {
    if(activeCat && activeSit && activeSpot) {
      if(window.confirm("Очистить все веса и настройки зоны в этом споте?")) {
        setRanges(prev => ({...prev, [activeCat]: {...prev[activeCat], [activeSit]: {...prev[activeCat][activeSit], [activeSpot]: {}}}}));
      }
    }
  };

  const startSession = () => {
    if (!activeCat || !activeSit || !activeSpot) return alert("Выберите спот!");
    setSessionHistory({}); 
    setSessionStartTime(Date.now()); 
    setMode('trainer'); 
    setShowMatrix(false); 
    setMessage("Сессия начата!");
    rollNewHand();
  };

  const finishSession = () => { 
    setMode('summary'); 
    setShowMatrix(false);
    setTotalSessionTime(Math.floor((Date.now() - sessionStartTime) / 1000)); 
  };

  const returnToEditor = () => {
    setMode('editor');
    setShowMatrix(false);
  };

  function handleTrainerAction(userAction) {
    if (mode !== 'trainer') return;
    const handData = getMatrixData(currentHand);
    let isCorrect = false; let msg = ""; let targetAction = "Fold";

    if (trainerMode === 'Simple') {
      const weight = handData[userAction] || (userAction === 'Fold' && (handData.Fold === undefined || handData.Fold === 100) ? 100 : 0);
      if (weight > 0) { isCorrect = true; msg = `✅ Верно! (${userAction} ${weight}%)`; } 
      else {
        const actions = [];
        if (handData.Allin > 0) actions.push(`Allin (${handData.Allin}%)`);
        if (handData.Raise > 0) actions.push(`Raise (${handData.Raise}%)`);
        if (handData.Call > 0) actions.push(`Call (${handData.Call}%)`);
        if (handData.Fold > 0 || actions.length === 0) actions.push(`Fold (${handData.Fold || 100}%)`);
        msg = `❌ Ошибка! Нужно: ${actions.join(' или ')}`;
      }
    } else {
      const a = Number(handData.Allin || 0); const r = Number(handData.Raise || 0); const c = Number(handData.Call || 0);
      if (diceValue <= a && a > 0) targetAction = 'Allin';
      else if (diceValue <= a + r && r > 0) targetAction = 'Raise';
      else if (diceValue <= a + r + c && c > 0) targetAction = 'Call';
      
      if (userAction === targetAction) { isCorrect = true; msg = `✅ Верно! (Кубик: ${diceValue})`; } 
      else msg = `❌ Ошибка! (Кубик: ${diceValue} -> ${targetAction})`;
    }

    setSessionHistory(prev => ({ 
      ...prev, 
      [currentHand]: { 
        attempts: (prev[currentHand]?.attempts || 0) + 1, 
        errors: (prev[currentHand]?.errors || 0) + (isCorrect ? 0 : 1) 
      } 
    }));

    setMessage(msg);
    setTimeout(() => { rollNewHand(); setMessage("Ваш ход!"); setShowMatrix(false); }, 1500);
  }

  const getCellBackground = (hand) => {
    const data = getMatrixData(hand);
    const a = data.Allin || 0; const r = data.Raise || 0; const c = data.Call || 0;
    const stop1 = a; const stop2 = a + r; const stop3 = a + r + c;
    const baseBg = `linear-gradient(to right, ${actionColors.Allin} 0% ${stop1}%, ${actionColors.Raise} ${stop1}% ${stop2}%, ${actionColors.Call} ${stop2}% ${stop3}%, ${actionColors.Fold} ${stop3}% 100%)`;
    
    if (isMaskMode) {
      const inZone = currentPool.includes(hand);
      if (!inZone) {
        return `repeating-linear-gradient(45deg, rgba(0,0,0,0.7), rgba(0,0,0,0.7) 4px, rgba(20,20,20,0.9) 4px, rgba(20,20,20,0.9) 8px), ${baseBg}`;
      }
      return baseBg; 
    }
    return baseBg;
  };

  const getSummaryCellBackground = (hand) => {
    const baseBg = getCellBackground(hand);
    const sessionData = sessionHistory[hand];
    if (!sessionData || sessionData.attempts === 0) {
      return `linear-gradient(rgba(17, 24, 39, 0.82), rgba(17, 24, 39, 0.82)), ${baseBg}`;
    }
    return baseBg;
  };

  const exportBackup = () => {
    const data = JSON.stringify({ ranges, actionColors, hotkeys });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `poker_backup_${new Date().toLocaleDateString()}.json`; a.click();
  };
  
  const importBackup = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if(data.ranges) setRanges(data.ranges);
        if(data.actionColors) setActionColors(data.actionColors);
        if(data.hotkeys) setHotkeys(data.hotkeys);
        alert("База успешно загружена!"); setShowSettings(false);
      } catch(err) { alert("Ошибка файла!"); }
    };
    reader.readAsText(file);
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
      newPosRange[h] = { Allin: Number(a.toFixed(2)), Raise: Number(r.toFixed(2)), Call: Number(c.toFixed(2)), Fold: Number((100 - a - r - c).toFixed(2)), inZone: newPosRange[h].inZone };
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
    const sc = { s: '#374151', h: '#dc2626', d: '#2563eb', c: '#16a34a' }; const ss = { s: '♠', h: '♥', d: '♦', c: '♣' };
    return <div className="playing-card" style={{ backgroundColor: sc[suit] }}><span className="card-rank">{rank}</span><span className="card-suit-bg">{ss[suit]}</span></div>;
  };

  return (
    <div className="app-container">
      {hoverData && (
        <div className="floating-tooltip" style={{ left: hoverData.x, top: hoverData.y }}>
          <div className="tooltip-title">Рука: {hoverData.hand}</div>
          <div className="tooltip-row"><span style={{color: actionColors.Allin}}>All-in:</span> <span>{getMatrixData(hoverData.hand).Allin || 0}%</span></div>
          <div className="tooltip-row"><span style={{color: actionColors.Raise}}>Raise:</span> <span>{getMatrixData(hoverData.hand).Raise || 0}%</span></div>
          <div className="tooltip-row"><span style={{color: actionColors.Call}}>Call:</span> <span>{getMatrixData(hoverData.hand).Call || 0}%</span></div>
          <div className="tooltip-row"><span style={{color: actionColors.Fold}}>Fold:</span> <span>{getMatrixData(hoverData.hand).Fold ?? 100}%</span></div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>⚙️ Настройки Тренажера</h3>
            <div className="settings-block">
              <h4>Горячие клавиши (англ/рус)</h4>
              <div className="hotkeys-grid">
                <div><label style={{color: actionColors.Fold}}>Fold</label><input maxLength="1" value={hotkeys.Fold} onChange={e => setHotkeys({...hotkeys, Fold: e.target.value.toUpperCase()})} /></div>
                <div><label style={{color: actionColors.Call}}>Call</label><input maxLength="1" value={hotkeys.Call} onChange={e => setHotkeys({...hotkeys, Call: e.target.value.toUpperCase()})} /></div>
                <div><label style={{color: actionColors.Raise}}>Raise</label><input maxLength="1" value={hotkeys.Raise} onChange={e => setHotkeys({...hotkeys, Raise: e.target.value.toUpperCase()})} /></div>
                <div><label style={{color: actionColors.Allin}}>All-in</label><input maxLength="1" value={hotkeys.Allin} onChange={e => setHotkeys({...hotkeys, Allin: e.target.value.toUpperCase()})} /></div>
              </div>
            </div>
            <div className="settings-block">
              <h4>База данных (Бэкап)</h4>
              <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                <button className="btn call" onClick={exportBackup} style={{flex: 1}}>💾 Скачать Базу</button>
                <label className="btn fold" style={{flex: 1, textAlign: 'center', cursor: 'pointer'}}>📂 Загрузить Базу <input type="file" accept=".json" style={{display: 'none'}} onChange={importBackup} /></label>
              </div>
            </div>
            <div className="modal-btns" style={{marginTop: '20px'}}>
              <button className="btn fold" onClick={() => setShowSettings(false)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

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
            <textarea 
              ref={importTextRef} 
              value={importText} 
              onChange={e => setImportText(e.target.value)} 
              placeholder="Вставьте строку GTOBase (Ctrl+V)..." 
            />
            <div style={{marginTop: '5px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', color: '#f3f4f6'}}>
                <input type="checkbox" checked={clearBeforeImport} onChange={e => setClearBeforeImport(e.target.checked)} style={{width: '18px', height: '18px'}} /> Очистить матрицу перед загрузкой
              </label>
            </div>
            <div className="modal-btns">
              <button className="btn fold" onClick={() => setShowImport(false)}>Отмена</button>
              <button className="btn call" onClick={processImport}>Импорт</button>
            </div>
          </div>
        </div>
      )}

      {inputModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '400px'}}>
            <h3>{inputModal.title}</h3>
            <input 
              ref={inputRef} 
              value={inputValue} 
              onChange={e => setInputValue(e.target.value)} 
              onKeyDown={(e) => { if(e.key === 'Enter') submitInputModal(); }} 
              className="custom-input" 
            />
            <div className="modal-btns">
              <button className="btn fold" onClick={() => setInputModal({ ...inputModal, isOpen: false })}>Отмена</button>
              <button className="btn call" onClick={submitInputModal}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      <div style={{display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '800px', marginBottom: '10px'}}>
        <button className="settings-btn" onClick={() => setShowSettings(true)}>⚙️ Настройки</button>
      </div>

      {mode === 'editor' && (
        <div className="tree-navigation">
          <div className="tree-level"><span className="tree-label">ПАПКА:</span><select value={activeCat} onChange={(e) => setActiveCat(e.target.value)}>{Object.keys(ranges).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
            {!isLocked && <div className="crud-icons"><span onClick={() => openCreateModal('cat')}>➕</span><span onClick={() => openRenameModal('cat')}>✏️</span><span onClick={() => handleDelete('cat')}>🗑️</span></div>}
          </div>
          <div className="tree-level"><span className="tree-label">СИТУАЦИЯ:</span><select value={activeSit} onChange={(e) => setActiveSit(e.target.value)} disabled={!activeCat}>{activeCat && ranges[activeCat] ? Object.keys(ranges[activeCat]).map(sit => <option key={sit} value={sit}>{sit}</option>) : null}</select>
            {!isLocked && activeCat && <div className="crud-icons"><span onClick={() => openCreateModal('sit')}>➕</span><span onClick={() => openRenameModal('sit')}>✏️</span><span onClick={() => handleDelete('sit')}>🗑️</span></div>}
          </div>
          {/* ВОТ ЗДЕСЬ ИСПРАВЛЕНА ОШИБКА БЕЛОГО ЭКРАНА (добавлен ? перед .[activeSit]) */}
          <div className="tree-level"><span className="tree-label">СПОТ:</span><select value={activeSpot} onChange={(e) => setActiveSpot(e.target.value)} disabled={!activeSit}>{activeCat && activeSit && ranges[activeCat]?.[activeSit] ? Object.keys(ranges[activeCat][activeSit]).map(spot => <option key={spot} value={spot}>{spot}</option>) : null}</select>
            {!isLocked && activeSit && <div className="crud-icons"><span onClick={() => openCreateModal('spot')}>➕</span><span onClick={() => openRenameModal('spot')}>✏️</span><span onClick={() => handleDelete('spot')}>🗑️</span></div>}
          </div>
          
          <div style={{width: '100%', display: 'flex', justifyContent: 'center', marginTop: '15px'}}>
            <button className="start-training-btn" onClick={startSession} disabled={!activeSpot}>
              ▶ Начать тренировку
            </button>
          </div>
        </div>
      )}

      {mode === 'editor' && (
        <div className="editor-panel">
          
          <div style={{display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', background: '#111827', padding: '10px 15px', borderRadius: '8px', boxSizing: 'border-box'}}>
             <div className="lock-toggle" onClick={() => {setIsLocked(!isLocked); setIsMaskMode(false);}}>
               <span style={{fontSize: '1.5rem'}}>{isLocked ? '🔒' : '🔓'}</span>
               <span style={{fontWeight: 'bold', color: isLocked ? '#ef4444' : '#10b981'}}>{isLocked ? 'ЗАБЛОКИРОВАНО' : 'РЕДАКТИРОВАНИЕ'}</span>
             </div>
             
             {!isLocked && (
               <button className={`mask-btn ${isMaskMode ? 'active' : ''}`} onClick={() => setIsMaskMode(!isMaskMode)}>
                 🎯 Зона Тренировки
               </button>
             )}
          </div>

          {!isLocked && !isMaskMode && (
            <>
              <div className="color-settings">
                <div className="color-item"><label>Fold</label><input type="color" value={actionColors.Fold} onChange={(e) => updateColor('Fold', e.target.value)} /></div>
                <div className="color-item"><label>Call</label><input type="color" value={actionColors.Call} onChange={(e) => updateColor('Call', e.target.value)} /></div>
                <div className="color-item"><label>Raise</label><input type="color" value={actionColors.Raise} onChange={(e) => updateColor('Raise', e.target.value)} /></div>
                <div className="color-item"><label>Allin</label><input type="color" value={actionColors.Allin} onChange={(e) => updateColor('Allin', e.target.value)} /></div>
              </div>

              <div className="brush-controls">
                <div className="sliders-group">
                  <div className={`multi-slider-row ${activeBrushAction === 'Fold' ? 'active-row' : ''}`} onClick={() => setActiveBrushAction('Fold')} style={{'--row-color': actionColors.Fold}}>
                    <label>Fold</label>
                    <input type="range" disabled value={foldWeight} className="custom-range" />
                    <span>{foldWeight}%</span>
                  </div>
                  <div className={`multi-slider-row ${activeBrushAction === 'Call' ? 'active-row' : ''}`} onClick={() => setActiveBrushAction('Call')} style={{'--row-color': actionColors.Call}}>
                    <label>Call</label>
                    <input type="range" min="0" max="100" value={callWeight} onChange={(e) => handleSlider('Call', e.target.value)} className="custom-range" />
                    <span>{callWeight}%</span>
                  </div>
                  <div className={`multi-slider-row ${activeBrushAction === 'Raise' ? 'active-row' : ''}`} onClick={() => setActiveBrushAction('Raise')} style={{'--row-color': actionColors.Raise}}>
                    <label>Raise</label>
                    <input type="range" min="0" max="100" value={raiseWeight} onChange={(e) => handleSlider('Raise', e.target.value)} className="custom-range" />
                    <span>{raiseWeight}%</span>
                  </div>
                  <div className={`multi-slider-row ${activeBrushAction === 'Allin' ? 'active-row' : ''}`} onClick={() => setActiveBrushAction('Allin')} style={{'--row-color': actionColors.Allin}}>
                    <label>Allin</label>
                    <input type="range" min="0" max="100" value={allinWeight} onChange={(e) => handleSlider('Allin', e.target.value)} className="custom-range" />
                    <span>{allinWeight}%</span>
                  </div>
                </div>
                
                <div className="quick-weights-panel">
                   {[0, 25, 50, 75, 100].map(val => (
                     <button key={val} className="quick-btn" onClick={() => setQuickWeight(val)}>{val}%</button>
                   ))}
                </div>
                
                <div style={{display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap', justifyContent: 'center'}}>
                  <button className="btn fold" onClick={clearCurrentRange}>Очистить спот</button>
                  <button className="btn call" onClick={() => {if(activeSpot) setShowImport(true); else alert("Создайте спот!");}}>⬇️ Импорт текста</button>
                </div>
              </div>
            </>
          )}

          {isMaskMode && (
            <div className="mask-info-panel">
               <h4>Режим настройки Зоны Тренировки</h4>
               <p>Ореол вычисляется автоматически. Заштрихованные руки (мертвая зона) не будут выпадать. Кликните по ячейке, чтобы включить/исключить её вручную.</p>
            </div>
          )}

        </div>
      )}

      {mode === 'trainer' && (
        <div className="trainer-panel">
          <div className="trainer-controls">
             <button className={`pos-btn ${trainerMode === 'Simple' ? 'active' : ''}`} onClick={() => setTrainerMode('Simple')}>Простой режим</button>
             <button className={`pos-btn ${trainerMode === 'RNG' ? 'active' : ''}`} onClick={() => setTrainerMode('RNG')}>RNG режим</button>
          </div>
          
          <div className="trainer-board">
             <div className="board-header"><span className="board-cat">{activeCat}</span><span className="board-sit">{activeSit}</span></div>
             <div className="board-spot-title">{activeSpot}</div>
             <div style={{height: '30px', margin: '10px 0'}}><p className="message">{message}</p></div>

             <div className="board-cards" onClick={() => setShowMatrix(!showMatrix)}>
                 <PlayingCard rank={currentCards[0].rank} suit={currentCards[0].suit} />
                 <PlayingCard rank={currentCards[1].rank} suit={currentCards[1].suit} />
             </div>
             <div style={{fontSize: '0.8rem', color: '#9ca3af', marginTop: '-20px', marginBottom: '20px'}}>Кликните по картам, чтобы подглядеть ренж</div>

             {trainerMode === 'RNG' && <div className="rng-dice">🎲 <span>{diceValue}</span></div>}

             <div className="action-panel">
                <button className="action-btn" style={{ backgroundColor: actionColors.Fold }} onClick={() => handleTrainerAction('Fold')}>Fold<span className="hotkey-hint">{hotkeys.Fold}</span></button>
                <button className="action-btn" style={{ backgroundColor: actionColors.Call }} onClick={() => handleTrainerAction('Call')}>Call<span className="hotkey-hint">{hotkeys.Call}</span></button>
                <button className="action-btn" style={{ backgroundColor: actionColors.Raise }} onClick={() => handleTrainerAction('Raise')}>Raise<span className="hotkey-hint">{hotkeys.Raise}</span></button>
                <button className="action-btn" style={{ backgroundColor: actionColors.Allin }} onClick={() => handleTrainerAction('Allin')}>All-in<span className="hotkey-hint">{hotkeys.Allin}</span></button>
             </div>
             
             <button className="finish-session-btn" onClick={finishSession}>Завершить сессию</button>
          </div>
        </div>
      )}

      {mode === 'summary' && (
        <div className="summary-panel">
           <h2>Итоги тренировки: {activeSpot}</h2>
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
                     <div className="stat-box"><span>Ср. время</span><strong>{avgTime} сек</strong></div>
                     <div className="stat-box"><span>Пройдено рук</span><strong>{totalHands}</strong></div>
                     <div className="stat-box"><span>Верных</span><strong style={{color: '#10b981'}}>{correct}</strong></div>
                     <div className="stat-box"><span>Ошибок</span><strong style={{color: '#ef4444'}}>{errors}</strong></div>
                     <div className="stat-box"><span>Качество</span><strong>{accuracy}%</strong></div>
                   </>
                 );
              })()}
           </div>
           
           <h4 style={{marginTop: '20px', marginBottom: '15px', color: '#9ca3af', textAlign: 'center'}}>Анализ рук (Наведите курсор на ячейку)</h4>
           
           <div className="summary-matrix-wrapper">
             <div className="poker-grid summary-grid">
              {hands.map((hand) => {
                const data = sessionHistory[hand];
                let cellClass = "grid-cell summary-cell";
                if (data && data.attempts > 0) {
                  cellClass += data.errors > 0 ? " summary-incorrect" : " summary-correct";
                }

                return (
                  <div key={hand} className={cellClass} onMouseMove={(e) => handleCellMouseMove(e, hand)} onMouseLeave={handleCellMouseLeave} style={{ background: getSummaryCellBackground(hand) }}>
                    <div>{hand}</div>
                    {data && data.attempts > 0 && (
                      <div className={`cell-stats ${data.errors > 0 ? 'stat-incorrect' : 'stat-correct'}`}>
                        {data.attempts - data.errors}/{data.attempts}
                      </div>
                    )}
                  </div>
                );
              })}
             </div>
           </div>
          
          <div style={{display: 'flex', gap: '15px', marginTop: '30px'}}>
             <button className="btn call" style={{width: '200px'}} onClick={startSession}>Повторить сессию</button>
             <button className="btn fold" style={{width: '200px'}} onClick={returnToEditor}>Вернуться в редактор</button>
          </div>
        </div>
      )}

      {(mode === 'editor' || (mode === 'trainer' && showMatrix)) && activeSpot && (
        <>
          <div className={`poker-grid ${isLocked && !isMaskMode && mode === 'editor' ? 'locked-grid' : ''}`} onMouseLeave={handleCellMouseLeave}>
            {hands.map((hand) => (
              <div 
                key={hand} className="grid-cell" 
                onMouseDown={(e) => handleMouseDown(e, hand)} onMouseEnter={(e) => handleMouseEnter(e, hand)} onMouseMove={(e) => handleCellMouseMove(e, hand)}
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