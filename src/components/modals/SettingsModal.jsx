import { useState } from 'react';
import { codeToHotkey, normalizeHotkey } from '../../utils/hotkeys';

const ACTION_LABELS = { Fold: 'Fold', Call: 'Call', Raise: 'Raise', Allin: 'All-in' };

function HotkeyInput({ action, value, color, onChange }) {
  return (
    <div>
      <label style={{ color }}>{ACTION_LABELS[action]}</label>
      <input
        readOnly
        value={value}
        title="Нажмите клавишу (латиница A–Z или цифра)"
        onKeyDown={e => {
          if (e.key === 'Tab') return;
          e.preventDefault();
          // Берём физическую клавишу: при русской раскладке всё равно получаем латиницу
          const key = codeToHotkey(e.code) || normalizeHotkey(e.key);
          if (key) onChange(action, key);
        }}
      />
    </div>
  );
}

export default function SettingsModal({
  hotkeys, setHotkeys, colors, combosOn, setCombosOn, soundOn, setSoundOn, dailyGoal, setDailyGoal, onExport, onImportFile, autoBackupInfo, onRestoreAutoBackup, onClose,
}) {
  const [warning, setWarning] = useState('');
  const [goalDraft, setGoalDraft] = useState(String(dailyGoal));
  const goalNum = Number(goalDraft);
  const goalInvalid = !/^\d{1,4}$/.test(goalDraft.trim()) || goalNum < 1 || goalNum > 1000;
  const commitGoal = () => { if (goalInvalid) setGoalDraft(String(dailyGoal)); else setDailyGoal(goalNum); };

  const changeHotkey = (action, key) => {
    const taken = Object.entries(hotkeys).find(([a, k]) => a !== action && k === key);
    if (taken) {
      setWarning(`Клавиша ${key} уже назначена на ${ACTION_LABELS[taken[0]]}`);
      return;
    }
    setWarning('');
    setHotkeys({ ...hotkeys, [action]: key });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>⚙️ Настройки Тренажера</h3>
        <div className="settings-block">
          <h4>Горячие клавиши (кликните в поле и нажмите клавишу)</h4>
          <div className="hotkeys-grid">
            {['Fold', 'Call', 'Raise', 'Allin'].map(a => (
              <HotkeyInput key={a} action={a} value={hotkeys[a]} color={colors[a]} onChange={changeHotkey} />
            ))}
          </div>
          {warning && <p className="settings-warning">{warning}</p>}
        </div>
        <div className="settings-block">
          <h4>Серии побед (комбо)</h4>
          <label className="settings-toggle">
            <input type="checkbox" checked={combosOn} onChange={e => setCombosOn(e.target.checked)} />
            Показывать серии и надписи (COMBO, FATALITY…)
          </label>
          <label className={`settings-toggle ${combosOn ? '' : 'disabled'}`}>
            <input type="checkbox" checked={soundOn} disabled={!combosOn} onChange={e => setSoundOn(e.target.checked)} />
            Звуки комбо
          </label>
        </div>
        <div className="settings-block">
          <h4>Ежедневная норма</h4>
          <label className="settings-toggle">
            <input
              type="text" inputMode="numeric"
              className={`percent-input goal-input ${goalInvalid ? 'invalid' : ''}`}
              value={goalDraft}
              title={goalInvalid ? 'Введите число от 1 до 1000' : undefined}
              onChange={e => setGoalDraft(e.target.value)}
              onBlur={commitGoal}
              onKeyDown={e => { if (e.key === 'Enter' && !goalInvalid) e.target.blur(); }}
            />
            рук в день — чтобы день засчитался в серию 📅
          </label>
        </div>
        <div className="settings-block">
          <h4>База данных (Бэкап)</h4>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button className="btn call" onClick={onExport} style={{ flex: 1 }}>💾 Скачать Базу</button>
            <label className="btn fold" style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
              📂 Загрузить Базу
              <input
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files[0];
                  e.target.value = ''; // чтобы тот же файл можно было выбрать снова
                  if (file) onImportFile(file);
                }}
              />
            </label>
          </div>
          {autoBackupInfo && (
            <button className="btn restore-btn" onClick={onRestoreAutoBackup}>
              ↩️ Вернуть базу, которая была до последней загрузки ({autoBackupInfo})
            </button>
          )}
        </div>
        <div className="modal-btns" style={{ marginTop: '20px' }}>
          <button className="btn fold" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}
