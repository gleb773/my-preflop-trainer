import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import PlayingCard from './PlayingCard';
import HandGrid from './HandGrid';
import StatsPanel from './StatsPanel';
import Tooltip from './Tooltip';
import { useHoverTooltip } from '../hooks/useHoverTooltip';
import { getActivePool, pickRandom, pickWeightedHand, dealCards } from '../utils/hands';
import { getWeights, getCellBackground } from '../utils/cellStyle';
import { codeToHotkey, normalizeHotkey } from '../utils/hotkeys';

const NEXT_HAND_DELAY = 1500;
const ACTION_ORDER = ['Fold', 'Call', 'Raise', 'Allin'];

function rollDice() { return Math.floor(Math.random() * 100) + 1; }

/** Объединяет статистику рук: { hand: {attempts, errors} } */
function mergeStats(a, b) {
  const res = { ...a };
  Object.entries(b).forEach(([h, s]) => {
    res[h] = { attempts: (res[h]?.attempts || 0) + s.attempts, errors: (res[h]?.errors || 0) + s.errors };
  });
  return res;
}

function evaluate(handData, userAction, trainerMode, dice) {
  const w = getWeights(handData);
  if (trainerMode === 'Simple') {
    if (w[userAction] > 0) return { isCorrect: true, msg: `✅ Верно! (${userAction} ${w[userAction]}%)` };
    const options = ['Allin', 'Raise', 'Call', 'Fold'].filter(a => w[a] > 0).map(a => `${a} (${w[a]}%)`);
    return { isCorrect: false, msg: `❌ Ошибка! Нужно: ${options.join(' или ') || 'Fold (100%)'}` };
  }
  let target = 'Fold';
  if (dice <= w.Allin && w.Allin > 0) target = 'Allin';
  else if (dice <= w.Allin + w.Raise && w.Raise > 0) target = 'Raise';
  else if (dice <= w.Allin + w.Raise + w.Call && w.Call > 0) target = 'Call';
  if (userAction === target) return { isCorrect: true, msg: `✅ Верно! (Кубик: ${dice})` };
  return { isCorrect: false, msg: `❌ Ошибка! (Кубик: ${dice} → ${target})` };
}

export default function TrainerPanel({ cat, sit, spot, spotData, colors, hotkeys, hotkeysEnabled, historyStats, onFinish }) {
  const pool = useMemo(() => getActivePool(spotData), [spotData]);

  const [trainerMode, setTrainerMode] = useState('Simple');
  const [repeatErrors, setRepeatErrors] = useState(false);
  const [deal, setDeal] = useState(() => {
    const hand = pickRandom(pool);
    return { hand, cards: dealCards(hand), dice: rollDice() };
  });
  const [message, setMessage] = useState('Сессия начата!');
  const [showMatrix, setShowMatrix] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [session, setSession] = useState({});
  const { hover, onMove, onLeave } = useHoverTooltip();

  const answeringRef = useRef(false);
  const timeoutRef = useRef(null);
  const sessionRef = useRef({});
  const errorQueueRef = useRef([]); // [{ hand, dueIn }]
  const startTimeRef = useRef(null);
  const handShownAtRef = useRef(null);
  const answerTimeRef = useRef(0);

  useEffect(() => {
    const now = Date.now();
    startTimeRef.current = now;
    handShownAtRef.current = now;
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const nextHand = useCallback(() => {
    let hand;
    if (repeatErrors) {
      const queue = errorQueueRef.current;
      queue.forEach(q => { q.dueIn -= 1; });
      const dueIdx = queue.findIndex(q => q.dueIn <= 0 && pool.includes(q.hand));
      if (dueIdx >= 0) hand = queue.splice(dueIdx, 1)[0].hand;
      else hand = pickWeightedHand(pool, mergeStats(historyStats, sessionRef.current));
    } else {
      hand = pickRandom(pool);
    }
    setDeal({ hand, cards: dealCards(hand), dice: rollDice() });
    handShownAtRef.current = Date.now();
  }, [repeatErrors, pool, historyStats]);

  const handleAction = useCallback((userAction) => {
    if (answeringRef.current) return; // защита от двойного ответа
    answeringRef.current = true;
    setIsAnswering(true);
    answerTimeRef.current += Date.now() - handShownAtRef.current;

    const { hand, dice } = deal;
    const { isCorrect, msg } = evaluate(spotData[hand], userAction, trainerMode, dice);

    const prev = sessionRef.current[hand] || { attempts: 0, errors: 0 };
    sessionRef.current = { ...sessionRef.current, [hand]: { attempts: prev.attempts + 1, errors: prev.errors + (isCorrect ? 0 : 1) } };
    setSession(sessionRef.current);

    if (!isCorrect && repeatErrors && !errorQueueRef.current.some(q => q.hand === hand)) {
      errorQueueRef.current.push({ hand, dueIn: 3 + Math.floor(Math.random() * 3) });
    }

    setMessage(msg);
    timeoutRef.current = setTimeout(() => {
      nextHand();
      setMessage('Ваш ход!');
      setShowMatrix(false);
      answeringRef.current = false;
      setIsAnswering(false);
    }, NEXT_HAND_DELAY);
  }, [deal, spotData, trainerMode, repeatErrors, nextHand]);

  // Горячие клавиши (сравниваем физическую клавишу — работает в любой раскладке)
  useEffect(() => {
    if (!hotkeysEnabled) return;
    const onKey = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = codeToHotkey(e.code) || normalizeHotkey(e.key);
      if (!key) return;
      const action = ACTION_ORDER.find(a => hotkeys[a] === key);
      if (action) { e.preventDefault(); handleAction(action); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hotkeysEnabled, hotkeys, handleAction]);

  const finish = () => {
    clearTimeout(timeoutRef.current);
    const perHand = sessionRef.current;
    let hands = 0, errors = 0;
    Object.values(perHand).forEach(s => { hands += s.attempts; errors += s.errors; });
    // если ответили, но новая рука ещё не показана — время уже учтено
    onFinish({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: new Date().toISOString(),
      cat, sit, spot, trainerMode, repeatErrors,
      hands, errors,
      durationSec: Math.round((Date.now() - startTimeRef.current) / 1000),
      answerTimeSec: Math.round(answerTimeRef.current / 100) / 10,
      perHand,
    });
  };

  let liveHands = 0, liveErrors = 0;
  Object.values(session).forEach(s => { liveHands += s.attempts; liveErrors += s.errors; });

  return (
    <div className="trainer-panel">
      <Tooltip hover={hover} spotData={spotData} colors={colors} />
      <div className="trainer-controls">
        <button className={`pos-btn ${trainerMode === 'Simple' ? 'active' : ''}`} onClick={() => setTrainerMode('Simple')}>Простой режим</button>
        <button className={`pos-btn ${trainerMode === 'RNG' ? 'active' : ''}`} onClick={() => setTrainerMode('RNG')}>RNG режим</button>
        <button
          className={`pos-btn ${repeatErrors ? 'active repeat-on' : ''}`}
          onClick={() => setRepeatErrors(!repeatErrors)}
          title="Руки, на которых были ошибки (в этой сессии и в истории), выпадают чаще"
        >🔁 Повтор ошибок</button>
      </div>

      <div className="trainer-board">
        <div className="board-header"><span className="board-cat">{cat}</span><span className="board-sit">{sit}</span></div>
        <div className="board-spot-title">{spot}</div>
        <div className="live-stats">Рук: {liveHands} · Ошибок: {liveErrors}</div>
        <div style={{ height: '30px', margin: '10px 0' }}><p className="message">{message}</p></div>

        <div className="board-cards" onClick={() => setShowMatrix(!showMatrix)}>
          <PlayingCard rank={deal.cards[0].rank} suit={deal.cards[0].suit} />
          <PlayingCard rank={deal.cards[1].rank} suit={deal.cards[1].suit} />
        </div>
        <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '-20px', marginBottom: '20px' }}>Кликните по картам, чтобы подглядеть ренж</div>

        {trainerMode === 'RNG' && <div className="rng-dice">🎲 <span>{deal.dice}</span></div>}

        <div className="action-panel">
          {ACTION_ORDER.map(a => (
            <button key={a} className="action-btn" disabled={isAnswering} style={{ backgroundColor: colors[a] }} onClick={() => handleAction(a)}>
              {a === 'Allin' ? 'All-in' : a}<span className="hotkey-hint">{hotkeys[a]}</span>
            </button>
          ))}
        </div>

        <button className="finish-session-btn" onClick={finish}>Завершить сессию</button>
      </div>

      {showMatrix && (
        <>
          {/* Только просмотр: редактировать ренж из тренажёра нельзя */}
          <HandGrid
            className="readonly-grid"
            getBackground={h => getCellBackground(spotData[h], colors)}
            cellClassName={h => (h === deal.hand ? 'current-hand-cell' : '')}
            onHoverMove={onMove}
            onHoverLeave={onLeave}
          />
          <StatsPanel spotData={spotData} colors={colors} />
        </>
      )}
    </div>
  );
}
