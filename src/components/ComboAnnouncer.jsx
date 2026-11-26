/**
 * Всплывающая надпись комбо поверх экрана. Не перехватывает клики.
 * event: { id, kind: 'combo'|'breaker'|'record', text, level, subtitle? }
 */
export default function ComboAnnouncer({ event }) {
  if (!event) return null;
  const { id, kind, text, level = 1, subtitle } = event;
  return (
    <div key={id} className={`combo-overlay combo-${kind} combo-level-${level}`} aria-live="polite">
      {level >= 2 && kind === 'combo' && <div className="combo-flash" />}
      <div className="combo-text-wrap">
        <div className="combo-text" data-text={text}>{text}</div>
        {subtitle && <div className="combo-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}
