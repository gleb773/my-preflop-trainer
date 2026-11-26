import { getDayProgress, planDayIndex, spotLabel } from '../utils/studyPlan';

/** Список спотов дня с прогрессом. compact — для карточки в редакторе */
export function DaySpotList({ plan, today, existingKeys, onStartSpot, onPreviewSpot }) {
  const { items } = getDayProgress(plan, today, existingKeys);
  if (items.length === 0) return <p className="history-hint">В плане нет доступных спотов — возможно, они были удалены.</p>;
  return (
    <ul className="plan-day-list">
      {items.map(it => (
        <li key={it.key} className={it.complete ? 'complete' : ''}>
          <span className="plan-day-icon">{it.complete ? '✅' : it.done > 0 ? '▶' : '○'}</span>
          <span className="plan-day-name">{spotLabel(plan, it.key)}</span>
          <span className="plan-day-progress">
            <span className="plan-bar"><span style={{ width: `${Math.min(100, (it.done / it.target) * 100)}%` }} /></span>
            {Math.min(it.done, it.target)}/{it.target}
          </span>
          {onPreviewSpot && <button className="plan-play plan-eye" onClick={() => onPreviewSpot(it.key)} title="Посмотреть ренж">👁</button>}
          {!it.complete && <button className="plan-play" onClick={() => onStartSpot(it.key)} title="Тренировать">▶</button>}
        </li>
      ))}
    </ul>
  );
}

export default function TodayPlanCard({ plan, today, existingKeys, onStartSpot, onPreviewSpot, onOpenPlan }) {
  const { items, dayComplete } = getDayProgress(plan, today, existingKeys);
  const next = items.find(i => !i.complete);
  const day = planDayIndex(plan, today) + 1;

  return (
    <div className="today-plan-card">
      <div className="today-plan-head">
        <span className="today-plan-title" onClick={onOpenPlan}>📚 {plan.name}</span>
        <span className="today-plan-day">День {day}/{plan.durationDays}</span>
      </div>
      <DaySpotList plan={plan} today={today} existingKeys={existingKeys} onStartSpot={onStartSpot} onPreviewSpot={onPreviewSpot} />
      {dayComplete
        ? <div className="today-plan-done">✅ План на сегодня выполнен!</div>
        : next && <button className="start-training-btn plan-continue" onClick={() => onStartSpot(next.key)}>▶ {items.some(i => i.done > 0) ? 'Продолжить' : 'Начать'}: {spotLabel(plan, next.key)}</button>}
    </div>
  );
}
