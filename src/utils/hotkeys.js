export const DEFAULT_HOTKEYS = { Fold: '1', Call: '2', Raise: '3', Allin: '4' };

// Русская раскладка ЙЦУКЕН -> клавиши QWERTY
const RU_TO_EN = {
  'Й': 'Q', 'Ц': 'W', 'У': 'E', 'К': 'R', 'Е': 'T', 'Н': 'Y', 'Г': 'U', 'Ш': 'I', 'Щ': 'O', 'З': 'P',
  'Ф': 'A', 'Ы': 'S', 'В': 'D', 'А': 'F', 'П': 'G', 'Р': 'H', 'О': 'J', 'Л': 'K', 'Д': 'L',
  'Я': 'Z', 'Ч': 'X', 'С': 'C', 'М': 'V', 'И': 'B', 'Т': 'N', 'Ь': 'M',
};

const isValidKey = (k) => /^[A-Z0-9]$/.test(k);

/** Приводит символ к латинице A–Z / 0–9, иначе null */
export function normalizeHotkey(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  const ch = value.trim().toUpperCase().charAt(0);
  if (isValidKey(ch)) return ch;
  if (RU_TO_EN[ch]) return RU_TO_EN[ch];
  return null;
}

/** KeyboardEvent.code -> латинская клавиша ("KeyQ" -> "Q", "Digit1"/"Numpad1" -> "1") */
export function codeToHotkey(code) {
  if (!code) return null;
  let m = /^Key([A-Z])$/.exec(code);
  if (m) return m[1];
  m = /^(?:Digit|Numpad)([0-9])$/.exec(code);
  if (m) return m[1];
  return null;
}

/** Чинит хоткеи из старого localStorage / бэкапа (кириллица -> латиница) */
export function normalizeHotkeys(obj) {
  const result = { ...DEFAULT_HOTKEYS };
  if (!obj || typeof obj !== 'object') return result;
  for (const action of Object.keys(DEFAULT_HOTKEYS)) {
    const k = normalizeHotkey(obj[action]);
    if (k) result[action] = k;
  }
  return result;
}
