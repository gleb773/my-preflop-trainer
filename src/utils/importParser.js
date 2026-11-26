import { HANDS, getAbstractHand, parseAbstractHand, getCombosCount } from './hands';
import { round2 } from './weights';

/**
 * Парсит строку GTOBase / PioSolver-подобного формата.
 * Поддерживает:
 *  - комбо: "AsKs,AhKh"
 *  - абстрактные руки: "AKs, AKo, QQ, AK"
 *  - веса: "[50]AsKs,AJo[/50]" или "[50.5]...[/50.5]"
 * Возвращает { percents: {hand: 0..100}, recognized, unknown: string[] }
 */
export function parseRangeText(text) {
  const points = {};
  HANDS.forEach(h => { points[h] = 0; });
  let recognized = 0;
  const unknown = [];

  const addTokens = (chunk, weight) => {
    chunk.split(/[,\s;]+/).forEach(raw => {
      const token = raw.trim();
      if (!token) return;
      const combo = getAbstractHand(token);
      if (combo) { points[combo] += weight; recognized++; return; }
      const abstract = parseAbstractHand(token);
      if (abstract) {
        abstract.forEach(h => { points[h] += weight * getCombosCount(h); });
        recognized++;
        return;
      }
      unknown.push(token);
    });
  };

  const regex = /\[([\d.]+)\]([\s\S]*?)\[\/\1\]/g;
  let rest = text;
  let match;
  while ((match = regex.exec(text)) !== null) {
    addTokens(match[2], parseFloat(match[1]));
    rest = rest.replace(match[0], ' ');
  }
  addTokens(rest, 100);

  const percents = {};
  HANDS.forEach(h => { percents[h] = round2(Math.min(100, points[h] / getCombosCount(h))); });
  return { percents, recognized, unknown };
}
