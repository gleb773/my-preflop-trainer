import { useState, useMemo } from 'react';
import './App.css';
import EditorView from './components/EditorView';
import TrainerPanel from './components/TrainerPanel';
import SummaryPanel from './components/SummaryPanel';
import HistoryPanel from './components/HistoryPanel';
import SettingsModal from './components/modals/SettingsModal';
import { usePersistentState } from './hooks/usePersistentState';
import { normalizeHotkeys, DEFAULT_HOTKEYS } from './utils/hotkeys';
import { STORAGE_KEYS, validateBackup, countSpots, downloadJson, backupFilename } from './utils/backup';

const DEFAULT_RANGES = {
  'Cash 100bb': {
    'Open Raise (RFI)': { UTG: {}, HJ: {}, CO: {}, BTN: {}, SB: {} },
    'vs 3-Bet': { 'UTG vs HJ': {}, 'BTN vs BB': {} },
  },
};
const DEFAULT_COLORS = { Allin: '#f59e0b', Raise: '#ef4444', Call: '#4ade80', Fold: '#3b82f6' };

const normalizeColors = (c) => ({ ...DEFAULT_COLORS, ...(c && typeof c === 'object' ? c : {}) });
const normalizeHistory = (h) => (Array.isArray(h) ? h : []);
const firstKey = (obj) => (obj ? Object.keys(obj)[0] || '' : '');

function readAutoBackupInfo() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.autoBackup);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.savedAt ? new Date(data.savedAt).toLocaleString('ru-RU') : 'без даты';
  } catch {
    return null;
  }
}

function App() {
  // Ключи localStorage не меняются — существующие ренжи сохраняются
  const [ranges, setRanges] = usePersistentState(STORAGE_KEYS.ranges, DEFAULT_RANGES);
  const [actionColors, setActionColors] = usePersistentState(STORAGE_KEYS.colors, DEFAULT_COLORS, normalizeColors);
  const [hotkeys, setHotkeys] = usePersistentState(STORAGE_KEYS.hotkeys, DEFAULT_HOTKEYS, normalizeHotkeys);
  const [history, setHistory] = usePersistentState(STORAGE_KEYS.history, [], normalizeHistory);

  const [mode, setMode] = useState('editor'); // editor | trainer | summary | history
  const [showSettings, setShowSettings] = useState(false);
  const [lastSession, setLastSession] = useState(null);
  const [trainerKey, setTrainerKey] = useState(0);
  const [autoBackupInfo, setAutoBackupInfo] = useState(readAutoBackupInfo);

  // --- Выбор папка / ситуация / спот (если выбранного больше нет — берём первый) ---
  const [selCat, setSelCat] = useState('');
  const [selSit, setSelSit] = useState('');
  const [selSpot, setSelSpot] = useState('');
  const cat = ranges[selCat] ? selCat : firstKey(ranges);
  const sit = ranges[cat]?.[selSit] ? selSit : firstKey(ranges[cat]);
  const spot = ranges[cat]?.[sit]?.[selSpot] ? selSpot : firstKey(ranges[cat]?.[sit]);
  const spotData = useMemo(() => ranges[cat]?.[sit]?.[spot] || {}, [ranges, cat, sit, spot]);

  // Статистика ошибок по текущему споту за всю историю (для «Повтора ошибок»)
  const historyStats = useMemo(() => {
    const stats = {};
    history.forEach(s => {
      if (s.cat !== cat || s.sit !== sit || s.spot !== spot) return;
      Object.entries(s.perHand || {}).forEach(([h, d]) => {
        stats[h] = { attempts: (stats[h]?.attempts || 0) + d.attempts, errors: (stats[h]?.errors || 0) + d.errors };
      });
    });
    return stats;
  }, [history, cat, sit, spot]);

  // При переименовании обновляем записи истории, чтобы прогресс не потерялся
  const handleRenamePath = (level, oldName, newName, ctx) => {
    setHistory(prev => prev.map(s => {
      if (level === 'cat' && s.cat === oldName) return { ...s, cat: newName };
      if (level === 'sit' && s.cat === ctx.cat && s.sit === oldName) return { ...s, sit: newName };
      if (level === 'spot' && s.cat === ctx.cat && s.sit === ctx.sit && s.spot === oldName) return { ...s, spot: newName };
      return s;
    }));
  };

  const startSession = () => {
    if (!spot) return alert('Выберите спот!');
    setTrainerKey(k => k + 1);
    setMode('trainer');
  };

  const finishSession = (session) => {
    if (session.hands > 0) setHistory(prev => [...prev, session]);
    setLastSession(session);
    setMode('summary');
  };

  // --- Бэкап ---
  const exportBackup = () => downloadJson({ ranges, actionColors, hotkeys, history }, backupFilename());

  const saveAutoBackup = () => {
    const snapshot = { ranges, actionColors, hotkeys, history, savedAt: new Date().toISOString() };
    try {
      localStorage.setItem(STORAGE_KEYS.autoBackup, JSON.stringify(snapshot));
      setAutoBackupInfo(new Date(snapshot.savedAt).toLocaleString('ru-RU'));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const applyData = (data) => {
    setRanges(data.ranges);
    if (data.actionColors) setActionColors(normalizeColors(data.actionColors));
    if (data.hotkeys) setHotkeys(normalizeHotkeys(data.hotkeys));
    if (Array.isArray(data.history)) setHistory(data.history);
  };

  const importBackup = (file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      let data;
      try {
        data = JSON.parse(ev.target.result);
      } catch {
        return alert('Ошибка: файл не является корректным JSON. Текущая база не изменена.');
      }
      const error = validateBackup(data);
      if (error) return alert(`Ошибка файла: ${error}. Текущая база не изменена.`);

      const ok = window.confirm(
        `Заменить текущую базу (${countSpots(ranges)} спотов) на базу из файла "${file.name}" (${countSpots(data.ranges)} спотов)?\n\n` +
        'Текущая база будет сохранена, и её можно будет вернуть в Настройках.',
      );
      if (!ok) return;
      if (!saveAutoBackup()) {
        if (!window.confirm('Не удалось сохранить резервную копию текущей базы. Скачайте её вручную кнопкой «Скачать Базу». Всё равно продолжить?')) return;
      }
      applyData(data);
      alert('База успешно загружена!');
      setShowSettings(false);
    };
    reader.readAsText(file);
  };

  const restoreAutoBackup = () => {
    let data;
    try {
      data = JSON.parse(localStorage.getItem(STORAGE_KEYS.autoBackup));
    } catch {
      return alert('Резервная копия повреждена.');
    }
    if (!data || validateBackup(data)) return alert('Резервная копия повреждена.');
    if (!window.confirm('Вернуть базу, которая была до последней загрузки? Текущая база тоже сохранится как резервная копия (можно будет вернуть обратно).')) return;
    saveAutoBackup(); // текущее состояние становится новой резервной копией
    applyData(data);
    alert('База восстановлена!');
    setShowSettings(false);
  };

  return (
    <div className="app-container">
      {showSettings && (
        <SettingsModal
          hotkeys={hotkeys} setHotkeys={setHotkeys} colors={actionColors}
          onExport={exportBackup} onImportFile={importBackup}
          autoBackupInfo={autoBackupInfo} onRestoreAutoBackup={restoreAutoBackup}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div className="top-bar">
        {mode !== 'trainer' && mode !== 'history' && (
          <button className="settings-btn" onClick={() => setMode('history')}>📈 История</button>
        )}
        <button className="settings-btn" onClick={() => setShowSettings(true)}>⚙️ Настройки</button>
      </div>

      {mode === 'editor' && (
        <EditorView
          ranges={ranges} setRanges={setRanges}
          cat={cat} sit={sit} spot={spot}
          setCat={setSelCat} setSit={setSelSit} setSpot={setSelSpot}
          colors={actionColors} setColors={setActionColors}
          onStart={startSession} onRenamePath={handleRenamePath}
        />
      )}

      {mode === 'trainer' && (
        <TrainerPanel
          key={trainerKey}
          cat={cat} sit={sit} spot={spot} spotData={spotData}
          colors={actionColors} hotkeys={hotkeys} hotkeysEnabled={!showSettings}
          historyStats={historyStats}
          onFinish={finishSession}
        />
      )}

      {mode === 'summary' && lastSession && (
        <SummaryPanel
          session={lastSession} spotData={spotData} colors={actionColors}
          onRepeat={startSession} onBack={() => setMode('editor')}
        />
      )}

      {mode === 'history' && (
        <HistoryPanel
          history={history}
          onDeleteSession={id => { if (window.confirm('Удалить эту сессию из истории?')) setHistory(prev => prev.filter(s => s.id !== id)); }}
          onClearHistory={() => { if (window.confirm('Удалить всю историю тренировок? Ренжи не пострадают.')) setHistory([]); }}
          onBack={() => setMode('editor')}
        />
      )}
    </div>
  );
}

export default App;
