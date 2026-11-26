import { useState, useMemo } from 'react';
import { formatTime, spotKey } from '../utils/format';
const accuracyOf = (s) => (s.hands > 0 ? Math.round(((s.hands - s.errors) / s.hands) * 100) : 0);

function AccuracyChart({ sessions }) {
  if (sessions.length < 2) {
    return <p className="history-hint">Для графика нужно минимум 2 сессии.</p>;
  }
  const W = 600, H = 180, PAD_L = 36, PAD_R = 12, PAD_T = 12, PAD_B = 24;
  const innerW = W - PAD_L - PAD_R, innerH = H - PAD_T - PAD_B;
  const x = (i) => PAD_L + (sessions.length === 1 ? innerW / 2 : (i / (sessions.length - 1)) * innerW);
  const y = (acc) => PAD_T + (1 - acc / 100) * innerH;
  const points = sessions.map((s, i) => `${x(i)},${y(accuracyOf(s))}`).join(' ');

  return (
    <svg className="history-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Точность по сессиям">
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke="#374151" strokeWidth="1" />
          <text x={PAD_L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#9ca3af">{v}%</text>
        </g>
      ))}
      <polyline points={points} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" />
      {sessions.map((s, i) => (
        <circle key={s.id} cx={x(i)} cy={y(accuracyOf(s))} r="4" fill="#10b981">
          <title>{`${new Date(s.date).toLocaleString('ru-RU')}: ${accuracyOf(s)}% (${s.hands} рук)`}</title>
        </circle>
      ))}
      <text x={PAD_L} y={H - 6} fontSize="11" fill="#9ca3af">старые</text>
      <text x={W - PAD_R} y={H - 6} fontSize="11" fill="#9ca3af" textAnchor="end">новые</text>
    </svg>
  );
}

export default function HistoryPanel({ history, onDeleteSession, onClearHistory, onBack }) {
  const spots = useMemo(() => [...new Set(history.map(spotKey))], [history]);
  const [filter, setFilter] = useState('');
  const activeFilter = spots.includes(filter) ? filter : '';

  const sessions = useMemo(
    () => history.filter(s => !activeFilter || spotKey(s) === activeFilter).sort((a, b) => a.date.localeCompare(b.date)),
    [history, activeFilter],
  );

  const totals = useMemo(() => {
    let hands = 0, errors = 0, time = 0;
    const perHand = {};
    sessions.forEach(s => {
      hands += s.hands; errors += s.errors; time += s.durationSec;
      Object.entries(s.perHand || {}).forEach(([h, d]) => {
        perHand[h] = { attempts: (perHand[h]?.attempts || 0) + d.attempts, errors: (perHand[h]?.errors || 0) + d.errors };
      });
    });
    const worst = Object.entries(perHand)
      .filter(([, d]) => d.errors > 0)
      .sort((a, b) => b[1].errors / b[1].attempts - a[1].errors / a[1].attempts || b[1].errors - a[1].errors)
      .slice(0, 12);
    return { hands, errors, time, worst };
  }, [sessions]);

  return (
    <div className="summary-panel history-panel">
      <h2>📈 История тренировок</h2>

      {history.length === 0 ? (
        <p className="history-hint">Пока нет сохранённых сессий. Завершите тренировку — она появится здесь.</p>
      ) : (
        <>
          <div className="tree-level" style={{ marginBottom: 20 }}>
            <span className="tree-label">Спот:</span>
            <select value={activeFilter} onChange={e => setFilter(e.target.value)}>
              <option value="">Все споты</option>
              {spots.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="summary-stats">
            <div className="stat-box"><span>Сессий</span><strong>{sessions.length}</strong></div>
            <div className="stat-box"><span>Рук</span><strong>{totals.hands}</strong></div>
            <div className="stat-box"><span>Точность</span><strong>{totals.hands ? Math.round(((totals.hands - totals.errors) / totals.hands) * 100) : 0}%</strong></div>
            <div className="stat-box"><span>Общее время</span><strong>{formatTime(totals.time)}</strong></div>
          </div>

          <h4 className="history-subtitle">Точность по сессиям</h4>
          <AccuracyChart sessions={sessions} />

          {totals.worst.length > 0 && (
            <>
              <h4 className="history-subtitle">Самые частые ошибки</h4>
              <div className="worst-hands">
                {totals.worst.map(([h, d]) => (
                  <span key={h} className="worst-hand" title={`${d.errors} ошибок из ${d.attempts}`}>
                    {h} <small>{d.attempts - d.errors}/{d.attempts}</small>
                  </span>
                ))}
              </div>
            </>
          )}

          <h4 className="history-subtitle">Сессии</h4>
          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr><th>Дата</th><th>Спот</th><th>Режим</th><th>Рук</th><th>Точность</th><th>Время</th><th></th></tr>
              </thead>
              <tbody>
                {[...sessions].reverse().map(s => (
                  <tr key={s.id}>
                    <td>{new Date(s.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="history-spot">{spotKey(s)}</td>
                    <td>{s.trainerMode === 'RNG' ? 'RNG' : 'Простой'}{s.repeatErrors ? ' 🔁' : ''}</td>
                    <td>{s.hands}</td>
                    <td style={{ color: accuracyOf(s) >= 90 ? '#10b981' : accuracyOf(s) >= 70 ? '#f59e0b' : '#ef4444' }}>{accuracyOf(s)}%</td>
                    <td>{formatTime(s.durationSec)}</td>
                    <td><span className="history-delete" title="Удалить сессию" onClick={() => onDeleteSession(s.id)}>🗑️</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: '15px', marginTop: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn fold" style={{ width: '200px' }} onClick={onBack}>Вернуться в редактор</button>
        {history.length > 0 && <button className="btn danger" style={{ width: '200px' }} onClick={onClearHistory}>Очистить историю</button>}
      </div>
    </div>
  );
}
