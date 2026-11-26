import { useState, useEffect } from 'react';

/** useState, который читает начальное значение из localStorage и сохраняет изменения обратно. */
export function usePersistentState(key, getDefault, normalize = (v) => v) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) return normalize(JSON.parse(saved));
    } catch (err) {
      console.error(`Не удалось прочитать ${key} из localStorage`, err);
    }
    return typeof getDefault === 'function' ? getDefault() : getDefault;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`Не удалось сохранить ${key} в localStorage`, err);
    }
  }, [key, value]);

  return [value, setValue];
}
