import { useState, useCallback } from 'react';

/** Состояние всплывающей подсказки над ячейкой матрицы */
export function useHoverTooltip() {
  const [hover, setHover] = useState(null);
  const onMove = useCallback((e, hand) => {
    let x = e.clientX + 15; let y = e.clientY + 15;
    if (window.innerWidth - e.clientX < 170) x = e.clientX - 160;
    if (window.innerHeight - e.clientY < 180) y = e.clientY - 170;
    setHover({ hand, x, y });
  }, []);
  const onLeave = useCallback(() => setHover(null), []);
  return { hover, onMove, onLeave };
}
