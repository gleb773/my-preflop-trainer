import { getDayStrip, planSummary, planEndDate, planDayIndex, planSpotKey, getDayProgress } from '../utils/studyPlan';
import { keyToDate } from '../utils/activity';
import { DaySpotList } from './TodayPlanCard';

const fmt = (k) => keyToDate(k).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
const STRIP_ICON = { done: '✅', missed: '✕', partial: '◐', today: '●', future: '' };

const accColor = (acc) => (acc >= 90 ? '#10b981' : acc >= 70 ? '#f59e0b' : '#ef4444');

/** Мини-график точности по сессиям */
function Sparkline({ sessions }) {
  if (sessions.length < 2) return null;
  const W = 90, H = 26, P = 3;
  const x = (i) => P + (i / (sessions.length - 1)) * (W - 2 * P);
  const y = (acc) => P + (1 - acc / 100) * (H - 2 * P);
  const last = sessions[sessions.length - 1];
  return (
    <svg className="sparkline" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <line x1={P} x2={W - P} y1={y(90)} y2={y(90)} stroke="#374151" strokeDasharray="2 2" />
      <polyline points={sessions.map((s, i) => `${x(i)},${y(s.acc)}`).join(' ')} fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinejoin="round" />
      {sessions.map((s, i) => (
        <circle key={i} cx={x(i)} cy={y(s.acc)} r={i === sessions.length - 1 ? 3 : 1.8} fill={i === sessions.length - 1 ? accColor(last.acc) : '#60a5fa'}>
          <title>{`${new Date(s.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}: ${s.acc}% (${s.hands} рук)`}</title>
        </circle>
      ))}
    </svg>
  );
}

function SpotStats({ plan, summary }) {
  return (
    <table className="history-table plan-stats-table">
      <thead><tr><th>Спот</th><th>Рук</th><th>Сессий</th><th>Общая</th><th>Первая → последняя</th><th>Динамика</th></tr></thead>
      <tbody>
        {plan.spots.map(s => {
          const st = summary.perSpot[planSpotKey(s)] || { hands: 0, errors: 0, sessions: [] };
          const acc = st.hands ? Math.round(((st.hands - st.errors) / st.hands) * 100) : null;
          const first = st.sessions[0], last = st.sessions[st.sessions.length - 1];
          const delta = st.sessions.length >= 2 ? last.acc - first.acc : null;
          return (
            <tr key={planSpotKey(s)}>
              <td className="history-spot">{s.sit} / <b>{s.spot}</b></td>
              <td>{st.hands}</td>
              <td>{st.sessions.length}</td>
              <td style={{ color: acc === null ? undefined : accColor(acc) }}>{acc === null ? '—' : `${acc}%`}</td>
              <td>
                {delta === null ? (st.sessions.length === 1 ? `${first.acc}%` : '—') : (
                  <>
                    {first.acc}% → {last.acc}%{' '}
                    <span className={`plan-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
                      {delta > 0 ? `▲${delta}` : delta < 0 ? `▼${-delta}` : '='}
                    </span>
                  </>
                )}
              </td>
              <td><Sparkline sessions={st.sessions} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function PlanPanel({
  store, today, history, existingKeys, onCreate, onEdit, onStartSpot, onPreviewSpot, onFinishPlan, onBack,
}) {
  const plan = store.active;
  const lastArchived = store.archive[store.archive.length - 1];

  if (!plan) {
    return (
      <div className="summary-panel plan-panel">
        <h2>📚 План обучения</h2>
        <p className="history-hint">Выберите споты на неделю (или другой срок), сколько спотов в день и сколько рук на каждый. Каждый день тренажёр сам предложит споты дня.</p>
        {lastArchived && (
          <p className="history-hint">Последний план: «{lastArchived.name}», {fmt(lastArchived.startDate)} – {fmt(planEndDate(lastArchived))}</p>
        )}
        <div style={{ display: 'flex', gap: '15px', marginTop: '25px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn fold" style={{ width: '200px' }} onClick={onBack}>Вернуться в редактор</button>
          <button className="btn call" style={{ width: '200px' }} onClick={onCreate}>➕ Создать план</button>
        </div>
      </div>
    );
  }

  const over = planDayIndex(plan, today) >= plan.durationDays;
  const strip = getDayStrip(plan, today);
  const summary = planSummary(plan, history, today);
  const { dayComplete } = over ? { dayComplete: false } : getDayProgress(plan, today, existingKeys);

  return (
    <div className="summary-panel plan-panel">
      <h2>📚 {plan.name}</h2>
      <p className="history-hint">
        {fmt(plan.startDate)} – {fmt(planEndDate(plan))} · {plan.spots.length} спотов · {plan.spotsPerDay} в день по {plan.handsPerSpot} рук · {plan.order === 'random' ? '🎲 случайно' : 'по порядку'}
      </p>

      <div className="plan-strip">
        {strip.map(d => (
          <div key={d.key} className={`plan-strip-day ${d.status}`} title={`День ${d.index}, ${fmt(d.key)}`}>
            <span className="plan-strip-num">{d.index}</span>
            <span className="plan-strip-icon">{STRIP_ICON[d.status]}</span>
          </div>
        ))}
      </div>

      {over ? (
        <>
          <h3 className="plan-finished-title">🏁 План завершён!</h3>
          <div className="summary-stats">
            <div className="stat-box"><span>Дней выполнено</span><strong>{summary.daysDone}/{plan.durationDays}</strong></div>
            <div className="stat-box"><span>Рук сыграно</span><strong>{summary.totalHands}</strong></div>
          </div>
        </>
      ) : (
        <>
          <div className="summary-stats">
            <div className="stat-box"><span>День</span><strong>{planDayIndex(plan, today) + 1}/{plan.durationDays}</strong></div>
            <div className="stat-box"><span>Дней выполнено</span><strong>{summary.daysDone}</strong></div>
            <div className="stat-box"><span>Рук по плану</span><strong>{summary.totalHands}</strong></div>
          </div>
          <h4 className="history-subtitle">Сегодня</h4>
          <DaySpotList plan={plan} today={today} existingKeys={existingKeys} onStartSpot={onStartSpot} onPreviewSpot={onPreviewSpot} />
          {dayComplete && <div className="today-plan-done">✅ План на сегодня выполнен!</div>}
        </>
      )}

      <h4 className="history-subtitle">Статистика по спотам плана</h4>
      <div className="history-table-wrap"><SpotStats plan={plan} summary={summary} /></div>

      <div style={{ display: 'flex', gap: '15px', marginTop: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn fold" style={{ width: '200px' }} onClick={onBack}>Вернуться в редактор</button>
        {over ? (
          <button className="btn call" style={{ width: '200px' }} onClick={() => { onFinishPlan(true); onCreate(); }}>➕ Новый план</button>
        ) : (
          <>
            <button className="btn call" style={{ width: '200px' }} onClick={onEdit}>✏️ Изменить план</button>
            <button className="btn danger" style={{ width: '200px' }} onClick={() => onFinishPlan(false)}>Завершить досрочно</button>
          </>
        )}
      </div>
    </div>
  );
}
